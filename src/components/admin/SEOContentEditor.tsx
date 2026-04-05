import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Code, Eye, AlertCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SEOContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
}

export const SEOContentEditor = ({
  value,
  onChange,
  label = "SEO Page Content (HTML)",
  placeholder = "Paste your custom HTML content here...",
  helperText = "You can paste any HTML content including tables, images, videos, etc. This will be rendered on the SEO page."
}: SEOContentEditorProps) => {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="seo-content">{label}</Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        )}
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
          {helperText}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Edit HTML
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <Textarea
            id="seo-content"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={20}
            className="font-mono text-sm"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            💡 Tips: You can use HTML tags, inline CSS, Bootstrap classes, Tailwind classes, etc.
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 min-h-[400px] max-h-[600px] overflow-auto">
            {value ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No content to preview</p>
                  <p className="text-xs mt-2">Switch to Edit tab to add HTML content</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {value && (
        <div className="text-xs text-muted-foreground mt-2">
          Character count: {value.length.toLocaleString()} | 
          Word count: ~{Math.round(value.replace(/<[^>]*>/g, '').split(/\s+/).length)}
        </div>
      )}
    </div>
  );
};

// Smaller inline version for forms with limited space
export const SEOContentEditorCompact = ({
  value,
  onChange,
  label = "Custom SEO Content",
  placeholder = "Paste HTML content..."
}: SEOContentEditorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="seo-content-compact">{label}</Label>
      <Textarea
        id="seo-content-compact"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        Paste any HTML content. This will override auto-generated content.
      </p>
    </div>
  );
};