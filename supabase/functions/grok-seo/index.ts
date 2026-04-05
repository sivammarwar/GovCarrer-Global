// supabase/functions/grok-seo/index.ts
//
// FIX v5 (dynamic sections):
// 1. buildContentPrompt: handles type === "dynamic" — uses the section's
//    ai_prompt from formData.ai_prompt as the prompt template, falling back
//    to a sensible generic template when absent.
// 2. buildMetaPrompt: also handles "dynamic" type with a generic meta prompt.
// 3. normaliseFormData: promotes link_url, date_value, subtitle → typed fields
//    so dynamic section items always produce rich content.
// 4. All previous fixes retained (parallel streams, keepalive pings,
//    per-phase error SSE events, writer.close() in finally).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const config = { verify_jwt: false };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GROK_KEYS = [
  Deno.env.get("GROK_API_KEY_1"),
  Deno.env.get("GROK_API_KEY_2"),
  Deno.env.get("GROK_API_KEY_3"),
  Deno.env.get("GROK_API_KEY_4"),
  Deno.env.get("GROK_API_KEY_5"),
  Deno.env.get("GROK_API_KEY_6"),
].filter(Boolean) as string[];

const GROK_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROK_MODEL_FAST = "llama-3.1-8b-instant";
const GROK_MODEL_FULL = "llama-3.3-70b-versatile";

let memKeyIndex = 0;
const bannedUntil: Record<number, number> = {};

function getNextKeyFast(): { key: string; index: number } {
  const total = GROK_KEYS.length;
  for (let attempt = 0; attempt < total; attempt++) {
    const idx = memKeyIndex % total;
    memKeyIndex++;
    const banned = bannedUntil[idx];
    if (!banned || Date.now() > banned) {
      return { key: GROK_KEYS[idx], index: idx };
    }
  }
  // All banned — return first key and let it fail naturally
  return { key: GROK_KEYS[0], index: 0 };
}

function markKeyFailedMem(index: number) {
  bannedUntil[index] = Date.now() + 60 * 60 * 1000;
}

