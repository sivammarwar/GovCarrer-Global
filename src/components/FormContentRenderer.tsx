import { useRef } from "react";
import {
  Download, ExternalLink, Calendar, CheckCircle, HelpCircle,
  FileText, Link2, Users, ClipboardList, CreditCard, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormSection } from "@/components/admin/AIContentGenerator";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface FormCell { text: string; linkUrl?: string; }

const getCellText = (cell: string | FormCell): string =>
  typeof cell === "string" ? cell : cell.text;
const getCellLink = (cell: string | FormCell): string | undefined =>
  typeof cell === "string" ? undefined : cell.linkUrl;

const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  "Important Dates":    { icon: <Calendar className="w-3 h-3" />,      color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-300" },
  "Eligibility Criteria": { icon: <CheckCircle className="w-3 h-3" />, color: "text-green-700",  bg: "bg-green-50",  border: "border-green-300" },
  "Application Fee":    { icon: <CreditCard className="w-3 h-3" />,    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" },
  "Important Links":    { icon: <Link2 className="w-3 h-3" />,         color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-300" },
  "How to Apply":       { icon: <ClipboardList className="w-3 h-3" />, color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-300" },
  "Selection Process":  { icon: <Users className="w-3 h-3" />,         color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-300" },
  "Documents Required": { icon: <FileText className="w-3 h-3" />,      color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-300" },
  "FAQs":               { icon: <HelpCircle className="w-3 h-3" />,    color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300" },
};
const DEFAULT_META = { icon: <BookOpen className="w-3 h-3" />, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-300" };

// ── Section renderers ─────────────────────────────────────────────────────────

function DatesSection({ section }: { section: FormSection }) {
  return (
    <div className="divide-y divide-slate-100">
      {section.rows.map((row) => {
        const event  = getCellText(row.cells[0] ?? "");
        const date   = getCellText(row.cells[1] ?? "");
        const detail = getCellText(row.cells[2] ?? "");
        const link   = getCellLink(row.cells[1] ?? "") || getCellLink(row.cells[0] ?? "");
        return (
          <div key={row.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-800 leading-snug">{event}</p>
              {detail && <p className="text-[10px] text-slate-500 mt-0.5">{detail}</p>}
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-blue-600 hover:underline">{date || "View"}</a>
              ) : (
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">{date}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LinksSection({ section }: { section: FormSection }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {section.rows.map((row) => {
        const label = getCellText(row.cells[0] ?? "");
        const link  = getCellLink(row.cells[1] ?? "") || getCellText(row.cells[1] ?? "");
        const desc  = getCellText(row.cells[2] ?? "");
        if (!label) return null;
        return (
          <a key={row.id} href={link || "#"} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-400 transition-colors group ${!link ? "pointer-events-none opacity-60" : ""}`}>
            <ExternalLink className="w-3 h-3 text-purple-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-800 truncate group-hover:text-purple-700">{label}</p>
              {desc && <p className="text-[10px] text-slate-400 truncate">{desc}</p>}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function StepsSection({ section }: { section: FormSection }) {
  return (
    <ol className="space-y-2">
      {section.rows.map((row, idx) => {
        const step   = getCellText(row.cells[0] ?? "");
        const action = getCellText(row.cells[1] ?? "");
        const detail = getCellText(row.cells[2] ?? "");
        const link   = getCellLink(row.cells[1] ?? "") || getCellLink(row.cells[2] ?? "");
        return (
          <li key={row.id} className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-800">{step || action}</p>
              {action && step && (
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">{action}</a> : action}
                </p>
              )}
              {detail && <p className="text-[10px] text-slate-500 mt-0.5">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function FAQSection({ section }: { section: FormSection }) {
  return (
    <div className="space-y-2">
      {section.rows.map((row) => {
        const q = getCellText(row.cells[0] ?? "");
        const a = getCellText(row.cells[1] ?? "");
        if (!q) return null;
        return (
          <div key={row.id} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-900 mb-0.5">Q: {q}</p>
            <p className="text-[11px] text-slate-700">A: {a || "—"}</p>
          </div>
        );
      })}
    </div>
  );
}

function DocumentsSection({ section }: { section: FormSection }) {
  return (
    <ul className="space-y-1.5">
      {section.rows.map((row) => {
        const doc       = getCellText(row.cells[0] ?? "");
        // cells[1] = Specification — hidden per requirement
        const mandatory = getCellText(row.cells[2] ?? "");
        if (!doc) return null;
        const isMandatory = mandatory.toLowerCase().includes("mandatory") || mandatory.toLowerCase() === "yes";
        return (
          <li key={row.id} className="flex items-start gap-1.5">
            <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isMandatory ? "text-rose-500" : "text-slate-400"}`} />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-medium text-slate-800">{doc}</span>
            </div>
            {mandatory && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${isMandatory ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                {mandatory}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function GenericSection({ section }: { section: FormSection }) {
  const isTwoCol = section.columns.length === 2;
  if (isTwoCol) {
    return (
      <dl className="divide-y divide-slate-100">
        {section.rows.map((row) => {
          const key     = getCellText(row.cells[0] ?? "");
          const val     = row.cells[1] ?? "";
          const valText = getCellText(val);
          const valLink = getCellLink(val);
          if (!key) return null;
          return (
            <div key={row.id} className="flex gap-3 py-1.5 first:pt-0 last:pb-0">
              <dt className="w-2/5 text-[11px] font-medium text-slate-500 flex-shrink-0">{key}</dt>
              <dd className="flex-1 text-[11px] text-slate-800">
                {valLink ? <a href={valLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{valText || "Link"}</a> : valText || "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }
  return (
    <table className="w-full text-[11px] table-fixed">
      <thead>
        <tr className="border-b border-slate-200">
          {section.columns.map((col, i) => (
            <th key={i} className="py-1.5 pr-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {section.rows.map((row) => (
          <tr key={row.id}>
            {row.cells.map((cell, i) => {
              const text = getCellText(cell);
              const link = getCellLink(cell);
              return (
                <td key={i} className="py-1.5 pr-3 text-slate-700 break-words align-top">
                  {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{text || "Link"}</a> : text || <span className="text-slate-400">—</span>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Sections where we strip specific columns before rendering:
// - Eligibility Criteria: hide col 2 (Details)
// - Application Fee: hide col 2 (Payment Mode)
// - Selection Process: hide col 2 (Weightage)
// Strategy: pass a trimmed copy of the section with only the columns/cells we want shown.
function trimToTwoCols(section: FormSection): FormSection {
  return {
    ...section,
    columns: section.columns.slice(0, 2),
    rows: section.rows.map((row) => ({ ...row, cells: row.cells.slice(0, 2) })),
  };
}

function SectionBody({ section }: { section: FormSection }) {
  switch (section.title) {
    case "Important Dates":      return <DatesSection section={section} />;
    case "Important Links":      return <LinksSection section={section} />;
    case "How to Apply":         return <StepsSection section={section} />;
    case "FAQs":                 return <FAQSection section={section} />;
    case "Documents Required":   return <DocumentsSection section={section} />;
    // Hide the 3rd column for these three sections
    case "Eligibility Criteria":
    case "Application Fee":
    case "Selection Process":    return <GenericSection section={trimToTwoCols(section)} />;
    default:                     return <GenericSection section={section} />;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface FormContentRendererProps {
  sections: FormSection[] | null;
  title?: string;
}

export function FormContentRenderer({ sections, title }: FormContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const activeSections = (sections ?? []).filter((s) => s.rows.length > 0);
  if (activeSections.length === 0) return null;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    try {
      const el = contentRef.current;

      // ── 1. Clone the element off-screen at a fixed wide width ──────────────
      // This ensures consistent, high-quality capture regardless of screen size
      const RENDER_WIDTH = 900; // px — wide enough for full content, fits A4 nicely

      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.cssText = `
        position: fixed;
        top: -99999px;
        left: -99999px;
        width: ${RENDER_WIDTH}px;
        background: #ffffff;
        padding: 32px;
        box-sizing: border-box;
        font-size: 13px;
        line-height: 1.6;
      `;
      document.body.appendChild(clone);

      // Wait a tick for layout to settle
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(clone, {
        scale: 3,           // High DPI → sharp text & crisp borders
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: RENDER_WIDTH + 64, // include padding
        windowWidth: RENDER_WIDTH + 64,
      });

      document.body.removeChild(clone);

      // ── 2. Fit the entire canvas onto one or more A4 pages ─────────────────
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const PAGE_W = pdf.internal.pageSize.getWidth();   // 210 mm
      const PAGE_H = pdf.internal.pageSize.getHeight();  // 297 mm
      const MARGIN = 8; // mm on each side

      const usableW = PAGE_W - MARGIN * 2;
      const usableH = PAGE_H - MARGIN * 2;

      // How many mm per canvas pixel
      const mmPerPx = usableW / canvas.width;
      const totalContentH = canvas.height * mmPerPx;

      // Pixels that fit in one page height
      const pxPerPage = Math.floor(usableH / mmPerPx);

      let yOffset = 0; // pixels consumed so far
      let pageIndex = 0;

      while (yOffset < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        // Slice this page's strip from the canvas
        const sliceH = Math.min(pxPerPage, canvas.height - yOffset);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, -yOffset);

        const imgData = pageCanvas.toDataURL("image/png"); // PNG = lossless, sharp
        pdf.addImage(imgData, "PNG", MARGIN, MARGIN, usableW, sliceH * mmPerPx, undefined, "FAST");

        yOffset += sliceH;
        pageIndex++;
      }

      pdf.save(`${title?.replace(/\s+/g, "_") || "content"}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5 text-xs h-7 px-3">
          <Download className="w-3 h-3" />
          Download PDF
        </Button>
      </div>

      <div ref={contentRef} className="space-y-4 bg-white">
        {activeSections.map((section) => {
          const meta = SECTION_META[section.title] ?? DEFAULT_META;
          return (
            <section key={section.id}>
              <div className={`flex items-center gap-1.5 mb-2 pb-1.5 border-b-2 ${meta.border}`}>
                <span className={`${meta.color} ${meta.bg} p-1 rounded`}>{meta.icon}</span>
                <h2 className={`text-xs font-bold ${meta.color}`}>{section.title}</h2>
              </div>
              <SectionBody section={section} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
