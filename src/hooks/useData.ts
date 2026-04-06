import { useEffect, useState } from "react";
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

export const useCountries = () => {
  const [countries, setCountries] = useState<DbCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("is_active", true)
        .order("country_name");

      if (!error && data) {
        setCountries(data);
      }
      setLoading(false);
    };

    fetchCountries();
  }, []);

  return { countries, loading };
};

export const useNoticesByCountry = (countryId: string | null) => {
  const [notices, setNotices] = useState<DbNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countryId) {
      setNotices([]);
      setLoading(false);
      return;
    }

    const fetchNotices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("country_id", countryId)
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotices(data);
      }
      setLoading(false);
    };

    fetchNotices();
  }, [countryId]);

  return { notices, loading };
};

// Keep the old useNotices for backward compatibility or global notices
export const useNotices = () => {
  const [notices, setNotices] = useState<DbNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotices(data);
      }
      setLoading(false);
    };

    fetchNotices();
  }, []);

  return { notices, loading };
};

export const useFamousExamsByCountry = (countryId: string | null) => {
  const [exams, setExams] = useState<DbFamousExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countryId) {
      setExams([]);
      setLoading(false);
      return;
    }

    const fetchFamousExams = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("footer_famous_exams")
        .select("*")
        .eq("country_id", countryId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setExams(data);
      }
      setLoading(false);
    };

    fetchFamousExams();
  }, [countryId]);

  return { exams, loading };
};
