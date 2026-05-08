import { useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  onInviteCreated: () => void;
}

export function InviteDialog({ onInviteCreated }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setStudentName("");
    setStudentEmail("");
    setError("");
    setInviteUrl(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const functions = getFunctions(app);
      const createInviteFn = httpsCallable<
        { studentName: string; studentEmail: string },
        { inviteUrl: string }
      >(functions, "createInvite");

      const result = await createInviteFn({
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
      });

      setInviteUrl(result.data.inviteUrl);
      toast.success(`Invite sent to ${studentName.trim()}`);
      onInviteCreated();
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || "Failed to create invite";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Student</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with <strong>{studentName}</strong>:
            </p>
            <div className="flex items-center gap-2">
              <Input value={inviteUrl} readOnly className="text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm();
              }}
            >
              Invite another student
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Student name</Label>
              <Input
                id="student-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Student email</Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
                placeholder="jane@example.com"
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Invite"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
