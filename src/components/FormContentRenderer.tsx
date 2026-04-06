import { useRef } from "react";
import { Download, ExternalLink, Calendar, CheckCircle, HelpCircle, FileText, Link2, Users, ClipboardList, CreditCard, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormSection } from "@/components/admin/AIContentGenerator";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface FormCell {
  text: string;
  linkUrl?: string;
}

const getCellText = (cell: string | FormCell): string =>
  typeof cell === "string" ? cell : cell.text;

const getCellLink = (cell: string | FormCell): string | undefined =>
  typeof cell === "string" ? undefined : cell.linkUrl;

// Map section titles to icons and accent colors
const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  "Important Dates": {
    icon: <Calendar className="w-4 h-4" />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  "Eligibility Criteria": {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  "Application Fee": {
    icon: <CreditCard className="w-4 h-4" />,
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  "Important Links": {
    icon: <Link2 className="w-4 h-4" />,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  "How to Apply": {
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
  },
  "Selection Process": {
    icon: <Users className="w-4 h-4" />,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  "Documents Required": {
    icon: <FileText className="w-4 h-4" />,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  FAQs: {
    icon: <HelpCircle className="w-4 h-4" />,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

const DEFAULT_META = {
  icon: <BookOpen className="w-4 h-4" />,
  color: "text-slate-700",
  bg: "bg-slate-50",
  border: "border-slate-200",
};

// ── Special renderers per section type ──────────────────────────────────────

/** Important Dates → timeline-style two-column layout */
function DatesSection({ section }: { section: FormSection }) {
  if (section.rows.length === 0) return null;
  return (
    <div className="divide-y divide-slate-100">
      {section.rows.map((row) => {
        const event = getCellText(row.cells[0] ?? "");
        const date = getCellText(row.cells[1] ?? "");
        const detail = getCellText(row.cells[2] ?? "");
        const link = getCellLink(row.cells[1] ?? "") || getCellLink(row.cells[0] ?? "");
        return (
          <div key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-2" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-snug">{event}</p>
              {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                  {date || "View"}
                </a>
              ) : (
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{date}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Important Links → card-style clickable links */
function LinksSection({ section }: { section: FormSection }) {
  if (section.rows.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {section.rows.map((row) => {
        const label = getCellText(row.cells[0] ?? "");
        const link = getCellLink(row.cells[1] ?? "") || getCellText(row.cells[1] ?? "");
        const desc = getCellText(row.cells[2] ?? "");
        if (!label) return null;
        return (
          <a
            key={row.id}
            href={link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-400 transition-colors group ${!link ? "pointer-events-none opacity-60" : ""}`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-purple-700">{label}</p>
              {desc && <p className="text-xs text-slate-400 truncate">{desc}</p>}
            </div>
          </a>
        );
      })}
    </div>
  );
}

/** How to Apply → numbered steps */
function StepsSection({ section }: { section: FormSection }) {
  if (section.rows.length === 0) return null;
  return (
    <ol className="space-y-3">
      {section.rows.map((row, idx) => {
        const step = getCellText(row.cells[0] ?? "");
        const action = getCellText(row.cells[1] ?? "");
        const detail = getCellText(row.cells[2] ?? "");
        const link = getCellLink(row.cells[1] ?? "") || getCellLink(row.cells[2] ?? "");
        return (
          <li key={row.id} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{step || action}</p>
              {action && step && (
                <p className="text-sm text-slate-600 mt-0.5">
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
                      {action}
                    </a>
                  ) : (
                    action
                  )}
                </p>
              )}
              {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** FAQs → accordion-style Q&A */
function FAQSection({ section }: { section: FormSection }) {
  if (section.rows.length === 0) return null;
  return (
    <div className="space-y-3">
      {section.rows.map((row) => {
        const question = getCellText(row.cells[0] ?? "");
        const answer = getCellText(row.cells[1] ?? "");
        if (!question) return null;
        return (
          <div key={row.id} className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900 mb-1">Q: {question}</p>
            <p className="text-sm text-slate-700">A: {answer || "—"}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Documents Required → checklist */
function DocumentsSection({ section }: { section: FormSection }) {
  if (section.rows.length === 0) return null;
  return (
    <ul className="space-y-2">
      {section.rows.map((row) => {
        const doc = getCellText(row.cells[0] ?? "");
        const spec = getCellText(row.cells[1] ?? "");
        const mandatory = getCellText(row.cells[2] ?? "");
        if (!doc) return null;
        const isMandatory = mandatory.toLowerCase().includes("mandatory") || mandatory.toLowerCase() === "yes";
        return (
          <li key={row.id} className="flex items-start gap-2">
            <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMandatory ? "text-rose-500" : "text-slate-400"}`} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-800">{doc}</span>
              {spec && <span className="text-sm text-slate-500"> — {spec}</span>}
            </div>
            {mandatory && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isMandatory ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                {mandatory}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Generic fallback → clean key-value or multi-column prose */
function GenericSection({ section }: { section: FormSection }) {
  if (section.rows.length === 0) return null;
  const isTwoCol = section.columns.length === 2;

  if (isTwoCol) {
    return (
      <dl className="divide-y divide-slate-100">
        {section.rows.map((row) => {
          const key = getCellText(row.cells[0] ?? "");
          const val = row.cells[1] ?? "";
          const valText = getCellText(val);
          const valLink = getCellLink(val);
          if (!key) return null;
          return (
            <div key={row.id} className="flex gap-4 py-2.5 first:pt-0 last:pb-0">
              <dt className="w-2/5 text-sm font-medium text-slate-600 flex-shrink-0">{key}</dt>
              <dd className="flex-1 text-sm text-slate-800">
                {valLink ? (
                  <a href={valLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {valText || "Link"}
                  </a>
                ) : (
                  valText || "—"
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-slate-200">
            {section.columns.map((col, i) => (
              <th key={i} className="py-2 pr-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {col}
              </th>
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
                  <td key={i} className="py-2.5 pr-4 text-slate-700 break-words align-top">
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                        {text || "Link"}
                      </a>
                    ) : (
                      text || <span className="text-slate-400">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pick the right renderer per section title ────────────────────────────────
function SectionBody({ section }: { section: FormSection }) {
  switch (section.title) {
    case "Important Dates":    return <DatesSection section={section} />;
    case "Important Links":    return <LinksSection section={section} />;
    case "How to Apply":       return <StepsSection section={section} />;
    case "FAQs":               return <FAQSection section={section} />;
    case "Documents Required": return <DocumentsSection section={section} />;
    default:                   return <GenericSection section={section} />;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
interface FormContentRendererProps {
  sections: FormSection[] | null;
  title?: string;
}

export function FormContentRenderer({ sections, title }: FormContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter out sections with no rows
  const activeSections = (sections ?? []).filter((s) => s.rows.length > 0);

  if (activeSections.length === 0) return null;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    try {
      const el = contentRef.current;

      // Expand to full content width before capture
      const saved = { w: el.style.width, mw: el.style.maxWidth, ov: el.style.overflow };
      el.style.width = "auto";
      el.style.maxWidth = "none";
      el.style.overflow = "visible";

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      el.style.width = saved.w;
      el.style.maxWidth = saved.mw;
      el.style.overflow = saved.ov;

      const imgData = canvas.toDataURL("image/jpeg", 0.88);
      const pdf = new jsPDF("p", "mm", "a4", true);
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = pw / canvas.width;
      const sh = canvas.height * ratio;

      let left = sh;
      let pos = 0;
      pdf.addImage(imgData, "JPEG", 0, pos, pw, sh, undefined, "FAST");
      left -= ph;
      while (left > 0) {
        pos = left - sh;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, pw, sh, undefined, "FAST");
        left -= ph;
      }

      pdf.save(`${title?.replace(/\s+/g, "_") || "content"}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Download button */}
      <div className="flex justify-end">
        <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </Button>
      </div>

      {/* Page content */}
      <div ref={contentRef} className="space-y-6 bg-white">
        {activeSections.map((section) => {
          const meta = SECTION_META[section.title] ?? DEFAULT_META;
          return (
            <section key={section.id}>
              {/* Section heading */}
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${meta.border}`}>
                <span className={`${meta.color} ${meta.bg} p-1.5 rounded-md`}>
                  {meta.icon}
                </span>
                <h2 className={`text-base font-bold ${meta.color}`}>{section.title}</h2>
              </div>

              {/* Section body — rendered as appropriate content type */}
              <SectionBody section={section} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
