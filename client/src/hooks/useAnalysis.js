import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyzeRepos, getAllResults, deleteRepoResult, getSummary, getClones, deleteClone, clearAllClones } from '../api';

export function useAnalyze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoUrls, timezone, forceRefresh }) =>
      analyzeRepos(repoUrls, timezone, forceRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    }
  });
}

export function useAllResults() {
  return useQuery({
    queryKey: ['results'],
    queryFn: getAllResults,
    staleTime: 2 * 60 * 1000
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: getSummary,
    staleTime: 2 * 60 * 1000
  });
}

export function useDeleteResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoName) => deleteRepoResult(repoName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    }
  });
}

export function useClones() {
  return useQuery({
    queryKey: ['clones'],
    queryFn: getClones,
    staleTime: 30 * 1000 // 30 seconds — disk state can change
  });
}

export function useDeleteClone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoName) => deleteClone(repoName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clones'] });
    }
  });
}

export function useClearAllClones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearAllClones,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clones'] });
    }
  });
}
