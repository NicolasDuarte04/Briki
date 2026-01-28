import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin } from 'lucide-react';
import { getPinnedClients, type PinnedClient } from '@/lib/data/workspace';
import { pathForClient, type Locale } from '@/lib/routes/workspace';
import { getTranslations } from 'next-intl/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinnedClientsProps {
  userId: string;
  orgId: string;
  locale: Locale;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a tokenized color class for a client based on index
 * Uses the chart color palette for visual variety
 * 
 * ✅ CORRECCIÓN: Type guard con fallback para garantizar type-safety
 * Aunque matemáticamente el operador módulo (%) garantiza que el índice
 * calculado siempre estará en el rango 0-4, TypeScript no puede inferir
 * esta garantía desde el análisis estático.
 * 
 * Esta implementación defensiva:
 * - Valida explícitamente que el color existe
 * - Proporciona fallback al primer color si algo falla
 * - Registra warning para debugging en casos inesperados
 * - Garantiza type-safety completo sin usar assertions
 * 
 * @param index - Índice del cliente (0-based, rotativo vía módulo)
 * @returns String de clases Tailwind CSS para el Badge
 * 
 * @example
 * getClientColorClass(0)  // → primer color (chart-1)
 * getClientColorClass(5)  // → primer color (5 % 5 = 0)
 * getClientColorClass(7)  // → tercer color (7 % 5 = 2)
 */
function getClientColorClass(index: number): string {
  const colors = [
    'bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/20',
    'bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/20',
    'bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/20',
    'bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/20',
    'bg-chart-5/10 text-chart-5 border-chart-5/20 hover:bg-chart-5/20',
  ];
  
  // ✅ CORRECCIÓN: Calcular índice con módulo para rotación circular
  // El operador % garantiza matemáticamente que colorIndex está en rango 0-4
  const colorIndex = index % colors.length;
  const color = colors[colorIndex];
  
  // ✅ CORRECCIÓN: Type guard explícito para garantizar que color existe
  // Aunque el índice está garantizado matemáticamente, este check:
  // 1. Satisface el sistema de tipos de TypeScript
  // 2. Proporciona seguridad adicional ante modificaciones futuras del array
  // 3. Permite debugging si algo inesperado ocurre
  if (!color) {
    // Fallback defensivo: nunca debería ejecutarse con el array actual
    // Si se ejecuta, indica un bug en la lógica o modificación del array
    console.warn(
      `[PinnedClients.getClientColorClass] Unexpected: color not found for index ${index} (colorIndex: ${colorIndex}). ` +
      `Array has ${colors.length} elements. Falling back to first color.`
    );
    
    // Retornar primer color como fallback seguro
    // El primer elemento siempre existe (array tiene 5 elementos constantes)
    return colors[0]!;
  }
  
  // ✅ Ahora TypeScript sabe que color es definitivamente string, no undefined
  return color;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinnedClients - Personal shortcuts to frequently accessed clients
 * 
 * Server component that displays up to 10 pinned clients as compact chips.
 * Each chip links to the client detail page with tokenized colors for
 * quick visual recognition.
 */
export async function PinnedClients({ userId, orgId, locale }: PinnedClientsProps) {
  const [pinnedClients, t] = await Promise.all([
    getPinnedClients(userId, orgId),
    getTranslations('dashboard.pinned')
  ]);

  return (
    <Card className="bg-card rounded-card shadow-elev-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pin className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            {t('clients')}
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        {pinnedClients.length === 0 ? (
          // Empty state
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('emptyClients')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('hint')}
            </p>
          </div>
        ) : (
          // Pinned clients chips
          <div className="flex flex-wrap gap-2">
            {pinnedClients.map((client, index) => (
              <Badge
                key={client.id}
                asChild
                variant="outline"
                className={`
                  transition-all duration-200
                  rounded-button
                  ${getClientColorClass(index)}
                `}
              >
                <Link
                  href={pathForClient(client.clientId, locale)}
                  className="flex items-center gap-1.5"
                  aria-label={`${client.clientName}`}
                >
                  <span className="font-medium truncate max-w-[120px]">
                    {client.clientName}
                  </span>
                </Link>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


