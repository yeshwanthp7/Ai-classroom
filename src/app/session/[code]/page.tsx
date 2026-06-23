"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Copy,
  Check,
  Share2,
  Users,
  Settings,
  Brain,
  User as UserIcon,
  Trash2,
  LogOut,
  RefreshCw,
  AlertCircle,
  Menu,
  Eye,
  X,
  Play,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  Hand,
  CornerDownRight,
  Info,
  Pause,
  RotateCcw,
  Sparkles,
  Tv,
  ScreenShare,
  Presentation,
  PenTool,
  Radio,
  Clock
} from "lucide-react"

import {
  subscribeToSession,
  subscribeToStudents,
  endSession,
  startClassEarly,
  updateSessionControls,
  Session,
  Student,
} from "@/lib/session-service"
import { subscribeToAuthChanges } from "@/lib/auth-service"
import DashboardSidebar from "@/components/dashboard-sidebar"

const ROTATING_SUBTITLES = [
  "Preparing your AI teacher...",
  "Loading today's topics...",
  "Almost ready to learn...",
]

// Claude API simulation helper for topic explanations
const CLAUDE_EXPLANATIONS: Record<string, string> = {
  "thermodynamics": "Thermodynamics is the branch of physics that deals with the relationships between heat and other forms of energy. In particular, it describes how thermal energy is converted to and from other forms of energy and how it affects matter. The fundamental laws governing these changes are crucial in mechanical engineering and physical chemistry.",
  "carnot cycle": "The Carnot cycle is a theoretical thermodynamic cycle proposed by Nicolas Léonard Sadi Carnot in 1824. It provides an upper limit on the efficiency that any classical thermodynamic engine can achieve during the conversion of heat into work, operating between two reservoirs at different temperatures.",
  "entropy": "Entropy is a scientific concept, as well as a measurable physical property, that is most commonly associated with a state of disorder, randomness, or uncertainty. According to the Second Law of Thermodynamics, the total entropy of an isolated system can never decrease over time; it can only remain constant or increase.",
  "absolute zero": "Absolute zero is the lowest limit of the thermodynamic temperature scale, a state at which the enthalpy and entropy of a cooled ideal gas reach their minimum value, taken as zero kelvins. At this state, the fundamental particles of nature have minimal vibrational motion."
}

const getMockAIScriptForTopic = (topic: string) => {
  const t = topic.toLowerCase()
  for (const key of Object.keys(CLAUDE_EXPLANATIONS)) {
    if (t.includes(key)) {
      return CLAUDE_EXPLANATIONS[key]
    }
  }
  return `Let's discuss our next topic: ${topic}. This concept outlines crucial relationships in thermodynamics, connecting heat flow, chemical potential, and molecular distributions. Please pay close attention to the diagram on screen.`
}

