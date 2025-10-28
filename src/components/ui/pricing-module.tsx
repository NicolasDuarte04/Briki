"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCheckoutSession, redirectToCheckout } from "@/lib/stripe";

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  priceMonthly: number;
  priceYearly: number;
  users: string;
  features: PlanFeature[];
  recommended?: boolean;
}

export interface PricingModuleProps {
  title?: string;
  subtitle?: string;
  annualBillingLabel?: string;
  buttonLabel?: string;
  plans: PricingPlan[];
  defaultAnnual?: boolean;
  className?: string;
  onPlanSelect?: (planId: string, isAnnual: boolean) => void;
  userId?: string;
}

export function PricingModule({
  title = "Pricing Plans",
  subtitle = "Choose a plan that fits your needs.",
  annualBillingLabel = "Annual billing",
  buttonLabel = "Get started",
  plans,
  defaultAnnual = false,
  className,
  onPlanSelect,
  userId,
}: PricingModuleProps) {
  const [isAnnual, setIsAnnual] = React.useState(defaultAnnual);
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

  const handlePlanSelect = async (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId, isAnnual);
      return;
    }

    // Default Stripe integration
    try {
      setLoadingPlan(planId);
      const sessionUrl = await createCheckoutSession({
        planId,
        isAnnual,
        userId: userId || undefined,
      });
      await redirectToCheckout(sessionUrl);
    } catch (error) {
      console.error('Error starting checkout:', error);
      // You might want to show a toast notification here
      alert(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section
      className={cn(
        "w-full bg-background text-foreground py-20 px-4 md:px-8",
        className
      )}
    >
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold tracking-tight mb-2 text-foreground">{title}</h2>
        <p className="text-muted-foreground mb-8">{subtitle}</p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={cn("text-sm", !isAnnual ? "text-foreground font-medium" : "text-muted-foreground")}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              isAnnual ? "bg-primary" : "bg-input"
            )}
            role="switch"
            aria-checked={isAnnual}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-background shadow-lg transition-transform",
                isAnnual ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
          <span className={cn("text-sm", isAnnual ? "text-foreground font-medium" : "text-muted-foreground")}>
            Annual <span className="text-primary">(Save 20%)</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative border rounded-xl transition-all hover:shadow-md hover:border-primary/30 bg-card text-card-foreground p-6 flex flex-col",
                plan.recommended && "border-primary ring-1 ring-primary/30 scale-[1.03]"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}

              <div className="text-center pt-4 mb-4">
                <div className="flex justify-center mb-4">{plan.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="text-center mb-6 flex-grow">
                <div className="text-3xl font-bold mb-2 transition-all duration-300">
                  ${isAnnual ? plan.priceYearly : plan.priceMonthly}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  / {isAnnual ? "year" : "month"}
                </p>

                <Button
                  variant={plan.recommended ? "default" : "outline"}
                  className="w-full mb-6"
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    buttonLabel
                  )}
                </Button>

                <div className="text-left text-sm">
                  <h4 className="font-semibold mb-2">Overview</h4>
                  <p className="text-muted-foreground mb-4">✓ {plan.users}</p>

                  <h4 className="font-semibold mb-2">Highlights</h4>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {f.included ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span
                          className={f.included
                            ? "text-muted-foreground"
                            : "text-muted-foreground/60 line-through"}
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
