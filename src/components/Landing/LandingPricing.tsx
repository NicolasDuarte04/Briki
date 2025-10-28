"use client";

import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Layers, Monitor, Users, Building2, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

export function LandingPricing() {
  const t = useTranslations("landing.pricing");
  const locale = useLocale();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleButtonClick = async (planId: string) => {
    // Don't do anything if auth is still loading
    if (!ready) return;

    // Check if Enterprise plan (special handling)
    if (planId === "enterprise") {
      // Redirect to contact/sales page or open email
      window.location.href = "mailto:sales@briki.com?subject=Enterprise Plan Inquiry";
      return;
    }

    // If user is not authenticated, redirect to login
    if (!user) {
      const currentPath = window.location.pathname;
      const returnUrl = `${currentPath}#pricing`;
      router.push(`/${locale}/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // If user is authenticated, proceed with checkout
    try {
      setLoadingPlan(planId);
      
      // Call the checkout API
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          isAnnual,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionUrl } = await response.json();
      
      if (!sessionUrl) {
        throw new Error("No checkout URL returned from server");
      }

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setLoadingPlan(null);
      alert(error instanceof Error ? error.message : "Error al procesar el pago. Por favor, contacta a soporte.");
    }
  };

  const plans = [
    {
      id: "starter",
      name: t("starter.name"),
      description: t("starter.description"),
      icon: <Layers className="w-8 h-8 text-[var(--briki-primary)]" />,
      priceMonthly: 49,
      priceYearly: 470,
      cta: t("starter.cta"),
      features: [
        t("starter.seats"),
        t("starter.features.aiCredits"),
        t("starter.features.pdfPages"),
        t("starter.features.whatsapp"),
        t("starter.features.sourcing"),
        t("starter.features.comparisons"),
        t("starter.features.proposals"),
        t("starter.features.analytics"),
        t("starter.features.export"),
        t("starter.features.support"),
        t("starter.features.workspace"),
        t("starter.features.encryption"),
      ],
    },
    {
      id: "pro",
      name: t("pro.name"),
      description: t("pro.description"),
      icon: <Monitor className="w-8 h-8 text-[var(--briki-primary)]" />,
      priceMonthly: 149,
      priceYearly: 1430,
      cta: t("pro.cta"),
      features: [
        t("pro.seats"),
        t("pro.features.aiCredits"),
        t("pro.features.pdfPages"),
        t("pro.features.whatsapp"),
        t("pro.features.sourcing"),
        t("pro.features.comparisons"),
        t("pro.features.proposals"),
        t("pro.features.compliance"),
        t("pro.features.analytics"),
        t("pro.features.export"),
        t("pro.features.support"),
        t("pro.features.workspace"),
        t("pro.features.sso"),
        t("pro.features.onboarding"),
      ],
    },
    {
      id: "team",
      name: t("team.name"),
      description: t("team.description"),
      icon: <Users className="w-8 h-8 text-[var(--briki-primary)]" />,
      priceMonthly: 399,
      priceYearly: 3830,
      cta: t("team.cta"),
      recommended: true,
      features: [
        t("team.seats"),
        t("team.features.aiCredits"),
        t("team.features.pdfPages"),
        t("team.features.whatsapp"),
        t("team.features.sourcing"),
        t("team.features.comparisons"),
        t("team.features.proposals"),
        t("team.features.compliance"),
        t("team.features.renewals"),
        t("team.features.analytics"),
        t("team.features.export"),
        t("team.features.support"),
        t("team.features.workspace"),
        t("team.features.sso"),
        t("team.features.sla"),
        t("team.features.onboarding"),
      ],
    },
    {
      id: "enterprise",
      name: t("enterprise.name"),
      description: t("enterprise.description"),
      icon: <Building2 className="w-8 h-8 text-[var(--briki-primary)]" />,
      priceMonthly: null,
      priceYearly: null,
      customPrice: t("enterprise.price"),
      cta: t("enterprise.cta"),
      features: [
        t("enterprise.seats"),
        t("enterprise.features.aiCredits"),
        t("enterprise.features.pdfPages"),
        t("enterprise.features.whatsapp"),
        t("enterprise.features.allWorkflows"),
        t("enterprise.features.privateModel"),
        t("enterprise.features.analytics"),
        t("enterprise.features.support"),
        t("enterprise.features.workspace"),
        t("enterprise.features.sso"),
        t("enterprise.features.sla"),
        t("enterprise.features.compliance"),
        t("enterprise.features.onboarding"),
        t("enterprise.features.dedicated"),
      ],
    },
  ];

  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 px-6 sm:px-8 bg-[var(--briki-surface)]"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            id="pricing-heading"
            className="text-headline font-bold text-[var(--briki-text)] mb-4 font-smooth"
          >
            {t("title")}
          </h2>
          <p className="text-subhead text-[var(--briki-text-muted)] font-smooth max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              !isAnnual ? "text-[var(--briki-text)]" : "text-[var(--briki-text-muted)]"
            )}
          >
            {t("toggleMonthly")}
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:ring-offset-2",
              isAnnual ? "bg-[var(--briki-primary)]" : "bg-input"
            )}
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle billing period"
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform",
                isAnnual ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              isAnnual ? "text-[var(--briki-text)]" : "text-[var(--briki-text-muted)]"
            )}
          >
            {t("toggleAnnual")}{" "}
            <span className="text-[var(--briki-primary)]">({t("saveLabel")})</span>
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-[20px] border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] flex flex-col",
                plan.recommended
                  ? "border-[var(--briki-primary)] ring-2 ring-[var(--briki-primary)]/20 scale-[1.02]"
                  : "border-[var(--briki-border)]"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-fit bg-[var(--briki-primary)] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                  {t("recommended")}
                </div>
              )}

              {/* Card Header */}
              <div className="p-6 pb-4 text-center">
                <div className="flex justify-center mb-4">{plan.icon}</div>
                <h3 className="text-xl font-bold text-[var(--briki-text)] mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-[var(--briki-text-muted)] min-h-[2.5rem]">
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="px-6 pb-6 text-center">
                {plan.customPrice ? (
                  <div className="text-3xl font-bold text-[var(--briki-text)] mb-2">
                    {plan.customPrice}
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[var(--briki-text)] mb-1 transition-all duration-300">
                      ${isAnnual ? Math.round(plan.priceYearly! / 12) : plan.priceMonthly}
                    </div>
                    <p className="text-sm text-[var(--briki-text-muted)]">
                      {isAnnual ? t("perMonth") : t("perMonth")}
                    </p>
                    {isAnnual && (
                      <p className="text-xs text-[var(--briki-text-muted)] mt-1">
                        ${plan.priceYearly} {t("perYear")}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* CTA Button */}
              <div className="px-6 pb-6">
                <Button
                  variant={plan.recommended ? "default" : "outline"}
                  className="w-full font-medium"
                  size="lg"
                  onClick={() => handleButtonClick(plan.id)}
                  disabled={loadingPlan === plan.id || !ready}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("processing", { defaultValue: "Processing..." })}
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </div>

              {/* Features List */}
              <div className="px-6 pb-6 flex-grow border-t border-[var(--briki-border)] pt-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <Check
                        className="w-5 h-5 text-[var(--briki-primary)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-[var(--briki-text-muted)]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
