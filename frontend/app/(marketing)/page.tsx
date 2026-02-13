"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrialStore } from "@/lib/stores/trial-store";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

const PHASE_DATA = [
  {
    name: "Discovery",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-400",
    bgGlow: "bg-blue-500/20",
    description: "Validate your idea with market research and customer interviews"
  },
  {
    name: "Planning",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "from-violet-500 to-purple-400",
    bgGlow: "bg-violet-500/20",
    description: "Build your business model, pricing strategy, and go-to-market plan"
  },
  {
    name: "Formation",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: "from-amber-500 to-orange-400",
    bgGlow: "bg-amber-500/20",
    description: "Set up your legal structure, finances, and operational foundation"
  },
  {
    name: "Launch",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    color: "from-rose-500 to-pink-400",
    bgGlow: "bg-rose-500/20",
    description: "Acquire your first customers and establish market presence"
  },
  {
    name: "Scale",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-400",
    bgGlow: "bg-emerald-500/20",
    description: "Optimize operations, expand your team, and accelerate growth"
  },
];

const FEATURES = [
  { icon: "🎯", title: "AI-Powered Guidance", desc: "Get personalized advice tailored to your specific business idea and industry" },
  { icon: "📊", title: "Smart Artifacts", desc: "Auto-generate business plans, pitch decks, financial models, and more" },
  { icon: "✅", title: "Progress Tracking", desc: "Clear milestones and gates ensure you're building on solid foundations" },
  { icon: "🏆", title: "Milestone Celebrations", desc: "Stay motivated with achievements and progress celebrations" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "E-commerce Founder", text: "Founder Toolkit helped me go from a vague idea to my first $10K month in just 8 weeks. The AI coach knew exactly what questions to ask.", avatar: "S", company: "StyleBox" },
  { name: "Marcus T.", role: "SaaS Founder", text: "I've paid $5,000+ for startup advisors who gave me less value than this AI. It's like having a Y Combinator partner in your pocket.", avatar: "M", company: "DataSync" },
  { name: "Lisa R.", role: "Agency Owner", text: "The structured approach took me from overwhelmed to organized. I finally launched my consulting practice after 2 years of planning.", avatar: "L", company: "GrowthLab" },
];

