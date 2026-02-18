"use client";

import { useState, useRef, useEffect } from "react";
import { useVenture } from "@/lib/api/hooks/use-ventures";
import { useDashboard } from "@/lib/api/hooks/use-dashboard";
import { useChatHistory, useSendMessage, useRateLimit, useGenerateArtifact } from "@/lib/api/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { ArtifactType } from "@/lib/api/client";

export default function ChatPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: ventureId } = params;
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: venture } = useVenture(ventureId);
  const { data: dashboard } = useDashboard(ventureId);
  const currentPhase = dashboard?.current_phase ?? 1;

  const { data: chatHistory, isLoading: historyLoading } = useChatHistory(
    ventureId,
    currentPhase
  );
  const { data: rateLimit } = useRateLimit(ventureId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage(ventureId);
  const { mutate: generateArtifact, isPending: isGenerating } = useGenerateArtifact(ventureId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory?.messages]);

  const handleSend = () => {
    if (!message.trim() || isSending) return;
    sendMessage(
      { message: message.trim(), phaseNumber: currentPhase },
      {
        onSuccess: () => setMessage(""),
      }
    );
  };

  const handleGenerate = (type: ArtifactType) => {
    generateArtifact({ type, phaseNumber: currentPhase });
  };

  const artifactButtons: { type: ArtifactType; label: string; phase: number }[] = [
    { type: "BUSINESS_PLAN", label: "Business Plan", phase: 2 },
    { type: "OFFER_STATEMENT", label: "Offer Statement", phase: 2 },
    { type: "GTM_PLAN", label: "GTM Plan", phase: 4 },
    { type: "GROWTH_PLAN", label: "Growth Plan", phase: 5 },
  ];

  const availableArtifacts = artifactButtons.filter(
    (a) => a.phase <= currentPhase
  );

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Copilot
          </h1>
          <p className="text-sm text-gray-600">
            Phase {currentPhase}: <span className="text-indigo-600">{dashboard?.current_phase_name}</span>
          </p>
        </div>
        {rateLimit && (
          <div className="text-right">
            <div className="text-sm text-gray-600">
              <span className="text-indigo-600 font-medium">{rateLimit.remaining_today}</span>/{rateLimit.messages_limit} remaining
            </div>
            <div className="w-32 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{
                  width: `${((rateLimit.messages_limit - rateLimit.remaining_today) / rateLimit.messages_limit) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat Container */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className="relative flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : chatHistory?.messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-gray-600">Start a conversation with your AI coach</p>
                <p className="text-sm mt-2 text-gray-500">
                  Ask questions about your venture or generate artifacts
                </p>
              </div>
            ) : (
              chatHistory?.messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3",
                      msg.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-2",
                        msg.role === "user" ? "text-indigo-200" : "text-gray-500"
                      )}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {/* Artifact Generation Buttons */}
            {availableArtifacts.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {availableArtifacts.map((artifact) => (
                  <Button
                    key={artifact.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate(artifact.type)}
                    disabled={isGenerating || (rateLimit?.remaining_today ?? 0) < 3}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-indigo-400"
                  >
                    {isGenerating ? "Generating..." : `Generate ${artifact.label}`}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={isSending || (rateLimit?.remaining_today ?? 0) < 1}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
              <Button
                onClick={handleSend}
                disabled={isSending || !message.trim() || (rateLimit?.remaining_today ?? 0) < 1}
                isLoading={isSending}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0"
              >
                Send
              </Button>
            </div>
            {rateLimit && rateLimit.remaining_today < 1 && (
              <p className="text-sm text-red-600 mt-2">
                Daily limit reached. Resets at{" "}
                {new Date(rateLimit.resets_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
