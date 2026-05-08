import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const PREDEFINED = [
  "Piano", "Guitar", "Voice", "Violin", "Viola", "Cello", "Bass",
  "Drums", "Flute", "Clarinet", "Saxophone", "Trumpet", "Trombone",
  "Ukulele", "Banjo", "Mandolin", "Harp", "Organ", "Composition",
  "Music Theory",
];

interface InstrumentsSelectProps {
  value: string[];
  onChange: (instruments: string[]) => void;
  max?: number;
}

export function InstrumentsSelect({
  value,
  onChange,
  max = 10,
}: InstrumentsSelectProps) {
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const customInstruments = value.filter((v) => !PREDEFINED.includes(v));

  const toggle = (instrument: string) => {
    if (value.includes(instrument)) {
      onChange(value.filter((v) => v !== instrument));
    } else if (value.length < max) {
      onChange([...value, instrument]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !value.includes(trimmed) && value.length < max) {
      onChange([...value, trimmed]);
      setCustomInput("");
    }
  };

  const removeCustom = (instrument: string) => {
    onChange(value.filter((v) => v !== instrument));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PREDEFINED.map((instrument) => (
          <button
            key={instrument}
            type="button"
            onClick={() => toggle(instrument)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              value.includes(instrument)
                ? "border-accent-500 bg-accent-50 text-accent-500"
                : "border-brand-200 bg-white text-brand-500 hover:border-brand-300"
            )}
          >
            {instrument}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            showCustom || customInstruments.length > 0
              ? "border-accent-500 bg-accent-50 text-accent-500"
              : "border-brand-200 bg-white text-brand-500 hover:border-brand-300"
          )}
        >
          Other
        </button>
      </div>

      {(showCustom || customInstruments.length > 0) && (
        <div className="space-y-2">
          {customInstruments.map((instrument) => (
            <span
              key={instrument}
              className="mr-2 inline-flex items-center gap-1 rounded-full border border-accent-500 bg-accent-50 px-3 py-1 text-sm font-medium text-accent-500"
            >
              {instrument}
              <button
                type="button"
                onClick={() => removeCustom(instrument)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-accent-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Sitar, Recorder"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              className="max-w-xs"
            />
            <button
              type="button"
              onClick={addCustom}
              className="text-sm font-medium text-accent-500 hover:text-accent-600"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-brand-400">
        {value.length}/{max} selected
      </p>
    </div>
  );
}
