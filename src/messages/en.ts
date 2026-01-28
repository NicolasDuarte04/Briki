const en = {
  nav: {
    features: "Features",
    demo: "Demo",
    pricing: "Pricing",
    start: "Get Started",
    contact: "Contact Us",
    profile: "Profile",
    cases: "Cases",
    clients: "Clients",
    signOut: "Sign Out",
    login: "Login",
    locale: {
      toggle: "Switch language to {language}",
      english: "English",
      spanish: "Spanish",
    },
  },
  validation: {
    required: "Required field.",
    invalidDate: "Enter a valid date.",
    currency: "Enter a valid amount.",
    nonNegative: "Must be non-negative.",
    minValue: "Must be at least {min}.",
    invalidUnion: "Choose a valid option.",
    badReference: "Reference not found.",
    nonEmptyArray: "Add at least one item.",
  },
  models: {
    product: "Product",
    policy: "Policy",
    rider: "Rider",
    pricingBand: "Pricing Band",
    eligibility: "Eligibility",
    provenance: "Provenance",
    case: "Case",
    proposal: "Proposal",
    renewal: "Renewal",
  },
  data: {
    loadFailed: "Failed to load data.",
    malformed: "Data format not recognized.",
    empty: "No data available.",
  },
  landing: {
    hero: {
      logoAlt: "Briki logo",
      brand: "Briki",
      cta: "Start a conversation",
      heading: "Your AI Insurance Agent",
      subhead: "Briki gives brokers their time back. And their edge.",
      primaryCta: "Get started",
      video: {
        title: "See Briki in action",
        description: "Watch how Briki transforms your workflow",
        fallback: "Your browser does not support the video tag.",
      },
      features: {
        smartConversations: {
          title: "Smart Conversations",
          description: "Natural language processing for intuitive interactions",
        },
        realTimeAnalysis: {
          title: "Real-time Analysis",
          description: "Instant insights and recommendations",
        },
        seamlessIntegration: {
          title: "Seamless Integration",
          description: "Works with your existing tools and workflows",
        },
      },
    },
    subtitle: "Analyze policies, compare options, and send proposals in minutes.",
    placeholder: "Describe your client or upload documents…",
    cta: {
      whatsapp: "Import from WhatsApp",
      upload: "Upload PDFs",
      carriers: "Name Carriers",
      enter: "Enter",
    },
    emptyHelper: "Type something or choose a quick action.",
    socialProof: {
      tagline: "Trusted by brokers in Bogotá & CDMX",
      badges: {
        gsea: "GSEA 2025",
        oracle: "Oracle for Startups",
        encrypted: "Data Encrypted & Secure",
        supabase: "Powered by Supabase",
        vercel: "Hosted on Vercel",
        openai: "Powered by OpenAI",
        colombia: "Built in Colombia",
      },
    },
    statsGrowth: {
      title: "Clarity that compounds.",
      description: "Briki turns policy PDFs into proposals and insights—so brokers make decisions faster.",
      cta: {
        primary: "Watch demo",
        secondary: "See how it works",
      },
      primaryStat: {
        value: "~2.5k",
        label: "Hours saved this quarter",
      },
      stats: {
        brokers: {
          value: "40+",
          label: "Active brokers",
        },
        policies: {
          value: "1.2k+",
          label: "Policies analyzed",
        },
        timeSaved: {
          value: "~10h/wk",
          label: "Time saved per broker",
        },
        integrations: {
          value: "Multi",
          label: "WhatsApp, PDFs, Carriers",
        },
      },
    },
    howItWorks: {
      heading: "How it works",
      steps: {
        upload: {
          title: "Upload",
          bullets: ["Policy PDF or WhatsApp chat", "Spanish/English"]
        },
        analyze: {
          title: "Analyze",
          bullets: ["Extract clauses & exclusions", "Compare carriers"]
        },
        propose: {
          title: "Propose",
          bullets: ["Client-ready proposal", "Share by email/WhatsApp"]
        }
      }
    },
    pricing: {
      title: "Pricing Plans",
      subtitle: "Choose a plan that fits your needs.",
      toggleMonthly: "Monthly",
      toggleAnnual: "Annual",
      saveLabel: "Save 20%",
      perMonth: "per month",
      perYear: "per year",
      recommended: "Recommended",
      starter: {
        name: "Starter",
        description: "Perfect for independent brokers",
        cta: "Get Started",
        seats: "1 user",
        features: {
          aiCredits: "1,000 AI credits/month",
          pdfPages: "500 PDF pages/month",
          whatsapp: "WhatsApp integration",
          sourcing: "Automatic sourcing",
          comparisons: "Unlimited comparisons",
          proposals: "Basic proposals",
          analytics: "Basic analytics",
          export: "PDF export",
          support: "Email support",
          workspace: "Personal workspace",
          encryption: "SSL encryption"
        }
      },
      pro: {
        name: "Pro",
        description: "For growing teams",
        cta: "Start trial",
        seats: "3 users",
        features: {
          aiCredits: "5,000 AI credits/month",
          pdfPages: "2,000 PDF pages/month",
          whatsapp: "WhatsApp integration",
          sourcing: "Automatic sourcing",
          comparisons: "Unlimited comparisons",
          proposals: "Advanced proposals",
          compliance: "Compliance verification",
          analytics: "Advanced analytics",
          export: "Multiple export",
          support: "Priority support",
          workspace: "Shared workspace",
          sso: "Enterprise SSO",
          onboarding: "Dedicated onboarding"
        }
      },
      team: {
        name: "Team",
        description: "For large teams",
        cta: "Contact sales",
        seats: "10 users",
        features: {
          aiCredits: "15,000 AI credits/month",
          pdfPages: "5,000 PDF pages/month",
          whatsapp: "WhatsApp integration",
          sourcing: "Automatic sourcing",
          comparisons: "Unlimited comparisons",
          proposals: "Advanced proposals",
          compliance: "Compliance verification",
          renewals: "Renewal management",
          analytics: "Advanced analytics",
          export: "Multiple export",
          support: "Priority support",
          workspace: "Shared workspace",
          sso: "Enterprise SSO",
          sla: "99.9% SLA",
          onboarding: "Dedicated onboarding"
        }
      },
      enterprise: {
        name: "Enterprise",
        description: "Custom solution",
        price: "Custom",
        cta: "Contact sales",
        seats: "Unlimited users",
        features: {
          aiCredits: "Unlimited AI credits",
          pdfPages: "Unlimited PDF pages",
          whatsapp: "WhatsApp integration",
          allWorkflows: "All workflows",
          privateModel: "Private AI model",
          analytics: "Custom analytics",
          support: "24/7 support",
          workspace: "Custom workspace",
          sso: "Enterprise SSO",
          sla: "99.9% SLA",
          compliance: "Custom compliance",
          onboarding: "Dedicated onboarding",
          dedicated: "Dedicated team"
        }
      }
    },
    contactCta: {
      heading: "Ready to revolutionize your insurance process?",
      subheading: "Join hundreds of brokers already using Briki to be more efficient.",
      form: {
        name: {
          label: "Full name",
          placeholder: "Your full name"
        },
        email: {
          label: "Corporate email",
          placeholder: "you@company.com"
        },
        company: {
          label: "Company",
          placeholder: "Your company name"
        },
        city: {
          label: "City",
          placeholder: "Your city"
        },
        phone: {
          label: "Phone",
          placeholder: "+1 555 123 4567"
        },
        submit: "Request demo"
      },
      demo: "Watch live demo"
    },
    features: {
      heading: "Features",
      items: {
        extraction: {
          title: "Smart extraction",
          bullets: ["OCR + clause parsing", "Exclusions & limits surfaced"]
        },
        comparisons: {
          title: "Fast comparisons",
          bullets: ["Side-by-side carriers", "Gaps highlighted"]
        },
        outputs: {
          title: "Client-ready outputs",
          bullets: ["Proposal PDFs & email", "Spanish/English"]
        }
      }
    },
    featuresGrid: {
      compare: {
        title: "Compare policies in seconds.",
        description: "Briki extracts and aligns coverage data so you can instantly see what each insurer offers — clear, structured, and side-by-side."
      },
      proposal: {
        title: "Create your proposal with clarity.",
        description: "Briki aligns insurers' coverages side by side so you can compare, adjust, and finalize in minutes."
      },
      copilot: {
        title: "Open Briki anywhere — your broker Copilot.",
        description: "Use the same quick command (control + K) to open Briki's AI workspace across proposals, chats, or policies."
      },
      generate: {
        title: "Generate client proposals in seconds.",
        description: "Briki drafts professional, bilingual proposals directly from analyzed policies — ready to send or download."
      }
    },
    demo: {
      title: "See Briki in Action",
      description: "2-min demo: from raw policy to proposal"
    },
    demos: {
      workspace: {
        sidebarItems: {
          activeCases: "Active cases",
          documents: "Documents",
          clients: "Clients",
          recent: "Recent",
        },
        searchPlaceholder: "Search cases, clients, documents...",
        teamName: "Briki Team",
        sectionTitle: "Active cases",
        viewAll: "View all",
        caseStatus: {
          inReview: "In review",
          pending: "Pending",
          completed: "Completed",
          inProgress: "In progress",
        },
        caseTypes: {
          life: "Life",
          auto: "Auto",
          home: "Home",
          health: "Health",
        },
      },
      dashboard: {
        navItems: {
          cases: "Cases",
          clients: "Clients",
          documents: "Documents",
          compare: "Compare",
          proposals: "Proposals",
        },
        searchPlaceholder: "Search clients, cases, policies…",
        teamName: "Briki Team",
        casesTitle: "Cases",
        filterActive: "Active",
        filterPending: "Pending",
        caseStatus: {
          active: "Active",
          pending: "Pending",
          inReview: "In review",
        },
        caseTypes: {
          life: "Life",
          auto: "Auto",
          home: "Home",
          health: "Health",
        },
        detailsSection: {
          lifeInsurance: "Life Insurance",
          annualPremium: "Annual premium",
          insurer: "Insurer",
          policy: "Policy",
          validity: "Validity",
          months: "months",
          renewal: "Renewal",
        },
        quickActions: {
          title: "Quick actions",
          analyzePolicy: "Analyze policy",
          comparePlans: "Compare plans",
          generateProposal: "Generate proposal",
        },
        recentActivity: {
          title: "Recent activity",
          clientReviewed: "Client reviewed proposal",
          documentsUpdated: "Documents updated",
          caseCreated: "Case created",
          timeAgo: {
            minutes: "{count}m ago",
            hours: "{count}h ago",
            days: "{count}d ago",
          },
        },
        updatedAgo: "Updated {time} ago",
      },
      agent: {
        analysisInProgress: "Analysis in progress",
        inProgressSection: "In progress",
        readySection: "Ready",
        analysisTitle: "Policy Analysis — Life",
        clientInfo: "Corporate client · Briki Team",
        exportButton: "Export",
        userRole: "Sales team",
        agentRole: "Briki Agent",
        activities: {
          analyzingPolicy: "Analyzing life policy",
          extractingExclusions: "Extracting exclusions",
          generatingSummary: "Generating executive summary",
          documentProcessed: "Document processed",
          coverageIdentified: "Coverage identified",
        },
        resultSections: {
          identifiedRisks: "Identified risks",
          mainCoverage: "Main coverage",
          keyExclusions: "Key exclusions",
          nextSteps: "Next steps",
        },
        risks: {
          extremeSports: "Extreme sports exclusion",
          waitingPeriod: "Waiting period: 90 days",
        },
        coverage: {
          insuredAmount: "Insured amount",
          monthlyPremium: "Monthly premium",
          beneficiaries: "Beneficiaries",
          designated: "designated",
        },
        exclusions: {
          suicideFirstYears: "Suicide in first 2 years",
          preexisting: "Pre-existing conditions",
          highRisk: "High-risk activities",
        },
        nextStepsItems: {
          reviewExclusions: "Review exclusions with client",
          confirmBeneficiaries: "Confirm beneficiaries",
          generateProposal: "Generate final proposal",
        },
        generateProposalButton: "Generate proposal",
        resultTitle: "Result",
      },
      comparison: {
        header: "COMPARISON",
        showDifferences: "Show differences",
        featureColumn: "FEATURE",
        planPrefix: "Plan",
        hoverHint: "Hover rows to highlight",
        features: {
          deductible: "Deductible",
          coverageCap: "Coverage cap",
          exclusions: "Exclusions",
          premium: "Premium",
        },
      },
      policyComparison: {
        title: "Policy Comparison",
        subtitle: "{count} policies analyzed · {selected} selected",
        generateProposal: "Generate Proposal",
        conceptColumn: "Concept",
        includeLabel: "Include",
        confidence: "{percent}% Confidence",
        categories: {
          coverage: "Coverage",
          financial: "Financial",
          exclusions: "Exclusions",
          beneficiaries: "Beneficiaries",
        },
        concepts: {
          insuredAmount: "Insured amount",
          accidentalDeath: "Accidental death",
          totalDisability: "Total disability",
          monthlyPremium: "Monthly premium",
          deductible: "Deductible",
          extremeSports: "Extreme sports",
          waitingPeriod: "Waiting period",
          maxBeneficiaries: "Maximum number",
        },
        values: {
          included: "Included",
          notIncluded: "Not included",
          days: "{count} days",
        },
        footerHint: "Select the policies you want to include in the final proposal",
        selectedCount: "{count} selected",
      },
      policyRewrite: {
        originalLabel: "Original",
        plainLanguageLabel: "Plain Language",
        rewriteChip: "Rewrite",
        keyLabel: "Key:",
        keyInsight: "Missing this deadline could affect your claim",
        originalText: "The insured must notify the insurer in writing within five business days from the occurrence of the claim, except in cases of force majeure duly proven.",
        rewrittenText: "You must notify the insurance company in writing within 5 business days after the incident occurs.",
      },
    },
    // Hero section
    mainHero: {
      heading: "The best way to run brokerage.",
      subheading: "Briki automates 95% of busy work.",
      cta: "Start Now!",
    },
    // Final CTA section
    finalCta: {
      heading: "Try Briki now.",
      subheading: "The easiest way for brokers to analyze policies and close faster.",
      cta: "Get Started →",
    },
    // FAQ section
    faq: {
      title: "Frequently Asked Questions",
      items: {
        integration: {
          question: "How does Briki integrate with my existing workflow?",
          answer: "Briki works alongside your current tools. Import from WhatsApp, upload PDFs, or connect to carrier portals. Everything stays in one place.",
        },
        languages: {
          question: "What languages does Briki support?",
          answer: "Briki fully supports Spanish and English for policy analysis, proposals, and all communications.",
        },
        security: {
          question: "How secure is my client data?",
          answer: "All data is encrypted at rest and in transit. We maintain SOC 2 compliance and provide granular role-based access controls.",
        },
        trial: {
          question: "Can I try Briki before committing?",
          answer: "Yes! Start with our free trial or book a personalized demo to see how Briki fits your workflow.",
        },
        support: {
          question: "What kind of support do you provide?",
          answer: "All plans include email support. Pro and Enterprise plans get priority support and dedicated onboarding assistance.",
        },
      },
    },
    // Footer navigation
    siteFooter: {
      sections: {
        product: {
          title: "Product",
          features: "Features",
          workspace: "Workspace",
          aiAssistant: "AI Assistant",
        },
        resources: {
          title: "Resources",
          docs: "Docs",
          changelog: "Changelog",
          status: "Status",
        },
        company: {
          title: "Company",
          about: "About",
          careers: "Careers",
          contact: "Contact",
        },
        legal: {
          title: "Legal",
          terms: "Terms",
          privacy: "Privacy",
        },
        connect: {
          title: "Connect",
          linkedin: "LinkedIn",
          x: "X",
          youtube: "YouTube",
        },
      },
      copyright: "© 2025 Briki. All rights reserved.",
    },
    // Security section
    security: {
      title: "Enterprise-grade security",
      features: {
        roles: {
          title: "Roles & Permissions",
          description: "Granular access control",
        },
        audit: {
          title: "Audit Trail",
          description: "Complete activity logs",
        },
        documents: {
          title: "Secure Documents",
          description: "Encrypted at rest & in transit",
        },
        support: {
          title: "Onboarding & Support",
          description: "Dedicated implementation",
        },
      },
    },
    // Social proof section
    socialProofSection: {
      heading: "Built with trusted infrastructure.",
      logos: {
        openai: "OpenAI - AI infrastructure provider",
        supabase: "Supabase - Backend infrastructure",
        vercel: "Vercel - Deployment platform",
        postgresql: "PostgreSQL - Database",
        stripe: "Stripe - Payment infrastructure",
        nextjs: "Next.js - React framework",
      },
    },
    // Demo wide section
    demoWide: {
      learnMore: "Learn more",
      placeholderText: "Workspace dashboard placeholder",
      demos: {
        agent: {
          title: "Briki AI Assistant",
          description: "Automate comparisons, analyze policies, and draft recommendations with a single prompt.",
        },
        cases: {
          title: "Work across all your cases",
          description: "Start from client chats, PDFs, or policy folders — Briki keeps context everywhere.",
        },
      },
    },
    // Feature trio section
    featureTrio: {
      features: {
        policyUnderstanding: {
          title: "Policy understanding",
          description: "Briki reads PDFs and extracts coverages, exclusions, and key terms in seconds.",
          cta: "Explore policy analysis",
        },
        comparison: {
          title: "Fast comparison",
          description: "Compare plans side-by-side and highlight what actually matters for the client.",
          cta: "See comparison",
        },
        proposal: {
          title: "Proposal output",
          description: "Generate a clean recommendation and next steps you can send instantly.",
          cta: "View proposal output",
        },
      },
      demo: {
        pdfFilename: "Policy_vida.pdf",
        coverage: "Coverage",
        exclusions: "Exclusions",
        exclusionsCount: "3 items",
        waitingPeriod: "Waiting period",
        waitingDays: "30 days",
        premium: "Premium",
        premiumAmount: "$245/mo",
        ready: "Ready",
        recommendation: "Recommendation",
        primaryChoice: "Primary choice",
        nextSteps: "Next Steps",
        reviewExclusions: "Review exclusions",
        confirmBeneficiaries: "Confirm beneficiaries",
        exportPdf: "Export PDF",
        readyToShare: "Ready to share",
      },
    },
  },
  footer: {
    product: {
      label: "Product",
      links: {
        features: "Features",
        pricing: "Pricing",
        demo: "Demo",
        integration: "Integration"
      }
    },
    company: {
      label: "Company",
      links: {
        about: "About",
        careers: "Careers",
        privacy: "Privacy",
        terms: "Terms"
      }
    },
    resources: {
      label: "Resources",
      links: {
        help: "Help Center",
        contact: "Contact",
        blog: "Blog",
        documentation: "Documentation"
      }
    },
    social: {
      label: "Social Links",
      links: {
        linkedin: "LinkedIn",
        email: "Email",
        instagram: "Instagram",
        youtube: "YouTube"
      }
    },
    rights: "All rights reserved.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
    work: "Work with us",
    linkedin: "LinkedIn",
  },
  auth: {
    nav: {
      login: "Login",
      profile: "Profile",
      signOut: "Sign out",
    },
  },
  profile: {
    title: "Profile",
    name: {
      label: "Name",
      help: "How your name appears across the app.",
    },
    locale: {
      label: "Language",
      help: "Choose your preferred language.",
      options: {
        en: "English",
        es: "Spanish",
      },
    },
    save: "Save changes",
    toast: {
      saved: "Profile updated.",
    },
  },
  onboarding: {
    title: "Welcome to Briki",
    steps: {
      basic: {
        title: "Your basics",
        nameLabel: "Your name",
        namePlaceholder: "Enter your name",
      },
      role: {
        title: "Your work",
        roleLabel: "Role",
        companyLabel: "Company",
      },
      locale: {
        title: "Language",
        localeLabel: "Preferred language",
        options: {
          en: "English",
          es: "Spanish",
        },
      },
    },
    actions: {
      back: "Back",
      next: "Next",
      finish: "Finish",
    },
  },
  topbar: {
    brandAria: "Briki",
    brandTitle: "Go to Briki home",
    brandName: "Briki",
    accountMenuAria: "Open account menu",
    accountMenuTitle: "Open account menu",
    accountInitials: "BR",
  },
  workspace: {
    tabs: {
      caseBrief: "Case Brief",
      artifacts: "Artifacts", // ✅ FASE 2: Agregar traducción
      policies: "Policies",
      analysis: "Analysis", // ✅ FASE 5: Policy analysis tab
      comparisons: "Comparisons",
      proposal: "Proposal",
      compliance: "Compliance",
      renewals: "Renewals",
      ariaLabel: "Workspace sections",
    },
    comparisons: {
      title: "Comparisons",
      description: "Tune weightings to understand how each policy supports your client.",
      playbooks: {
        ariaLabel: "Select comparison playbook",
        options: {
          sme: {
            label: "SMB rollover",
            description: "Balance premium pressure with must-have riders for lean teams.",
          },
          hnwi: {
            label: "Executive retention",
            description: "Elevate concierge networks and white-glove service perks.",
          },
          auto: {
            label: "Automotive",
            description: "Prioritise predictable spend and claims efficiency.",
          },
          travel: {
            label: "Global mobility",
            description: "Favour global networks and rapid emergency response.",
          },
        },
      },
      sliderSection: {
        title: "Adjust sliders",
        ariaLabel: "Comparison weight sliders",
        summary: "Total weight: {value}",
      },
      weightsSection: {
        title: "Adjust weights",
        subtitle: "Set how much each factor should influence the comparison score.",
      },
      weights: {
        premium: {
          label: "Premium",
          description: "Reward plans with lower monthly premiums.",
          aria: "Adjust premium weight",
        },
        deductible: {
          label: "Deductible",
          description: "Favour policies with lower deductibles.",
          aria: "Adjust deductible weight",
        },
        riders: {
          label: "Riders",
          description: "Boost plans offering stronger rider packages.",
          aria: "Adjust riders weight",
        },
        network: {
          label: "Network",
          description: "Highlight the breadth and quality of provider access.",
          aria: "Adjust network weight",
        },
        service: {
          label: "Service",
          description: "Account for concierge support and overall client experience.",
          aria: "Adjust service weight",
        },
        valueText: "{value}% weight",
      },
      scores: {
        title: "Policy scores",
        subtitle: "Ranked by how well each plan fits your current weights.",
        rankLabel: "Rank {value}",
      },
      cards: {
        ariaLabel: "Policy comparison cards",
        ariaCard: "Comparison card for {plan}",
        scoreLabel: "Live score",
        scoreValueText: "Score {value}",
        premiumLabel: "Premium",
        deductibleLabel: "Deductible",
        ridersLabel: "Riders",
        ridersCountLabel: "Riders",
        ridersEmpty: "No riders listed",
        ridersStatus: "{count, plural, =0 {No riders listed} one {# rider strength} other {# rider strengths}}",
        networkLabel: "Network",
        serviceLabel: "Service",
        metaLine: "{network} • {service}",
        labels: {
          network: "Network: {value}",
          service: "Service: {value}",
        },
        statuses: {
          better: "Better",
          neutral: "Neutral",
          worse: "Worse",
        },
        indicators: {
          premium: "Premium cost indicator",
          deductible: "Deductible indicator",
          riders: "Rider coverage indicator",
          network: "Network strength indicator",
          service: "Service quality indicator",
        },
        networkLevels: {
          basic: "Core network",
          preferred: "Preferred network",
          concierge: "Concierge network",
          unknown: "Network not specified",
        },
        serviceLevels: {
          standard: "Standard support",
          enhanced: "Enhanced support",
          "white-glove": "White-glove support",
          unknown: "Service not specified",
        },
      },
      actions: {
        reset: "Reset weights",
        resetAria: "Reset comparison sliders",
        resetAnnouncement: "Weights reset to defaults.",
      },
      totalAnnounce: "Total weight {value}.",
      loading: {
        ariaLabel: "Loading comparison scores",
        title: "Loading policy comparisons",
        description: "We’re preparing the latest policy scores for your weights.",
      },
      empty: {
        title: "No policy matches yet",
        description: "We couldn’t find policies that match your current criteria.",
        hint: "Try tweaking the sliders or switching playbooks to explore more fits.",
      },
    },
    caseBrief: {
      title: "Case Brief",
      sections: {
        keyFacts: "Key facts",
        notes: "Notes",
      },
      fields: {
        business: "Business",
        employees: "Employees",
        lines: "Lines",
      },
    },
    policies: {
      title: "Policies",
      columns: {
        plan: "Plan",
        premium: "Premium",
        deductible: "Deductible",
        riders: "Riders",
      },
      columnMenu: {
        trigger: "Column options",
        pin: {
          label: "Pin column",
          left: "Pin left",
          right: "Pin right",
          none: "Unpin",
        },
        reorder: {
          ariaLabel: "Reorder column",
          title: "Drag to reorder",
        },
      },
      filters: {
        plan: { placeholder: "Filter plan…" },
        premium: { label: "Premium" },
        deductible: { label: "Deductible" },
        common: { min: "Min", max: "Max" },
        riders: { label: "Riders", labelWithCount: "Riders: {count}" },
      },
      actions: {
        clearFilters: "Clear filters",
        columnLabel: "Actions",
        shortlist: "Shortlist",
        evidence: "Evidence",
        notes: "Notes",
        viewInPdf: "View in PDF", // ✅ PHASE 6: Translation for "View in PDF" button
      },
      empty: {
        title: "No results",
        description: "Try adjusting or clearing filters.",
        resetFilters: "Clear filters",
      },
    },
    proposal: {
      title: "Proposal",
      subtitle: "A curated summary for your client meeting.",
      brandHeader: {
        preparedBy: "Prepared by",
      },
      meta: {
        generatedOn: "Generated on {date}",
      },
      summary: {
        title: "Plan summary",
        premiumRange: "Premium range",
        avgDeductible: "Average deductible",
        ridersLabel: "Key riders",
        networkLabel: "Network access",
        serviceLabel: "Service level",
        ridersFallback: "No riders listed",
        networkFallback: "Network details pending",
        serviceFallback: "Service details pending",
      },
      briefCard: {
        title: "Client brief",
        subtitle: "Key context for this opportunity.",
        notesLabel: "Notes",
        fields: {
          business: "Business",
          employees: "Employees",
          lines: "Lines",
        },
      },
      brokerCard: {
        title: "Broker",
        agencyLabel: "Agency",
        phoneLabel: "Phone",
        emailLabel: "Email",
      },
      selectedPlans: {
        title: "Recommended plans",
        defaultRationale: "Great balance of coverage, network access, and pricing for this client stage.",
        countLabel: "{count, plural, one {# plan included} other {# plans included}}",
        emptyState: "Shortlist plans to populate your proposal preview.",
        rationale: {
          client: {
            plan1: "Balanced option with good coverage.",
            plan2: "Recommended budget-friendly alternative.",
            plan3: "Maximum coverage for executives."
          }
        }
      },
      plans: {
        scoreLabel: "Score {value}",
        premiumLabel: "Premium",
        deductibleLabel: "Deductible",
        deductibleConsult: "See policy details",
        ridersLabel: "Riders",
        ridersEmpty: "No riders listed",
        benefitsLabel: "Highlights",
        benefitsFallback: "Plan highlights will appear once data is available.",
        rationaleLabel: "Why this plan",
      },
      share: {
        label: "Proposal link",
        message: "Share with stakeholders or drop into an email draft.",
        copyAction: "Copy link",
        copySuccess: "Link copied to clipboard.",
        copyError: "We couldn’t copy the link. Try again.",
      },
      disclosures: {
        title: "Disclosures",
        items: [
          "Premiums and plan availability are subject to carrier confirmation.",
          "Coverage summaries are illustrative; consult carrier documents for full terms.",
          "Implementation timelines depend on underwriting and client documentation readiness.",
        ],
        item1: "Premiums and plan availability are subject to carrier confirmation.",
        item2: "Coverage summaries are illustrative; consult carrier documents for full terms.",
        item3: "Implementation timelines depend on underwriting and client documentation readiness.",
      },
      mathCheck: {
        label: "Math Check",
        badgePassed: "Math check ✓",
        badgeReview: "Review math",
        messages: {
          passed: "All premium and deductible calculations reconcile.",
          allVerified: "All premium and deductible calculations have been verified successfully.",
        },
        message: {
          allVerified: "All premium and deductible calculations have been verified successfully.",
        },
      },
      benefits: {
        title: "Why these plans",
        subtitle: "Talking points to guide your walkthrough.",
        items: {
          planHighlights: "Plan highlights align with the client’s priorities.",
          employeeExperience: "Employee experience remains simple across all options.",
          supportCommitment: "Briki provides onboarding and ongoing support coverage.",
        },
      },
      loading: {
        ariaLabel: "Loading proposal",
        title: "Preparing your proposal",
        description: "We’re finalising plan summaries and disclosures.",
      },
      empty: {
        title: "No proposal data yet",
        description: "Once sourcing completes, your proposal preview will appear here.",
        hint: "Head to the comparisons tab to choose plans first.",
      },
      actions: {
        exportPdf: "Export PDF",
        copyLink: "Copy link",
        copiedToast: "Link copied to clipboard",
      },
    },
    compliance: {
      title: "Compliance checklist",
      description: "Review the required artifacts before generating documents for {jurisdiction}.",
      pass: "Mark checklist complete",
      cancel: "Cancel",
      status: {
        complete: "complete",
        pending: "pending",
      },
      gate: {
        title: "Compliance handoff",
        jurisdictionLabel: "Jurisdiction",
        checklistCta: "Open checklist",
        blockedTitle: "Pending compliance",
        blockedBody: "Complete the checklist before sharing.",
        readyHint: "All checklist items are complete. You can send now.",
      },
      jurisdictions: {
        co: {
          title: "Colombia",
          items: {
            co_item_kyc: "Complete KYC interview",
            co_item_rut: "Confirm RUT certificate",
            co_item_sarlaft: "Collect SARLAFT affidavit",
            co_item_pila: "Validate PILA payment history",
            co_item_beneficiary: "Update beneficiary roster",
          },
        },
        mx: {
          title: "Mexico",
          items: {
            mx_item_kyc: "Complete KYC interview",
            mx_item_constanciaFiscal: "Collect constancia fiscal",
            mx_item_imss: "Verify IMSS registration",
            mx_item_infonavit: "Validate INFONAVIT compliance",
            mx_item_beneficiary: "Update beneficiary roster",
          },
        },
        cl: {
          title: "Chile",
          items: {
            cl_item_kyc: "Complete KYC interview",
            cl_item_rut: "Confirm RUT certificate",
            cl_item_afp: "Validate AFP contributions",
            cl_item_previred: "Download Previred receipts",
            cl_item_beneficiary: "Update beneficiary roster",
          },
        },
        br: {
          title: "Brazil",
          items: {
            br_item_kyc: "Complete KYC interview",
            br_item_cnpj: "Verify CNPJ status",
            br_item_susep: "Confirm SUSEP filing",
            br_item_fgts: "Validate FGTS payments",
            br_item_beneficiary: "Update beneficiary roster",
          },
        },
      },
    },
    send: {
      whatsapp: "Send via WhatsApp",
      email: "Send via Email",
      blockedToast: "Send blocked. Complete the compliance checklist first.",
      successToast: "Proposal sent successfully.",
    },
    followups: {
      title: "Follow-ups",
      predraft: "Pre-draft renewal proposal",
      cadenceLabel: "Cadence",
      chipDays: "{days}d",
      readback: "T+{days}d",
      addDayPlaceholder: "Add day…",
      savedToast: "Cadence updated to {cadence}.",
    },
    audit: {
      attempt: "Send attempt logged for {channel}.",
      blocked: "Send blocked event logged for {channel}.",
      success: "Send success logged for {channel}.",
      followupCadenceChanged: "Follow-up cadence changed: {cadence}",
    },
    renewals: {
      title: "Renewals",
      detect: {
        button: "Detect",
        detecting: "Detecting...",
        tooltip: "Auto-detect renewals from analyzed policies",
        noAnalyses: "No analyzed policies available",
      },
      meta: {
        window: {
          "all": "All Policies",
          "30": "Renewals in 30 days",
          "60": "Renewals in 60 days",
          "90": "Renewals in 90 days",
        },
      },
      filters: {
        window: { label: "Renewal window" },
        carrier: {
          label: "Carrier",
          helper: "Pick one or more carriers.",
        },
        status: { label: "Status" },
      },
      status: {
        ok: "On track",
        dueSoon: "Due soon",
        overdue: "Overdue",
      },
      columns: {
        carrier: "Carrier",
        plan: "Plan",
        date: "Renewal date",
        premium: "Premium",
        status: "Status",
        actions: "Actions",
      },
      actions: {
        compare: "Compare",
        proposal: "Proposal",
        generatingProposal: "Generating...",
        requestQuotes: "Request quotes",
        messageClient: "Message client",
        setReminder: "Set reminder",
        reminderSet: "Reminder set",
      },
      badges: {
        reminderSet: "Reminder set",
      },
      dialog: {
        reminder: {
          title: "Set reminder",
          description: "We'll nudge you before this renewal is due.",
          dateLabel: "Reminder date",
          confirm: "Save reminder",
          cancel: "Cancel",
        },
      },
      toast: {
        nudgeQuote: "Carrier notified for updated quotes.",
        nudgeMessage: "Client notified about the renewal.",
        reminderSet: "Reminder saved.",
      },
      empty: "No policies found. Upload documents in the Policies tab to see renewals.",
      emptyFiltered: "No renewals match the selected filters.",
      sort: {
        date: "Sort by date",
        premium: "Sort by premium",
      },
    },
  },
  composer: {
    placeholder: "Describe your client or upload documents…",
    emptyHelper: "Press Enter to send. Shift+Enter adds a new line.",
  },
  hotkeys: {
    title: "Keyboard shortcuts",
    ignored: "Ignored while typing",
    triggerLabel: "Open keyboard shortcuts",
    guideDescription: "Handy commands to move quickly.",
    closeLabel: "Close keyboard shortcuts",
    items: {
      commandPalette: { label: "Command palette", combo: "⌘/Ctrl+K" },
      openGuide: { label: "Open keyboard shortcuts", combo: "?" },
      togglePanel: { label: "Toggle right panel", combo: "⌘/Ctrl+J" },
      switchStep: { label: "Switch step", combo: "1–8" },
    },
  },
  chat: {
    jumpToNewest: "Jump to newest",
    placeholder: "Send a message…",
    send: "Send",
    typing: "Typing…",
    newMessages: "New messages",
    agent: {
      cardAria: "Agent message",
      name: "Sourcing agent",
      role: "Assistant",
      timestampAria: "Sent at {value}",
      prompt: { label: "Prompt A" },
      actions: {
        approve: { label: "Approve", aria: "Approve sourcing plan" },
        edit: { label: "Edit", aria: "Edit sourcing plan" },
        rerun: { label: "Rerun", aria: "Rerun sourcing flow" },
      },
    },
    agents: {
      sourcing: "Sourcing agent",
    },
    composer: {
      placeholder: "Describe your client or upload documents…",
      emptyHelper: "Press Enter to send. Shift+Enter adds a new line.",
    },
  },
  comparison: {
    title: "Carrier comparison",
    weights: {
      title: "Adjust weights",
      description: "Fine-tune how each factor influences the score.",
      reset: "Reset to defaults",
      total: "Total weight: {value}",
      valueText: "{value} percent",
      labels: {
        premium: "Premium",
        deductible: "Deductible",
        riders: "Riders",
      },
    },
    scores: {
      title: "Plan scores",
      columns: {
        plan: "Plan",
        score: "Score",
      },
      empty: "No plans available yet.",
    },
  },
  contact: {
    title: "Have questions?",
    subtitle: "We're here to help. Contact us directly.",
    email: {
      label: "Email",
      value: "contact@brikiapp.com",
    },
    form: {
      name: "Name",
      email: "Email",
      message: "Message",
      submit: "Send message",
      success: "Thank you! Your message was sent.",
      error: "There was an error. Please try again.",
    },
  },
  // ============================================================================
  // DASHBOARD TRANSLATIONS
  // ============================================================================
  dashboard: {
    title: "Dashboard",
    quickActions: {
      createCase: "Create Case",
      analyzePolicy: "Analyze Policy",
      newClient: "New Client",
      manageProfile: "Manage Profile",
      ariaCreateCase: "Create new case with the agent",
      ariaAnalyzePolicy: "Upload and analyze policy",
      ariaNewClient: "Create a new client",
      ariaManageProfile: "Manage your profile settings",
    },
    zeroState: {
      welcome: "Welcome to Briki! 👋",
      subtitle: "Let's set up your workspace in four simple steps. In a few minutes you'll be ready to manage your cases and policies.",
      step: "Step {number}",
      completed: "✓ Completed",
      progressLabel: "Step {step} {status}",
      needHelp: "Need help? Our team is here for you.",
      contactUs: "Contact us",
      steps: {
        createCase: {
          title: "Create your first case",
          description: "Navigate to the agent interface or click here to open it. We'll help you through a specialized form to study your clients' specific needs by extracting key information from the policies you consider relevant.",
          actionLabel: "Go to Agent chat",
        },
        manageClients: {
          title: "Complete your client's details",
          description: "Complement the basic information of the previously created client or create new clients from scratch with specific cases along with their detailed data to start organizing your cases.",
          actionLabel: "View clients",
        },
        manageCases: {
          title: "Manage your organization's cases",
          description: "Within your organization you can create, delete, load historical conversations and view brief summaries of created cases. To load conversations you must use the 'Chats' section in the right panel.",
          actionLabel: "Case Manager",
        },
        analyzePolicies: {
          title: "Analyze your individual policies",
          description: "You don't necessarily need a case to analyze policies. If you want a comprehensive analysis of policies individually and create your policy bank associated with your organization, you can do it here.",
          actionLabel: "Upload policies",
        },
      },
    },
    continue: {
      title: "Continue working",
      noRecent: "No recent items",
      noRecentDescription: "Start a new case or upload a policy to see it here",
      continueButton: "Continue",
      viewButton: "View",
    },
    recents: {
      cases: "Recent Cases",
      policies: "Recent Policies",
      noCases: "No recent cases",
      noPolicies: "No recent policies",
      createCase: "Create case",
      uploadPolicy: "Upload policy",
      summary: "Summary",
      continue: "Continue",
      analyzed: "Analyzed",
      partial: "Partial",
      pending: "Pending",
    },
    pinned: {
      cases: "Pinned Cases",
      clients: "Pinned Clients",
      policies: "Pinned Policies",
      emptyCases: "You don't have any pinned cases yet.",
      emptyClients: "You don't have any pinned clients yet.",
      emptyPolicies: "You don't have any pinned policies yet.",
      hint: "Pin your favorite items from their detail pages for quick access.",
    },
    relativeTime: {
      justNow: "just now",
      minutesAgo: "{count} min ago",
      hoursAgo: "{count} {count, plural, one {hour} other {hours}} ago",
      daysAgo: "{count} {count, plural, one {day} other {days}} ago",
    },
  },
  // ============================================================================
  // CASES TRANSLATIONS
  // ============================================================================
  cases: {
    title: "Cases",
    subtitle: "Manage and track all your insurance cases",
    newCase: "New Case",
    stats: {
      total: "Total Cases",
      active: "Active Cases",
      drafts: "Drafts",
      highPriority: "High Priority",
    },
    list: {
      searchPlaceholder: "Search by name, reference, or business type...",
      showingCount: "Showing {count} of {total} cases",
      noResults: "No cases found with that search term",
      empty: "No cases yet",
      emptyDescription: "Create your first case to get started.",
      createFirst: "Create First Case",
    },
    card: {
      noName: "Unnamed",
      ref: "Ref:",
      employees: "employees",
      documents: "documents",
      editName: "Edit case name",
    },
    detail: {
      noName: "Unnamed Case",
      status: "Status",
      stage: "Stage",
      priority: "Priority",
      documents: "Documents",
      details: "Details",
      artifacts: "Artifacts",
      caseInfo: "Case Information",
    },
    delete: {
      title: "Delete case?",
      description: "This action cannot be undone. The case and all its associated data will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Delete",
    },
    filters: {
      status: "Status",
      priority: "Priority",
      allStatuses: "All statuses",
      allPriorities: "All priorities",
      all: "All",
      active: "Active",
      draft: "Draft",
      completed: "Completed",
      archived: "Archived",
      urgent: "Urgent",
      high: "High",
      medium: "Medium",
      low: "Low",
    },
    messages: {
      created: "Case created successfully!",
      deleted: "Case deleted successfully",
      error: "An error occurred. Please try again.",
    },
  },
  // ============================================================================
  // CLIENTS TRANSLATIONS
  // ============================================================================
  clients: {
    title: "Clients",
    subtitle: "Manage your clients' information securely",
    newClient: "New Client",
    stats: {
      total: "Total Clients",
      withEmail: "With Email",
      withPhone: "With Phone",
      withAddress: "With Address",
      percentOfTotal: "% of total",
      ofTotal: "of total",
    },
    security: {
      title: "Encrypted Data",
      description: "All your clients' personal information is encrypted in the database using AES-256 encryption.",
    },
    list: {
      searchPlaceholder: "Search by name, email, or phone...",
      showingCount: "Showing {count} of {total} clients",
      noResults: "No clients found with that search term",
      empty: "No clients yet",
      emptyDescription: "Create your first client to get started.",
      createFirst: "Create First Client",
    },
    card: {
      encryptedData: "Encrypted data",
      noEmail: "No email",
      noPhone: "No phone",
      noAddress: "No address",
      profileComplete: "Complete Profile",
      profileIncomplete: "Incomplete Profile",
      created: "Created",
    },
    detail: {
      encryptedInfo: "Encrypted information. Only you can view it.",
      contactInfo: "Contact Information",
      email: "Email",
      phone: "Phone",
      address: "Address",
      sendEmail: "Send email",
      call: "Call",
      notRegistered: "Not registered",
      edit: "Edit",
      delete: "Delete",
    },
    form: {
      title: "New Client",
      subtitle: "Add a new client to your organization",
      autoEncryption: "Automatic Encryption",
      clientInfo: "Client Information",
      encryptionNote: "Fields marked with 🔒 are automatically encrypted for security.",
      fullName: "Full Name",
      fullNamePlaceholder: "Enter client's full name",
      fullNameRequired: "Full name is required",
      emailLabel: "Email",
      emailPlaceholder: "client@example.com",
      emailOptional: "Optional",
      phoneLabel: "Phone",
      phonePlaceholder: "+1 555 123 4567",
      phoneOptional: "Optional",
      addressLabel: "Address",
      addressPlaceholder: "Enter client's address",
      addressOptional: "Optional",
      cancel: "Cancel",
      create: "Create Client",
      creating: "Creating...",
    },
    delete: {
      title: "Delete client?",
      description: "This action cannot be undone. The client and all associated data will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Delete",
    },
    messages: {
      created: "Client created successfully!",
      deleted: "Client deleted successfully",
      error: "An error occurred. Please try again.",
    },
  },
  // ============================================================================
  // POLICIES TRANSLATIONS
  // ============================================================================
  policies: {
    title: "Policies",
    subtitle: "Manage and analyze your organization's policies",
    dashboard: {
      totalPolicies: "Total Policies",
      highConfidence: "High Confidence",
      pendingReview: "Pending Review",
      recentUploads: "Recent Uploads",
      quickActions: "Quick Actions",
      quickActionsDesc: "Manage your policies efficiently",
      uploadNew: "Upload New Policy",
      viewAnalysis: "View Analysis",
      viewMetrics: "View Metrics",
      recentPolicies: "Recent Policies",
      recentPoliciesDesc: "Recently analyzed policies",
      viewAll: "View all",
      noPoliciesYet: "No policies yet",
      uploadFirst: "Upload your first policy to get started",
      uploadPolicy: "Upload Policy",
      policyNoName: "Unnamed Policy",
      noNumber: "No number",
      unknownInsurer: "Unknown insurer",
      notAvailable: "Not available",
    },
    upload: {
      title: "Upload Policies",
      subtitle: "Upload and analyze PDF policies",
      supportedFormats: "Supported Formats",
      pdfRecommended: "PDF (Recommended)",
      formatTip: "For best results, upload PDF documents with selectable text (not scanned as images).",
      tips: {
        title: "Tips for Best Results",
        noPassword: "Make sure the PDF is not password protected",
        selectableText: "Documents with selectable text give better results",
        multipleFiles: "You can upload multiple policies at once",
        analysisTime: "Analysis may take up to 30 seconds per policy",
      },
      progress: {
        uploading: "Uploading file...",
        analyzing: "Analyzing policy with AI...",
        complete: "Analysis complete!",
        error: "Error analyzing policy",
      },
      dropzone: {
        title: "Upload Policy",
        subtitle: "Drag and drop your PDF here, or click to select",
        maxSize: "Maximum file size: {size}MB",
      },
    },
    overview: {
      title: "Policies Overview",
      months: {
        jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr",
        may: "May", jun: "Jun", jul: "Jul", aug: "Aug",
        sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
      },
      notAvailable: "Not available",
    },
    list: {
      searchPlaceholder: "Search policies...",
      showingCount: "Showing {count} of {total} policies",
      noResults: "No policies found",
      empty: "No policies yet",
      emptyDescription: "Upload your first policy to get started.",
    },
    analysis: {
      loading: "Loading PDF viewer...",
      confidence: {
        high: "High ({percent}%)",
        medium: "Medium ({percent}%)",
        low: "Low ({percent}%)",
      },
    },
    delete: {
      title: "Delete policy?",
      description: "This action cannot be undone. The policy analysis and its links to existing cases will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Delete",
      deleting: "Deleting...",
    },
    // Upload page
    uploadPage: {
      title: "Upload New Policy",
      subtitle: "Upload a PDF document to analyze it automatically",
      backToPolicies: "Back to Policies",
      cardTitle: "Upload Policy PDF",
      cardDescription: "Drag and drop a PDF file or click to select. Our system will automatically analyze the document.",
      limitations: {
        title: "Limitations",
        maxFileSize: "Maximum file size: 10MB per file",
        scannedPdf: "Scanned PDFs may have lower accuracy",
        manualReview: "Some policy formats may require manual review",
      },
    },
    // Overview page
    overviewPage: {
      title: "Policy Metrics",
      subtitle: "Statistics and analysis of your organization's policies",
      backToPolicies: "Back to Policies",
      stats: {
        totalPolicies: "Total Policies",
        thisMonth: "This Month",
        vsPreviousMonth: "vs previous month",
        insuredValue: "Insured Value",
        approximateSum: "Approximate sum",
        insurers: "Insurers",
      },
      charts: {
        monthlyActivity: "Monthly Activity",
        policiesAnalyzed: "Policies analyzed in the last 6 months",
        inMonth: "in {month}",
        policiesInMonth: "{count} policies in {month}",
        extractionConfidence: "Extraction Confidence",
        aiAnalysisPrecision: "Average precision of AI analysis",
        averageConfidence: "Average Confidence",
        excellent: "Excellent",
        acceptable: "Acceptable",
        needsReview: "Needs review",
        high: "High",
        medium: "Medium",
        low: "Low",
        byCoverageType: "By Coverage Type",
        coverageDistribution: "Distribution of policies by insurance type",
        byInsurer: "By Insurer",
        insurerDistribution: "Distribution of policies by company",
        policies: "Policies",
        loadingChart: "Loading chart...",
      },
      months: {
        short: {
          jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr",
          may: "May", jun: "Jun", jul: "Jul", aug: "Aug",
          sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
        },
        full: {
          january: "January", february: "February", march: "March", april: "April",
          may: "May", june: "June", july: "July", august: "August",
          september: "September", october: "October", november: "November", december: "December",
        },
      },
    },
    // Form/Dropzone
    form: {
      dropHere: "Drop the file here",
      dragPdfHere: "Drag a policy PDF here",
      orClickToSelect: "or click to select a file",
      selectFile: "Select file",
      uploadAndAnalyze: "Upload and Analyze",
      cancel: "Cancel",
      tryAgain: "Try again",
      uploadAnother: "Upload another policy",
      viewAnalysis: "View Analysis",
      analysisComplete: "Analysis Complete!",
      policyProcessed: "The policy has been processed successfully",
      confidence: "Confidence: {percent}%",
      fileSizeExceeds: "The file exceeds the 10MB limit",
      percentComplete: "{percent}% complete",
    },
    // List/Search
    filters: {
      searchPlaceholder: "Search by number, insurer, type...",
      confidence: "Confidence",
      all: "All",
      highConfidence: "High (≥80%)",
      mediumConfidence: "Medium (50-79%)",
      lowConfidence: "Low (<50%)",
      insuranceType: "Insurance type",
      allTypes: "All types",
    },
    selector: {
      title: "Organization Policies",
      description: "Select previously loaded policies to link to this case. Selected policies will be available for analysis and comparison.",
      searchPlaceholder: "Search by insurer, number, type...",
      loadingPolicies: "Loading policies...",
      noPoliciesAvailable: "No policies available",
      tryAnotherSearch: "Try another search term",
      loadPoliciesFirst: "Load policies from /policies first",
      selectedOf: "{selected} of {total} selected",
      confirm: "Confirm ({count})",
      policiesSelected: "{count} organization policy(ies) selected",
      selectOrgPolicies: "Select organization policies",
      insurerNotIdentified: "Insurer not identified",
      typeNA: "Type N/A",
      noNumber: "No number",
    },
    card: {
      notAvailable: "N/A",
      noNumber: "No number",
      noInsurer: "No insurer",
      noType: "No type",
      untitledDocument: "Untitled document",
      analyzedOn: "Analyzed on {date}",
      deletePolicy: "Delete policy",
      confidence: {
        high: "High",
        medium: "Medium",
        low: "Low",
      },
    },
  },
  // ============================================================================
  // PROFILE TRANSLATIONS
  // ============================================================================
  profilePage: {
    title: "Account settings",
    tabs: {
      personal: "Personal info",
      security: "Security",
      notifications: "Notifications",
      team: "Team Dashboard",
      audit: "Audit (Admins)",
    },
    personal: {
      name: "Name",
      namePlaceholder: "Enter your name",
      notSet: "Not set",
      saved: "Saved",
      email: "Email",
      emailHint: "Your email cannot be changed",
      phone: "Phone",
      phonePlaceholder: "+1 555 123 4567",
      address: "Address",
      addressPlaceholder: "Enter your address",
      language: "Language",
      languageDescription: "Choose your preferred language",
      languageSelection: "Language selection",
      default: "Default",
    },
    language: {
      title: "Language",
      description: "Choose your preferred language",
      english: "English",
      spanish: "Español",
      default: "Default",
      changing: "Changing language...",
      success: "Language updated successfully",
      error: "Failed to update language",
    },
    security: {
      password: "Password",
      passwordDescription: "Reset your password by receiving a secure reset link via email. You'll be able to create a new password after clicking the link.",
      sendResetEmail: "Send password reset email",
      sending: "Sending...",
      resetSuccess: "Reset email sent successfully",
      resetError: "Failed to send reset email",
    },
    notifications: {
      pendingInvitations: "Pending invitations",
      invitationFrom: "Invitation from",
      aMember: "A member",
      invitedYouAs: "has invited you to join as",
      roleAdmin: "Administrator",
      roleMember: "Member",
      roleOwner: "Owner",
      received: "Received",
      expires: "Expires",
      accept: "Accept",
      decline: "Decline",
      reject: "Reject",
      noInvitations: "You have no pending invitations",
      noPendingInvitations: "You have no pending invitations",
      loadingInvitations: "Loading invitations...",
      productUpdates: "Product updates",
      productUpdatesDescription: "Receive emails about new features and improvements",
      productUpdatesDesc: "Receive emails about new features and improvements",
      policyAlerts: "Policy alerts",
      policyAlertsDescription: "Get notified about policy renewals and important dates",
      policyAlertsDesc: "Get notified about policy renewals and important dates",
    },
    team: {
      activeOrg: "Active organization",
      activeOrgDesc: "Select the organization you want to work with. All cases, clients, and analytics will be filtered by this selection.",
      selectOrg: "Select an organization",
      membersLabel: "members",
      workingIn: "Working in",
      loadingOrgs: "Loading organizations...",
      noOrgs: "You don't have any organizations. Contact an administrator.",
      switchingOrg: "Switching organization...",
      orgSwitched: "Organization switched successfully",
      inviteMembers: "Invite members",
      inviteMembersDesc: "Invite new users to join your organization by email.",
      emailPlaceholder: "User email (e.g., user@email.com)",
      sending: "Sending...",
      invite: "Invite",
      inviteSent: "Invitation sent to {email}",
      orShareLink: "or share the link",
      linkPlaceholder: "Invite link (coming soon)",
      copyLink: "Copy link",
      linkCopied: "Link copied!",
      comingSoon: "Coming soon",
      linkFeatureDesc: "Shared link functionality will be available soon",
      sentInvitations: "Pending sent invitations",
      sentOn: "Sent {date}",
      expiresOn: "Expires {date}",
      cancelInvite: "Cancel",
      inviteCanceled: "Invitation canceled",
      teamMembers: "Team members",
      loadingMembers: "Loading...",
      membersCount: "{count} members",
      noMembers: "No members in this organization",
      youLabel: "You",
      noName: "User without name",
      noEmail: "Email not available",
      memberSince: "Since {date}",
      changeRole: "Change role",
      removeHint: "Owners can change roles between Admin and Member",
      removeDisclaimer: "Member removal will be available soon",
      changeRoleTitle: "Change member role?",
      changeRoleDesc: "{name} will change from {fromRole} to {toRole}.",
      adminPermHint: "Will have administrator permissions in the organization.",
      memberPermHint: "Will lose administrator permissions.",
      roleChanged: "Role updated successfully",
      updating: "Updating...",
      confirmChange: "Confirm change",
    },
    audit: {
      title: "Audit Log",
      description: "Complete audit history for your organization",
      loading: "Loading audit logs...",
      empty: "No audit logs yet",
    },
    toasts: {
      orgLoadError: "Error loading organizations",
      orgSwitchError: "Error switching organization",
      inviteSuccess: "Invitation sent to {email}",
      inviteError: "Error sending invitation",
      invalidEmail: "Please enter a valid email",
      selectOrgFirst: "Select an organization first",
      joinedOrg: "You've joined the organization!",
      invitationRejected: "Invitation rejected",
      invitationError: "Error responding to invitation",
      cancelError: "Error canceling invitation",
      roleChangeError: "Error changing role",
    },
  },
  // ============================================================================
  // COMMON TRANSLATIONS
  // ============================================================================
  common: {
    actions: {
      edit: "Edit",
      delete: "Delete",
      deleting: "Deleting...",
      cancel: "Cancel",
      confirm: "Confirm",
      save: "Save",
      saving: "Saving...",
      create: "Create",
      creating: "Creating...",
      close: "Close",
      back: "Back",
      next: "Next",
      submit: "Submit",
      retry: "Retry",
      loading: "Loading...",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      pending: "Pending",
      completed: "Completed",
      draft: "Draft",
      error: "Error",
    },
    errors: {
      generic: "An error occurred. Please try again.",
      network: "Connection error. Please check your internet.",
      unauthorized: "You don't have permission for this action.",
      notFound: "Resource not found.",
    },
    empty: {
      noData: "No data available",
      noResults: "No results found",
    },
  },
} as const;

export default en;

