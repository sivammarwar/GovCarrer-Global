import { lazy, Suspense, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useParams, useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { AdminProvider } from "@/contexts/AdminContext";

// Dynamically import components at module level (not inside component)
const AdminSectionItemsManager = lazy(() =>
  import("@/components/admin/AdminSectionItemsManager").then((m) => ({
    default: m.AdminSectionItemsManager,
  }))
);

// Wrapper component for AdminSectionItemsManager to handle URL params
const AdminSectionItemsManagerWrapper = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [section, setSection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSection = async () => {
      if (!sectionId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("dynamic_sections")
        .select("*")
        .eq("id", sectionId)
        .single();
      
      if (error) {
        toast({ title: "Error", description: "Failed to load section", variant: "destructive" });
        navigate('/admin/section-manager');
      } else {
        setSection(data);
      }
      setLoading(false);
    };
    fetchSection();
  }, [sectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Section not found</h1>
        <button 
          onClick={() => navigate('/admin/section-manager')}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Back to Section Manager
        </button>
      </div>
    );
  }
  
  // Render with key to force remount on section change
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AdminSectionItemsManager 
        key={section.id} 
        section={section} 
        onBack={() => navigate('/admin/section-manager')} 
      />
    </Suspense>
  );
};

// Lazy load admin components for code splitting
const AdminDashboard = lazy(() =>
  import("@/components/admin/AdminDashboard").then((m) => ({
    default: m.AdminDashboard,
  }))
);

const CountriesManager = lazy(() =>
  import("@/components/admin/CountriesManager").then((m) => ({
    default: m.CountriesManager,
  }))
);

const AdminFamousExams = lazy(() =>
  import("@/components/admin/AdminFamousExams").then((m) => ({
    default: m.AdminFamousExams,
  }))
);

const NoticesManager = lazy(() =>
  import("@/components/admin/NoticesManager").then((m) => ({
    default: m.NoticesManager,
  }))
);

const AdminNoticeBoardManager = lazy(() =>
  import("@/components/admin/Adminnoticeboardmanager").then((m) => ({
    default: m.AdminNoticeBoardManager,
  }))
);

const AdminSectionManager = lazy(() =>
  import("@/components/admin/AdminSectionManager").then((m) => ({
    default: m.AdminSectionManager,
  }))
);

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <div className="text-center space-y-4 max-w-md">
      <div className="text-destructive text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

const AdminContent = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="countries" element={<CountriesManager />} />
          <Route path="famous-exams" element={<AdminFamousExams />} />
          <Route path="notice-board" element={<AdminNoticeBoardManager />} />
          <Route path="notices" element={<NoticesManager />} />
          <Route path="section-manager" element={<AdminSectionManager />} />
          <Route path="section-items/:sectionId" element={<AdminSectionItemsManagerWrapper />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have admin privileges. Contact an administrator to get access.
          </p>
          <p className="text-sm text-muted-foreground">
            Logged in as: {user.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider>
      <AdminLayout>
        <AdminContent />
      </AdminLayout>
    </AdminProvider>
  );
};

export default Admin;
