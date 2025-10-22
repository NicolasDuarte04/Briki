'use client';

import { VideoPlayer } from "@/components/ui/video-thumbnail-player";
import { useTranslations } from "next-intl";

export function LandingDemo() {
  const t = useTranslations('landing.demo');

  return (
    <section id="demo" className="py-32 px-6 sm:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="sr-only">Demo</h2>
        <VideoPlayer
          thumbnailUrl="https://img.youtube.com/vi/UVpDdxRQKnA/maxresdefault.jpg"
          videoUrl="https://youtu.be/UVpDdxRQKnA?si=ojkcKXWPlnqTP6yG"
          title={t('title')}
          description={t('description')}
          className="rounded-xl"
        />
      </div>
    </section>
  );
}
