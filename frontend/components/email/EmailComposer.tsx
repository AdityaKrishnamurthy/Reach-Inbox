'use client';

// Main campaign composer: sender selection, recipient chips/CSV upload, a
// contenteditable rich-text body, and the send-time/delay/hourly-limit
// scheduling controls. Submits one POST to /api/schedules carrying a stable
// per-session idempotency key so retries or double-clicks can't create
// duplicate campaigns.

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { RecipientChips } from './RecipientChips';
import { RecipientUploader } from './RecipientUploader';
import { RichTextToolbar } from './RichTextToolbar';
import { SendLaterPopover } from './SendLaterPopover';
import { AddSenderModal } from './AddSenderModal';
import { fetchApi, ApiError } from '@/lib/api';

const ADD_SENDER_OPTION = '__add_sender__';

const MAX_DELAY_SECONDS = 3600;
const MAX_HOURLY_LIMIT = 10000;

interface SenderOption {
  id: string;
  display_name: string;
  email: string;
  is_default: boolean;
}

export const EmailComposer: React.FC = () => {
  const router = useRouter();

  // Form State
  const [senders, setSenders] = useState<SenderOption[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [isAddSenderOpen, setIsAddSenderOpen] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  // Stable for the lifetime of this compose session so a double-click, network
  // retry, or accidental double-submit hits the backend's idempotency guard
  // instead of creating a duplicate campaign. Regenerated after a successful
  // submit in case the user stays on the page.
  const requestIdRef = useRef<string>(crypto.randomUUID());

  const loadSenders = async (selectSenderId?: string) => {
    try {
      const res = await fetchApi<{ senders: SenderOption[] }>('/api/senders');
      if (res.senders && res.senders.length > 0) {
        setSenders(res.senders);
        const target = selectSenderId
          ? res.senders.find((s) => s.id === selectSenderId)
          : res.senders.find((s) => s.is_default) || res.senders[0];
        if (target) setSelectedSenderId(target.id);
      }
    } catch (err) {
      console.error('Failed to load senders:', err);
    }
  };

  // Fetch senders on mount
  useEffect(() => {
    loadSenders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === ADD_SENDER_OPTION) {
      setIsAddSenderOpen(true);
      return;
    }
    setSelectedSenderId(e.target.value);
  };

  const handleSenderCreated = (sender: SenderOption) => {
    loadSenders(sender.id);
    setInfoMessage(`Added sender "${sender.display_name}".`);
  };

  // Recipient handlers
  const handleAddRecipient = (email: string) => {
    if (!recipients.includes(email)) {
      setRecipients((prev) => [...prev, email]);
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleRecipientsUploaded = (uploadedEmails: string[], invalidCount = 0) => {
    setRecipients((prev) => {
      const combined = new Set([...prev, ...uploadedEmails]);
      return Array.from(combined);
    });
    setInfoMessage(
      invalidCount > 0
        ? `Added ${uploadedEmails.length} recipient(s). Skipped ${invalidCount} invalid entr${invalidCount === 1 ? 'y' : 'ies'}.`
        : uploadedEmails.length > 0
        ? `Added ${uploadedEmails.length} recipient(s).`
        : null
    );
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setErrorMessage('Only .csv or .txt files are supported for recipient upload.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      try {
        const result = await fetchApi<{ validEmails: string[]; invalidEntries: string[] }>(
          '/api/schedules/parse-recipients',
          { method: 'POST', body: JSON.stringify({ recipients: content }) }
        );
        handleRecipientsUploaded(result.validEmails, result.invalidEntries.length);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse the dropped file.');
      }
    };
    reader.onerror = () => setErrorMessage('Failed to read the dropped file.');
    reader.readAsText(file);
  };

  // Editor toolbar command
  const handleToolbarCommand = (cmd: string, val: string = '') => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Lists let you press Enter forever and only exit on a second Enter on an
  // empty line - that's native contenteditable behavior for <ul>/<ol>. Quote
  // blocks don't get the same native handling, so pressing Enter just keeps
  // extending the same <blockquote> indefinitely. This replicates the same
  // "second Enter on an empty line exits" behavior for blockquotes: it splits
  // the blank trailing line out into a plain paragraph after the quote.
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    let blockquote: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && node.tagName === 'BLOCKQUOTE') {
        blockquote = node;
        break;
      }
      node = node.parentNode;
    }
    if (!blockquote) return;

    const { startContainer, startOffset } = range;
    const isEmptyLine =
      startContainer.nodeType === Node.TEXT_NODE
        ? (startContainer.textContent || '').trim().length === 0
        : (() => {
            const prev = startContainer.childNodes[startOffset - 1];
            return !prev || prev.nodeName === 'BR';
          })();

    if (!isEmptyLine) return;

    e.preventDefault();

    // Drop the blank trailing line from inside the quote.
    if (startContainer.nodeType === Node.TEXT_NODE) {
      startContainer.parentNode?.removeChild(startContainer);
    } else {
      const prev = startContainer.childNodes[startOffset - 1];
      prev?.parentNode?.removeChild(prev);
    }

    // Start a fresh, unquoted paragraph right after the blockquote.
    const nextLine = document.createElement('div');
    nextLine.appendChild(document.createElement('br'));
    blockquote.insertAdjacentElement('afterend', nextLine);

    if (!blockquote.textContent?.trim()) {
      blockquote.remove();
    }

    const newRange = document.createRange();
    newRange.setStart(nextLine, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  // Pasting a bare URL turns it into a real, clickable link immediately -
  // there's no toolbar button for this, it just happens on paste. Built via
  // DOM nodes (not an HTML string) so pasted text can never be parsed as markup.
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain').trim();
    if (!/^https?:\/\/\S+$/i.test(text)) return;

    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const link = document.createElement('a');
    link.href = text;
    link.textContent = text;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    range.insertNode(link);

    range.setStartAfter(link);
    range.setEndAfter(link);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Safety net for URLs that were typed rather than pasted, or pasted as
  // part of a larger block of text: walks the body's text nodes right before
  // submit and turns any bare http(s) URL into a real <a> tag.
  const linkifyPlainUrls = (root: HTMLElement) => {
    const urlPattern = /https?:\/\/[^\s<]+[^\s<.,;:!?'")\]]/gi;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current: Node | null;
    while ((current = walker.nextNode())) {
      if ((current as Text).parentElement?.closest('a')) continue;
      if (urlPattern.test(current.textContent || '')) {
        textNodes.push(current as Text);
      }
      urlPattern.lastIndex = 0;
    }

    textNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      urlPattern.lastIndex = 0;
      while ((match = urlPattern.exec(text))) {
        const url = match[0];
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        frag.appendChild(link);
        lastIndex = match.index + url.length;
      }
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      textNode.parentNode?.replaceChild(frag, textNode);
    });
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (editorRef.current) {
      linkifyPlainUrls(editorRef.current);
    }
    const bodyHtml = editorRef.current?.innerHTML || '';

    // Validations
    if (recipients.length === 0) {
      setErrorMessage('Please specify at least one recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }
    if (!bodyHtml.trim() || bodyHtml === '<br>') {
      setErrorMessage('Please enter email body content.');
      return;
    }
    if (delaySeconds < 0 || delaySeconds > MAX_DELAY_SECONDS) {
      setErrorMessage(`Delay between emails must be between 0 and ${MAX_DELAY_SECONDS} seconds.`);
      return;
    }
    if (hourlyLimit < 1 || hourlyLimit > MAX_HOURLY_LIMIT) {
      setErrorMessage(`Hourly limit must be between 1 and ${MAX_HOURLY_LIMIT}.`);
      return;
    }
    // Allow a small tolerance since the "Now" preset captures a timestamp a few
    // seconds before the actual submit; reject anything genuinely in the past.
    const PAST_TOLERANCE_MS = 15000;
    if (scheduledDate.getTime() < Date.now() - PAST_TOLERANCE_MS) {
      setErrorMessage('The scheduled send time is in the past. Please pick a current or future time.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        senderId: selectedSenderId || undefined,
        recipients,
        subject: subject.trim(),
        body: bodyHtml,
        startAt: new Date(Math.max(scheduledDate.getTime(), Date.now())).toISOString(),
        delayMs: Math.max(0, delaySeconds * 1000),
        hourlyLimit: Math.max(1, hourlyLimit),
        requestId: requestIdRef.current,
      };

      const result = await fetchApi<{ scheduledCount: number }>('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage(
        `Successfully scheduled ${result.scheduledCount || recipients.length} email(s)! Redirecting to scheduled list...`
      );
      // Fresh idempotency key for any further submission in this session.
      requestIdRef.current = crypto.randomUUID();

      setTimeout(() => {
        router.push('/dashboard/scheduled');
      }, 1200);
    } catch (err: any) {
      if (err instanceof ApiError && err.fieldErrors) {
        const firstField = Object.keys(err.fieldErrors)[0];
        const firstMessage = firstField ? err.fieldErrors[firstField]?.[0] : undefined;
        setErrorMessage(firstMessage || err.message);
      } else {
        setErrorMessage(err.message || 'Failed to schedule campaign');
      }
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/scheduled');
    }
  };

  const isScheduledForFuture = scheduledDate.getTime() > Date.now() + 30000;

  return (
    <div className="max-w-5xl mx-auto py-6 px-8 flex flex-col h-full bg-white">
      {/* Top Header Bar (Figma Match) */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Compose New Email</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Send Later Clock Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(true)}
              className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-medium ${
                isScheduledForFuture
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title="Schedule Send Later"
            >
              <Clock className="w-4 h-4" />
              {isScheduledForFuture && (
                <span className="truncate max-w-[120px]">
                  {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>

            {/* Popover */}
            <SendLaterPopover
              isOpen={isSendLaterOpen}
              onClose={() => setIsSendLaterOpen(false)}
              onSelectTime={(date) => setScheduledDate(date)}
              initialDate={scheduledDate}
            />
          </div>

          {/* Schedule / Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Scheduling...' : isScheduledForFuture ? 'Schedule' : 'Send'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {infoMessage && !errorMessage && !successMessage && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-600" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-4 space-y-3">
        {/* From Row */}
        <div className="flex items-center py-2 border-b border-gray-100">
          <label className="w-20 text-xs font-medium text-gray-500 uppercase tracking-wider">
            From
          </label>
          <div className="flex-1 relative">
            <select
              value={selectedSenderId}
              onChange={handleSenderChange}
              className="w-full text-sm text-gray-900 bg-transparent py-1 pr-8 focus:outline-none cursor-pointer"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} &lt;{s.email}&gt; {s.is_default ? '(Default)' : ''}
                </option>
              ))}
              <option value={ADD_SENDER_OPTION}>+ Add new sender...</option>
            </select>
          </div>
        </div>

        <AddSenderModal
          isOpen={isAddSenderOpen}
          onClose={() => setIsAddSenderOpen(false)}
          onCreated={handleSenderCreated}
        />

        {/* To Row with Chips, Drag-and-Drop and Upload Button */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDropFile}
          className={`flex items-start py-2 border-b transition-all ${
            isDraggingFile
              ? 'bg-emerald-50/70 border-emerald-500 rounded-lg px-2 shadow-inner'
              : 'border-gray-100'
          }`}
        >
          <label className="w-20 pt-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
            To
          </label>
          <div className="flex-1 min-w-0">
            <RecipientChips
              recipients={recipients}
              onAdd={handleAddRecipient}
              onRemove={handleRemoveRecipient}
            />
          </div>
          <div className="pl-4 flex-shrink-0 pt-1">
            <RecipientUploader
              onRecipientsUploaded={handleRecipientsUploaded}
              detectedCount={recipients.length}
            />
          </div>
        </div>

        {/* Subject Row */}
        <div className="flex items-center py-2 border-b border-gray-100">
          <label className="w-20 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter campaign subject..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent py-1 focus:outline-none"
          />
        </div>

        {/* Scheduling Constraints Row (Figma Match: Delay between 2 emails & Hourly Limit) */}
        <div className="flex flex-wrap items-center gap-6 py-2 px-1 text-xs text-gray-600 bg-gray-50/70 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Delay between 2 emails:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max={MAX_DELAY_SECONDS}
                value={delaySeconds}
                onChange={(e) =>
                  setDelaySeconds(Math.min(MAX_DELAY_SECONDS, Math.max(0, parseInt(e.target.value, 10) || 0)))
                }
                className="w-16 px-2 py-1 bg-white border border-gray-200 rounded text-center text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-gray-500">sec</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Hourly Limit:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max={MAX_HOURLY_LIMIT}
                value={hourlyLimit}
                onChange={(e) =>
                  setHourlyLimit(Math.min(MAX_HOURLY_LIMIT, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-center text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-gray-500">emails/hr</span>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-h-[300px] border border-gray-200 rounded-lg overflow-hidden mt-2 focus-within:border-emerald-500 transition-colors">
          <RichTextToolbar onCommand={handleToolbarCommand} />
          <div
            ref={editorRef}
            contentEditable
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
            className="email-body-content flex-1 p-4 text-sm text-gray-900 focus:outline-none overflow-y-auto leading-relaxed"
            data-placeholder="Write your email body here..."
          />
        </div>
      </form>
    </div>
  );
};
