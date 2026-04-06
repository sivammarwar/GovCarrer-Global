import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Search, X, Pin, PinOff, Eye, EyeOff, Calendar, ExternalLink, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AIContentGenerator, AIGeneratedSEO } from "@/components/admin/AIContentGenerator";
import type { DynamicSection } from "@/hooks/useDynamicSections";

interface Country {
  id: string;
  country_name: string;
  flag_emoji: string;
}

interface SectionItem {
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
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  page_content: string | null;
  form_data: FormSection[] | null;
  countries?: { country_name: string; flag_emoji: string | null } | null;
}

import type { FormSection } from "./AIContentGenerator";

const BADGE_COLORS = [
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "gray", label: "Gray" },
];

const DEFAULT_FORM_DATA = {
  country_id: "",
  title: "",
  subtitle: "",
  description: "",
  date_value: "",
  link_url: "",
  link_text: "",
  badge_text: "",
  badge_color: "blue",
  is_pinned: false,
  is_active: true,
  slug: "",
};

const DEFAULT_SEO_DATA: AIGeneratedSEO = {
  slug: "",
  meta_title: "",
  meta_description: "",
  keywords: "",
  form_data: [],
};

interface AdminSectionItemsManagerProps {
  section: DynamicSection;
  onBack?: () => void;
}

