# AI Class Monitoring — MEMORY.md

## Project Overview & Mission
Class AI is an AI-powered classroom monitoring application that uses artificial intelligence to track student engagement, provide real-time insights, and help educators create better learning environments.

## Tech Stack & Versions
- **Framework:** Next.js 16.2.9 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4.x + shadcn/ui
- **Icons:** lucide-react
- **Animation:** Three.js (CDN-loaded, shader-based)
- **Package Manager:** npm
- **Node Structure:** `src/` directory with `@/*` import alias
- **Repository:** https://github.com/AM-iSMAIL/ai-class-monitoring-v2

## Architecture & Core Decisions
- **Dark Mode First:** The app uses dark theme by default (`.dark` class on `<html>`)
- **shadcn/ui:** Initialized with default config; components live in `src/components/ui/`
- **Shader Animation:** Three.js is loaded dynamically via CDN script tag (not bundled) to keep bundle size small
- **Loading Screen:** Custom loading screen with shader background + logo plays on initial page load before revealing the landing page
- **Branding:** Purple/violet color palette (#7c3aed range), "Class AI" brand name

## Project Structure
```
src/
├── app/
│   ├── globals.css          # Tailwind + shadcn theme + custom animations
│   ├── layout.tsx           # Root layout with fonts and metadata
│   └── page.tsx             # Landing page with loading screen
├── components/
│   └── ui/
│       ├── button.tsx       # shadcn button component
│       ├── loading-screen.tsx # Loading screen with logo + shader bg
│       └── shader-lines.tsx # Three.js WebGL shader animation
└── lib/
    └── utils.ts             # shadcn utility (cn function)
```

## Progress & Roadmap

- [x] Project scaffolding (Next.js + TypeScript + Tailwind)
- [x] shadcn/ui initialization
- [x] ShaderAnimation component integration
- [x] Loading screen with logo
- [x] Landing page design & layout fixes
  - [x] Sticky navbar with larger logo (36px) & brand styling (left border & glow)
  - [x] Hero copy update & floating logo removal
  - [x] Section spacing reduction (40% tighter spacing)
  - [x] Added #1a1a1a horizontal section dividers
  - [x] Minimal single-line footer layout
- [x] Authentication & Session Join page (/auth)
  - [x] Responsive split-screen design
  - [x] Left panel: quotes, branding, stats pills
  - [x] Right panel: centered white card form
  - [x] Teacher Tab: Google oauth (inline Google logo) & Email/Password fields for Sign In / Sign Up
  - [x] Student Tab: Your Name & large monospace Session Code inputs
  - [x] Firebase SDK integration & build-safe fallback configuration
- [x] Dashboard page
- [x] Firebase Real-time sync & security rules
  - [x] Created `firestore.rules` governing session/student actions
  - [x] Implemented `session-service.ts` wrappers for document snapshot subscriptions & telemetry updates
  - [x] Integrated Firestore with dashboard create-session pipeline
  - [x] Updated create-session wizard flow to support 4-step wizard with branched AI/Human modes
- [x] Student monitoring & Waiting Room features
  - [x] Created unified dynamic `/session/[code]` route
  - [x] Designed Student Waiting Room with pulsed sonar rings, mock webcam toggle controls, and classmate rosters
  - [x] Designed Teacher Waiting Room with student tile grid, focus mode / late join toggles, and mode instruction banners
  - [x] Added Google Meet countdown, auto-accept student lobbies, early start, AI script preview modal, and transition chimes
- [x] Main Classroom Page (rebuilt at `/session/[code]/live`)
  - [x] Zero Firebase — reads localStorage only, hardcoded mock fallbacks
  - [x] Entry overlay gate: "Ready to begin?" with Enter Classroom button (satisfies browser autoplay policy)
  - [x] Web Speech API only initialized after user click (no AudioContext on mount)
  - [x] Full-screen split layout: 65% left (AI teacher + slides + subtitles) / 35% right (student tiles + doubt chat)
  - [x] Top bar: logo, topic progress pill, focus %, timer, student count, End Session
  - [x] Teacher observer banner with Pause AI / Resume / Take Over controls
  - [x] Bottom toolbar: mic, camera, hand raise, screen share, chat toggle, AI voice mute, record, leave
  - [x] Simulated student focus scores (emerald/amber/rose borders) refreshing every 7s
  - [x] AI topic lecture sequence with Web Speech, live subtitles, doubt chat auto-pause
  - [x] Keyboard shortcuts (M, V, H, C), end session modal, countdown redirect overlay
  - [x] Waiting room saves session data to localStorage then navigates to /live route
  - [x] Deleted old `/classroom/[code]` route and `classroom-view.tsx` component (50KB)
  - [x] Claude API integration for AI teaching
    - [x] Created `/api/claude/route.ts` — proxies to Anthropic Messages API with comprehensive fallback
    - [x] ANTHROPIC_API_KEY env var (optional — works without it via smart local fallbacks)
    - [x] AI teaching calls Claude API on classroom entry, speaks response via Web Speech API
    - [x] Doubt chat also routes through Claude API for contextual answers
  - [x] Animated Professor AI tile
    - [x] Pulsing purple orb (scale + glow animation) when speaking
    - [x] 5-bar waveform animation below orb when speaking
    - [x] Glowing animated border on tile when speaking, dims when paused/idle
    - [x] Shows current topic name instead of "AWAITING..." when speaking
  - [x] Content area with Unsplash topic images
    - [x] Fetches topic-relevant image from `source.unsplash.com` for each topic
    - [x] Added Unsplash domains to `next.config.ts` remotePatterns
    - [x] Fade-in/out transitions when topic changes
    - [x] Topic name caption overlaid on image with gradient overlay
- [ ] Analytics & reports

