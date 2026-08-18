'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SenderOption {
  id: string;
  display_name: string;
  email: string;
  is_default: boolean;
}

interface AddSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (sender: SenderOption) => void;
}

export const AddSenderModal: React.FC<AddSenderModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setDisplayName('');
    setEmail('');
    setSmtpUser('');
    setSmtpPass('');
    setShowAdvanced(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || !email.trim()) {
      setError('Display name and email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await fetchApi<{ sender: SenderOption }>('/api/senders', {
        method: 'POST',
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          smtpUser: smtpUser.trim() || undefined,
          smtpPass: smtpPass.trim() || undefined,
        }),
      });
      onCreated(result.sender);
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create sender');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Add Sender</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sales Team"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@example.com"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Use a real Ethereal test account (optional)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Ethereal SMTP User</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="from ethereal.email"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Ethereal SMTP Password</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="from ethereal.email"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Left blank, this sender shares the same auto-generated Ethereal test inbox as your other senders -
                it still gets its own independent rate limit and delay counters.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Sender'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
