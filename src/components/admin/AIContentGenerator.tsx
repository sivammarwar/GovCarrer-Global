// src/components/admin/AIContentGenerator.tsx
// STREAMING: fields fill in live token-by-token as Grok generates
// OPTIMIZED: meta + content stream simultaneously; progress shows both phases live
// FIX 1: metaFinalSet ref prevents onStreamDelta from blanking fields after onPhaseComplete
// FIX 2: setSEO uses a ref-backed updater to avoid stale closure — fields now display correctly
// FIX 3: onGenerated only fires when user explicitly clicks "Apply to Form", not on auto-complete
// FIX 4: filledFields counts only fields meaningful to Grok (not every key including empty ones)
// FIX 5: formData passed through useGrokAI now normalised inside the hook — no extra mapping needed

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useGrokAI, GrokFormData, ContentType } from "@/hooks/useGrokAI";
import {
  Sparkles, Copy, Check, RefreshCw, Eye, Code2,
  Zap, AlertCircle, Info, Key, ArrowRight, Plus, Trash2, Download, Link
} from "lucide-react";

// ─────────────────────────────────────────────────────
// Streaming cursor blink effect
// ─────────────────────────────────────────────────────
function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 align-middle animate-pulse"
      style={{ animationDuration: "0.7s" }}
    />
  );
}

// ─────────────────────────────────────────────────────
// Rich WYSIWYG Editor — supports streaming HTML injection
// ─────────────────────────────────────────────────────
interface RichEditorProps {
  value: string;
  onChange: (val: string) => void;
  streaming?: boolean;
}

