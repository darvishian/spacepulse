/**
 * Chart filter controls: time range selector, orbit type toggles,
 * operator multi-select, and function multi-select.
 * All filter state is lifted — parent owns it, this component calls back on changes.
 */

'use client';

import React from 'react';
import { ChartTimeRange, FilterOptions } from './types';
import { useGrowthFilterOptions } from './hooks/useChartData';
import { X, ChevronDown } from 'lucide-react';

/* ── Props ─────────────────────────────────────────────── */

interface ChartFiltersProps {
  timeRange?: ChartTimeRange;
  filters?: FilterOptions;
  onTimeRangeChange?: (range: ChartTimeRange) => void;
  onFiltersChange?: (filters: FilterOptions) => void;
}

/* ── Time-range labels (friendlier than raw enum values) ─ */

const TIME_RANGE_LABELS: Record<ChartTimeRange, string> = {
  [ChartTimeRange.ONE_DAY]: '1D',
  [ChartTimeRange.ONE_WEEK]: '1W',
  [ChartTimeRange.ONE_MONTH]: '1M',
  [ChartTimeRange.THREE_MONTHS]: '3M',
  [ChartTimeRange.ONE_YEAR]: '1Y',
  [ChartTimeRange.ALL_TIME]: 'ALL',
};

/* ── Orbit type display config ─────────────────────────── */

const ORBIT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  leo: { label: 'LEO', color: '#00d4ff' },
  meo: { label: 'MEO', color: '#00ff88' },
  geo: { label: 'GEO', color: '#ff6b35' },
  heo: { label: 'HEO', color: '#a855f7' },
};

/* ── Dropdown component (reusable) ─────────────────────── */

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: MultiSelectDropdownProps): React.ReactElement {
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

  const toggle = React.useCallback(
    (item: string) => {
      if (selected.includes(item)) {
        onChange(selected.filter((s) => s !== item));
      } else {
        onChange([...selected, item]);
      }
    },
    [selected, onChange]
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-space-accent/30 hover:bg-white/10"
      >
        <span className="truncate">
          {selected.length === 0
            ? `All ${label}`
            : `${selected.length} selected`}
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-white/10 bg-space-darker/95 shadow-lg backdrop-blur-sm">
          {options.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={() => toggle(item)}
                className="h-3 w-3 rounded border-white/30 bg-transparent accent-space-accent"
              />
              <span className="text-white/80">{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main filter bar ───────────────────────────────────── */

export function ChartFilters({
  timeRange = ChartTimeRange.ALL_TIME,
  filters = {},
  onTimeRangeChange,
  onFiltersChange,
}: ChartFiltersProps): React.ReactElement {
  const { data: filterOptions } = useGrowthFilterOptions();

  /* ── Orbit type toggle ─────────────────────────────── */

  const toggleOrbitType = React.useCallback(
    (type: string) => {
      const current = filters.orbitTypes ?? [];
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      onFiltersChange?.({ ...filters, orbitTypes: updated });
    },
    [filters, onFiltersChange]
  );

  const removeOrbitType = React.useCallback(
    (type: string) => {
      const updated = (filters.orbitTypes ?? []).filter((t) => t !== type);
      onFiltersChange?.({ ...filters, orbitTypes: updated });
    },
    [filters, onFiltersChange]
  );

  /* ── Operator / function changes ───────────────────── */

  const handleOperatorsChange = React.useCallback(
    (selected: string[]) => {
      onFiltersChange?.({ ...filters, operators: selected });
    },
    [filters, onFiltersChange]
  );

  const handleFunctionsChange = React.useCallback(
    (selected: string[]) => {
      onFiltersChange?.({ ...filters, functions: selected });
    },
    [filters, onFiltersChange]
  );

  /* ── Clear all filters ─────────────────────────────── */

  const hasActiveFilters =
    (filters.orbitTypes?.length ?? 0) > 0 ||
    (filters.operators?.length ?? 0) > 0 ||
    (filters.functions?.length ?? 0) > 0;

  const clearAll = React.useCallback(() => {
    onFiltersChange?.({ orbitTypes: [], operators: [], functions: [] });
  }, [onFiltersChange]);

  return (
    <div className="space-y-3">
      {/* Time range selector */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-space-accent/50 font-semibold">
          Time Range
        </label>
        <div className="mt-1.5 flex gap-1">
          {Object.values(ChartTimeRange).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange?.(range)}
              className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                timeRange === range
                  ? 'bg-space-accent text-space-dark'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Orbit type toggles */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-space-accent/50 font-semibold">
          Orbit Type
        </label>
        <div className="mt-1.5 flex gap-1.5">
          {Object.entries(ORBIT_TYPE_CONFIG).map(([key, config]) => {
            const active =
              !filters.orbitTypes?.length || filters.orbitTypes.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleOrbitType(key)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-white/10 text-white/30 opacity-50'
                }`}
                style={{
                  backgroundColor: active ? `${config.color}22` : 'transparent',
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? config.color : 'rgba(255,255,255,0.2)' }}
                />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Operator dropdown */}
      {filterOptions?.operators && filterOptions.operators.length > 0 && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-space-accent/50 font-semibold">
            Operator
          </label>
          <div className="mt-1.5">
            <MultiSelectDropdown
              label="Operators"
              options={filterOptions.operators}
              selected={filters.operators ?? []}
              onChange={handleOperatorsChange}
            />
          </div>
        </div>
      )}

      {/* Function dropdown */}
      {filterOptions?.functions && filterOptions.functions.length > 0 && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-space-accent/50 font-semibold">
            Function
          </label>
          <div className="mt-1.5">
            <MultiSelectDropdown
              label="Functions"
              options={filterOptions.functions}
              selected={filters.functions ?? []}
              onChange={handleFunctionsChange}
            />
          </div>
        </div>
      )}

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {(filters.orbitTypes ?? []).map((type) => (
            <span
              key={`orbit-${type}`}
              className="flex items-center gap-1 rounded-full bg-space-accent/15 px-2 py-0.5 text-[10px] text-space-accent"
            >
              {ORBIT_TYPE_CONFIG[type]?.label ?? type}
              <button onClick={() => removeOrbitType(type)} className="hover:text-white">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {(filters.operators ?? []).map((op) => (
            <span
              key={`op-${op}`}
              className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-400"
            >
              {op}
              <button
                onClick={() =>
                  handleOperatorsChange((filters.operators ?? []).filter((o) => o !== op))
                }
                className="hover:text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {(filters.functions ?? []).map((fn) => (
            <span
              key={`fn-${fn}`}
              className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-400"
            >
              {fn}
              <button
                onClick={() =>
                  handleFunctionsChange((filters.functions ?? []).filter((f) => f !== fn))
                }
                className="hover:text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="ml-1 text-[10px] text-white/40 underline hover:text-white/60"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
