import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Country {
  id: string;
  country_name: string;
  country_code: string;
  flag_emoji: string | null;
  is_active: boolean;
}

export const CountriesManager = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    country_name: "",
    country_code: "",
    flag_emoji: "",
    is_active: true,
  });
  const { toast } = useToast();

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .order("country_name");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCountries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCountry) {
      const { error } = await supabase
        .from("countries")
        .update(formData)
        .eq("id", editingCountry.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Country updated successfully" });
        fetchCountries();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from("countries").insert(formData);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Country added successfully" });
        fetchCountries();
        setDialogOpen(false);
      }
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      country_name: country.country_name,
      country_code: country.country_code,
      flag_emoji: country.flag_emoji || "",
      is_active: country.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this country? All associated jobs and exams will also be deleted.")) return;

    const { error } = await supabase.from("countries").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Country deleted successfully" });
      fetchCountries();
    }
  };

  const resetForm = () => {
    setEditingCountry(null);
    setFormData({
      country_name: "",
      country_code: "",
      flag_emoji: "",
      is_active: true,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Countries</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Country
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCountry ? "Edit Country" : "Add Country"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country_name">Country Name</Label>
                <Input
                  id="country_name"
                  value={formData.country_name}
                  onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                  placeholder="United States"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country_code">Country Code (ISO)</Label>
                <Input
                  id="country_code"
                  value={formData.country_code}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  placeholder="US"
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag_emoji">Flag Emoji</Label>
                <Input
                  id="flag_emoji"
                  value={formData.flag_emoji}
                  onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })}
                  placeholder="🇺🇸"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingCountry ? "Update" : "Add"} Country
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Countries ({countries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : countries.length === 0 ? (
            <p className="text-muted-foreground">No countries added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell className="text-2xl">{country.flag_emoji || "🏳️"}</TableCell>
                    <TableCell className="font-medium">{country.country_name}</TableCell>
                    <TableCell>{country.country_code}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${country.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {country.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(country)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(country.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
