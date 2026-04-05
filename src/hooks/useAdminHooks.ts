import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Optimistic update helper
const optimisticUpdate = (queryClient: any, queryKey: string[], updater: any) => {
  queryClient.setQueryData(queryKey, updater);
};

// Generic mutation hook with optimistic updates
export const useOptimisticMutation = (
  tableName: string,
  queryKey: string[],
  onSuccessMessage: string
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(queryKey);

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any[]) => {
        return [...(old || []), { ...newData, id: 'temp-' + Date.now() }];
      });

      return { previousData };
    },
    onError: (err: any, newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast({
        title: 'Error',
        description: err.message || 'Operation failed',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: onSuccessMessage });
      // Invalidate to sync with server
      queryClient.invalidateQueries(queryKey);
      queryClient.invalidateQueries(['adminStats']);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any[]) => {
        return (old || []).map((item) =>
          item.id === id ? { ...item, ...data } : item
        );
      });

      return { previousData };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast({
        title: 'Error',
        description: err.message || 'Update failed',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Updated successfully' });
      queryClient.invalidateQueries(queryKey);
      queryClient.invalidateQueries(['adminStats']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any[]) => {
        return (old || []).filter((item) => item.id !== id);
      });

      return { previousData };
    },
    onError: (err: any, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast({
        title: 'Error',
        description: err.message || 'Delete failed',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Deleted successfully' });
      queryClient.invalidateQueries(queryKey);
      queryClient.invalidateQueries(['adminStats']);
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isLoading:
      createMutation.isLoading ||
      updateMutation.isLoading ||
      deleteMutation.isLoading,
  };
};

// Debounced search hook
import { useState, useEffect } from 'react';

export const useDebouncedValue = <T,>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Pagination hook
export const usePagination = (itemsPerPage: number = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  const paginate = (items: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const totalPages = (itemsCount: number) =>
    Math.ceil(itemsCount / itemsPerPage);

  return {
    currentPage,
    setCurrentPage,
    paginate,
    totalPages,
    itemsPerPage,
  };
};