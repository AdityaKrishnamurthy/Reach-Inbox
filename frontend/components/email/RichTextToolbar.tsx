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
  const handleAction = (e: React.MouseEvent, cmd: string, val: string = '') => {
    e.preventDefault();
    onCommand(cmd, val);
  };

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
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
        onMouseDown={(e) => handleAction(e, 'undo')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'redo')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        title="Redo (Ctrl+Y)"
      >
        <Redo className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Formatting */}
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'bold')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors font-bold"
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'italic')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors italic"
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'underline')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors underline"
        title="Underline (Ctrl+U)"
      >
        <Underline className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'strikeThrough')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'insertUnorderedList')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Bullet List"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'insertOrderedList')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Numbered List"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'formatBlock', 'blockquote')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Quote Block"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Alignment */}
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'justifyLeft')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Align Left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'justifyCenter')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Align Center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'justifyRight')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Align Right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={handleLink}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Insert Link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
