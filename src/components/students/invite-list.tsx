import { useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Invite } from "@/types";

interface InviteWithId {
  id: string;
  data: Invite;
}

interface InviteListProps {
  invites: InviteWithId[];
  onRevoked: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function InviteList({ invites, onRevoked }: InviteListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (invites.length === 0) return null;

  const handleCopy = async (invite: InviteWithId) => {
    const url = `${window.location.origin}/invite/${invite.data.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (invite: InviteWithId) => {
    setRevokingId(invite.id);
    try {
      const functions = getFunctions(app);
      const revokeFn = httpsCallable<{ inviteId: string }, { success: boolean }>(
        functions,
        "revokeInvite"
      );
      await revokeFn({ inviteId: invite.id });
      toast.success(`Invite for ${invite.data.studentName} revoked`);
      onRevoked();
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  };

  const isExpired = (invite: InviteWithId) =>
    invite.data.expiresAt.toDate() < new Date();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-brand-500">
        Pending Invites ({invites.length})
      </h3>
      <div className="rounded-lg border border-brand-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-left text-brand-400">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium hidden sm:table-cell">Email</th>
              <th className="px-4 py-2 font-medium hidden md:table-cell">Sent</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-b border-brand-100 last:border-0">
                <td className="px-4 py-3 font-medium text-brand-700">
                  {invite.data.studentName}
                </td>
                <td className="px-4 py-3 text-brand-500 hidden sm:table-cell">
                  {invite.data.studentEmail}
                </td>
                <td className="px-4 py-3 text-brand-400 hidden md:table-cell">
                  {timeAgo(invite.data.createdAt.toDate())}
                </td>
                <td className="px-4 py-3">
                  {isExpired(invite) ? (
                    <Badge variant="secondary">Expired</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20">
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!isExpired(invite) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(invite)}
                      >
                        {copiedId === invite.id ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-error hover:text-error"
                      onClick={() => handleRevoke(invite)}
                      disabled={revokingId === invite.id}
                    >
                      {revokingId === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
