'use client';

import React from 'react';
import { Paperclip, X, File } from 'lucide-react';

export interface EmailAttachment {
  name: string;
  size: number;
  type: string;
}

interface AttachmentListProps {
  attachments: EmailAttachment[];
  onRemove: (index: number) => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onRemove,
}) => {
  if (!attachments || attachments.length === 0) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
      {attachments.map((file, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
        >
          <File className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium truncate max-w-[150px]">{file.name}</span>
          <span className="text-gray-400 text-[10px]">({formatSize(file.size)})</span>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors ml-1"
            title="Remove attachment"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
