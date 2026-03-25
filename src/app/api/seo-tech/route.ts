import { NextRequest } from "next/server";
import { normalizeUrl } from "@/lib/normalize-url";
import { detectTechnologies } from "@/lib/detect-technologies";
import { analyzeSeo } from "@/lib/seo-analyzer";

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

    const [technologies, seoAnalysis] = await Promise.all([
      detectTechnologies(url).catch(
        () => [] as Awaited<ReturnType<typeof detectTechnologies>>,
      ),
      analyzeSeo(url).catch((err) => ({
        score: 0,
        checks: [],
        error: err instanceof Error ? err.message : "Error al analizar SEO",
      })),
    ]);

    return Response.json({ url, technologies, seo: seoAnalysis });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al analizar el sitio.";
    return Response.json({ error: message }, { status: 500 });
  }
}
