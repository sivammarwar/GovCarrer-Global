import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Briefcase, FileText, TrendingUp, Award, Bell, FileCheck, Trophy, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SitemapRegenerator } from "../SitemapRegenerator";
import { useSEOSyncStatus } from "@/hooks/useSEOSyncStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface AdminStats {
  countries: number;
  jobs: number;
  exams: number;
  activeJobs: number;
  famousExams: number;
  notices: number;
  answerKeys: number;
  results: number;
}

export const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const seoStatus = useSEOSyncStatus();

  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;
      return data as AdminStats;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handleRegeneration = () => { queryClient.invalidateQueries(['adminStats']); };
    window.addEventListener('sitemapRegenerated', handleRegeneration);
    return () => window.removeEventListener('sitemapRegenerated', handleRegeneration);
  }, [queryClient]);

  const statCards = [
    { title: "Total Countries", value: stats?.countries || 0, icon: Globe, color: "text-blue-600", bgColor: "bg-blue-100" },
    { title: "Job Listings", value: stats?.jobs || 0, icon: Briefcase, color: "text-green-600", bgColor: "bg-green-100" },
    { title: "Exam Listings", value: stats?.exams || 0, icon: FileText, color: "text-purple-600", bgColor: "bg-purple-100" },
    { title: "Active Jobs", value: stats?.activeJobs || 0, icon: TrendingUp, color: "text-orange-600", bgColor: "bg-orange-100" },
    { title: "Famous Exams", value: stats?.famousExams || 0, icon: Award, color: "text-red-600", bgColor: "bg-red-100" },
    { title: "Active Notices", value: stats?.notices || 0, icon: Bell, color: "text-yellow-600", bgColor: "bg-yellow-100" },
    { title: "Answer Keys", value: stats?.answerKeys || 0, icon: FileCheck, color: "text-indigo-600", bgColor: "bg-indigo-100" },
    { title: "Results", value: stats?.results || 0, icon: Trophy, color: "text-rose-600", bgColor: "bg-rose-100" },
  ];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading stats: {(error as any).message}</p>
      </div>
    );
  }

  const scrollToSitemap = () => {
    document.getElementById('sitemap-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const totalSEOPages = (stats?.exams || 0) + (stats?.jobs || 0) + (stats?.results || 0) + (stats?.answerKeys || 0) + (stats?.famousExams || 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* SEO Sync Status Alert */}
      {seoStatus.needsRegeneration && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Sitemap Needs Regeneration</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Content has been updated since the last sitemap generation.
            {seoStatus.lastUpdate && (
              <span className="block mt-1 text-sm">Last update: {new Date(seoStatus.lastUpdate).toLocaleString()}</span>
            )}
            <Button variant="link" className="ml-0 pl-0 h-auto text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100" onClick={scrollToSitemap}>
              Regenerate Now →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" /> : stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEO Stats Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">SEO Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-blue-800 dark:text-blue-200">
          <div className="flex items-center justify-between">
            <span>📊 Total SEO-Ready Pages:</span>
            <span className="font-bold text-lg">
              {isLoading ? <div className="h-6 w-12 bg-blue-200 animate-pulse rounded" /> : totalSEOPages.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>🔍 Indexed Content:</span>
            <span className="font-medium">
              {isLoading ? (
                <div className="h-4 w-48 bg-blue-200 animate-pulse rounded" />
              ) : (
                `${stats?.exams || 0} Exams + ${stats?.jobs || 0} Jobs + ${stats?.results || 0} Results + ${stats?.answerKeys || 0} Answer Keys + ${stats?.famousExams || 0} Famous Exams`
              )}
            </span>
          </div>
          {seoStatus.lastUpdate && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
              Last content update: {new Date(seoStatus.lastUpdate).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sitemap Regenerator */}
      <div id="sitemap-section">
        <SitemapRegenerator />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p>• Go to <strong>Exams</strong> → click "Add Exam" → fill Basic Info → go to <strong>🤖 AI Content & SEO tab</strong> → Generate</p>
          <p>• Go to <strong>Jobs</strong> → click "Add Job" → fill Basic Info → go to <strong>🤖 AI Content & SEO tab</strong> → Generate</p>
          <p>• Go to <strong>Results</strong> → click "Add Result" → fill Basic Info → go to <strong>🤖 AI Content & SEO tab</strong> → Generate</p>
          <p>• Go to <strong>Answer Keys</strong> → click "Add Answer Key" → fill Basic Info → go to <strong>🤖 AI Content & SEO tab</strong> → Generate</p>
          <p>• Go to <strong>Famous Exams</strong> → click "Add Famous Exam" → fill Basic Info → go to <strong>🤖 AI Content & SEO tab</strong> → Generate</p>
          <p>• Go to <strong>Countries</strong> to add/manage countries</p>
          <p>• Go to <strong>Notices</strong> to manage ticker notifications</p>
        </CardContent>
      </Card>
    </div>
  );
};