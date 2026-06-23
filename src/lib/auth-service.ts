import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth"
import { auth, googleProvider } from "./firebase"

// 1. Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error("Google Sign-In Error:", error)
    throw error
  }
}

// 2. Sign in with Email and Password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
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
  return onAuthStateChanged(auth, callback)
}
export type { User }
