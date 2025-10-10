'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProfile, updateNotificationSettings, requestPasswordReset, type FormState } from './actions';
import { toast } from 'sonner';

type Tab = 'personal' | 'security' | 'notifications';

type EditableField = 'name' | 'phone' | 'address';

interface AccountSettingsProps {
  initialName: string;
  initialPhone: string;
  initialAddress: string;
  email: string;
  locale: 'en' | 'es';
  notificationsProductUpdates: boolean;
  notificationsPolicyAlerts: boolean;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-disabled={pending}>
      {pending ? 'Saving...' : label}
    </Button>
  );
}

export function AccountSettings({ 
  initialName, 
  initialPhone,
  initialAddress,
  email, 
  locale,
  notificationsProductUpdates,
  notificationsPolicyAlerts
}: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [phoneValue, setPhoneValue] = useState(initialPhone);
  const [addressValue, setAddressValue] = useState(initialAddress);
  const [productUpdatesChecked, setProductUpdatesChecked] = useState(notificationsProductUpdates);
  const [policyAlertsChecked, setPolicyAlertsChecked] = useState(notificationsPolicyAlerts);
  const [notificationsPending, setNotificationsPending] = useState(false);
  const [passwordResetStatus, setPasswordResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [lastSavedField, setLastSavedField] = useState<EditableField | null>(null);

  const initialState: FormState = { ok: true };
  const [state, formAction] = useActionState(updateProfile, initialState);
  const isFirstSubmission = useRef(true);
  const pendingFieldRef = useRef<EditableField | null>(null);
  const savedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginSave = (field: EditableField) => {
    pendingFieldRef.current = field;
    if (savedIndicatorTimeoutRef.current) {
      clearTimeout(savedIndicatorTimeoutRef.current);
      savedIndicatorTimeoutRef.current = null;
    }
    setLastSavedField(null);
  };

  useEffect(() => {
    if (isFirstSubmission.current) {
      isFirstSubmission.current = false;
      return;
    }

    if (state?.ok) {
      const field = pendingFieldRef.current;
      if (field) {
        switch (field) {
          case 'name':
            setIsEditingName(false);
            break;
          case 'phone':
            setIsEditingPhone(false);
            break;
          case 'address':
            setIsEditingAddress(false);
            break;
        }

        if (savedIndicatorTimeoutRef.current) {
          clearTimeout(savedIndicatorTimeoutRef.current);
        }

        setLastSavedField(field);
        savedIndicatorTimeoutRef.current = setTimeout(() => {
          setLastSavedField((current) => (current === field ? null : current));
        }, 2000);
      }

      pendingFieldRef.current = null;
    } else if (state && !state.ok) {
      pendingFieldRef.current = null;
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, []);

  const handlePasswordReset = async () => {
    setPasswordResetStatus('sending');
    const formData = new FormData();
    formData.append('email', email);
    formData.append('locale', locale);
    
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

  const handleNotificationToggle = async (field: 'productUpdates' | 'policyAlerts', checked: boolean) => {
    setNotificationsPending(true);
    
    const formData = new FormData();
    formData.append('locale', locale);
    
    // Set the toggled field
    if (field === 'productUpdates') {
      setProductUpdatesChecked(checked);
      formData.append('productUpdates', checked ? 'on' : 'off');
      formData.append('policyAlerts', policyAlertsChecked ? 'on' : 'off');
    } else {
      setPolicyAlertsChecked(checked);
      formData.append('productUpdates', productUpdatesChecked ? 'on' : 'off');
      formData.append('policyAlerts', checked ? 'on' : 'off');
    }
    
    const result = await updateNotificationSettings(formData);
    
    setNotificationsPending(false);
    
    if (result.status === 'success') {
      // Subtle success indication - no toast needed for toggles
    } else {
      toast.error('Failed to update notification settings');
      // Revert on error
      if (field === 'productUpdates') {
        setProductUpdatesChecked(!checked);
      } else {
        setPolicyAlertsChecked(!checked);
      }
    }
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
                    <p className="text-base text-gray-900">
                      {nameValue || 'Not set'}
                      {lastSavedField === 'name' && (
                        <span className="ml-2 text-sm text-green-600">Saved</span>
                      )}
                    </p>
                  ) : (
                    <form
                      action={formAction}
                      className="mt-2 space-y-3"
                      onSubmit={() => beginSave('name')}
                    >
                      <Input
                        name="name"
                        defaultValue={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="max-w-md"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <input type="hidden" name="field" value="name" />
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
                    onClick={() => {
                      setIsEditingName(true);
                      setLastSavedField(null);
                    }}
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

            {/* Phone Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Phone</h3>
                  {!isEditingPhone ? (
                    <p className="text-base text-gray-900">
                      {phoneValue || 'Not set'}
                      {lastSavedField === 'phone' && (
                        <span className="ml-2 text-sm text-green-600">Saved</span>
                      )}
                    </p>
                  ) : (
                    <form
                      action={formAction}
                      className="mt-2 space-y-3"
                      onSubmit={() => beginSave('phone')}
                    >
                      <Input
                        name="phone"
                        defaultValue={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        className="max-w-md"
                        placeholder="Enter your phone number"
                        autoFocus
                        maxLength={40}
                      />
                      <input type="hidden" name="field" value="phone" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label="Save" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingPhone(false);
                            setPhoneValue(initialPhone);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
                {!isEditingPhone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingPhone(true);
                      setLastSavedField(null);
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Address</h3>
                  {!isEditingAddress ? (
                    <p className="text-base text-gray-900">
                      {addressValue || 'Not set'}
                      {lastSavedField === 'address' && (
                        <span className="ml-2 text-sm text-green-600">Saved</span>
                      )}
                    </p>
                  ) : (
                    <form
                      action={formAction}
                      className="mt-2 space-y-3"
                      onSubmit={() => beginSave('address')}
                    >
                      <Input
                        name="address"
                        defaultValue={addressValue}
                        onChange={(e) => setAddressValue(e.target.value)}
                        className="max-w-md"
                        placeholder="Enter your address"
                        autoFocus
                        maxLength={200}
                      />
                      <input type="hidden" name="field" value="address" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label="Save" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingAddress(false);
                            setAddressValue(initialAddress);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
                {!isEditingAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingAddress(true);
                      setLastSavedField(null);
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Reset your password by receiving a secure reset link via email. You&apos;ll be able to create a new password after clicking the link.
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
                <input 
                  type="checkbox" 
                  checked={productUpdatesChecked}
                  onChange={(e) => handleNotificationToggle('productUpdates', e.target.checked)}
                  disabled={notificationsPending}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Policy alerts</h3>
                  <p className="text-sm text-gray-500 mt-1">Get notified about important policy changes</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={policyAlertsChecked}
                  onChange={(e) => handleNotificationToggle('policyAlerts', e.target.checked)}
                  disabled={notificationsPending}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
