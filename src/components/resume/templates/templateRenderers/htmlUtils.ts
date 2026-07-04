/**
 * @fileoverview Shared string-formatting helpers for template HTML generation.
 */

export function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Formats a summary paragraph by grouping sentences into readable chunks. */
export function formatSummary(text: string): string {
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const paragraphs: string[] = [];
  let currentPara = "";

  sentences.forEach((sentence, index) => {
    currentPara += sentence + " ";
    // Create paragraph every 2-3 sentences or at end
    if ((index + 1) % 3 === 0 || index === sentences.length - 1) {
      paragraphs.push(currentPara.trim());
      currentPara = "";
    }
  });

  return paragraphs.length > 0 ? paragraphs.join("</p><p>") : text;
}
