import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, UserPlus, Equal, Check, Circle } from 'lucide-react';
import { pathForNewEntity, pathForAgent, type Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ZeroStateProps {
  /**
   * Optional progress tracking - steps completed (0-3)
   * If not provided, shows all steps as pending
   */
  completedSteps?: number;
  
  /**
   * Optional organization ID for upload functionality
   */
  orgId?: string;
  
  /**
   * Optional custom onUploadClick handler
   * If provided, overrides default upload button behavior
   */
  onUploadClick?: () => void;
  
  /**
   * Current locale for generating locale-aware paths
   * Defaults to 'es' if not provided
   */
  locale?: Locale;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  actionHref?: string;
  actionOnClick?: () => void;
  isCompleted: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ZeroState - First-run guidance for new workspace users
 * 
 * Server-compatible component that displays a friendly 3-step onboarding
 * flow in Spanish. Guides users to upload a policy, create a client,
 * and start a comparison. Includes progress tracking and direct action links.
 */
export function ZeroState({ 
  completedSteps = 0, 
  orgId,
  onUploadClick,
  locale = 'es'
}: ZeroStateProps) {
  
  // ============================================================================
  // STEP CONFIGURATION
  // ============================================================================
  
  const steps: Step[] = [
    {
      id: 1,
      title: 'Sube tu primera póliza',
      description: 'Arrastra un PDF o haz clic para seleccionar. Te ayudaremos a extraer la información clave.',
      icon: <FileText className="size-6 text-primary" aria-hidden="true" />,
      actionLabel: 'Subir PDF',
      actionHref: pathForAgent(locale),
      isCompleted: completedSteps >= 1,
    },
    {
      id: 2,
      title: 'Crea un cliente',
      description: 'Agrega la información básica de tu primer cliente para empezar a organizar tus casos.',
      icon: <UserPlus className="size-6 text-primary" aria-hidden="true" />,
      actionLabel: 'Nuevo cliente',
      actionHref: pathForNewEntity('client', locale),
      isCompleted: completedSteps >= 2,
    },
    {
      id: 3,
      title: 'Inicia una comparación',
      description: 'Compara opciones de pólizas lado a lado para encontrar la mejor cobertura.',
      icon: <Equal className="size-6 text-primary" aria-hidden="true" />,
      actionLabel: 'Comparar pólizas',
      actionHref: `${pathForNewEntity('case', locale)}?kind=comparison`,
      isCompleted: completedSteps >= 3,
    },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with optional illustration slot */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-2 border-primary/10 rounded-card shadow-elev-sm">
        <CardHeader className="text-center space-y-3 pb-6">
          {/* Small bird/doodle illustration slot */}
          <div 
            className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
            aria-hidden="true"
          >
            {/* Simple bird icon placeholder - can be replaced with custom SVG */}
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              className="size-8 text-primary"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" 
              />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-headline font-bold text-foreground">
              ¡Bienvenido a Briki! 👋
            </h2>
            <p className="text-muted-foreground text-body max-w-xl mx-auto">
              Vamos a configurar tu espacio en tres pasos sencillos. 
              En menos de 5 minutos estarás listo para gestionar tus pólizas.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  completedSteps >= step 
                    ? 'bg-primary' 
                    : 'bg-muted'
                }`}
                aria-label={`Paso ${step} ${completedSteps >= step ? 'completado' : 'pendiente'}`}
              />
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Steps grid */}
      <div className="grid gap-4 md:gap-6">
        {steps.map((step, index) => (
          <StepCard 
            key={step.id} 
            step={step} 
            stepNumber={index + 1}
          />
        ))}
      </div>

      {/* Footer encouragement */}
      <Card className="bg-muted/50 border-dashed rounded-card">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Necesitas ayuda? Nuestro equipo está aquí para ti.{' '}
            <Link 
              href="/support" 
              className="text-primary hover:underline font-medium"
            >
              Contáctanos
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * StepCard - Individual step card with icon, description, and action
 */
function StepCard({ step, stepNumber }: { step: Step; stepNumber: number }) {
  return (
    <Card 
      className={`transition-all rounded-card ${
        step.isCompleted 
          ? 'bg-primary/5 border-primary/20 shadow-elev-sm' 
          : 'bg-card hover:shadow-elev-md shadow-elev-sm border-border'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Step icon/status */}
          <div className="shrink-0">
            {step.isCompleted ? (
              <div className="size-12 rounded-full bg-primary flex items-center justify-center">
                <Check className="size-6 text-primary-foreground" aria-hidden="true" />
              </div>
            ) : (
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                {step.icon}
              </div>
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Paso {stepNumber}
                </span>
                {step.isCompleted && (
                  <span className="text-xs text-primary font-medium">
                    ✓ Completado
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Action button */}
            {!step.isCompleted && (
              <>
                {step.actionHref ? (
                  <Button asChild size="default" className="w-full sm:w-auto rounded-button">
                    <Link href={step.actionHref}>
                      {step.actionLabel}
                    </Link>
                  </Button>
                ) : step.actionOnClick ? (
                  <Button 
                    onClick={step.actionOnClick} 
                    size="default" 
                    className="w-full sm:w-auto rounded-button"
                  >
                    {step.actionLabel}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ZeroState;

