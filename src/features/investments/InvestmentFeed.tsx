/**
 * Investment feed component with timeline
 * TODO: Implement timeline view of funding events
 */

'use client';

import React from 'react';
import { useInvestmentEvents } from './hooks/useInvestments';
import { useInvestmentStore } from './store';
import { InvestmentEvent } from './types';
import { TrendingUp, DollarSign, Building2 } from 'lucide-react';

/**
 * TODO: Implement investment timeline
 * TODO: Show funding rounds chronologically
 * TODO: Filter and search capabilities
 */
export function InvestmentFeed() {
  const { data: events } = useInvestmentEvents();
  const setSelectedEvent = useInvestmentStore((state) => state.setSelectedEvent);
  const selectedEventId = useInvestmentStore((state) => state.selectedEventId);

  const sortedEvents = React.useMemo(() => {
    if (!events) return [];
    return [...events].sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [events]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'funding':
        return <DollarSign className="w-4 h-4" />;
      case 'acquisition':
      case 'merger':
        return <Building2 className="w-4 h-4" />;
      case 'ipo':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-space-accent/60">
        Investment Timeline
      </h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedEvents.map((event, idx) => (
          <button
            key={event.id}
            onClick={() => setSelectedEvent(event.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedEventId === event.id
                ? 'bg-space-accent/20 border border-space-accent/50'
                : 'bg-space-dark/50 border border-space-accent/10 hover:border-space-accent/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-space-accent/20 rounded">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">
                  {event.description || event.type.toUpperCase()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(event.date).toLocaleDateString()}
                </div>
                {event.amount && (
                  <div className="text-xs text-space-accent mt-1">
                    ${(event.amount / 1000000).toFixed(1)}M
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
