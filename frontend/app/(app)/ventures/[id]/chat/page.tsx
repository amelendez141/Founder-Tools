"use client";

import { use, useState, useRef, useEffect } from "react";
import { useVenture } from "@/lib/api/hooks/use-ventures";
import { useDashboard } from "@/lib/api/hooks/use-dashboard";
import { useChatHistory, useSendMessage, useRateLimit, useGenerateArtifact } from "@/lib/api/hooks/use-chat";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import type { ArtifactType } from "@/lib/api/client";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ventureId } = use(params);
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
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Copilot</h1>
          <p className="text-sm text-gray-600">
            Phase {currentPhase}: {dashboard?.current_phase_name}
          </p>
        </div>
        {rateLimit && (
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {rateLimit.remaining_today}/{rateLimit.messages_limit} remaining
            </div>
            <Progress
              value={
                ((rateLimit.messages_limit - rateLimit.remaining_today) /
                  rateLimit.messages_limit) *
                100
              }
              className="w-32 mt-1"
            />
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : chatHistory?.messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Start a conversation with your AI coach</p>
              <p className="text-sm mt-2">
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
                    "max-w-[80%] rounded-lg px-4 py-2",
                    msg.role === "user"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      msg.role === "user" ? "text-primary-200" : "text-gray-500"
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
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-4">
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
            />
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim() || (rateLimit?.remaining_today ?? 0) < 1}
              isLoading={isSending}
            >
              Send
            </Button>
          </div>
          {rateLimit && rateLimit.remaining_today < 1 && (
            <p className="text-sm text-red-500 mt-2">
              Daily limit reached. Resets at{" "}
              {new Date(rateLimit.resets_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
