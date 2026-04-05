import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, ExternalLink, Calendar, Search, X, Code, Pin, PinOff, Eye } from "lucide-react";
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
import { Link } from "react-router-dom";

interface Country {
  id: string;
  country_name: string;
  country_code: string;
  flag_emoji: string;
}

interface AnswerKey {
  id: string;
  country_id: string;
  exam_name: string;
  exam_date: string | null;
  post_name: string | null;
  answer_key_link: string;
  objection_link: string | null;
  objection_deadline: string | null;
  release_date: string | null;
  is_pinned: boolean;
  is_active: boolean;
  page_content: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  countries?: { country_name: string; flag_emoji: string | null };
}

const initialFormData = {
  country_id: "",
  exam_name: "",
  exam_date: "",
  post_name: "",
  answer_key_link: "",
  objection_link: "",
  objection_deadline: "",
  release_date: "",
  is_pinned: false,
  is_active: true,
};

const initialSEO: AIGeneratedSEO = {
  slug: "",
  meta_title: "",
  meta_description: "",
  keywords: "",
  page_content: "",
};

export const AdminAnswerKeys = () => {
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<AnswerKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState(initialFormData);
  const [seoData, setSeoData] = useState<AIGeneratedSEO>(initialSEO);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [keysRes, countriesRes] = await Promise.all([
      supabase
        .from("answer_keys")
        .select("*, countries(country_name, flag_emoji)")
        .order("is_pinned", { ascending: false })
        .order("release_date", { ascending: false }),
      supabase.from("countries").select("*").eq("is_active", true).order("country_name"),
    ]);
    if (keysRes.error) {
      toast({ title: "Error", description: keysRes.error.message, variant: "destructive" });
    } else {
      setAnswerKeys(keysRes.data || []);
    }
    if (countriesRes.data) setCountries(countriesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredKeys = answerKeys.filter((key) => {
    const matchesSearch =
      searchQuery === "" ||
      key.exam_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (key.post_name && key.post_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      key.countries?.country_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = filterCountry === "all" || key.country_id === filterCountry;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && key.is_active) ||
      (filterStatus === "inactive" && !key.is_active);
    return matchesSearch && matchesCountry && matchesStatus;
  });

  const clearFilters = () => { setSearchQuery(""); setFilterCountry("all"); setFilterStatus("all"); };
  const hasActiveFilters = searchQuery || filterCountry !== "all" || filterStatus !== "all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.country_id || !formData.exam_name || !formData.answer_key_link) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Country, Exam Name, Answer Key Link)",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        country_id: formData.country_id,
        exam_name: formData.exam_name.trim(),
        exam_date: formData.exam_date || null,
        post_name: formData.post_name?.trim() || null,
        answer_key_link: formData.answer_key_link.trim(),
        objection_link: formData.objection_link?.trim() || null,
        objection_deadline: formData.objection_deadline || null,
        release_date: formData.release_date || null,
        is_pinned: formData.is_pinned,
        is_active: formData.is_active,
        page_content: seoData.page_content?.trim() || null,
        slug: seoData.slug?.trim() || null,
        meta_title: seoData.meta_title?.trim() || null,
        meta_description: seoData.meta_description?.trim() || null,
        meta_keywords: seoData.keywords?.trim() || null,
        ai_content_generated: seoData.page_content?.trim() ? true : false,
        content_generated_at: seoData.page_content?.trim() ? new Date().toISOString() : null,
      };

      if (editingKey) {
        const { error } = await supabase.from("answer_keys").update(payload).eq("id", editingKey.id);
        if (error) throw error;
        toast({ title: "Success", description: "Answer key updated successfully" });
      } else {
        const { error } = await supabase.from("answer_keys").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Answer key added successfully" });
      }
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save answer key", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (key: AnswerKey) => {
    setEditingKey(key);
    setFormData({
      country_id: key.country_id,
      exam_name: key.exam_name,
      exam_date: key.exam_date || "",
      post_name: key.post_name || "",
      answer_key_link: key.answer_key_link,
      objection_link: key.objection_link || "",
      objection_deadline: key.objection_deadline || "",
      release_date: key.release_date || "",
      is_pinned: key.is_pinned,
      is_active: key.is_active,
    });
    setSeoData({
      slug: key.slug || "",
      meta_title: key.meta_title || "",
      meta_description: key.meta_description || "",
      keywords: key.meta_keywords || "",
      page_content: key.page_content || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this answer key?")) return;
    try {
      const { error } = await supabase.from("answer_keys").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Answer key deleted successfully" });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const togglePin = async (key: AnswerKey) => {
    try {
      const { error } = await supabase.from("answer_keys").update({ is_pinned: !key.is_pinned }).eq("id", key.id);
      if (error) throw error;
      toast({ title: "Success", description: key.is_pinned ? "Answer key unpinned" : "Answer key pinned to top" });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (key: AnswerKey) => {
    try {
      const { error } = await supabase.from("answer_keys").update({ is_active: !key.is_active }).eq("id", key.id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingKey(null);
    setFormData(initialFormData);
    setSeoData(initialSEO);
    setDialogOpen(false);
  };

  const openAddDialog = () => {
    setEditingKey(null);
    setFormData(initialFormData);
    setSeoData(initialSEO);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setTimeout(() => {
      setEditingKey(null);
      setFormData(initialFormData);
      setSeoData(initialSEO);
    }, 150);
  };

  // Build grokFormData for AI generator
  const grokFormData = {
    exam_name: formData.exam_name,
    country_name: countries.find(c => c.id === formData.country_id)?.country_name || "",
    exam_date: formData.exam_date,
    post_name: formData.post_name,
    answer_key_link: formData.answer_key_link,
    objection_link: formData.objection_link,
    objection_deadline: formData.objection_deadline,
    release_date: formData.release_date,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-semibold">Loading Answer Keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Answer Keys Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage exam answer keys with AI-generated SEO content</p>
        </div>
        <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Answer Key
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !submitting) closeDialog(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKey ? "Edit Answer Key" : "Add New Answer Key"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="ai">🤖 AI Content & SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
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
                  <Label>Exam Name *</Label>
                  <Input value={formData.exam_name} onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })} placeholder="e.g., UPSC Civil Services Prelims 2025" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Date</Label>
                    <Input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Post Name (Optional)</Label>
                    <Input value={formData.post_name} onChange={(e) => setFormData({ ...formData, post_name: e.target.value })} placeholder="e.g., Assistant Manager" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Answer Key Link *</Label>
                  <Input type="url" value={formData.answer_key_link} onChange={(e) => setFormData({ ...formData, answer_key_link: e.target.value })} placeholder="https://example.com/answer-key" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Objection Link (Optional)</Label>
                    <Input type="url" value={formData.objection_link} onChange={(e) => setFormData({ ...formData, objection_link: e.target.value })} placeholder="https://example.com/objections" />
                  </div>
                  <div className="space-y-2">
                    <Label>Objection Deadline</Label>
                    <Input type="date" value={formData.objection_deadline} onChange={(e) => setFormData({ ...formData, objection_deadline: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Release Date</Label>
                  <Input type="date" value={formData.release_date} onChange={(e) => setFormData({ ...formData, release_date: e.target.value })} />
                </div>

                <div className="flex items-center space-x-4">
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
                  contentType="answer_key"
                  formData={grokFormData}
                  seoData={seoData}
                  onSEOChange={setSeoData}
                />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{editingKey ? "Updating..." : "Adding..."}</>
                ) : (
                  editingKey ? "Update Answer Key" : "Add Answer Key"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Search & Filter Answer Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input type="text" placeholder="Search by exam name, post, or country..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10" />
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
              <p className="text-sm text-muted-foreground">Showing {filteredKeys.length} of {answerKeys.length} answer keys</p>
              <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear All Filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>All Answer Keys ({filteredKeys.length}{filteredKeys.length !== answerKeys.length && ` of ${answerKeys.length}`})</CardTitle>
        </CardHeader>
        <CardContent>
          {answerKeys.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No answer keys added yet. Click "Add Answer Key" to create one.</p>
          ) : filteredKeys.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No answer keys found matching your search criteria.</p>
              <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear Filters</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKeys.map((key) => (
                <div key={key.id} className={`border-2 p-4 rounded-lg ${key.is_active ? "bg-white dark:bg-gray-950" : "bg-gray-100 dark:bg-gray-900"}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {key.is_pinned && <span className="bg-yellow-400 text-yellow-900 px-2 py-1 text-xs font-bold rounded">PINNED</span>}
                        {!key.is_active && <span className="bg-gray-400 text-white px-2 py-1 text-xs font-bold rounded">INACTIVE</span>}
                        <span className="bg-blue-600 text-white px-2 py-1 text-xs font-bold rounded">ANSWER KEY</span>
                        {key.page_content && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <Code className="w-3 h-3" />AI SEO
                          </span>
                        )}
                        {key.slug && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">SEO Ready</span>}
                      </div>
                      <h3 className="text-lg font-bold">{key.exam_name}</h3>
                      {key.post_name && <p className="text-sm text-muted-foreground">Post: {key.post_name}</p>}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span>{key.countries?.flag_emoji} {key.countries?.country_name}</span>
                        {key.exam_date && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Exam: {key.exam_date}</span>}
                        {key.release_date && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Released: {key.release_date}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <a href={key.answer_key_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />Download Answer Key
                        </a>
                        {key.objection_link && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <a href={key.objection_link} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />Raise Objection{key.objection_deadline && ` (Till ${key.objection_deadline})`}
                            </a>
                          </>
                        )}
                        {key.slug && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <Link to={`/answer-keys/${key.slug}`} target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1">
                              View Page<Eye className="w-3 h-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => togglePin(key)} title={key.is_pinned ? "Unpin" : "Pin"}>
                        {key.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(key)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(key)} className={key.is_active ? "" : "bg-gray-200"}>
                        {key.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(key.id)}><Trash2 className="w-4 h-4" /></Button>
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