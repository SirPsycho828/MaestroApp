import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface OverrideFormProps {
  onSave: (data: {
    date: string;
    startTime: string;
    endTime: string;
    blocked: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

export function OverrideForm({ onSave, onCancel }: OverrideFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!date) {
      setError("Date is required");
      return;
    }
    if (date < today) {
      setError("Date must be today or future");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ date, startTime, endTime, blocked });
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={blocked} onCheckedChange={setBlocked} />
          <Label>{blocked ? "Blocked (time off)" : "Available (extra hours)"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} step="1800" />
        </div>
        <div>
          <Label>End time</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} step="1800" />
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
