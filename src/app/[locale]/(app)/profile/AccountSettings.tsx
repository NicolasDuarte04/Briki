'use client';

import { useState, useEffect, useRef, useActionState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateProfile, updateProfileDirect, updateNotificationSettings, requestPasswordReset } from './actions';
import { type FormState } from './schema';
import { toast } from 'sonner';
import { Building2, UserPlus, Users, Crown, Shield, User, ChevronRight, Mail, Copy, Check, Link2Off, Loader2, Bell, CheckCircle2, XCircle, Clock, Globe, Trash2 } from 'lucide-react';
import { 
  getUserOrganizationsForUI, 
  switchOrganization, 
  getOrgMembers,
  getActiveOrganization,
  updateMemberRole,
  removeMemberFromOrg,
  type UserOrganization,
  type OrgMember 
} from '@/app/actions/organizationActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  inviteUserToOrg,
  getPendingInvitations,
  countPendingInvitations,
  respondToInvitation,
  getSentInvitations,
  cancelInvitation,
  type PendingInvitation,
  type SentInvitation
} from '@/app/actions/invitationActions';
import { useOperationBlocker } from '@/components/ui/OperationBlocker';

type Tab = 'personal' | 'security' | 'notifications' | 'team' | 'audit';

type EditableField = 'name' | 'phone' | 'address';

interface AccountSettingsProps {
  initialName: string;
  initialPhone: string;
  initialAddress: string;
  email: string;
  locale: 'en' | 'es';
  notificationsProductUpdates: boolean;
  notificationsPolicyAlerts: boolean;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-disabled={pending}>
      {pending ? 'Saving...' : label}
    </Button>
  );
}

