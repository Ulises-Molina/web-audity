export interface SeoCheck {
  id: string;
  category: "basic" | "content" | "social" | "technical";
  title: string;
  description: string;
  passed: boolean;
  value?: string;
}

export interface SeoAnalysis {
  score: number;
  checks: SeoCheck[];
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WebAudityBot/1.0; +https://webaudity.dev)",
      Accept: "text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res.text();
}

async function resourceExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function extractAttr(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function countMatches(html: string, regex: RegExp): number {
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

export async function analyzeSeo(url: string): Promise<SeoAnalysis> {
  const html = await fetchHtml(url);
  const parsedUrl = new URL(url);
  const origin = parsedUrl.origin;

  const checks: SeoCheck[] = [];

  // --- BASIC ---

  // Title
  const title = extractAttr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleLen = title?.length ?? 0;
  checks.push({
    id: "title-exists",
    category: "basic",
    title: "Etiqueta <title>",
    description: title
      ? `Presente (${titleLen} caracteres). ${titleLen < 30 ? "Muy corto, se recomienda 30-60 caracteres." : titleLen > 60 ? "Muy largo, se recomienda 30-60 caracteres." : "Longitud óptima."}`
      : "No se encontró la etiqueta <title>. Es esencial para SEO.",
    passed: !!title && titleLen >= 30 && titleLen <= 60,
    value: title ?? undefined,
  });

  // Meta description
  const metaDesc = extractAttr(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i
  ) ?? extractAttr(
    html,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i
  );
  const descLen = metaDesc?.length ?? 0;
  checks.push({
    id: "meta-description",
    category: "basic",
    title: "Meta description",
    description: metaDesc
      ? `Presente (${descLen} caracteres). ${descLen < 120 ? "Muy corta, se recomienda 120-160 caracteres." : descLen > 160 ? "Muy larga, se recomienda 120-160 caracteres." : "Longitud óptima."}`
      : "No se encontró meta description. Los buscadores la usan como resumen en resultados.",
    passed: !!metaDesc && descLen >= 120 && descLen <= 160,
    value: metaDesc ?? undefined,
  });

  // HTTPS
  checks.push({
    id: "https",
    category: "basic",
    title: "HTTPS",
    description: parsedUrl.protocol === "https:"
      ? "El sitio usa HTTPS."
      : "El sitio no usa HTTPS. Google penaliza sitios sin SSL.",
    passed: parsedUrl.protocol === "https:",
  });

  // Lang attribute
  const lang = extractAttr(html, /<html[^>]+lang=["']([^"']+)["']/i);
  checks.push({
    id: "html-lang",
    category: "basic",
    title: "Atributo lang en <html>",
    description: lang
      ? `Presente: "${lang}".`
      : "No se encontró el atributo lang. Ayuda a los buscadores a entender el idioma.",
    passed: !!lang,
    value: lang ?? undefined,
  });

  // Viewport
  const viewport = extractAttr(
    html,
    /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i
  );
  checks.push({
    id: "viewport",
    category: "basic",
    title: "Meta viewport",
    description: viewport
      ? "Presente. El sitio está configurado para mobile."
      : "No se encontró meta viewport. Necesario para diseño responsive.",
    passed: !!viewport,
  });

  // --- CONTENT ---

  // H1
  const h1Count = countMatches(html, /<h1[\s>]/gi);
  checks.push({
    id: "h1",
    category: "content",
    title: "Etiqueta <h1>",
    description:
      h1Count === 0
        ? "No se encontró <h1>. Cada página debe tener exactamente un H1."
        : h1Count === 1
          ? "Exactamente un <h1>. Correcto."
          : `Se encontraron ${h1Count} etiquetas <h1>. Se recomienda usar solo una por página.`,
    passed: h1Count === 1,
  });

  // Heading hierarchy
  const h2Count = countMatches(html, /<h2[\s>]/gi);
  checks.push({
    id: "heading-structure",
    category: "content",
    title: "Estructura de headings",
    description:
      h2Count > 0
        ? `Se encontraron ${h2Count} etiquetas <h2>. Buena estructura de contenido.`
        : "No se encontraron etiquetas <h2>. Los headings ayudan a estructurar el contenido.",
    passed: h2Count > 0,
  });

  // Images without alt
  const totalImages = countMatches(html, /<img[\s]/gi);
  const imagesWithAlt = countMatches(html, /<img[^>]+alt=["'][^"']+["']/gi);
  const imagesWithoutAlt = totalImages - imagesWithAlt;
  checks.push({
    id: "img-alt",
    category: "content",
    title: "Atributo alt en imágenes",
    description:
      totalImages === 0
        ? "No se encontraron imágenes."
        : imagesWithoutAlt === 0
          ? `Todas las imágenes (${totalImages}) tienen atributo alt.`
          : `${imagesWithoutAlt} de ${totalImages} imágenes no tienen atributo alt.`,
    passed: totalImages === 0 || imagesWithoutAlt === 0,
  });

  // Links
  const internalLinks = countMatches(
    html,
    new RegExp(`<a[^>]+href=["']${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi")
  ) + countMatches(html, /<a[^>]+href=["']\/[^"']/gi);
  checks.push({
    id: "internal-links",
    category: "content",
    title: "Enlaces internos",
    description:
      internalLinks > 0
        ? `Se encontraron ${internalLinks} enlaces internos. Buena navegabilidad.`
        : "No se encontraron enlaces internos. Los links internos mejoran el crawling.",
    passed: internalLinks > 0,
  });

  // --- SOCIAL ---

  // Open Graph
  const ogTitle = extractAttr(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  const ogDesc = extractAttr(
    html,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
  );
  const ogImage = extractAttr(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  checks.push({
    id: "open-graph",
    category: "social",
    title: "Open Graph tags",
    description:
      ogCount === 3
        ? "og:title, og:description y og:image presentes."
        : `Faltan tags Open Graph (${ogCount}/3). Mejoran cómo se ve el link en redes sociales.${!ogTitle ? " Falta og:title." : ""}${!ogDesc ? " Falta og:description." : ""}${!ogImage ? " Falta og:image." : ""}`,
    passed: ogCount === 3,
  });

  // Twitter Card
  const twitterCard = extractAttr(
    html,
    /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i
  );
  checks.push({
    id: "twitter-card",
    category: "social",
    title: "Twitter Card",
    description: twitterCard
      ? `Presente: "${twitterCard}".`
      : "No se encontró twitter:card. Mejora la presentación en Twitter/X.",
    passed: !!twitterCard,
  });

  // --- TECHNICAL ---

  // Canonical
  const canonical = extractAttr(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  checks.push({
    id: "canonical",
    category: "technical",
    title: "URL canónica",
    description: canonical
      ? `Presente: ${canonical}`
      : "No se encontró <link rel='canonical'>. Previene contenido duplicado.",
    passed: !!canonical,
    value: canonical ?? undefined,
  });

  // Robots.txt
  const hasRobots = await resourceExists(`${origin}/robots.txt`);
  checks.push({
    id: "robots-txt",
    category: "technical",
    title: "robots.txt",
    description: hasRobots
      ? "Archivo robots.txt encontrado."
      : "No se encontró robots.txt. Guía a los buscadores sobre qué indexar.",
    passed: hasRobots,
  });

  // Sitemap
  const hasSitemap = await resourceExists(`${origin}/sitemap.xml`);
  checks.push({
    id: "sitemap",
    category: "technical",
    title: "sitemap.xml",
    description: hasSitemap
      ? "Archivo sitemap.xml encontrado."
      : "No se encontró sitemap.xml. Facilita la indexación del sitio.",
    passed: hasSitemap,
  });

  // Structured Data (JSON-LD)
  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  checks.push({
    id: "structured-data",
    category: "technical",
    title: "Datos estructurados (JSON-LD)",
    description: hasJsonLd
      ? "Se encontró JSON-LD. Mejora los rich snippets en buscadores."
      : "No se encontró JSON-LD. Los datos estructurados mejoran la visibilidad en resultados.",
    passed: hasJsonLd,
  });

  // Meta robots
  const metaRobots = extractAttr(
    html,
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i
  );
  const isNoIndex = metaRobots?.toLowerCase().includes("noindex") ?? false;
  checks.push({
    id: "meta-robots",
    category: "technical",
    title: "Indexación permitida",
    description: isNoIndex
      ? "La página tiene noindex. No aparecerá en resultados de búsqueda."
      : "La página permite indexación.",
    passed: !isNoIndex,
  });

  // Charset
  const hasCharset =
    /<meta[^>]+charset=["']?[^"'\s>]+/i.test(html) ||
    /<meta[^>]+http-equiv=["']Content-Type["']/i.test(html);
  checks.push({
    id: "charset",
    category: "technical",
    title: "Charset declarado",
    description: hasCharset
      ? "Charset definido correctamente."
      : "No se encontró declaración de charset. Se recomienda <meta charset='utf-8'>.",
    passed: hasCharset,
  });

  // Calculate score: each check has equal weight
  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return { score, checks };
}
