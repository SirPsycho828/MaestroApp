import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { collection, query, where, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music, AlertCircle } from "lucide-react";
import { FadeIn } from "@/components/ui/animated";

interface InviteData {
  teacherId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  expiresAt: { toDate: () => Date };
}

interface TeacherData {
  studioName?: string;
  instruments: string[];
  bio?: string;
}

type PageState =
  | { type: "loading" }
  | { type: "valid"; invite: InviteData; teacher: TeacherData; teacherName: string; token: string }
  | { type: "expired" }
  | { type: "accepted" }
  | { type: "invalid" };

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-accent/[0.06] blur-[100px]" />
      </div>
      <FadeIn className="relative z-10 w-full max-w-md">
        {children}
      </FadeIn>
    </div>
  );
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ type: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ type: "invalid" });
      return;
    }

    async function loadInvite() {
      const inviteQuery = query(
        collection(db, "invites"),
        where("token", "==", token),
        limit(1)
      );
      const inviteSnap = await getDocs(inviteQuery);

      if (inviteSnap.empty) {
        setState({ type: "invalid" });
        return;
      }

      const invite = inviteSnap.docs[0].data() as InviteData;

      if (invite.status === "accepted") {
        setState({ type: "accepted" });
        return;
      }

      if (invite.status === "expired" || invite.expiresAt.toDate() < new Date()) {
        setState({ type: "expired" });
        return;
      }

      const teacherUserSnap = await getDoc(doc(db, "users", invite.teacherId));
      const teacherProfileSnap = await getDoc(doc(db, "teacherProfiles", invite.teacherId));

      const teacherName = teacherUserSnap.exists()
        ? teacherUserSnap.data()?.displayName || "Your teacher"
        : "Your teacher";

      const teacherProfile = teacherProfileSnap.exists()
        ? (teacherProfileSnap.data() as TeacherData)
        : { instruments: [] };

      setState({
        type: "valid",
        invite,
        teacher: teacherProfile,
        teacherName,
        token: token!,
      });
    }

    loadInvite().catch(() => setState({ type: "invalid" }));
  }, [token]);

  if (state.type === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (state.type === "invalid") {
    return (
      <InviteShell>
        <Card className="border-border/40 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="font-serif text-xl font-semibold">
              This invite link is no longer valid
            </h2>
            <p className="text-sm text-muted-foreground">
              It may have expired or been revoked. Contact your teacher for a new invite.
            </p>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  if (state.type === "expired") {
    return (
      <InviteShell>
        <Card className="border-border/40 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="font-serif text-xl font-semibold">
              This invite link has expired
            </h2>
            <p className="text-sm text-muted-foreground">
              Contact your teacher for a new invite.
            </p>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  if (state.type === "accepted") {
    return (
      <InviteShell>
        <Card className="border-border/40 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <h2 className="font-serif text-xl font-semibold">
              This invite has already been used
            </h2>
            <Link to="/login">
              <Button>Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  const { invite, teacher, teacherName, token: inviteToken } = state;

  return (
    <InviteShell>
      <Card className="border-border/40">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.06]">
            <Music className="h-7 w-7 text-accent" />
          </div>
          <CardTitle className="font-serif text-2xl">
            You&apos;ve been invited by{" "}
            <span className="text-accent">{teacherName}</span>
          </CardTitle>
          {teacher.studioName && (
            <p className="text-sm text-muted-foreground">{teacher.studioName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {teacher.instruments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {teacher.instruments.map((inst) => (
                <Badge key={inst} variant="secondary">
                  {inst}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            We&apos;ll set up your account as{" "}
            <strong>{invite.studentName}</strong> ({invite.studentEmail})
          </p>

          <div className="space-y-3">
            <Link to={`/register/student?invite=${inviteToken}`} className="block">
              <Button className="w-full">
                Create Account
              </Button>
            </Link>
            <Link to={`/login?invite=${inviteToken}`} className="block">
              <Button variant="outline" className="w-full">
                I already have an account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </InviteShell>
  );
}
