import Landing from "@/components/Landing";

/**
 * Página /landing (acceso directo sin prefijo de idioma)
 * 
 * Esta ruta existe para acceso directo al landing page.
 * El locale se establece como 'es' en el layout.
 */
export default function LandingPage() {
  return <Landing />;
}