const CLAUDE_DOUBT_RESPONSES = [
  "That is an excellent question! In thermodynamics, we define systems as open, closed, or isolated. In a closed system, energy can pass through the boundary but mass cannot.",
  "Great question. Carnot efficiency is indeed the absolute limit because it assumes zero friction and perfectly reversible processes, which are impossible in real-world engineering.",
  "Entropy can be thought of as the number of ways a system can arrange its microstates. The more disorganized a system is, the higher its entropy score.",
  "Absolute zero is a theoretical limit. According to the Third Law, it is impossible to reach absolute zero in a finite number of steps because heat will always leak in."
]

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionCode = (params.code as string).toUpperCase()

  // Authentication & Role
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isTeacher, setIsTeacher] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)

  // Real-time Database state
  const [session, setSession] = useState<Session | null>(null)
  const [studentsList, setStudentsList] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Transition & Classroom states
  const [isClassroomActive, setIsClassroomActive] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hasEnteredClassroom, setHasEnteredClassroom] = useState(false)

  // Classroom media states
  const [micOn, setMicOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [whiteboardActive, setWhiteboardActive] = useState(false)

  // Lecture timers & outlines
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeTopicIdx, setActiveTopicIdx] = useState(0)
  const [liveSubtitles, setLiveSubtitles] = useState<string>("")
  const [aiSpeechState, setAiSpeechState] = useState<"speaking" | "paused" | "idle">("idle")
  const [teachingMode, setTeachingMode] = useState<"AI" | "Paused" | "Human">("AI")
  
  // Simulated dynamic students
  const [dynamicStudents, setDynamicStudents] = useState<Array<Student & { focusColor: string; attentionState: "focused" | "distracted" | "offline"; isMuted: boolean }>>([])
  const [classFocusAvg, setClassFocusAvg] = useState(87)

  // Doubt Chat messages
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<Array<{
    id: string
    sender: string
    text: string
    time: string
    isAI: boolean
  }>>([
    { id: "1", sender: "Professor AI", text: "Welcome to today's physics session. Feel free to type any doubts here.", time: "12:00 PM", isAI: true },
  ])

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; icon?: React.ReactNode }>>([])

  // End Session flow
  const [showEndModal, setShowEndModal] = useState(false)
  const [endCountdown, setEndCountdown] = useState<number | null>(null)

  // Waiting Room states
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [subtitleIndex, setSubtitleIndex] = useState(0)
  const [isCopied, setIsCopied] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [allowLateJoins, setAllowLateJoins] = useState(true)
  const [muteOnEntry, setMuteOnEntry] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // 1. Mount log
  useEffect(() => {
    console.log("Classroom mounted")
  }, [])

  // 2. Load identities from LocalStorage & Auth (with fallback)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem("studentName")
        const storedId = localStorage.getItem("studentId")
        setStudentName(storedName || "Guest Student")
        setStudentId(storedId || `guest-${Math.floor(Math.random() * 1000)}`)
      }
    } catch (e) {
      console.warn("localStorage fallback:", e)
      setStudentName("Guest Student")
      setStudentId("guest-id")
    }

    try {
      const unsubscribeAuth = subscribeToAuthChanges((user) => {
        setCurrentUser(user)
      })
      return () => unsubscribeAuth()
    } catch (e) {
      console.error("Auth subscription failed:", e)
    }
  }, [])

  // 3. Load Firebase Database (with Try/Catch & Fallback)
  useEffect(() => {
    if (!sessionCode) return

    let unsubscribeSession = () => {}
    let unsubscribeStudents = () => {}

    try {
      unsubscribeSession = subscribeToSession(
        sessionCode,
        (updatedSession) => {
          if (!updatedSession) {
            // Local fallback if Firebase returns empty
            const fallbackSession: Session = {
              id: sessionCode,
              code: sessionCode,
              title: "Thermodynamics Lab (Offline)",
              subject: "Physics",
              gradeLevel: "Undergraduate",
              duration: "60 mins",
              type: "Public",
              topics: ["Introduction to Thermodynamics", "The Carnot Cycle", "Concept of Entropy"],
              currentTopicIndex: 0,
              status: "Live",
              teacherId: "offline-teacher",
              createdAt: new Date(),
              teachingMode: "AI"
            }
            setSession(fallbackSession)
            setTeachingMode("AI")
            setError(null)
            setLoading(false)
          } else {
            setSession(updatedSession)
            setTeachingMode(updatedSession.teachingMode === "AI" ? "AI" : "Human")
            setError(null)
            setLoading(false)
            console.log("Session data loaded")
            // Sync toggles
            setFocusMode(!!updatedSession.focusMode)
            setAllowLateJoins(updatedSession.allowLateJoins !== false)
            setMuteOnEntry(updatedSession.muteOnEntry !== false)
          }
        },
        (err) => {
          console.error("Firebase session subscription error:", err)
          setError("Failed to load session. Return to dashboard?")
          setLoading(false)
        }
      )

      unsubscribeStudents = subscribeToStudents(
        sessionCode,
        (updatedStudents) => {
          setStudentsList(updatedStudents)
        },
        (err) => {
          console.error("Firebase students subscription error:", err)
        }
      )
    } catch (e) {
      console.error("Firebase connection error:", e)
      setError("Failed to load session. Return to dashboard?")
      setLoading(false)
    }

    return () => {
      unsubscribeSession()
      unsubscribeStudents()
    }
  }, [sessionCode])

  // 4. Determine user role
  useEffect(() => {
    if (session && currentUser) {
      setIsTeacher(session.teacherId === currentUser.uid)
    } else if (session) {
      // Offline fallback check
      setIsTeacher(session.teacherId === "offline-teacher")
    } else {
      setIsTeacher(false)
    }
  }, [session, currentUser])

  // 5. Countdown timer in waiting room
  useEffect(() => {
    if (!session || !session.countdownEndsAt || isClassroomActive) return

    const checkTimer = () => {
      const targetMs = session.countdownEndsAt.seconds
        ? session.countdownEndsAt.seconds * 1000
        : new Date(session.countdownEndsAt).getTime()

      const diff = Math.max(0, Math.floor((targetMs - Date.now()) / 1000))
      setTimeRemaining(diff)

      if (diff === 0 && session.status !== "Active" && session.status !== "Completed") {
        if (isTeacher) {
          try {
            startClassEarly(sessionCode)
          } catch (e) {
            console.warn("startClassEarly fail:", e)
            setIsClassroomActive(true) // local bypass
          }
        }
      }
    }

    checkTimer()
    const interval = setInterval(checkTimer, 1000)
    return () => clearInterval(interval)
  }, [session, isTeacher, sessionCode, isClassroomActive])

  // 6. Transition state checker
  useEffect(() => {
    if (session?.status === "Active" && !isClassroomActive && !isTransitioning) {
      setIsTransitioning(true)
      const timeout = setTimeout(() => {
        setIsTransitioning(false)
        setIsClassroomActive(true)
        console.log("Transition complete")
        console.log("Navigating to classroom")
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [session, isClassroomActive, isTransitioning])

  // 7. Waiting Room: rotate help subtitles
  useEffect(() => {
    if (isClassroomActive) return
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % ROTATING_SUBTITLES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [isClassroomActive])

  // 8. Classroom: Timer elapsed ticking
  useEffect(() => {
    if (!hasEnteredClassroom) return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [hasEnteredClassroom])

  // 9. Classroom: Simulate students list & focus average
  useEffect(() => {
    if (!hasEnteredClassroom) return
    const simulateFocus = () => {
      const updated = studentsList.map((st) => {
        const score = Math.floor(Math.random() * 45) + 55
        let attentionState: "focused" | "distracted" | "offline" = "focused"
        let border = "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
        
        if (score < 70) {
          attentionState = "distracted"
          border = "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
        }
        if (score < 60) {
          attentionState = "offline"
          border = "border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]"
        }

        return {
          ...st,
          engagementScore: score,
          attentionState,
          focusColor: border,
          isMuted: Math.random() > 0.3
        }
      })

      // At least 6 students in class
      const MOCK_NAMES = ["Emily R.", "Jacob S.", "Michael C.", "Sophia P.", "Liam K.", "Chloe D."]
      while (updated.length < 6) {
        const idx = updated.length
        const score = Math.floor(Math.random() * 40) + 60
        let attentionState: "focused" | "distracted" | "offline" = "focused"
        let border = "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
        
        if (score < 72) {
          attentionState = "distracted"
          border = "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
        }

        updated.push({
          id: `mock-st-${idx}`,
          name: MOCK_NAMES[idx % MOCK_NAMES.length],
          joinedAt: null,
          lastActive: null,
          status: "active",
          engagementScore: score,
          attentionState,
          focusColor: border,
          isMuted: true
        })
      }

      setDynamicStudents(updated)
      const avg = Math.floor(updated.reduce((acc, c) => acc + c.engagementScore, 0) / updated.length)
      setClassFocusAvg(avg)
    }

    simulateFocus()
    const interval = setInterval(simulateFocus, 6500)
    return () => clearInterval(interval)
  }, [hasEnteredClassroom, studentsList])

  // Web Speech API synthesiser
  const triggerAudioSpeech = (text: string, onEnd?: () => void) => {
    try {
      window.speechSynthesis.cancel() // clear active queue
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.volume = 0.6
      utterance.rate = 1.0
      
      utterance.onstart = () => {
        setAiSpeechState("speaking")
        setLiveSubtitles(text)
      }
      
      utterance.onend = () => {
        setAiSpeechState("idle")
        if (onEnd) onEnd()
      }
      
      utterance.onerror = (e) => {
        console.warn("Speech error:", e)
        setAiSpeechState("idle")
      }
      
      speechUtteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn("Speech synthesis fail:", e)
    }
  }

  // AI Lecture teaching sequence trigger
  const runAiTopicSpeech = (topicIdx: number) => {
    if (!session || !session.topics || session.topics.length === 0) return
    
    const topic = session.topics[topicIdx]
    const lectureText = getMockAIScriptForTopic(topic)
    
    triggerAudioSpeech(lectureText, () => {
      // Go to next topic when speech ends
      const nextIdx = topicIdx + 1
      if (nextIdx < session.topics.length) {
        addToast("Moving to next topic")
        setActiveTopicIdx(nextIdx)
        setTimeout(() => runAiTopicSpeech(nextIdx), 1500)
      } else {
        triggerAudioSpeech("That completes our course outline for today. Feel free to review the session materials.")
      }
    })
  }

  // Handle Doubt resolve
  const handleSendDoubt = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMsg = {
      id: Date.now().toString(),
      sender: studentName || "You",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isAI: false,
    }

    setMessages((prev) => [...prev, userMsg])
    setChatInput("")

    // Pause teaching speech
    try {
      window.speechSynthesis.pause()
      setAiSpeechState("paused")
      addToast("AI paused teaching to answer doubt")
    } catch (err) {
      console.warn("Error pausing speech:", err)
    }

    // Call Claude API (Simulated prompt delay)
    setTimeout(() => {
      const randomAns = CLAUDE_DOUBT_RESPONSES[Math.floor(Math.random() * CLAUDE_DOUBT_RESPONSES.length)]
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        sender: "Professor AI",
        text: randomAns,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAI: true,
      }
      setMessages((prev) => [...prev, aiResponse])
      
      // Speak the Claude response, then resume teaching
      triggerAudioSpeech(randomAns, () => {
        triggerAudioSpeech("Great question! Now let's continue...", () => {
          // Resume main lecture
          runAiTopicSpeech(activeTopicIdx)
        })
      })
    }, 2000)
  }

  // Confirm End session
  const handleEndClass = () => {
    setShowEndModal(false)
    setEndCountdown(5)
    triggerAudioSpeech("That is all for today. Great work everyone!")
  }

  // End countdown timer redirect
  useEffect(() => {
    if (endCountdown === null) return
    if (endCountdown === 0) {
      router.push(`/session/${sessionCode}/summary`)
      return
    }
    const timer = setTimeout(() => {
      setEndCountdown((c) => (c !== null ? c - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [endCountdown, sessionCode, router])

  // Toast adder
  const addToast = (text: string, icon?: React.ReactNode) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, text, icon }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const formatTimeStr = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  // Render Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white font-sans">
        <div className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-white/60">Connecting to session channel...</p>
      </div>
    )
  }

  // Render Error
  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white font-sans p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-lg font-bold mb-2">Session Error</h2>
        <p className="text-sm text-white/50 mb-6 max-w-sm">
          {error || "Failed to load session. Return to dashboard?"}
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-[#1a1a1a] rounded-xl text-xs font-semibold hover:bg-[#242424] border border-white/5 transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // ─── WAITING ROOM: RIPPLE TRANSITION ──────
  // ──────────────────────────────────────────
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white font-sans overflow-hidden relative">
        <style>{`
          @keyframes ripple {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          .ripple-bg {
            position: absolute;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(147,51,234,0.3) 0%, transparent 70%);
            animation: ripple 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          }
          .ripple-bg-2 { animation-delay: 0.7s; }
        `}</style>
        <div className="ripple-bg" />
        <div className="ripple-bg ripple-bg-2" />
        
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 animate-bounce">
            <Brain className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Class is starting...</h2>
          <p className="text-xs text-white/40">Entering live classroom environment</p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // ─── ACTIVE CLASSROOM SCREEN (FULL SCREEN) ──
  // ──────────────────────────────────────────
  if (isClassroomActive) {
    const activeTopic = session.topics && session.topics[activeTopicIdx] ? session.topics[activeTopicIdx] : "Thermodynamics Core"
    const progressPercent = session.topics ? Math.floor(((activeTopicIdx + 1) / session.topics.length) * 100) : 50

    return (
      <div className="fixed inset-0 bg-[#070708] text-white flex flex-col font-sans antialiased overflow-hidden select-none z-50 h-screen w-screen">
        <style>{`
          @keyframes waveform {
            0%, 100% { transform: scaleY(0.2); }
            50% { transform: scaleY(1.0); }
          }
          .wv-bar {
            animation: waveform 0.75s ease-in-out infinite;
          }
          .wv-1 { animation-delay: 0.1s; }
          .wv-2 { animation-delay: 0.25s; }
          .wv-3 { animation-delay: 0.05s; }
          .wv-4 { animation-delay: 0.3s; }
          .wv-5 { animation-delay: 0.15s; }
        `}</style>

        {/* 1. ENTRY OVERLAY (Only shows if hasEnteredClassroom is false) */}
        {!hasEnteredClassroom && (
          <div className="fixed inset-0 bg-[#08080A] z-[99] flex flex-col items-center justify-center text-center p-6">
            <div className="space-y-6 max-w-sm mx-auto animate-scaleUp">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center border border-purple-400/25 mx-auto shadow-[0_0_30px_rgba(147,51,234,0.35)]">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white">Your classroom is ready</h2>
                <p className="text-xs text-white/40 leading-relaxed">
                  Join the room to begin listening to Professor AI. Autoplay requires a user click gesture.
                </p>
              </div>
              <button
                onClick={() => {
                  setHasEnteredClassroom(true)
                  // Trigger first lecture voice
                  if (session.teachingMode === "AI") {
                    runAiTopicSpeech(0)
                  } else {
                    triggerAudioSpeech("Live class mode enabled. Awaiting instructor audio streams.")
                  }
                }}
                className="w-full py-4.5 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-black uppercase text-white tracking-widest transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98] cursor-pointer"
              >
                Enter Classroom
              </button>
            </div>
          </div>
        )}

        {/* 2. TOP BAR (dark #111111) */}
        <header className="h-16 bg-[#111111] border-b border-white/[0.06] px-6 flex items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white leading-none">Class<span className="text-purple-400">AI</span></span>
              <span className="text-[10px] text-white/40 font-semibold tracking-wide uppercase truncate max-w-[130px] mt-0.5">
                {session.title}
              </span>
            </div>
          </div>

          {/* Topic bar progress */}
          <div className="flex flex-col items-center gap-1.5 w-80">
            <div className="flex items-center gap-2 text-xs text-white/70 font-medium">
              <span className="text-purple-400 font-bold uppercase text-[9px] tracking-wider">
                Topic {activeTopicIdx + 1} of {session.topics?.length || 1}:
              </span>
              <span className="truncate max-w-[160px]">{activeTopic}</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-white/40">Class Focus:</span>
              <span className="text-emerald-400">87%</span>
            </div>
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg font-mono">
              <span>{formatTimeStr(elapsedSeconds)}</span>
              <span className="border-l border-white/10 pl-3 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-purple-400" />
                {dynamicStudents.length}
              </span>
            </div>
            {isTeacher && (
              <button
                onClick={() => setShowEndModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                End Session
              </button>
            )}
          </div>
        </header>

        {/* 3. TEACHER BANNER */}
        {isTeacher && session.teachingMode === "AI" && (
          <div className="h-10 bg-[#0F0F10] border-b border-white/[0.04] px-6 flex items-center justify-between text-xs text-white/50 flex-shrink-0 z-20">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span>👁 Observing • AI is teaching</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  window.speechSynthesis.pause()
                  setAiSpeechState("paused")
                  addToast("AI Teacher paused")
                }}
                className="px-3 py-1 rounded bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase transition-all hover:bg-white/10 cursor-pointer"
              >
                Pause AI
              </button>
              <button
                onClick={() => {
                  setTeachingMode("Human")
                  window.speechSynthesis.cancel()
                  addToast("You took over instruction")
                }}
                className="px-3 py-1 rounded bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase transition-all hover:bg-white/10 cursor-pointer"
              >
                Take Over
              </button>
            </div>
          </div>
        )}

        {/* 4. MAIN SPLIT AREA */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel (65%) */}
          <div className="w-[65%] flex flex-col p-5 gap-4.5 overflow-hidden h-full pb-20 justify-between">
            {/* AI Teacher Tile */}
            <div className={`bg-[#121214] rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all duration-300 relative ${
              aiSpeechState === "speaking" ? "border-purple-500/60 shadow-[0_0_15px_rgba(147,51,234,0.15)]" : "border-white/[0.04]"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center border border-purple-400/25 transition-all ${
                  aiSpeechState === "speaking" ? "scale-105 shadow-[0_0_12px_rgba(147,51,234,0.3)] animate-pulse" : "opacity-45"
                }`}>
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Professor AI</h4>
                  <span className="text-[9px] text-white/30 font-bold uppercase mt-1 block">
                    {aiSpeechState === "speaking" ? "Lecturing..." : aiSpeechState === "paused" ? "Paused" : "Awaiting outline..."}
                  </span>
                </div>
              </div>

              {/* Waveform graphic */}
              <div className="flex items-center gap-3">
                {aiSpeechState === "speaking" ? (
                  <div className="flex items-end gap-1 h-5 w-10 pb-0.5 text-purple-400">
                    <div className="h-full w-0.5 rounded bg-current wv-bar wv-1" />
                    <div className="h-full w-0.5 rounded bg-current wv-bar wv-2" />
                    <div className="h-full w-0.5 rounded bg-current wv-bar wv-3" />
                    <div className="h-full w-0.5 rounded bg-current wv-bar wv-4" />
                    <div className="h-full w-0.5 rounded bg-current wv-bar wv-5" />
                  </div>
                ) : (
                  <div className="flex items-end gap-1 h-5 w-10 pb-0.5 text-white/10">
                    <div className="h-1 w-0.5 rounded bg-current" />
                    <div className="h-1 w-0.5 rounded bg-current" />
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>

            {/* Content canvas */}
            <div className="flex-1 bg-[#0D0D0E] border border-white/[0.04] rounded-2xl overflow-hidden flex flex-col relative min-h-[300px]">
              <div className="absolute top-4 right-4 z-10">
                <span className="px-2.5 py-1 rounded bg-black/55 border border-white/5 text-[9px] font-mono font-bold text-purple-400 uppercase tracking-widest">
                  SLIDE
                </span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                <div className="space-y-4 max-w-xl w-full">
                  <div className="h-24 w-24 rounded-2xl bg-purple-600/5 border border-purple-500/10 flex items-center justify-center text-purple-400 mx-auto">
                    <Presentation className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{activeTopic}</h3>
                    <p className="text-xs text-white/40 mt-1 max-w-md mx-auto leading-relaxed">
                      Slide presentation demonstrating laws governing heat capacity, mechanical limits, and kinetic flow configurations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-11 border-t border-white/[0.04] bg-black/15 flex items-center justify-between px-5 text-xs text-white/50">
                <span>Displaying slide details for: {activeTopic}</span>
                <span className="font-mono text-[9px] text-white/25">PAGE_ID: CLS-0{activeTopicIdx + 1}</span>
              </div>
            </div>

            {/* Live Subtitles transcript */}
            <div className="bg-[#121214] border border-white/[0.04] rounded-2xl p-4.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-purple-400">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Live Subtitles
              </div>
              <div className="max-h-[50px] overflow-y-auto custom-scrollbar text-xs leading-relaxed text-white/70">
                {liveSubtitles || "Professor AI is preparing explanation outline script..."}
              </div>
            </div>
          </div>

          {/* Right panel (35%) */}
          <aside className="w-[35%] border-l border-white/[0.05] bg-[#070708] flex flex-col overflow-hidden h-full pb-20">
            {/* Student webcams list */}
            <div className="flex-1 p-5 border-b border-white/[0.05] flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-white border-b border-white/[0.04] pb-3 mb-3 flex items-center justify-between">
                <span>In this class ({dynamicStudents.length})</span>
                <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </h4>

              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-3 pr-1">
                {dynamicStudents.map((st) => (
                  <div
                    key={st.id}
                    className={`h-24 rounded-xl bg-[#111112] border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all ${st.focusColor}`}
                  >
                    <span className={`absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      st.attentionState === "focused" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                    }`}>
                      {st.attentionState}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-extrabold text-purple-300">
                      {st.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white/80 max-w-[100px] truncate">
                      {st.name}
                    </span>
                    <span className="absolute bottom-2 right-2 text-white/30">
                      <Mic className="h-3 w-3 text-emerald-400" />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live chat resolution */}
            <div className="flex-1 p-5 flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-white border-b border-white/[0.04] pb-3 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                  Doubt Chat
                </span>
              </h4>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-1 pb-2 flex flex-col">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 max-w-[85%] ${msg.isAI ? "self-start" : "self-end items-end"}`}
                  >
                    <span className="text-[9px] text-white/30 font-bold">{msg.sender} • {msg.time}</span>
                    <div className={`text-xs px-3.5 py-2.5 rounded-xl leading-relaxed relative ${
                      msg.isAI ? "bg-[#161618] text-white/95 border border-white/5 rounded-tl-none flex gap-2 items-start" : "bg-purple-600 text-white rounded-tr-none"
                    }`}>
                      {msg.isAI && <Brain className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />}
                      <span>{msg.text}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendDoubt} className="flex gap-2 pt-2 border-t border-white/[0.04]">
                <input
                  type="text"
                  required
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a doubt..."
                  className="flex-1 px-4 py-2.5 bg-[#121214] border border-white/10 rounded-xl text-xs focus:outline-none focus:border-purple-500 text-white"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <CornerDownRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </aside>
        </div>

        {/* 5. BOTTOM TOOLBAR */}
        <footer className="fixed bottom-0 left-0 right-0 h-16 bg-[#111112]/90 backdrop-blur-xl border-t border-white/[0.04] px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                micOn ? "bg-white/5 border-white/5 text-white/70 hover:bg-white/10" : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {micOn ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => setVideoOn(!videoOn)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                videoOn ? "bg-white/5 border-white/5 text-white/70 hover:bg-white/10" : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {videoOn ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => {
                setHandRaised(!handRaised)
                if (!handRaised) addToast("You raised your hand ✋")
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                handRaised ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-white/5 border-white/5 text-white/70"
              }`}
            >
              <Hand className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Teacher actions */}
          {isTeacher && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.speechSynthesis.cancel()
                  setAiSpeechState("idle")
                  addToast("AI Lecture interrupted")
                }}
                className="px-4 py-2 bg-purple-600/15 border border-purple-500/25 text-purple-400 hover:bg-purple-600/25 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Interrupt AI
              </button>
              <button
                onClick={() => {
                  const val = !isRecording
                  setIsRecording(val)
                  addToast(val ? "Recording active" : "Recording saved")
                }}
                className={`px-4.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isRecording ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border border-white/10 text-white/60"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Record
              </button>
            </div>
          )}

          <Link
            href="/dashboard"
            onClick={() => window.speechSynthesis.cancel()}
            className="px-4.5 py-2.5 rounded-xl bg-red-600/10 border border-red-500/15 hover:bg-red-600/20 text-red-400 text-xs font-bold transition-all"
          >
            Leave Class
          </Link>
        </footer>

        {/* 6. TOASTS */}
        <div className="fixed bottom-20 left-6 z-50 flex flex-col gap-2 max-w-xs pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="flex items-center gap-2 bg-[#141416]/95 border border-white/10 p-3 rounded-xl shadow-2xl animate-slideRight text-xs text-white/95">
              <span>{t.text}</span>
            </div>
          ))}
        </div>

        {/* 7. END SESSION CONFIRM MODAL */}
        {showEndModal && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
                <div className="space-y-1.5">
                  <h3 className="font-bold text-white text-base">End this session?</h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    This will end the active lecture streams for all connected participants.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/[0.04] bg-black/20 flex gap-3">
                <button onClick={() => setShowEndModal(false)} className="flex-1 py-2.5 bg-white/5 rounded-xl text-xs font-bold text-white/50 hover:text-white transition-all cursor-pointer">Cancel</button>
                <button onClick={handleEndClass} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer">End Session</button>
              </div>
            </div>
          </div>
        )}

        {/* 8. Countdown Redirect screen */}
        {endCountdown !== null && (
          <div className="fixed inset-0 bg-[#070708] z-[999] flex flex-col items-center justify-center text-center p-6">
            <div className="space-y-4 max-w-sm mx-auto">
              <Brain className="h-12 w-12 text-purple-400 mx-auto animate-pulse" />
              <h2 className="text-lg font-black text-white">Class Session Ended</h2>
              <p className="text-xs text-purple-300/80 leading-relaxed font-semibold italic">"That's all for today. Great work everyone!"</p>
              <p className="text-[10px] text-white/20 pt-2">Returning to summary page in {endCountdown}s</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────
  // ─── WAITING ROOM SCREEN ─────────────────
  // ──────────────────────────────────────────
  const activeStudentCount = studentsList.length
  return (
    <div className="min-h-screen bg-[#111111] text-white flex font-sans antialiased">
      {isTeacher ? (
        /* TEACHER WAITING ROOM */
        <div className="flex-1 flex">
          <DashboardSidebar
            activeItem="Dashboard"
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          <div className="flex-1 lg:ml-64 flex flex-col">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#111111]/80 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 lg:hidden text-white/80"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/40 uppercase">Session Starting in</span>
                  <span className="text-lg font-bold text-purple-400 font-mono tracking-widest px-2.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                    {timeRemaining !== null ? formatTimeStr(timeRemaining) : "02:00"}
                  </span>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await startClassEarly(sessionCode)
                  } catch (e) {
                    setIsClassroomActive(true) // offline bypass
                  }
                }}
                className="flex items-center gap-1 px-4.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold transition-all cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                Start Early
              </button>
            </header>

            <main className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto grid gap-8 lg:grid-cols-10">
              <section className="lg:col-span-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Your session is ready</h2>
                  <p className="text-xs text-white/40 mt-1">Invite students and start the session below</p>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white">{session.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold px-2 py-0.5 rounded-full uppercase">
                          {session.subject}
                        </span>
                        <span className="text-[10px] bg-white/5 border border-white/10 text-white/60 font-bold px-2 py-0.5 rounded-full uppercase">
                          {session.gradeLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-6 text-center space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Invite Students with Code
                  </span>
                  <div className="relative max-w-sm mx-auto flex items-center justify-between bg-purple-500/10 border border-purple-500/20 p-4.5 rounded-2xl">
                    <span className="text-2xl font-mono font-bold tracking-widest text-purple-400">
                      {session.code}
                    </span>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(sessionCode)
                        setIsCopied(true)
                        setTimeout(() => setIsCopied(false), 2000)
                      }}
                      className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-all cursor-pointer"
                    >
                      {isCopied ? <CheckCircle className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-4 space-y-6">
                <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-5 flex flex-col h-[300px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Students Joined</h3>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-[10px] text-purple-400 font-bold">
                      {activeStudentCount} ready
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {studentsList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Users className="h-8 w-8 text-white/10 mb-2" />
                        <p className="text-xs font-bold text-white/40">Waiting for students...</p>
                      </div>
                    ) : (
                      studentsList.map((st) => (
                        <div key={st.id} className="flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/5 rounded-xl">
                          <span className="text-xs font-semibold text-white/95">{st.name}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400 uppercase">Joined</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await startClassEarly(sessionCode)
                    } catch (e) {
                      setIsClassroomActive(true) // offline bypass
                    }
                  }}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm text-white transition-all cursor-pointer"
                >
                  Start Session
                </button>
              </section>
            </main>
          </div>
        </div>
      ) : (
        /* STUDENT WAITING LOBBY */
        <div className="min-h-screen bg-[#0A0A0A] w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 animate-scaleUp">
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
                <Brain className="h-8 w-8 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white">Waiting Lobby</h2>
              <p className="text-xs text-white/40">
                {ROTATING_SUBTITLES[subtitleIndex]}
              </p>
            </div>
            
            <div className="bg-[#111112] border border-white/5 p-6 rounded-2xl space-y-4">
              <div className="text-left space-y-1">
                <span className="text-[10px] text-purple-400 uppercase font-black">Joining Session</span>
                <h3 className="text-base font-bold text-white">{session.title}</h3>
                <p className="text-[11px] text-white/40">{session.subject} • {session.gradeLevel}</p>
              </div>

              <div className="border-t border-white/5 pt-4 text-xs flex items-center justify-between text-white/50">
                <span>Classroom status:</span>
                <span className="text-purple-400 font-bold uppercase animate-pulse">Waiting for host...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
