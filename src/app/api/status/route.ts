import { NextRequest } from "next/server";
import { normalizeUrl } from "@/lib/normalize-url";

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

    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      const responseTimeMs = Date.now() - start;

      return Response.json({
        isOnline: true,
        responseTimeMs,
        statusCode: res.status,
      });
    } catch {
      return Response.json({
        isOnline: false,
        responseTimeMs: null,
        statusCode: null,
      });
    }
  } catch {
    return Response.json({ error: "Error al verificar el estado." }, { status: 500 });
  }
}
