'use client';

// Chip-based recipient input for the compose form. Lets a user type, paste,
// or bulk-add comma/newline/semicolon-separated email addresses, validating
// each one client-side before it becomes a removable chip.

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

// Mirrors the backend's RecipientParser email format check so chips added here
// are validated the same way the server will validate them at submit time.
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

interface RecipientChipsProps {
  recipients: string[];
  onRemove: (email: string) => void;
  onAdd: (email: string) => void;
  maxVisible?: number;
}

export const RecipientChips: React.FC<RecipientChipsProps> = ({
  recipients,
  onRemove,
  onAdd,
  maxVisible = 5,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const commitInput = () => {
    const trimmed = inputValue
      .trim()
      .replace(/^["',]+|["',]+$/g, '')
      .trim();
    if (!trimmed) return;

    if (EMAIL_REGEX.test(trimmed)) {
      onAdd(trimmed.toLowerCase());
      setInputValue('');
      setInputError(null);
    } else {
      setInputError(`"${trimmed}" doesn't look like a valid email address.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitInput();
    } else if (e.key === 'Tab' && inputValue.trim()) {
      // Don't trap focus on Tab: commit if valid, otherwise let focus move on
      // and leave the text for the user to fix rather than blocking navigation.
      commitInput();
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      onRemove(recipients[recipients.length - 1]);
    } else if (inputError) {
      setInputError(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (pasteData && (pasteData.includes(',') || pasteData.includes('\n') || pasteData.includes(';'))) {
      e.preventDefault();
      const tokens = pasteData.split(/[\r\n,;\t]+/);
      let invalidCount = 0;
      for (let token of tokens) {
        token = token.trim().replace(/^["']+|["']+$/g, '').trim().toLowerCase();
        if (!token) continue;
        if (EMAIL_REGEX.test(token)) {
          onAdd(token);
        } else {
          invalidCount++;
        }
      }
      setInputValue('');
      setInputError(invalidCount > 0 ? `Skipped ${invalidCount} invalid entr${invalidCount === 1 ? 'y' : 'ies'}.` : null);
    }
  };

  const visibleChips = isExpanded ? recipients : recipients.slice(0, maxVisible);
  const hiddenCount = recipients.length - visibleChips.length;

  return (
    <div className="w-full">
    <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] py-1">
      {visibleChips.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] transition-all"
        >
          <span className="truncate max-w-[200px]">{email}</span>
          <button
            type="button"
            onClick={() => onRemove(email)}
            className="p-0.5 hover:bg-[#DCFCE7] rounded-full text-[#166534] transition-colors"
            title="Remove recipient"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {hiddenCount > 0 && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
        >
          <span>+{hiddenCount} more</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {isExpanded && recipients.length > maxVisible && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
        >
          <span>Show less</span>
          <ChevronUp className="w-3 h-3" />
        </button>
      )}

      <input
        type="email"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commitInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={recipients.length === 0 ? 'Enter email addresses or paste list...' : 'Add more...'}
        className="flex-1 min-w-[160px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent py-0.5"
      />
    </div>
    {inputError && <div className="mt-1 text-xs text-red-600">{inputError}</div>}
    </div>
  );
};
