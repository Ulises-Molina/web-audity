/**
 * PageSpeed Insights client-side fetcher and result parser.
 * Runs in the browser to avoid Vercel serverless timeout limits.
 */

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

export async function fetchPageSpeed(
  url: string,
  strategy: "mobile" | "desktop",
  apiKey: string,
): Promise<PageSpeedResult> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
    locale: "es",
    key: apiKey,
  });
  params.append("category", "seo");

  const res = await fetch(`${PAGESPEED_API}?${params}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message ||
        `PageSpeed API error: ${res.status}`,
    );
  }

  const data = (await res.json()) as PageSpeedResult;

  const lr = data.lighthouseResult as Record<string, unknown> | undefined;
  if (lr?.runtimeError) {
    const err = lr.runtimeError as { message?: string; code?: string };
    throw new Error(
      `Lighthouse no pudo analizar el sitio (${strategy}): ${err.message || err.code || "error desconocido"}`,
    );
  }

  if (
    !data.lighthouseResult?.categories?.performance?.score &&
    data.lighthouseResult?.categories?.performance?.score !== 0
  ) {
    throw new Error(
      `Lighthouse no devolvió score de rendimiento (${strategy}).`,
    );
  }

  return data;
}

export function extractCoreWebVitals(result: PageSpeedResult) {
  const audits = result.lighthouseResult.audits;
  const fieldMetrics = result.loadingExperience?.metrics;

  return {
    lab: {
      lcp: audits["largest-contentful-paint"]?.score ?? null,
      fid: audits["max-potential-fid"]?.score ?? null,
      cls: audits["cumulative-layout-shift"]?.score ?? null,
      fcp: audits["first-contentful-paint"]?.score ?? null,
      si: audits["speed-index"]?.score ?? null,
      tbt: audits["total-blocking-time"]?.score ?? null,
      tti: audits["interactive"]?.score ?? null,
    },
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

export function extractPerformanceMetrics(result: PageSpeedResult) {
  const audits = result.lighthouseResult.audits;

  function ms(key: string): number | null {
    const v = audits[key]?.numericValue;
    return v != null ? Math.round(v) : null;
  }

  function seconds(key: string): number | null {
    const v = audits[key]?.numericValue;
    return v != null ? +(v / 1000).toFixed(1) : null;
  }

  let totalTransferSize: number | null = null;
  let totalRequests: number | null = null;
  const networkAudit = audits["network-requests"];
  if (networkAudit?.details?.items) {
    const items = networkAudit.details.items;
    totalRequests = items.length;
    totalTransferSize = items.reduce(
      (sum: number, item: Record<string, unknown>) => {
        return sum + ((item.transferSize as number) || 0);
      },
      0,
    );
  }

  const domSize = audits["dom-size"]?.numericValue
    ? Math.round(audits["dom-size"].numericValue)
    : null;

  return {
    fcp: seconds("first-contentful-paint"),
    lcp: seconds("largest-contentful-paint"),
    si: seconds("speed-index"),
    tti: seconds("interactive"),
    tbt: ms("total-blocking-time"),
    cls:
      audits["cumulative-layout-shift"]?.numericValue != null
        ? +audits["cumulative-layout-shift"].numericValue.toFixed(3)
        : null,
    serverResponseTime: ms("server-response-time"),
    totalTransferSize,
    totalRequests,
    domElements: domSize,
  };
}

export function extractRecommendations(result: PageSpeedResult) {
  const audits = result.lighthouseResult.audits;
  const recommendations: {
    type: "performance" | "seo";
    title: string;
    description: string;
  }[] = [];

  for (const [, audit] of Object.entries(audits)) {
    if (
      audit.score !== null &&
      audit.score < 0.9 &&
      audit.title &&
      audit.description
    ) {
      const type = audit.description.toLowerCase().includes("seo")
        ? "seo"
        : "performance";
      recommendations.push({
        type,
        title: audit.title,
        description: audit.description.replace(/\[.*?\]\(.*?\)/g, "").trim(),
      });
    }
  }

  return recommendations.slice(0, 20);
}

export function extractScores(result: PageSpeedResult) {
  return {
    performance: Math.round(
      result.lighthouseResult.categories.performance.score * 100,
    ),
    seo: Math.round(
      result.lighthouseResult.categories.seo.score * 100,
    ),
  };
}