export const AdminSectionItemsManager = ({ section, onBack }: AdminSectionItemsManagerProps) => {
  const [items, setItems] = useState<SectionItem[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SectionItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [hasDraft, setHasDraft] = useState(false);
  const { toast } = useToast();

  // --- localStorage key scoped to section ---
  const draftKey = `section_item_draft_${section.id}`;

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [seoData, setSeoData] = useState<AIGeneratedSEO>(DEFAULT_SEO_DATA);

  // --- Save draft to localStorage whenever formData or seoData changes ---
  useEffect(() => {
    // Only persist when the dialog is open (i.e. user is actively filling the form)
    if (!dialogOpen) return;
    try {
      const draft = { formData, seoData, editingItemId: editingItem?.id ?? null };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      // localStorage quota exceeded or unavailable — silently ignore
    }
  }, [formData, seoData, dialogOpen, editingItem, draftKey]);

  // --- Check for a draft on mount and show a restore banner ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setHasDraft(true);
    } catch (e) {}
  }, [draftKey]);

  // --- Restore draft into form state and open dialog ---
  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.formData) setFormData(draft.formData);
      if (draft.seoData) setSeoData(draft.seoData);
      // If the draft was for an existing item, we can't fully restore editing context
      // (we'd need the full item object), so we open as a new item with pre-filled data.
      setEditingItem(null);
      setDialogOpen(true);
      setHasDraft(false);
    } catch (e) {
      toast({ title: "Error", description: "Could not restore draft.", variant: "destructive" });
    }
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {}
    setHasDraft(false);
  };

  // --- Clear draft from localStorage on successful save or cancel ---
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {}
    setHasDraft(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [itemsRes, countriesRes] = await Promise.all([
      supabase
        .from("dynamic_section_items")
        .select("*")
        .eq("section_id", section.id)
        .order("is_pinned", { ascending: false })
        .order("date_value", { ascending: false }),
      supabase.from("countries").select("*").eq("is_active", true).order("country_name"),
    ]);

    if (itemsRes.error) {
      toast({ title: "Error", description: itemsRes.error.message, variant: "destructive" });
    } else {
      const countriesMap = new Map(countriesRes.data?.map(c => [c.id, c]) || []);
      const itemsWithCountries = (itemsRes.data || []).map(item => ({
        ...item,
        countries: item.country_id ? countriesMap.get(item.country_id) || null : null
      }));
      setItems(itemsWithCountries);
    }

    if (countriesRes.data) setCountries(countriesRes.data);
    setLoading(false);
  }, [section.id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCountry = filterCountry === "all" || item.country_id === filterCountry;
    return matchesSearch && matchesCountry;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    console.log("Submitting form...", { section_id: section.id, formData, seoData });

    try {
      let finalSlug = seoData.slug?.trim();
      if (!finalSlug) {
        const currentYear = new Date().getFullYear();
        const baseSlug = formData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
        finalSlug = `${baseSlug}-${currentYear}-${Math.random().toString(36).substring(2, 8)}`;
      }

      const currentYear = new Date().getFullYear();
      const payload = {
        section_id: section.id,
        country_id: formData.country_id || null,
        title: formData.title.trim(),
        subtitle: formData.subtitle?.trim() || null,
        description: formData.description?.trim() || null,
        date_value: formData.date_value || null,
        link_url: formData.link_url?.trim() || null,
        link_text: formData.link_text?.trim() || null,
        badge_text: formData.badge_text?.trim() || null,
        badge_color: formData.badge_color,
        is_pinned: formData.is_pinned,
        is_active: formData.is_active,
        slug: finalSlug,
        meta_title: seoData.meta_title?.trim() || `${formData.title} ${currentYear} - ${section.name}`,
        meta_description: seoData.meta_description?.trim() || `Complete guide for ${formData.title} ${currentYear}.`,
        meta_keywords: seoData.keywords?.trim() || `${formData.title}, ${section.name}, ${currentYear}`,
        page_content: null,
        form_data: seoData.form_data || [],
      };

      console.log("Payload:", payload);

      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
          )
        ]);
      };

      if (editingItem) {
        const { error } = await withTimeout(
          supabase.from("dynamic_section_items").update(payload).eq("id", editingItem.id),
          30000,
          "Database update timed out after 30 seconds"
        );
        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        console.log("Inserting new item...");
        const { data, error } = await withTimeout(
          supabase.from("dynamic_section_items").insert(payload).select(),
          30000,
          "Database insert timed out after 30 seconds"
        );
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        console.log("Insert success:", data);
        toast({ title: "Success", description: "Item added successfully" });
      }

      // Clear draft only after a successful DB write
      clearDraft();
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error("Submit error:", error);
      // Draft is intentionally NOT cleared here — user can retry without losing data
      toast({
        title: "Error",
        description: `${error.message || "Failed to save item"} — your form data has been preserved. Click "Add Item" to try again.`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: SectionItem) => {
    setEditingItem(item);
    setFormData({
      country_id: item.country_id || "",
      title: item.title,
      subtitle: item.subtitle || "",
      description: item.description || "",
      date_value: item.date_value || "",
      link_url: item.link_url || "",
      link_text: item.link_text || "",
      badge_text: item.badge_text || "",
      badge_color: item.badge_color || "blue",
      is_pinned: item.is_pinned,
      is_active: item.is_active,
      slug: item.slug || "",
    });
    setSeoData({
      slug: item.slug || "",
      meta_title: item.meta_title || "",
      meta_description: item.meta_description || "",
      keywords: item.meta_keywords || "",
      form_data: (item.form_data as FormSection[]) || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const { error } = await supabase.from("dynamic_section_items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Item deleted successfully" });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const togglePin = async (item: SectionItem) => {
    try {
      const { error } = await supabase
        .from("dynamic_section_items")
        .update({ is_pinned: !item.is_pinned })
        .eq("id", item.id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (item: SectionItem) => {
    try {
      const { error } = await supabase
        .from("dynamic_section_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData(DEFAULT_FORM_DATA);
    setSeoData(DEFAULT_SEO_DATA);
    setDialogOpen(false);
    // Note: clearDraft() is only called on SUCCESS, not here,
    // so cancelling keeps the draft available for restore.
  };

  const getContentTypeFromSection = (sectionName: string): "exam" | "job" | "result" | "answer_key" | "famous_exam" => {
    const name = sectionName.toLowerCase();
    if (name.includes("answer key")) return "answer_key";
    if (name.includes("result")) return "result";
    if (name.includes("job")) return "job";
    if (name.includes("exam")) return "exam";
    if (name.includes("famous")) return "famous_exam";
    return "exam";
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      red: "bg-red-100 text-red-700 border-red-300",
      green: "bg-green-100 text-green-700 border-green-300",
      blue: "bg-blue-100 text-blue-700 border-blue-300",
      purple: "bg-purple-100 text-purple-700 border-purple-300",
      orange: "bg-orange-100 text-orange-700 border-orange-300",
      yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
      gray: "bg-gray-100 text-gray-700 border-gray-300",
    };
    return colorMap[color] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-semibold">Loading Items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Draft restore banner */}
      {hasDraft && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span className="flex-1">
            📝 <strong>Unsaved draft found.</strong> You have form data from a previous session that wasn't saved to the database.
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-100" onClick={restoreDraft}>
              Restore Draft
            </Button>
            <Button size="sm" variant="ghost" className="text-yellow-700 hover:bg-yellow-100" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{section.name} Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage items in this section</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
              ← Back to Sections
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !submitting) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="ai">🤖 AI Content & SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country (Optional)</Label>
                    <Select value={formData.country_id || "none"} onValueChange={(v) => setFormData({ ...formData, country_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Countries</SelectItem>
                        {countries.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.country_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={formData.date_value} onChange={(e) => setFormData({ ...formData, date_value: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., JEE Main Admit Card 2025" required />
                </div>

                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="e.g., National Testing Agency" />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Badge Text</Label>
                    <Input value={formData.badge_text} onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })} placeholder="e.g., NEW" />
                  </div>

                  <div className="space-y-2">
                    <Label>Badge Color</Label>
                    <Select value={formData.badge_color} onValueChange={(v) => setFormData({ ...formData, badge_color: v })}>
                      <SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger>
                      <SelectContent>
                        {BADGE_COLORS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input type="url" value={formData.link_url} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} placeholder="https://..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Link Text</Label>
                    <Input value={formData.link_text} onChange={(e) => setFormData({ ...formData, link_text: e.target.value })} placeholder="e.g., Download Admit Card" />
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="is_pinned" checked={formData.is_pinned} onCheckedChange={(c) => setFormData({ ...formData, is_pinned: c })} />
                    <Label htmlFor="is_pinned">Pin to top</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="is_active" checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-4">
                <AIContentGenerator
                  contentType={getContentTypeFromSection(section.name)}
                  formData={{
                    title: formData.title,
                    subtitle: formData.subtitle,
                    description: formData.description,
                    section_name: section.name,
                    country_name: countries.find(c => c.id === formData.country_id)?.country_name || "",
                    link_url: formData.link_url,
                    link_text: formData.link_text,
                    badge_text: formData.badge_text,
                    badge_color: formData.badge_color,
                    date_value: formData.date_value,
                  }}
                  customPrompt={section.ai_prompt || undefined}
                  seoData={seoData}
                  onSEOChange={setSeoData}
                />
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{editingItem ? "Updating..." : "Adding..."}</>
                ) : (
                  editingItem ? "Update Item" : "Add Item"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting} className="w-full sm:w-auto">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input type="text" placeholder="Search by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10" />
            {searchQuery && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Filter by Country</Label>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger><SelectValue placeholder="All Countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.country_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Items ({filteredItems.length}{filteredItems.length !== items.length && ` of ${items.length}`})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No items added yet. Click "Add Item" to create one.</p>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No items found matching your search.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilterCountry("all"); }}><X className="h-4 w-4 mr-2" />Clear Filters</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className={`border-2 p-3 sm:p-4 rounded-lg ${item.is_active ? "bg-white" : "bg-gray-100"} ${getColorClass(item.badge_color || "gray")}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.is_pinned && <span className="bg-yellow-400 text-yellow-900 px-2 py-1 text-xs font-bold rounded">PINNED</span>}
                        {!item.is_active && <span className="bg-gray-400 text-white px-2 py-1 text-xs font-bold rounded">INACTIVE</span>}
                        {item.badge_text && (
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-white border">{item.badge_text}</span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.title}
                          {item.form_data && item.form_data.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                              <Code className="w-3 h-3" />{item.form_data.length} section{item.form_data.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </h3>
                      {item.subtitle && <p className="text-sm text-muted-foreground">{item.subtitle}</p>}
                      {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {item.countries && <span>{item.countries.flag_emoji} {item.countries.country_name}</span>}
                        {item.date_value && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{item.date_value}</span>}
                        {item.link_url && (
                          <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />{item.link_text || "Link"}
                          </a>
                        )}
                        {item.slug && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">SEO: {item.slug}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => togglePin(item)} title={item.is_pinned ? "Unpin" : "Pin"}>
                        {item.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(item)} className={item.is_active ? "" : "bg-gray-200"}>
                        {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
