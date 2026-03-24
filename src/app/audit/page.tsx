"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

interface CWVField {
  percentile: number;
  category: string;
}

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  si: number | null;
  tti: number | null;
  tbt: number | null;
  cls: number | null;
  serverResponseTime: number | null;
  totalTransferSize: number | null;
  totalRequests: number | null;
  domElements: number | null;
}

interface DeviceResult {
  scores: { performance: number; seo: number };
  performanceMetrics: PerformanceMetrics;
  coreWebVitals: {
    lab: Record<string, number | null>;
    field: Record<string, CWVField | null> | null;
  };
  recommendations: { type: string; title: string; description: string }[];
}

interface SeoCheck {
  id: string;
  category: "basic" | "content" | "social" | "technical";
  title: string;
  description: string;
  passed: boolean;
  value?: string;
}

interface SeoAnalysis {
  score: number;
  checks: SeoCheck[];
}

interface DetectedTech {
  name: string;
  category: string;
}

interface AuditResult {
  url: string;
  timestamp: string;
  technologies: DetectedTech[];
  seo: SeoAnalysis;
  mobile: DeviceResult;
  desktop: DeviceResult;
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 90 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const bgColor =
    score >= 90 ? "bg-green-400/10" : score >= 50 ? "bg-yellow-400/10" : "bg-red-400/10";
  const strokeColor =
    score >= 90 ? "stroke-green-400" : score >= 50 ? "stroke-yellow-400" : "stroke-red-400";

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative inline-flex items-center justify-center rounded-full ${bgColor} p-2`}>
        <svg width="130" height="130" viewBox="0 0 120 120" role="img" aria-label={`${label}: ${score} de 100`}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={strokeColor}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <span className={`absolute text-3xl font-bold ${color}`} aria-hidden="true">{score}</span>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusLabel(status: "good" | "medium" | "bad") {
  if (status === "good") return { text: "Bueno", color: "text-green-400" };
  if (status === "medium") return { text: "Necesita mejora", color: "text-yellow-400" };
  return { text: "Deficiente", color: "text-red-400" };
}

function threshold(value: number | null, good: number, mid: number): "good" | "medium" | "bad" {
  if (value === null) return "bad";
  if (value <= good) return "good";
  if (value <= mid) return "medium";
  return "bad";
}

function MetricsSection({ metrics }: { metrics: PerformanceMetrics }) {
  const items: { label: string; value: string; status: "good" | "medium" | "bad" }[] = [
    {
      label: "Primer Pintado con Contenido (FCP)",
      value: metrics.fcp != null ? `${metrics.fcp} s` : "—",
      status: threshold(metrics.fcp, 1.8, 3.0),
    },
    {
      label: "Mayor Pintado con Contenido (LCP)",
      value: metrics.lcp != null ? `${metrics.lcp} s` : "—",
      status: threshold(metrics.lcp, 2.5, 4.0),
    },
    {
      label: "Tiempo Total de Bloqueo (TBT)",
      value: metrics.tbt != null ? `${metrics.tbt} ms` : "—",
      status: threshold(metrics.tbt, 200, 600),
    },
    {
      label: "Cambio Acumulativo de Diseño (CLS)",
      value: metrics.cls != null ? `${metrics.cls}` : "—",
      status: threshold(metrics.cls, 0.1, 0.25),
    },
    {
      label: "Índice de Velocidad",
      value: metrics.si != null ? `${metrics.si} s` : "—",
      status: threshold(metrics.si, 3.4, 5.8),
    },
    {
      label: "Tiempo hasta Interactivo",
      value: metrics.tti != null ? `${metrics.tti} s` : "—",
      status: threshold(metrics.tti, 3.8, 7.3),
    },
    {
      label: "Respuesta del Servidor (TTFB)",
      value: metrics.serverResponseTime != null ? `${metrics.serverResponseTime} ms` : "—",
      status: threshold(metrics.serverResponseTime, 200, 600),
    },
    {
      label: "Peso Total de la Página",
      value: metrics.totalTransferSize != null ? formatBytes(metrics.totalTransferSize) : "—",
      status: threshold(metrics.totalTransferSize, 1_500_000, 3_000_000),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const sl = statusLabel(item.status);
        return (
          <Card key={item.label} className="bg-card/50">
            <CardContent className="p-4 flex flex-col h-full">
              <p className="text-xs text-muted-foreground min-h-[2.5rem]">{item.label}</p>
              <p className={`text-lg font-semibold ${sl.color} mt-auto`}>{item.value}</p>
              <p className={`text-xs ${sl.color}`}>{sl.text}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  "Framework": "Framework",
  "Framework JS": "Framework JS",
  "CMS": "CMS",
  "E-commerce": "E-commerce",
  "CSS": "CSS",
  "Servidor": "Servidor",
  "CDN": "CDN / Proxy",
  "Hosting": "Hosting",
  "Analytics": "Analytics",
  "Lenguaje": "Lenguaje / Runtime",
  "Librería JS": "Librería JS",
  "Iconos": "Recursos",
  "Fuentes": "Recursos",
  "Seguridad": "Seguridad",
  "Pagos": "Pagos",
  "Chat": "Chat / Soporte",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Framework": "border-blue-500/30 bg-blue-500/5 text-blue-400",
  "Framework JS": "border-blue-500/30 bg-blue-500/5 text-blue-400",
  "CMS": "border-purple-500/30 bg-purple-500/5 text-purple-400",
  "E-commerce": "border-pink-500/30 bg-pink-500/5 text-pink-400",
  "CSS": "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  "Servidor": "border-orange-500/30 bg-orange-500/5 text-orange-400",
  "CDN": "border-orange-500/30 bg-orange-500/5 text-orange-400",
  "Hosting": "border-green-500/30 bg-green-500/5 text-green-400",
  "Analytics": "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  "Lenguaje": "border-red-500/30 bg-red-500/5 text-red-400",
  "Librería JS": "border-indigo-500/30 bg-indigo-500/5 text-indigo-400",
  "Iconos": "border-teal-500/30 bg-teal-500/5 text-teal-400",
  "Fuentes": "border-teal-500/30 bg-teal-500/5 text-teal-400",
  "Seguridad": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "Pagos": "border-pink-500/30 bg-pink-500/5 text-pink-400",
  "Chat": "border-violet-500/30 bg-violet-500/5 text-violet-400",
};

function TechStackSection({ technologies }: { technologies: DetectedTech[] }) {
  // Group by display category
  const groups = new Map<string, DetectedTech[]>();
  for (const tech of technologies) {
    const displayCat = CATEGORY_LABELS[tech.category] ?? tech.category;
    if (!groups.has(displayCat)) groups.set(displayCat, []);
    groups.get(displayCat)!.push(tech);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Stack Tecnológico</CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {technologies.length} {technologies.length === 1 ? "tecnología" : "tecnologías"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(groups.entries()).map(([category, techs]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {techs.map((tech) => {
                  const colorClass = CATEGORY_COLORS[tech.category] ?? "border-border bg-card text-foreground";
                  return (
                    <span
                      key={tech.name}
                      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${colorClass}`}
                    >
                      {tech.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsList({
  recommendations,
}: {
  recommendations: DeviceResult["recommendations"];
}) {
  const perfRecs = recommendations.filter((r) => r.type === "performance");

  if (perfRecs.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin recomendaciones de rendimiento.</p>;
  }

  return (
    <div className="space-y-3">
      {perfRecs.map((rec, i) => (
        <Card key={i} className="bg-card/50">
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">{rec.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {rec.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const SEO_CATEGORY_LABELS: Record<string, string> = {
  basic: "Básico",
  content: "Contenido",
  social: "Redes Sociales",
  technical: "Técnico",
};

function SeoChecksSection({ checks }: { checks: SeoCheck[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", "basic", "content", "social", "technical"] as const;
  const filtered = categoryFilter === "all"
    ? checks
    : checks.filter((c) => c.category === categoryFilter);

  const passed = checks.filter((c) => c.passed).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-green-400 font-medium">{passed} aprobados</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-red-400 font-medium">{checks.length - passed} por mejorar</span>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const count = cat === "all" ? checks.length : checks.filter((c) => c.category === cat).length;
          return (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              className="cursor-pointer text-xs"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === "all" ? "Todos" : SEO_CATEGORY_LABELS[cat]}
              <span className={`ml-1.5 ${categoryFilter === cat ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Checks list */}
      <div className="space-y-2">
        {filtered.map((check) => (
          <div
            key={check.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              check.passed
                ? "border-green-500/20 bg-green-500/5"
                : "border-red-500/20 bg-red-500/5"
            }`}
          >
            <span className={`mt-0.5 shrink-0 text-sm ${check.passed ? "text-green-400" : "text-red-400"}`}>
              {check.passed ? "✓" : "✗"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{check.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
            </div>
            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
              {SEO_CATEGORY_LABELS[check.category]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

const LOADING_STEPS = [
  { label: "Conectando con el sitio", delay: 0 },
  { label: "Analizando rendimiento (móvil)", delay: 4000 },
  { label: "Analizando rendimiento (escritorio)", delay: 12000 },
  { label: "Evaluando SEO", delay: 22000 },
  { label: "Detectando tecnologías", delay: 32000 },
  { label: "Generando recomendaciones", delay: 42000 },
];

function LoadingSkeleton() {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);
      const step = LOADING_STEPS.findLastIndex((s) => ms >= s.delay);
      if (step >= 0) setActiveStep(step);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Slow logarithmic curve: fast at the start, slows down approaching 95%
  const percent = Math.min(Math.round(95 * (1 - Math.exp(-elapsed / 25000))), 95);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-10 py-8">
      {/* Progress ring */}
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r={radius}
            fill="none" strokeWidth="6"
            className="stroke-muted/20"
          />
          <circle
            cx="60" cy="60" r={radius}
            fill="none" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">{percent}%</span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold animate-pulse">
          {LOADING_STEPS[activeStep].label}...
        </p>
        <p className="text-sm text-muted-foreground">
          Esto puede tomar entre 30 y 60 segundos
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {LOADING_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors duration-500 ${
                i < activeStep
                  ? "bg-green-400"
                  : i === activeStep
                    ? "bg-primary animate-pulse"
                    : "bg-muted/30"
              }`}
            />
            <span
              className={`text-sm transition-colors duration-500 ${
                i <= activeStep ? "text-foreground" : "text-muted-foreground/50"
              }`}
            >
              {step.label}
            </span>
            {i < activeStep && (
              <span className="ml-auto text-xs text-green-400">Listo</span>
            )}
          </div>
        ))}
      </div>

      {/* Powered by */}
      <div className="border-t border-border pt-6 w-full max-w-sm">
        <p className="text-xs text-muted-foreground text-center mb-3">Datos obtenidos a través de</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { name: "Google Lighthouse", desc: "Rendimiento y métricas" },
            { name: "PageSpeed Insights", desc: "Scores y Core Web Vitals" },
            { name: "Chrome UX reports", desc: "Datos reales de usuarios" },
          ].map((tool) => (
            <span
              key={tool.name}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 py-1 text-[11px]"
              title={tool.desc}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span className="text-foreground/80">{tool.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditPageContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError("No se proporcionó una URL.");
      setLoading(false);
      return;
    }

    async function runAudit() {
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Error al auditar el sitio.");
          return;
        }

        setResult(data);

        // Persist scores for dashboard if this site is saved
        try {
          const sitesRaw = window.localStorage.getItem("audity-sites");
          if (sitesRaw) {
            const sites = JSON.parse(sitesRaw) as { id: string; url: string }[];
            const match = sites.find((s) => s.url === data.url);
            if (match) {
              const scoresRaw = window.localStorage.getItem("audity-audit-scores");
              const scores = scoresRaw ? JSON.parse(scoresRaw) : {};
              scores[match.id] = {
                performance: data.desktop.scores.performance,
                seo: data.desktop.scores.seo,
                timestamp: data.timestamp,
              };
              window.localStorage.setItem("audity-audit-scores", JSON.stringify(scores));
            }
          }
        } catch {
          // ignore localStorage errors
        }
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      } finally {
        setLoading(false);
      }
    }

    runAudit();
  }, [url]);

  return (
    <main className="min-h-screen">
      {/* Dashboard banner */}
      <div className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-center px-4 sm:px-8 h-10">
          <Link href="/dashboard" className="group flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
            <span>Monitoreá tus webs desde un solo lugar</span>
            <span className="text-primary font-medium group-hover:underline">Crea tu dashboard</span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-8 h-14">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">Auditoría</h1>
            {result && (
              <nav className="hidden sm:flex items-center gap-1">
                <a href="#seo" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50">
                  Análisis SEO
                </a>
                <a href="#recomendaciones" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50">
                  Recomendaciones
                </a>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            {url && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:block">{url}</p>
            )}
            <Link href="/">
              <Button variant="outline" size="sm" className="cursor-pointer !border-blue-500/50 hover:!border-blue-500/70">Nueva auditoría</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8">

        {/* Error */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5 mb-8">
            <CardContent className="p-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Results */}
        {result && (
          <>
          {/* Fuentes de datos - banner sutil */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
            <span>Datos obtenidos desde</span>
            {[
              { name: "Google Lighthouse", desc: "Rendimiento y métricas" },
              { name: "PageSpeed Insights", desc: "Scores y auditorías" },
              { name: "Chrome UX reports", desc: "Datos reales de usuarios" },
              { name: "Análisis propio", desc: "SEO y detección de tecnologías" },
            ].map((source, i, arr) => (
              <span key={source.name} className="group relative inline-flex items-center">
                <span className="text-foreground/70 font-medium cursor-default">{source.name}</span>
                {i < arr.length - 1 && <span className="ml-1.5">·</span>}
                {/* Tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {source.desc}
                </span>
              </span>
            ))}
          </div>

          <Tabs defaultValue="desktop">
            <TabsList className="mb-6">
              <TabsTrigger value="desktop" className="cursor-pointer">Desktop</TabsTrigger>
              <TabsTrigger value="mobile" className="cursor-pointer">Mobile</TabsTrigger>
            </TabsList>

            {(["mobile", "desktop"] as const).map((device) => (
              <TabsContent key={device} value={device} className="space-y-8">
                {/* Scores */}
                <div className="flex justify-center gap-12">
                  <ScoreRing
                    score={result[device].scores.performance}
                    label="Rendimiento"
                  />
                  <ScoreRing score={result[device].scores.seo} label="SEO" />
                </div>

                {/* Métricas + Sidebar */}
                <div className="flex gap-6 items-start">
                  <div className="flex-1 min-w-0 space-y-8">
                    {/* Métricas */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Métricas de Rendimiento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MetricsSection metrics={result[device].performanceMetrics} />
                      </CardContent>
                    </Card>

                    {/* SEO Checks */}
                    <Card id="seo">
                      <CardHeader>
                        <CardTitle className="text-lg">Análisis SEO</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SeoChecksSection checks={result.seo.checks} />
                      </CardContent>
                    </Card>

                    {/* Recommendations */}
                    <Card id="recomendaciones">
                      <CardHeader>
                        <CardTitle className="text-lg">Recomendaciones de Rendimiento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RecommendationsList
                          recommendations={result[device].recommendations}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sidebar - Tech Stack */}
                  {result.technologies.length > 0 && (
                    <aside className="hidden lg:block w-56 shrink-0">
                      <Card className="sticky top-8">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Stack Tecnológico</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {(() => {
                            const groups = new Map<string, DetectedTech[]>();
                            for (const tech of result.technologies) {
                              const cat = CATEGORY_LABELS[tech.category] ?? tech.category;
                              if (!groups.has(cat)) groups.set(cat, []);
                              groups.get(cat)!.push(tech);
                            }
                            return Array.from(groups.entries()).map(([category, techs]) => (
                              <div key={category} className="space-y-1.5">
                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
                                <div className="flex flex-wrap gap-1">
                                  {techs.map((tech) => {
                                    const colorClass = CATEGORY_COLORS[tech.category] ?? "border-border bg-card text-foreground";
                                    return (
                                      <span
                                        key={tech.name}
                                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${colorClass}`}
                                      >
                                        {tech.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()}
                        </CardContent>
                      </Card>
                    </aside>
                  )}
                </div>

                {/* Tech Stack mobile */}
                {result.technologies.length > 0 && (
                  <div className="lg:hidden">
                    <TechStackSection technologies={result.technologies} />
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Footer explicativo */}
          <div className="mt-12 border-t border-border pt-6 pb-4">
            <p className="text-[11px] text-muted-foreground/60 max-w-lg mx-auto text-center leading-relaxed">
              Los scores de rendimiento se obtienen de Google Lighthouse a través de la PageSpeed Insights API.
              Los datos de campo provienen del Chrome UX Report (CrUX) cuando están disponibles para el sitio analizado.
              La detección de tecnologías y los chequeos SEO adicionales son análisis propios.
            </p>
          </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AuditPageContent />
    </Suspense>
  );
}
