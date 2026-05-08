import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserMinus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { TeacherStudent } from "@/types";

interface StudentWithId {
  id: string;
  data: TeacherStudent;
}

interface StudentRosterProps {
  students: StudentWithId[];
  onStatusChanged: () => void;
}

export function StudentRoster({ students, onStatusChanged }: StudentRosterProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    student: StudentWithId;
    action: "deactivate" | "reactivate";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const activeStudents = students.filter((s) => s.data.status === "active");
  const inactiveStudents = students.filter((s) => s.data.status === "inactive");

  const handleStatusChange = async () => {
    if (!confirmDialog) return;
    setLoading(true);
    try {
      const newStatus = confirmDialog.action === "deactivate" ? "inactive" : "active";
      await updateDoc(doc(db, "teacherStudents", confirmDialog.student.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        confirmDialog.action === "deactivate"
          ? `${confirmDialog.student.data.studentDisplayName} deactivated`
          : `${confirmDialog.student.data.studentDisplayName} reactivated`
      );
      setConfirmDialog(null);
      onStatusChanged();
    } catch {
      toast.error("Failed to update student status");
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (list: StudentWithId[], showReactivate: boolean) => (
    <div className="rounded-lg border border-brand-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-100 text-left text-brand-400">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((student) => (
            <tr key={student.id} className="border-b border-brand-100 last:border-0">
              <td className="px-4 py-3 font-medium text-brand-700">
                {student.data.studentDisplayName}
              </td>
              <td className="px-4 py-3">
                {student.data.status === "active" ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmDialog({
                      student,
                      action: showReactivate ? "reactivate" : "deactivate",
                    })
                  }
                >
                  {showReactivate ? (
                    <>
                      <UserCheck className="mr-1 h-4 w-4" />
                      Reactivate
                    </>
                  ) : (
                    <>
                      <UserMinus className="mr-1 h-4 w-4" />
                      Deactivate
                    </>
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {activeStudents.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-brand-500">
              Active Students ({activeStudents.length})
            </h3>
            {renderTable(activeStudents, false)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-brand-200 p-8 text-center">
            <p className="text-brand-400">
              No active students yet. Invite your first student to get started.
            </p>
          </div>
        )}

        {inactiveStudents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-brand-400">
              Inactive ({inactiveStudents.length})
            </h3>
            {renderTable(inactiveStudents, true)}
          </div>
        )}
      </div>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === "deactivate"
                ? "Deactivate Student"
                : "Reactivate Student"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-500">
            {confirmDialog?.action === "deactivate"
              ? `Deactivate ${confirmDialog.student.data.studentDisplayName}? They won't be able to book lessons with you. Existing scheduled lessons will remain.`
              : `Reactivate ${confirmDialog?.student.data.studentDisplayName}? They'll be able to book lessons with you again.`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={loading}
              className={
                confirmDialog?.action === "deactivate"
                  ? "bg-error hover:bg-error/90"
                  : "bg-accent-500 hover:bg-accent-600"
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmDialog?.action === "deactivate" ? (
                "Deactivate"
              ) : (
                "Reactivate"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
