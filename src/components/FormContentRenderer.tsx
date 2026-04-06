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

const getCellText = (cell: string | FormCell): string => {
  return typeof cell === "string" ? cell : cell.text;
};

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

      // Temporarily expand to full content width so canvas captures everything
      const originalStyle = {
        width: element.style.width,
        maxWidth: element.style.maxWidth,
        overflow: element.style.overflow,
        position: element.style.position,
      };

      element.style.width = "auto";
      element.style.maxWidth = "none";
      element.style.overflow = "visible";
      element.style.position = "relative";

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
    <div className="space-y-3 text-foreground">
      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex items-center gap-2 text-xs h-7 px-3"
        >
          <Download className="w-3 h-3" />
          Download as PDF
        </Button>
      </div>

      {/* Printable content */}
      <div ref={contentRef} className="space-y-4 bg-white">
        {title && (
          <h1 className="text-sm font-bold text-slate-900 border-b border-primary pb-1">
            {title}
          </h1>
        )}

        {sections.map((section) => (
          <div key={section.id} className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">
              {section.title}
            </h2>

            <div className="rounded border border-slate-200 w-full">
              <table className="w-full text-xs table-fixed">
                <thead className="bg-slate-50">
                  <tr>
                    {section.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-1.5 text-left font-semibold text-slate-600 border-b border-slate-200 break-words"
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
                        className="px-2 py-3 text-center text-slate-400 italic"
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
                              className="px-2 py-1.5 text-slate-700 break-words align-top"
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
