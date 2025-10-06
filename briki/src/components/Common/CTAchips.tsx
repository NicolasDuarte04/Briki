"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function CTAchips() {
  const { setStep } = useUI();
  const t = useTranslations("landing.cta");
  const items = ["whatsapp", "upload", "carriers"] as const;
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleActionClick = () => {
    // Check if user is authenticated
    if (!user) {
      window.location.href = '/login';
      return;
    }
    
    setStep("conversation");
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <div className="flex flex-wrap gap-2 items-center overflow-x-hidden">
        {items.map((key) => {
          const label = t(key);
          return (
          <Badge
            key={key}
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80 font-medium text-sm py-1.5 px-3 min-h-[32px] min-w-[112px] max-w-full overflow-hidden"
            onClick={handleActionClick}
            aria-label={label}
            title={label}
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
          aria-label={t("enter")}
        >
          {t("enter")}
        </Button>
      </div>
    </div>
  );
}

export default CTAchips;


