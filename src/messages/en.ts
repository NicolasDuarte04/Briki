const en = {
  nav: {
    features: "Features",
    demo: "Demo",
    pricing: "Pricing",
    start: "Get Started",
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
    }
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
  sourcing: {
    status: {
      body: "Fetching plans…",
      sourcesLabel: "Source systems",
      microStepsLabel: "Sourcing steps",
      microSteps: ["Logging in…", "Reading portal…", "Parsing PDFs…"],
      cardTitle: "Sourcing in progress",
      stopAction: "Stop sourcing",
      rows: [
        { name: "Carrier portal login", provenance: "Portal" },
        { name: "Plan API sync", provenance: "API" },
        { name: "PDF ingestion", provenance: "PDF" },
        { name: "Benefit mapping", provenance: "Portal" },
      ],
      chipAria: "{provenance} source system",
    },
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
      empty: "No renewals in this range.",
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
} as const;

export default en;

