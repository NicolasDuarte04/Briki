import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "./actions";
import { AccountSettings } from "./AccountSettings";
import { DevAccountActions } from "./DevAccountActions";
import { decryptProfileFieldsBatch } from "@/lib/helpers/profileEncryption";

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

  // Desencriptar name, phone y address en UNA SOLA transacción (optimización)
  const decryptedFields = await decryptProfileFieldsBatch({
    name: user?.profile?.name ?? null,
    phone: user?.profile?.phone ?? null,
    address: user?.profile?.address ?? null,
  });
  
  const initialName = decryptedFields.name ?? "";
  const initialPhone = decryptedFields.phone ?? "";
  const initialAddress = decryptedFields.address ?? "";
  const locale = (user?.profile?.locale ?? "en") as "en" | "es";
  const email = user?.email ?? "";
  const notificationsProductUpdates = user?.profile?.notificationsProductUpdates ?? false;
  const notificationsPolicyAlerts = user?.profile?.notificationsPolicyAlerts ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
