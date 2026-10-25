import { useState } from 'react';

const compact = (value) => {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(number);
};

/** Minimal responsive bar chart drawn with tokens; hover shows exact values. */
export default function BarChart({ data = [], height = 220, format = (value) => value, empty = 'No data yet' }) {
  const [hover, setHover] = useState(-1);
  if (!data.length) return <div className="grid place-items-center text-[13px] text-subtle" style={{ height }}>{empty}</div>;
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  const ticks = [0, 0.5, 1].map((ratio) => Math.round(max * ratio));

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 grid grid-rows-[1fr_auto]">
        <div className="relative ml-10">
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(tick / max) * 100}%` }}>
              <span className="absolute -left-10 -translate-y-1/2 text-[11px] tabular-nums text-subtle">{compact(tick)}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-end gap-[6%] px-[3%]">
            {data.map((item, index) => {
              const value = Number(item.value) || 0;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="group relative flex h-full flex-1 items-end justify-center focus:outline-none"
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(-1)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(-1)}
                  aria-label={`${item.label}: ${format(value)}`}
                >
                  <span
                    className={`block w-full max-w-[44px] rounded-t-md transition-[height,background-color] duration-500 ease-out ${hover === index ? 'bg-brand' : 'bg-brand/70'}`}
                    style={{ height: `${Math.max(value ? 3 : 0, (value / max) * 100)}%` }}
                  />
                  {hover === index && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-raised px-2.5 py-1.5 text-[12px] shadow-pop">
                      <span className="block text-subtle">{item.label}</span>
                      <span className="block font-semibold tabular-nums text-ink">{format(value)}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="ml-10 mt-2 flex gap-[6%] px-[3%]">
          {data.map((item) => <span key={item.label} className="flex-1 truncate text-center text-[11px] text-subtle" title={item.label}>{item.short || item.label}</span>)}
        </div>
      </div>
    </div>
  );
}
