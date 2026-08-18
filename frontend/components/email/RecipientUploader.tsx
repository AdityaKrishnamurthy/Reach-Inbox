'use client';

import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ParsedRecipientsResponse {
  validEmails: string[];
  invalidEntries: string[];
  totalDetected: number;
}

interface RecipientUploaderProps {
  onRecipientsUploaded: (emails: string[], invalidCount: number) => void;
  detectedCount: number;
}

export const RecipientUploader: React.FC<RecipientUploaderProps> = ({
  onRecipientsUploaded,
  detectedCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setReadError('Only .csv or .txt files are supported.');
      return;
    }

    setReadError(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setIsParsing(false);
        return;
      }

      try {
        // Parse server-side via the same validated RecipientParser the backend
        // uses when actually scheduling, so upload feedback matches what will
        // really be accepted (header rows skipped, invalid entries reported).
        const result = await fetchApi<ParsedRecipientsResponse>('/api/schedules/parse-recipients', {
          method: 'POST',
          body: JSON.stringify({ recipients: content }),
        });
        onRecipientsUploaded(result.validEmails, result.invalidEntries.length);
      } catch (err: any) {
        setReadError(err.message || 'Failed to parse recipient file.');
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setIsParsing(false);
      setReadError('Failed to read recipient file.');
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isParsing}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors disabled:opacity-50"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>{isParsing ? 'Parsing...' : 'Upload List'}</span>
      </button>

      {detectedCount > 0 && (
        <div className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>{detectedCount} detected</span>
        </div>
      )}

      {readError && (
        <div className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{readError}</span>
        </div>
      )}
    </div>
  );
};
