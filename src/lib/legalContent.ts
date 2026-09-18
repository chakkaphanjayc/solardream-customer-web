import { sanitizeHtml } from "@/lib/htmlSanitizer";

/**
 * Compliance content can be edited by operations and may use an h3 as its
 * document title. The route already owns the h1, so promote only the first
 * h3 to keep the rendered outline valid without changing the stored content.
 */
export function sanitizeLegalContent(content: string): string {
  const safeContent = sanitizeHtml(content);
  return safeContent
    .replace(/<h3(\b[^>]*)>/i, "<h2$1>")
    .replace(/<\/h3>/i, "</h2>");
}
