import { useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormSection } from "@/components/admin/AIContentGenerator";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface FormCell {
  text: string;
  linkUrl?: string;
}

// Helper to get cell text
const getCellText = (cell: string | FormCell): string => {
  return typeof cell === "string" ? cell : cell.text;
};

// Helper to get cell link
const getCellLink = (cell: string | FormCell): string | undefined => {
  return typeof cell === "string" ? undefined : cell.linkUrl;
};

interface FormContentRendererProps {
  sections: FormSection[] | null;
  title?: string;
}

export function FormContentRenderer({ sections, title }: FormContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!sections || sections.length === 0) {
    return null;
  }

  const handleDownload = async () => {
    if (!contentRef.current) return;

    try {
      const element = contentRef.current;

      // --- FIX: Temporarily expand element to its full scrollable width so the
      //     canvas captures ALL content, not just the visible viewport slice. ---
      const originalStyle = {
        width: element.style.width,
        maxWidth: element.style.maxWidth,
        overflow: element.style.overflow,
        position: element.style.position,
      };

      // Remove width constraint so every table column is visible
      element.style.width = "auto";
      element.style.maxWidth = "none";
      element.style.overflow = "visible";
      element.style.position = "relative";

      // Also fix inner tables temporarily
      const tables = element.querySelectorAll<HTMLElement>("table");
      const tableOriginals: { el: HTMLElement; style: string }[] = [];
      tables.forEach((t) => {
        tableOriginals.push({ el: t, style: t.style.cssText });
        t.style.width = "100%";
        t.style.tableLayout = "auto";
        t.style.wordBreak = "break-word";
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
        // Capture the full scrollable area
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Restore styles
      element.style.width = originalStyle.width;
      element.style.maxWidth = originalStyle.maxWidth;
      element.style.overflow = originalStyle.overflow;
      element.style.position = originalStyle.position;
      tableOriginals.forEach(({ el, style }) => (el.style.cssText = style));

      const imgData = canvas.toDataURL("image/jpeg", 0.85);

      const pdf = new jsPDF("p", "mm", "a4", true);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const ratio = pdfWidth / canvas.width;
      const scaledHeight = canvas.height * ratio;

      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      pdf.save(
        `${title?.replace(/\s+/g, "_") || "content"}_${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download as PDF
        </Button>
      </div>

      {/* Rendered Content — ref wraps only the printable area */}
      <div ref={contentRef} className="space-y-10 bg-white">
        {title && (
          <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-primary pb-3">
            {title}
          </h1>
        )}

        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
            {/* Section heading — looks like a page heading, not a form label */}
            <h2 className="text-base font-semibold text-slate-800 uppercase tracking-wide text-primary">
              {section.title}
            </h2>

            {/* 
              FIX: Remove overflow-x-auto wrapper.
              Use w-full + table-fixed + break-words so the table
              stays within the page width on all screen sizes.
            */}
            <div className="rounded-lg border border-slate-200 w-full">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-slate-50">
                  <tr>
                    {section.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-left font-semibold text-slate-600 border-b border-slate-200 break-words"
                        // Distribute columns evenly; first col slightly wider for label tables
                        style={{
                          width:
                            section.columns.length === 2 && idx === 0
                              ? "40%"
                              : `${100 / section.columns.length}%`,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {section.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={section.columns.length}
                        className="px-4 py-8 text-center text-slate-400 italic"
                      >
                        No data available
                      </td>
                    </tr>
                  ) : (
                    section.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        {row.cells.map((cell, idx) => {
                          const text = getCellText(cell);
                          const link = getCellLink(cell);
                          return (
                            <td
                              key={idx}
                              className="px-4 py-3 text-slate-700 break-words align-top"
                            >
                              {link ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-medium"
                                >
                                  {text || <span className="text-slate-400">—</span>}
                                </a>
                              ) : (
                                text || <span className="text-slate-400">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
