"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
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
    setError("");
    router.push(`/audit?url=${encodeURIComponent(normalized)}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-center px-4 sm:px-8 h-12">
          <Link href="/dashboard" className="group flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
            <span className="hidden sm:inline">Monitoreá tus webs desde un solo lugar</span>
            <span className="sm:hidden">Dashboard de monitoreo</span>
            <span className="text-xs text-primary font-medium group-hover:underline shrink-0">Crea tu dashboard</span>
          </Link>
        </div>
      </header>

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[900px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute left-1/3 top-1/2 h-[300px] w-[400px] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute right-1/4 top-1/4 h-[250px] w-[350px] rounded-full bg-accent/6 blur-[90px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-3xl">
        {/* Badge */}
        <Badge variant="outline" className="border-primary/30 text-primary px-5 py-1.5 text-xs font-medium">
          SEO · Rendimiento · Core Web Vitals
        </Badge>

        {/* Heading */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Auditá cualquier web <span className="text-primary">al instante</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Obtené scores de SEO y rendimiento con recomendaciones concretas.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <Input
              type="text"
              placeholder="https://tusitioweb.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              className="flex-1 h-10 text-base bg-card border-border placeholder:text-muted-foreground sm:max-w-[75%]"
            />
            <Button
              type="submit"
              className="h-10 font-semibold px-5 cursor-pointer"
            >
              Auditar
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </form>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
          {[
            "Score SEO",
            "Score de Rendimiento",
            "Core Web Vitals",
            "Stack tecnológico",
            "Recomendaciones",
          ].map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
