'use client';

// Formatting toolbar for the compose editor. Renders buttons for common
// contenteditable rich-text commands (font size, bold/italic/underline/
// strikethrough, alignment, lists, indentation, quote block) and reports the
// chosen command up to the parent via onCommand.

import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Undo,
  Redo,
} from 'lucide-react';

interface RichTextToolbarProps {
  onCommand: (command: string, value?: string) => void;
}

// Cycles through the four justify commands on each click - one button
// covering what would otherwise be three or four separate align buttons.
const ALIGN_CYCLE: { command: string; Icon: typeof AlignLeft; title: string }[] = [
  { command: 'justifyLeft', Icon: AlignLeft, title: 'Align Left' },
  { command: 'justifyCenter', Icon: AlignCenter, title: 'Align Center' },
  { command: 'justifyRight', Icon: AlignRight, title: 'Align Right' },
  { command: 'justifyFull', Icon: AlignJustify, title: 'Justify' },
];

const FONT_SIZES = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'Huge', value: '7' },
];

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onCommand }) => {
  const [alignIndex, setAlignIndex] = useState(0);
  const align = ALIGN_CYCLE[alignIndex];

  const handleAction = (e: React.MouseEvent, cmd: string, val: string = '') => {
    e.preventDefault();
    onCommand(cmd, val);
  };

  const handleAlignClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextIndex = (alignIndex + 1) % ALIGN_CYCLE.length;
    setAlignIndex(nextIndex);
    onCommand(ALIGN_CYCLE[nextIndex].command);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCommand('fontSize', e.target.value);
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

      {/* Font Size */}
      <div className="flex items-center gap-1 pr-1">
        <Type className="w-3.5 h-3.5 text-gray-400" />
        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={handleFontSizeChange}
          defaultValue="3"
          className="text-xs bg-transparent border-none rounded hover:bg-gray-200 focus:outline-none py-1 pl-0.5 pr-1 text-gray-600 cursor-pointer"
          title="Font Size"
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

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

      {/* Alignment (single button, cycles left -> center -> right -> justify) */}
      <button
        type="button"
        onMouseDown={handleAlignClick}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title={align.title}
      >
        <align.Icon className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Lists & Indentation */}
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
        onMouseDown={(e) => handleAction(e, 'insertUnorderedList')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Bullet List"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'indent')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Increase Indent"
      >
        <IndentIncrease className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'outdent')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Decrease Indent"
      >
        <IndentDecrease className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Quote */}
      <button
        type="button"
        onMouseDown={(e) => handleAction(e, 'formatBlock', 'blockquote')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Quote Block"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
