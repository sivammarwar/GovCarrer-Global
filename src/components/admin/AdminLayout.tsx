import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  Globe, 
  Briefcase, 
  GraduationCap, 
  Bell,
  Award,
  FileCheck,
  Trophy,
  LogOut,
  Zap,
  AlertCircle,
  CheckCircle,
  Megaphone,
  Settings,
  LayoutGrid
} from "lucide-react";
import { useSEOSyncStatus } from "@/hooks/useSEOSyncStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useDynamicSections } from "@/hooks/useDynamicSections";
import { FileText } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const seoStatus = useSEOSyncStatus();
  const { sections: dynamicSections } = useDynamicSections();

  // Get actual stats for sidebar display
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;
      return data as any;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    console.log("=== Logout clicked ===");
    try {
      const { error } = await supabase.auth.signOut();
      console.log("=== signOut result:", error ? "error" : "success");
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Logged out successfully" });
        // Force redirect to clear session
        window.location.href = "/admin";
      }
    } catch (err) {
      console.error("=== Logout error:", err);
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    }
  };

  const baseNavItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/countries", label: "Countries", icon: Globe },
    { path: "/admin/famous-exams", label: "Famous Exams", icon: Award },
    { path: "/admin/notice-board", label: "Notice Board", icon: Megaphone },
    { path: "/admin/notices", label: "Ticker Notices", icon: Bell },
  ];

  // Build dynamic nav items from sections
  const dynamicNavItems = dynamicSections.map(section => ({
    path: `/admin/section-items/${section.id}`,
    label: section.name,
    icon: FileText,
    isDynamic: true,
  }));

  // Combine base items + dynamic sections + section manager at the end
  const navItems = [
    ...baseNavItems,
    ...dynamicNavItems,
    { path: "/admin/section-manager", label: "Section Manager", icon: LayoutGrid },
  ];

  // Calculate total SEO pages from actual stats
  const totalSEOPages = stats 
    ? (stats.exams || 0) + (stats.jobs || 0) + (stats.results || 0) + 
      (stats.answerKeys || 0) + (stats.famousExams || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
              {/* SEO Status Badge */}
              {seoStatus.needsRegeneration && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Sitemap Update Needed
                  </span>
                </div>
              )}
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Global SEO Alert - Only show on non-dashboard pages */}
        {seoStatus.needsRegeneration && location.pathname !== "/admin" && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Content has been updated. 
              <Link to="/admin" className="ml-1 font-medium underline hover:text-amber-900 dark:hover:text-amber-100">
                Go to Dashboard to regenerate sitemap →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Mobile: horizontal scroll, Desktop: vertical sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {/* Notification dot on Dashboard when sitemap needs regeneration */}
                    {item.path === "/admin" && seoStatus.needsRegeneration && !isActive && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-2 w-2 lg:relative lg:right-0 lg:top-0 lg:translate-y-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar SEO Stats - Hidden on mobile, visible on lg */}
            <div className="hidden lg:block mt-6 p-4 rounded-lg bg-muted/50 border">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                SEO METRICS
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Pages</span>
                  <span className="font-semibold">
                    {totalSEOPages > 0 ? totalSEOPages : '...'}
                  </span>
                </div>
                
                {/* Status Indicator */}
                <div className="pt-2 border-t">
                  {seoStatus.needsRegeneration ? (
                    <Link 
                      to="/admin" 
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Update sitemap
                    </Link>
                  ) : (
                    <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Sitemap up to date
                    </div>
                  )}
                </div>

                {/* Last Update Time */}
                {seoStatus.lastUpdate && (
                  <div className="text-xs text-muted-foreground pt-1">
                    Updated: {new Date(seoStatus.lastUpdate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};