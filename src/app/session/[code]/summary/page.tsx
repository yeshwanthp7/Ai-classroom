"use client";

import { useSearchParams, useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Brain, ShieldAlert, BarChart } from "lucide-react";
import Link from "next/link";

export default function SummaryPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  
  const kicked = searchParams.get("kicked") === "true";
  const sessionCode = (params.code as string)?.toUpperCase() || "UNKNOWN";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white p-6 font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none z-0" />
      
      <div className="max-w-md w-full relative z-10 bg-[#111111] border border-white/10 p-8 rounded-3xl shadow-2xl text-center space-y-6">
        {kicked ? (
          <>
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
              <ShieldAlert className="w-10 h-10 text-rose-500" />
            </div>
            <h1 className="text-2xl font-black text-white">Removed from Session</h1>
            <p className="text-sm text-white/50 leading-relaxed">
              You were automatically removed from <span className="font-mono text-rose-400">{sessionCode}</span> because the AI vision system detected you were away from your keyboard or deeply distracted for an extended period.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Session Concluded</h1>
            <p className="text-sm text-white/50 leading-relaxed">
              The lecture <span className="font-mono text-purple-400">{sessionCode}</span> has successfully ended. Your AI-generated performance summary and attendance metrics are being compiled.
            </p>
          </>
        )}

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
