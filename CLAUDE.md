# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Next.js Version Warning

This project uses **Next.js 16.2.1** with **React 19.2.4**. These versions have breaking changes from what most training data covers. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Do not assume APIs, conventions, or file structures match prior Next.js versions.

## Current State

The project is a fresh `create-next-app` scaffold. The only meaningful source files are:
- `src/app/layout.tsx` — root layout with Geist fonts
- `src/app/page.tsx` — placeholder home page
- `src/app/globals.css` / `page.module.css` — base styles

**Nothing from AGENTS.md has been implemented yet.** The planned stack additions (Tailwind CSS, shadcn/ui, Supabase) are not installed.

## Planned Architecture (from AGENTS.md)

- **`src/app/`** — App Router pages and layouts
- **`src/app/api/`** — Route Handlers for audit logic (PageSpeed, CrUX, Wappalyzer, RDAP, SSL checks)
- **`src/components/`** — Shared UI components (shadcn/ui based)
- **`src/lib/`** — Utilities, Supabase client, API integrations, scoring logic

Key constraint: **two independent scores only** — SEO score and Performance score. No single aggregate score. Core Web Vitals are a complementary display section, not a score.

## External APIs to Integrate

| Purpose | API |
|---|---|
| Performance + SEO scores | Google PageSpeed Insights |
| Real-world metrics | Chrome UX Report (CrUX) |
| Tech stack detection | Wappalyzer |
| Domain expiry | RDAP |
| SSL validity | Custom TLS check |
| Uptime | Custom HTTP check |
