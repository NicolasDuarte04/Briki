'use client';

/**
 * LandingChangelog - Recent updates preview
 * 
 * Displays recent version updates in a horizontal card layout,
 * similar to Cursor's changelog section.
 */
export function LandingChangelog() {
  const updates = [
    {
      version: '1.3',
      date: 'Dec 2025',
      summary: 'PDF parser upgrade and policy tagging',
    },
    {
      version: '1.2',
      date: 'Nov 2025',
      summary: 'Workspace redesign and multi-broker support',
    },
    {
      version: '1.1',
      date: 'Oct 2025',
      summary: 'New AI comparison model',
    },
  ];

  return (
    <section
      className="relative w-full py-24 px-6 sm:px-8"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)' }}
      aria-labelledby="changelog-heading"
    >
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Section heading */}
        <h2
          id="changelog-heading"
          className="mb-12"
          style={{
            fontSize: '28px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.95)',
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
          }}
        >
          Recent updates
        </h2>

        {/* Update cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {updates.map((update, index) => (
            <div
              key={index}
              className="rounded-[10px] border transition-all duration-200 hover:translate-y-[-1px] hover:opacity-95"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                padding: '24px',
              }}
            >
              {/* Version badge */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.85)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {update.version}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    color: 'rgba(248, 250, 252, 0.5)',
                    fontWeight: '500',
                  }}
                >
                  {update.date}
                </span>
              </div>

              {/* Summary */}
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: '1.5',
                  color: 'rgba(248, 250, 252, 0.7)',
                  fontWeight: '400',
                }}
              >
                {update.summary}
              </p>
            </div>
          ))}
        </div>

        {/* Link to full changelog */}
        <div className="flex justify-center">
          <a
            href="#changelog"
            className="group inline-flex items-center gap-2 transition-all duration-200"
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.textUnderlineOffset = '3px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            See what's new in Briki
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform group-hover:translate-x-1"
            >
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

