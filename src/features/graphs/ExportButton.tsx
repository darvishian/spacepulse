/**
 * Export button for downloading chart data as CSV or JSON.
 * Accepts the current chart data array and triggers a browser download.
 */

'use client';

import React from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { SatelliteGrowthData } from './types';

interface ExportButtonProps {
  data: SatelliteGrowthData[] | undefined;
  filename?: string;
}

type ExportFormat = 'csv' | 'json';

/** Convert SatelliteGrowthData[] to a CSV string. */
function toCSV(data: SatelliteGrowthData[]): string {
  const headers = ['Year', 'LEO', 'MEO', 'GEO', 'HEO', 'Total'];
  const rows = data.map((d) =>
    [d.year, d.leo, d.meo, d.geo, d.heo, d.total].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/** Trigger a browser file download from a string blob. */
function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportButton({
  data,
  filename = 'satellite-growth',
}: ExportButtonProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = React.useCallback(
    (format: ExportFormat) => {
      if (!data || data.length === 0) return;
      setOpen(false);

      if (format === 'csv') {
        downloadBlob(toCSV(data), `${filename}.csv`, 'text/csv;charset=utf-8');
      } else {
        const json = JSON.stringify(data, null, 2);
        downloadBlob(json, `${filename}.json`, 'application/json');
      }
    },
    [data, filename]
  );

  const disabled = !data || data.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
          disabled
            ? 'cursor-not-allowed border-white/5 text-white/20'
            : 'border-white/10 text-white/60 hover:border-space-accent/30 hover:text-white/80'
        }`}
      >
        <Download className="h-3 w-3" />
        Export
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-28 overflow-hidden rounded border border-white/10 bg-space-darker/95 shadow-lg backdrop-blur-sm">
          <button
            onClick={() => handleExport('csv')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
          >
            JSON
          </button>
        </div>
      )}
    </div>
  );
}
