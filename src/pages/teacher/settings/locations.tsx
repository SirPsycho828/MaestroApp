import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LocationForm } from "@/components/settings/location-form";
import { LocationCard } from "@/components/settings/location-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, MapPin, Loader2 } from "lucide-react";
import type { Location } from "@/types";

export default function LocationsPage() {
  const { firebaseUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getDoc(doc(db, "teacherProfiles", firebaseUser.uid)).then((snap) => {
      if (snap.exists()) {
        setLocations(snap.data().locations || []);
      }
      setLoading(false);
    });
  }, [firebaseUser]);

  const saveLocations = useCallback(
    async (updated: Location[]) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        await updateDoc(doc(db, "teacherProfiles", firebaseUser.uid), {
          locations: updated,
          updatedAt: serverTimestamp(),
        });
        setLocations(updated);
      } catch {
        toast.error("Failed to save locations");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  const handleAdd = async (data: Omit<Location, "id" | "active">) => {
    const newLoc: Location = {
      ...data,
      id: crypto.randomUUID(),
      active: true,
    };
    await saveLocations([...locations, newLoc]);
    setShowForm(false);
    toast.success("Location added");
  };

  const handleEdit = async (data: Omit<Location, "id" | "active">) => {
    if (!editingId) return;
    const updated = locations.map((loc) =>
      loc.id === editingId ? { ...loc, ...data } : loc
    );
    await saveLocations(updated);
    setEditingId(null);
    toast.success("Location updated");
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const updated = locations.map((loc) =>
      loc.id === id ? { ...loc, active } : loc
    );
    await saveLocations(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = locations.filter((loc) => loc.id !== id);
    await saveLocations(updated);
    toast.success("Location removed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  const activeLocations = locations.filter((l) => l.active);
  const inactiveLocations = locations.filter((l) => !l.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Locations</h1>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="bg-accent-500 hover:bg-accent-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {showForm && (
        <LocationForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {locations.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
          <MapPin className="h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-brand-700">No locations yet</p>
          <p className="mt-1 text-sm text-brand-400">
            Add locations where you teach — in-person or virtual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLocations.map((loc) =>
            editingId === loc.id ? (
              <LocationForm
                key={loc.id}
                initialData={loc}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
              />
            ) : (
              <LocationCard
                key={loc.id}
                location={loc}
                onEdit={() => {
                  setEditingId(loc.id);
                  setShowForm(false);
                }}
                onToggleActive={(active) => handleToggleActive(loc.id, active)}
                onDelete={() => handleDelete(loc.id)}
              />
            )
          )}

          {inactiveLocations.length > 0 && (
            <>
              <h3 className="pt-4 text-brand-400">Inactive</h3>
              {inactiveLocations.map((loc) =>
                editingId === loc.id ? (
                  <LocationForm
                    key={loc.id}
                    initialData={loc}
                    onSubmit={handleEdit}
                    onCancel={() => setEditingId(null)}
                    submitting={submitting}
                  />
                ) : (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    onEdit={() => {
                      setEditingId(loc.id);
                      setShowForm(false);
                    }}
                    onToggleActive={(active) => handleToggleActive(loc.id, active)}
                    onDelete={() => handleDelete(loc.id)}
                  />
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
