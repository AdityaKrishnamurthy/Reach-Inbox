import React from 'react';
import { Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ScheduledBadgeProps {
  timestamp: string | Date;
}

export const ScheduledBadge: React.FC<ScheduledBadgeProps> = ({ timestamp }) => {
  const date = new Date(timestamp);
  
  // Format to e.g. "Tue 9:15:12 AM" or "Aug 18, 9:15 AM"
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
      <Clock className="w-3 h-3 text-[#B45309]" />
      <span>{formatted}</span>
    </span>
  );
};

export const SentBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
      <CheckCircle2 className="w-3 h-3 text-gray-500" />
      <span>Sent</span>
    </span>
  );
};

export const FailedBadge: React.FC<{ reason?: string | null }> = ({ reason }) => {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
      title={reason || 'Sending failed'}
    >
      <AlertCircle className="w-3 h-3 text-red-500" />
      <span>Failed</span>
    </span>
  );
};

export const ProcessingBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
      <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
      <span>Processing</span>
    </span>
  );
};

export const EmailStatusBadge: React.FC<{
  status: string;
  scheduledAt?: string | Date;
  failureReason?: string | null;
}> = ({ status, scheduledAt, failureReason }) => {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return scheduledAt ? <ScheduledBadge timestamp={scheduledAt} /> : <span className="text-xs text-amber-700">Scheduled</span>;
    case 'sent':
      return <SentBadge />;
    case 'failed':
      return <FailedBadge reason={failureReason} />;
    case 'processing':
      return <ProcessingBadge />;
    default:
      return <span className="text-xs text-gray-500">{status}</span>;
  }
};
