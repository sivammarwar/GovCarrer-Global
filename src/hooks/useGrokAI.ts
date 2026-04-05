// src/hooks/useGrokAI.ts
// FIX v5 (dynamic sections):
// - normaliseFormData: handles dynamic section items that only carry
//   title / subtitle / description / link_url / section_name
// - generate: always forwards section_name + ai_prompt so the edge fn
//   can use the section's custom prompt instead of the hardcoded fallback
// - Stuck-stream fix: AbortController is reset correctly between calls;
//   previous ref is cancelled before a new request starts
// - generatePrompt: uses the section's ai_prompt when available instead
//   of asking Grok to invent one from scratch

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GrokFormData {
  // Exam fields
  country_name?: string;
  exam_name?: string;
  exam_short_name?: string;
  conducting_body?: string;
  official_website?: string;
  admit_card_link?: string;
  result_link?: string;
  syllabus_link?: string;
  notification_date?: string;
  exam_date?: string;
  category?: string;
  qualifications?: string;
  // Job fields
  job_title?: string;
  department_name?: string;
  official_link?: string;
  apply_link?: string;
  official_notification?: string;
  posted_date?: string;
  application_deadline?: string;
  location?: string;
  vacancies?: string;
  salary_range?: string;
  qualification?: string;
  age_limit?: string;
  job_description?: string;
  // Result / answer key fields
  release_date?: string;
  answer_key_link?: string;
  objection_link?: string;
  objection_deadline?: string;
  post_name?: string;
  // Generic / dynamic section fields
  title?: string;
  subtitle?: string;
  description?: string;
  section_name?: string;
  link_url?: string;
  date_value?: string;
  // Custom prompt override from the section's ai_prompt column
  ai_prompt?: string;
  [key: string]: string | undefined;
}

export interface GrokResult {
  meta: {
    meta_title: string;
    meta_description: string;
    keywords: string;
    slug: string;
  };
  content: string;
  keyInfo: {
    totalKeys: number;
    activeKeyIndex: number;
  };
}

export type ContentType =
  | "exam"
  | "job"
  | "result"
  | "answer_key"
  | "famous_exam"
  | "dynamic"; // ← new: used when generating for a dynamic section item

export type OnPhaseComplete = (
  phase: "meta" | "content",
  partial: Partial<GrokResult>
) => void;

export type OnStreamDelta = (
  phase: "meta" | "content",
  delta: string,
  accumulated: string
) => void;

