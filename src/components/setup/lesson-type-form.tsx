import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

interface LessonTypeFormData {
  name: string;
  description: string;
  durationMinutes: number;
  priceAmount: number; // cents
  creditCost: number;
  isGroup: boolean;
}

interface LessonTypeFormProps {
  initialData?: Partial<LessonTypeFormData>;
  onSubmit: (data: LessonTypeFormData) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  isEditing?: boolean;
}

export function LessonTypeForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
  isEditing = false,
}: LessonTypeFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.durationMinutes || 30
  );
  const [priceDisplay, setPriceDisplay] = useState(
    initialData?.priceAmount != null
      ? (initialData.priceAmount / 100).toFixed(2)
      : ""
  );
  const [creditCost, setCreditCost] = useState(initialData?.creditCost ?? 1);
  const [isGroup, setIsGroup] = useState(initialData?.isGroup ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (name.length < 2 || name.length > 60) {
      errs.name = "Name must be 2-60 characters";
    }
    if (description.length > 200) {
      errs.description = "Max 200 characters";
    }
    const cents = Math.round(parseFloat(priceDisplay || "0") * 100);
    if (isNaN(cents) || cents < 0 || cents > 99999) {
      errs.price = "Price must be $0.00 - $999.99";
    }
    if (creditCost < 0 || creditCost > 10 || !Number.isInteger(creditCost)) {
      errs.creditCost = "Credit cost must be 0-10";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cents = Math.round(parseFloat(priceDisplay || "0") * 100);
    await onSubmit({
      name,
      description,
      durationMinutes,
      priceAmount: cents,
      creditCost,
      isGroup,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-2">
        <Label htmlFor="lt-name">Lesson name</Label>
        <Input
          id="lt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "30-Minute Piano Lesson"'
          maxLength={60}
          required
        />
        {errors.name && <p className="text-sm text-error">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={String(durationMinutes)}
            onValueChange={(v) => setDurationMinutes(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lt-price">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="lt-price"
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              className="pl-7"
              placeholder="0.00"
              required
            />
          </div>
          {errors.price && <p className="text-sm text-error">{errors.price}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lt-credits">Credits per lesson</Label>
          <Input
            id="lt-credits"
            type="number"
            min={0}
            max={10}
            value={creditCost}
            onChange={(e) => setCreditCost(Number(e.target.value))}
          />
          {errors.creditCost && (
            <p className="text-sm text-error">{errors.creditCost}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Format</Label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => !isEditing && setIsGroup(false)}
              disabled={isEditing}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                !isGroup
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border"
              } ${isEditing ? "cursor-not-allowed opacity-50" : ""}`}
            >
              1-on-1
            </button>
            <button
              type="button"
              onClick={() => !isEditing && setIsGroup(true)}
              disabled={isEditing}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isGroup
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border"
              } ${isEditing ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Group
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lt-desc">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="lt-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Brief description for students"
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Save changes"
          ) : (
            "Add lesson type"
          )}
        </Button>
      </div>
    </form>
  );
}
