import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, ExternalLink, Eye, Code, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DbCountry, DbFamousExam } from "@/hooks/useData";
import { Link } from "react-router-dom";
import { AIContentGenerator, AIGeneratedSEO } from "@/components/admin/AIContentGenerator";

const initialFormData = {
  country_id: "",
  exam_name: "",
  exam_short_name: "",
  official_website: "",
  display_order: 0,
  is_active: true,
};

const initialSEO: AIGeneratedSEO = {
  slug: "",
  meta_title: "",
  meta_description: "",
  keywords: "",
  page_content: "",
};

export const AdminFamousExams = () => {
  const [countries, setCountries] = useState<DbCountry[]>([]);
  const [exams, setExams] = useState<DbFamousExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<DbFamousExam | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState(initialFormData);
  const [seoData, setSeoData] = useState<AIGeneratedSEO>(initialSEO);
  const { toast } = useToast();

  useEffect(() => { fetchCountries(); fetchExams(); }, []);

  const fetchCountries = async () => {
    const { data } = await supabase.from("countries").select("*").eq("is_active", true).order("country_name");
    if (data) setCountries(data);
  };

  const fetchExams = async () => {
    setLoading(true);
    const { data } = await supabase.from("footer_famous_exams").select("*").order("display_order");
    if (data) setExams(data);
    setLoading(false);
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      searchQuery === "" ||
      exam.exam_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.exam_short_name && exam.exam_short_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCountry = filterCountry === "all" || exam.country_id === filterCountry;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && exam.is_active) ||
      (filterStatus === "inactive" && !exam.is_active);
    return matchesSearch && matchesCountry && matchesStatus;
  });

  const clearFilters = () => { setSearchQuery(""); setFilterCountry("all"); setFilterStatus("all"); };
  const hasActiveFilters = searchQuery || filterCountry !== "all" || filterStatus !== "all";

  const resetForm = () => {
    setFormData(initialFormData);
    setSeoData(initialSEO);
    setEditingExam(null);
    setDialogOpen(false);
  };

  const handleEdit = (exam: DbFamousExam) => {
    setFormData({
      country_id: exam.country_id,
      exam_name: exam.exam_name,
      exam_short_name: exam.exam_short_name || "",
      official_website: exam.official_website,
      display_order: exam.display_order,
      is_active: exam.is_active,
    });
    setSeoData({
      slug: exam.slug || "",
      meta_title: exam.meta_title || "",
      meta_description: exam.meta_description || "",
      keywords: exam.keywords || "",
      page_content: exam.page_content || "",
    });
    setEditingExam(exam);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.country_id || !formData.exam_name || !formData.official_website) {
      toast({ title: "Validation Error", description: "Please fill in all required fields (Country, Exam Name, Official Website)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const dataToSubmit = {
        country_id: formData.country_id,
        exam_name: formData.exam_name.trim(),
        exam_short_name: formData.exam_short_name?.trim() || null,
        official_website: formData.official_website.trim(),
        display_order: formData.display_order,
        is_active: formData.is_active,
        slug: seoData.slug?.trim() || null,
        meta_title: seoData.meta_title?.trim() || null,
        meta_description: seoData.meta_description?.trim() || null,
        keywords: seoData.keywords?.trim() || null,
        page_content: seoData.page_content?.trim() || null,
        ai_content_generated: seoData.page_content?.trim() ? true : false,
        content_generated_at: seoData.page_content?.trim() ? new Date().toISOString() : null,
      };

      if (editingExam) {
        const { error } = await supabase.from("footer_famous_exams").update(dataToSubmit).eq("id", editingExam.id);
        if (error) throw error;
        toast({ title: "Success", description: "Famous exam updated successfully" });
      } else {
        const { error } = await supabase.from("footer_famous_exams").insert([dataToSubmit]);
        if (error) throw error;
        toast({ title: "Success", description: "Famous exam added successfully" });
      }
      resetForm();
      await fetchExams();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save famous exam", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this famous exam?")) return;
    try {
      const { error } = await supabase.from("footer_famous_exams").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Famous exam deleted successfully" });
      await fetchExams();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete famous exam", variant: "destructive" });
    }
  };

  const getCountryName = (countryId: string) => countries.find(c => c.id === countryId)?.country_name || "Unknown";
  const getCountryFlag = (countryId: string) => countries.find(c => c.id === countryId)?.flag_emoji || "";

  const openAddDialog = () => {
    setEditingExam(null);
    setFormData(initialFormData);
    setSeoData(initialSEO);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setTimeout(() => {
      setEditingExam(null);
      setFormData(initialFormData);
      setSeoData(initialSEO);
    }, 150);
  };

  // Build grokFormData for AI generator
  const grokFormData = {
    exam_name: formData.exam_name,
    exam_short_name: formData.exam_short_name,
    country_name: countries.find(c => c.id === formData.country_id)?.country_name || "",
    official_website: formData.official_website,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-semibold">Loading Famous Exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Famous Exams (Footer)</h1>
          <p className="text-sm text-muted-foreground mt-1">Add exams with AI-generated SEO content</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Famous Exam
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !submitting) closeDialog(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit Famous Exam" : "Add New Famous Exam"}</DialogTitle>
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
                    <Label>Country *</Label>
                    <Select value={formData.country_id} onValueChange={(v) => setFormData({ ...formData, country_id: v })} required>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.country_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Short Name (e.g., UPSC)</Label>
                    <Input value={formData.exam_short_name} onChange={(e) => setFormData({ ...formData, exam_short_name: e.target.value })} placeholder="UPSC" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Full Exam Name *</Label>
                  <Input value={formData.exam_name} onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })} placeholder="Union Public Service Commission" required />
                </div>
                <div className="space-y-2">
                  <Label>Official Website *</Label>
                  <Input type="url" value={formData.official_website} onChange={(e) => setFormData({ ...formData, official_website: e.target.value })} placeholder="https://upsc.gov.in" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} placeholder="0" />
                    <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch id="is_active" checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-4">
                <AIContentGenerator
                  contentType="famous_exam"
                  formData={grokFormData}
                  seoData={seoData}
                  onSEOChange={setSeoData}
                />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{editingExam ? "Updating..." : "Adding..."}</>
                ) : (
                  editingExam ? "Update Exam" : "Add Exam"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5" />Search & Filter Exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input type="text" placeholder="Search by exam name or short name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10" />
            {searchQuery && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">Showing {filteredExams.length} of {exams.length} exams</p>
              <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear All Filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>Famous Exams ({filteredExams.length}{filteredExams.length !== exams.length && ` of ${exams.length}`})</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No famous exams added yet. Click "Add Famous Exam" to create one.</p>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No exams found matching your search criteria.</p>
              <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear Filters</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-lg">{exam.exam_short_name || exam.exam_name}</span>
                      {!exam.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
                      {exam.page_content && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded flex items-center gap-1">
                          <Code className="w-3 h-3" />AI SEO
                        </span>
                      )}
                      {exam.slug && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">SEO Ready</span>}
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Order: {exam.display_order}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{exam.exam_short_name ? exam.exam_name : ""}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">{getCountryFlag(exam.country_id)} {getCountryName(exam.country_id)}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <a href={exam.official_website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        {exam.official_website}<ExternalLink className="w-3 h-3" />
                      </a>
                      {exam.slug && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <Link to={`/famous-exams/${exam.slug}`} target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View Page<Eye className="w-3 h-3" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(exam)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(exam.id)}><Trash2 className="w-4 h-4" /></Button>
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