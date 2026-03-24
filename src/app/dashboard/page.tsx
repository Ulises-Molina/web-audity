"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/lib/use-local-storage";
import {
  Globe,
  RefreshCw,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  CircleDot,
  CircleOff,
  ArrowRight,
  Plus,
  LayoutDashboard,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StoredSite {
  id: string;
  url: string;
  addedAt: string;
}

interface SiteStatus {
  isOnline: boolean;
  responseTimeMs: number | null;
  statusCode: number | null;
}

interface SslStatus {
  valid: boolean;
  issuer: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}

interface DomainStatus {
  expiresAt: string | null;
  daysRemaining: number | null;
  registrar: string | null;
}

interface ResponseTimeEntry {
  timestamp: string;
  ms: number;
}

interface LastAuditScores {
  performance: number;
  seo: number;
  timestamp: string;
}

const MAX_RESPONSE_HISTORY = 20;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  Favicon — fetched via our own API proxy                            */
/* ------------------------------------------------------------------ */

function SiteFavicon({ url }: { url: string }) {
  const hostname = hostnameFromUrl(url);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="h-6 w-6 rounded bg-muted/30 flex items-center justify-center shrink-0">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={`/api/favicon?domain=${encodeURIComponent(hostname)}`}
      alt=""
      width={24}
      height={24}
      className="h-6 w-6 rounded shrink-0 object-contain"
      onError={() => setErrored(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Shimmer skeleton                                                   */
/* ------------------------------------------------------------------ */

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-muted/15 ${className ?? ""}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
    </div>
  );
}

function SkeletonCell({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
      <Shimmer className="h-4 w-16" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cell renderers                                                     */
/* ------------------------------------------------------------------ */

function StatusCell({ status, loading }: { status?: SiteStatus; loading: boolean }) {
  if (loading) {
    return <SkeletonCell icon={CircleDot} />;
  }
  if (!status) {
    return <span className="text-xs text-muted-foreground/50">--</span>;
  }
  if (status.isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <CircleDot className="h-3.5 w-3.5 text-green-400 shrink-0" />
        <span className="text-xs font-medium text-green-400">Online</span>
        {status.responseTimeMs != null && (
          <span className="text-[11px] text-muted-foreground">{status.responseTimeMs}ms</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <CircleOff className="h-3.5 w-3.5 text-red-400 shrink-0" />
      <span className="text-xs font-medium text-red-400">Offline</span>
    </div>
  );
}

function SslCell({ status, loading }: { status?: SslStatus; loading: boolean }) {
  if (loading) {
    return <SkeletonCell icon={Shield} />;
  }
  if (!status) {
    return <span className="text-xs text-muted-foreground/50">--</span>;
  }
  if (!status.valid) {
    return (
      <div className="flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />
        <span className="text-xs font-medium text-red-400">Inválido</span>
      </div>
    );
  }
  const days = status.daysRemaining ?? 0;
  const color =
    days > 30 ? "text-green-400" : days > 7 ? "text-yellow-400" : "text-red-400";
  const Icon = days > 30 ? ShieldCheck : days > 7 ? Shield : ShieldAlert;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>Válido</span>
      <span className="text-[11px] text-muted-foreground">{days}d</span>
    </div>
  );
}

function DomainCell({ status, loading }: { status?: DomainStatus; loading: boolean }) {
  if (loading) {
    return <SkeletonCell icon={Calendar} />;
  }
  if (!status) {
    return <span className="text-xs text-muted-foreground/50">--</span>;
  }
  if (status.daysRemaining == null) {
    return <span className="text-xs text-muted-foreground/50">Sin datos</span>;
  }
  const days = status.daysRemaining;
  const color =
    days > 90 ? "text-green-400" : days > 30 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex items-center gap-1.5">
      <Calendar className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{days} días</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scores cell — mini score rings                                     */
/* ------------------------------------------------------------------ */

function MiniScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 90 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const strokeColor =
    score >= 90 ? "stroke-green-400" : score >= 50 ? "stroke-yellow-400" : "stroke-red-400";

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative inline-flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={`${label}: ${score} de 100`}>
          <circle
            cx="20" cy="20" r={radius}
            fill="none" strokeWidth="3"
            className="stroke-muted/20"
          />
          <circle
            cx="20" cy="20" r={radius}
            fill="none" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={strokeColor}
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className={`absolute text-[10px] font-bold ${color}`} aria-hidden="true">{score}</span>
      </div>
      <span className="text-[9px] text-muted-foreground leading-none">{label}</span>
    </div>
  );
}

function ScoresCell({ scores }: { scores?: LastAuditScores }) {
  if (!scores) {
    return <span className="text-xs text-muted-foreground/50">--</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <MiniScoreRing score={scores.performance} label="Perf" />
      <MiniScoreRing score={scores.seo} label="SEO" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [sites, setSites] = useLocalStorage<StoredSite[]>("audity-sites", []);
  const [, setResponseHistory] = useLocalStorage<Record<string, ResponseTimeEntry[]>>("audity-response-history", {});
  const [auditScores, setAuditScores] = useLocalStorage<Record<string, LastAuditScores>>("audity-audit-scores", {});
  const [statuses, setStatuses] = useState<Record<string, SiteStatus>>({});
  const [sslStatuses, setSslStatuses] = useState<Record<string, SslStatus>>({});
  const [domainStatuses, setDomainStatuses] = useState<Record<string, DomainStatus>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);

  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  /* ---- Fetch status for a single site ---- */
  const checkSite = useCallback(async (site: StoredSite) => {
    setLoadingIds((prev) => new Set(prev).add(site.id));

    const [statusRes, sslRes, domainRes] = await Promise.allSettled([
      fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: site.url }),
      }).then((r) => r.json()),
      fetch("/api/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: site.url }),
      }).then((r) => r.json()),
      fetch("/api/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: site.url }),
      }).then((r) => r.json()),
    ]);

    if (statusRes.status === "fulfilled") {
      setStatuses((prev) => ({ ...prev, [site.id]: statusRes.value }));
      if (statusRes.value.responseTimeMs != null) {
        setResponseHistory((prev) => {
          const entries = prev[site.id] ?? [];
          const updated = [
            ...entries,
            { timestamp: new Date().toISOString(), ms: statusRes.value.responseTimeMs },
          ].slice(-MAX_RESPONSE_HISTORY);
          return { ...prev, [site.id]: updated };
        });
      }
    }
    if (sslRes.status === "fulfilled") {
      setSslStatuses((prev) => ({ ...prev, [site.id]: sslRes.value }));
    }
    if (domainRes.status === "fulfilled") {
      setDomainStatuses((prev) => ({ ...prev, [site.id]: domainRes.value }));
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(site.id);
      return next;
    });
  }, [setResponseHistory]);

  /* ---- Refresh all sites sequentially ---- */
  const refreshAll = useCallback(
    async (siteList: StoredSite[]) => {
      setRefreshingAll(true);
      for (const site of siteList) {
        await checkSite(site);
      }
      setRefreshingAll(false);
    },
    [checkSite],
  );

  /* ---- Check all sites on mount ---- */
  useEffect(() => {
    if (sites.length > 0) {
      refreshAll(sites);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Add site ---- */
  function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newUrl.trim();
    if (!trimmed) {
      setError("Ingresá una URL.");
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      new URL(normalized);
    } catch {
      setError("Ingresá una URL válida.");
      return;
    }

    if (sites.some((s) => s.url === normalized)) {
      setError("Este sitio ya está agregado.");
      return;
    }

    const newSite: StoredSite = {
      id: crypto.randomUUID(),
      url: normalized,
      addedAt: new Date().toISOString(),
    };

    setSites((prev) => [newSite, ...prev]);
    setNewUrl("");
    setError("");
    checkSite(newSite);
  }

  /* ---- Delete site ---- */
  function handleDelete(id: string) {
    setSites((prev) => prev.filter((s) => s.id !== id));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSslStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDomainStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setResponseHistory((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setAuditScores((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-8 h-14">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Panel de monitoreo</h1>
            {sites.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal">
                {sites.length} {sites.length === 1 ? "sitio" : "sitios"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sites.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => refreshAll(sites)}
                disabled={refreshingAll}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Actualizar todo</span>
              </Button>
            )}
            <Link href="/">
              <Button variant="outline" size="sm" className="cursor-pointer !border-blue-500/50 hover:!border-blue-500/70">
                Nueva auditoría
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8">
        {/* Add site form */}
        <form onSubmit={handleAddSite} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              placeholder="https://ejemplo.com"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                if (error) setError("");
              }}
              className="flex-1 h-10 text-base bg-card border-border placeholder:text-muted-foreground"
            />
            <Button type="submit" className="h-10 font-semibold px-5 cursor-pointer gap-1.5">
              <Plus className="h-4 w-4" />
              Agregar sitio
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </form>

        {/* Empty state */}
        {sites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-muted/20 p-6 mb-6">
              <Globe className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No tenés sitios guardados</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Agregá una URL para empezar a monitorear el estado, SSL y dominio de tus sitios web.
            </p>
          </div>
        )}

        {/* Table */}
        {sites.length > 0 && (
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-muted/10 border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Sitio
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-36">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-36 hidden sm:table-cell">
                    Certificado
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-36 hidden md:table-cell">
                    Dominio
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-32 hidden lg:table-cell">
                    Scores
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sites.map((site) => {
                  const isLoading = loadingIds.has(site.id);
                  return (
                    <tr key={site.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <SiteFavicon url={site.url} />
                          <span className="text-sm font-medium truncate">
                            {hostnameFromUrl(site.url)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusCell status={statuses[site.id]} loading={isLoading} />
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <SslCell status={sslStatuses[site.id]} loading={isLoading} />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <DomainCell status={domainStatuses[site.id]} loading={isLoading} />
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <ScoresCell scores={auditScores[site.id]} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => checkSite(site)}
                            disabled={isLoading}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="cursor-pointer text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(site.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            className="cursor-pointer gap-1 ml-1"
                            onClick={() => router.push(`/audit?url=${encodeURIComponent(site.url)}`)}
                          >
                            Auditar
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
