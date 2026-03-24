import { NextRequest } from "next/server";
import { normalizeUrl } from "@/lib/normalize-url";

function extractDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  // Handle common two-part TLDs like co.uk, com.ar, etc.
  const twoPartTlds = ["co.uk", "com.au", "com.br", "com.ar", "co.nz", "co.jp", "co.kr", "com.mx", "org.uk", "net.au"];
  const lastTwo = parts.slice(-2).join(".");
  if (twoPartTlds.includes(lastTwo)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: unknown[];
  publicIds?: { type: string; identifier: string }[];
}

interface RdapResponse {
  events?: RdapEvent[];
  entities?: RdapEntity[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl = body.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return Response.json({ error: "Se requiere una URL." }, { status: 400 });
    }

    let url: string;
    try {
      url = normalizeUrl(rawUrl);
    } catch {
      return Response.json({ error: "URL inválida." }, { status: 400 });
    }

    const hostname = new URL(url).hostname;
    const domain = extractDomain(hostname);

    try {
      const res = await fetch(`https://rdap.org/domain/${domain}`, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/rdap+json" },
      });

      if (!res.ok) {
        return Response.json({
          expiresAt: null,
          daysRemaining: null,
          registrar: null,
        });
      }

      const data = (await res.json()) as RdapResponse;

      // Find expiration event
      let expiresAt: string | null = null;
      let daysRemaining: number | null = null;
      if (data.events) {
        const expirationEvent = data.events.find(
          (e) => e.eventAction === "expiration",
        );
        if (expirationEvent?.eventDate) {
          expiresAt = new Date(expirationEvent.eventDate).toISOString();
          daysRemaining = Math.floor(
            (new Date(expirationEvent.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
        }
      }

      // Find registrar
      let registrar: string | null = null;
      if (data.entities) {
        const registrarEntity = data.entities.find((e) =>
          e.roles?.includes("registrar"),
        );
        if (registrarEntity?.vcardArray) {
          const vcard = registrarEntity.vcardArray as unknown[][];
          if (Array.isArray(vcard[1])) {
            const fnEntry = vcard[1].find(
              (entry: unknown) => Array.isArray(entry) && entry[0] === "fn",
            );
            if (Array.isArray(fnEntry)) {
              registrar = String(fnEntry[3]);
            }
          }
        }
      }

      return Response.json({ expiresAt, daysRemaining, registrar });
    } catch {
      return Response.json({
        expiresAt: null,
        daysRemaining: null,
        registrar: null,
      });
    }
  } catch {
    return Response.json({ error: "Error al verificar dominio." }, { status: 500 });
  }
}
