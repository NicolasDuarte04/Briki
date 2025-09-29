import { type ShareChannel, type SharePayload } from "./types";

export async function sendViaWhatsApp(_payload: SharePayload) {
  return { ok: true } as const;
}

export async function sendViaEmail(_payload: SharePayload) {
  return { ok: true } as const;
}

