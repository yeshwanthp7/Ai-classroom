"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { subscribeToAuthChanges, User } from "@/lib/auth-service"
import DashboardSidebar from "@/components/dashboard-sidebar"


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

  // Load current auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Format date dynamically on client side to avoid hydration mismatch
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    setCurrentDate(new Date().toLocaleDateString("en-US", options))
  }, [])

  const teacherName = user?.displayName || "Dr. Sarah Jenkins"

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

        {/* Dashboard Grid Content */}
        <main className="flex-1 p-6 md:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
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
