'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProfile, requestPasswordReset, type FormState } from './actions';
import { toast } from 'sonner';

type Tab = 'personal' | 'security' | 'notifications';

interface AccountSettingsProps {
  initialName: string;
  email: string;
  locale: 'en' | 'es';
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-disabled={pending}>
      {pending ? 'Saving...' : label}
    </Button>
  );
}

export function AccountSettings({ initialName, email, locale }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [passwordResetStatus, setPasswordResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const initialState: FormState = {};
  const [state, formAction] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state?.status === 'success') {
      toast.success('Profile updated successfully');
      setIsEditingName(false);
    } else if (state?.status === 'error' && state?.formError) {
      toast.error('Failed to update profile');
    }
  }, [state]);

  const handlePasswordReset = async () => {
    setPasswordResetStatus('sending');
    const formData = new FormData();
    formData.append('email', email);
    
    const result = await requestPasswordReset(null, formData);
    
    if (result.status === 'success') {
      setPasswordResetStatus('success');
      toast.success('Password reset email sent! Check your inbox.');
    } else {
      setPasswordResetStatus('error');
      toast.error('Failed to send password reset email');
    }
    
    // Reset status after 3 seconds
    setTimeout(() => setPasswordResetStatus('idle'), 3000);
  };

  const tabs = [
    { id: 'personal' as Tab, label: 'Personal info' },
    { id: 'security' as Tab, label: 'Security' },
    { id: 'notifications' as Tab, label: 'Notifications' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Account settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8" aria-label="Account sections">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  pb-3 px-1 text-sm relative transition-colors
                  ${isActive 
                    ? 'text-gray-900 font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'personal' && (
          <>
            {/* Name Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Name</h3>
                  {!isEditingName ? (
                    <p className="text-base text-gray-900">{nameValue || 'Not set'}</p>
                  ) : (
                    <form action={formAction} className="mt-2 space-y-3">
                      <Input
                        name="name"
                        defaultValue={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="max-w-md"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label="Save" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingName(false);
                            setNameValue(initialName);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
                {!isEditingName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Email Card (read-only) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Email</h3>
                  <p className="text-base text-gray-900">{email}</p>
                  <p className="text-xs text-gray-500 mt-1">Your email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Phone Card (placeholder) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Phone</h3>
                  <p className="text-sm text-gray-500">Please add phone number to complete your profile</p>
                </div>
              </div>
            </div>

            {/* Address Card (placeholder) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Address</h3>
                  <p className="text-sm text-gray-500">Please add address to complete your profile</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Reset your password by receiving a secure reset link via email. You'll be able to create a new password after clicking the link.
            </p>
            <Button 
              onClick={handlePasswordReset}
              disabled={passwordResetStatus === 'sending'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {passwordResetStatus === 'sending' ? 'Sending...' : 'Send password reset email'}
            </Button>
            {passwordResetStatus === 'success' && (
              <p className="text-sm text-green-600 mt-2">✓ Reset email sent successfully</p>
            )}
            {passwordResetStatus === 'error' && (
              <p className="text-sm text-red-600 mt-2">Failed to send reset email</p>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Product updates</h3>
                  <p className="text-sm text-gray-500 mt-1">Receive emails about new features and improvements</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    disabled 
                    className="rounded border-gray-300 text-blue-600 opacity-50 cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-400">Coming soon</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Policy alerts</h3>
                  <p className="text-sm text-gray-500 mt-1">Get notified about important policy changes</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    disabled 
                    className="rounded border-gray-300 text-blue-600 opacity-50 cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-400">Coming soon</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
