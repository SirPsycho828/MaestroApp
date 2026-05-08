import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole, User } from "@/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  role: UserRole | null;
  loading: boolean;
  initializing: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function waitForClaims(
  user: FirebaseUser,
  maxAttempts = 3
): Promise<UserRole | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await user.getIdTokenResult(true);
    if (result.claims.role) {
      return result.claims.role as UserRole;
    }
    // Exponential backoff: 1s, 2s, 4s
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userDoc: null,
    role: null,
    loading: true,
    initializing: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({
          firebaseUser: null,
          userDoc: null,
          role: null,
          loading: false,
          initializing: false,
        });
        return;
      }

      setState((prev) => ({ ...prev, firebaseUser, loading: true }));

      // Get role from claims (may need retry for new accounts)
      const tokenResult = await firebaseUser.getIdTokenResult();
      let role = tokenResult.claims.role as UserRole | undefined;

      if (!role) {
        role = (await waitForClaims(firebaseUser)) ?? undefined;
      }

      // Fetch user document
      let userDoc: User | null = null;
      if (role) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          userDoc = snap.data() as User;
        }
      }

      setState({
        firebaseUser,
        userDoc,
        role: role ?? null,
        loading: false,
        initializing: false,
      });
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
