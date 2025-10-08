import { VideoPlayer } from "@/components/ui/video-thumbnail-player";

export function LandingDemo() {
  return (
    <section id="demo" className="py-32 px-6 sm:px-8 bg-[var(--briki-surface-alt)]">
      <div className="max-w-5xl mx-auto">
        <h2 className="sr-only">Demo</h2>
        <VideoPlayer
          thumbnailUrl="https://images.unsplash.com/photo-1593642532454-e138e28a63f4?q=80&w=2069&auto=format&fit=crop"
          videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
          title="See Briki in Action"
          description="2-min demo: from raw policy to proposal"
          className="rounded-xl"
        />
      </div>
    </section>
  );
}
