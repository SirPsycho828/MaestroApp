import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, MapPin, Video } from "lucide-react";
import type { Location } from "@/types";

interface LocationCardProps {
  location: Location;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
}

export function LocationCard({
  location,
  onEdit,
  onToggleActive,
  onDelete,
  deleteDisabled,
}: LocationCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-brand-100 p-2">
          {location.type === "in-person" ? (
            <MapPin className="h-4 w-4 text-brand-500" />
          ) : (
            <Video className="h-4 w-4 text-brand-500" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-700">{location.name}</span>
            <Badge variant="secondary">
              {location.type === "in-person" ? "In-Person" : "Virtual"}
            </Badge>
          </div>
          <p className="text-sm text-brand-400 max-w-md truncate">
            {location.type === "in-person" ? location.address : location.virtualLink}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={location.active}
          onCheckedChange={onToggleActive}
        />
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-brand-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