export function AccountSettings({ 
  initialName, 
  initialPhone,
  initialAddress,
  email, 
  locale,
  notificationsProductUpdates,
  notificationsPolicyAlerts
}: AccountSettingsProps) {
  const t = useTranslations('profilePage');
  const tCommon = useTranslations('common');
  const tNotifications = useTranslations('profilePage.notifications');
  
  // Support deep-linking to specific tabs (e.g. ?tab=team from ZeroState)
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs: Tab[] = ['personal', 'security', 'notifications', 'team', 'audit'];
  const initialTab: Tab = tabParam && validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : 'personal';
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [phoneValue, setPhoneValue] = useState(initialPhone);
  const [addressValue, setAddressValue] = useState(initialAddress);
  const [productUpdatesChecked, setProductUpdatesChecked] = useState(notificationsProductUpdates);
  const [policyAlertsChecked, setPolicyAlertsChecked] = useState(notificationsPolicyAlerts);
  const [notificationsPending, setNotificationsPending] = useState(false);
  const [passwordResetStatus, setPasswordResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [lastSavedField, setLastSavedField] = useState<EditableField | null>(null);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // ✅ Team Dashboard state - Datos reales
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<OrgMember[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePending, setInvitePending] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  
  // ✅ Invitation state - Datos reales
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [respondingToInvitation, setRespondingToInvitation] = useState<string | null>(null);
  
  // ✅ Role change state
  const [changingRoleForMember, setChangingRoleForMember] = useState<string | null>(null);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    memberId: string;
    memberName: string;
    currentRole: string;
    newRole: string;
  } | null>(null);
  
  // ✅ Member removal state
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [removeMemberDialog, setRemoveMemberDialog] = useState<{
    open: boolean;
    memberId: string;
    memberName: string;
  } | null>(null);
  
  // ✅ Language change blocker - para animación de carga durante cambio de idioma
  const { showBlocker, hideBlocker } = useOperationBlocker();
  const [isChangingLocale, setIsChangingLocale] = useState(false);
  
  // Cargar organizaciones al montar
  useEffect(() => {
    const loadOrganizations = async () => {
      setLoadingOrgs(true);
      try {
        // Cargar organizaciones del usuario
        const orgsResult = await getUserOrganizationsForUI();
        if (orgsResult.ok && orgsResult.organizations) {
          const orgs = orgsResult.organizations;
          setOrganizations(orgs);
          
          // Obtener la org activa actual
          const activeOrgResult = await getActiveOrganization();
          if (activeOrgResult.ok && activeOrgResult.organizationId) {
            setSelectedOrgId(activeOrgResult.organizationId);
          } else {
            // Fallback: usar la primera org si existe
            const firstOrg = orgs[0];
            if (firstOrg) {
              setSelectedOrgId(firstOrg.id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading organizations:', error);
        toast.error('Error al cargar organizaciones');
      } finally {
        setLoadingOrgs(false);
      }
    };
    
    loadOrganizations();
  }, []);
  
  // Cargar miembros cuando cambia la org seleccionada
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedOrgId) return;
      
      setLoadingMembers(true);
      try {
        const result = await getOrgMembers(selectedOrgId);
        if (result.ok && result.members) {
          setTeamMembers(result.members);
        }
      } catch (error) {
        console.error('Error loading team members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };
    
    loadTeamMembers();
  }, [selectedOrgId]);
  
  // Cargar invitaciones pendientes
  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const [pending, count, sent] = await Promise.all([
        getPendingInvitations(),
        countPendingInvitations(),
        selectedOrgId ? getSentInvitations(selectedOrgId) : Promise.resolve({ ok: true, invitations: [] })
      ]);
      
      if (pending.ok && pending.invitations) {
        setPendingInvitations(pending.invitations);
      }
      if (typeof count === 'number') {
        setPendingInvitationsCount(count);
      }
      if (sent.ok && sent.invitations) {
        setSentInvitations(sent.invitations);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [selectedOrgId]);
  
  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Manejar cambio de organización
  const handleOrgChange = async (newOrgId: string) => {
    if (newOrgId === selectedOrgId) return;
    
    setSwitchingOrg(true);
    try {
      const result = await switchOrganization(newOrgId);
      if (result.ok) {
        setSelectedOrgId(newOrgId);
        toast.success('Organización cambiada exitosamente');
        // Recargar invitaciones enviadas para la nueva org
        const sent = await getSentInvitations(newOrgId);
        if (sent.ok && sent.invitations) {
          setSentInvitations(sent.invitations);
        }
      } else {
        toast.error(result.error || 'Error al cambiar organización');
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Error al cambiar organización');
    } finally {
      setSwitchingOrg(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Por favor ingresa un email válido');
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Por favor ingresa un email válido');
      return;
    }
    
    if (!selectedOrgId) {
      toast.error('Selecciona una organización primero');
      return;
    }
    
    setInvitePending(true);
    try {
      const result = await inviteUserToOrg({
        orgId: selectedOrgId,
        inviteeEmail: inviteEmail.trim(),
        role: 'member'
      });
      
      if (result.ok) {
        toast.success(`Invitación enviada a ${inviteEmail}`);
        setInviteEmail('');
        // Recargar invitaciones enviadas
        loadInvitations();
      } else {
        toast.error(result.error || 'Error al enviar invitación');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Error al enviar invitación');
    } finally {
      setInvitePending(false);
    }
  };

  // Funcionalidad de link de invitación DESHABILITADA (próximamente)
  const handleCopyInviteLink = async () => {
    toast.info('Funcionalidad de link de invitación próximamente disponible');
  };
  
  // Responder a una invitación (aceptar/rechazar)
  const handleRespondToInvitation = async (invitationId: string, accept: boolean) => {
    setRespondingToInvitation(invitationId);
    try {
      const result = await respondToInvitation(invitationId, accept);
      if (result.ok) {
        toast.success(accept ? '¡Te has unido a la organización!' : 'Invitación rechazada');
        // Recargar todo
        loadInvitations();
        // Si aceptamos, recargar organizaciones
        if (accept) {
          const orgsResult = await getUserOrganizationsForUI();
          if (orgsResult.ok && orgsResult.organizations) {
            setOrganizations(orgsResult.organizations);
          }
        }
      } else {
        toast.error(result.error || 'Error al responder a la invitación');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Error al responder a la invitación');
    } finally {
      setRespondingToInvitation(null);
    }
  };
  
  // Cancelar una invitación enviada
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const result = await cancelInvitation(invitationId);
      if (result.ok) {
        toast.success('Invitación cancelada');
        loadInvitations();
      } else {
        toast.error(result.error || 'Error al cancelar invitación');
      }
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error('Error al cancelar invitación');
    }
  };
  
  // ✅ Handler para cambio de rol
  const handleRoleChange = (memberId: string, memberName: string, currentRole: string, newRole: string) => {
    setRoleChangeDialog({
      open: true,
      memberId,
      memberName,
      currentRole,
      newRole
    });
  };
  
  const confirmRoleChange = async () => {
    if (!roleChangeDialog) return;
    
    setChangingRoleForMember(roleChangeDialog.memberId);
    
    try {
      const result = await updateMemberRole(
        roleChangeDialog.memberId, 
        roleChangeDialog.newRole as 'admin' | 'member'
      );
      
      if (result.ok) {
        toast.success('Rol actualizado exitosamente');
        // Recargar miembros para reflejar el cambio
        if (selectedOrgId) {
          const membersResult = await getOrgMembers(selectedOrgId);
          if (membersResult.ok && membersResult.members) {
            setTeamMembers(membersResult.members);
          }
        }
      } else {
        toast.error(result.error || 'Error al actualizar rol');
      }
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Error inesperado al cambiar rol');
    } finally {
      setChangingRoleForMember(null);
      setRoleChangeDialog(null);
    }
  };

  // ✅ Handler para eliminar miembro
  const handleRemoveMember = (memberId: string, memberName: string) => {
    setRemoveMemberDialog({
      open: true,
      memberId,
      memberName
    });
  };

  const confirmRemoveMember = async () => {
    if (!removeMemberDialog) return;
    
    setRemovingMember(removeMemberDialog.memberId);
    
    try {
      const result = await removeMemberFromOrg(removeMemberDialog.memberId);
      
      if (result.ok) {
        toast.success(t('team.memberRemoved'));
        // Recargar miembros para reflejar el cambio
        if (selectedOrgId) {
          const membersResult = await getOrgMembers(selectedOrgId);
          if (membersResult.ok && membersResult.members) {
            setTeamMembers(membersResult.members);
          }
        }
      } else {
        toast.error(result.error || 'Error al eliminar miembro');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Error inesperado al eliminar miembro');
    } finally {
      setRemovingMember(null);
      setRemoveMemberDialog(null);
    }
  };

  // ✅ Helper para determinar si el usuario actual puede eliminar a un miembro
  const canRemoveMember = (memberRole: string, memberIsCurrentUser: boolean): boolean => {
    if (memberIsCurrentUser) return false; // No se puede eliminar a sí mismo
    if (memberRole === 'owner') return false; // Nunca se puede eliminar al owner
    
    const currentUserRole = selectedOrg?.role;
    if (!currentUserRole) return false;
    
    if (currentUserRole === 'owner') return true; // Owner puede eliminar a cualquiera excepto owner
    if (currentUserRole === 'admin' && memberRole === 'member') return true; // Admin solo puede eliminar members
    
    return false;
  };

  const getRoleIcon = (role: 'owner' | 'admin' | 'member') => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member': return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: 'owner' | 'admin' | 'member') => {
    const styles = {
      owner: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      member: 'bg-muted text-foreground border-border',
    };
    const labels = { 
      owner: tNotifications('roleOwner'), 
      admin: tNotifications('roleAdmin'), 
      member: tNotifications('roleMember') 
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[role]}`}>
        {getRoleIcon(role)}
        {labels[role]}
      </span>
    );
  };

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  const initialState: FormState = { ok: true };
  const [state, formAction] = useActionState(updateProfile, initialState);
  const isFirstSubmission = useRef(true);
  const pendingFieldRef = useRef<EditableField | null>(null);
  const savedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginSave = (field: EditableField) => {
    pendingFieldRef.current = field;
    if (savedIndicatorTimeoutRef.current) {
      clearTimeout(savedIndicatorTimeoutRef.current);
      savedIndicatorTimeoutRef.current = null;
    }
    setLastSavedField(null);
  };

  useEffect(() => {
    if (isFirstSubmission.current) {
      isFirstSubmission.current = false;
      return;
    }

    if (state?.ok) {
      const field = pendingFieldRef.current;
      if (field) {
        switch (field) {
          case 'name':
            setIsEditingName(false);
            break;
          case 'phone':
            setIsEditingPhone(false);
            break;
          case 'address':
            setIsEditingAddress(false);
            break;
        }

        if (savedIndicatorTimeoutRef.current) {
          clearTimeout(savedIndicatorTimeoutRef.current);
        }

        setLastSavedField(field);
        savedIndicatorTimeoutRef.current = setTimeout(() => {
          setLastSavedField((current) => (current === field ? null : current));
        }, 2000);
      }

      pendingFieldRef.current = null;
    } else if (state && !state.ok) {
      pendingFieldRef.current = null;
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, []);

  // Cargar rol de usuario al montar
  useEffect(() => {
    const checkAdminAndLoadAuditLogs = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const isAdminUser = data.role === 'admin' || data.role === 'owner';
          setIsAdmin(isAdminUser);
          
          // Solo cargar audit_logs si es admin/owner
          if (isAdminUser) {
            setLoadingAuditLogs(true);
            const auditResponse = await fetch('/api/audit-log');
            if (auditResponse.ok) {
              const logs = await auditResponse.json();
              setAuditLogs(logs);
            }
            setLoadingAuditLogs(false);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminAndLoadAuditLogs();
  }, [isAdmin]);

  const handlePasswordReset = async () => {
    setPasswordResetStatus('sending');
    const formData = new FormData();
    formData.append('email', email);
    formData.append('locale', locale);
    
    const result = await requestPasswordReset(null, formData);
    
    if (result.status === 'success') {
      setPasswordResetStatus('success');
      toast.success('Password reset email sent! Check your inbox.');
    } else {
      setPasswordResetStatus('error');
      toast.error('Failed to send password reset email');
    }
    
    // Reset status after 3 seconds
    setTimeout(() => setPasswordResetStatus('idle'), 3000);
  };

  const handleNotificationToggle = async (field: 'productUpdates' | 'policyAlerts', checked: boolean) => {
    setNotificationsPending(true);
    
    const formData = new FormData();
    formData.append('locale', locale);
    
    // Set the toggled field
    if (field === 'productUpdates') {
      setProductUpdatesChecked(checked);
      formData.append('productUpdates', checked ? 'on' : 'off');
      formData.append('policyAlerts', policyAlertsChecked ? 'on' : 'off');
    } else {
      setPolicyAlertsChecked(checked);
      formData.append('productUpdates', productUpdatesChecked ? 'on' : 'off');
      formData.append('policyAlerts', checked ? 'on' : 'off');
    }
    
    const result = await updateNotificationSettings(formData);
    
    setNotificationsPending(false);
    
    if (result.status === 'success') {
      // Subtle success indication - no toast needed for toggles
    } else {
      toast.error('Failed to update notification settings');
      // Revert on error
      if (field === 'productUpdates') {
        setProductUpdatesChecked(!checked);
      } else {
        setPolicyAlertsChecked(!checked);
      }
    }
  };

  /**
   * Maneja el cambio de idioma del usuario.
   * Usa updateProfileDirect en lugar de updateProfile porque:
   * - No se usa con useActionState
   * - Es una llamada directa desde un event handler
   * - No hay un estado previo real del formulario
   */
  const handleLocaleChange = async (newLocale: 'en' | 'es') => {
    if (newLocale === currentLocale || isChangingLocale) return;
    
    // Mostrar bloqueador con animación de carga
    setIsChangingLocale(true);
    const blockingMessage = newLocale === 'en' 
      ? 'Changing language...' 
      : 'Cambiando idioma...';
    showBlocker(blockingMessage, 'locale-change');
    
    try {
      const formData = new FormData();
      formData.append('field', 'locale');
      formData.append('locale', newLocale);
      
      // ✅ CORRECCIÓN: Usar updateProfileDirect para llamadas programáticas
      const result = await updateProfileDirect(formData);
      
      if (result.ok) {
        setCurrentLocale(newLocale);
        // Redirigir para aplicar el nuevo locale
        // No ocultamos el bloqueador ya que la página se recargará
        window.location.href = `/${newLocale}/profile`;
      } else {
        // Ocultar bloqueador en caso de error
        hideBlocker('locale-change');
        setIsChangingLocale(false);
        toast.error(result.message || 'Failed to update language');
      }
    } catch (error) {
      console.error('Error updating language:', error);
      hideBlocker('locale-change');
      setIsChangingLocale(false);
      toast.error('Failed to update language');
    }
  };

  const tabs = [
    { id: 'personal' as Tab, label: t('tabs.personal'), badge: 0 },
    { id: 'security' as Tab, label: t('tabs.security'), badge: 0 },
    { id: 'notifications' as Tab, label: t('tabs.notifications'), badge: pendingInvitationsCount },
    { id: 'team' as Tab, label: t('tabs.team'), badge: 0 },
    // ✅ Solo mostrar pestaña de auditoría si el usuario es admin u owner
    ...(isAdmin ? [{ id: 'audit' as Tab, label: t('tabs.audit'), badge: 0 }] : []),
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <nav className="flex gap-8" aria-label="Account sections">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  pb-3 px-1 text-sm relative transition-colors flex items-center gap-2
                  ${isActive 
                    ? 'text-foreground font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'personal' && (
          <>
            {/* Name Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground/90 mb-1">{t('personal.name')}</h3>
                  {!isEditingName ? (
                    <p className="text-base text-foreground">
                      {nameValue || t('personal.notSet')}
                      {lastSavedField === 'name' && (
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400">{tCommon('actions.saved')}</span>
                      )}
                    </p>
                  ) : (
                    <form
                      action={formAction}
                      className="mt-2 space-y-3"
                      onSubmit={() => beginSave('name')}
                    >
                      <Input
                        name="name"
                        defaultValue={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="max-w-md"
                        placeholder={t('personal.namePlaceholder')}
                        autoFocus
                      />
                      <input type="hidden" name="field" value="name" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label={tCommon('save')} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingName(false);
                            setNameValue(initialName);
                          }}
                        >
                          {tCommon('actions.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
                {!isEditingName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(true);
                      setLastSavedField(null);
                    }}
                    className="text-primary hover:text-primary/80 hover:bg-primary/10"
                  >
                    {tCommon('edit')}
                  </Button>
                )}
              </div>
            </div>

            {/* Email Card (read-only) */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground/90 mb-1">{t('personal.email')}</h3>
                  <p className="text-base text-foreground">{email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('personal.emailHint')}</p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground/90 mb-1">{t('personal.phone')}</h3>
                  {!isEditingPhone ? (
                    <p className="text-base text-foreground">
                      {phoneValue || t('personal.notSet')}
                      {lastSavedField === 'phone' && (
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400">{tCommon('actions.saved')}</span>
                      )}
                    </p>
                  ) : (
                    <form
                      action={formAction}
                      className="mt-2 space-y-3"
                      onSubmit={() => beginSave('phone')}
                    >
                      <Input
                        name="phone"
                        defaultValue={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        className="max-w-md"
                        placeholder={t('personal.phonePlaceholder')}
                        autoFocus
                        maxLength={40}
                      />
                      <input type="hidden" name="field" value="phone" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label={tCommon('actions.save')} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingPhone(false);
                            setPhoneValue(initialPhone);
                          }}
                        >
                          {tCommon('actions.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
                {!isEditingPhone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingPhone(true);
                      setLastSavedField(null);
                    }}
                    className="text-primary hover:text-primary/80 hover:bg-primary/10"
                  >
                    {tCommon('actions.edit')}
                  </Button>
                )}
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground/90 mb-1">{t('personal.address')}</h3>
                  {!isEditingAddress ? (
                    <p className="text-base text-foreground">
                      {addressValue || t('personal.notSet')}
                      {lastSavedField === 'address' && (
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400">{tCommon('actions.saved')}</span>
                      )}
                    </p>
                  ) : (
                    <form
                      action={formAction}
                      className="mt-2 space-y-3"
                      onSubmit={() => beginSave('address')}
                    >
                      <Input
                        name="address"
                        defaultValue={addressValue}
                        onChange={(e) => setAddressValue(e.target.value)}
                        className="max-w-md"
                        placeholder={t('personal.addressPlaceholder')}
                        autoFocus
                        maxLength={200}
                      />
                      <input type="hidden" name="field" value="address" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label={tCommon('actions.save')} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingAddress(false);
                            setAddressValue(initialAddress);
                          }}
                        >
                          {tCommon('actions.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
                {!isEditingAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingAddress(true);
                      setLastSavedField(null);
                    }}
                    className="text-primary hover:text-primary/80 hover:bg-primary/10"
                  >
                    {tCommon('actions.edit')}
                  </Button>
                )}
              </div>
            </div>

            {/* Language Card - Rediseñado con selección explícita */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start gap-3 mb-4">
                <Globe className="size-5 text-primary mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-medium text-foreground/90">{t('personal.language')}</h3>
                  <p className="text-sm text-muted-foreground">{t('personal.languageDescription')}</p>
                </div>
              </div>
              
              <div className="space-y-2" role="radiogroup" aria-label={t('personal.languageSelection')}>
                {/* English Option */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    currentLocale === 'en'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-input hover:border-muted-foreground/50 hover:bg-muted/50'
                  } ${isChangingLocale ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={currentLocale === 'en'}
                    onChange={() => handleLocaleChange('en')}
                    disabled={isChangingLocale}
                    className="sr-only"
                    aria-label="English"
                  />
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                    currentLocale === 'en'
                      ? 'border-primary'
                      : 'border-muted-foreground/40'
                  }`}>
                    {currentLocale === 'en' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">English</span>
                    <span className="ml-2 text-xs text-muted-foreground">{t('personal.default')}</span>
                  </div>
                  {currentLocale === 'en' && (
                    <Check className="size-4 text-primary" aria-hidden="true" />
                  )}
                </label>
                
                {/* Español Option */}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    currentLocale === 'es'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-input hover:border-muted-foreground/50 hover:bg-muted/50'
                  } ${isChangingLocale ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="language"
                    value="es"
                    checked={currentLocale === 'es'}
                    onChange={() => handleLocaleChange('es')}
                    disabled={isChangingLocale}
                    className="sr-only"
                    aria-label="Español"
                  />
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                    currentLocale === 'es'
                      ? 'border-primary'
                      : 'border-muted-foreground/40'
                  }`}>
                    {currentLocale === 'es' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">Español</span>
                  </div>
                  {currentLocale === 'es' && (
                    <Check className="size-4 text-primary" aria-hidden="true" />
                  )}
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-base font-semibold text-foreground mb-2">{t('security.password')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('security.passwordDescription')}
            </p>
            <Button 
              onClick={handlePasswordReset}
              disabled={passwordResetStatus === 'sending'}
              className="bg-primary hover:bg-primary/90"
            >
              {passwordResetStatus === 'sending' ? t('security.sending') : t('security.sendResetEmail')}
            </Button>
            {passwordResetStatus === 'success' && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">✓ {t('security.resetSuccess')}</p>
            )}
            {passwordResetStatus === 'error' && (
              <p className="text-sm text-destructive mt-2">{t('security.resetError')}</p>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Invitaciones pendientes */}
            {pendingInvitations.length > 0 && (
              <div className="bg-card rounded-lg border border-primary/30 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">{t('notifications.pendingInvitations')}</h3>
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div 
                      key={invitation.id} 
                      className="p-4 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {t('notifications.invitationFrom')} <span className="text-primary">{invitation.organizationName}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {invitation.inviterName || invitation.inviterEmail || t('notifications.aMember')} {t('notifications.invitedYouAs')}{' '}
                            <span className="font-medium">
                              {invitation.role === 'admin' ? t('notifications.roleAdmin') : t('notifications.roleMember')}
                            </span>
                          </p>
                          {invitation.message && (
                            <p className="text-sm text-muted-foreground mt-2 italic">"{invitation.message}"</p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-2">
                            {t('notifications.received')} {new Date(invitation.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                            {invitation.expiresAt && (
                              <> · {t('notifications.expires')} {new Date(invitation.expiresAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { 
                                day: 'numeric', month: 'short' 
                              })}</>
                            )}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRespondToInvitation(invitation.id, false)}
                            disabled={respondingToInvitation === invitation.id}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            {respondingToInvitation === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                {t('notifications.decline')}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRespondToInvitation(invitation.id, true)}
                            disabled={respondingToInvitation === invitation.id}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            {respondingToInvitation === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                {t('notifications.accept')}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sin invitaciones */}
            {pendingInvitations.length === 0 && !loadingInvitations && (
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="text-center py-4">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">{t('notifications.noInvitations')}</p>
                </div>
              </div>
            )}
            
            {loadingInvitations && (
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
                  <span className="text-sm text-muted-foreground">{t('notifications.loadingInvitations')}</span>
                </div>
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{t('notifications.productUpdates')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('notifications.productUpdatesDescription')}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={productUpdatesChecked}
                  onChange={(e) => handleNotificationToggle('productUpdates', e.target.checked)}
                  disabled={notificationsPending}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{t('notifications.policyAlerts')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('notifications.policyAlertsDescription')}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={policyAlertsChecked}
                  onChange={(e) => handleNotificationToggle('policyAlerts', e.target.checked)}
                  disabled={notificationsPending}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Selector de Organización */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">{t('team.activeOrg')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('team.activeOrgDesc')}
              </p>
              
              {loadingOrgs ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('team.loadingOrgs')}</span>
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">{t('team.noOrgs')}</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Select 
                    value={selectedOrgId} 
                    onValueChange={handleOrgChange}
                    disabled={switchingOrg}
                  >
                    <SelectTrigger className="w-full max-w-md bg-card border-input focus:border-primary focus:ring-primary">
                      <SelectValue placeholder={t('team.selectOrg')} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-muted-foreground/70" />
                            <span className="font-medium">{org.name}</span>
                            <span className="text-xs text-muted-foreground">({org.memberCount} {t('team.membersLabel')})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {switchingOrg && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  
                  {selectedOrg && !switchingOrg && (
                    <div className="flex items-center gap-2">
                      {getRoleBadge(selectedOrg.role)}
                    </div>
                  )}
                </div>
              )}

              {selectedOrg && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{t('team.workingIn')}:</span> {selectedOrg.name}
                  </p>
                  <p className="text-xs text-primary mt-1">
                    Slug: <code className="bg-primary/10 px-1 rounded">{selectedOrg.slug}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Invitar Miembros */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base font-semibold text-foreground">{t('team.inviteMembers')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('team.inviteMembersDesc')}
              </p>
              
              <div className="space-y-4">
                {/* Input de invitación por email */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder={t('team.emailPlaceholder')}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full border-input focus:border-primary focus:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleInviteUser();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={handleInviteUser}
                    disabled={invitePending || !inviteEmail.trim() || !selectedOrgId}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                  >
                    {invitePending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('team.sending')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('team.invite')}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('team.orShareLink')}</span>
                  </div>
                </div>

                {/* Link de invitación - DESHABILITADO (próximamente) */}
                <div className="flex gap-3 opacity-60">
                  <Input
                    type="text"
                    value={t('team.linkPlaceholder')}
                    readOnly
                    disabled
                    className="flex-1 bg-muted border-input text-muted-foreground/70 cursor-not-allowed"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyInviteLink}
                    disabled
                    className="px-4 border-input cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground/70">
                      <Link2Off className="h-4 w-4" />
                      {t('team.comingSoon')}
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('team.linkFeatureDesc')}
                </p>
                
                {/* Invitaciones enviadas pendientes */}
                {sentInvitations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <h4 className="text-sm font-medium text-foreground/90 mb-3">{t('team.sentInvitations')}</h4>
                    <div className="space-y-2">
                      {sentInvitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-foreground">{inv.inviteeEmail}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('team.sentOn', { date: new Date(inv.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') })}
                              {inv.expiresAt && ` · ${t('team.expiresOn', { date: new Date(inv.expiresAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') })}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {t('team.cancelInvite')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Miembros del Equipo */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-base font-semibold text-foreground">{t('team.teamMembers')}</h3>
                </div>
                <span className="text-sm text-muted-foreground">
                  {loadingMembers ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('team.loadingMembers')}
                    </span>
                  ) : (
                    t('team.membersCount', { count: teamMembers.length })
                  )}
                </span>
              </div>
              
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">{t('team.noMembers')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {teamMembers.map((member) => (
                    <div key={member.userId} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-muted -mx-2 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {(member.name || member.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        
                        {/* Info */}
                        <div>
                          <p className="font-medium text-foreground">
                            {member.name || t('team.noName')}
                            {member.isCurrentUser && (
                              <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t('team.youLabel')}</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.email || t('team.noEmail')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* ✅ Dropdown de rol para owners y admins, con restricciones jerárquicas */}
                        {/* Owner: puede cambiar rol de admin/member | Admin: solo puede cambiar rol de member */}
                        {(selectedOrg?.role === 'owner' || (selectedOrg?.role === 'admin' && member.role === 'member')) && !member.isCurrentUser && member.role !== 'owner' ? (
                          <div className="flex items-center gap-2">
                            <Select 
                              value={member.role} 
                              onValueChange={(newRole) => handleRoleChange(
                                member.id, 
                                member.name || member.email, 
                                member.role, 
                                newRole
                              )}
                              disabled={changingRoleForMember === member.id}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs border-input hover:border-primary transition-colors">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span>{t('notifications.roleMember')}</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-blue-500" />
                                    <span>{t('notifications.roleAdmin')}</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {changingRoleForMember === member.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                        ) : (
                          getRoleBadge(member.role)
                        )}
                        <span className="text-xs text-muted-foreground/70">
                          {t('team.memberSince', { date: new Date(member.joinedAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', year: 'numeric' }) })}
                        </span>
                        
                        {/* ✅ Botón de eliminar miembro - visible según jerarquía */}
                        {canRemoveMember(member.role, member.isCurrentUser) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id, member.name || member.email || 'Usuario')}
                            disabled={removingMember === member.id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('team.removeMember')}
                          >
                            {removingMember === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nota sobre funcionalidad */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                  {t('team.removeHint')}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 ml-4">
                  {t('team.removeDisclaimer')}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">{t('audit.title')}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('audit.description')}
            </p>
            
            {loadingAuditLogs ? (
              <p className="text-sm text-muted-foreground">{t('audit.loading')}</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('audit.empty')}</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground">{log.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')}
                        </p>
                        {log.actor && (
                          <p className="text-sm text-muted-foreground">Actor: {log.actor}</p>
                        )}
                        {log.tool && (
                          <p className="text-sm text-muted-foreground">Tool: {log.tool}</p>
                        )}
                      </div>
                      {log.severity && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          log.severity === 'error' || log.severity === 'critical'
                            ? 'bg-destructive/10 text-destructive'
                            : log.severity === 'warning'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {log.severity}
                        </span>
                      )}
                    </div>
                    {log.payload && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Payload:</p>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ✅ Dialog de confirmación para cambio de rol */}
      {roleChangeDialog && (
        <AlertDialog open={roleChangeDialog.open} onOpenChange={(open) => !open && setRoleChangeDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('team.changeRoleTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">{roleChangeDialog.memberName}</span>{' '}
                {t('team.changeRoleDesc', { name: '', fromRole: roleChangeDialog.currentRole, toRole: roleChangeDialog.newRole }).replace('{name}', '').trim()}
                {roleChangeDialog.newRole === 'admin' && (
                  <span className="block mt-2 text-primary">
                    ✓ {t('team.adminPermHint')}
                  </span>
                )}
                {roleChangeDialog.newRole === 'member' && (
                  <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                    ⚠ {t('team.memberPermHint')}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={changingRoleForMember !== null}>
                {tCommon('actions.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRoleChange}
                disabled={changingRoleForMember !== null}
                className="bg-primary hover:bg-primary/90 focus:ring-primary"
              >
                {changingRoleForMember ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('team.updating')}
                  </span>
                ) : (
                  t('team.confirmChange')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* ✅ Dialog de confirmación para eliminar miembro */}
      {removeMemberDialog && (
        <AlertDialog open={removeMemberDialog.open} onOpenChange={(open) => !open && setRemoveMemberDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('team.removeMemberTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('team.removeMemberDesc', { name: removeMemberDialog.memberName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removingMember !== null}>
                {tCommon('actions.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRemoveMember}
                disabled={removingMember !== null}
                className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
              >
                {removingMember ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('team.removing')}
                  </span>
                ) : (
                  t('team.removeMemberConfirm')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
