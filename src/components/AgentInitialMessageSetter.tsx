"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";

/**
 * Componente que establece el mensaje inicial del agente cuando se accede
 * directamente desde el panel lateral del dashboard.
 * 
 * Este componente se ejecuta una sola vez al montarse y establece el mensaje
 * de bienvenida del agente en el estado global.
 */
export function AgentInitialMessageSetter() {
  const { setInitialMessage, initialMessage } = useUI();
  const t = useTranslations("chat");

  useEffect(() => {
    // Solo establecer el mensaje si no hay uno ya establecido
    if (!initialMessage) {
      const welcomeMessage = "Hola, estoy aquí para ayudarte con este caso. ¿En qué puedo asistirte?";
      setInitialMessage(welcomeMessage);
    }
  }, [setInitialMessage, initialMessage]);

  // Este componente no renderiza nada visible
  return null;
}
