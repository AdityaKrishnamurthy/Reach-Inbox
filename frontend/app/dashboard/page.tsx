// Index route for /dashboard. Has no view of its own; immediately redirects
// to the Scheduled emails view, which is the default landing tab.

import { redirect } from 'next/navigation';

export default function DashboardRootPage() {
  redirect('/dashboard/scheduled');
}
