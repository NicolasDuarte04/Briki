"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/app/[locale]/(auth)/actions";
import { useLocale } from "next-intl";

/**
 * UserDropdown component for authenticated user actions.
 * 
 * Displays:
 * - User avatar with initials fallback
 * - User email
 * - Link to profile settings
 * - Sign out action
 * 
 * Reuses the existing signOut server action from auth/actions.
 */
export function UserDropdown() {
  const { user, status, ready } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Show skeleton while loading OR while auth is not ready (prevents flash after redirect)
  if (status === "loading" || !ready) {
    return (
      <div className="flex items-center gap-2 p-1 pr-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-4 hidden sm:block" />
      </div>
    );
  }

  // Don't render if not authenticated (after loading completes)
  if (status !== "authenticated" || !user) {
    return null;
  }

  const userEmail = user.email || "";
  const userInitials = getInitials(userEmail);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await signOut();
      // The redirect will happen in the server action
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
      // Force a page reload as fallback
      window.location.href = "/";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menú de usuario"
        >
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage 
              src={user.user_metadata?.avatar_url} 
              alt={userEmail} 
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Mi cuenta</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/${locale}/profile`} className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/${locale}/profile`} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Configuración</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>{isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Extracts initials from an email address.
 * Takes the first letter of the local part and capitalizes it.
 * For emails like "john.doe@example.com", returns "JD".
 */
function getInitials(email: string): string {
  const localPart = email.split("@")[0] || "";
  const parts = localPart.split(/[._-]/);
  
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  return localPart.slice(0, 2).toUpperCase();
}

