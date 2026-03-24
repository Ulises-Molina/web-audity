interface DetectedTech {
  name: string;
  category: string;
  icon?: string;
}

interface TechPattern {
  name: string;
  category: string;
  icon?: string;
  headers?: { key: string; pattern: RegExp }[];
  html?: RegExp[];
  meta?: { name: string; pattern?: RegExp }[];
  scripts?: RegExp[];
  cookies?: RegExp[];
}

const TECH_PATTERNS: TechPattern[] = [
  // Frameworks JS
  { name: "React", category: "Framework JS", html: [/react\.production\.min\.js/, /react-dom/, /__next/, /data-reactroot/, /data-reactid/] },
  { name: "Next.js", category: "Framework", headers: [{ key: "x-powered-by", pattern: /Next\.js/i }], html: [/__next/, /_next\/static/, /next\/dist/], scripts: [/_next\/static/] },
  { name: "Nuxt.js", category: "Framework", html: [/__nuxt/, /_nuxt\//, /nuxt\.config/], scripts: [/_nuxt\//] },
  { name: "Vue.js", category: "Framework JS", html: [/vue\.runtime/, /vue\.min\.js/, /data-v-[a-f0-9]/, /vue@/], scripts: [/vue\.min\.js/, /vue\.runtime/] },
  { name: "Angular", category: "Framework JS", html: [/ng-version=/, /ng-app/, /angular\.min\.js/, /zone\.js/], scripts: [/angular/, /zone\.js/] },
  { name: "Svelte", category: "Framework JS", html: [/svelte/, /__svelte/] },
  { name: "Gatsby", category: "Framework", html: [/gatsby/, /gatsby-image/, /gatsby-chunk/], scripts: [/gatsby/] },
  { name: "Remix", category: "Framework", html: [/__remix/, /remix\.run/] },
  { name: "Astro", category: "Framework", html: [/astro-island/, /astro\.build/] },

  // CMS
  { name: "WordPress", category: "CMS", html: [/wp-content/, /wp-includes/, /wp-json/], meta: [{ name: "generator", pattern: /WordPress/i }] },
  { name: "Drupal", category: "CMS", html: [/drupal\.js/, /sites\/default\/files/], headers: [{ key: "x-drupal-cache", pattern: /./ }], meta: [{ name: "generator", pattern: /Drupal/i }] },
  { name: "Joomla", category: "CMS", html: [/\/media\/jui\//, /joomla/i], meta: [{ name: "generator", pattern: /Joomla/i }] },
  { name: "Shopify", category: "E-commerce", html: [/cdn\.shopify\.com/, /shopify\.com/, /Shopify\.theme/], scripts: [/cdn\.shopify\.com/] },
  { name: "Wix", category: "CMS", html: [/wix\.com/, /wixstatic\.com/, /X-Wix/] },
  { name: "Squarespace", category: "CMS", html: [/squarespace\.com/, /squarespace-cdn/] },
  { name: "Webflow", category: "CMS", html: [/webflow\.com/, /wf-page/, /webflow\.js/] },
  { name: "Ghost", category: "CMS", html: [/ghost\.org/, /ghost-/, /content\/themes/], meta: [{ name: "generator", pattern: /Ghost/i }] },
  { name: "PrestaShop", category: "E-commerce", html: [/prestashop/i, /modules\/ps_/], meta: [{ name: "generator", pattern: /PrestaShop/i }] },
  { name: "Magento", category: "E-commerce", html: [/mage\/cookies/, /Magento/, /magento/], cookies: [/frontend=/, /mage-/] },
  { name: "WooCommerce", category: "E-commerce", html: [/woocommerce/, /wc-blocks/] },

  // CSS Frameworks
  { name: "Tailwind CSS", category: "CSS", html: [/tailwindcss/, /tailwind\.min\.css/] },
  { name: "Bootstrap", category: "CSS", html: [/bootstrap\.min\.css/, /bootstrap\.min\.js/, /bootstrap\.bundle/], scripts: [/bootstrap/] },
  { name: "Bulma", category: "CSS", html: [/bulma\.min\.css/, /bulma\.io/] },
  { name: "Material UI", category: "CSS", html: [/MuiBox/, /MuiButton/, /mui\.com/] },

  // Servidores
  { name: "Nginx", category: "Servidor", headers: [{ key: "server", pattern: /nginx/i }] },
  { name: "Apache", category: "Servidor", headers: [{ key: "server", pattern: /Apache/i }] },
  { name: "Cloudflare", category: "CDN", headers: [{ key: "server", pattern: /cloudflare/i }, { key: "cf-ray", pattern: /./ }] },
  { name: "Vercel", category: "Hosting", headers: [{ key: "server", pattern: /Vercel/i }, { key: "x-vercel-id", pattern: /./ }] },
  { name: "Netlify", category: "Hosting", headers: [{ key: "server", pattern: /Netlify/i }, { key: "x-nf-request-id", pattern: /./ }] },
  { name: "AWS", category: "Hosting", headers: [{ key: "server", pattern: /AmazonS3|CloudFront|awselb/i }, { key: "x-amz-cf-id", pattern: /./ }] },
  { name: "LiteSpeed", category: "Servidor", headers: [{ key: "server", pattern: /LiteSpeed/i }] },
  { name: "IIS", category: "Servidor", headers: [{ key: "server", pattern: /Microsoft-IIS/i }] },
  { name: "Caddy", category: "Servidor", headers: [{ key: "server", pattern: /Caddy/i }] },

  // Analytics & Marketing
  { name: "Google Analytics", category: "Analytics", html: [/google-analytics\.com/, /googletagmanager\.com/, /gtag\/js/, /ga\.js/, /analytics\.js/], scripts: [/google-analytics\.com/, /googletagmanager\.com/] },
  { name: "Google Tag Manager", category: "Analytics", html: [/googletagmanager\.com\/gtm\.js/] },
  { name: "Hotjar", category: "Analytics", html: [/hotjar\.com/, /static\.hotjar\.com/], scripts: [/hotjar/] },
  { name: "Meta Pixel", category: "Analytics", html: [/connect\.facebook\.net\/.*\/fbevents\.js/, /fbq\(/] },
  { name: "Clarity", category: "Analytics", html: [/clarity\.ms/], scripts: [/clarity\.ms/] },

  // Lenguajes / Runtimes
  { name: "PHP", category: "Lenguaje", headers: [{ key: "x-powered-by", pattern: /PHP/i }] },
  { name: "ASP.NET", category: "Lenguaje", headers: [{ key: "x-powered-by", pattern: /ASP\.NET/i }, { key: "x-aspnet-version", pattern: /./ }] },
  { name: "Express", category: "Lenguaje", headers: [{ key: "x-powered-by", pattern: /Express/i }] },

  // Librerías JS
  { name: "jQuery", category: "Librería JS", html: [/jquery\.min\.js/, /jquery-\d/], scripts: [/jquery/] },
  { name: "Lodash", category: "Librería JS", html: [/lodash\.min\.js/], scripts: [/lodash/] },
  { name: "GSAP", category: "Librería JS", html: [/gsap\.min\.js/, /ScrollTrigger/], scripts: [/gsap/] },
  { name: "Alpine.js", category: "Framework JS", html: [/alpine\.min\.js/, /x-data=/, /alpine/], scripts: [/alpine/] },
  { name: "HTMX", category: "Librería JS", html: [/htmx\.min\.js/, /hx-get=/, /hx-post=/], scripts: [/htmx/] },

  // Otros
  { name: "Font Awesome", category: "Iconos", html: [/font-awesome/, /fontawesome/, /fa-solid/, /fa-brands/] },
  { name: "Google Fonts", category: "Fuentes", html: [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/] },
  { name: "reCAPTCHA", category: "Seguridad", html: [/google\.com\/recaptcha/, /grecaptcha/] },
  { name: "hCaptcha", category: "Seguridad", html: [/hcaptcha\.com/] },
  { name: "Stripe", category: "Pagos", html: [/js\.stripe\.com/, /stripe\.js/] },
  { name: "PayPal", category: "Pagos", html: [/paypal\.com\/sdk/, /paypalobjects\.com/] },
  { name: "Crisp", category: "Chat", html: [/client\.crisp\.chat/] },
  { name: "Intercom", category: "Chat", html: [/intercom\.io/, /widget\.intercom\.io/] },
  { name: "Zendesk", category: "Chat", html: [/zendesk\.com/, /zdassets\.com/] },
  { name: "Cloudflare Turnstile", category: "Seguridad", html: [/challenges\.cloudflare\.com\/turnstile/] },
];

export async function detectTechnologies(url: string): Promise<DetectedTech[]> {
  const detected = new Map<string, DetectedTech>();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WebAuditBot/1.0)",
        Accept: "text/html",
        "Accept-Encoding": "gzip",
      },
      redirect: "follow",
    });

    const headers = res.headers;
    const setCookie = headers.get("set-cookie") || "";

    // Read only the first 200KB — enough for <head> and initial scripts
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const MAX_BYTES = 200 * 1024;

    if (reader) {
      while (totalSize < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalSize += value.length;
      }
      reader.cancel();
    }

    let body: Uint8Array;
    if (chunks.length === 1) {
      body = chunks[0];
    } else {
      const merged = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      body = merged;
    }
    const html = new TextDecoder().decode(body);

    for (const tech of TECH_PATTERNS) {
      let found = false;

      // Check headers
      if (tech.headers) {
        for (const { key, pattern } of tech.headers) {
          const value = headers.get(key);
          if (value && pattern.test(value)) {
            found = true;
            break;
          }
        }
      }

      // Check HTML
      if (!found && tech.html) {
        for (const pattern of tech.html) {
          if (pattern.test(html)) {
            found = true;
            break;
          }
        }
      }

      // Check meta tags
      if (!found && tech.meta) {
        for (const { name, pattern } of tech.meta) {
          const metaRegex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
          const altRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i");
          const match = html.match(metaRegex) || html.match(altRegex);
          if (match && (!pattern || pattern.test(match[1]))) {
            found = true;
            break;
          }
        }
      }

      // Check scripts
      if (!found && tech.scripts) {
        for (const pattern of tech.scripts) {
          const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
          let scriptMatch;
          while ((scriptMatch = scriptRegex.exec(html)) !== null) {
            if (pattern.test(scriptMatch[1])) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }

      // Check cookies
      if (!found && tech.cookies) {
        for (const pattern of tech.cookies) {
          if (pattern.test(setCookie)) {
            found = true;
            break;
          }
        }
      }

      if (found && !detected.has(tech.name)) {
        detected.set(tech.name, {
          name: tech.name,
          category: tech.category,
          icon: tech.icon,
        });
      }
    }
  } catch {
    // If fetch fails, return empty — don't break the audit
  } finally {
    clearTimeout(timeout);
  }

  return Array.from(detected.values());
}