export default function LandingPage() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { sessionToken, messages, remainingMessages, setSessionToken, addMessage, setRemainingMessages } = useTrialStore();

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sessionToken) {
      api.createTrialSession().then((data) => setSessionToken(data.session_token)).catch(() => {});
    }
  }, [sessionToken, setSessionToken]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !sessionToken || remainingMessages <= 0) return;
    const userMessage = message.trim();
    setMessage("");
    addMessage({ role: "user", content: userMessage });
    setIsTyping(true);

    try {
      const response = await api.trialChat(sessionToken, userMessage);
      addMessage({ role: "assistant", content: response.message });
      setRemainingMessages(response.remaining);
      if (response.remaining <= 0) setShowSignup(true);
    } catch {
      addMessage({ role: "assistant", content: "Sorry, I had trouble responding. Please try again." });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[128px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
        {mounted && [...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-lg opacity-50" />
                <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span className="font-bold text-xl">Founder<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Toolkit</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 shadow-lg shadow-indigo-500/25">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Copy */}
            <div className={cn("transition-all duration-1000", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                AI-Powered Entrepreneurship Platform
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                Turn Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 pb-2">
                  Business Idea
                </span>
                Into Reality
              </h1>

              <p className="mt-8 text-xl text-gray-400 leading-relaxed max-w-xl">
                Your personal AI coach guides you through every step—from validating your idea to landing your first customers and scaling to success.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/signup">
                  <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-105">
                    Start Building Free
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Demo
                </Button>
              </div>

              {/* Social proof */}
              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {['from-indigo-500 to-purple-500', 'from-purple-500 to-pink-500', 'from-pink-500 to-rose-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500'].map((gradient, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} border-2 border-[#0a0a0f] flex items-center justify-center text-white text-sm font-medium shadow-lg`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-400 mt-1"><span className="text-white font-semibold">2,000+</span> founders building their dreams</p>
                </div>
              </div>
            </div>

            {/* Right - Demo Chat */}
            <div id="demo" className={cn("transition-all duration-1000 delay-300", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}>
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 animate-pulse" />

                <div className="relative bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Chat header */}
                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    <div className="relative p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">AI Business Coach</h3>
                            <p className="text-indigo-200 text-sm flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              Online now
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium text-white backdrop-blur-sm">
                          {remainingMessages} free messages
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div ref={chatContainerRef} className="h-80 overflow-y-auto p-4 space-y-4 bg-[#0d0d12]">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="font-medium text-white mb-2">Try the AI Coach!</p>
                        <p className="text-sm text-gray-500 max-w-xs">Share your business idea and get instant guidance on your next steps</p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                          {["meal prep service", "SaaS app", "consulting"].map((idea) => (
                            <button
                              key={idea}
                              onClick={() => setMessage(`I want to start a ${idea}`)}
                              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              {idea}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {messages.map((msg, index) => (
                      <div key={index} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          msg.role === "user"
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                            : "bg-white/5 text-gray-200 border border-white/10"
                        )}>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat input */}
                  <div className="p-4 border-t border-white/10 bg-[#12121a]">
                    {remainingMessages > 0 ? (
                      <div className="flex gap-3">
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Describe your business idea..."
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                          disabled={isTyping}
                          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                        <Button
                          onClick={handleSend}
                          disabled={isTyping || !message.trim()}
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-gray-400 mb-3 text-sm">Create an account to continue chatting</p>
                        <Link href="/signup"><Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0">Create Free Account</Button></Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-indigo-400 tracking-wide uppercase mb-4">Features</h2>
            <p className="text-4xl sm:text-5xl font-bold">Everything you need to succeed</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase Journey Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-indigo-400 tracking-wide uppercase mb-4">The Framework</h2>
            <p className="text-4xl sm:text-5xl font-bold mb-4">Your 5-Phase Journey</p>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">A proven methodology that takes you from idea to profitable business</p>
          </div>

          {/* Journey line */}
          <div className="relative">
            <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent hidden lg:block" />

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
              {PHASE_DATA.map((phase, index) => (
                <div key={phase.name} className="relative group">
                  <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-500 h-full">
                    {/* Glow on hover */}
                    <div className={`absolute inset-0 ${phase.bgGlow} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />

                    <div className="relative">
                      {/* Phase number */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${phase.color} p-[2px] mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <div className="w-full h-full rounded-2xl bg-[#0a0a0f] flex items-center justify-center text-white">
                          {phase.icon}
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-gray-500 mb-2">PHASE {index + 1}</div>
                      <h3 className="text-xl font-bold text-white mb-3">{phase.name}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{phase.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-indigo-400 tracking-wide uppercase mb-4">Testimonials</h2>
            <p className="text-4xl sm:text-5xl font-bold">Loved by founders worldwide</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all h-full">
                  <div className="flex items-center gap-1 text-amber-400 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-300 mb-8 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.role} at {t.company}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20" />

            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] animate-shimmer" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />

              <div className="relative p-12 md:p-16 text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to build your empire?</h2>
                <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">Join thousands of founders who are turning their ideas into successful businesses with AI-powered guidance.</p>
                <Link href="/signup">
                  <Button size="lg" className="h-14 px-10 text-lg bg-white text-indigo-600 hover:bg-gray-100 font-semibold shadow-xl hover:scale-105 transition-all">
                    Get Started Free
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
                <p className="mt-6 text-indigo-200 text-sm">No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold">FounderToolkit</span>
            </div>
            <p className="text-sm text-gray-500">Built with AI for ambitious entrepreneurs</p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative max-w-md w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-30" />
            <div className="relative bg-[#12121a] rounded-2xl p-8 border border-white/10 shadow-2xl">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Continue Your Journey</h3>
                <p className="text-gray-400 mb-8">Create a free account to unlock unlimited AI coaching sessions.</p>
                <div className="space-y-3">
                  <Link href="/signup" className="block">
                    <Button className="w-full h-12 text-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0">
                      Create Free Account
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full h-12 border-white/10 text-gray-300 hover:bg-white/5" onClick={() => setShowSignup(false)}>
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
