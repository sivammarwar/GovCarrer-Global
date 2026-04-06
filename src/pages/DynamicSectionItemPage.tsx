import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, ArrowLeft, Calendar, MapPin, ExternalLink, FileText } from "lucide-react";
import { ChatFloatingButton } from "@/components/ChatFloatingButton";
import { FormContentRenderer } from "@/components/FormContentRenderer";
import type { FormSection } from "@/components/admin/AIContentGenerator";

interface SectionItem {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  date_value: string | null;
  link_url: string | null;
  link_text: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  page_content: string | null;
  form_data: FormSection[] | null; // New structured form data
  countries: {
    country_name: string;
    flag_emoji: string | null;
  } | null;
}

interface DynamicSection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
}

export const DynamicSectionItemPage = () => {
  const { sectionSlug, itemSlug } = useParams<{ sectionSlug: string; itemSlug: string }>();
  const [item, setItem] = useState<SectionItem | null>(null);
  const [section, setSection] = useState<DynamicSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!sectionSlug || !itemSlug) {
        setError("Missing section or item slug");
        setLoading(false);
        return;
      }

      try {
        // First fetch the section
        const { data: sectionData, error: sectionError } = await supabase
          .from("dynamic_sections")
          .select("*")
          .eq("slug", sectionSlug)
          .single();

        if (sectionError) throw sectionError;
        setSection(sectionData);

        // Then fetch the item
        const { data: itemData, error: itemError } = await supabase
          .from("dynamic_section_items")
          .select(`
            *,
            countries(country_name, flag_emoji)
          `)
          .eq("slug", itemSlug)
          .eq("section_id", sectionData.id)
          .eq("is_active", true)
          .single();

        if (itemError) throw itemError;
        setItem(itemData);
      } catch (err: any) {
        console.error("Error fetching item:", err);
        setError(err.message || "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sectionSlug, itemSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !item || !section) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Content Not Found</h1>
          <p className="text-gray-600 mb-8">
            {error || "The requested content could not be found."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft size={18} />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const title = item.meta_title || item.title;
  const description = item.meta_description || item.description || "";
  const keywords = item.meta_keywords || "";
  const canonicalUrl = `https://www.kvresults.com/section/${sectionSlug}/${itemSlug}`;

  const colorMap: Record<string, string> = {
    red: "#dc2626",
    green: "#16a34a",
    blue: "#2563eb",
    purple: "#7c3aed",
    orange: "#ea580c",
    yellow: "#ca8a04",
    pink: "#db2777",
    indigo: "#4f46e5",
  };
  const sectionColor = colorMap[section.color] || "#2563eb";

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="KV Results" />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Section Badge */}
        <div className="mb-6">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: sectionColor }}
          >
            <FileText size={16} />
            {section.name}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {item.title}
        </h1>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-xl text-gray-600 mb-6">{item.subtitle}</p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mb-8 text-sm text-gray-500">
          {item.countries && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={16} />
              {item.countries.flag_emoji} {item.countries.country_name}
            </span>
          )}
          {item.date_value && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={16} />
              {new Date(item.date_value).toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-gray-700">{item.description}</p>
          </div>
        )}

        {/* Form Content (Structured Data) */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <FormContentRenderer
            sections={item.form_data}
            title={item.title}
          />
        </div>

        {/* External Link */}
        {item.link_url && (
          <div className="mt-8 text-center">
            <a
              href={item.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: sectionColor }}
            >
              <ExternalLink size={18} />
              {item.link_text || `View on Official Website`}
            </a>
          </div>
        )}
      </main>

      {/* Chat Button */}
      <ChatFloatingButton sectionId={section.slug} />
    </div>
  );
};

export default DynamicSectionItemPage;
