"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrialStore } from "@/lib/stores/trial-store";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

const PHASE_DATA = [
  { name: "Discovery", icon: "🔍", color: "from-blue-500 to-cyan-500", description: "Validate your idea" },
  { name: "Planning", icon: "📋", color: "from-violet-500 to-purple-500", description: "Build your model" },
  { name: "Formation", icon: "🏗️", color: "from-amber-500 to-orange-500", description: "Set up legally" },
  { name: "Launch", icon: "🚀", color: "from-rose-500 to-pink-500", description: "Get customers" },
  { name: "Scale", icon: "📈", color: "from-emerald-500 to-teal-500", description: "Grow & optimize" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "E-commerce Founder", text: "Founder Toolkit helped me go from idea to first sale in 3 weeks.", avatar: "S" },
  { name: "Marcus T.", role: "SaaS Founder", text: "The AI coach is like having a mentor available 24/7. Incredible value.", avatar: "M" },
  { name: "Lisa R.", role: "Consultant", text: "Finally, a structured approach to building my consulting practice.", avatar: "L" },
];

export default function LandingPage() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { sessionToken, messages, remainingMessages, setSessionToken, addMessage, setRemainingMessages } = useTrialStore();

  useEffect(() => {
    if (!sessionToken) {
      api.createTrialSession().then((data) => setSessionToken(data.session_token)).catch(() => {});
    }
  }, [sessionToken, setSessionToken]);

  useEffect(() => {
    // Scroll only the chat container, not the whole page
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
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" />
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-300 dark:bg-purple-900/50 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-30 animate-float" />
        <div className="absolute top-20 -right-40 w-80 h-80 bg-indigo-300 dark:bg-indigo-900/50 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-30 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-300 dark:bg-pink-900/50 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-30 animate-float" style={{ animationDelay: "4s" }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">Founder<span className="text-indigo-600">Toolkit</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="dark:text-gray-300">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Copy */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                AI-Powered Entrepreneurship Coach
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Turn Your Idea Into a
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"> Real Business</span>
              </h1>

              <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Your personal AI coach guides you through every step—from validating your idea to landing your first customers and beyond.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/signup">
                  <Button size="lg" className="px-8 h-14 text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40">
                    Start Free Today
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="px-8 h-14 text-lg" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
                  Try Demo
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex items-center gap-8">
                <div className="flex -space-x-2">
                  {['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500'].map((bg, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full ${bg} border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-sm font-medium`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">1,000+</span> founders building their dreams
                </div>
              </div>
            </div>

            {/* Right - Demo Chat */}
            <div id="demo" className="animate-fade-in-up stagger-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20" />
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">AI Business Coach</h3>
                        <p className="text-indigo-200 text-sm">Try it free - No signup needed</p>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
                        {remainingMessages} messages left
                      </div>
                    </div>
                  </div>

                  <div ref={chatContainerRef} className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-950">
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="font-medium">Ask me anything about starting a business!</p>
                        <p className="text-sm mt-2 text-gray-400">Try: "I want to start a meal prep service"</p>
                      </div>
                    )}
                    {messages.map((msg, index) => (
                      <div key={index} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          msg.role === "user"
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                            : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700"
                        )}>
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
                    {remainingMessages > 0 ? (
                      <div className="flex gap-3">
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your business idea..."
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                          disabled={isTyping}
                          className="flex-1"
                        />
                        <Button onClick={handleSend} disabled={isTyping || !message.trim()}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">Sign up to continue</p>
                        <Link href="/signup"><Button className="w-full">Create Free Account</Button></Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase Journey Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Your 5-Phase Journey</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">A proven framework to take you from idea to profitable business</p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {PHASE_DATA.map((phase, index) => (
              <div key={phase.name} className="animate-fade-in-up group" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 h-full">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${phase.color} flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    {phase.icon}
                  </div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">PHASE {index + 1}</div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{phase.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Loved by Founders</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Join thousands building their dreams</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>)}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-medium">{t.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{t.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t.role}</div>
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
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20" />
            <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-3xl p-12 text-center text-white overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\" fill=\"rgba(255,255,255,0.07)\"%2F%3E%3C%2Fsvg%3E')] opacity-50" />
              <div className="relative">
                <h2 className="text-4xl font-bold mb-4">Ready to Build Your Dream Business?</h2>
                <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">Start your entrepreneurial journey today with your AI-powered coach by your side.</p>
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 px-10 h-14 text-lg font-semibold shadow-xl">
                    Get Started Free
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">FounderToolkit</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Built with AI for entrepreneurs worldwide</p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-scale-in">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Continue Your Journey</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Create a free account to unlock unlimited conversations.</p>
              <div className="space-y-3">
                <Link href="/signup" className="block"><Button className="w-full h-12 text-lg">Create Free Account</Button></Link>
                <Button variant="outline" className="w-full h-12" onClick={() => setShowSignup(false)}>Maybe Later</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
