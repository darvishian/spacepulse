/**
 * Investments feature types
 */

export interface FundingRound {
  id: string;
  companyId: string;
  companyName: string;
  roundType: 'seed' | 'pre-a' | 'series-a' | 'series-b' | 'series-c' | 'series-d' | 'public';
  amount: number; // USD
  currency: string;
  date: string;
  investors: string[];
  leadInvestor?: string;
  valuation?: number;
  description?: string;
}

export interface InvestmentEvent {
  id: string;
  companyId: string;
  type: 'funding' | 'acquisition' | 'merger' | 'ipo' | 'bankruptcy';
  date: string;
  fundingRound?: FundingRound;
  amount?: number;
  description?: string;
  location?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

export interface SpaceCompany {
  id: string;
  name: string;
  founded: string;
  headquarters: {
    country: string;
    latitude: number;
    longitude: number;
  };
  focus: string[];
  website?: string;
  description?: string;
  totalFunding?: number;
  lastFundingDate?: string;
}

export interface InvestmentStore {
  fundingRounds: FundingRound[];
  investmentEvents: InvestmentEvent[];
  companies: SpaceCompany[];
  selectedEventId: string | null;
  selectedCompanyId: string | null;
  filters: {
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  };

  setFundingRounds: (rounds: FundingRound[]) => void;
  setInvestmentEvents: (events: InvestmentEvent[]) => void;
  setCompanies: (companies: SpaceCompany[]) => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedCompany: (id: string | null) => void;
  setFilters: (filters: any) => void;
}
