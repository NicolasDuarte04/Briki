"use client";

import { useState, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  id: string;
  label: string;
  hint?: string;
  errorMessage?: string;
}

export default function PasswordField({ id, label, hint, errorMessage }: PasswordFieldProps): ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</Label>
        {hint ? (
          <span id={hintId} className="text-xs text-slate-500">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={isVisible ? "text" : "password"}
          autoComplete="current-password"
          aria-describedby={describedBy}
          aria-invalid={Boolean(errorMessage)}
          className="h-12 pr-14 border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
        />
        <Button
          type="button"
          variant="ghost"
          className="absolute inset-y-0 right-1.5 flex h-full min-h-[44px] items-center gap-1.5 rounded-md px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => setIsVisible((prev) => !prev)}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          <span>{isVisible ? "Hide" : "Show"}</span>
        </Button>
      </div>
      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm font-medium text-red-600"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
