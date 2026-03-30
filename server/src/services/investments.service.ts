import axios from 'axios';
import { FundingRound, InvestmentEvent, CompanyProfile } from '../types/investment';
import { getCache } from '../cache';
import config from '../config';

/**
 * Investments Service
 * Handles space industry funding and investment data
 * TODO: Implement actual data sources (Crunchbase, PitchBook, etc.)
 */

const cache = getCache();

/**
 * TODO: Fetch recent funding rounds in space industry
 * - Query investment databases (Crunchbase, PitchBook, etc.)
 * - Filter for companies in space sector
 * - Sort by announcement date (most recent first)
 * - Include company metadata
 */
export async function fetchRecentFundingRounds(days: number = 30): Promise<FundingRound[]> {
  try {
    const cacheKey = `investments_funding_rounds_${days}d`;
    const cached = await cache.get<FundingRound[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // TODO: Implement actual API calls
    // - Query Crunchbase GraphQL API or similar
    // - Filter for space companies and recent dates
    // - Normalize funding data

    const mockRounds: FundingRound[] = [
      {
        id: 'funding-001',
        companyName: 'Axiom Space',
        roundType: 'series_c',
        amount: 350000000,
        amountCurrency: 'USD',
        announcementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        completionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        investors: ['Saudi Arabia PIF', 'Tempur Sealy International'],
        companyStage: 'growth',
        sector: 'infrastructure',
        description: 'Series C funding for commercial space station construction',
        url: 'https://axiomspace.com',
      },
    ];

    await cache.set(cacheKey, mockRounds, config.cacheTtlLaunches);
    return mockRounds;
  } catch (error) {
    console.error('[InvestmentsService] Error fetching funding rounds:', error);
    return [];
  }
}

/**
 * TODO: Fetch recent investment events (broader than funding)
 * - Include M&A activity
 * - Include strategic partnerships
 * - Include IPOs
 * - Include major milestones with capital implications
 */
export async function fetchRecentInvestmentEvents(days: number = 30): Promise<InvestmentEvent[]> {
  try {
    const cacheKey = `investments_events_${days}d`;
    const cached = await cache.get<InvestmentEvent[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // TODO: Implement actual data collection
    // - Monitor SEC filings for IPOs
    // - Track M&A announcements
    // - Aggregate from news sources

    const mockEvents: InvestmentEvent[] = [];

    await cache.set(cacheKey, mockEvents, config.cacheTtlLaunches);
    return mockEvents;
  } catch (error) {
    console.error('[InvestmentsService] Error fetching investment events:', error);
    return [];
  }
}

/**
 * TODO: Fetch company profile and funding history
 * @param companyName Name of the space company
 */
export async function fetchCompanyProfile(companyName: string): Promise<CompanyProfile | null> {
  try {
    const cacheKey = `company_profile_${companyName.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = await cache.get<CompanyProfile>(cacheKey);

    if (cached) {
      return cached;
    }

    // TODO: Implement actual API call
    return null;
  } catch (error) {
    console.error(`[InvestmentsService] Error fetching company profile for ${companyName}:`, error);
    return null;
  }
}

/**
 * TODO: Get funding trends
 * - Aggregate funding by year
 * - Analyze by sector
 * - Calculate growth rates
 */
export async function getFundingTrends(): Promise<{
  byYear: Array<{ year: number; totalFunding: number; roundCount: number }>;
  bySector: Array<{ sector: string; totalFunding: number; roundCount: number }>;
} | null> {
  try {
    // TODO: Implement actual calculation based on funding data
    return {
      byYear: [],
      bySector: [],
    };
  } catch (error) {
    console.error('[InvestmentsService] Error calculating funding trends:', error);
    return null;
  }
}

export default {
  fetchRecentFundingRounds,
  fetchRecentInvestmentEvents,
  fetchCompanyProfile,
  getFundingTrends,
};
