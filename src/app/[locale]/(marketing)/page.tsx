import Landing from "@/components/Landing";

// ✅ CORRECCIÓN: Renderizar Landing directamente sin HomeClient
// HomeClient está diseñado para la interfaz del agente, no para marketing
// La ruta raíz debe mostrar el LandingPage sin componentes del agente
export default function Home() {
  return <Landing />;
}
