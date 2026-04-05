import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DynamicSection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
  tab_order: number;
  is_active: boolean;
  show_in_timeline: boolean;
  show_in_tabs: boolean;
  ai_prompt: string | null;
  created_at: string;
}

export interface DynamicSectionItem {
  id: string;
  section_id: string;
  country_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  date_value: string | null;
  link_url: string | null;
  link_text: string | null;
  badge_text: string | null;
  badge_color: string | null;
  is_pinned: boolean;
  is_active: boolean;
  slug: string | null;
  countries?: {
    country_name: string;
    flag_emoji: string | null;
  } | null;
}

export const useDynamicSections = () => {
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dynamic_sections")
        .select("*")
        .eq("is_active", true)
        .eq("show_in_tabs", true)
        .order("tab_order", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching dynamic sections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  return { sections, loading, error, refetch: fetchSections };
};

export const useDynamicSectionItems = (sectionId: string | null, countryId?: string) => {
  const [items, setItems] = useState<DynamicSectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!sectionId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch items and countries separately
      const [itemsRes, countriesRes] = await Promise.all([
        supabase
          .from("dynamic_section_items")
          .select("*")
          .eq("section_id", sectionId)
          .eq("is_active", true)
          .order("is_pinned", { ascending: false })
          .order("date_value", { ascending: false }),
        supabase.from("countries").select("id, country_name, flag_emoji").eq("is_active", true)
      ]);

      if (itemsRes.error) throw itemsRes.error;
      
      // Join countries manually
      const countriesMap = new Map((countriesRes.data || []).map(c => [c.id, c]));
      const itemsWithCountries = (itemsRes.data || []).map(item => ({
        ...item,
        countries: item.country_id ? countriesMap.get(item.country_id) || null : null
      }));
      
      // Filter by country if specified
      let filteredItems = itemsWithCountries;
      if (countryId) {
        filteredItems = itemsWithCountries.filter(
          item => item.country_id === countryId || item.country_id === null
        );
      }
      
      setItems(filteredItems);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching section items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [sectionId, countryId]);

  return { items, loading, error, refetch: fetchItems };
};
