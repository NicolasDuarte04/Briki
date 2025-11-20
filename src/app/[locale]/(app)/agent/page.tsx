import { redirect } from 'next/navigation';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

// Placeholder: Lógica para obtener/crear el ID del último o nuevo hilo
// En una implementación real, aquí llamarías a una función del backend.
const getDefaultThreadId = async (): Promise<string> => {
    // Simulación: Devuelve un ID estático o genera uno nuevo
    return 'new-thread-placeholder';
};

export default async function AgentRootPage({ 
    params 
}: { 
    params: Promise<{ locale: string }> 
}) {
    // Asegurar autenticación
    await getCurrentOrg();
    
    const { locale } = await params;
    const threadId = await getDefaultThreadId();
    
    // Redirige a la página específica del hilo
    redirect(`/${locale}/agent/${threadId}`);
}
