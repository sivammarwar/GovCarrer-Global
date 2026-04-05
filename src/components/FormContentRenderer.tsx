import { useRef } from "react";
import { Download, Table } from "lucide-react";
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
  return typeof cell === 'string' ? cell : cell.text;
};

// Helper to get cell link
const getCellLink = (cell: string | FormCell): string | undefined => {
  return typeof cell === 'string' ? undefined : cell.linkUrl;
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
      
      // Use lower scale (1 instead of 2) and JPEG compression for smaller file size
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
      });

      // Use JPEG with 0.7 quality instead of PNG for much smaller file size
      const imgData = canvas.toDataURL("image/jpeg", 0.7);
      
      // Create PDF with compression
      const pdf = new jsPDF("p", "mm", "a4", true); // true = compress
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate ratio to fit content to page width
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      let heightLeft = scaledHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      // Add more pages if content is long
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      // Save the PDF
      pdf.save(`${title?.replace(/\s+/g, "_") || "content"}_${new Date().toISOString().split("T")[0]}.pdf`);
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

      {/* Rendered Content */}
      <div ref={contentRef} className="space-y-8">
        {title && (
          <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-primary pb-3">
            {title}
          </h1>
        )}

        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Table className="w-5 h-5 text-primary" />
              {section.title}
            </h2>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {section.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-left font-medium text-slate-700 border-b border-slate-200"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {section.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={section.columns.length}
                        className="px-4 py-8 text-center text-slate-500 italic"
                      >
                        No data added yet
                      </td>
                    </tr>
                  ) : (
                    section.rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                        {row.cells.map((cell, idx) => {
                          const text = getCellText(cell);
                          const link = getCellLink(cell);
                          return (
                            <td key={idx} className="px-4 py-3 text-slate-700">
                              {link ? (
                                <a 
                                  href={link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-medium"
                                >
                                  {text || <span className="text-slate-400">-</span>}
                                </a>
                              ) : (
                                text || <span className="text-slate-400">-</span>
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