function RichEditor({ value, onChange, streaming = false }: RichEditorProps) {
  const [mode, setMode] = useState<"preview" | "source">("preview");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streaming && previewRef.current && mode === "preview") {
      previewRef.current.innerHTML = value || "";
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [value, streaming, mode]);

  const handlePreviewBlur = useCallback(() => {
    if (previewRef.current && !streaming) onChange(previewRef.current.innerHTML);
  }, [onChange, streaming]);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (previewRef.current) onChange(previewRef.current.innerHTML);
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${streaming ? "border-violet-300 dark:border-violet-700 shadow-sm shadow-violet-100 dark:shadow-violet-900" : ""}`}>
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 border-b flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground mr-2">PAGE CONTENT</span>
        {streaming && (
          <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            Streaming...
          </span>
        )}
        {!streaming && mode === "preview" && (
          <>
            <button onClick={() => execCmd("bold")} className="px-2 py-1 text-xs font-bold rounded hover:bg-accent">B</button>
            <button onClick={() => execCmd("italic")} className="px-2 py-1 text-xs italic rounded hover:bg-accent">I</button>
            <button onClick={() => execCmd("underline")} className="px-2 py-1 text-xs underline rounded hover:bg-accent">U</button>
            <span className="w-px h-4 bg-border mx-1" />
            <button onClick={() => execCmd("formatBlock", "h2")} className="px-2 py-1 text-xs rounded hover:bg-accent">H2</button>
            <button onClick={() => execCmd("formatBlock", "h3")} className="px-2 py-1 text-xs rounded hover:bg-accent">H3</button>
            <button onClick={() => execCmd("insertUnorderedList")} className="px-2 py-1 text-xs rounded hover:bg-accent">• List</button>
            <button onClick={() => execCmd("insertOrderedList")} className="px-2 py-1 text-xs rounded hover:bg-accent">1. List</button>
            <span className="w-px h-4 bg-border mx-1" />
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${mode === "preview" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
          <button
            onClick={() => setMode("source")}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${mode === "source" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            <Code2 className="w-3 h-3" /> HTML
          </button>
        </div>
      </div>

      {mode === "source" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={streaming}
          className="w-full min-h-[400px] p-4 font-mono text-xs bg-slate-950 text-sky-300 resize-y outline-none border-none"
          placeholder="HTML content will stream in here..."
          spellCheck={false}
        />
      ) : (
        <div
          ref={previewRef}
          contentEditable={!streaming}
          suppressContentEditableWarning
          onBlur={handlePreviewBlur}
          {...(!streaming && {
            dangerouslySetInnerHTML: {
              __html: value || `<p style="color:#94a3b8;font-style:italic;padding:16px">Click "Generate with Grok AI" above to auto-generate content, or type here directly...</p>`
            }
          })}
          className="min-h-[400px] max-h-[600px] overflow-y-auto p-5 outline-none prose prose-sm max-w-none"
          style={{ fontFamily: "Georgia, serif", lineHeight: 1.7 }}
        />
      )}

      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t text-xs text-muted-foreground">
        <span>{streaming ? "⚡ Receiving content..." : mode === "preview" ? "Click text to edit directly" : "Edit raw HTML"}</span>
        <span>{value.length.toLocaleString()} chars</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Streaming input — shows live typing effect with cursor
// ─────────────────────────────────────────────────────
function StreamingInput({
  value, onChange, streaming, maxChars, label, hint, multiline = false
}: {
  value: string; onChange: (v: string) => void; streaming?: boolean;
  maxChars?: number; label: string; hint?: string; multiline?: boolean;
}) {
  const len = (value || "").length;
  const over = maxChars && len > maxChars;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          {label}
          {streaming && (
            <span className="text-xs text-violet-500 font-normal flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-violet-500 animate-ping" />
              streaming
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <CopyButton value={value} />
          {maxChars && (
            <span className={`text-xs font-mono ${over ? "text-destructive font-bold" : "text-muted-foreground"}`}>
              {len}/{maxChars}
            </span>
          )}
        </div>
      </div>

      <div className={`relative rounded-md transition-all ${streaming ? "ring-1 ring-violet-400 dark:ring-violet-600" : ""}`}>
        {multiline ? (
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={streaming}
            rows={3}
            className={`text-sm resize-none ${over ? "border-destructive" : ""} ${streaming ? "bg-violet-50/50 dark:bg-violet-950/30" : ""}`}
          />
        ) : (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={streaming}
            className={`text-sm ${over ? "border-destructive" : ""} ${streaming ? "bg-violet-50/50 dark:bg-violet-950/30" : ""}`}
          />
        )}
        {streaming && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <StreamingCursor />
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Fixed Form Builder — predefined sections with fixed columns
// ─────────────────────────────────────────────────────
interface FormBuilderProps {
  sections: FormSection[];
  onChange: (sections: FormSection[]) => void;
}

// Predefined sections with fixed columns based on standard government exam format
const DEFAULT_SECTIONS: Omit<FormSection, "id" | "order">[] = [
  {
    title: "Important Dates",
    columns: ["Event", "Date", "Details"],
    rows: [],
  },
  {
    title: "Eligibility Criteria",
    columns: ["Criteria", "Requirement", "Details"],
    rows: [],
  },
  {
    title: "Application Fee",
    columns: ["Category", "Fee Amount", "Payment Mode"],
    rows: [],
  },
  {
    title: "Important Links",
    columns: ["Resource", "Link", "Description"],
    rows: [],
  },
  {
    title: "How to Apply",
    columns: ["Step", "Action", "Details"],
    rows: [],
  },
  {
    title: "Selection Process",
    columns: ["Stage", "Description", "Weightage"],
    rows: [],
  },
  {
    title: "Documents Required",
    columns: ["Document", "Specification", "Mandatory/Optional"],
    rows: [],
  },
  {
    title: "FAQs",
    columns: ["Question", "Answer", "Category"],
    rows: [],
  },
];

// Initialize sections with IDs if empty
function initializeSections(existingSections: FormSection[] | undefined): FormSection[] {
  if (existingSections && existingSections.length > 0) {
    // If we have existing data, use it but ensure all default sections exist
    const existingMap = new Map(existingSections.map(s => [s.title, s]));
    return DEFAULT_SECTIONS.map((defaultSec, index) => {
      const existing = existingMap.get(defaultSec.title);
      return {
        id: existing?.id || crypto.randomUUID(),
        title: defaultSec.title,
        columns: defaultSec.columns,
        rows: existing?.rows || [],
        order: index,
      };
    });
  }
  // Create fresh sections with IDs
  return DEFAULT_SECTIONS.map((sec, index) => ({
    id: crypto.randomUUID(),
    ...sec,
    order: index,
  }));
}

function FormBuilder({ sections, onChange }: FormBuilderProps) {
  // Initialize on first render if empty
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (!initialized && sections.length === 0) {
      onChange(initializeSections(undefined));
      setInitialized(true);
    }
  }, [sections.length, onChange, initialized]);

  const updateSection = (id: string, updates: Partial<FormSection>) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const addRow = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const newRow: FormRow = {
      id: crypto.randomUUID(),
      cells: new Array(section.columns.length).fill(""),
    };
    updateSection(sectionId, { rows: [...section.rows, newRow] });
  };

  const updateCell = (sectionId: string, rowId: string, colIndex: number, value: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const newRows = section.rows.map((r) =>
      r.id === rowId
        ? { ...r, cells: r.cells.map((c, i) => (i === colIndex ? value : c)) }
        : r
    );
    updateSection(sectionId, { rows: newRows });
  };

  const updateCellLink = (sectionId: string, rowId: string, colIndex: number, linkUrl: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const newRows = section.rows.map((r) =>
      r.id === rowId
        ? { 
            ...r, 
            cells: r.cells.map((c, i) => {
              if (i !== colIndex) return c;
              // Convert to object format if it has a link
              const text = typeof c === 'string' ? c : c.text;
              return linkUrl ? { text, linkUrl } : text;
            }) 
          }
        : r
    );
    updateSection(sectionId, { rows: newRows });
  };

  const getCellText = (cell: string | FormCell): string => {
    return typeof cell === 'string' ? cell : cell.text;
  };

  const getCellLink = (cell: string | FormCell): string | undefined => {
    return typeof cell === 'string' ? undefined : cell.linkUrl;
  };

  const deleteRow = (sectionId: string, rowId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { rows: section.rows.filter((r) => r.id !== rowId) });
  };

  const clearAllSections = () => {
    if (confirm("Are you sure you want to clear all data? This will remove all rows from all sections.")) {
      onChange(sections.map(s => ({ ...s, rows: [] })));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with clear all button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add rows to each section. Columns are fixed based on standard format.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAllSections}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Clear All
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Loading sections...</p>
        </div>
      ) : (
        sections.map((section, index) => (
          <Card key={section.id} className="border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                <Badge variant="outline" className="text-xs ml-auto">
                  {section.rows.length} row{section.rows.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Column Headers (fixed, not editable) */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                {section.columns.map((col, colIndex) => (
                  <div key={colIndex} className="flex-1 text-xs font-medium text-muted-foreground">
                    {col}
                  </div>
                ))}
                <div className="w-8"></div> {/* Space for delete button */}
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {section.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">
                    No data added yet. Click "Add Row" below.
                  </p>
                ) : (
                  section.rows.map((row) => (
                    <div key={row.id} className="space-y-2 p-3 bg-muted/20 rounded-lg">
                      {/* Cell Inputs */}
                      <div className="flex items-start gap-2">
                        {row.cells.map((cell, colIndex) => (
                          <div key={colIndex} className="flex-1 space-y-1">
                            <Input
                              value={getCellText(cell)}
                              onChange={(e) => updateCell(section.id, row.id, colIndex, e.target.value)}
                              className="text-sm min-w-[80px]"
                              placeholder={section.columns[colIndex]}
                            />
                            {/* Link URL input */}
                            <div className="flex items-center gap-1">
                              <Link className="w-3 h-3 text-muted-foreground" />
                              <Input
                                value={getCellLink(cell) || ""}
                                onChange={(e) => updateCellLink(section.id, row.id, colIndex, e.target.value)}
                                className="text-xs min-w-[60px] h-6"
                                placeholder="URL (optional)"
                              />
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(section.id, row.id)}
                          className="text-destructive flex-shrink-0 w-8 p-0 mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(section.id)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Row to {section.title}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────
function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border bg-background hover:bg-accent transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function KeyStatusWidget({ keyInfo }: { keyInfo: { totalKeys: number; activeKeyIndex: number } | null }) {
  if (!keyInfo) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Key className="w-3 h-3" />
      <span>Grok Key {keyInfo.activeKeyIndex + 1}/{keyInfo.totalKeys} used</span>
      <div className="flex gap-0.5">
        {Array.from({ length: keyInfo.totalKeys }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i === keyInfo.activeKeyIndex ? "bg-green-500" : "bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Progress indicator
// ─────────────────────────────────────────────────────
function GeneratingProgress({
  metaStreaming, contentStreaming, metaDone, contentDone,
}: {
  metaStreaming: boolean; contentStreaming: boolean;
  metaDone: boolean; contentDone: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-sm">🤖</div>
      </div>
      <div className="flex-1 space-y-1.5">
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-all ${
          metaDone
            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
            : metaStreaming
              ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-medium"
              : "text-muted-foreground"
        }`}>
          {metaDone
            ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
            : metaStreaming
              ? <span className="w-3 h-3 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
              : <span className="w-3 h-3 rounded-full border border-muted-foreground flex-shrink-0" />
          }
          <span>
            Step 1 — SEO Metadata
            {metaDone ? " ✓ done" : metaStreaming ? " — streaming live into fields..." : ""}
          </span>
        </div>

        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-all ${
          contentDone
            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
            : contentStreaming
              ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
              : "text-muted-foreground"
        }`}>
          {contentDone
            ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
            : contentStreaming
              ? <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              : <span className="w-3 h-3 rounded-full border border-muted-foreground flex-shrink-0" />
          }
          <span>
            Step 2 — Page Content
            {contentDone ? " ✓ done" : contentStreaming ? " — streaming into editor..." : " — starting..."}
          </span>
        </div>

        {metaStreaming && contentStreaming && (
          <p className="text-xs text-muted-foreground pl-2">
            ⚡ Both phases running in parallel — faster results!
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Count only fields that Grok actually uses — not every
// key in formData (which inflates the count with empty
// or irrelevant keys like internal IDs).
// ─────────────────────────────────────────────────────
const MEANINGFUL_FIELDS = new Set([
  "exam_name", "job_title", "exam_short_name", "title",
  "conducting_body", "department_name",
  "country_name",
  "official_website", "official_link", "admit_card_link",
  "result_link", "syllabus_link", "answer_key_link",
  "objection_link", "apply_link", "official_notification",
  "notification_date", "exam_date", "application_deadline",
  "release_date", "objection_deadline", "posted_date",
  "category", "qualifications", "qualification",
  "location", "vacancies", "salary_range", "age_limit",
  "job_description", "post_name", "subtitle", "description",
]);

function countMeaningfulFields(formData: GrokFormData): number {
  return Object.entries(formData).filter(
    ([k, v]) => MEANINGFUL_FIELDS.has(k) && typeof v === "string" && v.trim() !== ""
  ).length;
}

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
export interface AIGeneratedSEO {
  slug: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  page_content?: string;
  // New structured form data for manual content building
  form_data?: FormSection[];
}

// Form builder types
export interface FormCell {
  text: string;
  linkUrl?: string; // Optional URL to make this cell a clickable link
}

export interface FormRow {
  id: string;
  cells: (string | FormCell)[]; // cell values - can be simple string or object with link
}

export interface FormSection {
  id: string;
  title: string;
  columns: string[]; // column headers
  rows: FormRow[];
  order: number;
}

interface AIContentGeneratorProps {
  contentType: ContentType;
  formData: GrokFormData;
  onGenerated?: (seo: AIGeneratedSEO) => void;
  seoData?: AIGeneratedSEO;
  onSEOChange?: (seo: AIGeneratedSEO) => void;
  customPrompt?: string;
}

const DEFAULT_SEO: AIGeneratedSEO = {
  slug: "", meta_title: "", meta_description: "", keywords: "", form_data: [],
};

// ─────────────────────────────────────────────────────
// Streaming parse helpers
// ─────────────────────────────────────────────────────
function extractStreamingField(raw: string, field: string): string {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed[field] || "";
  } catch {
    const match = raw.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
    return match ? match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : "";
  }
}

function extractStreamingHTML(raw: string): string {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed.html || parsed || "";
  } catch {
    const match = raw.match(/"html"\s*:\s*"([\s\S]*)/);
    if (match) {
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    if (raw.trim().startsWith("<")) return raw;
    return "";
  }
}

// ─────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────
export function AIContentGenerator({
  contentType,
  formData,
  onGenerated,
  seoData: externalSEO,
  onSEOChange,
  customPrompt,
}: AIContentGeneratorProps) {
  const { toast } = useToast();
  const { generate, loading, error, keyInfo, reset } = useGrokAI();

  const [internalSEO, setInternalSEO] = useState<AIGeneratedSEO>(DEFAULT_SEO);
  const seoRef = useRef<AIGeneratedSEO>(DEFAULT_SEO);

  const [generated, setGenerated] = useState(false);
  const [metaStreaming, setMetaStreaming] = useState(false);
  const [contentStreaming, setContentStreaming] = useState(false);
  const [metaDone, setMetaDone] = useState(false);
  const [contentDone, setContentDone] = useState(false);

  const metaFinalSet = useRef(false);

  const seo = externalSEO ?? internalSEO;

  useEffect(() => {
    if (externalSEO !== undefined) {
      seoRef.current = externalSEO;
    }
  }, [externalSEO]);

  const setSEO = useCallback((patch: Partial<AIGeneratedSEO>) => {
    const next = { ...seoRef.current, ...patch };
    seoRef.current = next;
    if (externalSEO !== undefined && onSEOChange) {
      onSEOChange(next);
    } else {
      setInternalSEO({ ...next });
    }
  }, [externalSEO, onSEOChange]);

  // Remove content streaming logic - we only generate SEO metadata now
  const handleGenerate = async () => {
    const hasName =
      formData.exam_name ||
      formData.job_title ||
      formData.exam_short_name ||
      formData.title ||
      formData.subtitle;

    if (!hasName) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title/name before generating.",
        variant: "destructive",
      });
      return;
    }

    metaFinalSet.current = false;
    seoRef.current = { ...DEFAULT_SEO, form_data: seoRef.current.form_data };
    setInternalSEO({ ...DEFAULT_SEO, form_data: seo.form_data });
    if (onSEOChange) onSEOChange({ ...DEFAULT_SEO, form_data: seo.form_data });

    setGenerated(false);
    setMetaDone(false);
    setContentDone(true); // Mark content as done since we don't generate it
    setMetaStreaming(false);

    const result = await generate(
      contentType,
      formData,
      "meta", // Only generate meta, not content
      customPrompt,

      // onPhaseComplete
      (completedPhase, partial) => {
        if (completedPhase === "meta" && partial.meta) {
          metaFinalSet.current = true;
          setSEO({
            slug: partial.meta.slug || "",
            meta_title: partial.meta.meta_title || "",
            meta_description: partial.meta.meta_description || "",
            keywords: partial.meta.keywords || "",
          });
          setMetaStreaming(false);
          setMetaDone(true);
          toast({
            title: "⚡ Metadata ready!",
            description: "SEO fields filled in. Now build your content below.",
            duration: 2500,
          });
        }
      },

      // onStreamDelta
      (deltaPhase, _delta, accumulated) => {
        if (deltaPhase === "meta") {
          if (metaFinalSet.current) return;
          setMetaStreaming(true);
          const patch: Partial<AIGeneratedSEO> = {};
          const slug       = extractStreamingField(accumulated, "slug");
          const meta_title = extractStreamingField(accumulated, "meta_title");
          const meta_desc  = extractStreamingField(accumulated, "meta_description");
          const keywords   = extractStreamingField(accumulated, "keywords");
          if (slug)       patch.slug            = slug;
          if (meta_title) patch.meta_title       = meta_title;
          if (meta_desc)  patch.meta_description = meta_desc;
          if (keywords)   patch.keywords         = keywords;
          if (Object.keys(patch).length > 0) setSEO(patch);
        }
      }
    );

    if (result) {
      setGenerated(true);
      setMetaStreaming(false);
      toast({
        title: "✅ SEO Ready!",
        description: "Metadata generated. Build your content form below.",
      });
    } else if (error) {
      toast({ title: "Generation Failed", description: error, variant: "destructive" });
    }
  };

  const handleApply = () => {
    if (!onGenerated) return;
    onGenerated({ ...seoRef.current });
    toast({ title: "Applied!", description: "SEO content has been applied to the form.", duration: 2000 });
  };

  const handleRegenerate = () => {
    reset();
    handleGenerate();
  };

  // FIX 4: count only fields Grok will actually use
  const filledFields = countMeaningfulFields(formData);
  // Only metaDone matters now
  const bothDone = metaDone;

  // Form builder change handler
  const handleFormDataChange = (newFormData: FormSection[]) => {
    setSEO({ form_data: newFormData });
  };

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950 dark:border-violet-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white text-lg">🤖</div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Grok AI Content Generator
                  <Badge variant="secondary" className="text-xs">Powered by xAI</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filledFields > 0
                    ? `${filledFields} field${filledFields === 1 ? "" : "s"} detected — ready to generate`
                    : "Fill basic info above, then generate"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {generated && (
                <Button type="button" variant="outline" size="sm" onClick={handleRegenerate} disabled={loading} className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
              )}
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="bg-violet-600 hover:bg-violet-700 text-white"
                size="sm"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Streaming...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with Grok AI
                  </span>
                )}
              </Button>

              {bothDone && !loading && onGenerated && (
                <Button
                  type="button"
                  onClick={handleApply}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1" />
                  Apply to Form
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {!loading && !generated && (
          <CardContent className="pt-0">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-white/60 dark:bg-black/20 rounded-md px-3 py-2">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-violet-500" />
              <span>
                Metadata and content stream in parallel — both phases start simultaneously for faster results.
              </span>
            </div>
          </CardContent>
        )}

        {loading && metaStreaming && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 py-3">
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-sm">🤖</div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-medium">
                  <span className="w-3 h-3 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                  <span>Generating SEO Metadata...</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {bothDone && !loading && onGenerated && (
          <CardContent className="pt-0">
            <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 rounded-md px-3 py-2">
              <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Generation complete — review and edit the fields below, then click{" "}
                <strong>Apply to Form</strong> when ready.
              </span>
            </div>
          </CardContent>
        )}

        {error && !loading && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
        )}

        {keyInfo && !loading && (
          <CardContent className="pt-0">
            <KeyStatusWidget keyInfo={keyInfo} />
          </CardContent>
        )}
      </Card>

      {/* ── SEO Metadata ── */}
      <Card className={metaStreaming ? "border-violet-300 dark:border-violet-700" : metaDone ? "border-green-300 dark:border-green-700" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            SEO Metadata
            {metaStreaming && (
              <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 animate-pulse">
                ⚡ Streaming...
              </Badge>
            )}
            {metaDone && !metaStreaming && (
              <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                ✓ Ready
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StreamingInput
              label="URL Slug"
              value={seo.slug}
              onChange={(v) => setSEO({ slug: v })}
              streaming={metaStreaming}
              hint="Auto-generated from exam name + year"
            />
            <StreamingInput
              label="Meta Title"
              value={seo.meta_title}
              onChange={(v) => setSEO({ meta_title: v })}
              streaming={metaStreaming}
              maxChars={60}
              hint="55-65 characters recommended"
            />
          </div>
          <StreamingInput
            label="Meta Description"
            value={seo.meta_description}
            onChange={(v) => setSEO({ meta_description: v })}
            streaming={metaStreaming}
            maxChars={160}
            multiline
            hint="150-160 characters recommended"
          />
          <StreamingInput
            label="Keywords"
            value={seo.keywords}
            onChange={(v) => setSEO({ keywords: v })}
            streaming={metaStreaming}
            multiline
            hint="Comma-separated keywords"
          />
        </CardContent>
      </Card>

      {/* ── Form Content Builder ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-500" />
              Content Builder
              {seo.form_data && seo.form_data.length > 0 && (
                <Badge variant="outline" className="text-xs">{seo.form_data.length} section{seo.form_data.length === 1 ? '' : 's'}</Badge>
              )}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Build structured content with sections and rows. This will be displayed as a table on your website.
          </p>
        </CardHeader>
        <CardContent>
          <FormBuilder
            sections={seo.form_data || []}
            onChange={handleFormDataChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Standalone version (for dashboard)
// ─────────────────────────────────────────────────────
const CONTENT_TYPES = [
  { value: "exam" as ContentType, label: "📋 Exam Listing" },
  { value: "job" as ContentType, label: "💼 Job Listing" },
  { value: "result" as ContentType, label: "🏆 Result" },
  { value: "answer_key" as ContentType, label: "📝 Answer Key" },
  { value: "famous_exam" as ContentType, label: "⭐ Famous Exam" },
];

const FIELD_GROUPS = {
  exam: {
    basic: ["exam_name", "conducting_body", "country_name"],
    links: ["official_website", "admit_card_link", "result_link", "syllabus_link"],
    dates: ["notification_date", "exam_date"],
    extra: ["category", "qualifications"],
  },
  job: {
    basic: ["job_title", "department_name", "country_name"],
    links: ["official_link", "apply_link", "official_notification"],
    dates: ["posted_date", "application_deadline"],
    extra: ["location", "vacancies", "salary_range", "qualification", "age_limit", "job_description"],
  },
  result: {
    basic: ["exam_name", "conducting_body", "country_name"],
    links: ["result_link"],
    dates: ["release_date"],
    extra: [],
  },
  answer_key: {
    basic: ["exam_name", "country_name"],
    links: ["answer_key_link", "objection_link"],
    dates: ["exam_date", "release_date", "objection_deadline"],
    extra: ["post_name"],
  },
  famous_exam: {
    basic: ["exam_name", "exam_short_name", "country_name"],
    links: ["official_website"],
    dates: [],
    extra: [],
  },
};

const FIELD_META: Record<string, { label: string; placeholder?: string; multiline?: boolean }> = {
  exam_name: { label: "Exam Name *", placeholder: "e.g. UPSC Civil Services 2026" },
  job_title: { label: "Job Title *", placeholder: "e.g. Software Engineer" },
  conducting_body: { label: "Conducting Body", placeholder: "e.g. Union Public Service Commission" },
  department_name: { label: "Department", placeholder: "e.g. Ministry of Finance" },
  country_name: { label: "Country", placeholder: "e.g. India" },
  exam_short_name: { label: "Short Name", placeholder: "e.g. UPSC" },
  official_website: { label: "Official Website URL", placeholder: "https://upsc.gov.in" },
  official_link: { label: "Official Link", placeholder: "https://..." },
  admit_card_link: { label: "Admit Card URL", placeholder: "https://..." },
  result_link: { label: "Result URL", placeholder: "https://..." },
  syllabus_link: { label: "Syllabus PDF URL", placeholder: "https://..." },
  answer_key_link: { label: "Answer Key URL", placeholder: "https://..." },
  objection_link: { label: "Objection Portal URL", placeholder: "https://..." },
  apply_link: { label: "Apply Online URL", placeholder: "https://..." },
  official_notification: { label: "Notification PDF URL", placeholder: "https://..." },
  notification_date: { label: "Notification Date", placeholder: "2026-01-15" },
  exam_date: { label: "Exam Date", placeholder: "June 15, 2026" },
  application_deadline: { label: "Application Deadline", placeholder: "2026-03-01" },
  release_date: { label: "Result/Release Date", placeholder: "2026-07-01" },
  objection_deadline: { label: "Objection Deadline", placeholder: "2026-04-10" },
  posted_date: { label: "Posted Date", placeholder: "2026-01-01" },
  category: { label: "Category", placeholder: "e.g. Technology, Engineering" },
  location: { label: "Location", placeholder: "e.g. New Delhi, All India" },
  vacancies: { label: "Total Vacancies", placeholder: "e.g. 1000" },
  salary_range: { label: "Salary / Pay Scale", placeholder: "e.g. ₹56,100 - ₹1,77,500 (Level 10)" },
  qualification: { label: "Required Qualification", placeholder: "e.g. Any Graduate" },
  age_limit: { label: "Age Limit", placeholder: "e.g. 21-30 years" },
  qualifications: { label: "Qualifications", placeholder: "Describe required qualifications", multiline: true },
  job_description: { label: "Job Description", placeholder: "Describe the role...", multiline: true },
  post_name: { label: "Post Name", placeholder: "e.g. Assistant Manager" },
};

export function StandaloneAIGenerator() {
  const [contentType, setContentType] = useState<ContentType>("exam");
  const [formData, setFormData] = useState<GrokFormData>({});
  const [seoData, setSEOData] = useState<AIGeneratedSEO>(DEFAULT_SEO);

  const fields = FIELD_GROUPS[contentType];
  const updateForm = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  const renderField = (key: string) => {
    const meta = FIELD_META[key] || { label: key };
    return (
      <div key={key} className="space-y-1">
        <Label className="text-xs">{meta.label}</Label>
        {meta.multiline ? (
          <Textarea
            value={formData[key] || ""}
            onChange={(e) => updateForm(key, e.target.value)}
            placeholder={meta.placeholder}
            rows={3}
            className="text-sm"
          />
        ) : (
          <Input
            value={formData[key] || ""}
            onChange={(e) => updateForm(key, e.target.value)}
            placeholder={meta.placeholder}
            className="text-sm"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI SEO Content Generator</CardTitle>
          <p className="text-sm text-muted-foreground">Select content type, fill in the details, then generate AI content</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setContentType(t.value); setFormData({}); }}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    contentType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-border"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              {fields.dates.length > 0 && <TabsTrigger value="dates">Dates</TabsTrigger>}
              {fields.extra.length > 0 && <TabsTrigger value="extra">Extra</TabsTrigger>}
            </TabsList>
            <TabsContent value="basic" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{fields.basic.map(renderField)}</div>
            </TabsContent>
            <TabsContent value="links" className="mt-4 space-y-3">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                🔗 All links you add here will appear in the "Important Links" table in the generated content
              </div>
              {fields.links.map(renderField)}
            </TabsContent>
            {fields.dates.length > 0 && (
              <TabsContent value="dates" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{fields.dates.map(renderField)}</div>
              </TabsContent>
            )}
            {fields.extra.length > 0 && (
              <TabsContent value="extra" className="mt-4 space-y-3">{fields.extra.map(renderField)}</TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <AIContentGenerator
        contentType={contentType}
        formData={formData}
        seoData={seoData}
        onSEOChange={setSEOData}
        onGenerated={(seo) => console.log("User applied SEO:", seo)}
      />
    </div>
  );
}