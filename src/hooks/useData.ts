/*
  useData.ts
  Migrated from raw useState/useEffect to React Query.

  Key fix: useCountries() was firing duplicate network requests because
  multiple components (Header dropdown + CountrySelector) each ran their
  own useEffect fetch independently. React Query deduplicates by query key —
  only one network request fires no matter how many components call the hook.
*/

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbCountry {
  id: string;
  country_name: string;
  country_code: string;
  flag_emoji: string | null;
  is_active: boolean;
}

export interface DbNotice {
  id: string;
  notice_text: string;
  notice_link: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFamousExam {
  id: string;
  country_id: string;
  exam_name: string;
  exam_short_name: string | null;
  official_website: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Countries ────────────────────────────────────────────────────────────────

export const useCountries = () => {
  const { data: countries = [], isLoading: loading } = useQuery({
    queryKey: ["countries", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("is_active", true)
        .order("country_name");
      if (error) throw error;
      return data as DbCountry[];
    },
    // Country list rarely changes — 15min stale time means any component
    // mounting within that window gets the cached result, no extra request.
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return { countries, loading };
};

// ─── Notices by country ───────────────────────────────────────────────────────

export const useNoticesByCountry = (countryId: string | null) => {
  const { data: notices = [], isLoading: loading } = useQuery({
    queryKey: ["notices", "byCountry", countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("country_id", countryId!)
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbNotice[];
    },
    enabled: !!countryId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return { notices, loading };
};

// ─── All notices (global / backward compat) ───────────────────────────────────

export const useNotices = () => {
  const { data: notices = [], isLoading: loading } = useQuery({
    queryKey: ["notices", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbNotice[];
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return { notices, loading };
};

// ─── Famous exams by country ──────────────────────────────────────────────────

export const useFamousExamsByCountry = (countryId: string | null) => {
  const { data: exams = [], isLoading: loading } = useQuery({
    queryKey: ["famousExams", countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("footer_famous_exams")
        .select("*")
        .eq("country_id", countryId!)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as DbFamousExam[];
    },
    enabled: !!countryId,
    // This is the 91.92 KiB payload — cache aggressively since exam lists
    // change very infrequently.
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return { exams, loading };
};
