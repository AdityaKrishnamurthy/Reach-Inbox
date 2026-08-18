'use client';

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link as LinkIcon,
} from 'lucide-react';

interface RichTextToolbarProps {
  onCommand: (command: string, value?: string) => void;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onCommand }) => {
  const handleAction = (cmd: string, val: string = '') => {
    onCommand(cmd, val);
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      onCommand('createLink', url);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 select-none text-gray-600">
      {/* History */}
      <button
        type="button"
        onClick={() => handleAction('undo')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        title="Undo"
      >
        <Undo className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('redo')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        title="Redo"
      >
        <Redo className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Formatting */}
      <button
        type="button"
        onClick={() => handleAction('bold')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors font-bold"
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('italic')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors italic"
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('underline')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors underline"
        title="Underline"
      >
        <Underline className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('strikeThrough')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => handleAction('insertUnorderedList')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Bullet List"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('insertOrderedList')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Numbered List"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('formatBlock', '<blockquote>')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Quote"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Alignment */}
      <button
        type="button"
        onClick={() => handleAction('justifyLeft')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Align Left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('justifyCenter')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Align Center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleAction('justifyRight')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Align Right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={handleLink}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Insert Link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
