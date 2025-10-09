import { VideoPlayer } from "@/components/ui/video-thumbnail-player";

export function LandingDemo() {
  return (
    <section id="demo" className="py-32 px-6 sm:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="sr-only">Demo</h2>
        <VideoPlayer
          thumbnailUrl="https://img.youtube.com/vi/UVpDdxRQKnA/maxresdefault.jpg"
          videoUrl="https://youtu.be/UVpDdxRQKnA?si=ojkcKXWPlnqTP6yG"
          title="See Briki in Action"
          description="2-min demo: from raw policy to proposal"
          className="rounded-xl"
        />
      </div>
    </section>
  );
}
