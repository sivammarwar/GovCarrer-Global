import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from "next-themes";
import { Analytics } from '@vercel/analytics/react';

const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FamousExamDetailPage = lazy(() => import('@/pages/FamousExamDetailPage').then(m => ({ default: m.FamousExamDetailPage })));
const DynamicSectionItemPage = lazy(() => import('@/pages/DynamicSectionItemPage').then(m => ({ default: m.DynamicSectionItemPage })));
const DynamicItemDetailPage = lazy(() => import('@/pages/DynamicItemDetailPage').then(m => ({ default: m.DynamicItemDetailPage })));
const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
        staleTime: 10min — government exam data doesn't change second-to-second.
        This prevents the duplicate countries fetches visible in the network trace
        (same endpoint hit at 1,754ms and again at 3,817ms). When the second
        component mounts and calls useCountries(), React Query serves from cache.
      */
      staleTime: 10 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      /*
        refetchOnWindowFocus: false — critical for LCP.
        With true (the original default), switching browser tabs fires 8+
        Supabase requests simultaneously on return. Government data doesn't
        need real-time updates on focus.
      */
      refetchOnWindowFocus: false,
      /*
        refetchOnMount: false — when a component unmounts and remounts
        (e.g. tab switching), React Query won't re-fetch if data is fresh.
        Combined with staleTime above, this is the primary fix for the
        duplicate countries request in the network waterfall.
      */
      refetchOnMount: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/s/:sectionSlug/:itemSlug" element={<DynamicItemDetailPage />} />
                  <Route path="/famous-exams/:slug" element={<FamousExamDetailPage />} />
                  <Route path="/section/:sectionSlug/:itemSlug" element={<DynamicSectionItemPage />} />
                  <Route path="/chat/:sectionId" element={<ChatPage />} />
                  <Route path="/admin/*" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Analytics />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
