"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeOnboardingAction } from "./actions";

type SupportedLocale = "en" | "es";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [locale, setLocale] = useState<SupportedLocale>("en");

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return locale === "en" || locale === "es";
    return true;
  }, [step, name, locale]);

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">{t("title")}</h1>

      <form action={completeOnboardingAction} className="space-y-8">
        {/* Hidden fields keep state in sync with server action FormData */}
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="company" value={company} />
        <input type="hidden" name="locale" value={locale} />

        {step === 0 && (
          <section aria-label="basic">
            <h2 className="text-lg font-medium mb-4">{t("steps.basic.title")}</h2>
            <div className="grid gap-3">
              <label className="text-sm font-medium" htmlFor="name">
                {t("steps.basic.nameLabel")}
              </label>
              <Input
                id="name"
                name="__name__client"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("steps.basic.namePlaceholder")}
                aria-required
                required
              />
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-label="role">
            <h2 className="text-lg font-medium mb-4">{t("steps.role.title")}</h2>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="role">
                  {t("steps.role.roleLabel")}
                </label>
                <Input
                  id="role"
                  name="__role__client"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="company">
                  {t("steps.role.companyLabel")}
                </label>
                <Input
                  id="company"
                  name="__company__client"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-label="locale">
            <h2 className="text-lg font-medium mb-4">{t("steps.locale.title")}</h2>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="locale">
                  {t("steps.locale.localeLabel")}
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={locale === "en" ? "default" : "outline"}
                    onClick={() => setLocale("en")}
                    aria-pressed={locale === "en"}
                  >
                    {t("steps.locale.options.en")}
                  </Button>
                  <Button
                    type="button"
                    variant={locale === "es" ? "default" : "outline"}
                    onClick={() => setLocale("es")}
                    aria-pressed={locale === "es"}
                  >
                    {t("steps.locale.options.es")}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mt-2 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            {t("actions.back")}
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(2, s + 1))}
              disabled={!canNext}
            >
              {t("actions.next")}
            </Button>
          ) : (
            <Button type="submit" disabled={!canNext}>
              {t("actions.finish")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}


