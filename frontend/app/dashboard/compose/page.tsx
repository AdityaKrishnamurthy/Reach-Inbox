'use client';

// Compose route ("/dashboard/compose"). Thin wrapper page that mounts the
// EmailComposer, which holds the actual rich-text editor, recipient upload,
// sender selection, and scheduling controls.

import React from 'react';
import { EmailComposer } from '@/components/email/EmailComposer';

export default function ComposePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <EmailComposer />
    </div>
  );
}
