import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md p-8 border border-gray-200 rounded-lg text-center shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 bg-black text-white rounded flex items-center justify-center font-bold text-xl">
            R
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ReachInbox Scheduler</h1>
        <p className="text-sm text-gray-500 mb-8">
          Durable email scheduling, Redis BullMQ queues, and analytics.
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-2.5 px-4 bg-emerald-50 text-emerald-700 font-medium rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            Go to Login
          </Link>
          <Link
            href="/dashboard"
            className="block w-full py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
