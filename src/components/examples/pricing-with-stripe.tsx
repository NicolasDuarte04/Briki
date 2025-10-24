"use client";

import { PricingModule, PricingPlan } from "@/components/ui/pricing-module";
import { Building2, Users, User, Zap } from "lucide-react";

// Example pricing plans for Briki
const plans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Para brokers independientes y equipos explorando Briki",
    icon: <User className="w-8 h-8 text-primary" />,
    priceMonthly: 49,
    priceYearly: 39, // 20% discount
    users: "Hasta 2 asientos incluidos",
    features: [
      { label: "500 mensajes IA/mes incluidos", included: true },
      { label: "200 páginas PDF/mes", included: true },
      { label: "Hasta 50 chats WhatsApp/mes", included: true },
      { label: "Sourcing Agent", included: true },
      { label: "Comparaciones básicas", included: true },
      { label: "Generador de propuestas", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para pequeños equipos y boutiques que cierran más rápido",
    icon: <Zap className="w-8 h-8 text-primary" />,
    priceMonthly: 149,
    priceYearly: 119, // 20% discount
    users: "Hasta 5 asientos incluidos",
    features: [
      { label: "2,000 mensajes IA/mes incluidos", included: true },
      { label: "1,000 páginas PDF/mes", included: true },
      { label: "Hasta 200 chats WhatsApp/mes", included: true },
      { label: "Sourcing Agent", included: true },
      { label: "Comparaciones avanzadas", included: true },
      { label: "Generador de propuestas", included: true },
    ],
  },
  {
    id: "team",
    name: "Team",
    description: "Para equipos y agencias en crecimiento que buscan escalabilidad",
    icon: <Users className="w-8 h-8 text-primary" />,
    priceMonthly: 399,
    priceYearly: 319, // 20% discount
    users: "Hasta 15 asientos incluidos",
    features: [
      { label: "10,000 mensajes IA/mes incluidos", included: true },
      { label: "5,000 páginas PDF/mes", included: true },
      { label: "Chats WhatsApp ilimitados", included: true },
      { label: "Sourcing Agent", included: true },
      { label: "Comparaciones + benchmarks", included: true },
      { label: "Generador de propuestas", included: true },
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para grandes brokers y operaciones que necesitan control total",
    icon: <Building2 className="w-8 h-8 text-primary" />,
    priceMonthly: 0, // Custom pricing
    priceYearly: 0, // Custom pricing
    users: "Asientos ilimitados",
    features: [
      { label: "Créditos IA personalizados", included: true },
      { label: "Páginas PDF ilimitadas", included: true },
      { label: "WhatsApp API dedicada", included: true },
      { label: "Todos los flujos + personalizados", included: true },
      { label: "Private model routing", included: true },
      { label: "Data warehouse + dashboards", included: true },
    ],
  },
];

export function PricingWithStripe() {
  return (
    <PricingModule
      title="Precios transparentes para equipos que crecen"
      subtitle="Desde brokers independientes hasta operaciones enterprise. Paga solo por lo que usas, escala cuando lo necesites."
      plans={plans}
      defaultAnnual={false}
      buttonLabel="Comienza gratis"
      // userId="user_123" // Optional: pass user ID for tracking
    />
  );
}

// Example with custom handler (if you want to handle payments differently)
export function PricingWithCustomHandler() {
  const handlePlanSelect = (planId: string, isAnnual: boolean) => {
    console.log("Selected plan:", planId, "Annual:", isAnnual);
    // Custom logic here - maybe redirect to a contact form for Enterprise
    if (planId === "enterprise") {
      // Handle enterprise differently
      window.location.href = "/contact-sales";
    } else {
      // Use default Stripe integration for other plans
      // The component will fall back to Stripe integration
    }
  };

  return (
    <PricingModule
      title="Precios transparentes para equipos que crecen"
      subtitle="Desde brokers independientes hasta operaciones enterprise. Paga solo por lo que usas, escala cuando lo necesites."
      plans={plans}
      defaultAnnual={false}
      buttonLabel="Comienza gratis"
      onPlanSelect={handlePlanSelect}
    />
  );
}
