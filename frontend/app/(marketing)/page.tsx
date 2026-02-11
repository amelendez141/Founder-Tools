"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">Founder Toolkit</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Copy */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Turn Your Business Idea Into Reality
            </h1>
            <p className="mt-6 text-xl text-gray-600">
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
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <svg
                      className="h-4 w-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg">Start Free Today</Button>
              </Link>
            </div>
          </div>

          {/* Right - Trial Chat */}
          <div>
            <Card className="overflow-hidden shadow-xl">
              <div className="bg-primary-600 text-white p-4">
                <h3 className="font-semibold">Try it now - No signup required</h3>
                <p className="text-sm text-primary-100">
                  {remainingMessages} free messages remaining
                </p>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>Ask me anything about starting a business!</p>
                    <p className="text-sm mt-2">
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
                        "max-w-[80%] rounded-lg px-4 py-2",
                        msg.role === "user"
                          ? "bg-primary-600 text-white"
                          : "bg-white text-gray-900 shadow-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white">
                {remainingMessages > 0 ? (
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSend()
                      }
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={isTyping || !message.trim()}
                    >
                      Send
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-600 mb-3">
                      Sign up to continue the conversation
                    </p>
                    <Link href="/signup">
                      <Button className="w-full">Create Free Account</Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Phases Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Your Journey to Success
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              A proven 5-phase framework for building your business
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              {
                name: "Discovery",
                description: "Validate your idea and understand your market",
              },
              {
                name: "Planning",
                description: "Create your business plan and define your offer",
              },
              {
                name: "Formation",
                description: "Set up your legal and financial foundation",
              },
              {
                name: "Launch",
                description: "Acquire your first customers and get traction",
              },
              {
                name: "Scale",
                description: "Build systems and grow your business",
              },
            ].map((phase, index) => (
              <Card key={phase.name} className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center mx-auto mb-4">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-gray-900">{phase.name}</h3>
                <p className="text-sm text-gray-600 mt-2">{phase.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to Start Your Journey?
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Join thousands of founders building their dreams with Founder Toolkit
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg">Get Started for Free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary-600 flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600">Founder Toolkit</span>
            </div>
            <p className="text-sm text-gray-500">
              Built with AI for entrepreneurs
            </p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Continue Your Journey
              </h3>
              <p className="text-gray-600 mt-2">
                Create a free account to continue chatting and unlock all
                features.
              </p>
              <div className="mt-6 space-y-3">
                <Link href="/signup" className="block">
                  <Button className="w-full">Create Free Account</Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSignup(false)}
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
