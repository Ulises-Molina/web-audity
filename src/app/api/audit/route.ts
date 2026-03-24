import { NextRequest } from "next/server";
import { normalizeUrl } from "@/lib/normalize-url";
import { detectTechnologies } from "@/lib/detect-technologies";
import { analyzeSeo } from "@/lib/seo-analyzer";

// Allow up to 120s on Vercel (default is 10s on hobby, 60s on pro)
export const maxDuration = 120;

const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PageSpeedAudit {
  score: number | null;
  title: string;
  description: string;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
  details?: {
    type?: string;
    items?: Array<Record<string, unknown>>;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  };
}

interface PageSpeedResult {
  lighthouseResult: {
    categories: {
      performance: { score: number };
      seo: { score: number };
    };
    audits: Record<string, PageSpeedAudit>;
  };
  loadingExperience?: {
    metrics?: Record<
      string,
      {
        percentile: number;
        category: string;
      }
    >;
  };
}

async function fetchPageSpeed(url: string, strategy: "mobile" | "desktop"): Promise<PageSpeedResult> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
    locale: "es",
    key: process.env.PAGESPEED_API_KEY || "",
  });
  // Agregar segunda categoría
  params.append("category", "seo");

  const res = await fetch(`${PAGESPEED_API}?${params}`, {
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message || `PageSpeed API error: ${res.status}`
    );
  }

  const data = await res.json() as PageSpeedResult;

  // Lighthouse can return 200 but with a runtimeError (e.g. DNS failure, timeout)
  const lr = data.lighthouseResult as Record<string, unknown> | undefined;
  if (lr?.runtimeError) {
    const err = lr.runtimeError as { message?: string; code?: string };
    throw new Error(
      `Lighthouse no pudo analizar el sitio (${strategy}): ${err.message || err.code || "error desconocido"}`
    );
  }

  // Validate that scores exist
  if (!data.lighthouseResult?.categories?.performance?.score && data.lighthouseResult?.categories?.performance?.score !== 0) {
    throw new Error(`Lighthouse no devolvió score de rendimiento (${strategy}).`);
  }

  return data;
}

function extractCoreWebVitals(result: PageSpeedResult) {
  const audits = result.lighthouseResult.audits;
  const fieldMetrics = result.loadingExperience?.metrics;

  return {
    // Datos de laboratorio (Lighthouse)
    lab: {
      lcp: audits["largest-contentful-paint"]?.score ?? null,
      fid: audits["max-potential-fid"]?.score ?? null,
      cls: audits["cumulative-layout-shift"]?.score ?? null,
      fcp: audits["first-contentful-paint"]?.score ?? null,
      si: audits["speed-index"]?.score ?? null,
      tbt: audits["total-blocking-time"]?.score ?? null,
      tti: audits["interactive"]?.score ?? null,
    },
    // Datos reales (CrUX) si existen
    field: fieldMetrics
      ? {
          lcp: fieldMetrics["LARGEST_CONTENTFUL_PAINT_MS"] ?? null,
          fid: fieldMetrics["FIRST_INPUT_DELAY_MS"] ?? null,
          cls: fieldMetrics["CUMULATIVE_LAYOUT_SHIFT_SCORE"] ?? null,
          fcp: fieldMetrics["FIRST_CONTENTFUL_PAINT_MS"] ?? null,
          inp: fieldMetrics["INTERACTION_TO_NEXT_PAINT"] ?? null,
          ttfb: fieldMetrics["EXPERIMENTAL_TIME_TO_FIRST_BYTE"] ?? null,
        }
      : null,
  };
}

function extractPerformanceMetrics(result: PageSpeedResult) {
  const audits = result.lighthouseResult.audits;

  function ms(key: string): number | null {
    const v = audits[key]?.numericValue;
    return v != null ? Math.round(v) : null;
  }

  function seconds(key: string): number | null {
    const v = audits[key]?.numericValue;
    return v != null ? +(v / 1000).toFixed(1) : null;
  }


  // Extract total transfer size and request count from network-requests audit
  let totalTransferSize: number | null = null;
  let totalRequests: number | null = null;
  const networkAudit = audits["network-requests"];
  if (networkAudit?.details?.items) {
    const items = networkAudit.details.items;
    totalRequests = items.length;
    totalTransferSize = items.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + ((item.transferSize as number) || 0);
    }, 0);
  }

  // DOM size
  const domSize = audits["dom-size"]?.numericValue
    ? Math.round(audits["dom-size"].numericValue)
    : null;

  return {
    // Tiempos clave (en segundos para mostrar)
    fcp: seconds("first-contentful-paint"),
    lcp: seconds("largest-contentful-paint"),
    si: seconds("speed-index"),
    tti: seconds("interactive"),
    tbt: ms("total-blocking-time"),
    cls: audits["cumulative-layout-shift"]?.numericValue != null
      ? +audits["cumulative-layout-shift"].numericValue.toFixed(3)
      : null,
    // Tiempo de respuesta del servidor
    serverResponseTime: ms("server-response-time"),
    // Peso y requests
    totalTransferSize,
    totalRequests,
    // DOM
    domElements: domSize,
  };
}

function extractRecommendations(result: PageSpeedResult) {
  const audits = result.lighthouseResult.audits;
  const recommendations: { type: "performance" | "seo"; title: string; description: string }[] = [];

  for (const [, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 0.9 && audit.title && audit.description) {
      const type = audit.description.toLowerCase().includes("seo") ? "seo" : "performance";
      recommendations.push({
        type,
        title: audit.title,
        description: audit.description.replace(/\[.*?\]\(.*?\)/g, "").trim(),
      });
    }
  }

  return recommendations.slice(0, 20);
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

    if (!process.env.PAGESPEED_API_KEY) {
      return Response.json({ error: "API key de PageSpeed no configurada." }, { status: 500 });
    }

    // PageSpeed es crítico — si falla, la auditoría falla.
    // Tecnologías y SEO propio son best-effort.
    const [mobileResult, desktopResult, technologies, seoAnalysis] = await Promise.all([
      fetchPageSpeed(url, "mobile"),
      fetchPageSpeed(url, "desktop"),
      detectTechnologies(url).catch(() => [] as Awaited<ReturnType<typeof detectTechnologies>>),
      analyzeSeo(url).catch((err) => ({
        score: 0,
        checks: [],
        error: err instanceof Error ? err.message : "Error al analizar SEO",
      } as Awaited<ReturnType<typeof analyzeSeo>> & { error?: string })),
    ]);

    const response = {
      url,
      timestamp: new Date().toISOString(),
      technologies,
      seo: seoAnalysis,
      mobile: {
        scores: {
          performance: Math.round(mobileResult.lighthouseResult.categories.performance.score * 100),
          seo: seoAnalysis.score,
        },
        performanceMetrics: extractPerformanceMetrics(mobileResult),
        coreWebVitals: extractCoreWebVitals(mobileResult),
        recommendations: extractRecommendations(mobileResult),
      },
      desktop: {
        scores: {
          performance: Math.round(desktopResult.lighthouseResult.categories.performance.score * 100),
          seo: seoAnalysis.score,
        },
        performanceMetrics: extractPerformanceMetrics(desktopResult),
        coreWebVitals: extractCoreWebVitals(desktopResult),
        recommendations: extractRecommendations(desktopResult),
      },
    };

    return Response.json(response);
  } catch (error) {
    let message = "Error desconocido al auditar el sitio.";
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        message = "La auditoría tardó demasiado. El sitio puede estar lento o inaccesible.";
      } else {
        message = error.message;
      }
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
