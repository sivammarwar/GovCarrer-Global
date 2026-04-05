import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Pin, ExternalLink, Loader2 } from "lucide-react";

interface Notice {
  id: string;
  notice_text: string;
  notice_link: string | null;
  is_active: boolean;
  is_pinned: boolean;
  country_id: string | null;
  created_at: string;
  countries?: {
    country_name: string;
    flag_emoji: string;
  };
}

interface Country {
  id: string;
  country_name: string;
  flag_emoji: string;
  country_code: string;
}

export const AdminNoticeBoardManager = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  
  // Form state
  const [noticeText, setNoticeText] = useState("");
  const [noticeLink, setNoticeLink] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("global");
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch notices
      const { data: noticesData, error: noticesError } = await supabase
        .from("notices")
        .select(`
          *,
          countries (
            country_name,
            flag_emoji
          )
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (noticesError) throw noticesError;

      // Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from("countries")
        .select("*")
        .eq("is_active", true)
        .order("country_name");

      if (countriesError) throw countriesError;

      setNotices(noticesData || []);
      setCountries(countriesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNoticeText("");
    setNoticeLink("");
    setSelectedCountry("global");
    setIsPinned(false);
    setIsActive(true);
    setEditingNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const noticeData = {
        notice_text: noticeText.trim(),
        notice_link: noticeLink.trim() || null,
        country_id: selectedCountry === "global" ? null : selectedCountry,
        is_pinned: isPinned,
        is_active: isActive,
      };

      if (editingNotice) {
        // Update existing notice
        const { error } = await supabase
          .from("notices")
          .update(noticeData)
          .eq("id", editingNotice.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Notice updated successfully",
        });
      } else {
        // Create new notice
        const { error } = await supabase
          .from("notices")
          .insert([noticeData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Notice created successfully",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setNoticeText(notice.notice_text);
    setNoticeLink(notice.notice_link || "");
    setSelectedCountry(notice.country_id || "global");
    setIsPinned(notice.is_pinned);
    setIsActive(notice.is_active);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const { error } = await supabase
        .from("notices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notice deleted successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePin = async (notice: Notice) => {
    try {
      const { error } = await supabase
        .from("notices")
        .update({ is_pinned: !notice.is_pinned })
        .eq("id", notice.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Notice ${!notice.is_pinned ? "pinned" : "unpinned"} successfully`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (notice: Notice) => {
    try {
      const { error } = await supabase
        .from("notices")
        .update({ is_active: !notice.is_active })
        .eq("id", notice.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Notice ${!notice.is_active ? "activated" : "deactivated"} successfully`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notice Board Manager</h2>
          <p className="text-sm text-muted-foreground">
            Manage scrolling notices displayed on the homepage (max 12 recommended)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingNotice ? "Edit Notice" : "Add New Notice"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notice-text">Notice Text *</Label>
                <Textarea
                  id="notice-text"
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="Enter notice text (keep it concise for better display)"
                  required
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {noticeText.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice-link">Notice Link (Optional)</Label>
                <Input
                  id="notice-link"
                  type="url"
                  value={noticeLink}
                  onChange={(e) => setNoticeLink(e.target.value)}
                  placeholder="https://example.com/notification"
                />
                <p className="text-xs text-muted-foreground">
                  Add a link to make the notice clickable
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">🌍 Global (All Countries)</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.flag_emoji} {country.country_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a specific country or keep it global
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="pinned">Pin Notice</Label>
                  <p className="text-xs text-muted-foreground">
                    Pinned notices appear first with a 📌 icon
                  </p>
                </div>
                <Switch
                  id="pinned"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Only active notices are displayed to users
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !noticeText.trim()}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingNotice ? "Update Notice" : "Create Notice"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notices ({notices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Pin</TableHead>
                  <TableHead>Notice Text</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No notices found. Add your first notice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  notices.map((notice) => (
                    <TableRow key={notice.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePin(notice)}
                          className={notice.is_pinned ? "text-yellow-600" : "text-gray-400"}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={notice.notice_text}>
                          {notice.notice_text}
                        </div>
                      </TableCell>
                      <TableCell>
                        {notice.countries ? (
                          <span className="flex items-center gap-1">
                            {notice.countries.flag_emoji}
                            <span className="text-xs">{notice.countries.country_name}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">🌍 Global</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {notice.notice_link ? (
                          <a
                            href={notice.notice_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="text-xs">Link</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">No link</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={notice.is_active}
                          onCheckedChange={() => toggleActive(notice)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(notice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(notice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notice.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 text-lg">
            💡 Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 text-sm space-y-2">
          <p>• Keep notice text concise (under 100 characters works best)</p>
          <p>• Use pinned notices for the most important announcements</p>
          <p>• Limit to 10-12 active notices for optimal display performance</p>
          <p>• Add links to official pages for more details</p>
          <p>• Use emojis (🔥⚡📢) to make notices more eye-catching</p>
          <p>• Set country-specific notices for targeted information</p>
        </CardContent>
      </Card>
    </div>
  );
};