import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth"
import { auth, googleProvider } from "./firebase"

// Helper to determine if we should run in mock/bypass mode
export const isMockMode = (): boolean => {
  if (typeof window === "undefined") return false;
  // If explicitly requested or if Firebase key matches the template dummy key
  const explicitMock = localStorage.getItem("use_mock_mode") === "true";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const isTemplateKey = !apiKey || apiKey === "your-api-key" || apiKey === "AIzaSyBC3wWj7oqtlzccJQkp8GZrr4XGMFHBHno" || apiKey === "AIzaSyDummyKeyForBuildSafetyOnly";
  return explicitMock || isTemplateKey;
};

// 1. Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  if (isMockMode()) {
    localStorage.setItem("mock_user_logged_in", "true");
    localStorage.setItem("mock_user_email", "google-teacher@classai.com");
    localStorage.setItem("mock_user_name", "Google Teacher");
    localStorage.setItem("use_mock_mode", "true");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mock-auth-change"));
    }
    return {
      uid: "mock-teacher-id",
      email: "google-teacher@classai.com",
      displayName: "Google Teacher",
    } as unknown as User;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error: any) {
    if (error.code === "auth/popup-blocked") {
      console.warn("Popup blocked, falling back to redirect...")
      await signInWithRedirect(auth, googleProvider)
      return null;
    }
    console.error("Google Sign-In Error:", error)
    throw error
  }
}

// 2. Sign in with Email and Password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  if (isMockMode()) {
    localStorage.setItem("mock_user_logged_in", "true");
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_name", email.split("@")[0]);
    localStorage.setItem("use_mock_mode", "true");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mock-auth-change"));
    }
    return {
      uid: "mock-teacher-id",
      email,
      displayName: email.split("@")[0],
    } as unknown as User;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error("Email Sign-In Error:", error)
    throw error
  }
}

// 3. Sign up with Email and Password (and set display name)
export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName: string
): Promise<User> => {
  if (isMockMode()) {
    localStorage.setItem("mock_user_logged_in", "true");
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_name", fullName);
    localStorage.setItem("use_mock_mode", "true");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mock-auth-change"));
    }
    return {
      uid: "mock-teacher-id",
      email,
      displayName: fullName,
    } as unknown as User;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    const user = result.user
    // Update display name
    await updateProfile(user, {
      displayName: fullName,
    })
    return user
  } catch (error) {
    console.error("Email Sign-Up Error:", error)
    throw error
  }
}

// 4. Sign out
export const signOutUser = async (): Promise<void> => {
  if (isMockMode()) {
    localStorage.removeItem("mock_user_logged_in");
    localStorage.removeItem("mock_user_email");
    localStorage.removeItem("mock_user_name");
    localStorage.setItem("use_mock_mode", "false");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mock-auth-change"));
    }
    return;
  }

  try {
    await signOut(auth)
  } catch (error) {
    console.error("Sign-Out Error:", error)
    throw error
  }
}

// 5. Auth State Subscriber
export const subscribeToAuthChanges = (
  callback: (user: User | null) => void
) => {
  if (isMockMode()) {
    const getMockUser = () => {
      const loggedIn = localStorage.getItem("mock_user_logged_in") === "true";
      if (loggedIn) {
        const name = localStorage.getItem("mock_user_name") || "Dr. Sarah Jenkins";
        const email = localStorage.getItem("mock_user_email") || "mock-teacher@classai.com";
        return {
          uid: "mock-teacher-id",
          email,
          displayName: name,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: "mock-refresh-token",
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => "mock-id-token",
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
        } as unknown as User;
      }
      return null;
    };

    // Initial call
    callback(getMockUser());

    const handleLoginChange = () => {
      callback(getMockUser());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mock-auth-change", handleLoginChange);
      window.addEventListener("storage", handleLoginChange); // Sync auth state across tabs
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mock-auth-change", handleLoginChange);
        window.removeEventListener("storage", handleLoginChange);
      }
    };
  }

  return onAuthStateChanged(auth, callback)
}
export type { User }
