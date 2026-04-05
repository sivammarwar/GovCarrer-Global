import { useState, useEffect, useCallback } from "react";
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

// ─────────────────────────────────────────────────────────────────────────────
// useDynamicSections
// Fetches all active sections shown in tabs.
// Includes realtime subscription so new sections appear without reload.
// ─────────────────────────────────────────────────────────────────────────────
export const useDynamicSections = () => {
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchSections();

    // Realtime: re-fetch whenever any section row changes
    const channel = supabase
      .channel("dynamic-sections-watch")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dynamic_sections",
        },
        () => {
          fetchSections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSections]);

  return { sections, loading, error, refetch: fetchSections };
};

// ─────────────────────────────────────────────────────────────────────────────
// useDynamicSectionItems
// Fetches items for a given section, filtered optionally by country.
// Realtime subscription fires on INSERT / UPDATE / DELETE so:
//   - Uploading a new item → list updates instantly, no page reload needed.
//   - Editing / deleting an item → list reflects the change immediately.
// ─────────────────────────────────────────────────────────────────────────────
export const useDynamicSectionItems = (
  sectionId: string | null,
  countryId?: string
) => {
  const [items, setItems] = useState<DynamicSectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
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
        supabase
          .from("countries")
          .select("id, country_name, flag_emoji")
          .eq("is_active", true),
      ]);

      if (itemsRes.error) throw itemsRes.error;

      // Join countries manually
      const countriesMap = new Map(
        (countriesRes.data || []).map((c) => [c.id, c])
      );
      const itemsWithCountries = (itemsRes.data || []).map((item) => ({
        ...item,
        countries: item.country_id
          ? countriesMap.get(item.country_id) || null
          : null,
      }));

      // Filter by country if specified
      let filteredItems = itemsWithCountries;
      if (countryId) {
        filteredItems = itemsWithCountries.filter(
          (item) =>
            item.country_id === countryId || item.country_id === null
        );
      }

      setItems(filteredItems);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching section items:", err);
    } finally {
      setLoading(false);
    }
  }, [sectionId, countryId]);

  useEffect(() => {
    fetchItems();

    if (!sectionId) return;

    // Realtime subscription scoped to this section's items.
    // Any INSERT / UPDATE / DELETE triggers a full re-fetch so the list
    // always reflects the database — no manual reload required.
    const channel = supabase
      .channel(`section-items-${sectionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dynamic_section_items",
          filter: `section_id=eq.${sectionId}`,
        },
        (payload) => {
          console.log("[useDynamicSectionItems] realtime event:", payload.eventType);
          fetchItems();
        }
      )
      .subscribe((status) => {
        console.log(`[useDynamicSectionItems] channel status (${sectionId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sectionId, countryId, fetchItems]);

  return { items, loading, error, refetch: fetchItems };
};