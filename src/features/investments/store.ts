/**
 * Investments Zustand store
 * TODO: Implement investment state management
 */

import { create } from 'zustand';
import { InvestmentStore, FundingRound, InvestmentEvent, SpaceCompany } from './types';

/**
 * TODO: Create investments store with state and actions
 * TODO: Add memoization for filtered results
 */
export const useInvestmentStore = create<InvestmentStore>((set) => ({
  fundingRounds: [],
  investmentEvents: [],
  companies: [],
  selectedEventId: null,
  selectedCompanyId: null,
  filters: {},

  setFundingRounds: (rounds: FundingRound[]) => {
    set({ fundingRounds: rounds });
  },

  setInvestmentEvents: (events: InvestmentEvent[]) => {
    set({ investmentEvents: events });
  },

  setCompanies: (companies: SpaceCompany[]) => {
    set({ companies });
  },

  setSelectedEvent: (id: string | null) => {
    set({ selectedEventId: id });
  },

  setSelectedCompany: (id: string | null) => {
    set({ selectedCompanyId: id });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));

/**
 * TODO: Implement selector hook for filtered investments
 */
export function useFilteredInvestments() {
  const events = useInvestmentStore((state) => state.investmentEvents);
  const filters = useInvestmentStore((state) => state.filters);

  // TODO: Implement filtering logic
  // - Filter by date range
  // - Filter by amount range
  // - Filter by type

  return events;
}
