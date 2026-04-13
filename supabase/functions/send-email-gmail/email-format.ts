/**
 * @file email-format — MIME message construction and encoding helpers for Gmail API.
 *
 * Converts plain-text email bodies to styled HTML, attaches a tracking pixel,
 * and builds RFC 822 compliant MIME messages (with optional file attachments)
 * ready for the Gmail `messages.send` endpoint.
 *
 * Uses Deno std `base64` for encoding to avoid JS engine `btoa` size limits
 * when handling large resume attachments.
 */
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

/** Escape HTML entities for safe insertion into HTML email bodies. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isLikelyUrlSegment(part: string): boolean {
  const t = part.trim();
  return /^https?:\/\//i.test(t) || /^www\./i.test(t);
}

/**
 * Turn plain-text (with newlines) into readable HTML: paragraphs, line breaks, clickable links.
 */
export function formatPlainTextToHtml(text: string): string {
  // Split on URLs so they can be converted to clickable <a> tags while the rest is escaped
  const URL_SPLIT = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(URL_SPLIT);

  const chunks = parts.map((part) => {
    if (!part) return "";
    if (isLikelyUrlSegment(part)) {
      const trimmed = part.trim();
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      return `<a href="${escapeHtml(href)}" style="color:#1a73e8;text-decoration:underline" target="_blank" rel="noopener noreferrer">${escapeHtml(trimmed)}</a>`;
    }
    const escaped = escapeHtml(part);
    return escaped.replace(/\r\n|\r|\n/g, "<br>");
  });

  return (
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
    `font-size:15px;line-height:1.65;color:#202124;max-width:640px;">${chunks.join("")}</div>`
  );
}

export function wrapHtmlWithTrackingPixel(innerHtml: string, trackingPixelUrl: string): string {
  return `${innerHtml}<p style="margin:0;font-size:1px;line-height:0;"><img src="${escapeHtml(trackingPixelUrl)}" width="1" height="1" style="display:none;" alt="" /></p>`;
}

/** Encode a Unicode subject line per RFC 2047 (=?utf-8?B?...?=) for MIME headers. */
export function encodeRfc2047Subject(subject: string): string {
  return `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
}

/** Base64 with CRLF every 76 chars (MIME friendly). Avoids huge `btoa` binary strings in Deno. */
export function uint8ToBase64Mime(bytes: Uint8Array): string {
  const b64 = encodeBase64(bytes);
  return b64.replace(/.{76}(?=.)/g, "$&\r\n");
}

export function utf8StringToBase64Mime(s: string): string {
  return uint8ToBase64Mime(new TextEncoder().encode(s));
}

export interface MimeAttachment {
  filename: string;
  mime: string;
  base64Body: string;
}

/**
 * Assemble a complete RFC 822 MIME message string.
 * When there are no attachments a simple text/html message is returned;
 * otherwise a multipart/mixed message is built with each attachment as a part.
 */
export function buildGmailRawMessage(opts: {
  to: string;
  subject: string;
  htmlBody: string;
  attachments: MimeAttachment[];
}): string {
  const subjectLine = encodeRfc2047Subject(opts.subject);

  if (opts.attachments.length === 0) {
    const htmlB64 = utf8StringToBase64Mime(opts.htmlBody);
    return [
      "From: me",
      `To: ${opts.to}`,
      `Subject: ${subjectLine}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      htmlB64,
    ].join("\r\n");
  }

  const boundary = `sw_mix_${crypto.randomUUID().replace(/-/g, "")}`;
  const htmlB64 = utf8StringToBase64Mime(opts.htmlBody);
  const lines: string[] = [
    "From: me",
    `To: ${opts.to}`,
    `Subject: ${subjectLine}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlB64,
  ];

  for (const att of opts.attachments) {
    const safeName = att.filename.replace(/[\r\n"\\;]/g, "_").slice(0, 200);
    lines.push(
      `--${boundary}`,
      `Content-Type: ${att.mime}; name="${safeName}"`,
      `Content-Disposition: attachment; filename="${safeName}"`,
      "Content-Transfer-Encoding: base64",
      "",
      att.base64Body,
    );
  }
  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

/**
 * Gmail `messages.send` expects the full RFC 822 message as base64url (no padding).
 * Use std base64 on UTF-8 bytes so large MIME (resume + files) does not hit JS
 * `btoa` / spread limits.
 */
export function encodeRawForGmailApi(raw: string): string {
  const standard = encodeBase64(raw);
  return standard.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
