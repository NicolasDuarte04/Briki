import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UpdatePasswordForm } from './UpdatePasswordForm';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function UpdatePasswordPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createServerSupabase();

  // Check if the user has a valid recovery session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // No valid session, redirect to login
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 text-center">
            Update your password
          </h1>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Please enter your new password below. Make sure it&apos;s at least 8 characters long and secure.
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10">
          <UpdatePasswordForm locale={locale} />
        </div>
        
        <div className="text-center">
          <a 
            href={`/${locale}/login`}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
