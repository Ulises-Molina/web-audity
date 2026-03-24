/**
 * Normaliza una URL: agrega https:// si falta protocolo,
 * remueve trailing slash, y valida que sea una URL válida.
 */
export function normalizeUrl(input: string): string {
  let url = input.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Valida que sea una URL válida
  const parsed = new URL(url);

  // Solo permitir http/https
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Solo se permiten URLs http o https.");
  }

  // Remover trailing slash
  return parsed.origin + parsed.pathname.replace(/\/+$/, "") + parsed.search;
}
