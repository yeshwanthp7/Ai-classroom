"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Calendar,
  Clock,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Plus,
  TrendingUp,
  Search,
  Bell,
  Menu,
  X,
  Sparkles,
  Upload,
  Trash2,
  Brain,
  HelpCircle,
  Send,
  Loader2,
  FileText,
  FileCheck,
  Heart,
  Laptop,
  Bot,
  Zap,
  MousePointerClick,
  ExternalLink,
  ChevronRight,
  Compass
} from "lucide-react"
import { subscribeToAuthChanges, User, isMockMode, signOutUser } from "@/lib/auth-service"
import DashboardSidebar from "@/components/dashboard-sidebar"
import { extractPDFPages } from "@/lib/pdfParser"

// Curated market-leading AI Toolbox directory
const ALTERNATIVE_AI_TOOLS = [
  {
    name: "Antigravity AI",
    category: "Agentic Coding",
    url: "https://deepmind.google/technologies/antigravity",
    description: "Advanced AI coding agent by Google DeepMind.",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-500",
    glow: "shadow-purple-500/10 border-purple-500/20"
  },
  {
    name: "Lovable.dev",
    category: "App Builder",
    url: "https://lovable.dev",
    description: "Build, deploy, and edit full-stack web applications in English.",
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/10 border-pink-500/20"
  },
  {
    name: "v0 by Vercel",
    category: "UI Generation",
    url: "https://v0.dev",
    description: "Generate production-ready React and Tailwind components.",
    icon: Laptop,
    color: "from-neutral-400 to-neutral-200",
    glow: "shadow-neutral-400/10 border-neutral-400/20"
  },
  {
    name: "Bolt.new",
    category: "Web Builder",
    url: "https://bolt.new",
    description: "In-browser stack builder powered by WebContainers.",
    icon: Zap,
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/10 border-amber-500/20"
  },
  {
    name: "Google Gemini",
    category: "AI Reasoning",
    url: "https://gemini.google.com",
    description: "Google's multimodal assistant for deep research and logic.",
    icon: Compass,
    color: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/10 border-blue-500/20"
  },
  {
    name: "Anthropic Claude",
    category: "AI Chat",
    url: "https://claude.ai",
    description: "State-of-the-art coding and language reasoning assistant.",
    icon: Bot,
    color: "from-orange-600 to-red-500",
    glow: "shadow-orange-500/10 border-orange-500/20"
  },
  {
    name: "Cursor IDE",
    category: "Code Editor",
    url: "https://cursor.sh",
    description: "AI-first code editor designed for pair programming.",
    icon: MousePointerClick,
    color: "from-blue-600 to-indigo-600",
    glow: "shadow-blue-500/10 border-blue-500/20"
  },
  {
    name: "Perplexity AI",
    category: "AI Search",
    url: "https://perplexity.ai",
    description: "Conversational search engine with real-time web citations.",
    icon: Search,
    color: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/10 border-emerald-500/20"
  },
  {
    name: "NotebookLM",
    category: "Notebooks",
    url: "https://notebooklm.google.com",
    description: "Document-centric research and summary companion.",
    icon: BookOpen,
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/10 border-violet-500/20"
  },
  {
    name: "WolframAlpha",
    category: "Math & Science",
    url: "https://www.wolframalpha.com",
    description: "Computational math, science, and step-by-step solver.",
    icon: GraduationCap,
    color: "from-red-600 to-rose-600",
    glow: "shadow-red-500/10 border-red-500/20"
  }
]

// Recent sessions mock data
const recentSessions = [

  {
    name: "Introduction to Quantum Mechanics",
    topics: 4,
    students: 34,
    date: "June 22, 2026",
    status: "Completed",
  },
  {
    name: "Web Development Basics: HTML & CSS",
    topics: 2,
    students: 45,
    date: "Live Now",
    status: "Live",
  },
  {
    name: "Artificial Intelligence & Ethics",
    topics: 5,
    students: 28,
    date: "June 20, 2026",
    status: "Completed",
  },
  {
    name: "Linear Algebra: Vector Spaces",
    topics: 3,
    students: 50,
    date: "June 25, 2026",
    status: "Scheduled",
  },
  {
    name: "World History: The French Revolution",
    topics: 4,
    students: 38,
    date: "June 18, 2026",
    status: "Completed",
  },
]

