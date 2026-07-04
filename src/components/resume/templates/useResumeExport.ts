/**
 * @fileoverview Hook for downloading a rendered resume template as HTML or PDF.
 */

import { useState } from "react";
import { toast } from "sonner";
import { ResumeTemplate } from "./templateRegistry";

function withTimeout<T>(promise: Promise<T>, ms: number, message = "Operation timed out"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function downloadHtmlBlob(html: string, filenameBase: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useResumeExport() {
  const [isExporting, setIsExporting] = useState(false);

  const downloadHtml = (template: ResumeTemplate, html: string) => {
    try {
      const filenameBase = `resume_${template.id}_${new Date().toISOString().split("T")[0]}`;
      downloadHtmlBlob(html, filenameBase);
      toast.success(`Downloaded ${template.name} template!`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download template");
    }
  };

  const downloadPdf = async (template: ResumeTemplate, html: string) => {
    setIsExporting(true);
    const filenameBase = `resume_${template.id}_${new Date().toISOString().split("T")[0]}`;
    let element: HTMLDivElement | null = null;
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      element = document.createElement("div");
      element.innerHTML = html;
      // Hide the element but keep it in DOM for rendering
      element.style.position = "absolute";
      element.style.left = "-9999px";
      document.body.appendChild(element);

      const opt = {
        margin: 0.5,
        filename: `${filenameBase}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      await withTimeout(html2pdf().set(opt).from(element).save(), 20000, "PDF generation timed out");
      document.body.removeChild(element);
      toast.success(`Downloaded ${template.name} as PDF!`);
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError);
      toast.error("Failed to generate PDF. Downloading as HTML instead.");
      if (element && document.body.contains(element)) document.body.removeChild(element);
      downloadHtmlBlob(html, filenameBase);
    } finally {
      setIsExporting(false);
    }
  };

  return { downloadHtml, downloadPdf, isExporting };
}
