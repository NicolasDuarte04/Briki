"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../actions";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  // Show error only if submitted OR (touched AND invalid)
  const showEmailError = emailError && (submitted || touched.email);
  const showPasswordError = passwordError && (submitted || touched.password);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    // If valid, proceed with submission
    if (!emailError && !passwordError) {
      setIsLoading(true);

      try {
        const formData = new FormData(e.currentTarget);
        const result = await login(formData);

        if (!result.success) {
          setServerError(result.error);
          setIsLoading(false);
        }
      } catch (error) {
        if (error && isRedirectError(error)) {
          throw error;
        }

        setServerError("An unexpected error occurred. Please try again.");
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[440px] space-y-6">
      <div className="space-y-8">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => {
                setPasswordFocused(false);
                setTouched((prev) => ({ ...prev, password: true }));
              }}
              aria-invalid={showPasswordError ? "true" : "false"}
              aria-describedby={
                showPasswordError
                  ? "password-error"
                  : passwordFocused
                    ? "password-helper"
                    : undefined
              }
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
          {showPasswordError ? (
            <p id="password-error" className="text-sm text-destructive">
              {passwordError}
            </p>
          ) : (
            passwordFocused && (
              <p id="password-helper" className="text-sm text-muted-foreground">
                Must be at least 8 characters
              </p>
            )
          )}
        </div>
      </div>

      {/* Primary Action */}
      <div className="space-y-3">
        {serverError && (
          <p className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        {/* Secondary Action */}
        <Button type="button" variant="outline" className="w-full h-11" disabled={isLoading}>
          Continue with Google
        </Button>
      </div>

      {/* Links */}
      <div className="flex items-center justify-center gap-3 text-sm">
        <a
          href="/forgot-password"
          className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Forgot password
        </a>
        <span className="text-muted-foreground">|</span>
        <Link
          href="/register"
          className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Create account
        </Link>
      </div>
    </form>
  );
}
