'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Paperclip,
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
import { AttachmentList, EmailAttachment } from './AttachmentList';
import { fetchApi } from '@/lib/api';

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
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Fetch senders on mount
  useEffect(() => {
    const loadSenders = async () => {
      try {
        const res = await fetchApi<{ senders: SenderOption[] }>('/api/senders');
        if (res.senders && res.senders.length > 0) {
          setSenders(res.senders);
          const defaultSender = res.senders.find((s) => s.is_default) || res.senders[0];
          setSelectedSenderId(defaultSender.id);
        }
      } catch (err) {
        console.error('Failed to load senders:', err);
      }
    };
    loadSenders();
  }, []);

  // Recipient handlers
  const handleAddRecipient = (email: string) => {
    if (!recipients.includes(email)) {
      setRecipients((prev) => [...prev, email]);
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleRecipientsUploaded = (uploadedEmails: string[]) => {
    setRecipients((prev) => {
      const combined = new Set([...prev, ...uploadedEmails]);
      return Array.from(combined);
    });
  };

  // Editor toolbar command
  const handleToolbarCommand = (cmd: string, val: string = '') => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Attachment handler
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: EmailAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newAttachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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

    setIsSubmitting(true);

    try {
      const payload = {
        senderId: selectedSenderId || undefined,
        recipients,
        subject: subject.trim(),
        body: bodyHtml,
        startAt: scheduledDate.toISOString(),
        delayMs: Math.max(0, delaySeconds * 1000),
        hourlyLimit: Math.max(1, hourlyLimit),
      };

      const result = await fetchApi('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage(
        `Successfully scheduled ${result.scheduledCount || recipients.length} email(s)! Redirecting to scheduled list...`
      );

      setTimeout(() => {
        router.push('/dashboard/scheduled');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule campaign');
      setIsSubmitting(false);
    }
  };

  const isScheduledForFuture = scheduledDate.getTime() > Date.now() + 30000;

  return (
    <div className="max-w-5xl mx-auto py-6 px-8 flex flex-col h-full bg-white">
      {/* Top Header Bar (Figma Match) */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/scheduled"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Compose New Email</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Attachment Button */}
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            onChange={handleAttachmentUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-medium ${
              attachments.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            title="Add attachment"
          >
            <Paperclip className="w-4 h-4" />
            {attachments.length > 0 && <span>{attachments.length}</span>}
          </button>

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
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full text-sm text-gray-900 bg-transparent py-1 pr-8 focus:outline-none cursor-pointer"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} &lt;{s.email}&gt; {s.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* To Row with Chips and Upload Button */}
        <div className="flex items-start py-2 border-b border-gray-100">
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
                max="3600"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
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
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
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
            className="flex-1 p-4 text-sm text-gray-900 focus:outline-none overflow-y-auto leading-relaxed"
            data-placeholder="Write your email body here..."
          />
          <AttachmentList attachments={attachments} onRemove={handleRemoveAttachment} />
        </div>
      </form>
    </div>
  );
};
