import { Suspense } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

import { updateProfile, getCurrentUserId, type FormState } from "./actions";
import { type LocaleValue } from "./schema";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();

  // If not authenticated, render a minimal message (no client routing changes)
  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { name: true, locale: true } } },
  });

  const initialName = user?.profile?.name ?? "";
  const initialLocale = (user?.profile?.locale ?? "en") as "en" | "es";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <Suspense>
        <ProfileForm initialName={initialName} initialLocale={initialLocale} />
      </Suspense>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg border border-border bg-card p-5 shadow-sm">{children}</section>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

function HelperText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5">{children}</div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">
    {children}
  </div>;
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30",
        "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}

function SubmitButton({ label }: { label: string }) {
  "use client";
  const { pending } = require("react-dom").useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {label}
    </Button>
  );
}

function ProfileForm({ initialName, initialLocale }: { initialName: string; initialLocale: LocaleValue }) {
  "use client";
  const { useFormState } = require("react-dom");
  const { useEffect } = require("react");
  const { toast } = require("sonner");
  const { useTranslations } = require("next-intl");

  const t = useTranslations("profile");
  const tv = useTranslations("validation");

  const initialState: FormState = {};
  const [state, formAction] = useFormState(updateProfile, initialState);

  useEffect(() => {
    if (state?.status === "success") {
      toast.success(t("toast.saved"), { duration: 1800 });
    }
  }, [state?.status, t, toast]);

  const nameError = state?.errors?.name ? tv(state.errors.name) : undefined;
  const localeError = state?.errors?.locale ? tv(state.errors.locale) : undefined;

  return (
    <Section>
      <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
      <form action={formAction} className="mt-4 grid gap-6" noValidate>
        <FieldGroup>
          <Row>
            <Label htmlFor="name">{t("name.label")}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialName}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={["name-help", nameError ? "name-error" : null].filter(Boolean).join(" ")}
            />
            <HelperText id="name-help">{t("name.help")}</HelperText>
            <FieldError id="name-error" message={nameError} />
          </Row>

          <Row>
            <Label htmlFor="locale">{t("locale.label")}</Label>
            <Select
              id="locale"
              name="locale"
              defaultValue={initialLocale}
              aria-invalid={localeError ? "true" : undefined}
              aria-describedby={["locale-help", localeError ? "locale-error" : null].filter(Boolean).join(" ")}
            >
              <option value="en">{t("locale.options.en")}</option>
              <option value="es">{t("locale.options.es")}</option>
            </Select>
            <HelperText id="locale-help">{t("locale.help")}</HelperText>
            <FieldError id="locale-error" message={localeError} />
          </Row>
        </FieldGroup>

        <div>
          <SubmitButton label={t("save")} />
        </div>
      </form>
    </Section>
  );
}
