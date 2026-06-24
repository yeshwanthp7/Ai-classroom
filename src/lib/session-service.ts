import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { isMockMode } from "./auth-service"

export interface Session {
  id: string
  code: string
  title: string
  subject: string
  gradeLevel: string
  duration: string
  type: "Public" | "Private"
  topics: string[]
  currentTopicIndex: number
  status: "Live" | "Scheduled" | "Active" | "Completed"
  teacherId: string
  createdAt: any
  scheduledAt?: any
  teachingMode?: "AI" | "Human"
  aiInstructions?: string
  aiAssistants?: {
    generateVisuals: boolean
    doubtChat: boolean
    suggestVideos: boolean
    sessionNotes: boolean
    postSummary: boolean
  }
  uploadedFile?: {
    name: string
    size: string
    pages: number
  } | null
  referenceMaterial?: {
    name: string
    size: string
  } | null
  focusMode?: boolean
  allowLateJoins?: boolean
  muteOnEntry?: boolean
  countdownEndsAt?: any
}

export interface Student {
  id: string
  name: string
  joinedAt: any
  lastActive: any
  status: "active" | "idle" | "distracted" | "offline"
  engagementScore: number
}

// 1. Create a session document in Firestore (or local storage if in mock mode)
export const createSession = async (
  teacherId: string,
  title: string,
  subject: string,
  gradeLevel: string,
  duration: string,
  type: "Public" | "Private",
  topics: string[],
  code: string,
  scheduledDate?: string,
  extraSettings?: {
    teachingMode?: "AI" | "Human"
    aiInstructions?: string
    aiAssistants?: {
      generateVisuals: boolean
      doubtChat: boolean
      suggestVideos: boolean
      sessionNotes: boolean
      postSummary: boolean
    }
    uploadedFile?: {
      name: string
      size: string
      pages: number
    } | null
    referenceMaterial?: {
      name: string
      size: string
    } | null
  }
): Promise<string> => {
  if (isMockMode()) {
    const sessionKey = `session_${code.trim().toUpperCase()}`;
    
    let countdownEndsAt = null;
    if (scheduledDate) {
      countdownEndsAt = new Date(scheduledDate).toISOString();
    } else {
      countdownEndsAt = new Date(Date.now() + 120 * 1000).toISOString();
    }

    const sessionData: Session = {
      id: code,
      code,
      title,
      subject,
      gradeLevel,
      duration,
      type,
      topics,
      currentTopicIndex: 0,
      status: scheduledDate ? "Scheduled" : "Live",
      teacherId: teacherId || "mock-teacher-id",
      createdAt: new Date().toISOString(),
      focusMode: false,
      allowLateJoins: true,
      muteOnEntry: true,
      ...(scheduledDate && { scheduledAt: scheduledDate }),
      countdownEndsAt,
      ...extraSettings,
    };
    
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    localStorage.setItem(`students_${code.trim().toUpperCase()}`, JSON.stringify([]));
    
    // Trigger storage event manually for this window
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
    return code;
  }

  try {
    const sessionRef = doc(db, "sessions", code)
    
    let scheduledAt = null
    let countdownEndsAt = null
    
    if (scheduledDate) {
      const targetDate = new Date(scheduledDate)
      scheduledAt = Timestamp.fromDate(targetDate)
      countdownEndsAt = Timestamp.fromDate(targetDate)
    } else {
      // Countdown ends in 2 minutes (120 seconds) for immediate start
      countdownEndsAt = Timestamp.fromDate(new Date(Date.now() + 120 * 1000))
    }

    const sessionData: Partial<Session> = {
      id: code,
      code,
      title,
      subject,
      gradeLevel,
      duration,
      type,
      topics,
      currentTopicIndex: 0,
      status: scheduledDate ? "Scheduled" : "Live",
      teacherId,
      createdAt: serverTimestamp(),
      focusMode: false,
      allowLateJoins: true,
      muteOnEntry: true,
      ...(scheduledAt && { scheduledAt }),
      ...(countdownEndsAt && { countdownEndsAt }),
      ...extraSettings,
    }

    await setDoc(sessionRef, sessionData)
    return code
  } catch (error) {
    console.error("Error creating session:", error)
    throw error
  }
}

