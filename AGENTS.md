<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.


# AGENTS.md

## 🧠 Contexto del Proyecto

Este proyecto consiste en el desarrollo de una herramienta interna para auditar páginas web. La aplicación permite analizar una URL y obtener métricas clave relacionadas con SEO, rendimiento, Core Web Vitals, tecnologías utilizadas y estado general del sitio.

Además, incluye un sistema de monitoreo donde los usuarios pueden guardar sitios y visualizar su estado en tiempo real (online/offline, SSL, expiración de dominio, etc.).

La auditoría no utiliza un score general único: la aplicación debe mostrar un score de SEO y otro score de Performance como métricas principales.

---

## 🎯 Objetivo

Construir una plataforma interna que permita:

* Auditar sitios web de forma rápida y clara
* Obtener un score de SEO (x/100)
* Obtener un score de Performance (x/100)
* Detectar problemas y sugerir mejoras
* Monitorear sitios guardados en un dashboard

---

## 🏗️ Arquitectura General

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui

### Backend

* Next.js Route Handlers (full-stack approach)
* Server Actions cuando sea necesario

### Base de Datos

* Supabase (PostgreSQL)

### Infraestructura

* Vercel (deploy app)
* Supabase (DB + Auth)

---

## 🔌 Integraciones / APIs

### Auditoría

* Google PageSpeed Insights API
* Chrome UX Report (CrUX API)

### Tecnologías

* Wappalyzer API

### Dominio

* RDAP

### SSL

* Chequeo propio via TLS

### Uptime

* Chequeo propio vía HTTP requests

---

## 🧩 Módulos del Sistema

### 1. Auditoría On-Demand

Input: URL

Output:

* SEO score (0–100)
* Performance score (0–100)
* Core Web Vitals
* Tecnologías detectadas
* Lista de recomendaciones

---

### 2. Dashboard de Sitios

Cada usuario puede:

* Guardar sitios
* Ver estado actual
* Ver últimas auditorías

Información mostrada:

* Online / Offline
* SSL activo
* Días restantes de dominio
* Última auditoría

---

## 📊 Lógica de Scoring

La plataforma debe manejar dos scores principales e independientes:

* SEO score
* Performance score

Core Web Vitals debe mostrarse como una sección complementaria con métricas y estado, pero no consolidado en un score general único.

---

## 🗄️ Modelo de Datos (alto nivel)

### users

* id
* email

### sites

* id
* url
* user_id

### audit_runs

* id
* site_id
* created_at

### audit_scores

* performance
* seo
* cwv

### audit_recommendations

* id
* audit_run_id
* type
* message

### site_status

* site_id
* is_online
* response_time
* checked_at

### ssl_checks

* site_id
* valid
* expires_at

### domain_checks

* site_id
* expires_at
* days_remaining

### technologies

* site_id
* name
* category

---

## 🔁 Jobs / Tareas Programadas

Se deben ejecutar tareas periódicas:

* Verificar uptime
* Verificar SSL
* Verificar expiración de dominio

Frecuencia sugerida:

* Uptime: cada 5–15 min
* SSL: 1 vez por día
* Dominio: 1 vez por día

---

## ⚙️ Flujo de Auditoría

1. Usuario ingresa URL
2. Se valida y normaliza
3. Se ejecutan llamadas a APIs:

   * PageSpeed
   * CrUX
   * Wappalyzer
4. Se procesan resultados
5. Se calculan los scores de SEO y Performance
6. Se guarda en DB
7. Se devuelve resultado al frontend

---

## ⚠️ Consideraciones Técnicas

* Manejar rate limits de APIs
* Evitar bloqueos en UI (usar async jobs)
* Diferenciar mobile vs desktop
* Diferenciar datos de laboratorio vs reales
* Normalizar URLs (http/https, www, etc.)

---

## 🚀 Roadmap

### Fase 1 (MVP)

* Auditoría básica
* Score de SEO
* Score de Performance
* Recomendaciones

### Fase 2

* Dashboard de sitios
* Monitoreo básico

### Fase 3

* Histórico
* Gráficos
* Alertas

---

## 🎨 Lineamientos de UI/UX (Moderna)

La interfaz debe seguir principios de diseño modernos, priorizando claridad, velocidad y una experiencia profesional.

### Principios

* Diseño limpio, minimalista
* Uso de espacios en blanco (whitespace)
* Jerarquía visual clara
* Información escaneable (cards, listas, badges)
* Feedback inmediato (loading, estados, errores)

### Estilo visual

* UI basada en cards (dashboard style)
* Bordes redondeados (rounded-2xl)
* Sombras suaves (soft shadows)
* Tipografía clara y moderna
* Evitar saturación de colores

### Componentes clave

* Cards para métricas (SEO, Performance, CWV)
* Progress bars para scores
* Badges de estado:

  * Online / Offline
  * SSL activo / vencido
  * Dominio próximo a expirar
* Tabs para separar secciones (Overview, SEO, Performance, Tech)
* Tables limpias para dashboard de sitios

### Estados UI

* Loading skeletons (no spinners largos)
* Estados vacíos (empty states bien diseñados)
* Mensajes de error claros

### UX

* Todo debe ser rápido (optimizar perceived performance)
* Evitar bloqueos: usar async y feedback visual
* Priorizar mobile-first (aunque uso principal sea desktop)

---

## 🧱 Principios de Desarrollo

* Simplicidad > sobreingeniería
* Iterar rápido
* Priorizar valor interno
* Evitar dependencias innecesarias

---

## 📌 Notas Finales

Este proyecto no está pensado inicialmente como producto comercial, por lo que:

* Se prioriza velocidad de desarrollo
* Se minimizan costos
* Se busca mantener bajo mantenimiento

A futuro puede evolucionar a producto SaaS si se valida internamente.



<!-- END:nextjs-agent-rules -->
