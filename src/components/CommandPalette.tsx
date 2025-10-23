"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUI } from "@/lib/ui/state";
import { 
  parseLocaleFromPath, 
  pathForNewEntity,
  pathForPolicy,
  pathForProposal,
  type Locale 
} from "@/lib/routes/workspace";
import {
  FileText,
  Scale,
  FileSignature,
  UserPlus,
  MessageSquare,
  Clock,
  FileBox,
  FileCheck2,
} from "lucide-react";

// Lazy load PdfUploader to reduce initial bundle size
const PdfUploader = dynamic(
  () => import("@/components/Upload/PdfUploader").then((mod) => ({ default: mod.PdfUploader })),
  { ssr: false }
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RecentItem {
  id: string;
  type: "policy" | "proposal";
  clientName: string;
  status: string;
  updatedAt: string;
}

interface CommandAction {
  id: string;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  onSelect: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CommandPalette - Power user command interface with Cmd/Ctrl-K
 * 
 * Features:
 * - Global Cmd/Ctrl-K shortcut
 * - Quick actions (Analizar PDF, Nueva comparación, etc.)
 * - Lazy-loaded recent items
 * - Full keyboard navigation
 * - Accessible with ARIA labels
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [recents, setRecents] = React.useState<RecentItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [orgId, setOrgId] = React.useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const locale = parseLocaleFromPath(pathname) as Locale;
  const toggleRight = useUI((s) => s.toggleRight);

  // ============================================================================
  // KEYBOARD SHORTCUT HANDLER
  // ============================================================================

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    // Also listen for legacy briki:cmdk event
    function handleCustomEvent() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("briki:cmdk", handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("briki:cmdk", handleCustomEvent as EventListener);
    };
  }, []);

  // ============================================================================
  // LAZY LOAD RECENTS AND ORG DATA ON OPEN
  // ============================================================================

  React.useEffect(() => {
    if (!open) return;

    async function fetchData() {
      try {
        // Fetch orgId if not already loaded
        if (!orgId) {
          const userResponse = await fetch("/api/auth/me");
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.orgId) {
              setOrgId(userData.orgId);
            }
          }
        }

        // Fetch recents if not already loaded
        if (recents.length === 0) {
          setLoading(true);
          const response = await fetch("/api/workspace/recents");
          if (response.ok) {
            const data = await response.json();
            
            // Combine policies and proposals into single recents list
            const combined: RecentItem[] = [
              ...data.policies.map((p: any) => ({
                id: p.id,
                type: "policy" as const,
                clientName: p.clientName,
                status: p.status,
                updatedAt: p.updatedAt,
              })),
              ...data.proposals.map((p: any) => ({
                id: p.id,
                type: "proposal" as const,
                clientName: p.clientName,
                status: p.status,
                updatedAt: p.updatedAt,
              })),
            ];

            // Sort by updated date
            combined.sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            setRecents(combined.slice(0, 8)); // Limit to 8 most recent
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, recents.length, orgId]);

  // ============================================================================
  // ACTION DEFINITIONS
  // ============================================================================

  const actions: CommandAction[] = React.useMemo(
    () => [
      {
        id: "analyze-pdf",
        label: "Analizar PDF",
        icon: FileText,
        keywords: ["analizar", "pdf", "póliza", "upload", "subir"],
        onSelect: () => {
          setOpen(false);
          setUploadDialogOpen(true);
        },
      },
      {
        id: "new-comparison",
        label: "Nueva comparación",
        icon: Scale,
        keywords: ["comparación", "comparar", "pólizas", "nuevo"],
        onSelect: () => {
          setOpen(false);
          router.push(`${pathForNewEntity('case', locale)}?kind=comparison`);
        },
      },
      {
        id: "new-proposal",
        label: "Crear propuesta",
        icon: FileSignature,
        keywords: ["propuesta", "crear", "nuevo"],
        onSelect: () => {
          setOpen(false);
          router.push(`${pathForNewEntity('case', locale)}?kind=proposal`);
        },
      },
      {
        id: "new-client",
        label: "Nuevo cliente",
        icon: UserPlus,
        keywords: ["cliente", "nuevo", "añadir", "crear"],
        onSelect: () => {
          setOpen(false);
          router.push(pathForNewEntity('client', locale));
        },
      },
      {
        id: "open-agent",
        label: "Abrir Agente",
        icon: MessageSquare,
        keywords: ["agente", "chat", "asistente", "ayuda"],
        onSelect: () => {
          setOpen(false);
          toggleRight();
        },
      },
    ],
    [locale, router, toggleRight]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRecentSelect = (item: RecentItem) => {
    setOpen(false);
    const path =
      item.type === "policy"
        ? pathForPolicy(item.id, locale)
        : pathForProposal(item.id, locale);
    router.push(path);
  };

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    router.refresh();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="p-0 overflow-hidden max-w-2xl rounded-xl border-0 shadow-2xl"
          aria-label="Paleta de comandos"
        >
          <VisuallyHidden asChild>
            <DialogTitle>Paleta de comandos</DialogTitle>
          </VisuallyHidden>
          <VisuallyHidden asChild>
            <DialogDescription>
              Acceso rápido a acciones y elementos recientes
            </DialogDescription>
          </VisuallyHidden>

          <Command className="rounded-xl border-0" shouldFilter>
            <CommandInput
              placeholder="Buscar acciones o recientes..."
              className="h-12 text-base border-b"
              aria-label="Buscar en paleta de comandos"
            />
            <CommandList className="max-h-[500px] overflow-y-auto p-2">
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>

              {/* Quick Actions Group */}
              <CommandGroup heading="Acciones rápidas">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem
                      key={action.id}
                      keywords={action.keywords}
                      onSelect={action.onSelect}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors aria-selected:bg-accent"
                      aria-label={action.label}
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="font-medium">{action.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Recents Group */}
              {recents.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recientes">
                    {recents.map((item) => {
                      const Icon = item.type === "policy" ? FileCheck2 : FileBox;
                      return (
                        <CommandItem
                          key={item.id}
                          value={`${item.clientName} ${item.type}`}
                          onSelect={() => handleRecentSelect(item)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors aria-selected:bg-accent"
                          aria-label={`${item.clientName} - ${item.type === "policy" ? "Póliza" : "Propuesta"}`}
                        >
                          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type === "policy" ? "Póliza" : "Propuesta"} • {item.status}
                            </p>
                          </div>
                          <Clock className="size-3 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {loading && (
                <CommandGroup heading="Recientes">
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Cargando recientes...
                  </div>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* PDF Upload Dialog */}
      {uploadDialogOpen && (
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-2xl" aria-describedby="upload-description">
            <DialogTitle>Analizar PDF de póliza</DialogTitle>
            <p id="upload-description" className="text-sm text-muted-foreground mb-4">
              Sube un archivo PDF para analizar la póliza y extraer información relevante.
            </p>
            {orgId ? (
              <PdfUploader orgId={orgId} onUploadComplete={handleUploadComplete} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default CommandPalette;


