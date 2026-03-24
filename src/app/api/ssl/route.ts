import { NextRequest } from "next/server";
import { normalizeUrl } from "@/lib/normalize-url";
import tls from "tls";

function checkSsl(hostname: string): Promise<{
  valid: boolean;
  issuer: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ valid: false, issuer: null, expiresAt: null, daysRemaining: null });
    }, 10000);

    try {
      const socket = tls.connect(
        { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
        () => {
          clearTimeout(timeout);
          try {
            const cert = socket.getPeerCertificate();
            socket.destroy();

            if (!cert || !cert.valid_to) {
              resolve({ valid: false, issuer: null, expiresAt: null, daysRemaining: null });
              return;
            }

            const expiresAt = new Date(cert.valid_to).toISOString();
            const daysRemaining = Math.floor(
              (new Date(cert.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            const rawIssuer = cert.issuer?.O || cert.issuer?.CN || null;
            const issuer = Array.isArray(rawIssuer) ? rawIssuer[0] : rawIssuer;
            const authorized = socket.authorized ?? false;

            resolve({
              valid: authorized || daysRemaining > 0,
              issuer,
              expiresAt,
              daysRemaining,
            });
          } catch {
            resolve({ valid: false, issuer: null, expiresAt: null, daysRemaining: null });
          }
        },
      );

      socket.on("error", () => {
        clearTimeout(timeout);
        resolve({ valid: false, issuer: null, expiresAt: null, daysRemaining: null });
      });
    } catch {
      clearTimeout(timeout);
      resolve({ valid: false, issuer: null, expiresAt: null, daysRemaining: null });
    }
  });
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
    const result = await checkSsl(hostname);

    return Response.json(result);
  } catch {
    return Response.json({ error: "Error al verificar SSL." }, { status: 500 });
  }
}
