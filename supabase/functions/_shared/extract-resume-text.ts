/**
 * @file extract-resume-text — Download a resume file from Storage and extract
 * plain text (TXT / PDF / DOCX). Used when `resumes.extracted_text` was never
 * populated (upload-resume leaves PDF/DOCX text empty by design).
 *
 * PDF extraction uses Gemini (inline PDF) instead of pdfjs-dist — pdfjs pulls
 * Node's native `canvas` module, which Deno Edge rejects at deploy/runtime.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { BlobReader, ZipReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.17/index.js";

/** Parse bucket + object path from a Supabase Storage public/sign URL. */
export function storagePathFromResumeUrl(fileUrl: string): { bucket: string; path: string } | null {
  const parts = fileUrl.split("/storage/v1/object/");
  if (parts.length < 2) return null;
  const after = parts[1];
  const isPublic = after.startsWith("public/");
  const isSigned = after.startsWith("sign/");
  const trimmed = isPublic
    ? after.replace("public/", "")
    : isSigned
      ? after.replace("sign/", "").split("?")[0]
      : after;
  const segs = trimmed.split("/").filter(Boolean);
  if (segs.length < 2) return null;
  return { bucket: segs[0], path: segs.slice(1).join("/") };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Transcribe a PDF to plain text via Gemini Vision — same key + model waterfall
 * as analyze-resume-ats (resume optimizer). Avoids pdfjs/canvas on Deno Edge.
 */
async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // Resume optimizer uses GOOGLE_GEMINI_API_KEY; accept GEMINI_API_KEY as alias.
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GEMINI_API_KEY not configured. Re-upload as TXT/DOCX, or set the same Gemini key used by Resume Optimizer.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Same order as supabase/functions/analyze-resume-ats/index.ts tryGenerateContent
  const modelNames = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-pro"];
  const base64 = arrayBufferToBase64(buffer);
  const prompt = [
    {
      text:
        "Extract the full plain-text content of this resume PDF in reading order. " +
        "Preserve line breaks between sections/bullets. Return ONLY the resume text — " +
        "no commentary, no markdown fences.",
    },
    { inlineData: { mimeType: "application/pdf", data: base64 } },
  ];

  let lastErr: unknown;
  for (const modelName of modelNames) {
    try {
      console.log(`extract-resume-text: trying Gemini model ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = (await result.response).text()?.trim() ?? "";
      if (text) {
        console.log(`extract-resume-text: succeeded with ${modelName}, chars=${text.length}`);
        return text;
      }
      lastErr = new Error(`${modelName} returned empty text`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`extract-resume-text: ${modelName} failed:`, msg);
      lastErr = e;
      // Match resume optimizer: only fall through on model-not-found; rethrow auth/etc.
      if (!msg.includes("404") && !msg.includes("not found")) {
        throw e;
      }
    }
  }
  throw new Error(
    `Failed to extract text from PDF: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const blob = new Blob([buffer]);
  const zipReader = new ZipReader(new BlobReader(blob));
  try {
    const entries = await zipReader.getEntries();
    const documentEntry = entries.find((e) => e.filename === "word/document.xml");
    if (!documentEntry?.getData) {
      throw new Error("Invalid DOCX: word/document.xml not found");
    }
    const xmlText = await documentEntry.getData(new TextWriter());
    const matches = xmlText.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (!matches) return "";
    return matches
      .map((match) =>
        match
          .replace(/<w:t[^>]*>/, "")
          .replace(/<\/w:t>/, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'"),
      )
      .join(" ")
      .trim();
  } finally {
    await zipReader.close();
  }
}

/**
 * Resolve resume text: prefer cached `extracted_text`, otherwise download the
 * file and extract. When extraction succeeds, persists back to `resumes`.
 */
export async function resolveResumeText(
  supabase: SupabaseClient,
  resume: {
    id: string;
    extracted_text: string | null;
    file_url: string | null;
    file_type: string | null;
  },
): Promise<string> {
  const cached = resume.extracted_text?.trim() ?? "";
  if (cached) return cached;

  if (!resume.file_url) {
    throw new Error("This resume has no file attached — re-upload a PDF, DOCX, or TXT resume.");
  }

  const storage = storagePathFromResumeUrl(resume.file_url);
  let buffer: ArrayBuffer;
  if (storage) {
    const { data, error } = await supabase.storage.from(storage.bucket).download(storage.path);
    if (error || !data) {
      throw new Error(`Failed to download resume file: ${error?.message || "unknown error"}`);
    }
    buffer = await data.arrayBuffer();
  } else {
    const res = await fetch(resume.file_url);
    if (!res.ok) throw new Error(`Failed to fetch resume file: HTTP ${res.status}`);
    buffer = await res.arrayBuffer();
  }

  const type = (resume.file_type || "").toLowerCase();
  const urlLower = resume.file_url.toLowerCase();
  let text = "";

  if (type === "txt" || urlLower.endsWith(".txt")) {
    text = new TextDecoder().decode(buffer).trim();
  } else if (type === "docx" || type.includes("wordprocessingml") || urlLower.endsWith(".docx")) {
    text = await extractTextFromDocx(buffer);
  } else if (type === "pdf" || type.includes("pdf") || urlLower.endsWith(".pdf")) {
    text = await extractTextFromPdf(buffer);
  } else if (urlLower.endsWith(".docx")) {
    text = await extractTextFromDocx(buffer);
  } else {
    text = await extractTextFromPdf(buffer);
  }

  if (!text.trim()) {
    throw new Error(
      "Could not read text from this resume (it may be a scanned image). Re-upload a text-based PDF/DOCX or paste a TXT resume.",
    );
  }

  const { error: updateError } = await supabase
    .from("resumes")
    .update({ extracted_text: text })
    .eq("id", resume.id);
  if (updateError) {
    console.warn("resolveResumeText: failed to cache extracted_text:", updateError.message);
  }

  return text;
}
