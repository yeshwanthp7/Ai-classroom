"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  BookOpen,
  Send,
  Brain,
  Trash2,
  Menu,
  ChevronRight,
  HelpCircle,
  Clock,
  Loader2,
  FileCheck
} from "lucide-react"
import DashboardSidebar from "@/components/dashboard-sidebar"
import { subscribeToAuthChanges } from "@/lib/auth-service"
import { extractPDFPages } from "@/lib/pdfParser"

interface Explanation {
  summary: string
  keyConcepts: string[]
  details: string
}

export default function StudyBuddyPage() {
  const [user, setUser] = useState<any>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Upload & parse states
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parsingStep, setParsingStep] = useState("")
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [fullText, setFullText] = useState("")

  // Document QA states
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ sender: string; text: string; isAI: boolean }>>([])
  const [isAnswering, setIsAnswering] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load auth state
  useEffect(() => {
    setMounted(true)
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Parse file content
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setIsParsing(true)
    setExplanation(null)
    setChatHistory([])
    setFullText("")

    try {
      let text = ""
      const sizeStr = (uploadedFile.size / 1024).toFixed(1) + " KB"

      if (uploadedFile.type === "application/pdf" || uploadedFile.name.endsWith(".pdf")) {
        setParsingStep("Reading PDF pages...")
        const pages = await extractPDFPages(uploadedFile)
        text = pages.join("\n")
      } else if (
        uploadedFile.type === "text/plain" ||
        uploadedFile.name.endsWith(".txt") ||
        uploadedFile.name.endsWith(".md")
      ) {
        setParsingStep("Reading text content...")
        text = await uploadedFile.text()
      } else {
        // Mock parsing for .docx, .pptx, etc.
        setParsingStep("Indexing document slides/paragraphs...")
        await new Promise((r) => setTimeout(r, 1500))
        text = `Document Metadata:
Name: ${uploadedFile.name}
Size: ${sizeStr}
Type: ${uploadedFile.type || "Office Document"}
Context: This is a textbook chapter or slide deck regarding the topic "${uploadedFile.name.replace(/\.[^/.]+$/, "")}".`
      }

      setParsingStep("Analyzing concepts with AI Study Buddy...")
      setFullText(text)

      // Send to Groq API
      const prompt = `Please analyze this study material:
---
${text.slice(0, 5000)}
---
Generate a structured JSON response with exactly three fields (no markdown or additional text outside the JSON):
{
  "summary": "A concise 1-sentence description of what this document covers.",
  "keyConcepts": [
    "Core Concept 1 with a short explanation",
    "Core Concept 2 with a short explanation",
    "Core Concept 3 with a short explanation"
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

      let result: Explanation
      try {
        const cleaned = data.text.replace(/```json/g, "").replace(/```/g, "").trim()
        result = JSON.parse(cleaned)
      } catch (err) {
        // Fallback
        result = {
          summary: `Study guide for ${uploadedFile.name}`,
          keyConcepts: ["Key details are compiled below."],
          details: data.text,
        }
      }

      setExplanation(result)
      setChatHistory([
        {
          sender: "AI Study Buddy",
          text: `Hi! I've finished analyzing "${uploadedFile.name}". I've created a clean summary and bulleted the core concepts on the left. Feel free to ask me any specific doubts or questions about this material here!`,
          isAI: true,
        },
      ])
    } catch (err) {
      console.error(err)
      alert("Failed to analyze the document. Please ensure your Groq API key is set or try a simple text/PDF file.")
      setFile(null)
    } finally {
      setIsParsing(false)
      setParsingStep("")
    }
  }

  // Answer queries about the uploaded document
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isAnswering || !file) return

    const userQuestion = query.trim()
    setQuery("")
    setChatHistory((prev) => [...prev, { sender: "You", text: userQuestion, isAI: false }])
    setIsAnswering(true)

    try {
      const prompt = `The student is studying the document "${file.name}".
Document content (extracted):
---
${fullText.slice(0, 3000)}
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

      setChatHistory((prev) => [...prev, { sender: "AI Study Buddy", text: data.text, isAI: true }])
    } catch (err) {
      console.error(err)
      setChatHistory((prev) => [
        ...prev,
        { sender: "AI Study Buddy", text: "Sorry, I ran into an error generating that explanation. Please try again.", isAI: true },
      ])
    } finally {
      setIsAnswering(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setExplanation(null)
    setChatHistory([])
    setFullText("")
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white flex font-sans antialiased">
      <DashboardSidebar
        activeItem="AI Study Buddy"
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-grow lg:ml-64 flex flex-col min-h-screen">
        {/* Header Topbar */}
        <header className="h-16 border-b border-[#1a1a1a] bg-[#111111]/80 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 lg:hidden text-white/80"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-purple-400 animate-pulse" />
              AI Study Buddy
            </h1>
          </div>
          {file && (
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-xl border border-white/5 bg-[#1a1a1a] text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Upload New
            </button>
          )}
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 md:p-8 flex flex-col justify-start max-w-6xl w-full mx-auto space-y-6">
          {/* Header Copy */}
          {!file && (
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight">Explain Study Materials</h2>
              <p className="text-sm text-white/40">Upload your lectures, PPTs, notes, or PDFs and get clean, short text summaries instantly.</p>
            </div>
          )}

          {/* ─── CASE 1: INITIAL STATE (UPLOAD BOX) ─── */}
          {!file && !isParsing && (
            <div className="flex-1 flex flex-col justify-center items-center py-12">
              <label className="w-full max-w-lg border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 bg-[#161618] hover:bg-purple-500/[0.01] rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 group relative shadow-2xl">
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.docx,.pptx,.ppt"
                  className="hidden"
                  onChange={handleFileUpload}
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
          {isParsing && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                <Brain className="h-5 w-5 text-purple-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-white">Analyzing file...</h3>
                <p className="text-xs text-purple-400/80 font-mono">{parsingStep}</p>
              </div>
            </div>
          )}

          {/* ─── CASE 3: EXPLANATION RENDERED (SPLIT SCREEN) ─── */}
          {mounted && explanation && (
            <div className="flex-grow grid gap-6 lg:grid-cols-12 items-stretch min-h-0">
              
              {/* LEFT: Core Explanation panel (7/12 cols) */}
              <section className="lg:col-span-7 bg-[#1a1a1c] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] cscroll shadow-xl">
                
                {/* Header Badge */}
                <div className="flex items-center gap-3 border-b border-white/5 pb-5">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-bold text-white truncate max-w-md">{file?.name}</h3>
                    <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-0.5">
                      {file && file.size > 1024 * 1024 
                        ? `${(file.size / 1024 / 1024).toFixed(1)} MB` 
                        : `${((file?.size || 0) / 1024).toFixed(1)} KB`
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
                    &ldquo;{explanation.summary}&rdquo;
                  </p>
                </div>

                {/* 2. Key Concepts */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Key Concepts
                  </span>
                  <ul className="grid gap-2.5">
                    {explanation.keyConcepts.map((concept, i) => (
                      <li key={i} className="flex gap-3 items-start text-xs text-white/70 leading-relaxed bg-[#111112] border border-white/[0.02] p-3 rounded-xl">
                        <span className="h-5 w-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400 flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{concept}</span>
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
                    {explanation.details.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>

              </section>

              {/* RIGHT: Chat QA (5/12 cols) */}
              <section className="lg:col-span-5 bg-[#1a1a1c] border border-white/5 rounded-3xl p-6 flex flex-col overflow-hidden max-h-[calc(100vh-12rem)] shadow-xl">
                
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
                  {chatHistory.map((msg, i) => (
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
                            ? "bg-[#111112] border border-white/[0.03] text-white/80 rounded-tl-none flex gap-2 items-start"
                            : "bg-purple-600 text-white rounded-tr-none"
                        }`}
                      >
                        {msg.isAI && <Brain className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />}
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Query Bar */}
                <form onSubmit={handleQuerySubmit} className="pt-4 border-t border-white/5 flex gap-2.5 flex-shrink-0">
                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isAnswering ? "Buddy is generating answer..." : "Ask doubt about notes..."}
                    disabled={isAnswering}
                    className="flex-1 px-4 py-3 bg-[#111112] border border-white/8 rounded-xl text-xs focus:outline-none focus:border-purple-500/40 text-white placeholder:text-white/20 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isAnswering}
                    className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isAnswering ? (
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
    </div>
  )
}
