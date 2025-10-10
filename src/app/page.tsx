import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  // Let next-intl middleware handle the locale redirect
  redirect('/es');
}