function syncKeyStateToDB(adminClient: any, index: number, failed: boolean) {
  if (failed) {
    const bannedUntilISO = new Date(
      Date.now() + 60 * 60 * 1000
    ).toISOString();
    adminClient
      .from("grok_key_usage")
      .upsert(
        {
          key_index: index,
          is_banned: true,
          banned_until: bannedUntilISO,
          fail_count: 1,
        },
        { onConflict: "key_index" }
      )
      .then(() => {})
      .catch(() => {});
  } else {
    adminClient
      .from("grok_key_usage")
      .upsert(
        {
          key_index: index,
          is_banned: false,
          banned_until: null,
          last_success_at: new Date().toISOString(),
        },
        { onConflict: "key_index" }
      )
      .then(() => {})
      .catch(() => {});
  }
  adminClient
    .from("grok_key_state")
    .update({
      key_index: memKeyIndex % GROK_KEYS.length,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .then(() => {})
    .catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchGrokStream — tries each key in rotation until one is accepted
// ─────────────────────────────────────────────────────────────────────────────
async function fetchGrokStream(
  messages: any[],
  maxTokens: number,
  model: string
): Promise<{ res: Response; index: number }> {
  for (let attempt = 0; attempt < GROK_KEYS.length; attempt++) {
    const { key, index } = getNextKeyFast();
    console.log(`[grok-seo] trying key index ${index} (attempt ${attempt + 1})`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const res = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages,
          temperature: 0.3,
          stream: true,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        console.log(`[grok-seo] key index ${index} accepted by Groq`);
        return { res, index };
      }
      console.warn(`[grok-seo] key index ${index} rejected: HTTP ${res.status}`);
      markKeyFailedMem(index);
      if (
        res.status !== 429 &&
        res.status !== 401 &&
        res.status !== 403
      ) {
        const errBody = await res.text().catch(() => "(unreadable)");
        throw new Error(
          `Groq API error ${res.status}: ${errBody.slice(0, 200)}`
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.error(`[grok-seo] key index ${index} fetch timed out after 30s`);
        markKeyFailedMem(index);
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    "All Grok API keys are exhausted or rate-limited. Try again in a minute."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// normaliseFormData (server-side mirror of the client's version)
// Handles dynamic section items that only carry title / subtitle / link_url.
// ─────────────────────────────────────────────────────────────────────────────
function normaliseFormData(
  data: Record<string, any>,
  type: string
): Record<string, any> {
  const out: Record<string, any> = { ...data };
  const genericTitle = String(
    data.title || data.subtitle || data.exam_name || data.job_title || ""
  ).trim();

  if (!out.exam_name && genericTitle && type !== "job") {
    out.exam_name = genericTitle;
  }
  if (!out.job_title && genericTitle && type === "job") {
    out.job_title = genericTitle;
  }

  // Dynamic / generic link field
  if (data.link_url) {
    if (!out.result_link && type === "result") out.result_link = data.link_url;
    if (!out.answer_key_link && type === "answer_key")
      out.answer_key_link = data.link_url;
    // For dynamic items keep link_url available as-is
  }

  // Generic date fields
  const genericDate = data.date || data.date_value;
  if (genericDate) {
    if (!out.release_date && (type === "result" || type === "answer_key")) {
      out.release_date = genericDate;
    }
    if (
      !out.exam_date &&
      type !== "result" &&
      type !== "answer_key"
    ) {
      out.exam_date = genericDate;
    }
  }

  // Subtitle → description fallback for dynamic items
  if (!out.description && data.subtitle) {
    out.description = data.subtitle;
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildMetaPrompt
// ─────────────────────────────────────────────────────────────────────────────
function buildMetaPrompt(
  type: string,
  formData: Record<string, any>,
  customPrompt?: string
): any[] {
  const name =
    formData.exam_name ||
    formData.job_title ||
    formData.exam_short_name ||
    formData.title ||
    "Item";
  const body =
    formData.conducting_body ||
    formData.department_name ||
    formData.section_name ||
    "";
  const country = formData.country_name || "India";
  const year = new Date().getFullYear();

  const userContent = customPrompt
    ? `SEO metadata for: ${name}
Section: ${formData.section_name || type}
Custom Context: ${customPrompt}
Data: ${JSON.stringify(formData)}

- meta_title: 55-65 chars, include year + relevant terms
- meta_description: 150-160 chars, key dates if available, call to action
- keywords: 12-15 comma-separated terms
- slug: lowercase, hyphens, include year

JSON only.`
    : `SEO metadata for ${type}:
Name: ${name}
Body: ${body}
Country: ${country}
Year: ${year}
Data: ${JSON.stringify(formData)}

- meta_title: 55-65 chars, include year + terms like Notification/Admit Card/Result/Apply Online
- meta_description: 150-160 chars, key dates if available, call to action
- keywords: 12-15 comma-separated terms
- slug: lowercase, hyphens, include year

JSON only.`;

  return [
    {
      role: "system",
      content: `You are an SEO specialist for a government exam portal. Return ONLY valid JSON, no markdown, no extra text.
Format: {"meta_title":"...","meta_description":"...","keywords":"...","slug":"..."}`,
    },
    { role: "user", content: userContent },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// buildContentPrompt
// When type === "dynamic" the section's ai_prompt is the template.
// Placeholders {title}, {subtitle}, {description}, {section_name},
// {country_name} are replaced with the item's actual values.
// ─────────────────────────────────────────────────────────────────────────────
function buildContentPrompt(
  type: string,
  formData: Record<string, any>,
  customPrompt?: string
): any[] {
  const links = buildLinksHTML(formData);
  const datesTable = buildDatesTableHTML(formData);
  const name =
    formData.exam_name ||
    formData.job_title ||
    formData.title ||
    "This Item";
  const country = formData.country_name || "India";
  const sectionName = formData.section_name || type;

  let userContent: string;

  if (customPrompt) {
    // Replace all known placeholders from the section's ai_prompt template
    userContent = customPrompt
      .replace(/\{title\}/g, formData.title || name)
      .replace(/\{subtitle\}/g, formData.subtitle || "")
      .replace(/\{description\}/g, formData.description || "")
      .replace(/\{section_name\}/g, sectionName)
      .replace(/\{country_name\}/g, country)
      .replace(/\{exam_name\}/g, formData.exam_name || name)
      .replace(/\{link_url\}/g, formData.link_url || "")
      .replace(/\{date_value\}/g, formData.date_value || "");

    userContent += `\n\nAdditional Data: ${JSON.stringify(formData, null, 2)}\n\nReturn JSON: {"html": "<complete html content>"}`;
  } else if (type === "dynamic") {
    // Generic fallback for dynamic sections with no ai_prompt configured
    userContent = `Write a comprehensive SEO page for: ${name}
Section: ${sectionName}
Country: ${country}
Description: ${formData.description || formData.subtitle || ""}
Link: ${formData.link_url || ""}
Date: ${formData.date_value || ""}
Data: ${JSON.stringify(formData, null, 2)}

Generate complete HTML with:
1. BRIEF INTRO (2-3 sentences about this item)
2. KEY DETAILS TABLE — columns: Detail | Value
3. IMPORTANT LINKS TABLE — use: ${links}
4. DATES & TIMELINE — use: ${datesTable}
5. ELIGIBILITY / REQUIREMENTS — if applicable
6. HOW TO APPLY / ACCESS — step by step
7. FAQs — exactly 6 Q&A: <h4>Q: question?</h4><p>A: answer</p>

Return JSON: {"html": "<complete html>"}`;
  } else {
    // Standard exam / job / result / answer_key / famous_exam template
    userContent = `Write a comprehensive SEO page for: ${name}
Type: ${type}
Data: ${JSON.stringify(formData, null, 2)}

Generate this EXACT structure as HTML:
1. BRIEF INTRO (2-3 sentences)
2. IMPORTANT LINKS TABLE - Links: ${links} - Columns: Resource | Link | Description
3. EXAM DATES & DEADLINES - Dates: ${datesTable} - Table: Event | Date | Details
4. SYLLABUS & EXAM PATTERN - 2-3 paragraphs + Table: Stage | Subjects | Duration | Marks
5. ELIGIBILITY CRITERIA - Qualification, Age Limit table, Nationality
6. APPLICATION FEE & SALARY - Fee table: Category | Amount; Salary table: Pay Level | Basic Pay | Grade Pay | In-hand
7. SELECTION PROCESS - Numbered stages with descriptions
8. PREVIOUS YEAR CUT-OFFS - Table: Category | Cut-off | Year + 2-3 prep strategy sentences
9. FAQs - exactly 8 Q&A: <h4>Q: question?</h4><p>A: answer</p>

Return JSON: {"html": "<complete html>"}`;
  }

  return [
    {
      role: "system",
      content: `You are an expert content writer for a government portal in ${country}.
CRITICAL RULES:
1. Never invent specific dates, salaries, or cut-offs not provided
2. Use "As per official notification" for unknown values
3. Clean semantic HTML only - h2, h3, p, ul, ol, table tags
4. No <html>, <head>, <body>, <script> tags
5. Tables: border="1" style="border-collapse:collapse;width:100%;margin:12px 0"
6. All td/th: style="padding:10px;border:1px solid #e2e8f0;text-align:left"
7. Return ONLY valid JSON: {"html": "<your html here>"}`,
    },
    { role: "user", content: userContent },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Link and date helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildLinksHTML(formData: Record<string, any>): string {
  const linkFields: Record<string, string> = {
    official_website: "Official Website",
    official_link: "Official Portal",
    admit_card_link: "Admit Card",
    result_link: "Result",
    syllabus_link: "Syllabus PDF",
    answer_key_link: "Answer Key",
    objection_link: "Objection Portal",
    apply_link: "Apply Online",
    official_notification: "Official Notification PDF",
    link_url: "Official Link",
  };
  const links: string[] = [];
  for (const [key, label] of Object.entries(linkFields)) {
    if (formData[key]) links.push(`${label}: ${formData[key]}`);
  }
  return links.length > 0
    ? links.join("\n")
    : "Official Website: (add link)";
}

function buildDatesTableHTML(formData: Record<string, any>): string {
  const dateFields: Record<string, string> = {
    notification_date: "Notification Date",
    posted_date: "Posted Date",
    application_deadline: "Application Deadline",
    exam_date: "Exam Date",
    release_date: "Result/Release Date",
    objection_deadline: "Objection Deadline",
    date_value: "Date",
  };
  const dates: string[] = [];
  for (const [key, label] of Object.entries(dateFields)) {
    if (formData[key]) dates.push(`${label}: ${formData[key]}`);
  }
  return dates.length > 0
    ? dates.join(", ")
    : "Dates as per official notification";
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE helpers
// ─────────────────────────────────────────────────────────────────────────────
const encoder = new TextEncoder();

function sseEvent(data: Record<string, any>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function ssePing(): Uint8Array {
  return encoder.encode(`: ping\n\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// pipeGrokStream — pipes a Groq SSE response into the client SSE writer
// ─────────────────────────────────────────────────────────────────────────────
async function pipeGrokStream(
  grokBody: ReadableStream,
  phase: "meta" | "content",
  writer: WritableStreamDefaultWriter
): Promise<string> {
  const decoder = new TextDecoder();
  const reader = grokBody.getReader();
  let buffer = "";
  let fullText = "";

  // Keepalive pings every 3 s to prevent Cloudflare / browser from closing
  // an idle connection while Groq is still generating.
  let pingInterval: ReturnType<typeof setInterval> | null = setInterval(
    async () => {
      try {
        await writer.write(ssePing());
      } catch {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
      }
    },
    3_000
  );

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const json = JSON.parse(raw);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            await writer.write(sseEvent({ phase, delta }));
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // Flush remaining bytes in decoder buffer
    const tail = decoder.decode();
    if (tail) {
      buffer += tail;
      const lines = buffer.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const json = JSON.parse(raw);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            await writer.write(sseEvent({ phase, delta }));
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    reader.releaseLock();
  }

  await writer.write(sseEvent({ phase, done: true, full: fullText }));
  return fullText;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[grok-seo] Missing or malformed Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      type,
      formData: rawFormData,
      action,
      customPrompt,
    } = body;

    if (!type || !rawFormData) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: type, formData",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Normalise on the server side — client may send `title` not `exam_name`,
    // or a dynamic section item with only link_url / date_value.
    const formData = normaliseFormData(rawFormData, type);

    console.log("[grok-seo] type:", type);
    console.log(
      "[grok-seo] exam_name after normalise:",
      formData.exam_name || "(none)"
    );
    console.log(
      "[grok-seo] section_name:",
      formData.section_name || "(none)"
    );
    console.log(
      "[grok-seo] customPrompt:",
      customPrompt
        ? `explicit (${String(customPrompt).length} chars)`
        : formData.ai_prompt
        ? `from formData.ai_prompt (${String(formData.ai_prompt).length} chars)`
        : "absent — using built-in template"
    );

    if (GROK_KEYS.length === 0) {
      console.error("[grok-seo] No GROK API keys configured");
      return new Response(
        JSON.stringify({
          error:
            "AI service not configured — no GROK API keys found",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Resolve the effective prompt:
    // explicit customPrompt > formData.ai_prompt > built-in template
    const effectivePrompt =
      customPrompt ||
      (formData.ai_prompt as string | undefined) ||
      undefined;

    const generateAction = action || "both";

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Run generation asynchronously so we can return the stream immediately
    (async () => {
      try {
        if (generateAction === "meta") {
          await writer.write(sseEvent({ phase: "meta", status: "start" }));
          const { res, index } = await fetchGrokStream(
            buildMetaPrompt(type, formData, effectivePrompt),
            500,
            GROK_MODEL_FAST
          );
          await pipeGrokStream(res.body!, "meta", writer);
          syncKeyStateToDB(adminClient, index, false);
        } else if (generateAction === "content") {
          await writer.write(
            sseEvent({ phase: "content", status: "start" })
          );
          const { res, index } = await fetchGrokStream(
            buildContentPrompt(type, formData, effectivePrompt),
            4000,
            GROK_MODEL_FULL
          );
          await pipeGrokStream(res.body!, "content", writer);
          syncKeyStateToDB(adminClient, index, false);
        } else {
          // ── SEQUENTIAL: meta first, then content (prevents writer blocking) ─────────
          await writer.write(sseEvent({ phase: "meta", status: "start" }));
          
          // Start meta fetch
          const { res: metaRes, index: metaIndex } = await fetchGrokStream(
            buildMetaPrompt(type, formData, customPrompt), 500, GROK_MODEL_FAST
          );
          
          // Pipe meta stream
          await pipeGrokStream(metaRes.body!, "meta", writer);
          syncKeyStateToDB(adminClient, metaIndex, false);
          
          // Then start content
          await writer.write(sseEvent({ phase: "content", status: "start" }));
          
          const { res: contentRes, index: contentIndex } = await fetchGrokStream(
            buildContentPrompt(type, formData, customPrompt), 4000, GROK_MODEL_FULL
          );
          
          // Pipe content stream
          await pipeGrokStream(contentRes.body!, "content", writer);
          syncKeyStateToDB(adminClient, contentIndex, false);
        }

        // Signal completion with key info
        await writer.write(
          sseEvent({
            phase: "complete",
            keyInfo: {
              totalKeys: GROK_KEYS.length,
              activeKeyIndex: memKeyIndex % GROK_KEYS.length,
            },
          })
        );
      } catch (err: any) {
        console.error("[grok-seo] stream generation error:", err);
        try {
          await writer.write(
            sseEvent({
              phase: "error",
              message: err.message || "Generation failed",
            })
          );
        } catch {
          // writer may already be closing
        }
      } finally {
        try {
          await writer.close();
        } catch {
          // already closed
        }
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[grok-seo] top-level error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});