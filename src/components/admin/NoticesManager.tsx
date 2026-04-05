import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Pin, PinOff, ExternalLink, Bell, Search, X } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { useAdminContext } from "@/contexts/AdminContext";
import { useOptimisticMutation, useDebouncedValue, usePagination } from "@/hooks/useAdminHooks";

interface Notice {
  id: string;
  country_id: string;
  notice_text: string;
  notice_link: string | null;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  countries?: {
    country_name: string;
    flag_emoji: string | null;
  };
}

const initialFormData = {
  country_id: "",
  notice_text: "",
  notice_link: "",
  is_active: true,
  is_pinned: false,
};

export const NoticesManager = () => {
  const { countries } = useAdminContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [formData, setFormData] = useState(initialFormData);

  // Debounce search for better performance
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Pagination
  const { currentPage, setCurrentPage, paginate, totalPages } = usePagination(20);

  // Optimistic mutations
  const mutations = useOptimisticMutation(
    'notices',
    ['notices'],
    'Notice saved successfully'
  );

  // Fetch notices with React Query
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*, countries(country_name, flag_emoji)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Client-side filtering (faster than DB queries for small datasets)
  const filteredNotices = notices.filter((notice) => {
    const matchesSearch = 
      debouncedSearch === "" ||
      notice.notice_text.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      notice.countries?.country_name.toLowerCase().includes(debouncedSearch.toLowerCase());

    const matchesCountry = 
      filterCountry === "all" || 
      notice.country_id === filterCountry;

    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "active" && notice.is_active) ||
      (filterStatus === "inactive" && !notice.is_active);

    return matchesSearch && matchesCountry && matchesStatus;
  });

  // Paginated results
  const paginatedNotices = paginate(filteredNotices);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCountry("all");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterCountry !== "all" || filterStatus !== "all";

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingNotice(null);
    setDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.country_id || !formData.notice_text.trim() || !formData.notice_link.trim()) {
      return;
    }

    const payload = {
      country_id: formData.country_id,
      notice_text: formData.notice_text.trim(),
      notice_link: formData.notice_link.trim(),
      is_active: formData.is_active,
      is_pinned: formData.is_pinned,
    };

    try {
      if (editingNotice) {
        await mutations.update({ id: editingNotice.id, data: payload });
      } else {
        await mutations.create(payload);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving notice:', error);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      country_id: notice.country_id,
      notice_text: notice.notice_text,
      notice_link: notice.notice_link || "",
      is_active: notice.is_active,
      is_pinned: notice.is_pinned,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    await mutations.delete(id);
  };

  const togglePin = async (notice: Notice) => {
    await mutations.update({
      id: notice.id,
      data: { is_pinned: !notice.is_pinned }
    });
  };

  const toggleActive = async (notice: Notice) => {
    await mutations.update({
      id: notice.id,
      data: { is_active: !notice.is_active }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold">Loading Notices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage country-specific notices and announcements
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Notice
        </Button>
      </div>

      {/* Dialog - Same as before but with optimized submission */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNotice ? "Edit Notice" : "Add New Notice"}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country_id">Country *</Label>
              <Select
                value={formData.country_id}
                onValueChange={(value) => setFormData({ ...formData, country_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.flag_emoji} {country.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice_text">Notice Text *</Label>
              <Textarea
                id="notice_text"
                value={formData.notice_text}
                onChange={(e) => setFormData({ ...formData, notice_text: e.target.value })}
                placeholder="🔥 UPSC Civil Services exam dates announced..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice_link">Notice Link *</Label>
              <Input
                id="notice_link"
                type="url"
                value={formData.notice_link}
                onChange={(e) => setFormData({ ...formData, notice_link: e.target.value })}
                placeholder="https://upsc.gov.in"
                required
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                />
                <Label htmlFor="is_pinned">Pin to Top</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={mutations.isLoading}
              >
                {mutations.isLoading ? "Saving..." : editingNotice ? "Update Notice" : "Add Notice"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={mutations.isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Notices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by notice text or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Filter by Country</Label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.flag_emoji} {country.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
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
              <p className="text-sm text-muted-foreground">
                Showing {filteredNotices.length} of {notices.length} notices
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notices ({filteredNotices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotices.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No notices found.</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{notice.countries?.flag_emoji}</span>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {notice.countries?.country_name}
                        </span>
                        {notice.is_pinned && (
                          <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1">
                            <Pin className="h-3 w-3" />
                            PINNED
                          </span>
                        )}
                        {!notice.is_active && (
                          <span className="bg-red-100 text-red-600 px-2 py-0.5 text-xs font-semibold rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        {notice.notice_text}
                      </p>
                      {notice.notice_link && (
                        <a
                          href={notice.notice_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {notice.notice_link}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant={notice.is_pinned ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePin(notice)}
                      >
                        {notice.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(notice)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={notice.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleActive(notice)}
                      >
                        {notice.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(notice.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages(filteredNotices.length) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages(filteredNotices.length)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages(filteredNotices.length)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};