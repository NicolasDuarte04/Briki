'use client';

export function LandingSecurity() {
  const securityFeatures = [
    {
      title: 'Roles & Permissions',
      description: 'Granular access control'
    },
    {
      title: 'Audit Trail',
      description: 'Complete activity logs'
    },
    {
      title: 'Secure Documents',
      description: 'Encrypted at rest & in transit'
    },
    {
      title: 'Onboarding & Support',
      description: 'Dedicated implementation'
    }
  ];

  return (
    <section 
      id="seguridad"
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="security-heading"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section heading */}
        <h2 
          id="security-heading"
          className="text-center text-white text-4xl font-semibold mb-16"
        >
          Enterprise-grade security
        </h2>
        
        {/* Security cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-white/60">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