// ─────────────────────────────────────────────────────────────────────────────
// normaliseFormData
// Maps the various field names used across different admin forms so that the
// edge function always receives a usable name regardless of which form called.
// Handles dynamic section items that only provide title / subtitle / link_url.
// ─────────────────────────────────────────────────────────────────────────────
function normaliseFormData(
  data: GrokFormData,
  type: ContentType
): GrokFormData {
  const out: GrokFormData = { ...data };

  const genericTitle = (
    data.title ||
    data.subtitle ||
    data.exam_name ||
    data.job_title ||
    ""
  ).trim();

  // Promote title → exam_name for non-job types (including dynamic)
  if (!out.exam_name && genericTitle && type !== "job") {
    out.exam_name = genericTitle;
  }
  // Promote title → job_title for job type
  if (!out.job_title && genericTitle && type === "job") {
    out.job_title = genericTitle;
  }

  // Dynamic section items: promote link_url to the right typed field
  if (data.link_url) {
    if (!out.result_link && type === "result") out.result_link = data.link_url;
    if (!out.answer_key_link && type === "answer_key")
      out.answer_key_link = data.link_url;
    // For dynamic items keep link_url as-is (edge fn reads it directly)
  }

  // Promote generic date field
  const genericDate = (data as Record<string, string>).date || data.date_value;
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

  // Make subtitle available as a description fallback for dynamic items
  if (!out.description && data.subtitle) {
    out.description = data.subtitle;
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildRequestConfig — gets session and constructs headers
// ─────────────────────────────────────────────────────────────────────────────
async function buildRequestConfig(): Promise<{
  url: string;
  headers: Record<string, string>;
}> {
  console.log("[buildRequestConfig] Starting...");
  
  // Read session directly from localStorage - avoids hanging API calls
  const storageKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}-auth-token`;
  const sessionStr = localStorage.getItem(storageKey) || localStorage.getItem('supabase.auth.token');
  
  let accessToken: string | null = null;
  
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      accessToken = session.access_token || session.token;
      console.log("[buildRequestConfig] Got token from localStorage");
    } catch (e) {
      console.warn("[buildRequestConfig] Failed to parse session from localStorage");
    }
  }
  
  if (!accessToken) {
    throw new Error("Not logged in. Please refresh the page and log in again.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ) as string;

  if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL is not set");
  if (!anonKey) throw new Error("Supabase anon key env var is not set");

  const url = `${supabaseUrl}/functions/v1/grok-seo`;
  console.log("[buildRequestConfig] URL built:", url);

  return {
    url,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// assertSSEResponse — throws immediately if the edge fn returned JSON (error)
// instead of an SSE stream. Without this the read loop hangs until timeout.
// ─────────────────────────────────────────────────────────────────────────────
async function assertSSEResponse(response: Response): Promise<void> {
  const ct = response.headers.get("content-type") || "";
  console.log("[grok] response content-type:", ct);
  if (!ct.includes("text/event-stream")) {
    const text = await response.text();
    console.error("[grok] non-SSE response body:", text.slice(0, 500));
    let msg: string;
    try {
      const json = JSON.parse(text);
      msg = json.error || json.message || text;
    } catch {
      msg = text || `Unexpected content-type: ${ct}`;
    }
    throw new Error(`Edge function returned non-SSE response: ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────
export function useGrokAI() {
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "meta" | "content" | "done">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<{
    totalKeys: number;
    activeKeyIndex: number;
  } | null>(null);

  // Single ref for the current in-flight AbortController
  const abortRef = useRef<AbortController | null>(null);

  // ─────────────────────────────────────────────────────
  // generatePrompt
  // Lightweight call used by the dynamic-section admin to
  // create or preview the section's AI prompt.
  // If the section already has an ai_prompt, skip the API
  // call and return it directly — avoids burning Grok tokens.
  // ─────────────────────────────────────────────────────
  const generatePrompt = useCallback(
    async (
      sectionName: string,
      description?: string,
      existingPrompt?: string
    ): Promise<string | null> => {
      // If the section already has a custom prompt, return it immediately
      if (existingPrompt && existingPrompt.trim().length > 20) {
        console.log("[grok] generatePrompt: returning existing prompt");
        return existingPrompt.trim();
      }

      setPromptLoading(true);
      setError(null);

      try {
        const { url, headers } = await buildRequestConfig();

        const customPrompt = `You are a content strategy expert for a government exam portal.
Write a concise AI content generation prompt (under 150 words) for a section called "${sectionName}".
${description ? `Section purpose: ${description}` : ""}

The prompt will instruct an AI to write a detailed SEO page for each item in this section.
Include these placeholders where appropriate: {title}, {subtitle}, {description}, {section_name}, {country_name}.

Requirements:
- Cover all key aspects a user would want to know about items in this section
- Be specific to "${sectionName}" (not generic)
- Mention relevant details like eligibility, dates, process, or salary as applicable
- End with: Return JSON: {"html": "<complete html>"}

Return ONLY the prompt text. No preamble, no markdown, no JSON wrapper.`;

        const abort = new AbortController();
        const timeoutId = setTimeout(() => abort.abort(), 60_000);

        const response = await fetch(url, {
          method: "POST",
          headers,
          signal: abort.signal,
          body: JSON.stringify({
            type: "exam",
            formData: {
              title: sectionName,
              exam_name: sectionName,
              section_name: sectionName,
              description: description || "",
              country_name: "India",
            },
            action: "content",
            customPrompt,
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const text = await response.text();
          let msg: string;
          try {
            const json = JSON.parse(text);
            msg = json.error || json.message || text;
          } catch {
            msg = text;
          }
          throw new Error(`Edge function error (${response.status}): ${msg}`);
        }

        if (!response.body) throw new Error("No response body");
        await assertSSEResponse(response);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let contentRaw = "";

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            let event: any;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }
            if (event.phase === "content" && event.delta)
              contentRaw += event.delta;
            if (event.phase === "content" && event.done && event.full)
              contentRaw = event.full;
            if (event.phase === "complete") break outer;
            if (event.phase === "error")
              throw new Error(event.message || "Generation failed");
          }
        }

        // Strip JSON wrapper if Grok returned {"html": "..."}
        let prompt = contentRaw.trim();
        try {
          const parsed = JSON.parse(
            prompt.replace(/```json|```/g, "").trim()
          );
          if (parsed.html) prompt = parsed.html;
          else if (typeof parsed === "string") prompt = parsed;
        } catch {
          const htmlMatch = prompt.match(/"html"\s*:\s*"([\s\S]*)"/);
          if (htmlMatch) {
            prompt = htmlMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, "\\");
          }
        }

        prompt = prompt
          .replace(/^```[\w]*\n?/, "")
          .replace(/\n?```$/, "")
          .replace(/^["']|["']$/g, "")
          .replace(/\\n/g, "\n")
          .trim();

        if (!prompt || prompt.length < 20)
          throw new Error("Generated prompt was empty or too short");

        return prompt;
      } catch (err: any) {
        console.error("[grok] generatePrompt error:", err);
        setError(err.message || "Failed to generate prompt");
        return null;
      } finally {
        setPromptLoading(false);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────
  // generate — full streaming with auto-retry (max 3 attempts)
  // ─────────────────────────────────────────────────────
  const generate = useCallback(
    async (
      type: ContentType,
      formData: GrokFormData,
      _action: "meta" | "content" | "both" = "both",
      customPrompt?: string,
      onPhaseComplete?: OnPhaseComplete,
      onStreamDelta?: OnStreamDelta
    ): Promise<GrokResult | null> => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 2000; // 2 seconds between retries
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[grok] generate() ATTEMPT ${attempt}/${MAX_RETRIES} — type:`, type);
        
        try {
          const result = await executeGenerate(
            type,
            formData,
            _action,
            customPrompt,
            onPhaseComplete,
            onStreamDelta
          );
          
          if (result) {
            console.log(`[grok] generate() SUCCESS on attempt ${attempt}`);
            return result;
          }
          
          // If result is null but no error was thrown, retry
          if (attempt < MAX_RETRIES) {
            console.log(`[grok] generate() null result, retrying in ${RETRY_DELAY_MS}ms...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          }
        } catch (err: any) {
          console.error(`[grok] generate() FAILED on attempt ${attempt}:`, err.message);
          
          if (attempt < MAX_RETRIES) {
            console.log(`[grok] generate() retrying in ${RETRY_DELAY_MS}ms...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          } else {
            // Final attempt failed
            setError(err.message || "AI generation failed after 3 attempts. Please try again.");
            setPhase("idle");
            return null;
          }
        }
      }
      
      return null;
    },
    []
  );

  // ─────────────────────────────────────────────────────
  // executeGenerate — actual generation logic (single attempt)
  // ─────────────────────────────────────────────────────
  const executeGenerate = async (
    type: ContentType,
    formData: GrokFormData,
    _action: "meta" | "content" | "both" = "both",
    customPrompt?: string,
    onPhaseComplete?: OnPhaseComplete,
    onStreamDelta?: OnStreamDelta
  ): Promise<GrokResult | null> => {
    console.log("[grok] executeGenerate() START — type:", type);
      console.log("[grok] formData raw:", JSON.stringify(formData));

      // Normalise form data
      let normalisedFormData: GrokFormData;
      try {
        normalisedFormData = normaliseFormData(formData, type);
        console.log(
          "[grok] formData normalised:",
          JSON.stringify(normalisedFormData)
        );
      } catch (normErr: any) {
        console.error("[grok] normaliseFormData threw:", normErr);
        setError("Internal error normalising form data");
        return null;
      }

      // Validate we have a name to work with
      const name =
        normalisedFormData.exam_name ||
        normalisedFormData.job_title ||
        normalisedFormData.exam_short_name ||
        normalisedFormData.title;

      if (!name) {
        console.warn("[grok] no name field found — aborting");
        setError("Please fill in the title/name before generating.");
        return null;
      }
      console.log("[grok] resolved name:", name);

      // The customPrompt to send — prefer ai_prompt from formData if no
      // explicit customPrompt was passed (dynamic section flow)
      const promptToSend =
        customPrompt ||
        normalisedFormData.ai_prompt ||
        undefined;

      setLoading(true);
      setError(null);
      setPhase("meta");

      // Cancel any in-flight request
      if (abortRef.current) {
        console.log("[grok] cancelling previous request");
        abortRef.current.abort();
      }
      const abort = new AbortController();
      abortRef.current = abort;

      // Hard 5-minute global timeout
      const globalTimeoutId = setTimeout(() => {
        console.error("[grok] GLOBAL 5-minute timeout — aborting");
        abort.abort();
      }, 5 * 60 * 1000);

      try {
        const { url, headers } = await buildRequestConfig();

        const requestBody = JSON.stringify({
          type,
          formData: normalisedFormData,
          action: "both",
          customPrompt: promptToSend,
        });
        console.log("[grok] request body size:", requestBody.length, "bytes");

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: requestBody,
          signal: abort.signal,
        });

        console.log(
          "[grok] fetch response:",
          response.status,
          response.ok ? "OK" : "ERROR"
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("[grok] error body:", text.slice(0, 500));
          let msg: string;
          try {
            msg = JSON.parse(text).error || text;
          } catch {
            msg = text;
          }
          throw new Error(msg || `HTTP ${response.status}`);
        }

        if (!response.body) throw new Error("No response body");
        await assertSSEResponse(response);

        console.log("[grok] SSE confirmed — starting read loop");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let metaRaw = "";
        let contentRaw = "";
        let result: GrokResult | null = null;

        // ── Throttling ──────────────────────────────────────────────────────
        const THROTTLE_MS = 120;
        const THROTTLE_CHARS = 80;
        let metaThrottleTimer: ReturnType<typeof setTimeout> | null = null;
        let contentThrottleTimer: ReturnType<typeof setTimeout> | null = null;
        let metaCharsSinceFlush = 0;
        let contentCharsSinceFlush = 0;

        function flushMetaDelta(accumulated: string) {
          if (metaThrottleTimer) {
            clearTimeout(metaThrottleTimer);
            metaThrottleTimer = null;
          }
          metaCharsSinceFlush = 0;
          onStreamDelta?.("meta", "", accumulated);
        }
        function flushContentDelta(accumulated: string) {
          if (contentThrottleTimer) {
            clearTimeout(contentThrottleTimer);
            contentThrottleTimer = null;
          }
          contentCharsSinceFlush = 0;
          onStreamDelta?.("content", "", accumulated);
        }
        function scheduleMetaFlush(delta: string, accumulated: string) {
          metaCharsSinceFlush += delta.length;
          if (metaCharsSinceFlush >= THROTTLE_CHARS) {
            flushMetaDelta(accumulated);
          } else if (!metaThrottleTimer) {
            metaThrottleTimer = setTimeout(
              () => flushMetaDelta(accumulated),
              THROTTLE_MS
            );
          }
        }
        function scheduleContentFlush(delta: string, accumulated: string) {
          contentCharsSinceFlush += delta.length;
          const isTagBoundary =
            delta.includes(">") || delta.includes("\n");
          if (
            contentCharsSinceFlush >= THROTTLE_CHARS ||
            isTagBoundary
          ) {
            flushContentDelta(accumulated);
          } else if (!contentThrottleTimer) {
            contentThrottleTimer = setTimeout(
              () => flushContentDelta(accumulated),
              THROTTLE_MS
            );
          }
        }

        // ── Rolling 45 s no-data watchdog ────────────────────────────────────
        let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
        function resetWatchdog() {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          watchdogTimer = setTimeout(() => {
            console.error("[grok] 45s no-data watchdog fired — aborting");
            abort.abort();
          }, 45_000);
        }
        resetWatchdog();

        let chunkCount = 0;
        let eventCount = 0;
        let streamDone = false;

        while (!streamDone) {
          let chunkResult: ReadableStreamReadResult<Uint8Array>;
          try {
            chunkResult = await reader.read();
          } catch (readErr: any) {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            console.error(
              "[grok] reader.read() threw:",
              readErr.name,
              readErr.message
            );
            throw readErr;
          }

          resetWatchdog();
          chunkCount++;

          if (chunkResult.done) {
            const tail = decoder.decode();
            if (tail) buffer += tail;
            console.log(
              `[grok] stream ended after ${chunkCount} chunks, ${eventCount} events`
            );
            break;
          }

          buffer += decoder.decode(chunkResult.value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith(":")) {
              // keepalive ping
              if (chunkCount <= 3)
                console.log("[grok] keepalive ping received");
              continue;
            }
            if (!line.startsWith("data: ")) continue;

            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: any;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            eventCount++;
            if (eventCount <= 10) {
              console.log(
                `[grok] event #${eventCount}:`,
                JSON.stringify(event).slice(0, 120)
              );
            }

            // Phase start
            if (event.status === "start") {
              console.log("[grok] phase start:", event.phase);
              if (event.phase === "meta") setPhase("meta");
              if (event.phase === "content") setPhase("content");
            }

            // Delta tokens
            if (event.delta) {
              if (event.phase === "meta") {
                metaRaw += event.delta;
                scheduleMetaFlush(event.delta, metaRaw);
              } else if (event.phase === "content") {
                contentRaw += event.delta;
                scheduleContentFlush(event.delta, contentRaw);
              }
            }

            // Phase complete
            if (event.done && event.full) {
              console.log(
                "[grok] phase done:",
                event.phase,
                "full length:",
                event.full?.length
              );
              if (event.phase === "meta") {
                if (metaThrottleTimer) {
                  clearTimeout(metaThrottleTimer);
                  metaThrottleTimer = null;
                }
                const parsed = parseMeta(event.full);
                console.log("[grok] parsed meta:", JSON.stringify(parsed));
                onPhaseComplete?.("meta", { meta: parsed });
                setPhase("content");
              }
              if (event.phase === "content") {
                if (contentThrottleTimer) {
                  clearTimeout(contentThrottleTimer);
                  contentThrottleTimer = null;
                }
                const html = parseContent(event.full);
                console.log(
                  "[grok] parsed content length:",
                  html?.length
                );
                onPhaseComplete?.("content", { content: html });
              }
            }

            // Stream complete
            if (event.phase === "complete") {
              console.log("[grok] COMPLETE event:", event.keyInfo);
              if (event.keyInfo) setKeyInfo(event.keyInfo);
              result = {
                meta: parseMeta(metaRaw),
                content: parseContent(contentRaw),
                keyInfo: event.keyInfo || {
                  totalKeys: 0,
                  activeKeyIndex: 0,
                },
              };
              setPhase("done");
              streamDone = true;
              break;
            }

            // Error event from edge fn
            if (event.phase === "error") {
              console.error(
                "[grok] error event from edge fn:",
                event.message
              );
              throw new Error(event.message || "Generation failed");
            }
          }
        }

        if (watchdogTimer) clearTimeout(watchdogTimer);

        console.log(
          "[grok] loop finished — metaRaw:",
          metaRaw.length,
          "contentRaw:",
          contentRaw.length
        );

        // If complete event never arrived but we have data, build result anyway
        if (!result && (metaRaw || contentRaw)) {
          console.warn(
            "[grok] no complete event — building result from accumulated data"
          );
          result = {
            meta: parseMeta(metaRaw),
            content: parseContent(contentRaw),
            keyInfo: { totalKeys: 0, activeKeyIndex: 0 },
          };
          setPhase("done");
        }

        if (!result) {
          throw new Error(
            "Generation produced no output. Check edge function logs."
          );
        }

        return result;
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("[grok] AbortError — request cancelled");
          clearTimeout(globalTimeoutId);
          return null;
        }
        console.error("[grok] generate() error:", err.message);
        setError(err.message || "AI generation failed. Please try again.");
        setPhase("idle");
        return null;
      } finally {
        clearTimeout(globalTimeoutId);
        setLoading(false);
      }
    };

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setPhase("idle");
    setError(null);
  }, []);

  return {
    generate,
    generatePrompt,
    loading,
    promptLoading,
    phase,
    error,
    keyInfo,
    reset,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseMeta(raw: string): GrokResult["meta"] {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      meta_title: parsed.meta_title || "",
      meta_description: parsed.meta_description || "",
      keywords: parsed.keywords || "",
      slug: parsed.slug || "",
    };
  } catch {
    const extract = (field: string) => {
      const match = raw.match(
        new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`
        )
      );
      return match
        ? match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n")
        : "";
    };
    return {
      meta_title: extract("meta_title"),
      meta_description: extract("meta_description"),
      keywords: extract("keywords"),
      slug: extract("slug"),
    };
  }
}

function parseContent(raw: string): string {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed.html || parsed || raw;
  } catch {
    const match = raw.match(/"html"\s*:\s*"([\s\S]*)"/);
    if (match) {
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    if (raw.trim().startsWith("<")) return raw;
    return raw;
  }
}