// 1.1 Update teacher controls
export const updateSessionControls = async (
  sessionCode: string,
  controls: {
    focusMode?: boolean
    allowLateJoins?: boolean
    muteOnEntry?: boolean
  }
): Promise<void> => {
  if (isMockMode()) {
    const key = `session_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const session = JSON.parse(dataStr);
      const updated = { ...session, ...controls };
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  try {
    const sessionRef = doc(db, "sessions", sessionCode.trim().toUpperCase())
    await updateDoc(sessionRef, controls)
  } catch (error) {
    console.error("Error updating controls:", error)
    throw error
  }
}

// 1.2 Start class early (force transition)
export const startClassEarly = async (sessionCode: string): Promise<void> => {
  if (isMockMode()) {
    const key = `session_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const session = JSON.parse(dataStr);
      const updated = { ...session, status: "Active", countdownEndsAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  try {
    const sessionRef = doc(db, "sessions", sessionCode.trim().toUpperCase())
    await updateDoc(sessionRef, {
      status: "Active",
      countdownEndsAt: Timestamp.fromDate(new Date(Date.now())),
    })
  } catch (error) {
    console.error("Error starting class early:", error)
    throw error
  }
}

// 2. Join session as a student
export const joinSession = async (
  studentName: string,
  sessionCode: string
): Promise<string> => {
  if (isMockMode()) {
    const formattedCode = sessionCode.trim().toUpperCase();
    const sessionKey = `session_${formattedCode}`;
    const sessionDataStr = localStorage.getItem(sessionKey);
    if (!sessionDataStr) {
      throw new Error("Session not found. Please check the code.");
    }
    const sessionData = JSON.parse(sessionDataStr) as Session;
    if (sessionData.status === "Completed") {
      throw new Error("This session has already ended.");
    }

    const studentId = studentName.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4);
    const studentsKey = `students_${formattedCode}`;
    const studentsDataStr = localStorage.getItem(studentsKey) || "[]";
    const students = JSON.parse(studentsDataStr) as Student[];

    if (!students.some(s => s.id === studentId)) {
      const newStudent: Student = {
        id: studentId,
        name: studentName,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: "active",
        engagementScore: 100,
      };
      students.push(newStudent);
      localStorage.setItem(studentsKey, JSON.stringify(students));
      window.dispatchEvent(new Event("storage"));
    }
    return studentId;
  }

  try {
    const formattedCode = sessionCode.trim().toUpperCase()
    const sessionRef = doc(db, "sessions", formattedCode)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) {
      throw new Error("Session not found. Please check the code.")
    }

    const sessionData = sessionSnap.data() as Session
    if (sessionData.status === "Completed") {
      throw new Error("This session has already ended.")
    }

    // Use name as part of ID, lower-cased and stripped of spaces
    const studentId = studentName.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4)
    const studentRef = doc(db, "sessions", formattedCode, "students", studentId)

    const studentData: Student = {
      id: studentId,
      name: studentName,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      status: "active",
      engagementScore: 100,
    }

    await setDoc(studentRef, studentData)
    return studentId
  } catch (error) {
    console.error("Error joining session:", error)
    throw error
  }
}

// 3. Subscribe to session updates
export const subscribeToSession = (
  sessionCode: string,
  onUpdate: (session: Session | null) => void,
  onError?: (error: any) => void
) => {
  if (isMockMode()) {
    const key = `session_${sessionCode.trim().toUpperCase()}`;
    const getSessionData = () => {
      const dataStr = localStorage.getItem(key);
      if (dataStr) {
        try {
          return JSON.parse(dataStr) as Session;
        } catch (e) {
          return null;
        }
      }
      return null;
    };

    onUpdate(getSessionData());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        onUpdate(getSessionData());
      }
    };

    const handleLocalChange = () => {
      onUpdate(getSessionData());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("storage", handleLocalChange); // standard fallback
    }
    const interval = setInterval(handleLocalChange, 1000);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("storage", handleLocalChange);
      }
      clearInterval(interval);
    };
  }

  const sessionRef = doc(db, "sessions", sessionCode.trim().toUpperCase())
  return onSnapshot(
    sessionRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as Session)
      } else {
        onUpdate(null)
      }
    },
    (err) => {
      console.error("Session subscription error:", err)
      if (onError) onError(err)
    }
  )
}

