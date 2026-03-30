/**
 * Custom hook for fetching and managing investment data
 * TODO: Implement investment data fetching from API
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { FundingRound, InvestmentEvent, SpaceCompany } from '../types';

interface FetchInvestmentsOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * TODO: Implement funding rounds data fetching
 * TODO: Cache with appropriate stale time
 */
export function useFundingRounds(options?: FetchInvestmentsOptions) {
  return useQuery({
    queryKey: ['funding-rounds', options],
    queryFn: async () => {
      // TODO: Fetch funding rounds from API
      // const response = await apiClient.get<FundingRound[]>(
      //   '/investments/funding-rounds',
      //   { params: options }
      // );
      // return response.data;

      return [] as FundingRound[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * TODO: Implement investment events data fetching
 */
export function useInvestmentEvents(options?: FetchInvestmentsOptions) {
  return useQuery({
    queryKey: ['investment-events', options],
    queryFn: async () => {
      // TODO: Fetch investment events from API
      return [] as InvestmentEvent[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * TODO: Implement space companies data fetching
 */
export function useSpaceCompanies() {
  return useQuery({
    queryKey: ['space-companies'],
    queryFn: async () => {
      // TODO: Fetch companies from API
      return [] as SpaceCompany[];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
