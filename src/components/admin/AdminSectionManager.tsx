// src/components/admin/AdminSectionManager.tsx
// FIX: Uses useGrokAI's new generatePrompt() instead of repurposing generate()
// The generated prompt is saved to dynamic_sections.ai_prompt and later injected
// into buildContentPrompt() when generating item pages for that section.

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Edit2, Trash2, LayoutGrid, Eye, EyeOff,
  TrendingUp, Calendar, FileCheck, Award, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { DynamicSection } from "@/hooks/useDynamicSections";
import { useGrokAI } from "@/hooks/useGrokAI";

const AVAILABLE_ICONS = [
  "FileText", "TrendingUp", "Calendar", "FileCheck", "Award",
  "Briefcase", "Bell", "BookOpen", "Clipboard", "GraduationCap",
  "Building", "Globe", "Shield", "Star", "Users"
];

const AVAILABLE_COLORS = [
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "pink", label: "Pink" },
  { value: "indigo", label: "Indigo" },
];

const initialFormData = {
  name: "",
  slug: "",
  description: "",
  icon: "FileText",
  color: "blue",
  display_order: 0,
  tab_order: 0,
  is_active: true,
  show_in_timeline: true,
  show_in_tabs: true,
  ai_prompt: "",
};

export const AdminSectionManager = () => {
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<DynamicSection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const { toast } = useToast();
  
  // Track if dialog was closed programmatically to avoid double reset
  const isClosingProgrammatically = useRef(false);

  // FIX: use the dedicated generatePrompt method — no more repurposing generate()
  const { generatePrompt, promptLoading } = useGrokAI();

  const fetchSections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dynamic_sections")
      .select("*")
      .order("tab_order", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSections(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingSection ? prev.slug : generateSlug(name),
    }));
  };

  // FIX: clean, direct call to generatePrompt — no manual JSON stripping needed
  const handleGeneratePrompt = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Section name required",
        description: "Enter a section name before generating a prompt.",
        variant: "destructive",
      });
      return;
    }

    const prompt = await generatePrompt(formData.name.trim(), formData.description.trim());

    if (prompt) {
      setFormData(prev => ({ ...prev, ai_prompt: prompt }));
      toast({
        title: "Prompt generated",
        description: "Review and edit the prompt below, then save the section.",
        duration: 3000,
      });
    } else {
      toast({
        title: "Generation failed",
        description: "Check your network connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast({
        title: "Validation Error",
        description: "Name and Slug are required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description?.trim() || null,
        icon: formData.icon,
        color: formData.color,
        display_order: formData.display_order,
        tab_order: formData.tab_order,
        is_active: formData.is_active,
        show_in_timeline: formData.show_in_timeline,
        show_in_tabs: formData.show_in_tabs,
        // ai_prompt is saved here and later injected into buildContentPrompt()
        // when generating item pages for this section
        ai_prompt: formData.ai_prompt?.trim() || null,
      };

      if (editingSection) {
        const { error } = await supabase
          .from("dynamic_sections")
          .update(payload)
          .eq("id", editingSection.id);
        if (error) throw error;
        toast({ title: "Section updated" });
      } else {
        const { error } = await supabase.from("dynamic_sections").insert(payload);
        if (error) throw error;
        toast({ title: "Section created" });
      }

      resetForm();
      await fetchSections();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save section", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (section: DynamicSection) => {
    setEditingSection(section);
    setFormData({
      name: section.name,
      slug: section.slug,
      description: section.description || "",
      icon: section.icon,
      color: section.color,
      display_order: section.display_order,
      tab_order: section.tab_order,
      is_active: section.is_active,
      show_in_timeline: section.show_in_timeline,
      show_in_tabs: section.show_in_tabs,
      ai_prompt: section.ai_prompt || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section? All items inside will also be deleted.")) return;
    try {
      const { error } = await supabase.from("dynamic_sections").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Section deleted" });
      await fetchSections();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const toggleActive = async (section: DynamicSection) => {
    try {
      const { error } = await supabase
        .from("dynamic_sections")
        .update({ is_active: !section.is_active })
        .eq("id", section.id);
      if (error) throw error;
      await fetchSections();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    isClosingProgrammatically.current = true;
    setEditingSection(null);
    setFormData(initialFormData);
    setDialogOpen(false);
    // Reset the flag after dialog has closed
    setTimeout(() => {
      isClosingProgrammatically.current = false;
    }, 200);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    // Only reset form if not already reset programmatically
    if (!isClosingProgrammatically.current) {
      setTimeout(() => {
        setEditingSection(null);
        setFormData(initialFormData);
      }, 150);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      FileText: <LayoutGrid className="w-5 h-5" />,
      TrendingUp: <TrendingUp className="w-5 h-5" />,
      Calendar: <Calendar className="w-5 h-5" />,
      FileCheck: <FileCheck className="w-5 h-5" />,
      Award: <Award className="w-5 h-5" />,
    };
    return iconMap[iconName] || <LayoutGrid className="w-5 h-5" />;
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      red: "bg-red-100 text-red-700 border-red-300",
      green: "bg-green-100 text-green-700 border-green-300",
      blue: "bg-blue-100 text-blue-700 border-blue-300",
      purple: "bg-purple-100 text-purple-700 border-purple-300",
      orange: "bg-orange-100 text-orange-700 border-orange-300",
      yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
      pink: "bg-pink-100 text-pink-700 border-pink-300",
      indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
    };
    return colorMap[color] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-semibold">Loading Sections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Section Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage dynamic sections like Admit Cards, Notifications, etc.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create New Section
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !submitting && !isClosingProgrammatically.current) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Create New Section"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Section Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Admit Cards"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Slug * (URL identifier)</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="admit-cards"
                required
                disabled={!!editingSection}
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs and API calls. Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this section"
              />
            </div>

            {/* ── AI Prompt field ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Content Generation Prompt</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This prompt is injected when generating SEO pages for items in this section,
                    making each section's pages uniquely tailored.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePrompt}
                  disabled={promptLoading || !formData.name.trim()}
                  className="ml-4 shrink-0 text-xs h-8 px-3"
                >
                  {promptLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>

              <textarea
                value={formData.ai_prompt}
                onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                placeholder={
                  formData.name
                    ? `Click "Generate with AI" to create a section-specific prompt for ${formData.name}, or write your own.\n\nAvailable placeholders: {title}, {subtitle}, {description}, {section_name}, {country_name}`
                    : `Enter a custom prompt for AI content generation.\n\nAvailable placeholders: {title}, {subtitle}, {description}, {section_name}, {country_name}`
                }
                className="w-full min-h-[140px] px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input bg-background resize-y"
              />

              {formData.ai_prompt && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Prompt saved — will be used for all new items in this section
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger><SelectValue placeholder="Select icon" /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color Theme</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                  <SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label>Tab Order</Label>
                <Input
                  type="number"
                  value={formData.tab_order}
                  onChange={(e) => setFormData({ ...formData, tab_order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show_in_tabs"
                  checked={formData.show_in_tabs}
                  onCheckedChange={(c) => setFormData({ ...formData, show_in_tabs: c })}
                />
                <Label htmlFor="show_in_tabs">Show in Dashboard Tabs</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show_in_timeline"
                  checked={formData.show_in_timeline}
                  onCheckedChange={(c) => setFormData({ ...formData, show_in_timeline: c })}
                />
                <Label htmlFor="show_in_timeline">Show in Timeline</Label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {editingSection ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingSection ? "Update Section" : "Create Section"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Section list ── */}
      <Card>
        <CardHeader>
          <CardTitle>All Sections ({sections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No sections yet. Click "Create New Section" to add one.
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`border-2 p-3 sm:p-4 rounded-lg ${section.is_active ? "bg-white" : "bg-gray-100"} ${getColorClass(section.color)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {getIconComponent(section.icon)}
                        <h3 className="text-base sm:text-lg font-bold">{section.name}</h3>
                        <span className="text-xs bg-white px-2 py-1 rounded border">{section.slug}</span>
                        {!section.is_active && (
                          <span className="text-xs bg-gray-400 text-white px-2 py-1 rounded">INACTIVE</span>
                        )}
                        {section.ai_prompt && (
                          <span className="text-xs bg-violet-100 text-violet-700 border border-violet-300 px-2 py-1 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI prompt set
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {section.description || "No description"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span>Display: {section.display_order}</span>
                        <span>Tab: {section.tab_order}</span>
                        <span>{section.show_in_tabs ? "✓ Tabs" : "✗ Tabs"}</span>
                        <span>{section.show_in_timeline ? "✓ Timeline" : "✗ Timeline"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(section)}>
                        {section.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(section)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(section.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Usage guide ── */}
      <Card>
        <CardHeader>
          <CardTitle>How AI prompts work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>1. Create a section</strong> — give it a name, slug, and optionally a description.
          </p>
          <p>
            <strong>2. Generate a prompt</strong> — click "Generate with AI" to create a section-specific
            prompt. This gets saved to the database in the <code>ai_prompt</code> column.
          </p>
          <p>
            <strong>3. Add items</strong> — when an item is added to this section and content is generated,
            the section's <code>ai_prompt</code> is injected into the content generation call,
            making each section's pages uniquely tailored (admit cards get different coverage
            than results, notifications, etc.).
          </p>
          <p>
            <strong>4. Placeholders</strong> — use <code>{"{title}"}</code>, <code>{"{subtitle}"}</code>,{" "}
            <code>{"{description}"}</code>, <code>{"{section_name}"}</code>,{" "}
            <code>{"{country_name}"}</code> in your prompt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};