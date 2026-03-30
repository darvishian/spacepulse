/**
 * Types for space industry investment and funding data
 */

export interface FundingRound {
  id: string;
  companyName: string;
  roundType: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'ipo' | 'debt' | 'grant' | 'other';
  amount: number; // in USD
  amountCurrency: string;
  announcementDate: Date;
  completionDate?: Date;
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
  date: Date;
  value?: number; // in USD
  valueCurrency?: string;
  sector?: string;
  url?: string;
  impact?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  founded: Date;
  headquarters: {
    country: string;
    city: string;
  };
  website?: string;
  totalFunding: number;
  fundingCurrency: string;
  sector: string;
  stage: 'early' | 'growth' | 'mature';
  employees?: number;
  status: 'active' | 'acquired' | 'defunct' | 'public';
}
