'use client';

import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, FileText } from 'lucide-react';

interface RecipientUploaderProps {
  onRecipientsUploaded: (emails: string[]) => void;
  detectedCount: number;
}

export const RecipientUploader: React.FC<RecipientUploaderProps> = ({
  onRecipientsUploaded,
  detectedCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Parse emails
        const emailRegex = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;
        const matches = content.match(emailRegex) || [];
        const unique = Array.from(new Set(matches.map((m) => m.toLowerCase())));
        onRecipientsUploaded(unique);
      }
      setIsParsing(false);
    };

    reader.onerror = () => {
      setIsParsing(false);
      alert('Failed to read recipient file.');
    };

    reader.readAsText(file);
    // Reset file input value so re-uploading same file works
    e.target.value = '';
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
    </div>
  );
};
