import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminContextType {
  countries: any[];
  stats: any;
  isLoading: boolean;
  refreshData: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  // Single source of truth for countries - fetched once
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, country_name, country_code, flag_emoji, is_active')
        .eq('is_active', true)
        .order('country_name');
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Single source of truth for stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const refreshData = () => {
    queryClient.invalidateQueries(['adminStats']);
    queryClient.invalidateQueries(['countries']);
  };

  return (
    <AdminContext.Provider
      value={{
        countries,
        stats,
        isLoading: countriesLoading || statsLoading,
        refreshData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
};