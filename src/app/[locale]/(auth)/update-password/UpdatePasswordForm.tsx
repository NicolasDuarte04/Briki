'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updatePassword } from '../actions';
import { toast } from 'sonner';

interface UpdatePasswordFormProps {
  locale: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700"
    >
      {pending ? 'Updating...' : 'Update password'}
    </Button>
  );
}

export function UpdatePasswordForm({ locale }: UpdatePasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 6) return { strength: 1, text: 'Too weak' };
    if (password.length < 8) return { strength: 2, text: 'Weak' };
    
    let strength = 2;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    const strengthTexts = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return {
      strength: Math.min(strength, 4),
      text: strengthTexts[Math.min(strength, 4)]
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Validate on change
  useEffect(() => {
    const newErrors: typeof errors = {};
    
    if (newPassword && newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (confirmPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (formData: FormData) => {
    // Add locale to form data
    formData.append('locale', locale);
    
    const result = await updatePassword(formData);
    
    if (!result.ok) {
      toast.error(result.error || 'Failed to update password');
    }
    // Success case will redirect, so no need to handle it here
  };

  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground/90 mb-1">
          New password
        </label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pr-10"
            placeholder="Enter new password"
            required
            autoFocus
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.newPassword && (
          <p id="newPassword-error" className="text-sm text-red-600 mt-1">
            {errors.newPassword}
          </p>
        )}
        {newPassword && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < passwordStrength.strength + 1
                      ? passwordStrength.strength >= 3
                        ? 'bg-green-500'
                        : passwordStrength.strength >= 2
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs ${
              passwordStrength.strength >= 3
                ? 'text-green-600'
                : passwordStrength.strength >= 2
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}>
              {passwordStrength.text}
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground/90 mb-1">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
        />
        {errors.confirmPassword && (
          <p id="confirmPassword-error" className="text-sm text-red-600 mt-1">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
