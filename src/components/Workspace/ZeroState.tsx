'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, UserPlus, FolderKanban, MessageSquare, Check, Circle, Receipt, Users } from 'lucide-react';
import { pathForAgent, pathForCases, pathForClients, pathForCompanies, pathForPoliciesUpload, pathForQuotesUpload, pathForTeam, type Locale } from '@/lib/routes/workspace';
import { useTranslations } from 'next-intl';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ZeroStateProps {
  /**
   * Optional progress tracking - steps completed (0-6)
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
   * Defaults to 'en' if not provided
   */
  locale?: Locale;
}

interface Step {
  id: number;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  actionLabelKey: string;
  actionHref?: string;
  actionOnClick?: () => void;
  secondaryActionLabelKey?: string;
  secondaryActionHref?: string;
  isCompleted: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ZeroState - First-run guidance for new workspace users
 * 
 * Client component that displays a friendly 6-step onboarding
 * flow. Guides users to create clients, analyze policies and quotes,
 * create cases, manage cases, and manage their organization.
 * Includes progress tracking and direct action links.
 */
export function ZeroState({ 
  completedSteps = 0, 
  orgId,
  onUploadClick,
  locale = 'en'
}: ZeroStateProps) {
  const t = useTranslations('dashboard.zeroState');
  
  // ============================================================================
  // STEP CONFIGURATION
  // ============================================================================
  
  const steps: Step[] = [
    {
      id: 1,
      titleKey: 'steps.manageClients.title',
      descriptionKey: 'steps.manageClients.description',
      icon: <UserPlus className="size-6 text-primary" aria-hidden="true" />,
      actionLabelKey: 'steps.manageClients.actionLabel',
      actionHref: pathForClients(locale),
      secondaryActionLabelKey: 'steps.manageClients.secondaryActionLabel',
      secondaryActionHref: pathForCompanies(locale),
      isCompleted: completedSteps >= 1,
    },
    {
      id: 2,
      titleKey: 'steps.analyzePolicies.title',
      descriptionKey: 'steps.analyzePolicies.description',
      icon: <FileText className="size-6 text-primary" aria-hidden="true" />,
      actionLabelKey: 'steps.analyzePolicies.actionLabel',
      actionHref: pathForPoliciesUpload(locale),
      isCompleted: completedSteps >= 2,
    },
    {
      id: 3,
      titleKey: 'steps.analyzeQuotes.title',
      descriptionKey: 'steps.analyzeQuotes.description',
      icon: <Receipt className="size-6 text-primary" aria-hidden="true" />,
      actionLabelKey: 'steps.analyzeQuotes.actionLabel',
      actionHref: pathForQuotesUpload(locale),
      isCompleted: completedSteps >= 3,
    },
    {
      id: 4,
      titleKey: 'steps.createCase.title',
      descriptionKey: 'steps.createCase.description',
      icon: <MessageSquare className="size-6 text-primary" aria-hidden="true" />,
      actionLabelKey: 'steps.createCase.actionLabel',
      actionHref: pathForAgent(locale),
      isCompleted: completedSteps >= 4,
    },
    {
      id: 5,
      titleKey: 'steps.manageCases.title',
      descriptionKey: 'steps.manageCases.description',
      icon: <FolderKanban className="size-6 text-primary" aria-hidden="true" />,
      actionLabelKey: 'steps.manageCases.actionLabel',
      actionHref: pathForCases(locale),
      isCompleted: completedSteps >= 5,
    },
    {
      id: 6,
      titleKey: 'steps.manageOrganization.title',
      descriptionKey: 'steps.manageOrganization.description',
      icon: <Users className="size-6 text-primary" aria-hidden="true" />,
      actionLabelKey: 'steps.manageOrganization.actionLabel',
      actionHref: pathForTeam(locale),
      isCompleted: completedSteps >= 6,
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
            <h1 className="text-headline font-bold text-foreground">
              {t('welcome')}
            </h1>
            <p className="text-muted-foreground text-body max-w-xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`h-1.5 w-10 rounded-full transition-colors ${
                  completedSteps >= step 
                    ? 'bg-primary' 
                    : 'bg-muted'
                }`}
                aria-label={t('progressLabel', { step, status: completedSteps >= step ? 'completed' : 'pending' })}
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
            t={t}
          />
        ))}
      </div>

      {/* Footer encouragement */}
      <Card className="bg-muted/50 border-dashed rounded-card">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('needHelp')}{' '}
            <Link 
              href="/support" 
              className="text-primary hover:underline font-medium"
            >
              {t('contactUs')}
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
function StepCard({ step, stepNumber, t }: { step: Step; stepNumber: number; t: ReturnType<typeof useTranslations> }) {
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
                  {t('step', { number: stepNumber })}
                </span>
                {step.isCompleted && (
                  <span className="text-xs text-primary font-medium">
                    {t('completed')}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t(step.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(step.descriptionKey)}
              </p>
            </div>

            {/* Action buttons */}
            {!step.isCompleted && (
              <div className="flex flex-wrap gap-3">
                {step.actionHref ? (
                  <Button asChild size="default" className="w-full sm:w-auto rounded-button">
                    <Link href={step.actionHref}>
                      {t(step.actionLabelKey)}
                    </Link>
                  </Button>
                ) : step.actionOnClick ? (
                  <Button 
                    onClick={step.actionOnClick} 
                    size="default" 
                    className="w-full sm:w-auto rounded-button"
                  >
                    {t(step.actionLabelKey)}
                  </Button>
                ) : null}
                {step.secondaryActionHref && step.secondaryActionLabelKey && (
                  <Button asChild variant="outline" size="default" className="w-full sm:w-auto rounded-button">
                    <Link href={step.secondaryActionHref}>
                      {t(step.secondaryActionLabelKey)}
                    </Link>
                  </Button>
                )}
              </div>
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

