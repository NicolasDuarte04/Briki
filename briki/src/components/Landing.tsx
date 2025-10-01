"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Image from "next/image";
import BrikiLandingChat, { BrikiLandingChatRef } from "@/components/BrikiLandingChat";

export default function Landing({ className }: { className?: string }) {
  const { setStep, setBrief } = useUI();
  const t = useTranslations("landing");
  const [isLeaving, setIsLeaving] = useState(false);
  const chatRef = useRef<BrikiLandingChatRef>(null);

  const handleCtaClick = () => {
    if (!chatRef.current) return;

    const currentValue = chatRef.current.getValue();
    const trimmed = currentValue.trim();

    if (!trimmed) {
      chatRef.current.focusChat();
      chatRef.current.showHelper();
      return;
    }

    setBrief({ freeText: trimmed });
    setStep("conversation");
  };

  return (
    <>
      {/* Fixed background */}
      <div className="landing-hero" />
      
      {/* Content overlay */}
      <motion.section
        className={cn("landing-overlay w-full grid place-items-center px-4 pt-24", className)}
        initial={{ opacity: 1 }}
        animate={{ opacity: isLeaving ? 0 : 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (isLeaving) setStep("conversation");
        }}
      >
        <div className="w-full max-w-3xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 flex items-center justify-center gap-2">
              <Image
                src="/brand/briki-logo-2.png"
                alt={t("hero.logoAlt")}
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain"
                priority
              />
              <span className="text-white bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] bg-clip-text text-transparent">
                {t("hero.brand")}
              </span>
            </h1>
            <p className="text-neutral-600 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              {t("subtitle")}
            </p>
            <Button
              onClick={handleCtaClick}
              size="lg"
              className="bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] hover:opacity-90 text-white text-lg font-semibold px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              {t("hero.cta")}
            </Button>
          </div>
          
          {/* Chat Component */}
          <BrikiLandingChat ref={chatRef} />

          {/* Video Demo Container */}
          <div className="mt-24 w-full rounded-2xl bg-black/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
            
            {/* Video Title */}
            <div className="relative mb-8">
              <h2 className="text-3xl font-semibold text-white mb-3">{t("hero.video.title")}</h2>
              <p className="text-neutral-400 text-lg">{t("hero.video.description")}</p>
            </div>

            {/* Video Container */}
            <div className="relative rounded-xl overflow-hidden aspect-video bg-black/40 shadow-xl">
              {/* Replace src with your actual video */}
              <video
                className="w-full h-full object-cover"
                poster="/brand/landing-bg.png"
                controls
                preload="none"
              >
                <source src="/path-to-your-video.mp4" type="video/mp4" />
                {t("hero.video.fallback")}
              </video>
            </div>

            {/* Feature Points */}
            <div className="relative mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] flex items-center justify-center text-white">1</div>
                <div>
                  <h3 className="text-white font-medium">{t("hero.features.smartConversations.title")}</h3>
                  <p className="text-neutral-400 text-sm">{t("hero.features.smartConversations.description")}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] flex items-center justify-center text-white">2</div>
                <div>
                  <h3 className="text-white font-medium">{t("hero.features.realTimeAnalysis.title")}</h3>
                  <p className="text-neutral-400 text-sm">{t("hero.features.realTimeAnalysis.description")}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] flex items-center justify-center text-white">3</div>
                <div>
                  <h3 className="text-white font-medium">{t("hero.features.seamlessIntegration.title")}</h3>
                  <p className="text-neutral-400 text-sm">{t("hero.features.seamlessIntegration.description")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Spacer to ensure footer appears below the fold */}
        <div className="h-32" />
      </motion.section>
    </>
  );
}

