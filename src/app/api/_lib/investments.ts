/**
 * Investments Service Library
 * Frontend API layer for space industry investments (all mock data)
 * No free APIs exist for space investment data (Crunchbase/PitchBook require paid keys)
 */

export interface FundingRound {
  id: string;
  companyName: string;
  roundType: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'ipo' | 'debt' | 'grant' | 'other';
  amount: number;
  amountCurrency: string;
  announcementDate: string;
  completionDate?: string;
  investors: string[];
  companyStage: 'early' | 'growth' | 'mature';
  sector: 'launch' | 'satellite' | 'infrastructure' | 'in_space_manufacturing' | 'robotics' | 'other';
  description?: string;
  url?: string;
}

export interface InvestmentEvent {
  id: string;
  eventType: 'funding_round' | 'merger' | 'acquisition' | 'partnership' | 'milestone';
  title: string;
  description: string;
  companies: string[];
  date: string;
  value?: number;
  valueCurrency?: string;
  sector?: string;
  url?: string;
  impact?: string;
}

export interface FundingTrend {
  byYear: Array<{ year: number; totalFunding: number; roundCount: number }>;
  bySector: Array<{ sector: string; totalFunding: number; roundCount: number }>;
}

// ── Mock Data ───────────────────────────────────────────────────────────

const mockFundingRounds: FundingRound[] = [
  {
    id: 'funding-001',
    companyName: 'Axiom Space',
    roundType: 'series_c',
    amount: 350000000,
    amountCurrency: 'USD',
    announcementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    completionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    investors: ['Saudi Arabia PIF', 'Tempur Sealy International'],
    companyStage: 'growth',
    sector: 'infrastructure',
    description: 'Series C funding for commercial space station construction',
    url: 'https://axiomspace.com',
  },
];

const mockInvestmentEvents: InvestmentEvent[] = [];

const mockFundingTrends: FundingTrend = {
  byYear: [],
  bySector: [],
};

// ── Public Functions ────────────────────────────────────────────────────

/**
 * Fetch recent funding rounds, optionally filtered by days.
 */
export async function fetchRecentFundingRounds(days: number = 30): Promise<FundingRound[]> {
  // Filter by announcement date within the specified days
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const filtered = mockFundingRounds.filter((round) => new Date(round.announcementDate) >= cutoffDate);

  return filtered;
}

/**
 * Fetch recent investment events, optionally filtered by days.
 */
export async function fetchRecentInvestmentEvents(days: number = 30): Promise<InvestmentEvent[]> {
  // Filter by date within the specified days
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const filtered = mockInvestmentEvents.filter((event) => new Date(event.date) >= cutoffDate);

  return filtered;
}

/**
 * Get funding trends aggregated by year and sector.
 */
export async function getFundingTrends(): Promise<FundingTrend> {
  return mockFundingTrends;
}

/**
 * Fetch company profile (returns null for now as no data source).
 */
export async function fetchCompanyProfile(_companyName: string): Promise<null> {
  return null;
}
