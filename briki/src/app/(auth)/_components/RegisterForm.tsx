"use client";

import { useState } from "react";
import type { FormEvent, JSX } from "react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "../actions";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function RegisterForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});

  // Validation functions
  const validateEmail = (value: string): string | null => {
    if (!value) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    return null;
  };

  // Get current errors
  const emailError = serverFieldErrors.email ?? validateEmail(email);
  const passwordError = serverFieldErrors.password ?? validatePassword(password);

  // Show error only if submitted OR (touched AND invalid) OR server flagged
  const showEmailError = Boolean(emailError) && (submitted || touched.email || Boolean(serverFieldErrors.email));
  const showPasswordError = Boolean(passwordError) && (submitted || touched.password || Boolean(serverFieldErrors.password));

  const clearServerFieldError = (field: keyof FieldErrors): void => {
    setServerFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    setServerFieldErrors({});

    // If valid, proceed with submission
    if (!emailError && !passwordError) {
      setIsLoading(true);
      
      try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        
        const result = await signup(formData);

        if (result && !result.success) {
          const fieldErrors: FieldErrors = {};
          const normalized = result.error.toLowerCase();

          if (normalized.includes('already') || normalized.includes('exists')) {
            fieldErrors.email = 'That email is already registered';
          } else if (normalized.includes('weak') || normalized.includes('password must')) {
            fieldErrors.password = 'Password is too weak';
          } else if (normalized.includes('email') && normalized.includes('required')) {
            fieldErrors.email = 'Email address is required';
          } else if (normalized.includes('password') && normalized.includes('required')) {
            fieldErrors.password = 'Password is required';
          }

          if (Object.keys(fieldErrors).length > 0) {
            setServerFieldErrors(fieldErrors);
            setServerError(null);
          } else {
            setServerError(result.error);
          }

          setIsLoading(false);
        }
        // If successful, the server action will redirect to onboarding
      } catch (error) {
        if (error && isRedirectError(error)) {
          throw error;
        }

        setServerError('An unexpected error occurred. Please try again.');
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[440px] space-y-8">
      {/* Server Error */}
      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              clearServerFieldError('email');
              setEmail(e.target.value);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            aria-invalid={showEmailError ? "true" : "false"}
            aria-describedby={showEmailError ? "email-error" : undefined}
            className="h-11"
            disabled={isLoading}
          />
          {showEmailError && (
            <p id="email-error" className="text-sm text-destructive">
              {emailError}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                clearServerFieldError('password');
                setPassword(e.target.value);
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, password: true }));
              }}
              aria-invalid={showPasswordError ? "true" : "false"}
              aria-describedby={showPasswordError ? "password-error" : undefined}
              className="h-11 pr-11"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {showPasswordError && (
            <p id="password-error" className="text-sm text-destructive">
              {passwordError}
            </p>
          )}
        </div>
      </div>

      {/* Primary Action */}
      <div className="space-y-4">
        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        {/* Policy Line */}
        <p className="text-sm text-muted-foreground text-center">
          By selecting &ldquo;Create account&rdquo;, I agree to the{" "}
          <Link
            href="/privacy"
            className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Terms of Use
          </Link>
          .
        </p>
      </div>

      {/* Sign In Link */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link
          href="/login"
          className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
