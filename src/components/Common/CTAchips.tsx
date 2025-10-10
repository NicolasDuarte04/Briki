"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";

export function CTAchips() {
  const { setStep } = useUI();
  const t = useTranslations("landing.cta");
  const items = ["whatsapp", "upload", "carriers"] as const;
  const { user, ready, status } = useAuth();

  const handleActionClick = () => {
    // Wait for auth to be ready before taking action
    if (!ready || status === 'loading') {
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      window.location.href = '/login';
      return;
    }
    
    setStep("conversation");
  };

  const isLoading = !ready || status === 'loading';

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <div className="flex flex-wrap gap-2 items-center overflow-x-hidden">
        {items.map((key) => {
          const label = t(key);
          return (
          <Badge
            key={key}
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80 font-medium text-sm py-1.5 px-3 min-h-[32px] min-w-[112px] max-w-full overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={isLoading ? undefined : handleActionClick}
            aria-label={label}
            title={label}
            aria-disabled={isLoading}
          >
            <span className="truncate min-w-0 block">{label}</span>
          </Badge>
        );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          className="min-w-[80px] whitespace-nowrap"
          onClick={handleActionClick}
          disabled={isLoading}
          aria-label={t("enter")}
        >
          {t("enter")}
        </Button>
      </div>
    </div>
  );
}

export default CTAchips;


