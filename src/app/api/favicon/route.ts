import { NextRequest } from "next/server";

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return new Response(FALLBACK_SVG, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
    });
  }

  // Strategy 1: Fetch the page HTML and look for <link rel="icon"> tags
  try {
    const pageRes = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WebAudity/1.0)" },
      redirect: "follow",
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const iconUrl = extractFaviconUrl(html, `https://${domain}`);
      if (iconUrl) {
        const iconRes = await fetch(iconUrl, {
          signal: AbortSignal.timeout(5000),
          redirect: "follow",
        });
        if (iconRes.ok) {
          const contentType = iconRes.headers.get("content-type") || "image/x-icon";
          const buffer = await iconRes.arrayBuffer();
          if (buffer.byteLength > 0) {
            return new Response(buffer, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=604800",
              },
            });
          }
        }
      }
    }
  } catch {
    // Fall through
  }

  // Strategy 2: Try /favicon.ico directly
  try {
    const iconRes = await fetch(`https://${domain}/favicon.ico`, {
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    if (iconRes.ok) {
      const contentType = iconRes.headers.get("content-type") || "image/x-icon";
      const buffer = await iconRes.arrayBuffer();
      if (buffer.byteLength > 0) {
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800",
          },
        });
      }
    }
  } catch {
    // Fall through
  }

  // Fallback: SVG globe icon
  return new Response(FALLBACK_SVG, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}

function extractFaviconUrl(html: string, baseUrl: string): string | null {
  // Match <link> tags with rel containing "icon"
  const linkRegex = /<link\s+[^>]*rel\s*=\s*["'][^"]*icon[^"]*["'][^>]*>/gi;
  const matches = html.match(linkRegex);
  if (!matches) return null;

  // Prefer apple-touch-icon or larger icons, then any icon
  let bestHref: string | null = null;
  let bestSize = 0;

  for (const tag of matches) {
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    const href = hrefMatch[1];
    const sizesMatch = tag.match(/sizes\s*=\s*["'](\d+)x\d+["']/i);
    const size = sizesMatch ? parseInt(sizesMatch[1], 10) : 16;

    if (size > bestSize || !bestHref) {
      bestSize = size;
      bestHref = href;
    }
  }

  if (!bestHref) return null;

  // Resolve relative URLs
  if (bestHref.startsWith("//")) return `https:${bestHref}`;
  if (bestHref.startsWith("http")) return bestHref;
  if (bestHref.startsWith("/")) return `${baseUrl}${bestHref}`;
  return `${baseUrl}/${bestHref}`;
}
