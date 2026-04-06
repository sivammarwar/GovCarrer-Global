import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileText, CheckCircle, AlertCircle, ExternalLink, Sparkles, RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SitemapStats {
  totalUrls: number;
  aiContentUrls: number;
  regularUrls: number;
  aiContentPercentage: number;
  remainingToGenerate: number;
}

export const SitemapRegenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<SitemapStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(
    localStorage.getItem('lastSitemapGeneration')
  );
  const { toast } = useToast();

  // Matches robots.txt and GitHub Actions health check
  const sitemapUrl = 'https://www.kvresults.com/sitemap.xml';

  const regenerateSitemap = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // POST to the same endpoint Google uses — API accepts both GET and POST
      const response = await fetch('/sitemap.xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (!contentType.includes('application/xml')) {
        const text = await response.text();
        throw new Error(`Unexpected response format: ${text.slice(0, 200)}`);
      }

      const xmlText = await response.text();

      // Parse XML to count URLs
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const urls = xmlDoc.getElementsByTagName('url');
      const totalUrls = urls.length;

      let aiContentUrls = 0;
      for (let i = 0; i < urls.length; i++) {
        const priority = urls[i].getElementsByTagName('priority')[0]?.textContent;
        if (priority === '0.95' || priority === '0.90') aiContentUrls++;
      }

      const regularUrls = totalUrls - aiContentUrls;
      const aiContentPercentage = totalUrls > 0 ? Math.round((aiContentUrls / totalUrls) * 100) : 0;

      setStats({ totalUrls, aiContentUrls, regularUrls, aiContentPercentage, remainingToGenerate: regularUrls });

      const now = new Date().toISOString();
      localStorage.setItem('lastSitemapGeneration', now);
      setLastGenerated(now);

      window.dispatchEvent(new Event('sitemapRegenerated'));

      toast({
        title: "✅ Sitemap regenerated!",
        description: `${totalUrls} URLs indexed (${aiContentUrls} with AI content)`,
      });

    } catch (err: any) {
      console.error('Sitemap generation error:', err);
      setError(err.message);
      toast({
        title: "❌ Error",
        description: err.message || 'Failed to generate sitemap',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copySitemapUrl = () => {
    navigator.clipboard.writeText(sitemapUrl);
    toast({ title: "📋 Copied!", description: "Sitemap URL copied to clipboard" });
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Sitemap Generator
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Generate dynamic sitemap for Google Search Console
              </CardDescription>
            </div>
          </div>

          {/* Sitemap URL */}
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-300 dark:border-blue-700">
            <code className="flex-1 text-sm text-blue-700 dark:text-blue-300 font-mono break-all">
              {sitemapUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copySitemapUrl} className="gap-2 shrink-0">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(sitemapUrl, '_blank')}
              className="gap-2 shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total URLs</div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUrls.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> With AI Content
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.aiContentUrls.toLocaleString()}</div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">{stats.aiContentPercentage}% complete</div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Needs AI Content</div>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">{stats.remainingToGenerate.toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>AI Content Generation Progress</span>
                <span>{stats.aiContentPercentage}%</span>
              </div>
              <Progress value={stats.aiContentPercentage} className="h-3" />
            </div>

            {stats.remainingToGenerate > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">Generate More AI Content</AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  {stats.remainingToGenerate.toLocaleString()} pages without AI content. Generate AI content first for better SEO, then regenerate the sitemap.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate button */}
        <div className="space-y-3">
          <Button
            onClick={regenerateSitemap}
            disabled={isGenerating}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {isGenerating ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Sitemap...</>
            ) : (
              <><RefreshCw className="mr-2 h-5 w-5" /> Regenerate Sitemap</>
            )}
          </Button>

          {!isGenerating && lastGenerated && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Last generated: {new Date(lastGenerated).toLocaleString()}
                {stats && ` • ${stats.totalUrls} URLs indexed`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Info */}
        <div className="space-y-3">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>What this does:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Scans all active section items, section listings, and famous exams</li>
                <li>• Generates dynamic XML at <code>/sitemap.xml</code> (same URL Google uses)</li>
                <li>• Prioritizes pages with AI-generated content (priority: 0.95)</li>
                <li>• Updates lastmod dates based on content changes</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800 dark:text-purple-200">
              <strong>Pro Tip:</strong> Pages with AI-generated content get priority 0.95 vs 0.8, helping them rank higher in Google.
            </AlertDescription>
          </Alert>
        </div>

        {/* Google Search Console steps */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">📤 Submit to Google Search Console:</h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Click "Copy" above to copy <code>https://www.kvresults.com/sitemap.xml</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Google Search Console <ExternalLink className="h-3 w-3" /></a></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Click "Sitemaps" → paste the URL → click "Submit"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>Wait 24–48 hours for Google to crawl and index your pages</span>
            </li>
          </ol>
        </div>

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
          <strong>When to regenerate:</strong>
          <ul className="mt-1 space-y-1">
            <li>• After adding new exams / jobs / results / answer keys</li>
            <li>• After generating AI content for pages</li>
            <li>• The sitemap also auto-refreshes when Google crawls it (dynamic, no file saved)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
