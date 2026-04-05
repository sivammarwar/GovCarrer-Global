import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  needsRegeneration: boolean;
  lastUpdate: string | null;
  recordsCount: number;
  aiContentCount: number;
  aiContentPercentage: number;
}

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Unique ID per hook instance — prevents channel name collision on remount
// (React StrictMode mounts → unmounts → remounts in dev, causing the error)
let instanceCounter = 0;

export const useSEOSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus>({
    needsRegeneration: false,
    lastUpdate: null,
    recordsCount: 0,
    aiContentCount: 0,
    aiContentPercentage: 0,
  });
  const { toast } = useToast();
  const mountedRef = useRef(true);
  // Stable channel name for this specific hook instance
  const channelNameRef = useRef(`seo_updates_${++instanceCounter}`);

  const checkSyncStatus = async () => {
    try {
      const tablesWithActive = ['exam_listings', 'job_listings', 'results', 'answer_keys'];
      let totalCount = 0;
      let aiContentCount = 0;

      const results = await Promise.allSettled(
        tablesWithActive.map(async (table) => {
          const [totalRes, aiRes] = await Promise.all([
            supabase.from(table).select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from(table).select('*', { count: 'exact', head: true }).eq('is_active', true).eq('ai_content_generated', true),
          ]);
          return { total: totalRes.count || 0, ai: aiRes.count || 0 };
        })
      );

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          totalCount += r.value.total;
          aiContentCount += r.value.ai;
        }
      });

      try {
        const { count: famousCount } = await supabase
          .from('footer_famous_exams')
          .select('*', { count: 'exact', head: true });
        totalCount += famousCount || 0;
      } catch {
        // non-blocking
      }

      if (!mountedRef.current) return;

      const percentage = totalCount > 0 ? Math.round((aiContentCount / totalCount) * 100) : 0;

      let needsRegen = true;
      const lastGenerated = safeGetItem('lastSitemapGeneration');
      if (lastGenerated) {
        const hoursSince = (Date.now() - new Date(lastGenerated).getTime()) / (1000 * 60 * 60);
        needsRegen = hoursSince > 24;
      }

      setStatus((prev) => ({
        ...prev,
        recordsCount: totalCount,
        aiContentCount,
        aiContentPercentage: percentage,
        needsRegeneration: needsRegen,
      }));
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    checkSyncStatus();

    const handleTableChange = (payload: any) => {
      if (!mountedRef.current) return;

      setStatus((prev) => ({
        ...prev,
        needsRegeneration: true,
        lastUpdate: new Date().toISOString(),
      }));

      if (payload.eventType === 'INSERT') {
        toast({
          title: '🔄 SEO Update Needed',
          description: `New ${payload.table.replace(/_/g, ' ')} added. Consider regenerating sitemap.`,
          duration: 5000,
        });
      }

      checkSyncStatus();
    };

    // Use the stable per-instance channel name — prevents collision on remount
    const channel = supabase
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_listings' }, handleTableChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_listings' }, handleTableChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, handleTableChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answer_keys' }, handleTableChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'footer_famous_exams' }, handleTableChange)
      .subscribe();

    const handleSitemapRegenerated = () => {
      if (!mountedRef.current) return;
      setStatus((prev) => ({ ...prev, needsRegeneration: false }));
      checkSyncStatus();
    };

    const handleAIContentGenerated = () => {
      if (!mountedRef.current) return;
      checkSyncStatus();
    };

    window.addEventListener('sitemapRegenerated', handleSitemapRegenerated);
    window.addEventListener('aiContentGenerated', handleAIContentGenerated);

    return () => {
      mountedRef.current = false;
      // removeChannel fully tears down the channel — safer than .unsubscribe()
      supabase.removeChannel(channel);
      window.removeEventListener('sitemapRegenerated', handleSitemapRegenerated);
      window.removeEventListener('aiContentGenerated', handleAIContentGenerated);
    };
  }, []);

  return status;
};