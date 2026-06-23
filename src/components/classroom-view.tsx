"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
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
  HelpCircle,
  Hand,
  CornerDownRight,
  Info,
  Pause,
  RotateCcw,
  Sparkles,
} from "lucide-react"

import { Session, Student, endSession } from "@/lib/session-service"

interface ClassroomViewProps {
  sessionCode: string
  session: Session
  studentsList: Student[]
  isTeacher: boolean
  studentId: string | null
  studentName: string | null
}

const MOCK_SLIDES = [
  { type: "SLIDE", title: "Overview of Thermodynamics", caption: "Slide 1: Definition of Heat, Work, and Energy conservation" },
  { type: "IMAGE", title: "Carnot Engine Diagram", caption: "Figure 1.2: Heat input Q1 vs Work output W" },
  { type: "VIDEO", title: "Entropy Explained", caption: "Video: Molecular explanation of statistical entropy" },
  { type: "SLIDE", title: "The Third Law", caption: "Slide 4: Absolute Zero limitations and crystal entropy" }
]

const AI_SCRIPT_LINES = [
  "Welcome back to ClassAI. Today, we are studying Thermodynamics.",
  "Let's review the First Law: Energy cannot be created or destroyed, only transformed.",
  "Look at the slide showing the Carnot Cycle model on your screen.",
  "This is a theoretical engine that yields maximum thermal efficiency.",
  "Entropy, represented by S, is a measure of molecular randomness or disorder.",
  "As we proceed, notice how efficiency depends strictly on temperature reservoirs.",
  "That completes our core outline. Let's look at absolute zero boundaries."
]

