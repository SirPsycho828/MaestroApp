import { useState } from "react";
import { useNavigate } from "react-router";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tosAccepted) {
      setError("You must accept the Terms of Service");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      navigate("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRegister = async (providerType: "google" | "apple") => {
    if (!tosAccepted) {
      setError("You must accept the Terms of Service");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const provider =
        providerType === "google"
          ? new GoogleAuthProvider()
          : new OAuthProvider("apple.com");
      if (providerType === "apple") {
        (provider as OAuthProvider).addScope("email");
        (provider as OAuthProvider).addScope("name");
      }
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user") {
        setError("Sign-up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-brand-200">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your teacher account</CardTitle>
        <p className="text-sm text-brand-400">
          Set up your studio on TuneFolio
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-brand-500">
              I accept the Terms of Service and confirm I am 18 or older
            </span>
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-500 hover:bg-accent-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-brand-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-brand-400">or</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthRegister("google")}
            disabled={loading}
          >
            Sign up with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthRegister("apple")}
            disabled={loading}
          >
            Sign up with Apple
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
