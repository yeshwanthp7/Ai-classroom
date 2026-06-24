"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  Copy,
  Check,
  Share2,
  Calendar,
  Clock,
  Menu,
  Sparkles,
  User as UserIcon,
  Upload,
  FileText,
  CheckSquare,
  Square,
  Brain,
  HelpCircle,
  Send,
  Loader2,
  BookOpen,
  FileCheck,
} from "lucide-react"
import DashboardSidebar from "@/components/dashboard-sidebar"
import { subscribeToAuthChanges } from "@/lib/auth-service"
import { createSession } from "@/lib/session-service"
import { saveFile, clearFiles } from "@/lib/fileStorage"
import { extractPDFPages } from "@/lib/pdfParser"

const SUBJECTS = ["Mathematics", "Science", "History", "Computer Science", "Language", "Other"]
const GRADE_LEVELS = ["Primary", "Middle School", "High School", "University", "Professional"]
const SUGGESTED_TOPICS = ["Introduction", "Core Concepts", "Examples", "Practice Problems", "Summary"]

export default function CreateSessionPage() {
  const [user, setUser] = useState<any>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Mode, 2: Info, 3: Content, 4: Launch
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1 State: Teaching Mode Selection
  const [teachingMode, setTeachingMode] = useState<"AI" | "Human" | null>(null)

  // Study Buddy / I'll Teach Explainer States
  const [showExplainer, setShowExplainer] = useState(false)
  const [studyFile, setStudyFile] = useState<File | null>(null)
  const [isStudyParsing, setIsStudyParsing] = useState(false)
  const [studyParsingStep, setStudyParsingStep] = useState("")
  const [studyExplanation, setStudyExplanation] = useState<any>(null)
  const [studyFullText, setStudyFullText] = useState("")
  const [studyQuery, setStudyQuery] = useState("")
  const [studyChatHistory, setStudyChatHistory] = useState<Array<{ sender: string; text: string; isAI: boolean }>>([])
  const [isStudyAnswering, setIsStudyAnswering] = useState(false)
  const [userRole, setUserRole] = useState<string>("teacher")
  const [mounted, setMounted] = useState(false)

  const studyChatEndRef = useRef<HTMLDivElement>(null)

  // Step 2 State: Session Info
  const [sessionTitle, setSessionTitle] = useState("")
  const [subject, setSubject] = useState("Mathematics")
  const [gradeLevel, setGradeLevel] = useState("High School")
  const [duration, setDuration] = useState("60 min")
  const [customDuration, setCustomDuration] = useState("")
  const [sessionType, setSessionType] = useState<"Public" | "Private">("Public")

  // Step 3 State: Content Configuration (AI Mode)
  const [aiTab, setAiTab] = useState<"upload" | "topics">("upload")
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; pages: number } | null>(null)
  const [aiInstructions, setAiInstructions] = useState("")

  // Step 3 State: Content Configuration (Human Mode)
  const [referenceMaterial, setReferenceMaterial] = useState<{ name: string; size: string } | null>(null)
  const [aiAssistants, setAiAssistants] = useState({
    generateVisuals: true,
    doubtChat: true,
    suggestVideos: true,
    sessionNotes: true,
    postSummary: true,
  })

  // Shared Step 3 State: Topics List
  const [topics, setTopics] = useState<string[]>([""])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Step 4 State: Launch Info
  const [sessionCode, setSessionCode] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [scheduleLater, setScheduleLater] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")

  // Load current auth state
  useEffect(() => {
    setMounted(true)
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser)
    })

    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") || "teacher"
      setUserRole(role)
      if (role === "student") {
        setTeachingMode("Human")
        setShowExplainer(true)
      }
    }

    return () => unsubscribe()
  }, [])

  // Auto scroll chat
  useEffect(() => {
    studyChatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [studyChatHistory])

  // Generate a random session code when navigating to step 4
  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789" // Exclude confusing chars like I, O, 1, 0
    let code = "CLASS-"
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Handle real file upload for standard session creation (AI Teacher reference materials)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "ai" | "human") => {
    const file = e.target.files?.[0]
    if (!file) return

    // Save to IndexedDB
    try {
      await saveFile("session-pdf", file)
    } catch (err) {
      console.error("Failed to save file to IndexedDB:", err)
      alert("Failed to read file. Please try again.")
      return
    }

    const sizeStr = (file.size / 1024 / 1024).toFixed(1) + " MB"
    if (type === "ai") {
      setUploadedFile({
        name: file.name,
        size: sizeStr,
        pages: 0, // We'll parse pages in the live classroom
      })
    } else {
      setReferenceMaterial({
        name: file.name,
        size: sizeStr,
      })
    }
  }

  // Study Buddy upload and parse
  const handleStudyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setStudyFile(uploadedFile)
    setIsStudyParsing(true)
    setStudyExplanation(null)
    setStudyChatHistory([])
    setStudyFullText("")

    try {
      let text = ""
      const sizeStr = (uploadedFile.size / 1024).toFixed(1) + " KB"

      if (uploadedFile.type === "application/pdf" || uploadedFile.name.endsWith(".pdf")) {
        setStudyParsingStep("Reading PDF pages...")
        const pages = await extractPDFPages(uploadedFile)
        text = pages.join("\n")
      } else if (
        uploadedFile.type === "text/plain" ||
        uploadedFile.name.endsWith(".txt") ||
        uploadedFile.name.endsWith(".md")
      ) {
        setStudyParsingStep("Reading text content...")
        text = await uploadedFile.text()
      } else {
        setStudyParsingStep("Indexing document slides/paragraphs...")
        await new Promise((r) => setTimeout(r, 1500))
        text = `Document Metadata:
Name: ${uploadedFile.name}
Size: ${sizeStr}
Type: ${uploadedFile.type || "Office Document"}
Context: This is a textbook chapter or slide deck regarding the topic "${uploadedFile.name.replace(/\.[^/.]+$/, "")}".`
      }

      setStudyParsingStep("Analyzing concepts with AI...")
      setStudyFullText(text)

      // Send to Groq API
      const prompt = `Please analyze this study material:
---
${text.slice(0, 5000)}
---
Generate a structured JSON response with exactly three fields (no markdown or additional text outside the JSON):
{
  "summary": "A concise 1-sentence description of what this document covers.",
  "keyConcepts": [
    {
      "concept": "Concept 1 Name (2-4 words)",
      "description": "Short explanation of the concept",
      "imageKeyword": "one highly relevant search keyword for Pexels to show a visual image of this concept"
    },
    {
      "concept": "Concept 2 Name (2-4 words)",
      "description": "Short explanation of the concept",
      "imageKeyword": "one highly relevant search keyword for Pexels to show a visual image of this concept"
    },
    {
      "concept": "Concept 3 Name (2-4 words)",
      "description": "Short explanation of the concept",
      "imageKeyword": "one highly relevant search keyword for Pexels to show a visual image of this concept"
    }
  ],
  "details": "A detailed, clean, shortcut explanation (2-3 paragraphs) structured in a way that helps the student learn the material in a fast, efficient way."
}

Do NOT wrap the JSON in markdown code blocks. Just return the raw JSON object.`

      const system = "You are an expert AI Study Buddy. Explain slide decks, notes, and study guides in a short, clean, structured, and easy-to-understand layout."

      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system }),
      })

      if (!response.ok) throw new Error("AI analysis failed")
      const data = await response.json()

      let result: any
      try {
        const cleaned = data.text.replace(/```json/g, "").replace(/```/g, "").trim()
        result = JSON.parse(cleaned)
      } catch (err) {
        result = {
          summary: `Study guide for ${uploadedFile.name}`,
          keyConcepts: [
            { concept: "Important Concept", description: data.text.slice(0, 150), imageKeyword: "education" }
          ],
          details: data.text,
        }
      }

      // Normalize keyConcepts structure and attach visuals
      if (result && Array.isArray(result.keyConcepts)) {
        const normalized = result.keyConcepts.map((item: any) => {
          if (typeof item === "string") {
            const parts = item.split(":");
            return {
              concept: parts[0]?.trim() || "Concept",
              description: parts.slice(1).join(":")?.trim() || item,
              imageKeyword: parts[0]?.trim() || "study",
            }
          }
          return {
            concept: item.concept || item.title || "Concept",
            description: item.description || item.explanation || "Details",
            imageKeyword: item.imageKeyword || item.keyword || item.concept || "study",
          }
        })

        setStudyParsingStep("Fetching visual images...")

        const SUBJECT_MOCK_IMAGES: Record<string, string> = {
          science: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400",
          math: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400",
          biology: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=400",
          cell: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=400",
          chemistry: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=400",
          atom: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=400",
          physics: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400",
          history: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400",
          computer: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
          coding: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
          programming: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
          language: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400",
          english: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400",
          geography: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400",
          earth: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400",
          globe: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400",
          space: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",
          galaxy: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",
          books: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400",
          study: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400",
          education: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400",
        }

        const conceptsWithImages = await Promise.all(
          normalized.map(async (item: any) => {
            const keyword = item.imageKeyword || "study"
            let imageUrl = ""
            try {
              const res = await fetch(`/api/pexels?query=${encodeURIComponent(keyword)}`)
              if (res.ok) {
                const data = await res.json()
                imageUrl = data.imageUrl
              }
            } catch (e) {
              console.warn("Pexels fetch failed:", e)
            }

            if (!imageUrl) {
              const lower = keyword.toLowerCase()
              const matchedKey = Object.keys(SUBJECT_MOCK_IMAGES).find(k => lower.includes(k))
              imageUrl = matchedKey ? SUBJECT_MOCK_IMAGES[matchedKey] : "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400"
            }

            return {
              ...item,
              imageUrl,
            }
          })
        )

        result.keyConcepts = conceptsWithImages
      }

      setStudyExplanation(result)
      setStudyChatHistory([
        {
          sender: "AI Study Buddy",
          text: `Hi! I've finished analyzing "${uploadedFile.name}". I've created a clean summary and bulleted the core concepts on the left. Feel free to ask me any doubts or questions about this material here!`,
          isAI: true,
        },
      ])
    } catch (err) {
      console.error(err)
      alert("Failed to analyze the document. Please ensure your Groq API key is set or try a simple text/PDF file.")
      setStudyFile(null)
    } finally {
      setIsStudyParsing(false)
      setStudyParsingStep("")
    }
  }

  // Answer queries about study doc
  const handleAskStudyDoubt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studyQuery.trim() || isStudyAnswering || !studyFile) return

    const userQuestion = studyQuery.trim()
    setStudyQuery("")
    setStudyChatHistory((prev) => [...prev, { sender: "You", text: userQuestion, isAI: false }])
    setIsStudyAnswering(true)

    try {
      const prompt = `The student is studying the document "${studyFile.name}".
Document content (extracted):
---
${studyFullText.slice(0, 3000)}
---
The student has the following doubt: "${userQuestion}"

Provide a clean, proper, and structured explanation answering their question. Limit response to 3-4 clear sentences.`

      const system = "You are a helpful AI Study Tutor. Answer doubts about the uploaded study notes concisely, clearly, and supportively."

      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system }),
      })

      if (!response.ok) throw new Error("Failed to get answer")
      const data = await response.json()

      setStudyChatHistory((prev) => [...prev, { sender: "AI Study Buddy", text: data.text, isAI: true }])
    } catch (err) {
      console.error(err)
      setStudyChatHistory((prev) => [
        ...prev,
        { sender: "AI Study Buddy", text: "Sorry, I ran into an error generating that explanation. Please try again.", isAI: true },
      ])
    } finally {
      setIsStudyAnswering(false)
    }
  }

  const handleResetStudy = () => {
    setStudyFile(null)
    setStudyExplanation(null)
    setStudyChatHistory([])
    setStudyFullText("")
  }

  const handleStep1Submit = () => {
    if (!teachingMode) return
    if (teachingMode === "Human") {
      setShowExplainer(true)
    } else {
      setStep(2)
    }
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionTitle.trim()) return
    setStep(3)
  }

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up empty topics if we are using the topic list
    if (teachingMode === "Human" || (teachingMode === "AI" && aiTab === "topics")) {
      const cleanedTopics = topics.filter(t => t.trim() !== "")
      setTopics(cleanedTopics)
    }

    // Generate session code
    setSessionCode(generateCode())
    setStep(4)
  }

  const handleLaunch = async () => {
    if (!user) {
      alert("You must be logged in to create a session.")
      return
    }
    setIsSubmitting(true)
    try {
      const activeDuration = duration === "Custom" ? `${customDuration} min` : duration
      
      const extraSettings: any = {}
      if (teachingMode) extraSettings.teachingMode = teachingMode
      if (teachingMode === "AI" && aiInstructions) extraSettings.aiInstructions = aiInstructions
      if (teachingMode === "Human") extraSettings.aiAssistants = aiAssistants
      if (teachingMode === "AI" && aiTab === "upload" && uploadedFile) {
        extraSettings.uploadedFile = uploadedFile
      } else {
        try { await clearFiles() } catch { /* ignore */ }
      }
      if (teachingMode === "Human" && referenceMaterial) extraSettings.referenceMaterial = referenceMaterial

      const createPromise = createSession(
        user.uid,
        sessionTitle,
        subject,
        gradeLevel,
        activeDuration,
        sessionType,
        (teachingMode === "Human" || aiTab === "topics") ? topics.filter((t) => t.trim() !== "") : [],
        sessionCode,
        scheduleLater ? scheduledDate : undefined,
        extraSettings
      )

      await Promise.race([
        createPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database connection timed out. Please check your internet connection, ensure that the Firebase credentials in .env.local are correct, and that your Firestore Database is enabled in the Firebase console.")), 8000)
        )
      ])
      
      window.location.href = `/session/${sessionCode}`
    } catch (err: any) {
      console.warn("Session creation failed:", err)
      alert("Failed to create session: " + err.message)
      setIsSubmitting(false)
    }
  }

  // Topic list helper functions
  const addTopicField = () => {
    if (topics.length >= 10) return
    setTopics([...topics, ""])
  }

  const handleTopicChange = (index: number, val: string) => {
    const newTopics = [...topics]
    newTopics[index] = val
    setTopics(newTopics)
  }

  const removeTopicField = (index: number) => {
    if (topics.length <= 1) return
    const newTopics = topics.filter((_, i) => i !== index)
    setTopics(newTopics)
  }

  const handleSuggestionClick = (suggestion: string) => {
    const lastIdx = topics.length - 1
    if (topics[lastIdx]?.trim() === "") {
      const newTopics = [...topics]
      newTopics[lastIdx] = suggestion
      setTopics(newTopics)
    } else if (topics.length < 10) {
      setTopics([...topics, suggestion])
    }
  }

  // HTML5 Drag and Drop Reordering Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const newTopics = [...topics]
    const draggedItem = newTopics[draggedIndex]
    
    newTopics.splice(draggedIndex, 1)
    newTopics.splice(targetIndex, 0, draggedItem)
    
    setDraggedIndex(targetIndex)
    setTopics(newTopics)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code", err)
    }
  }

  const getShareLink = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth?code=${sessionCode}`
    }
    return `https://classai.app/auth?code=${sessionCode}`
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink())
      alert("Join link copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy link", err)
    }
  }

  const toggleAssistantCheckbox = (key: keyof typeof aiAssistants) => {
    setAiAssistants({
      ...aiAssistants,
      [key]: !aiAssistants[key],
    })
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white flex font-sans antialiased">
      <DashboardSidebar
        activeItem="Dashboard"
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        
        {/* Header Topbar */}
        <header className="h-16 border-b border-[#1a1a1a] bg-[#111111]/80 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 lg:hidden text-white/80 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-1 rounded-lg hover:bg-[#1a1a1a] text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Link>
              <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
                Create New Session
              </h1>
            </div>
          </div>
        </header>

        {/* Form Container */}
        <main className="flex-1 p-6 md:p-8 flex justify-center items-start lg:items-center bg-[#111111]">
          <div className={`w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 md:p-8 space-y-8 shadow-xl shadow-black/10 transition-all duration-300 ${
            (showExplainer && studyExplanation) ? "max-w-[1200px]" : "max-w-[700px]"
          }`}>
            
            {/* Header & Subtitle */}
            {!showExplainer ? (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Create New Session</h2>
                  <p className="text-xs md:text-sm text-white/40">Set up your AI-powered class in seconds</p>
                </div>

                {/* Step Indicator (Mode -> Info -> Content -> Launch) */}
                <div className="relative flex items-center justify-between max-w-md mx-auto py-2">
                  {/* Connector Lines */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                  <div
                    className="absolute left-0 top-1/2 h-0.5 bg-purple-500 -translate-y-1/2 transition-all duration-300 z-0"
                    style={{ width: step === 1 ? "0%" : step === 2 ? "33%" : step === 3 ? "66%" : "100%" }}
                  />

                  {/* Step 1: Mode */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                        step >= 1
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/30"
                          : "bg-[#111111] border-white/10 text-white/40"
                      }`}
                    >
                      1
                    </div>
                    <span className={`text-[10px] md:text-xs font-semibold ${step >= 1 ? "text-purple-400" : "text-white/40"}`}>
                      Mode
                    </span>
                  </div>

                  {/* Step 2: Info */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                        step >= 2
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/30"
                          : "bg-[#111111] border-white/10 text-white/40"
                      }`}
                    >
                      2
                    </div>
                    <span className={`text-[10px] md:text-xs font-semibold ${step >= 2 ? "text-purple-400" : "text-white/40"}`}>
                      Session Info
                    </span>
                  </div>

                  {/* Step 3: Content */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                        step >= 3
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/30"
                          : "bg-[#111111] border-white/10 text-white/40"
                      }`}
                    >
                      3
                    </div>
                    <span className={`text-[10px] md:text-xs font-semibold ${step >= 3 ? "text-purple-400" : "text-white/40"}`}>
                      Content
                    </span>
                  </div>

                  {/* Step 4: Launch */}
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                        step >= 4
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/30"
                          : "bg-[#111111] border-white/10 text-white/40"
                      }`}
                    >
                      4
                    </div>
                    <span className={`text-[10px] md:text-xs font-semibold ${step >= 4 ? "text-purple-400" : "text-white/40"}`}>
                      Launch
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-2 relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowExplainer(false)
                    setTeachingMode(null)
                    handleResetStudy()
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border border-white/10 bg-[#161618] hover:bg-white/5 text-xs text-white/60 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <h2 className="text-2xl font-bold text-white tracking-tight">I'll Teach (Instant Explainer)</h2>
                <p className="text-xs md:text-sm text-white/40">Upload files to get an instant explanation and resolve doubts</p>
              </div>
            )}

            {/* STUDY BUDDY / INSTANT EXPLAINER INTERFACE */}
            {showExplainer && (
              <div className="space-y-6 animate-fadeIn">
                {/* ─── CASE 1: INITIAL STATE (UPLOAD BOX) ─── */}
                {!studyFile && !isStudyParsing && (
                  <div className="flex flex-col justify-center items-center py-12">
                    <label className="w-full max-w-lg border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 bg-[#161618] hover:bg-purple-500/[0.01] rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 group relative shadow-2xl">
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,.docx,.pptx,.ppt"
                        className="hidden"
                        onChange={handleStudyFileUpload}
                      />
                      <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/5">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5 mt-2">
                        <span className="text-sm font-bold text-white block group-hover:text-purple-300 transition-colors">
                          Upload Slides, PPTs, PDFs, or Text notes
                        </span>
                        <span className="text-xs text-white/30 block">
                          Drag and drop file here, or click to browse
                        </span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-white/20 font-semibold uppercase tracking-wider mt-4">
                        <span>PDF</span>•<span>PPTX</span>•<span>DOCX</span>•<span>TXT</span>
                      </div>
                    </label>
                  </div>
                )}

                {/* ─── CASE 2: PARSING STATE ─── */}
                {isStudyParsing && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                      <Brain className="h-5 w-5 text-purple-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-bold text-white">Analyzing file...</h3>
                      <p className="text-xs text-purple-400/80 font-mono">{studyParsingStep}</p>
                    </div>
                  </div>
                )}

                {/* ─── CASE 3: EXPLANATION RENDERED (SPLIT SCREEN) ─── */}
                {mounted && studyExplanation && (
                  <div className="grid gap-6 lg:grid-cols-12 items-stretch min-h-0">
                    
                    {/* LEFT: Core Explanation panel (7/12 cols) */}
                    <section className="lg:col-span-7 bg-[#111111] border border-white/5 rounded-3xl p-6 flex flex-col space-y-6 overflow-y-auto max-h-[500px] cscroll shadow-xl">
                      
                      {/* Header Badge */}
                      <div className="flex items-center gap-3 border-b border-white/5 pb-5">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-sm font-bold text-white truncate max-w-md">{studyFile?.name}</h3>
                          <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-0.5">
                            {studyFile && studyFile.size > 1024 * 1024 
                              ? `${(studyFile.size / 1024 / 1024).toFixed(1)} MB` 
                              : `${((studyFile?.size || 0) / 1024).toFixed(1)} KB`
                            }
                          </p>
                        </div>
                      </div>

                      {/* 1. Overview */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Overview Summary
                        </span>
                        <p className="text-sm text-white/90 leading-relaxed font-semibold italic border-l-2 border-purple-500/40 pl-3">
                          &ldquo;{studyExplanation.summary}&rdquo;
                        </p>
                      </div>

                      {/* 2. Key Concepts */}
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Key Concepts
                        </span>
                        <ul className="grid gap-4">
                          {studyExplanation.keyConcepts?.map((concept: any, i: number) => (
                            <li key={i} className="flex flex-col md:flex-row gap-4 items-start text-xs text-white/70 leading-relaxed bg-[#1a1a1c] border border-white/[0.02] p-4 rounded-xl shadow-sm">
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="h-5 w-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400 flex-shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="font-bold text-white text-sm">{concept.concept}</span>
                                </div>
                                <p className="text-white/70 text-xs leading-relaxed">{concept.description}</p>
                              </div>
                              {concept.imageUrl && (
                                <div className="w-full md:w-32 h-20 rounded-lg overflow-hidden border border-white/5 relative flex-shrink-0 group">
                                  <img
                                    src={concept.imageUrl}
                                    alt={concept.concept}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 3. Detailed Shortcut Explanations */}
                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                          <Brain className="h-3.5 w-3.5" />
                          Shortcut Lecture Explanation
                        </span>
                        <div className="text-xs text-white/70 leading-relaxed space-y-4 font-normal">
                          {studyExplanation.details?.split("\n\n").map((para: string, i: number) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      </div>

                    </section>

                    {/* RIGHT: Chat QA (5/12 cols) */}
                    <section className="lg:col-span-5 bg-[#111111] border border-white/5 rounded-3xl p-6 flex flex-col overflow-hidden max-h-[500px] shadow-xl">
                      
                      {/* Chat Header */}
                      <div className="border-b border-white/5 pb-4 flex items-center justify-between flex-shrink-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-purple-400" />
                          Doubt Chat
                        </h4>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping" />
                          <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Document AI Active</span>
                        </span>
                      </div>

                      {/* Messages Feed */}
                      <div className="flex-1 overflow-y-auto cscroll py-4 space-y-3 pr-1 min-h-0">
                        {studyChatHistory.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex flex-col gap-0.5 max-w-[85%] animate-fadeIn ${
                              msg.isAI ? "self-start items-start" : "self-end items-end ml-auto"
                            }`}
                          >
                            <span className="text-[9px] text-white/20 font-semibold">{msg.sender}</span>
                            <div
                              className={`text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed shadow-sm ${
                                msg.isAI
                                  ? "bg-[#1a1a1c] border border-white/[0.03] text-white/80 rounded-tl-none flex gap-2 items-start"
                                  : "bg-purple-600 text-white rounded-tr-none"
                              }`}
                            >
                              {msg.isAI && <Brain className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />}
                              <span>{msg.text}</span>
                            </div>
                          </div>
                        ))}
                        <div ref={studyChatEndRef} />
                      </div>

                      {/* Input Query Bar */}
                      <form onSubmit={handleAskStudyDoubt} className="pt-4 border-t border-white/5 flex gap-2.5 flex-shrink-0">
                        <input
                          type="text"
                          required
                          value={studyQuery}
                          onChange={(e) => setStudyQuery(e.target.value)}
                          placeholder={isStudyAnswering ? "Buddy is generating answer..." : "Ask doubt about notes..."}
                          disabled={isStudyAnswering}
                          className="flex-1 px-4 py-3 bg-[#1a1a1c] border border-white/8 rounded-xl text-xs focus:outline-none focus:border-purple-500/40 text-white placeholder:text-white/20 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={isStudyAnswering}
                          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isStudyAnswering ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </form>

                    </section>

                  </div>
                )}
                {studyFile && (
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={handleResetStudy}
                      className="px-4 py-2 rounded-xl border border-white/10 bg-[#161618] text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Upload New File
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: TEACHING MODE SELECTOR */}
            {!showExplainer && step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Select Teaching Mode
                  </label>
                  <p className="text-[10px] text-white/30">Choose how the lecture will be delivered</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Card 1: AI Teacher */}
                  <div
                    onClick={() => setTeachingMode("AI")}
                    className={`group relative overflow-hidden rounded-2xl bg-[#111111] border p-6 cursor-pointer transition-all flex flex-col gap-4 hover:border-purple-500/50 ${
                      teachingMode === "AI"
                        ? "border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] bg-purple-500/[0.02]"
                        : "border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">AI Teacher</h3>
                        <p className="text-[10px] text-white/40">Automated AI lecturing</p>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-white/70 mt-2">
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> AI speaks & teaches automatically
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> Upload PPT/PDF or add topics
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> Generates visuals & plays videos
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> Answers student doubts instantly
                      </li>
                    </ul>
                  </div>

                  {/* Card 2: I'll Teach (Instant Explainer) */}
                  <div
                    onClick={() => {
                      if (userRole === "teacher") return;
                      setTeachingMode("Human");
                    }}
                    className={`group relative overflow-hidden rounded-2xl bg-[#111111] border p-6 transition-all flex flex-col gap-4 ${
                      userRole === "teacher"
                        ? "opacity-35 border-white/5 cursor-not-allowed"
                        : "cursor-pointer hover:border-purple-500/50"
                    } ${
                      teachingMode === "Human"
                        ? "border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] bg-purple-500/[0.02]"
                        : "border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">I'll Teach (Instant Explainer)</h3>
                          {userRole === "teacher" && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40">Upload & explain study materials</p>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-white/70 mt-2">
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> Upload notes, slides, PDFs, PPTs
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> AI summarizes & extracts concepts
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> Quick shortcut explanations generated
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">✓</span> Live doubt chat based on the document
                      </li>
                    </ul>
                  </div>
                </div>

                {teachingMode && (
                  <button
                    onClick={handleStep1Submit}
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm text-white shadow-md shadow-purple-600/20 hover:shadow-purple-600/30 transition-all cursor-pointer animate-slideUp"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* STEP 2: SESSION INFO */}
            {!showExplainer && step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-6 animate-fadeIn">
                {/* Title */}
                <div className="space-y-2">
                  <label htmlFor="session-title" className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Session Title
                  </label>
                  <input
                    id="session-title"
                    type="text"
                    required
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="e.g. Introduction to Physics"
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-white placeholder-white/20"
                  />
                </div>

                {/* Grid for Dropdowns */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Subject */}
                  <div className="space-y-2">
                    <label htmlFor="subject-select" className="text-xs font-bold uppercase tracking-wider text-white/60">
                      Subject
                    </label>
                    <div className="relative">
                      <select
                        id="subject-select"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-all text-white appearance-none cursor-pointer"
                      >
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub} className="bg-[#1a1a1a]">
                            {sub}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Grade Level */}
                  <div className="space-y-2">
                    <label htmlFor="grade-select" className="text-xs font-bold uppercase tracking-wider text-white/60">
                      Grade Level
                    </label>
                    <div className="relative">
                      <select
                        id="grade-select"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-all text-white appearance-none cursor-pointer"
                      >
                        {GRADE_LEVELS.map((grade) => (
                          <option key={grade} value={grade} className="bg-[#1a1a1a]">
                            {grade}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">
                    Estimated Duration
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["30 min", "60 min", "90 min", "Custom"].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDuration(dur)}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          duration === dur
                            ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/10"
                            : "bg-[#111111] border-white/5 text-white/60 hover:border-white/10"
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>

                  {duration === "Custom" && (
                    <div className="flex items-center gap-2.5 mt-2 animate-slideDown">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        required
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        placeholder="Enter duration"
                        className="w-32 px-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
                      />
                      <span className="text-xs text-white/50 font-medium">minutes</span>
                    </div>
                  )}
                </div>

                {/* Session Type */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">
                    Session Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setSessionType("Public")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                        sessionType === "Public"
                          ? "bg-purple-600/5 border-purple-500"
                          : "bg-[#111111] border-white/5 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">Public</span>
                      <span className="text-[10px] text-white/40 leading-tight">
                        Anyone with the room code can join and participate
                      </span>
                    </div>

                    <div
                      onClick={() => setSessionType("Private")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                        sessionType === "Private"
                          ? "bg-purple-600/5 border-purple-500"
                          : "bg-[#111111] border-white/5 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">Private</span>
                      <span className="text-[10px] text-white/40 leading-tight">
                        Only invited students or verified emails can enter
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-4 pt-4">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm text-white shadow-md shadow-purple-600/20 hover:shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-center text-xs font-semibold text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    Back to Teaching Mode
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: CONTENT / TOPICS CONFIGURATION */}
            {!showExplainer && step === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-6 animate-fadeIn">
                
                {/* ─── BRANCH: AI TEACHER ─── */}
                {teachingMode === "AI" && (
                  <div className="space-y-6">
                    {/* Sub-Tabs */}
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#111111] border border-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setAiTab("upload")}
                        className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                          aiTab === "upload"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        Upload PPT/PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiTab("topics")}
                        className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                          aiTab === "topics"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        Add Topics
                      </button>
                    </div>

                    {/* AI Tab 1: Upload */}
                    {aiTab === "upload" && (
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">
                          Upload Class Presentations or Documents
                        </label>
                        
                        {!uploadedFile ? (
                          <label className="border-2 border-dashed border-white/10 hover:border-purple-500/50 bg-[#111111]/50 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group relative">
                            <input
                              type="file"
                              accept=".pdf,.ppt,.pptx"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, "ai")}
                            />
                            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
                              <Upload className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">Click to upload lecture slides or syllabus</p>
                              <p className="text-[10px] text-white/30 mt-1">Accepts .ppt, .pptx, .pdf (Max 50MB)</p>
                            </div>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl animate-fadeIn">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                                <FileText className="h-4.5 w-4.5" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-semibold text-white truncate">{uploadedFile.name}</p>
                                <p className="text-[9px] text-white/40 font-medium">{uploadedFile.size} • {uploadedFile.pages} pages</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs">
                                ✓
                              </span>
                              <button
                                type="button"
                                onClick={() => setUploadedFile(null)}
                                className="text-white/20 hover:text-red-400 p-1.5 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Optional AI Instructions */}
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                            Optional Instructions for AI
                          </label>
                          <textarea
                            value={aiInstructions}
                            onChange={(e) => setAiInstructions(e.target.value)}
                            placeholder="e.g. Focus on interactive quiz check-ins, explain in simple terms, include real-world applications..."
                            rows={3}
                            className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-all text-white placeholder-white/20 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Tab 2: Topics List */}
                    {aiTab === "topics" && renderTopicsList()}
                  </div>
                )}

                {/* ─── BRANCH: HUMAN TEACHER ─── */}
                {teachingMode === "Human" && (
                  <div className="space-y-6">
                    {/* Standard Topics List */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 block mb-3">
                        Plan lecture outline / topics
                      </label>
                      {renderTopicsList()}
                    </div>

                    {/* Reference Material (Smaller Box) */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">
                        Reference Material (Optional)
                      </label>
                      {!referenceMaterial ? (
                        <label className="border border-dashed border-white/10 hover:border-purple-500/50 bg-[#111111]/30 rounded-xl p-4 text-center cursor-pointer transition-all flex items-center justify-center gap-2 group relative">
                          <input
                            type="file"
                            accept=".pdf,.ppt,.pptx"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, "human")}
                          />
                          <Upload className="h-4 w-4 text-white/30 group-hover:text-purple-400" />
                          <span className="text-xs text-white/40 group-hover:text-white/60 font-semibold">
                            Upload slides/documents for the AI assistant
                          </span>
                        </label>
                      ) : (
                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-xl animate-fadeIn">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-white/80 truncate">{referenceMaterial.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReferenceMaterial(null)}
                            className="text-white/20 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* AI Assistant Checkboxes */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">
                        AI Assistant Features
                      </label>
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Checkbox 1 */}
                        <div
                          onClick={() => toggleAssistantCheckbox("generateVisuals")}
                          className="flex items-center gap-3 p-3 bg-[#111111] border border-white/5 rounded-xl cursor-pointer hover:border-purple-500/30 transition-all"
                        >
                          {aiAssistants.generateVisuals ? (
                            <CheckSquare className="h-4.5 w-4.5 text-purple-400" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-white/20" />
                          )}
                          <span className="text-xs font-semibold text-white/80">Generate visuals while I teach</span>
                        </div>

                        {/* Checkbox 2 */}
                        <div
                          onClick={() => toggleAssistantCheckbox("doubtChat")}
                          className="flex items-center gap-3 p-3 bg-[#111111] border border-white/5 rounded-xl cursor-pointer hover:border-purple-500/30 transition-all"
                        >
                          {aiAssistants.doubtChat ? (
                            <CheckSquare className="h-4.5 w-4.5 text-purple-400" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-white/20" />
                          )}
                          <span className="text-xs font-semibold text-white/80">Handle student doubt chat</span>
                        </div>

                        {/* Checkbox 3 */}
                        <div
                          onClick={() => toggleAssistantCheckbox("suggestVideos")}
                          className="flex items-center gap-3 p-3 bg-[#111111] border border-white/5 rounded-xl cursor-pointer hover:border-purple-500/30 transition-all"
                        >
                          {aiAssistants.suggestVideos ? (
                            <CheckSquare className="h-4.5 w-4.5 text-purple-400" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-white/20" />
                          )}
                          <span className="text-xs font-semibold text-white/80">Suggest YouTube videos</span>
                        </div>

                        {/* Checkbox 4 */}
                        <div
                          onClick={() => toggleAssistantCheckbox("sessionNotes")}
                          className="flex items-center gap-3 p-3 bg-[#111111] border border-white/5 rounded-xl cursor-pointer hover:border-purple-500/30 transition-all"
                        >
                          {aiAssistants.sessionNotes ? (
                            <CheckSquare className="h-4.5 w-4.5 text-purple-400" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-white/20" />
                          )}
                          <span className="text-xs font-semibold text-white/80">Take live session notes</span>
                        </div>

                        {/* Checkbox 5 */}
                        <div
                          onClick={() => toggleAssistantCheckbox("postSummary")}
                          className="flex items-center gap-3 p-3 bg-[#111111] border border-white/5 rounded-xl cursor-pointer hover:border-purple-500/30 transition-all"
                        >
                          {aiAssistants.postSummary ? (
                            <CheckSquare className="h-4.5 w-4.5 text-purple-400" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-white/20" />
                          )}
                          <span className="text-xs font-semibold text-white/80">Post-session summary</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm text-white shadow-md shadow-purple-600/20 hover:shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full text-center text-xs font-semibold text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    Back to Session Info
                  </button>
                </div>

              </form>
            )}

            {/* STEP 4: LAUNCH */}
            {!showExplainer && step === 4 && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Summary Card */}
                <div className="bg-[#111111] border border-white/5 rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{sessionTitle}</h3>
                    <p className="text-[10px] text-white/40 mt-1 font-semibold uppercase tracking-wider">
                      {subject} • {gradeLevel} • {duration === "Custom" ? `${customDuration} min` : duration} • {sessionType}
                    </p>
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1.5">
                      Teaching Mode: {teachingMode === "AI" ? "AI Teacher" : "I'll Teach (Led by human)"}
                    </p>
                  </div>

                  {teachingMode === "AI" && aiTab === "upload" && uploadedFile && (
                    <div className="border-t border-white/5 pt-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                        Uploaded File
                      </span>
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <FileText className="h-4 w-4 text-purple-400" />
                        <span>{uploadedFile.name}</span>
                      </div>
                    </div>
                  )}

                  {((teachingMode === "Human") || (teachingMode === "AI" && aiTab === "topics")) && (
                    <div className="border-t border-white/5 pt-3.5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                        Topics Flow ({topics.length})
                      </span>
                      <ul className="space-y-1.5 text-xs text-white/60">
                        {topics.map((t, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Session Code Panel */}
                <div className="grid gap-6 md:grid-cols-2 items-center">
                  {/* Code */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                      Session Code
                    </span>
                    <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                      <span className="text-xl md:text-2xl font-mono font-bold tracking-widest text-purple-400">
                        {sessionCode}
                      </span>
                      <button
                        onClick={copyToClipboard}
                        className="p-2 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-all cursor-pointer"
                        title="Copy Code"
                      >
                        {isCopied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="space-y-2 flex flex-col items-center md:items-end">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/60 w-full text-center md:text-right">
                      QR Code Access
                    </span>
                    <div className="h-28 w-28 bg-[#111111] border border-white/5 rounded-xl flex flex-col items-center justify-center p-3 relative group">
                      <div className="grid grid-cols-5 gap-1.5 w-full h-full opacity-30 group-hover:opacity-50 transition-opacity">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-sm ${(i % 3 === 0 || i % 7 === 0 || i < 5 || i > 20) ? "bg-purple-400" : "bg-transparent"}`}
                          />
                        ))}
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/60 uppercase tracking-widest pointer-events-none">
                        Scan Code
                      </span>
                    </div>
                  </div>
                </div>

                {/* Share Options */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/40 block">
                    Share Access
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5 text-purple-400" />
                      Copy Invite Link
                    </button>

                    <a
                      href={`https://api.whatsapp.com/send?text=Join%20my%20ClassAI%20session%20using%20code:%20${sessionCode}%20at%20${getShareLink()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-xs font-bold text-white transition-colors"
                    >
                      <span className="text-emerald-400 text-sm font-semibold">WA</span>
                      WhatsApp
                    </a>

                    <a
                      href={`mailto:?subject=ClassAI%20Session%20Code&body=Hello,%20please%20join%20my%20class%20session%20on%20ClassAI.%20Code:%20${sessionCode}%20Link:%20${getShareLink()}`}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-xs font-bold text-white transition-colors"
                    >
                      <span className="text-purple-400 text-sm font-semibold">@</span>
                      Email Invite
                    </a>
                  </div>
                </div>

                {/* Schedule Option Toggle */}
                <div className="pt-2 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">Schedule for Later</span>
                      <p className="text-[10px] text-white/30 mt-0.5">Pick a specific time for the class to start</p>
                    </div>
                    <button
                      onClick={() => setScheduleLater(!scheduleLater)}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                        scheduleLater ? "bg-purple-600" : "bg-white/10"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          scheduleLater ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {scheduleLater && (
                    <div className="flex items-center gap-3 bg-[#111111] p-4 rounded-xl border border-white/5 animate-slideDown">
                      <Calendar className="h-4.5 w-4.5 text-purple-400" />
                      <input
                        type="datetime-local"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="bg-transparent text-xs text-white focus:outline-none cursor-pointer w-full scheme-dark"
                      />
                    </div>
                  )}
                </div>

                {/* Final Launch Actions */}
                <div className="space-y-4 pt-4">
                  <button
                    onClick={handleLaunch}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm text-white shadow-md shadow-purple-600/20 hover:shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Launching..." : !scheduleLater ? "Start Now" : "Confirm Schedule"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full text-center text-xs font-semibold text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    Back to Content
                  </button>
                </div>

              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )

  // Render method for draggable topic list
  function renderTopicsList() {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="space-y-3.5">
          {topics.map((topic, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`flex items-center gap-3 bg-[#111111] border border-white/5 p-3 rounded-xl transition-all ${
                draggedIndex === index
                  ? "opacity-40 border-dashed border-purple-500"
                  : "hover:border-white/10"
              }`}
            >
              <button
                type="button"
                className="text-white/20 hover:text-white/40 cursor-grab active:cursor-grabbing transition-colors"
              >
                <GripVertical className="h-4.5 w-4.5" />
              </button>

              <span className="h-6 w-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>

              <input
                type="text"
                required
                value={topic}
                onChange={(e) => handleTopicChange(index, e.target.value)}
                placeholder={`Topic #${index + 1} description`}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
              />

              {topics.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTopicField(index)}
                  className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {topics.length < 10 && (
          <button
            type="button"
            onClick={addTopicField}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-dashed border-purple-500/30 text-purple-400 hover:text-purple-300 hover:border-purple-500/50 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add another topic
          </button>
        )}

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Suggested Topics
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSuggestionClick(sug)}
                className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-white/[0.02] border border-white/5 text-white/50 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer"
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }
}
