import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Location, LocationType } from "@/types";

interface LocationFormProps {
  initialData?: Partial<Location>;
  onSubmit: (data: Omit<Location, "id" | "active">) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export function LocationForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
}: LocationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<LocationType>(initialData?.type || "in-person");
  const [address, setAddress] = useState(initialData?.address || "");
  const [virtualLink, setVirtualLink] = useState(initialData?.virtualLink || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (name.length < 2 || name.length > 60) {
      errs.name = "Name must be 2-60 characters";
    }
    if (type === "in-person" && (address.length < 5 || address.length > 200)) {
      errs.address = "Address must be 5-200 characters";
    }
    if (type === "virtual") {
      try {
        if (virtualLink) new URL(virtualLink);
      } catch {
        errs.virtualLink = "Must be a valid URL";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name,
      type,
      address: type === "in-person" ? address : undefined,
      virtualLink: type === "virtual" ? virtualLink : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-2">
        <Label htmlFor="loc-name">Location name</Label>
        <Input
          id="loc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "Home Studio", "Zoom"'
          maxLength={60}
          required
        />
        {errors.name && <p className="text-sm text-error">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("in-person")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "in-person"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border"
            }`}
          >
            In-Person
          </button>
          <button
            type="button"
            onClick={() => setType("virtual")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "virtual"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border"
            }`}
          >
            Virtual
          </button>
        </div>
      </div>

      {type === "in-person" && (
        <div className="space-y-2">
          <Label htmlFor="loc-address">Address</Label>
          <Input
            id="loc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Austin, TX"
            maxLength={200}
            required
          />
          {errors.address && <p className="text-sm text-error">{errors.address}</p>}
        </div>
      )}

      {type === "virtual" && (
        <div className="space-y-2">
          <Label htmlFor="loc-link">
            Meeting link <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="loc-link"
            type="url"
            value={virtualLink}
            onChange={(e) => setVirtualLink(e.target.value)}
            placeholder="https://zoom.us/j/123456"
          />
          {errors.virtualLink && (
            <p className="text-sm text-error">{errors.virtualLink}</p>
          )}
        </div>
      )}

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
          ) : initialData?.name ? (
            "Save changes"
          ) : (
            "Add location"
          )}
        </Button>
      </div>
    </form>
  );
}
