'use client';

import { useState, useEffect, useRef, useActionState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateProfile, updateProfileDirect, updateNotificationSettings, requestPasswordReset, type FormState } from './actions';
import { toast } from 'sonner';
import { Building2, UserPlus, Users, Crown, Shield, User, ChevronRight, Mail, Copy, Check, Link2Off, Loader2, Bell, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { 
  getUserOrganizationsForUI, 
  switchOrganization, 
  getOrgMembers,
  getActiveOrganization,
  updateMemberRole,
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
  const [activeTab, setActiveTab] = useState<Tab>('personal');
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

  const getRoleIcon = (role: 'owner' | 'admin' | 'member') => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500 dark:text-blue-300" />;
      case 'member': return <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getRoleBadge = (role: 'owner' | 'admin' | 'member') => {
    const styles = {
      owner: 'bg-amber-100 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      admin: 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700',
      member: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
    };
    const labels = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };
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
    if (newLocale === currentLocale) return;
    
    try {
      const formData = new FormData();
      formData.append('field', 'locale');
      formData.append('locale', newLocale);
      
      // ✅ CORRECCIÓN: Usar updateProfileDirect para llamadas programáticas
      const result = await updateProfileDirect(formData);
      
      if (result.ok) {
        setCurrentLocale(newLocale);
        toast.success('Language updated successfully');
        // Redirect to apply the new locale
        window.location.href = `/${newLocale}/profile`;
      } else {
        // ✅ CORRECCIÓN: FormState usa 'message', no 'error'
        toast.error(result.message || 'Failed to update language');
      }
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error('Failed to update language');
    }
  };

  const tabs = [
    { id: 'personal' as Tab, label: 'Personal info', badge: 0 },
    { id: 'security' as Tab, label: 'Security', badge: 0 },
    { id: 'notifications' as Tab, label: 'Notifications', badge: pendingInvitationsCount },
    { id: 'team' as Tab, label: 'Dashboard de equipo', badge: 0 },
    // ✅ Solo mostrar pestaña de auditoría si el usuario es admin u owner
    ...(isAdmin ? [{ id: 'audit' as Tab, label: 'Auditoría (Admins)', badge: 0 }] : []),
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Account settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
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
                    ? 'text-gray-900 dark:text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</h3>
                  {!isEditingName ? (
                    <p className="text-base text-gray-900 dark:text-white">
                      {nameValue || 'Not set'}
                      {lastSavedField === 'name' && (
                        <span className="ml-2 text-sm text-green-600">Saved</span>
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
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <input type="hidden" name="field" value="name" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label="Save" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingName(false);
                            setNameValue(initialName);
                          }}
                        >
                          Cancel
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
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Email Card (read-only) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</h3>
                  <p className="text-base text-gray-900 dark:text-white">{email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</h3>
                  {!isEditingPhone ? (
                    <p className="text-base text-gray-900 dark:text-white">
                      {phoneValue || 'Not set'}
                      {lastSavedField === 'phone' && (
                        <span className="ml-2 text-sm text-green-600">Saved</span>
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
                        placeholder="Enter your phone number"
                        autoFocus
                        maxLength={40}
                      />
                      <input type="hidden" name="field" value="phone" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label="Save" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingPhone(false);
                            setPhoneValue(initialPhone);
                          }}
                        >
                          Cancel
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
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</h3>
                  {!isEditingAddress ? (
                    <p className="text-base text-gray-900 dark:text-white">
                      {addressValue || 'Not set'}
                      {lastSavedField === 'address' && (
                        <span className="ml-2 text-sm text-green-600">Saved</span>
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
                        placeholder="Enter your address"
                        autoFocus
                        maxLength={200}
                      />
                      <input type="hidden" name="field" value="address" />
                      <input type="hidden" name="locale" value={locale} />
                      <div className="flex gap-2">
                        <SubmitButton label="Save" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingAddress(false);
                            setAddressValue(initialAddress);
                          }}
                        >
                          Cancel
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
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Language Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Choose your preferred language</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLocaleChange('en')}
                      className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                        locale === 'en'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      English ✓
                    </button>
                    <button
                      onClick={() => handleLocaleChange('es')}
                      className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                        locale === 'es'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      Español
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Password</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Reset your password by receiving a secure reset link via email. You&apos;ll be able to create a new password after clicking the link.
            </p>
            <Button 
              onClick={handlePasswordReset}
              disabled={passwordResetStatus === 'sending'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {passwordResetStatus === 'sending' ? 'Sending...' : 'Send password reset email'}
            </Button>
            {passwordResetStatus === 'success' && (
              <p className="text-sm text-green-600 mt-2">✓ Reset email sent successfully</p>
            )}
            {passwordResetStatus === 'error' && (
              <p className="text-sm text-red-600 mt-2">Failed to send reset email</p>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Invitaciones pendientes */}
            {pendingInvitations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Invitaciones pendientes</h3>
                  <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div 
                      key={invitation.id} 
                      className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            Invitación de <span className="text-blue-600 dark:text-blue-400">{invitation.organizationName}</span>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {invitation.inviterName || invitation.inviterEmail || 'Un miembro'} te ha invitado a unirte como{' '}
                            <span className="font-medium">
                              {invitation.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </span>
                          </p>
                          {invitation.message && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{invitation.message}"</p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Recibida {new Date(invitation.createdAt).toLocaleDateString('es-ES', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                            {invitation.expiresAt && (
                              <> · Expira {new Date(invitation.expiresAt).toLocaleDateString('es-ES', { 
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
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            {respondingToInvitation === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Rechazar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRespondToInvitation(invitation.id, true)}
                            disabled={respondingToInvitation === invitation.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {respondingToInvitation === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Aceptar
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
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="text-center py-4">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No tienes invitaciones pendientes</p>
                </div>
              </div>
            )}
            
            {loadingInvitations && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Cargando invitaciones...</span>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Product updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Receive emails about new features and improvements</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={productUpdatesChecked}
                  onChange={(e) => handleNotificationToggle('productUpdates', e.target.checked)}
                  disabled={notificationsPending}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Policy alerts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get notified about important policy changes</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={policyAlertsChecked}
                  onChange={(e) => handleNotificationToggle('policyAlerts', e.target.checked)}
                  disabled={notificationsPending}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Selector de Organización */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Organización activa</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecciona la organización con la que deseas trabajar. Todos los casos, clientes y análisis se filtrarán según esta selección.
              </p>
              
              {loadingOrgs ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Cargando organizaciones...</span>
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">No tienes organizaciones. Contacta al administrador.</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Select 
                    value={selectedOrgId} 
                    onValueChange={handleOrgChange}
                    disabled={switchingOrg}
                  >
                    <SelectTrigger className="w-full max-w-md bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Selecciona una organización" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{org.name}</span>
                            <span className="text-xs text-gray-500">({org.memberCount} miembros)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {switchingOrg && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  
                  {selectedOrg && !switchingOrg && (
                    <div className="flex items-center gap-2">
                      {getRoleBadge(selectedOrg.role)}
                    </div>
                  )}
                </div>
              )}

              {selectedOrg && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">Trabajando en:</span> {selectedOrg.name}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Slug: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{selectedOrg.slug}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Invitar Miembros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Invitar miembros</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Invita a nuevos usuarios a unirse a tu organización por email.
              </p>
              
              <div className="space-y-4">
                {/* Input de invitación por email */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Email del usuario (ej: usuario@email.com)"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {invitePending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Invitar
                      </span>
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">o comparte el link</span>
                  </div>
                </div>

                {/* Link de invitación - DESHABILITADO (próximamente) */}
                <div className="flex gap-3 opacity-60">
                  <Input
                    type="text"
                    value="Link de invitación (próximamente)"
                    readOnly
                    disabled
                    className="flex-1 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyInviteLink}
                    disabled
                    className="px-4 border-gray-300 cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2 text-gray-400">
                      <Link2Off className="h-4 w-4" />
                      Próximamente
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  La funcionalidad de link compartido estará disponible próximamente
                </p>
                
                {/* Invitaciones enviadas pendientes */}
                {sentInvitations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Invitaciones enviadas pendientes</h4>
                    <div className="space-y-2">
                      {sentInvitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-muted dark:bg-gray-700 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-foreground dark:text-white">{inv.inviteeEmail}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Enviada {new Date(inv.createdAt).toLocaleDateString('es-ES')}
                              {inv.expiresAt && ` · Expira ${new Date(inv.expiresAt).toLocaleDateString('es-ES')}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Miembros del Equipo */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Miembros del equipo</h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {loadingMembers ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Cargando...
                    </span>
                  ) : (
                    `${teamMembers.length} miembros`
                  )}
                </span>
              </div>
              
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">No hay miembros en esta organización</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {teamMembers.map((member) => (
                    <div key={member.userId} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-muted dark:hover:bg-gray-700 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {(member.name || member.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        
                        {/* Info */}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.name || 'Usuario sin nombre'}
                            {member.isCurrentUser && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Tú</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{member.email || 'Email no disponible'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* ✅ Dropdown de rol SOLO para owners, SOLO para miembros que no sean ellos mismos, y que no sean owners */}
                        {selectedOrg?.role === 'owner' && !member.isCurrentUser && member.role !== 'owner' ? (
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
                              <SelectTrigger className="w-32 h-8 text-xs border-gray-300 hover:border-blue-500 transition-colors">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-gray-500" />
                                    <span>Member</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-blue-500" />
                                    <span>Admin</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {changingRoleForMember === member.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            )}
                          </div>
                        ) : (
                          getRoleBadge(member.role)
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Desde {new Date(member.joinedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nota sobre funcionalidad */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 dark:bg-green-500"></span>
                  Los propietarios pueden cambiar roles entre Admin y Member
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-4">
                  La eliminación de miembros estará disponible próximamente
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Audit Log</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Historial de auditoría del sistema. Solo visible para administradores y propietarios.
            </p>
            
            {loadingAuditLogs ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando registros de auditoría...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay registros de auditoría disponibles.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-muted dark:hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground dark:text-white">{log.action}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                        {log.actor && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Actor: {log.actor}</p>
                        )}
                        {log.tool && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Tool: {log.tool}</p>
                        )}
                      </div>
                      {log.severity && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          log.severity === 'error' || log.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : log.severity === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {log.severity}
                        </span>
                      )}
                    </div>
                    {log.payload && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Payload:</p>
                        <pre className="text-xs bg-muted dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
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
              <AlertDialogTitle>¿Cambiar rol de miembro?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">{roleChangeDialog.memberName}</span> pasará de{' '}
                <span className="font-semibold text-gray-700">{roleChangeDialog.currentRole}</span> a{' '}
                <span className="font-semibold text-gray-700">{roleChangeDialog.newRole}</span>.
                {roleChangeDialog.newRole === 'admin' && (
                  <span className="block mt-2 text-blue-600">
                    ✓ Tendrá permisos de administrador en la organización.
                  </span>
                )}
                {roleChangeDialog.newRole === 'member' && (
                  <span className="block mt-2 text-yellow-600">
                    ⚠ Perderá los permisos de administrador.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={changingRoleForMember !== null}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRoleChange}
                disabled={changingRoleForMember !== null}
                className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
              >
                {changingRoleForMember ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  'Confirmar cambio'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