// 4. Subscribe to student list updates
export const subscribeToStudents = (
  sessionCode: string,
  onUpdate: (students: Student[]) => void,
  onError?: (error: any) => void
) => {
  if (isMockMode()) {
    const key = `students_${sessionCode.trim().toUpperCase()}`;
    const getStudentsData = (): Student[] => {
      const dataStr = localStorage.getItem(key);
      if (dataStr) {
        try {
          return JSON.parse(dataStr) as Student[];
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    onUpdate(getStudentsData());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        onUpdate(getStudentsData());
      }
    };

    const handleLocalChange = () => {
      onUpdate(getStudentsData());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("storage", handleLocalChange);
    }
    const interval = setInterval(handleLocalChange, 1000);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("storage", handleLocalChange);
      }
      clearInterval(interval);
    };
  }

  const studentsColRef = collection(db, "sessions", sessionCode.trim().toUpperCase(), "students")
  return onSnapshot(
    studentsColRef,
    (querySnap) => {
      const studentsList: Student[] = []
      querySnap.forEach((docSnap) => {
        studentsList.push(docSnap.data() as Student)
      })
      onUpdate(studentsList)
    },
    (err) => {
      console.error("Students list subscription error:", err)
      if (onError) onError(err)
    }
  )
}

// 5. Update session's current active topic index
export const updateSessionTopic = async (
  sessionCode: string,
  topicIndex: number
): Promise<void> => {
  if (isMockMode()) {
    const key = `session_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const session = JSON.parse(dataStr);
      const updated = { ...session, currentTopicIndex: topicIndex };
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  try {
    const sessionRef = doc(db, "sessions", sessionCode.trim().toUpperCase())
    await updateDoc(sessionRef, {
      currentTopicIndex: topicIndex,
    })
  } catch (error) {
    console.error("Error updating topic:", error)
    throw error
  }
}

// 6. Update student presence & engagement telemetry
export const updateStudentEngagement = async (
  sessionCode: string,
  studentId: string,
  score: number,
  status: "active" | "idle" | "distracted" | "offline"
): Promise<void> => {
  if (isMockMode()) {
    const key = `students_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key) || "[]";
    const students = JSON.parse(dataStr) as Student[];
    const idx = students.findIndex(s => s.id === studentId);
    if (idx !== -1) {
      students[idx] = {
        ...students[idx],
        engagementScore: score,
        status,
        lastActive: new Date().toISOString()
      };
    } else {
      students.push({
        id: studentId,
        name: studentId,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status,
        engagementScore: score
      });
    }
    localStorage.setItem(key, JSON.stringify(students));
    window.dispatchEvent(new Event("storage"));
    return;
  }

  try {
    const studentRef = doc(db, "sessions", sessionCode.trim().toUpperCase(), "students", studentId)
    await setDoc(studentRef, {
      id: studentId,
      name: studentId, // Fallback if they didn't join properly
      engagementScore: score,
      status,
      lastActive: serverTimestamp(),
    }, { merge: true })
  } catch (error) {
    console.error("Error updating engagement telemetry:", error)
    throw error
  }
}

// 6.5 Remove student explicitly when they leave
import { deleteDoc } from "firebase/firestore";

export const removeStudent = async (sessionCode: string, studentId: string): Promise<void> => {
  if (isMockMode()) {
    const key = `students_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key) || "[]";
    const students = JSON.parse(dataStr) as Student[];
    const filtered = students.filter(s => s.id !== studentId);
    localStorage.setItem(key, JSON.stringify(filtered));
    window.dispatchEvent(new Event("storage"));
    return;
  }

  try {
    const studentRef = doc(db, "sessions", sessionCode.trim().toUpperCase(), "students", studentId)
    await deleteDoc(studentRef);
  } catch (error) {
    console.error("Error removing student:", error);
  }
}

// 7. End session
export const endSession = async (sessionCode: string): Promise<void> => {
  if (isMockMode()) {
    const key = `session_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const session = JSON.parse(dataStr);
      const updated = { ...session, status: "Completed" };
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  try {
    const sessionRef = doc(db, "sessions", sessionCode.trim().toUpperCase())
    await updateDoc(sessionRef, {
      status: "Completed",
    })
  } catch (error) {
    console.error("Error ending session:", error)
    throw error
  }
}

// 8. Sync classroom progress (Teacher to Students)
export const syncClassroomProgress = async (sessionCode: string, currentTopicIndex: number): Promise<void> => {
  if (isMockMode()) {
    const key = `session_${sessionCode.trim().toUpperCase()}`;
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const session = JSON.parse(dataStr);
      const updated = { ...session, currentTopicIndex };
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  try {
    const sessionRef = doc(db, "sessions", sessionCode.trim().toUpperCase())
    await updateDoc(sessionRef, { currentTopicIndex })
  } catch (error) {
    console.error("Error syncing classroom progress:", error)
  }
}
