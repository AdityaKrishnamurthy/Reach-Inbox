'use client';

import React from 'react';
import { EmailComposer } from '@/components/email/EmailComposer';

export default function ComposePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <EmailComposer />
    </div>
  );
}
