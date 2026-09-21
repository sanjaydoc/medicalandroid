import { CONDITIONS, CONDITION_GROUPS } from '../sim/immune';

/**
 * Department-grouped, multi-select condition picker for Step 8.
 * A dropdown (optgroups by department) adds a condition; selected conditions
 * show as removable chips. The indication's implied condition is shown locked.
 */
export default function ConditionPicker({
  value, onChange, impliedKey, compact, neu,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  impliedKey?: string | null;
  compact?: boolean;
  neu?: boolean;
}) {
  const labelOf = (k: string) => CONDITIONS.find((c) => c.key === k)?.label || k;
  const add = (k: string) => { if (k && !value.includes(k) && k !== impliedKey) onChange([...value, k]); };
  const remove = (k: string) => onChange(value.filter((x) => x !== k));
  const taken = new Set([...value, ...(impliedKey ? [impliedKey] : [])]);
  const selChip = compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <div>
      <select
        value=""
        onChange={(e) => { add(e.target.value); e.target.value = ''; }}
        className={neu ? 'simd-csel' : `input w-full ${compact ? 'py-1.5 text-sm' : ''}`}
      >
        <option value="">＋ Add a condition…</option>
        {CONDITION_GROUPS.map((g) => {
          const opts = CONDITIONS.filter((c) => c.group === g && !taken.has(c.key));
          if (!opts.length) return null;
          return (
            <optgroup key={g} label={g}>
              {opts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </optgroup>
          );
        })}
      </select>

      {(impliedKey || value.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {impliedKey && (
            neu
              ? <span className="simd-cchip ind">{labelOf(impliedKey)} · indication</span>
              : <span className={`inline-flex items-center gap-1 rounded-full border border-clay-500 bg-clay-500 font-semibold text-white ${selChip}`}>{labelOf(impliedKey)} · indication</span>
          )}
          {value.map((k) => (
            neu ? (
              <span key={k} className="simd-cchip">
                {labelOf(k)}
                <button type="button" aria-label={`remove ${labelOf(k)}`} onClick={() => remove(k)} className="simd-cx">×</button>
              </span>
            ) : (
              <span key={k} className={`inline-flex items-center gap-1 rounded-full border border-clay-300 bg-clay-50 font-semibold text-clay-700 ${selChip}`}>
                {labelOf(k)}
                <button
                  type="button"
                  aria-label={`remove ${labelOf(k)}`}
                  onClick={() => remove(k)}
                  className="ml-0.5 rounded-full px-1 leading-none text-clay-500 hover:bg-clay-200 hover:text-clay-800"
                >
                  ×
                </button>
              </span>
            )
          ))}
        </div>
      )}
    </div>
  );
}