// Upcoming sessions mock data
const upcomingSessions = [
  {
    topic: "Machine Learning Basics",
    dateTime: "June 24, 10:00 AM",
    studentsExpected: 55,
  },
  {
    topic: "Intro to Javascript & Functions",
    dateTime: "June 24, 02:00 PM",
    studentsExpected: 40,
  },
  {
    topic: "Calculus I: Integrals",
    dateTime: "June 26, 09:00 AM",
    studentsExpected: 30,
  },
]

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState("June 23, 2026")
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<string>("teacher")
  const [studentName, setStudentName] = useState<string>("")

  // Study Buddy States for student role
  const [studyFile, setStudyFile] = useState<File | null>(null)
  const [isStudyParsing, setIsStudyParsing] = useState(false)
  const [studyParsingStep, setStudyParsingStep] = useState("")
  const [studyExplanation, setStudyExplanation] = useState<any>(null)
  const [studyFullText, setStudyFullText] = useState("")
  const [studyQuery, setStudyQuery] = useState("")
  const [studyChatHistory, setStudyChatHistory] = useState<Array<{ sender: string; text: string; isAI: boolean }>>([])
  const [isStudyAnswering, setIsStudyAnswering] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  const studyChatEndRef = useRef<HTMLDivElement>(null)

  // Load current auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser)
    })
    
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") || "teacher"
      setUserRole(role)
      const mockName = localStorage.getItem("mock_user_name") || "Student"
      setStudentName(mockName)
    }

    return () => unsubscribe()
  }, [])

  // Format date dynamically on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    setCurrentDate(new Date().toLocaleDateString("en-US", options))
  }, [])

  // Auto scroll chat
  useEffect(() => {
    studyChatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [studyChatHistory])

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

      setStudyParsingStep("Analyzing concepts with AI Study Buddy...")
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
          text: `Hi! I've finished analyzing "${uploadedFile.name}". I've created a clean summary and bulleted the core concepts on the left. Feel free to ask me any specific doubts or questions about this material here!`,
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

  const handleSignOut = async () => {
    try {
      await signOutUser()
    } catch (e) {
      console.error("Signout failed:", e)
    }
    localStorage.removeItem("user_role")
    localStorage.removeItem("mock_user_logged_in")
    localStorage.removeItem("mock_user_email")
    localStorage.removeItem("mock_user_name")
    localStorage.removeItem("studentName")
    localStorage.removeItem("studentId")
    window.location.href = "/auth"
  }

  const teacherName = user?.displayName || "Dr. Sarah Jenkins"

  // ─── STUDENT VIEW ───
  if (mounted && userRole === "student") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans antialiased">
        {/* Header Topbar */}
        <header className="h-16 border-b border-white/5 bg-[#111111]/80 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 border-l-2 border-purple-500/40 pl-3">
              <Image src="/logo.png" alt="Class AI" width={28} height={28} />
              <span className="text-base font-bold tracking-tight text-white">
                Class<span className="text-purple-400">AI</span> <span className="text-xs font-medium text-white/40 ml-1">Study Buddy</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex text-xs font-semibold text-white/50 bg-[#1a1a1a] px-3.5 py-1.5 rounded-lg border border-white/5">
              Welcome, <span className="text-purple-400 ml-1 font-bold">{studentName || "Student"}</span>
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Work Area */}
        <main className="flex-1 p-6 md:p-8 flex flex-col justify-start max-w-7xl w-full mx-auto space-y-6">
          
          {!studyFile && (
            <div className="space-y-1.5 text-center py-6">
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">AI Study Buddy</h2>
              <p className="text-sm text-white/40 max-w-md mx-auto">Upload your slides, notes, or PDFs and get instant shortcut summaries, key concepts with images, and interactive doubt explanations.</p>
            </div>
          )}

          {/* ─── CASE 1: INITIAL STATE (AI TOOLS DIRECTORY + UPLOAD BOX) ─── */}
          {!studyFile && !isStudyParsing && (
            <div className="grid gap-8 lg:grid-cols-12 items-stretch py-4">
              
              {/* Left Column: AI Directory (5/12 cols) */}
              <section className="lg:col-span-5 bg-[#111112] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col space-y-6 shadow-xl">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-purple-400 animate-pulse" />
                    AI Toolbox Directory
                  </h3>
                  <p className="text-xs text-white/40">Select a tool to build web apps, solve math problems, or use general chat assistants.</p>
                </div>
                
                <div className="overflow-y-auto max-h-[480px] pr-1 space-y-3 cscroll">
                  {ALTERNATIVE_AI_TOOLS.map((tool, idx) => {
                    const ToolIcon = tool.icon;
                    return (
                      <a
                        key={idx}
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex items-start gap-4 p-4 rounded-2xl bg-[#161618] border border-white/5 hover:border-white/10 hover:${tool.glow} shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer`}
                      >
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tool.color} p-[1px] flex-shrink-0`}>
                          <div className="w-full h-full rounded-xl bg-[#161618] flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                            <ToolIcon className="h-4.5 w-4.5" />
                          </div>
                        </div>
                        <div className="flex-grow space-y-0.5 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                              {tool.name}
                              <ExternalLink className="h-3 w-3 text-white/20 group-hover:text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/10">
                              {tool.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 leading-relaxed truncate group-hover:text-white/60 transition-colors">
                            {tool.description}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
              
              {/* Right Column: Uploader Box (7/12 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-center items-center">
                <label className="w-full h-full min-h-[400px] border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 bg-[#111112] hover:bg-purple-500/[0.01] rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-5 group relative shadow-2xl">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.docx,.pptx,.ppt"
                    className="hidden"
                    onChange={handleStudyFileUpload}
                  />
                  <div className="h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/5">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div className="space-y-2 mt-2">
                    <span className="text-base font-bold text-white block group-hover:text-purple-300 transition-colors">
                      Upload Slides, PPTs, PDFs, or Text notes
                    </span>
                    <span className="text-xs text-white/30 block max-w-sm mx-auto">
                      Drag and drop your study file here, or click to browse files
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-white/20 font-semibold uppercase tracking-wider mt-4">
                    <span>PDF</span>•<span>PPTX</span>•<span>DOCX</span>•<span>TXT</span>
                  </div>
                </label>
              </div>

            </div>
          )}

          {/* ─── CASE 2: PARSING STATE ─── */}
          {isStudyParsing && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
                <Brain className="h-6 w-6 text-purple-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-white">Analyzing file...</h3>
                <p className="text-xs text-purple-400/80 font-mono">{studyParsingStep}</p>
              </div>
            </div>
          )}

          {/* ─── CASE 3: EXPLANATION RENDERED (SPLIT SCREEN) ─── */}
          {mounted && studyExplanation && (
            <div className="flex-grow grid gap-6 lg:grid-cols-12 items-stretch min-h-[calc(100vh-14rem)] relative">
              
              {/* Floating Slide-out AI Directory Drawer */}
              {isDrawerOpen && (
                <div className="fixed inset-y-0 left-0 w-80 bg-[#111112] border-r border-white/5 z-40 p-6 flex flex-col space-y-6 shadow-2xl animate-slideRight">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                      AI Toolbox
                    </h3>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1 rounded-lg border border-white/10 hover:bg-white/5 text-white/60 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 cscroll">
                    {ALTERNATIVE_AI_TOOLS.map((tool, idx) => {
                      const ToolIcon = tool.icon;
                      return (
                        <a
                          key={idx}
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group relative flex items-start gap-3 p-3.5 rounded-xl bg-[#161618] border border-white/5 hover:border-white/10 hover:${tool.glow} shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer`}
                        >
                          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${tool.color} p-[1px] flex-shrink-0`}>
                            <div className="w-full h-full rounded-lg bg-[#161618] flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                              <ToolIcon className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <div className="flex-grow space-y-0.5 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1">
                                {tool.name}
                                <ExternalLink className="h-2.5 w-2.5 text-white/20 group-hover:text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed truncate group-hover:text-white/60 transition-colors font-medium">
                              {tool.category} • {tool.description}
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Floating Tab Button to open Drawer */}
              {!isDrawerOpen && (
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="fixed left-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white rounded-r-2xl py-3 px-2.5 z-30 shadow-lg border border-purple-500/20 flex flex-col items-center gap-1.5 transition-all duration-300 hover:pr-3.5 cursor-pointer group"
                >
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest writing-mode-vertical py-1">Tools</span>
                  <ChevronRight className="h-3.5 w-3.5 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* LEFT: Core Explanation panel (7/12 cols) */}
              <section className="lg:col-span-7 bg-[#111112] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto max-h-[calc(100vh-15rem)] cscroll shadow-xl">
                
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-white/5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-white truncate max-w-[280px] md:max-w-md">{studyFile?.name}</h3>
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-0.5">
                        {studyFile && studyFile.size > 1024 * 1024 
                          ? `${(studyFile.size / 1024 / 1024).toFixed(1)} MB` 
                          : `${((studyFile?.size || 0) / 1024).toFixed(1)} KB`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleResetStudy}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[10px] font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Upload New
                  </button>
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
                    Key Concepts (Visualized)
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
                          <div className="w-full md:w-36 h-24 rounded-lg overflow-hidden border border-white/5 relative flex-shrink-0 group">
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
              <section className="lg:col-span-5 bg-[#111112] border border-white/5 rounded-3xl p-6 flex flex-col overflow-hidden max-h-[calc(100vh-15rem)] shadow-xl">
                
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
                      className={`flex flex-col gap-0.5 max-w-[85%] ${
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

        </main>
      </div>
    )
  }

  // ─── TEACHER VIEW ───
  return (
    <div className="min-h-screen bg-[#111111] text-white flex font-sans antialiased">
      <DashboardSidebar
        activeItem="Dashboard"
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        
        {/* Header Topbar */}
        <header className="h-16 border-b border-[#1a1a1a] bg-[#111111]/80 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile view */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 lg:hidden text-white/80 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
              Good morning, <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">{teacherName}</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex text-xs font-semibold text-white/50 bg-[#1a1a1a] px-3.5 py-1.5 rounded-lg border border-white/5">
              {currentDate}
            </span>
            <Link href="/dashboard/create-session" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-purple-500/20 hover:brightness-110 cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              New Session
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
          {/* Demo Mode Alert Banner */}
          {mounted && isMockMode() && (
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-purple-200">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold text-white">Demo Mode Active:</span> Running local mock database. All sessions are saved in your browser.
                </div>
              </div>
              <div className="text-xs text-purple-400 font-semibold">
                To run live, set up real credentials in .env.local
              </div>
            </div>
          )}
          
          {/* Stats Row */}
          <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            
            {/* Card 1: Total Sessions */}
            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 border-l-4 border-l-purple-500 p-5 shadow-sm">
              <div className="flex items-center justify-between text-white/40 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Total Sessions</span>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Video className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">24</h3>
              <span className="text-[10px] text-white/30 font-medium">All active & finished</span>
            </div>

            {/* Card 2: Students Taught */}
            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 border-l-4 border-l-purple-500 p-5 shadow-sm">
              <div className="flex items-center justify-between text-white/40 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Students Taught</span>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">847</h3>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +12% this month
              </span>
            </div>

            {/* Card 3: Hours of Teaching */}
            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 border-l-4 border-l-purple-500 p-5 shadow-sm">
              <div className="flex items-center justify-between text-white/40 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Hours of Teaching</span>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">36</h3>
              <span className="text-[10px] text-white/30 font-medium">Total live duration</span>
            </div>

            {/* Card 4: Avg Engagement */}
            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 border-l-4 border-l-purple-500 p-5 shadow-sm">
              <div className="flex items-center justify-between text-white/40 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Avg Engagement</span>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">94%</h3>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +4% above district avg
              </span>
            </div>
          </section>

          {/* Columns Split */}
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Left Columns (Quick Start & Recent) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Quick Start Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-6 shadow-lg shadow-purple-500/15">
                {/* Decorative background shape */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 rounded-l-full translate-x-12 scale-110 pointer-events-none" />
                
                <div className="relative z-10 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Start a New Session</h2>
                    <p className="text-xs text-purple-100 mt-1">Your AI teacher is ready to go live</p>
                  </div>
                  <Link href="/dashboard/create-session" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-purple-700 shadow-md transition-all hover:bg-neutral-50 hover:shadow-lg cursor-pointer">
                    Create Session
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Recent Sessions</h3>
                  <button className="text-xs text-purple-400 font-semibold hover:text-purple-300">Filters</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#242424] text-[10px] font-bold uppercase tracking-wider text-white/40 bg-black/10">
                        <th className="px-6 py-3.5">Session Name</th>
                        <th className="px-4 py-3.5">Topics</th>
                        <th className="px-4 py-3.5">Students</th>
                        <th className="px-4 py-3.5">Date</th>
                        <th className="px-6 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242424]">
                      {recentSessions.map((session, index) => (
                        <tr key={index} className="text-xs hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-semibold text-white/95 max-w-[180px] truncate">
                            {session.name}
                          </td>
                          <td className="px-4 py-4 text-white/60">
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5 text-purple-400/70" />
                              {session.topics}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white/60">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-purple-400/70" />
                              {session.students}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white/50">{session.date}</td>
                          <td className="px-6 py-4 text-right">
                            {session.status === "Live" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                Live
                              </span>
                            )}
                            {session.status === "Completed" && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                Completed
                              </span>
                            )}
                            {session.status === "Scheduled" && (
                              <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                Scheduled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-white/5 bg-black/5 text-center">
                  <Link href="#" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1">
                    View All Sessions
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

            </div>

            {/* Right Column (Upcoming Sessions) */}
            <div className="space-y-6">
              
              {/* Upcoming Sessions List */}
              <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-5 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Upcoming Sessions</h3>
                </div>

                <div className="space-y-3.5">
                  {upcomingSessions.map((session, index) => (
                    <div
                      key={index}
                      className="group rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-3 transition-colors hover:border-purple-500/20 hover:bg-white/[0.02]"
                    >
                      <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                        {session.topic}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-purple-500/60" />
                          {session.dateTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-purple-500/60" />
                          {session.studentsExpected} expected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

    </div>
  )
}

