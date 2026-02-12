"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

export function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      }));
      setPieces(newPieces);

      const timeout = setTimeout(() => setPieces([]), 4000);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${piece.x}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function CelebrationModal({
  isOpen,
  onClose,
  title,
  message,
  icon,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timeout = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <Confetti active={showConfetti} />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 animate-fade-in">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-scale-in shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-4xl animate-bounce-slow">
            {icon || "🎉"}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all hover:scale-105"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
