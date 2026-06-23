import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { COLOR_GROUPS, getColorGroups, hexToHsl, hslToHex } from './colorPalette';

/**
 * ColorPicker extracted verbatim from ThemeEditor.tsx — visual + behavioral parity preserved.
 */
export function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const validHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  const [h, s, l] = hexToHsl(validHex);
  const matchedGroups = getColorGroups(validHex);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-neutral-700">{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-10 h-10 rounded-xl border-2 border-neutral-200 shadow-sm shrink-0 hover:border-neutral-300 transition-colors"
              style={{ backgroundColor: validHex }}
              aria-label={label}
            />
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-[280px] p-3">
            <HexColorPicker color={validHex} onChange={onChange} className="!w-full !h-40" />
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="360" value={h}
                  onChange={(e) => onChange(hslToHex(Number(e.target.value), s, l))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)` }}
                />
                <span className="text-xs text-neutral-500 w-8 text-end font-mono">{h}°</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100" value={s}
                  onChange={(e) => onChange(hslToHex(h, Number(e.target.value), l))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #808080, ${hslToHex(h, 100, l)})` }}
                />
                <span className="text-xs text-neutral-500 w-8 text-end font-mono">{s}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100" value={l}
                  onChange={(e) => onChange(hslToHex(h, s, Number(e.target.value)))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #000, ${hslToHex(h, s, 50)}, #fff)` }}
                />
                <span className="text-xs text-neutral-500 w-8 text-end font-mono">{l}%</span>
              </div>
              <div className="flex items-center gap-2">
                <HexColorInput color={validHex} onChange={onChange} prefixed className="flex-1 h-8 px-2 rounded-lg border border-neutral-200 text-xs font-mono text-end" />
                <div className="w-8 h-8 rounded-lg border border-neutral-200" style={{ backgroundColor: validHex }} />
              </div>
            </div>
            <div className="mt-3 border-t border-neutral-100 pt-3 max-h-44 overflow-y-auto space-y-2">
              {COLOR_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="text-xs font-medium text-neutral-400 mb-1">{g.label}</p>
                  <div className="flex gap-1 flex-wrap">
                    {g.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => onChange(c)}
                        aria-label={`لون ${c}`}
                        className={`w-5 h-5 rounded-full border ${c === validHex ? 'border-2 border-neutral-900 scale-125' : 'border-neutral-200'} hover:scale-110 transition-transform`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex gap-1 flex-wrap items-center">
          {(matchedGroups[0]?.colors ?? []).filter((c) => c !== validHex).slice(0, 8).map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              aria-label={`لون ${c}`}
              className="w-5 h-5 rounded-full border border-neutral-200 hover:scale-110 transition-transform shrink-0"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
