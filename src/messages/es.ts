const es = {
  validation: {
    required: "Campo obligatorio.",
    invalidDate: "Ingresa una fecha válida.",
    currency: "Ingresa un monto válido.",
    nonNegative: "Debe ser no negativo.",
    minValue: "Debe ser al menos {min}.",
    invalidUnion: "Elige una opción válida.",
    badReference: "No se encontró la referencia.",
    nonEmptyArray: "Agrega al menos un elemento.",
  },
  models: {
    product: "Producto",
    policy: "Póliza",
    rider: "Cobertura adicional",
    pricingBand: "Banda de precios",
    eligibility: "Elegibilidad",
    provenance: "Procedencia",
    case: "Caso",
    proposal: "Propuesta",
    renewal: "Renovación",
  },
  data: {
    loadFailed: "No se pudieron cargar los datos.",
    malformed: "Formato de datos no reconocido.",
    empty: "No hay datos disponibles.",
  },
  landing: {
    hero: {
      logoAlt: "Logotipo de Briki",
      brand: "Briki",
      cta: "Inicia una conversación",
      heading: "Tu Agente de Seguros con IA",
      subhead: "Briki les devuelve el tiempo a los corredores. Y su ventaja.",
      primaryCta: "Probar la demo",
      video: {
        title: "Mira Briki en acción",
        description: "Mira cómo Briki transforma tu flujo de trabajo",
        fallback: "Tu navegador no admite la etiqueta de video.",
      },
      features: {
        smartConversations: {
          title: "Conversaciones Inteligentes",
          description: "Procesamiento de lenguaje natural para interacciones intuitivas",
        },
        realTimeAnalysis: {
          title: "Análisis en Tiempo Real",
          description: "Información y recomendaciones al instante",
        },
        seamlessIntegration: {
          title: "Integración Sin Fricciones",
          description: "Funciona con tus herramientas y flujos de trabajo existentes",
        },
      },
    },
    subtitle: "Analiza pólizas, compara opciones y envía propuestas en minutos.",
    placeholder: "Describe tu cliente o sube documentos…",
    cta: {
      whatsapp: "Importar desde WhatsApp",
      upload: "Subir PDFs",
      carriers: "Nombrar aseguradoras",
      enter: "Entrar",
    },
    emptyHelper: "Escribe algo o elige una acción rápida.",
    socialProof: {
      tagline: "Confiado por corredores en Bogotá y CDMX",
      badges: {
        gsea: "GSEA 2025",
        oracle: "Oracle para Startups",
        encrypted: "Datos Encriptados y Seguros",
        supabase: "Impulsado por Supabase",
        vercel: "Alojado en Vercel",
        openai: "Impulsado por OpenAI",
        colombia: "Hecho en Colombia",
      },
    },
    statsGrowth: {
      title: "Claridad que se multiplica.",
      description: "Briki convierte PDFs de pólizas en propuestas e insights—para que los corredores tomen decisiones más rápido.",
      cta: {
        primary: "Ver la demo",
        secondary: "Ver cómo funciona",
      },
      primaryStat: {
        value: "~2.5k",
        label: "Horas ahorradas este trimestre",
      },
      stats: {
        brokers: {
          value: "40+",
          label: "Corredores activos",
        },
        policies: {
          value: "1.2k+",
          label: "Pólizas analizadas",
        },
        timeSaved: {
          value: "~10h/sem",
          label: "Tiempo ahorrado por corredor",
        },
        integrations: {
          value: "Multi",
          label: "WhatsApp, PDFs, Aseguradoras",
        },
      },
    },
    contactForm: {
      hero: "Convierte pólizas en propuestas en minutos.",
      title: "Contáctanos",
      fields: {
        name: {
          label: "Nombre",
          placeholder: "Juan Pérez",
        },
        email: {
          label: "Correo electrónico",
          placeholder: "juan@ejemplo.com",
        },
        company: {
          label: "Empresa",
          placeholder: "Empresa ejemplo S.A.",
        },
        city: {
          label: "Ciudad",
          placeholder: "Bogotá",
        },
        phone: {
          label: "Teléfono",
          placeholder: "+57 (300) 123-4567",
        },
      },
      submit: "Enviar",
      submitting: "Enviando...",
      success: {
        message: "Mensaje enviado correctamente. Te contactaremos pronto.",
      },
      errors: {
        generic: "Algo salió mal. Por favor intenta de nuevo.",
        validation: "Por favor revisa tu información e intenta de nuevo.",
        spam: "No se pudo procesar la solicitud. Intenta más tarde.",
      },
      aria: {
        submitting: "Enviando solicitud de contacto",
      },
      meta: {
        requestMessage: "Solicitud de contacto desde la página de inicio",
      },
      demoLink: "Agenda una demo",
    },
  },
  footer: {
    privacy: "Política de Privacidad",
    terms: "Términos de Servicio",
    contact: "Contacto",
    work: "Trabaja con nosotros",
    rights: "Todos los derechos reservados.",
    linkedin: "LinkedIn",
  },
  nav: {
    login: "Iniciar sesión",
    locale: {
      toggle: "Cambiar idioma a {language}",
      english: "Inglés",
      spanish: "Español",
    },
  },
  auth: {
    nav: {
      login: "Iniciar sesión",
      profile: "Perfil",
      signOut: "Cerrar sesión",
    },
  },
  profile: {
    title: "Perfil",
    name: {
      label: "Nombre",
      help: "Cómo aparece tu nombre en la app.",
    },
    locale: {
      label: "Idioma",
      help: "Elige tu idioma preferido.",
      options: {
        en: "Inglés",
        es: "Español",
      },
    },
    save: "Guardar cambios",
    toast: {
      saved: "Perfil actualizado.",
    },
  },
  onboarding: {
    title: "Bienvenido a Briki",
    steps: {
      basic: {
        title: "Tus datos básicos",
        nameLabel: "Tu nombre",
        namePlaceholder: "Ingresa tu nombre",
      },
      role: {
        title: "Tu trabajo",
        roleLabel: "Cargo",
        companyLabel: "Empresa",
      },
      locale: {
        title: "Idioma",
        localeLabel: "Idioma preferido",
        options: {
          en: "Inglés",
          es: "Español",
        },
      },
    },
    actions: {
      back: "Atrás",
      next: "Siguiente",
      finish: "Finalizar",
    },
  },
  topbar: {
    brandAria: "Briki",
    brandTitle: "Ir al inicio de Briki",
    brandName: "Briki",
    accountMenuAria: "Abrir menú de cuenta",
    accountMenuTitle: "Abrir menú de cuenta",
    accountInitials: "BR",
  },
  sourcing: {
    status: {
      body: "Buscando planes…",
      sourcesLabel: "Orígenes de datos",
      microStepsLabel: "Pasos del proceso",
      microSteps: ["Iniciando sesión…", "Leyendo portal…", "Analizando PDFs…"],
      cardTitle: "Obtención en curso",
      stopAction: "Detener obtención",
      rows: [
        { name: "Inicio de sesión en portal", provenance: "Portal" },
        { name: "Sincronización API de planes", provenance: "API" },
        { name: "Ingesta de PDFs", provenance: "PDF" },
        { name: "Mapeo de beneficios", provenance: "Portal" },
      ],
      chipAria: "Fuente {provenance}",
    },
  },
  workspace: {
    tabs: {
      caseBrief: "Resumen",
      policies: "Pólizas",
      comparisons: "Comparaciones",
      proposal: "Propuesta",
      compliance: "Cumplimiento",
      renewals: "Renovaciones",
      ariaLabel: "Secciones del workspace",
    },
    comparisons: {
      title: "Comparaciones",
      description: "Ajusta los pesos para entender cómo cada póliza respalda a tu cliente.",
      playbooks: {
        ariaLabel: "Selecciona un playbook de comparación",
        options: {
          sme: {
            label: "Relevo PyME",
            description: "Equilibra la prima con riders imprescindibles para equipos pequeños.",
          },
          hnwi: {
            label: "Retención ejecutiva",
            description: "Prioriza redes concierge y beneficios de servicio premium.",
          },
          auto: {
            label: "Automotriz",
            description: "Favorece gastos predecibles y eficiencia en reclamaciones.",
          },
          travel: {
            label: "Movilidad global",
            description: "Privilegia redes internacionales y respuesta rápida de emergencia.",
          },
        },
      },
      sliderSection: {
        title: "Ajustar controles",
        ariaLabel: "Controles de peso de comparación",
        summary: "Peso total: {value}",
      },
      weightsSection: {
        title: "Ajustar pesos",
        subtitle: "Define cuánto influye cada factor en la puntuación de comparación.",
      },
      weights: {
        premium: {
          label: "Prima",
          description: "Premia las pólizas con primas mensuales más bajas.",
          aria: "Ajustar peso de prima",
        },
        deductible: {
          label: "Deducible",
          description: "Favorece pólizas con deducibles reducidos.",
          aria: "Ajustar peso de deducible",
        },
        riders: {
          label: "Riders",
          description: "Potencia los planes con paquetes de riders más robustos.",
          aria: "Ajustar peso de riders",
        },
        network: {
          label: "Red",
          description: "Resalta la amplitud y calidad del acceso a prestadores.",
          aria: "Ajustar peso de red",
        },
        service: {
          label: "Servicio",
          description: "Considera soporte concierge y una experiencia superior.",
          aria: "Ajustar peso de servicio",
        },
        valueText: "Peso de {value}%",
      },
      scores: {
        title: "Puntajes de póliza",
        subtitle: "Ordenadas según qué tan bien se ajustan a los pesos actuales.",
        rankLabel: "Puesto {value}",
      },
      cards: {
        ariaLabel: "Tarjetas de comparación de pólizas",
        ariaCard: "Tarjeta de comparación para {plan}",
        scoreLabel: "Puntaje en vivo",
        scoreValueText: "Puntaje {value}",
        premiumLabel: "Prima",
        deductibleLabel: "Deducible",
        ridersLabel: "Coberturas",
        ridersCountLabel: "Coberturas",
        ridersEmpty: "Sin coberturas registradas",
        ridersStatus: "{count, plural, =0 {Sin coberturas registradas} one {# cobertura destacada} other {# coberturas destacadas}}",
        networkLabel: "Red",
        serviceLabel: "Servicio",
        metaLine: "{network} • {service}",
        labels: {
          network: "Red: {value}",
          service: "Servicio: {value}",
        },
        statuses: {
          better: "Mejor",
          neutral: "Neutral",
          worse: "Peor",
        },
        indicators: {
          premium: "Indicador de prima",
          deductible: "Indicador de deducible",
          riders: "Indicador de coberturas",
          network: "Indicador de red",
          service: "Indicador de servicio",
        },
        networkLevels: {
          basic: "Red básica",
          preferred: "Red preferente",
          concierge: "Red concierge",
          unknown: "Red no especificada",
        },
        serviceLevels: {
          standard: "Soporte estándar",
          enhanced: "Soporte mejorado",
          "white-glove": "Soporte white-glove",
          unknown: "Servicio no especificado",
        },
      },
      actions: {
        reset: "Restablecer pesos",
        resetAria: "Restablecer controles de comparación",
        resetAnnouncement: "Pesos restablecidos a los valores predeterminados.",
      },
      totalAnnounce: "Peso total {value}",
      loading: {
        ariaLabel: "Cargando comparaciones de pólizas",
        title: "Cargando comparaciones",
        description: "Estamos preparando los puntajes según tus pesos actuales.",
      },
      empty: {
        title: "Sin coincidencias por ahora",
        description: "No encontramos pólizas que respondan a tus criterios actuales.",
        hint: "Prueba ajustar los controles o cambiar de playbook para ver más opciones.",
      },
    },
    caseBrief: {
      title: "Resumen del caso",
      sections: {
        keyFacts: "Datos clave",
        notes: "Notas",
      },
      fields: {
        business: "Negocio",
        employees: "Empleados",
        lines: "Líneas",
      },
    },
    policies: {
      title: "Pólizas",
      columns: {
        plan: "Plan",
        premium: "Prima",
        deductible: "Deducible",
        riders: "Coberturas adicionales",
      },
      columnMenu: {
        trigger: "Opciones de columna",
        pin: {
          label: "Fijar columna",
          left: "Fijar a la izquierda",
          right: "Fijar a la derecha",
          none: "Quitar fijación",
        },
        reorder: {
          ariaLabel: "Reordenar columna",
          title: "Arrastra para reordenar",
        },
      },
      filters: {
        plan: { placeholder: "Filtrar plan…" },
        premium: { label: "Prima" },
        deductible: { label: "Deducible" },
        common: { min: "Mín.", max: "Máx." },
        riders: { label: "Coberturas", labelWithCount: "Coberturas: {count}" },
      },
      actions: {
        clearFilters: "Limpiar filtros",
        columnLabel: "Acciones",
        shortlist: "Preseleccionar",
        evidence: "Evidencia",
        notes: "Notas",
      },
      empty: {
        title: "Sin resultados",
        description: "Prueba ajustando o limpiando filtros.",
        resetFilters: "Limpiar filtros",
      },
    },
    proposal: {
      title: "Propuesta",
      subtitle: "Resumen curado para tu reunión con el cliente.",
      brandHeader: {
        preparedBy: "Preparado por",
      },
      meta: {
        generatedOn: "Generado el {date}",
      },
      briefCard: {
        title: "Resumen del cliente",
        subtitle: "Contexto clave para esta oportunidad.",
        notesLabel: "Notas",
        fields: {
          business: "Negocio",
          employees: "Empleados",
          lines: "Líneas",
        },
      },
      brokerCard: {
        title: "Corredora",
        agencyLabel: "Agencia",
        phoneLabel: "Teléfono",
        emailLabel: "Correo",
      },
      selectedPlans: {
        title: "Planes recomendados",
        defaultRationale: "Equilibra cobertura, red y precio para esta etapa del cliente.",
        countLabel: "{count, plural, one {# plan incluido} other {# planes incluidos}}",
        emptyState: "Preselecciona planes para ver la propuesta.",
      },
      plans: {
        scoreLabel: "Puntaje {value}",
        premiumLabel: "Prima",
        deductibleLabel: "Deducible",
        ridersLabel: "Coberturas",
        ridersEmpty: "Sin coberturas listadas",
        benefitsLabel: "Destacados",
        benefitsFallback: "Mostraremos los destacados cuando haya datos.",
        rationaleLabel: "Por qué este plan",
      },
      summary: {
        title: "Resumen ejecutivo",
        premiumRange: "Rango de primas",
        avgDeductible: "Deducible promedio",
        ridersLabel: "Coberturas clave",
        networkLabel: "Redes",
        serviceLabel: "Servicio",
        ridersFallback: "Sin coberturas destacadas",
        networkFallback: "Detalles de red pendientes",
        serviceFallback: "Detalles de servicio pendientes",
      },
      disclosures: {
        title: "Divulgaciones",
        items: [
          "Las primas y disponibilidad dependen de confirmación de la aseguradora.",
          "Los resúmenes de cobertura son ilustrativos; consulta los documentos oficiales.",
          "Los tiempos de implementación dependen de suscripción y documentación del cliente.",
        ],
      },
      mathCheck: {
        label: "Revisión numérica",
        badgePassed: "Revisión ✓",
        badgeReview: "Revisar números",
        messages: {
          passed: "Las primas y deducibles conciliaron sin diferencias.",
        },
      },
      share: {
        label: "Enlace de propuesta",
        message: "Comparte con stakeholders o pega en borradores de correo.",
        copyAction: "Copiar enlace",
        copySuccess: "Enlace copiado al portapapeles.",
        copyError: "No pudimos copiar el enlace. Intenta de nuevo.",
      },
      benefits: {
        title: "Por qué estos planes",
        subtitle: "Puntos clave para guiar tu presentación.",
        items: {
          planHighlights: "Los destacados del plan se alinean con las prioridades del cliente.",
          employeeExperience: "La experiencia del empleado se mantiene simple en todas las opciones.",
          supportCommitment: "Briki brinda acompañamiento de implementación y soporte continuo.",
        },
      },
      loading: {
        ariaLabel: "Cargando propuesta",
        title: "Preparando tu propuesta",
        description: "Estamos finalizando los resúmenes de planes y divulgaciones.",
      },
      empty: {
        title: "Aún no hay datos de propuesta",
        description: "Cuando termine la obtención, verás aquí el avance de tu propuesta.",
        hint: "Ve a la pestaña de comparaciones para elegir planes primero.",
      },
      actions: {
        exportPdf: "Exportar PDF",
        copyLink: "Copiar enlace",
        copiedToast: "Enlace copiado al portapapeles",
      },
    },
    compliance: {
      title: "Checklist de cumplimiento",
      description: "Revisa los requisitos antes de generar documentos para {jurisdiction}.",
      pass: "Marcar checklist como listo",
      cancel: "Cancelar",
      status: {
        complete: "completo",
        pending: "pendiente",
      },
      gate: {
        title: "Entrega de cumplimiento",
        jurisdictionLabel: "Jurisdicción",
        checklistCta: "Abrir checklist",
        blockedTitle: "Cumplimiento pendiente",
        blockedBody: "Completa el checklist antes de compartir.",
        readyHint: "Checklist completo. Puedes enviar ahora.",
      },
      jurisdictions: {
        co: {
          title: "Colombia",
          items: {
            co_item_kyc: "Completar entrevista KYC",
            co_item_rut: "Confirmar certificado RUT",
            co_item_sarlaft: "Recopilar declaración SARLAFT",
            co_item_pila: "Validar historial de pago PILA",
            co_item_beneficiary: "Actualizar listado de beneficiarios",
          },
        },
        mx: {
          title: "México",
          items: {
            mx_item_kyc: "Completar entrevista KYC",
            mx_item_constanciaFiscal: "Recopilar constancia fiscal",
            mx_item_imss: "Verificar registro en el IMSS",
            mx_item_infonavit: "Validar cumplimiento con INFONAVIT",
            mx_item_beneficiary: "Actualizar listado de beneficiarios",
          },
        },
        cl: {
          title: "Chile",
          items: {
            cl_item_kyc: "Completar entrevista KYC",
            cl_item_rut: "Confirmar certificado RUT",
            cl_item_afp: "Validar cotizaciones AFP",
            cl_item_previred: "Descargar comprobantes Previred",
            cl_item_beneficiary: "Actualizar listado de beneficiarios",
          },
        },
        br: {
          title: "Brasil",
          items: {
            br_item_kyc: "Completar entrevista KYC",
            br_item_cnpj: "Verificar estado del CNPJ",
            br_item_susep: "Confirmar registro en SUSEP",
            br_item_fgts: "Validar pagos FGTS",
            br_item_beneficiary: "Actualizar listado de beneficiarios",
          },
        },
      },
    },
    send: {
      whatsapp: "Enviar por WhatsApp",
      email: "Enviar por correo",
      blockedToast: "Envío bloqueado. Completa el checklist de cumplimiento primero.",
      successToast: "Propuesta enviada correctamente.",
    },
    followups: {
      title: "Seguimientos",
      predraft: "Pre-redactar propuesta de renovación",
      cadenceLabel: "Cadencia",
      chipDays: "{days}d",
      readback: "T+{days}d",
      addDayPlaceholder: "Agregar día…",
      savedToast: "Cadencia actualizada a {cadence}.",
    },
    audit: {
      attempt: "Intento de envío registrado para {channel}.",
      blocked: "Bloqueo de envío registrado para {channel}.",
      success: "Envío exitoso registrado para {channel}.",
      followupCadenceChanged: "Cadencia de seguimiento cambiada: {cadence}",
    },
    renewals: {
      title: "Renovaciones",
      meta: {
        window: {
          "30": "Renovaciones en 30 días",
          "60": "Renovaciones en 60 días",
          "90": "Renovaciones en 90 días",
        },
      },
      filters: {
        window: { label: "Ventana de renovación" },
        carrier: {
          label: "Aseguradora",
          helper: "Selecciona una o más aseguradoras.",
        },
        status: { label: "Estado" },
      },
      status: {
        ok: "En curso",
        dueSoon: "Próxima",
        overdue: "Atrasada",
      },
      columns: {
        carrier: "Aseguradora",
        plan: "Plan",
        date: "Fecha de renovación",
        premium: "Prima",
        status: "Estado",
        actions: "Acciones",
      },
      actions: {
        requestQuotes: "Solicitar cotizaciones",
        messageClient: "Enviar mensaje al cliente",
        setReminder: "Programar recordatorio",
        reminderSet: "Recordatorio activo",
      },
      badges: {
        reminderSet: "Recordatorio activo",
      },
      dialog: {
        reminder: {
          title: "Programar recordatorio",
          description: "Te avisaremos antes de que llegue esta renovación.",
          dateLabel: "Fecha del recordatorio",
          confirm: "Guardar recordatorio",
          cancel: "Cancelar",
        },
      },
      toast: {
        nudgeQuote: "Aseguradora notificada para actualizar cotizaciones.",
        nudgeMessage: "Cliente notificado sobre la renovación.",
        reminderSet: "Recordatorio guardado.",
      },
      empty: "No hay renovaciones en este rango.",
      sort: {
        date: "Ordenar por fecha",
        premium: "Ordenar por prima",
      },
    },
  },
  composer: {
    placeholder: "Describe tu cliente o sube documentos…",
    emptyHelper: "Presiona Enter para enviar. Shift+Enter crea una nueva línea.",
  },
  hotkeys: {
    title: "Atajos de teclado",
    ignored: "Se ignoran mientras escribes",
    triggerLabel: "Abrir atajos de teclado",
    guideDescription: "Comandos útiles para moverte rápido.",
    closeLabel: "Cerrar atajos de teclado",
    items: {
      commandPalette: { label: "Paleta de comandos", combo: "⌘/Ctrl+K" },
      openGuide: { label: "Abrir atajos de teclado", combo: "?" },
      togglePanel: { label: "Alternar panel derecho", combo: "⌘/Ctrl+J" },
      switchStep: { label: "Cambiar paso", combo: "1–8" },
    },
  },
  chat: {
    jumpToNewest: "Ir al más reciente",
    placeholder: "Enviar un mensaje…",
    send: "Enviar",
    typing: "Escribiendo…",
    newMessages: "Nuevos mensajes",
    agent: {
      cardAria: "Mensaje del agente",
      name: "Agente de sourcing",
      role: "Asistente",
      timestampAria: "Enviado a las {value}",
      prompt: { label: "Prompt A" },
      actions: {
        approve: { label: "Aprobar", aria: "Aprobar plan de sourcing" },
        edit: { label: "Editar", aria: "Editar plan de sourcing" },
        rerun: { label: "Reejecutar", aria: "Reejecutar flujo de sourcing" },
      },
    },
    agents: {
      sourcing: "Agente de sourcing",
    },
  },
  comparison: {
    title: "Comparación de aseguradoras",
    weights: {
      title: "Ajustar pesos",
      description: "Define cómo cada factor influye en el puntaje.",
      reset: "Restablecer",
      total: "Peso total: {value}",
      valueText: "{value}%",
      labels: {
        premium: "Prima",
        deductible: "Deducible",
        riders: "Coberturas",
      },
    },
    scores: {
      title: "Puntajes de planes",
      columns: {
        plan: "Plan",
        score: "Puntaje",
      },
      empty: "Aún no hay planes disponibles.",
    },
  },
} as const;

export default es;

