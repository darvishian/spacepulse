/**
 * Investment pin component for globe visualization
 * TODO: Implement globe pins for company headquarters and funding events
 */

'use client';

import React from 'react';
import { InvestmentEvent } from './types';

interface InvestmentPinProps {
  event: InvestmentEvent;
  onSelect?: (event: InvestmentEvent) => void;
}

/**
 * TODO: Render investment event markers on globe
 * TODO: Show funding amount and company info
 * TODO: Color code by round type
 */
export function InvestmentPin({ event, onSelect }: InvestmentPinProps) {
  const handleClick = React.useCallback(() => {
    onSelect?.(event);
  }, [event, onSelect]);

  // TODO: This component would be used within Cesium viewer
  // to render custom pins for investment events

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer"
      data-event-id={event.id}
    >
      {/* TODO: Cesium Entity would be rendered here */}
    </div>
  );
}
