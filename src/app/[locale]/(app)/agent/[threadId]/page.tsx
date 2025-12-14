import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import HomeClient from '@/components/HomeClient';

// Placeholder: Lógica para validar si el threadId existe para el usuario/org
const validateThreadAccess = async (threadId: string, orgId: string): Promise<boolean> => {
    console.log(`Validando acceso a thread ${threadId} para org ${orgId}`);
    // Simulación: Siempre permitir acceso por ahora
    return true;
};

export default async function AgentThreadPage({ 
    params 
}: { 
    params: Promise<{ threadId: string; locale: string }> 
}) {
    const { currentOrg } = await getCurrentOrg(); // Asegurar autenticación
    const { threadId, locale } = await params;
    
    // 🔍 DEBUG: Log en Server Component
    console.log('🔍 [AgentThreadPage] SSR - Renderizando:', {
        threadId,
        locale,
        orgId: currentOrg.id,
    });

    const hasAccess = await validateThreadAccess(threadId, currentOrg.id);

    if (!hasAccess) {
        notFound();
    }

    // 🔍 DEBUG: Justo antes de retornar el componente
    console.log('🔍 [AgentThreadPage] SSR - Retornando HomeClient JSX');

    // Renderizar HomeClient con el hilo específico
    // El mensaje inicial se maneja dentro de HomeClient
    // ✅ CORRECCIÓN: Pasar orgId desde SSR para evitar race condition en PdfUploader
    return <HomeClient initialStep="conversation" threadId={threadId} orgId={currentOrg.id} />;
}
