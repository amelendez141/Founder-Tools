"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrialStore } from "@/lib/stores/trial-store";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

export default function LandingPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessionToken,
    messages,
    remainingMessages,
    setSessionToken,
    addMessage,
    setRemainingMessages,
  } = useTrialStore();

  // Initialize trial session
  useEffect(() => {
    if (!sessionToken) {
      api.createTrialSession().then((data) => {
        setSessionToken(data.session_token);
      });
    }
  }, [sessionToken, setSessionToken]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

      if (response.remaining <= 0) {
        setShowSignup(true);
      }
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "Sorry, I had trouble responding. Please try again.",
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span className="font-bold text-lg">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Founder</span>
                <span className="text-gray-900">Toolkit</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 border-0">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Copy */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full border border-indigo-200 mb-6">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-sm text-indigo-600 font-medium">AI-Powered Entrepreneurship</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-gray-900">
              Turn Your Business Idea Into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                Reality
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              An AI-powered coach that guides you through every phase of your
              entrepreneurial journey - from idea validation to scaling.
            </p>

            {/* Features */}
            <div className="mt-8 space-y-4">
              {[
                "5-phase structured journey from idea to scale",
                "AI coach available 24/7 to answer questions",
                "Auto-generated business plans and artifacts",
                "Progress tracking and milestone celebrations",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-200 transition-colors">
                    <svg className="h-4 w-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8 py-6 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0 text-lg">
                  Start Free Today
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 px-8 py-6 rounded-xl text-lg">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Right - Trial Chat */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <h3 className="font-semibold text-white">Try it now - No signup required</h3>
                <p className="text-sm text-indigo-200">
                  {remainingMessages} free messages remaining
                </p>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-4">💬</div>
                    <p>Ask me anything about starting a business!</p>
                    <p className="text-sm mt-2 text-gray-400">
                      Try: &quot;I want to start a meal prep service&quot;
                    </p>
                  </div>
                )}
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-2",
                        msg.role === "user"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                          : "bg-white text-gray-800 border border-gray-200"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-xl px-4 py-3 border border-gray-200">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                {remainingMessages > 0 ? (
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      disabled={isTyping}
                      className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={isTyping || !message.trim()}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0"
                    >
                      Send
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-600 mb-3">Sign up to continue the conversation</p>
                    <Link href="/signup">
                      <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0">
                        Create Free Account
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phases Section */}
      <section className="relative py-24">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Your Journey to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Success
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A proven 5-phase framework for building your business from idea to scale
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              { name: "Discovery", description: "Validate your idea and understand your market", icon: "🔍" },
              { name: "Planning", description: "Create your business plan and define your offer", icon: "📋" },
              { name: "Formation", description: "Set up your legal and financial foundation", icon: "🏗️" },
              { name: "Launch", description: "Acquire your first customers and get traction", icon: "🚀" },
              { name: "Scale", description: "Build systems and grow your business", icon: "📈" },
            ].map((phase, index) => (
              <div key={phase.name} className="relative group">
                <div className="relative bg-white rounded-2xl border border-gray-200 p-6 text-center hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
                  <div className="text-4xl mb-4">{phase.icon}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{phase.name}</h3>
                  <p className="text-sm text-gray-600">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            <div className="relative bg-white rounded-3xl border border-gray-200 p-12 shadow-xl">
              <div className="text-6xl mb-6">🚀</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of founders building their dreams with Founder Toolkit
              </p>
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-12 py-6 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0 text-lg">
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">
                <span className="text-indigo-600">Founder</span>Toolkit
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Built with AI for entrepreneurs
            </p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative max-w-md w-full">
            <div className="relative bg-white rounded-2xl border border-gray-200 p-8 shadow-2xl">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Continue Your Journey
                </h3>
                <p className="text-gray-600 mb-6">
                  Create a free account to continue chatting and unlock all features.
                </p>
                <div className="space-y-3">
                  <Link href="/signup" className="block">
                    <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 border-0">
                      Create Free Account
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl"
                    onClick={() => setShowSignup(false)}
                  >
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
