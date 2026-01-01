import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "./actions";
import { ProfileNav } from "./ProfileNav";
import { AccountSettings } from "./AccountSettings";
import { DevAccountActions } from "./DevAccountActions";
import { decryptProfilePhone, decryptProfileAddress, decryptProfileName } from "@/lib/helpers/profileEncryption";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();

  // If not authenticated, render a minimal message (no client routing changes)
  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      email: true,
      profile: { 
        select: { 
          name: true, 
          locale: true,
          phone: true, // Buffer encriptado (BYTEA)
          address: true, // Buffer encriptado (BYTEA)
          notificationsProductUpdates: true,
          notificationsPolicyAlerts: true
        } 
      } 
    },
  });

  // Desencriptar name, phone y address
  const initialName = user?.profile?.name 
    ? (await decryptProfileName(user.profile.name)) ?? ""
    : "";
  const initialPhone = user?.profile?.phone 
    ? (await decryptProfilePhone(user.profile.phone)) ?? ""
    : "";
  const initialAddress = user?.profile?.address 
    ? (await decryptProfileAddress(user.profile.address)) ?? ""
    : "";
  const locale = (user?.profile?.locale ?? "en") as "en" | "es";
  const email = user?.email ?? "";
  const notificationsProductUpdates = user?.profile?.notificationsProductUpdates ?? false;
  const notificationsPolicyAlerts = user?.profile?.notificationsPolicyAlerts ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-[rgb(21,26,30)]">
      <ProfileNav />
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <Suspense>
          <AccountSettings 
            initialName={initialName} 
            initialPhone={initialPhone}
            initialAddress={initialAddress}
            email={email} 
            locale={locale}
            notificationsProductUpdates={notificationsProductUpdates}
            notificationsPolicyAlerts={notificationsPolicyAlerts}
          />
        </Suspense>
        
        {/* Dev-only: Zona de peligro para eliminar cuenta */}
        <DevAccountActions userId={userId} />
      </div>
    </div>
  );
}