export default function ClassroomView({
  sessionCode,
  session,
  studentsList,
  isTeacher,
  studentId,
  studentName,
}: ClassroomViewProps) {

  // Global settings
  const [micOn, setMicOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [isRecording, setIsRecording] = useState(false)

  // Timer & Progress
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeTopicIdx, setActiveTopicIdx] = useState(0)

  // Subtitles
  const [subIndex, setSubIndex] = useState(0)

  // Mode Overrides (Teacher control)
  const [aiTeachingMode, setAiTeachingMode] = useState<"Teaching" | "Paused" | "Human">(
    session.teachingMode === "AI" ? "Teaching" : "Human"
  )

  // AI Assistant Suggestion card (Human mode)
  const [aiSuggestion, setAiSuggestion] = useState<{
    type: "IMAGE" | "VIDEO"
    title: string
    show: boolean
  } | null>({
    type: "IMAGE",
    title: "AI suggests showing: Carnot Cycle schematic diagram",
    show: true,
  })

  // Chat
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<Array<{
    id: string
    sender: string
    text: string
    time: string
    isAI: boolean
  }>>([
    { id: "1", sender: "Professor AI", text: "Welcome to today's physics session. Feel free to type any doubts here.", time: "10:00 AM", isAI: true },
    { id: "2", sender: "Alex R.", text: "Is the efficiency formula only applicable to Carnot cycles?", time: "10:01 AM", isAI: false },
    { id: "3", sender: "Professor AI", text: "Great question, Alex! Carnot cycle efficiency represents the maximum limit. Real engine efficiencies are always lower due to friction.", time: "10:02 AM", isAI: true }
  ])

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; icon?: React.ReactNode }>>([])

  // End Session Modal
  const [showEndModal, setShowEndModal] = useState(false)
  const [endCountdown, setEndCountdown] = useState<number | null>(null)

  // Simulated student focus variance (fluctuates every 5s)
  const [dynamicStudents, setDynamicStudents] = useState<Array<Student & { focusColor: string; statusLabel: string }>>([])
  const [classFocusAvg, setClassFocusAvg] = useState(87)

  // Keyboard shortcut handlers refs
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // 1. Timer ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // 2. AI Subtitle progression (changes every 6 seconds in AI Mode)
  useEffect(() => {
    if (aiTeachingMode !== "Teaching") return
    const interval = setInterval(() => {
      setSubIndex((prev) => {
        const next = (prev + 1) % AI_SCRIPT_LINES.length
        // Occasionally trigger topic progress change
        if (next === 3 || next === 5) {
          setActiveTopicIdx((t) => Math.min(MOCK_SLIDES.length - 1, t + 1))
          addToast("AI moving to next topic")
        }
        return next
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [aiTeachingMode])

  // 3. Simulate live student camera states & attention telemetry
  useEffect(() => {
    const generateStudentsList = () => {
      const displayList = studentsList.map((st, idx) => {
        // Mock attention scores based on indices
        const focusVal = Math.floor(Math.random() * 40) + 60 // 60 to 100
        let ringColor = "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
        let status = "focused"

        if (focusVal < 70) {
          ringColor = "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          status = "distracted"
        } else if (focusVal < 62) {
          ringColor = "border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
          status = "not looking"
        }

        return {
          ...st,
          engagementScore: focusVal,
          focusColor: ringColor,
          statusLabel: status
        }
      })

      // Add dummy classmates to make it a populated grid (12 participants)
      const DUMMY_NAMES = [
        "Emily Watson", "Jacob Stern", "Michael Chen", "Sophia Patel", 
        "Liam O'Connor", "Chloe Dubois", "Daniel Kim", "Olivia Vance"
      ]

      while (displayList.length < 12) {
        const nextIdx = displayList.length
        const name = DUMMY_NAMES[nextIdx % DUMMY_NAMES.length] + ` ${String.fromCharCode(65 + nextIdx)}`
        const focusVal = Math.floor(Math.random() * 50) + 50
        let ringColor = "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
        let status = "focused"

        if (focusVal < 75) {
          ringColor = "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          status = "distracted"
        }
        if (focusVal < 60) {
          ringColor = "border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
          status = "not looking"
        }

        displayList.push({
          id: `dummy-${nextIdx}`,
          name,
          joinedAt: null,
          lastActive: null,
          status: "active",
          engagementScore: focusVal,
          focusColor: ringColor,
          statusLabel: status
        })
      }

      setDynamicStudents(displayList)
      
      // Calculate class average
      const avg = Math.floor(displayList.reduce((acc, curr) => acc + curr.engagementScore, 0) / displayList.length)
      setClassFocusAvg(avg)

      if (avg < 75 && isTeacher) {
        addToast("Class attention dropping", <AlertCircle className="h-4 w-4 text-amber-500" />)
      }
    }

    generateStudentsList()
    const interval = setInterval(generateStudentsList, 6000)
    return () => clearInterval(interval)
  }, [studentsList, isTeacher])

  // 4. Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events in inputs
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return
      }

      const key = e.key.toLowerCase()
      if (key === "m") {
        setMicOn(!micOn)
        addToast(micOn ? "Microphone muted" : "Microphone active")
      } else if (key === "v") {
        setVideoOn(!videoOn)
        addToast(videoOn ? "Camera feed disabled" : "Camera feed enabled")
      } else if (key === "h") {
        setHandRaised(!handRaised)
        if (!handRaised) {
          addToast("You raised your hand")
          if (!isTeacher) {
            // Simulated AI speech trigger
            playSpeechNotification(`${studentName || "A student"} has a question.`)
          }
        }
      } else if (key === "c") {
        setChatOpen(!chatOpen)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [micOn, videoOn, handRaised, chatOpen, studentName])

  // Scroll chat to bottom on updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Toast alert manager
  const addToast = (text: string, icon?: React.ReactNode) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, text, icon }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Audio speech announcements (Web Audio synthesizer API)
  const playSpeechNotification = (phrase: string) => {
    try {
      const speech = new SpeechSynthesisUtterance(phrase)
      speech.volume = 0.5
      speech.rate = 1.0
      window.speechSynthesis.speak(speech)
    } catch (e) {
      console.warn("Speech synthesis not supported.")
    }
  }

  // Handle Send chat message
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

    // Simulated AI Auto responder check
    if (aiTeachingMode === "Teaching") {
      setAiTeachingMode("Paused")
      addToast("AI paused teaching to answer doubt")
      
      setTimeout(() => {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          sender: "Professor AI",
          text: "Excellent point. Let's analyze this parameter. As we observe Carnot cycles, we realize work output is limited. I'll resume teaching now.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isAI: true,
        }
        setMessages((prev) => [...prev, aiResponse])
        setAiTeachingMode("Teaching")
        addToast("AI resumed teaching")
      }, 3000)
    } else {
      // Human mode auto doubt resolver
      setTimeout(() => {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          sender: "Professor AI",
          text: "🤖 [AI Auto Answer] The Carnot cycle limit represents maximum efficiency due to thermodynamics entropy limitations. In real engines, friction reduces this output.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isAI: true,
        }
        setMessages((prev) => [...prev, aiResponse])
      }, 2000)
    }
  }

  // Format Elapsed Time (hh:mm:ss)
  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, "0")
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0")
    const s = (sec % 60).toString().padStart(2, "0")
    return h === "00" ? `${m}:${s}` : `${h}:${m}:${s}`
  }

  // Confirm classroom end trigger
  const handleEndClassroom = () => {
    setShowEndModal(false)
    setEndCountdown(5)
    
    // Play AI summary voice cue
    playSpeechNotification("That is all for today's class. Great work everyone!")
  }

  // Countdown timer redirect effect
  useEffect(() => {
    if (endCountdown === null) return
    if (endCountdown === 0) {
      window.location.href = "/dashboard"
      return
    }
    const timer = setTimeout(() => {
      setEndCountdown((c) => (c !== null ? c - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [endCountdown])

  // UI calculations
  const progressPercent = Math.floor(((activeTopicIdx + 1) / MOCK_SLIDES.length) * 100)
  const currentSlide = MOCK_SLIDES[activeTopicIdx]

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] text-white flex flex-col font-sans antialiased overflow-hidden select-none z-50">
      
      {/* Dynamic speaking waveform keyframes */}
      <style>{`
        @keyframes bounce-waveform {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1.1); }
        }
        .bounce-bar {
          animation: bounce-waveform 0.6s ease-in-out infinite;
        }
        .bounce-bar-1 { animation-delay: 0.1s; }
        .bounce-bar-2 { animation-delay: 0.25s; }
        .bounce-bar-3 { animation-delay: 0.05s; }
        .bounce-bar-4 { animation-delay: 0.3s; }
        .bounce-bar-5 { animation-delay: 0.15s; }
      `}</style>

      {/* ──────────────────────────────────────────
      ─── TOP NAVIGATION HEADER BAR ─────────────
      ────────────────────────────────────────── */}
      <header className="h-16 border-b border-[#1a1a1a] bg-[#111111] px-6 flex items-center justify-between z-20">
        {/* Left Brand info */}
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Class AI" width={28} height={28} />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-none">
              Class<span className="text-purple-400">AI</span>
            </span>
            <span className="text-[9px] text-white/30 font-semibold uppercase mt-0.5 tracking-wider truncate max-w-[120px] md:max-w-none">
              {session.title}
            </span>
          </div>
        </div>

        {/* Center Topic Progress Bar */}
        <div className="hidden md:flex flex-col items-center gap-1.5 w-80">
          <div className="flex items-center gap-1.5 text-xs text-white/60 font-semibold">
            <span className="text-purple-400 uppercase text-[9px] font-bold">Topic {activeTopicIdx + 1} of {MOCK_SLIDES.length}:</span>
            <span className="truncate max-w-[180px]">{currentSlide.title}</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right telemetries */}
        <div className="flex items-center gap-4.5">
          {/* Focus indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-white/40">Focus:</span>
            <span className={`font-bold ${classFocusAvg >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{classFocusAvg}%</span>
          </div>

          {/* Time & Count */}
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="font-mono bg-black/25 px-2.5 py-1 rounded border border-white/5">{formatElapsed(elapsedSeconds)}</span>
            <span className="flex items-center gap-1 bg-black/25 px-2.5 py-1 rounded border border-white/5">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              {dynamicStudents.length}
            </span>
            {/* Net Dot */}
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Network status: Excellent" />
          </div>

          {/* End Button */}
          {isTeacher && (
            <button
              onClick={() => setShowEndModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all shadow-md shadow-red-600/20 cursor-pointer"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* 👁 TEACHER OBSERVER BANNER 👁 */}
      {isTeacher && session.teachingMode === "AI" && (
        <div className="h-10 bg-[#141414] border-b border-[#242424] flex items-center justify-between px-6 z-10 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            <span>👁 You are observing • <strong>AI is teaching</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            {aiTeachingMode === "Teaching" ? (
              <button
                onClick={() => {
                  setAiTeachingMode("Paused")
                  addToast("AI Teacher paused")
                }}
                className="px-2.5 py-1 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[10px] font-bold border border-purple-500/30 text-purple-300 transition-colors"
              >
                Pause AI
              </button>
            ) : (
              <button
                onClick={() => {
                  setAiTeachingMode("Teaching")
                  addToast("AI Teacher active")
                }}
                className="px-2.5 py-1 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[10px] font-bold border border-emerald-500/30 text-emerald-300 transition-colors"
              >
                Resume AI
              </button>
            )}

            <button
              onClick={() => {
                setAiTeachingMode("Human")
                addToast("Observer mode deactivated. You are leading the class.")
              }}
              className="px-2.5 py-1 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[10px] font-bold border border-white/10 text-white transition-colors"
            >
              Take Over
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
      ─── CORE SPLIT CLASSROOM MAIN GRID ─────────
      ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: ACTIVE LECTURE CANVAS (65%) */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          
          {/* ─── ROW 1: AI TEACHER TILE (OR HUMAN ASSISTANT CARD) ─── */}
          {aiTeachingMode !== "Human" ? (
            /* VERSION 1 — AI TEACHER CARD */
            <div className={`bg-[#1A1A1A] rounded-2xl border p-4.5 flex items-center justify-between gap-4.5 transition-all duration-300 relative ${
              aiTeachingMode === "Teaching"
                ? "border-purple-500/60 shadow-[0_0_15px_rgba(147,51,234,0.15)]"
                : "border-white/5"
            }`}>
              {/* Red Pulse Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-red-500">Live</span>
              </div>

              {/* Avatar detail */}
              <div className="flex items-center gap-4">
                {/* Glowing geometric orb simulation */}
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-600 flex items-center justify-center border border-purple-400/20 transition-all ${
                  aiTeachingMode === "Teaching" ? "scale-105 shadow-[0_0_12px_rgba(147,51,234,0.4)] animate-pulse" : "opacity-60"
                }`}>
                  <Brain className="h-7 w-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Professor AI</h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                    {aiTeachingMode === "Teaching" ? "Actively Lecturing..." : "Paused / Waiting"}
                  </span>
                </div>
              </div>

              {/* Speaking waveform bouncing lines */}
              {aiTeachingMode === "Teaching" ? (
                <div className="flex items-end gap-1 h-6 w-12 pb-1 text-purple-400">
                  <div className="h-full w-1 rounded bg-current bounce-bar bounce-bar-1" />
                  <div className="h-full w-1 rounded bg-current bounce-bar bounce-bar-2" />
                  <div className="h-full w-1 rounded bg-current bounce-bar bounce-bar-3" />
                  <div className="h-full w-1 rounded bg-current bounce-bar bounce-bar-4" />
                  <div className="h-full w-1 rounded bg-current bounce-bar bounce-bar-5" />
                </div>
              ) : (
                <div className="flex items-end gap-1 h-6 w-12 pb-1 text-white/20">
                  <div className="h-1 w-1 rounded bg-current" />
                  <div className="h-1 w-1 rounded bg-current" />
                  <div className="h-1 w-1 rounded bg-current" />
                  <div className="h-1 w-1 rounded bg-current" />
                  <div className="h-1 w-1 rounded bg-current" />
                </div>
              )}
            </div>
          ) : (
            /* VERSION 2 — AI ASSISTANT CARD FOR HUMAN TEACHER */
            <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4.5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0 animate-pulse">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    🤖 AI Assistant <span className="text-[9px] font-bold text-purple-400 animate-pulse">Listening...</span>
                  </h4>
                  <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">
                    {aiSuggestion?.show
                      ? aiSuggestion.title
                      : "Awaiting audio triggers to suggest visual content outlines..."}
                  </p>
                </div>
              </div>

              {aiSuggestion?.show && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      addToast("AI Visual displayed on canvas")
                      setAiSuggestion(null)
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white transition-colors cursor-pointer"
                  >
                    Show this
                  </button>
                  <button
                    onClick={() => setAiSuggestion(null)}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/60 transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── ROW 2: ACTIVE CONTENT DISPLAY SCREEN ─── */}
          <div className="flex-1 bg-[#111111] border border-white/5 rounded-2xl overflow-hidden flex flex-col relative min-h-[320px]">
            {/* Header / Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className="px-2.5 py-1 rounded bg-black/45 border border-white/5 text-[9px] font-mono font-bold text-purple-400 tracking-wider">
                {currentSlide.type}
              </span>
            </div>

            {/* Simulated Content visual layout */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-0 relative">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

              {/* Display depending on mode */}
              {aiTeachingMode === "Human" ? (
                /* Human view: Displays Teacher's Large Camera Feed */
                <div className="h-full w-full max-w-lg rounded-xl border border-white/5 bg-black overflow-hidden relative flex items-center justify-center">
                  {videoOn ? (
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/60 to-transparent">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse self-end" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-wide">
                          Teacher Camera feed active
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1">Dr. Sarah Jenkins</h4>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-white/30">
                      <UserIcon className="h-10 w-10" />
                      <span className="text-xs font-bold uppercase tracking-widest">Video Muted</span>
                    </div>
                  )}
                </div>
              ) : (
                /* AI Mode: Displays Visual Presentations slides */
                <div className="space-y-4 animate-fadeIn">
                  <div className="h-32 w-32 rounded-2xl bg-purple-600/5 border border-purple-500/10 flex items-center justify-center text-purple-400/40 mx-auto">
                    {currentSlide.type === "SLIDE" && <HelpCircle className="h-12 w-12" />}
                    {currentSlide.type === "IMAGE" && <Share2 className="h-12 w-12" />}
                    {currentSlide.type === "VIDEO" && <Play className="h-12 w-12 fill-current" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{currentSlide.title}</h3>
                    <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">{currentSlide.caption}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Slide Caption Bar */}
            <div className="h-12 border-t border-white/5 bg-black/25 flex items-center px-5 text-xs text-white/50 justify-between">
              <span>{currentSlide.caption}</span>
              <span className="font-mono text-[10px] text-white/20">CLASS-SCREEN-0{activeTopicIdx + 1}</span>
            </div>
          </div>

          {/* ─── ROW 3: SCROLLING AI TRANSCRIBER TEXT ─── */}
          {aiTeachingMode !== "Human" && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 space-y-3 min-h-[90px]">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-purple-400">
                <Brain className="h-3.5 w-3.5" />
                Live Subtitles
              </div>
              <div className="max-h-[60px] overflow-y-auto custom-scrollbar text-xs leading-relaxed space-y-1">
                {AI_SCRIPT_LINES.map((line, idx) => {
                  const isActive = idx === subIndex
                  return (
                    <span
                      key={idx}
                      className={`inline-block mr-1.5 transition-colors ${
                        isActive ? "text-purple-400 font-semibold" : "text-white/30"
                      }`}
                    >
                      {line}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT PANEL: GRID & LIVE DOUBTS CHAT (35%) */}
        <aside className="w-96 border-l border-[#1a1a1a] bg-[#0A0A0A] flex flex-col overflow-hidden">
          
          {/* TOP HALF: PARTICIPANTS WEBCAM GRID */}
          <div className="flex-1 p-5 border-b border-[#1a1a1a] flex flex-col overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-white/5 pb-2.5 mb-3.5 flex items-center justify-between">
              <span>In this class ({dynamicStudents.length})</span>
              <span className="text-[10px] text-white/40 font-semibold">{dynamicStudents.filter(s => s.statusLabel === "focused").length} focused</span>
            </h4>

            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-3 pb-2">
              {dynamicStudents.map((st) => (
                <div
                  key={st.id}
                  className={`h-28 rounded-xl bg-[#111111] border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all ${st.focusColor}`}
                >
                  {/* Focus Color status tag */}
                  <span className={`absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    st.statusLabel === "focused"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : st.statusLabel === "distracted"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  }`}>
                    {st.statusLabel}
                  </span>

                  {/* Avatar / Camera feed simulation */}
                  <div className="h-8 w-8 rounded-full bg-purple-600/25 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 uppercase">
                    {st.name.slice(0, 2)}
                  </div>

                  <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white/80 max-w-[110px] truncate">
                    {st.id === studentId ? "You" : st.name.split(" ")[0]}
                  </span>

                  <span className="absolute bottom-2 right-2 text-white/30">
                    <Mic className="h-3 w-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM HALF: LIVE CHAT DOUBT RESOLUTION */}
          <div className={`flex-1 p-5 flex flex-col overflow-hidden transition-all ${chatOpen ? "block" : "hidden"}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-white/5 pb-2.5 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                Doubt Chat
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            </h4>

            {/* Chat message listing */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pb-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 max-w-[85%] ${
                    msg.isAI ? "self-start" : "self-end items-end"
                  }`}
                >
                  <span className="text-[9px] text-white/30 font-semibold">{msg.sender} • {msg.time}</span>
                  <div className={`text-xs px-3.5 py-2.5 rounded-xl leading-relaxed relative ${
                    msg.isAI
                      ? "bg-[#1E1E1E] text-white/90 border border-white/5 rounded-tl-sm flex gap-2 items-start"
                      : "bg-purple-600 text-white rounded-tr-sm"
                  }`}>
                    {msg.isAI && <Brain className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />}
                    <span>{msg.text}</span>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Send Input Form */}
            <form onSubmit={handleSendDoubt} className="flex gap-2 pt-2 border-t border-white/5">
              <input
                type="text"
                required
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a doubt..."
                className="flex-1 px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-xs focus:outline-none focus:border-purple-500 text-white placeholder-white/20"
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

      {/* ──────────────────────────────────────────
      ─── FLOATING BOTTOM CONTROLS TOOLBAR ───────
      ────────────────────────────────────────── */}
      <footer className="h-16 border-t border-[#1a1a1a] bg-[#111111]/85 backdrop-blur-xl px-6 flex items-center justify-between z-20">
        
        {/* Student actions */}
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              micOn
                ? "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
            }`}
            title="Mute/Unmute Mic (M)"
          >
            {micOn ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
          </button>

          {/* Video toggle */}
          <button
            onClick={() => setVideoOn(!videoOn)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              videoOn
                ? "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
            }`}
            title="Toggle Camera Feed (V)"
          >
            {videoOn ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
          </button>

          {/* Raise Hand toggle */}
          <button
            onClick={() => {
              setHandRaised(!handRaised)
              if (!handRaised) addToast("You raised your hand")
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              handRaised
                ? "bg-amber-500/15 border-amber-500/20 text-amber-400 hover:bg-amber-500/25"
                : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
            }`}
            title="Raise Hand (H)"
          >
            <Hand className="h-4.5 w-4.5" />
          </button>

          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              chatOpen
                ? "bg-purple-600/10 border-purple-500/20 text-purple-400 hover:bg-purple-600/20"
                : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
            }`}
            title="Toggle Doubt Chat (C)"
          >
            <MessageSquare className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Teacher observer/override controls */}
        {isTeacher && (
          <div className="flex items-center gap-2">
            {aiTeachingMode !== "Human" ? (
              <>
                <button
                  onClick={() => {
                    const nextMode = aiTeachingMode === "Teaching" ? "Paused" : "Teaching"
                    setAiTeachingMode(nextMode)
                    addToast(nextMode === "Teaching" ? "AI Teacher resumed" : "AI Teacher paused")
                  }}
                  className="px-4 py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold transition-all cursor-pointer"
                >
                  {aiTeachingMode === "Teaching" ? "Pause AI" : "Resume AI"}
                </button>
                <button
                  onClick={() => {
                    setAiTeachingMode("Human")
                    addToast("AI Teacher deactivated. You are leading the class.")
                  }}
                  className="px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold transition-all cursor-pointer"
                >
                  Take Over
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setAiTeachingMode("Teaching")
                  addToast("AI Teacher activated. AI is leading the class.")
                }}
                className="px-4 py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold transition-all cursor-pointer"
              >
                Let AI Teach
              </button>
            )}

            {/* Record toggle */}
            <button
              onClick={() => {
                const val = !isRecording
                setIsRecording(val)
                addToast(val ? "Session recording started" : "Session recording stopped")
              }}
              className={`px-4.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isRecording
                  ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <span className={`h-2 w-2 rounded-full bg-red-500 ${isRecording ? "animate-pulse" : ""}`} />
              Record
            </button>
          </div>
        )}

        {/* Leave lobby button */}
        <Link
          href="/dashboard"
          className="px-4.5 py-2.5 rounded-xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 text-xs font-bold transition-all"
        >
          Leave Class
        </Link>
      </footer>

      {/* ──────────────────────────────────────────
      ─── TOAST NOTIFICATIONS POPUP LIST ─────────
      ────────────────────────────────────────── */}
      <div className="fixed bottom-20 left-6 z-50 flex flex-col gap-2 max-w-xs pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 bg-[#1a1a1a]/95 backdrop-blur border border-white/5 p-3 rounded-xl shadow-2xl animate-slideRight text-xs text-white/90"
          >
            {toast.icon || <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />}
            <span>{toast.text}</span>
          </div>
        ))}
      </div>

      {/* ──────────────────────────────────────────
      ─── END CLASSROOM DIALOG CONFIRM MODAL ─────
      ────────────────────────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/5 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fadeIn">
            <div className="p-6 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">End this session?</h3>
                <p className="text-xs text-white/40">
                  A dynamic session summary will be compiled automatically for all students.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-black/10 flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEndClassroom}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TIMER TRANSITION SCREEN STATE ─── */}
      {endCountdown !== null && (
        <div className="fixed inset-0 bg-[#0A0A0A] z-50 flex flex-col items-center justify-center text-center p-6 text-white font-sans">
          <div className="space-y-4 animate-scaleUp">
            <div className="h-16 w-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
              <Brain className="h-8 w-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Class session has ended</h2>
            <p className="text-xs text-purple-300/80 leading-relaxed max-w-xs mx-auto">
              "That's all for today's class. Great work everyone!"
            </p>
            <p className="text-[10px] text-white/20">Returning to dashboard in {endCountdown} seconds...</p>
          </div>
        </div>
      )}

    </div>
  )
}
