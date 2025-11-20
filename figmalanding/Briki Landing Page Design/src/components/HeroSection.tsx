import { ChatInput } from './ChatInput';
import waveBackground from 'figma:asset/64b70c402fd2070b55db355a56004ba1f1a48e4e.png';
import brikiLogo from 'figma:asset/452b00b73abde39fe8972bb259849a447bd2e084.png';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Wave background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${waveBackground})`,
        }}
      />
      
      {/* Radial gradient scrim for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(15, 23, 42, 0.65) 0%, rgba(15, 23, 42, 0.4) 40%, transparent 70%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-8 py-16 text-center">
        {/* Logo and Brand */}
        <div className="mb-12 flex flex-col items-center gap-4">
          <img 
            src={brikiLogo} 
            alt="" 
            aria-hidden="true"
            className="w-20 h-20 opacity-90"
          />
          <h1
            className="text-white"
            style={{
              fontSize: 'clamp(3rem, 6vw, 4.5rem)',
              lineHeight: '1',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            }}
          >
            briki
          </h1>
        </div>
        
        <p
          className="mb-12 text-white/90"
          style={{
            fontSize: '1.25rem',
            lineHeight: '1.4',
          }}
        >
          The AI insurance co-pilot. Close deals faster.
        </p>
        
        <ChatInput />
      </div>
      
      {/* Navigation sentinel */}
      <div id="nav-sentinel" className="absolute bottom-0 left-0 right-0 h-1" />
    </section>
  );
}
