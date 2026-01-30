"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, X, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/AuthProvider";
import {
  getPendingInvitations,
  respondToInvitation,
  type PendingInvitation,
} from "@/app/actions/invitationActions";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

/**
 * NotificationDropdown - Muestra las invitaciones de organización pendientes.
 * 
 * Funcionalidades:
 * - Badge con contador de notificaciones pendientes
 * - Lista de invitaciones con detalles
 * - Acciones rápidas para aceptar/rechazar
 * - Link a la página de perfil para ver más detalles
 */
export function NotificationDropdown() {
  const { status } = useAuth();
  const t = useTranslations('profile.notifications');
  const locale = useLocale();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar invitaciones
  const loadInvitations = useCallback(async () => {
    if (status !== "authenticated") return;
    
    setLoading(true);
    try {
      const result = await getPendingInvitations();
      if (result.ok && result.invitations) {
        setInvitations(result.invitations);
      }
    } catch (error) {
      console.error("Error loading invitations:", error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Cargar al montar y cuando cambie el estado de autenticación
  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Recargar cuando se abre el dropdown
  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen, loadInvitations]);

  // Responder a una invitación
  const handleRespond = async (invitationId: string, accept: boolean) => {
    setRespondingTo(invitationId);
    try {
      const result = await respondToInvitation(invitationId, accept);
      
      if (result.ok) {
        // Actualizar lista local
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        
        if (accept) {
          toast.success(t('joinedOrg'));
        } else {
          toast.info(t('invitationRejected'));
        }
      } else {
        toast.error(result.error || t('invitationError'));
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast.error(t('invitationError'));
    } finally {
      setRespondingTo(null);
    }
  };

  // No renderizar si no está autenticado
  if (status !== "authenticated") {
    return null;
  }

  const hasNotifications = invitations.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {/* Badge de contador */}
          {hasNotifications && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {invitations.length > 9 ? "9+" : invitations.length}
            </span>
          )}
          <span className="sr-only">
            {hasNotifications 
              ? `${invitations.length} notificaciones pendientes` 
              : "Sin notificaciones"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {hasNotifications && (
            <span className="text-xs font-normal text-muted-foreground">
              {invitations.length} pendiente{invitations.length !== 1 ? "s" : ""}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading && invitations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasNotifications ? (
          <ScrollArea className="max-h-80">
            <div className="space-y-1 p-1">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-lg border border-border bg-card p-3 space-y-2"
                >
                  {/* Header de la invitación */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        Invitación de{" "}
                        <span className="text-primary">
                          {invitation.organizationName}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {invitation.inviterName || invitation.inviterEmail || "Un miembro"}{" "}
                        te invita como{" "}
                        <span className="font-medium">
                          {invitation.role === "admin" ? "Admin" : "Miembro"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Mensaje opcional */}
                  {invitation.message && (
                    <p className="text-xs text-muted-foreground italic pl-11 truncate">
                      "{invitation.message}"
                    </p>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleRespond(invitation.id, false)}
                      disabled={respondingTo === invitation.id}
                    >
                      {respondingTo === invitation.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Rechazar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleRespond(invitation.id, true)}
                      disabled={respondingTo === invitation.id}
                    >
                      {respondingTo === invitation.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Aceptar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          </div>
        )}

        {/* Footer con link a perfil */}
        {hasNotifications && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link
                href={`/${locale}/profile`}
                className="block w-full text-center text-xs text-primary hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Ver todas en Perfil →
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

