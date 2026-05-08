import { useCallback, useEffect, useRef, useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { InstrumentsSelect } from "./instruments-select";
import { Check, X, Loader2 } from "lucide-react";
import type { TeacherProfile } from "@/types";

interface ProfileFormData {
  displayName: string;
  slug: string;
  studioName: string;
  instruments: string[];
  bio: string;
}

interface ProfileFormProps {
  initialData: Partial<TeacherProfile> & { displayName?: string };
  onSubmit: (data: ProfileFormData) => Promise<void>;
  submitting: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function ProfileForm({ initialData, onSubmit, submitting }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialData.displayName || "");
  const [slug, setSlug] = useState(initialData.slug || "");
  const [studioName, setStudioName] = useState(initialData.studioName || "");
  const [instruments, setInstruments] = useState<string[]>(initialData.instruments || []);
  const [bio, setBio] = useState(initialData.bio || "");

  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-generate slug from display name (only if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && displayName) {
      setSlug(slugify(displayName));
    }
  }, [displayName, slugManuallyEdited]);

  // Check slug availability with debounce
  const checkSlug = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const functions = getFunctions(app);
        const checkFn = httpsCallable<{ slug: string }, { available: boolean }>(
          functions,
          "checkSlugAvailable"
        );
        const result = await checkFn({ slug: value });
        setSlugStatus(result.data.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (slug) checkSlug(slug);
  }, [slug, checkSlug]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (displayName.length < 2 || displayName.length > 50) {
      errs.displayName = "Name must be 2-50 characters";
    }
    if (slug.length < 3 || slug.length > 40) {
      errs.slug = "Slug must be 3-40 characters";
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errs.slug = "Only lowercase letters, numbers, and hyphens";
    }
    if (slugStatus === "taken") {
      errs.slug = "This URL is already taken";
    }
    if (studioName && studioName.length > 80) {
      errs.studioName = "Max 80 characters";
    }
    if (bio.length > 500) {
      errs.bio = "Max 500 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ displayName, slug, studioName, instruments, bio });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
        />
        {errors.displayName && (
          <p className="text-sm text-error">{errors.displayName}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Profile URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-400">tunefolio.com/teacher/</span>
          <div className="relative flex-1">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSlugManuallyEdited(true);
              }}
              maxLength={40}
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              )}
              {slugStatus === "available" && (
                <Check className="h-4 w-4 text-success" />
              )}
              {slugStatus === "taken" && (
                <X className="h-4 w-4 text-error" />
              )}
            </div>
          </div>
        </div>
        {errors.slug && <p className="text-sm text-error">{errors.slug}</p>}
      </div>

      {/* Studio Name */}
      <div className="space-y-2">
        <Label htmlFor="studioName">
          Studio name <span className="text-brand-400">(optional)</span>
        </Label>
        <Input
          id="studioName"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          maxLength={80}
        />
        {errors.studioName && (
          <p className="text-sm text-error">{errors.studioName}</p>
        )}
      </div>

      {/* Instruments */}
      <div className="space-y-2">
        <Label>Instruments <span className="text-brand-400">(optional)</span></Label>
        <InstrumentsSelect value={instruments} onChange={setInstruments} />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">
          Bio <span className="text-brand-400">(optional)</span>
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tell students about your teaching style and experience..."
        />
        <p className="text-xs text-brand-400 text-right">{bio.length}/500</p>
        {errors.bio && <p className="text-sm text-error">{errors.bio}</p>}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitting || slugStatus === "checking" || slugStatus === "taken"}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next"}
        </Button>
      </div>
    </form>
  );
}
