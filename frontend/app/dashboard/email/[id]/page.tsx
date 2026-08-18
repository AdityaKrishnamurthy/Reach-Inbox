'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EmailDetail, EmailDetailData } from '@/components/email/EmailDetail';
import { fetchApi } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EmailDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [email, setEmail] = useState<EmailDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi<{ email: EmailDetailData }>(`/api/emails/${id}`);
        if (response && response.email) {
          setEmail(response.email);
        } else {
          setError('Email record not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve email details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <LoadingState rows={6} />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{error || 'Email record not found'}</span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <EmailDetail email={email} />
    </div>
  );
}
