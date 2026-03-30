/**
 * Drag handle rendered between resizable panels.
 * Uses the react-resizable-panels Separator API (v4.x).
 * Styled for the space-dark theme with a subtle accent glow on hover/drag.
 */

'use client';

import React from 'react';
import { Separator } from 'react-resizable-panels';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface ResizeHandleProps {
  /** 'horizontal' → panels are side-by-side, divider is vertical.
   *  'vertical'   → panels are stacked, divider is horizontal. */
  orientation?: 'horizontal' | 'vertical';
  id?: string;
}

export function ResizeHandle({
  orientation = 'horizontal',
  id,
}: ResizeHandleProps): React.ReactElement {
  const isVerticalBar = orientation === 'horizontal';

  return (
    <Separator
      id={id}
      className={`group relative flex items-center justify-center transition-colors
        ${isVerticalBar ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'}
        hover:bg-space-accent/10 active:bg-space-accent/20`}
    >
      {/* Visible grip icon */}
      <div
        className={`rounded-sm bg-white/10 transition-colors
          group-hover:bg-space-accent/40
          group-active:bg-space-accent/60
          ${isVerticalBar ? 'px-px py-2' : 'px-2 py-px'}`}
      >
        {isVerticalBar ? (
          <GripVertical className="h-3 w-3 text-white/30 group-hover:text-space-accent/80" />
        ) : (
          <GripHorizontal className="h-3 w-3 text-white/30 group-hover:text-space-accent/80" />
        )}
      </div>
    </Separator>
  );
}
