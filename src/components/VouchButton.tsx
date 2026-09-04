import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, Check, Sparkles } from 'lucide-react';

interface VouchButtonProps {
  id?: string;
  isVouched: boolean;
  onVouchSuccess: () => void;
  onUnvouch?: () => void;
  vouchCount: number;
}

export const VouchButton: React.FC<VouchButtonProps> = ({
  id = 'vouch-button',
  isVouched,
  onVouchSuccess,
  onUnvouch,
  vouchCount,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const pressStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const HOLD_DURATION_MS = 3000; // 3 seconds requirement

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isVouched) {
      // Toggle or prompt unvouch
      if (onUnvouch) {
        onUnvouch();
      }
      return;
    }

    setIsPressing(true);
    pressStartTimeRef.current = performance.now();

    const updateLoop = (now: number) => {
      if (!pressStartTimeRef.current) return;
      const elapsed = now - pressStartTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        // Completed!
        setIsPressing(false);
        setProgress(100);
        setShowCelebration(true);
        onVouchSuccess();

        setTimeout(() => {
          setShowCelebration(false);
          setProgress(0);
        }, 1800);
      } else {
        animationFrameRef.current = requestAnimationFrame(updateLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);
  };

  const handlePointerUpOrLeave = () => {
    if (isVouched) return;
    if (isPressing) {
      setIsPressing(false);
      pressStartTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Smooth reset
      setProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // SVG circle calculation
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center select-none touch-none">
        {/* Animated Celebration Aura */}
        {showCelebration && (
          <div className="absolute inset-0 -m-3 rounded-full bg-[#fca311]/20 animate-ping pointer-events-none" />
        )}

        {/* SVG Progress Ring */}
        <svg
          className="w-20 h-20 -rotate-90 pointer-events-none transition-transform duration-200"
          viewBox="0 0 80 80"
        >
          {/* Subtle Background Track */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-[#e5e5e5]"
            strokeWidth="3.5"
            fill="none"
          />
          {/* Active 3-second Progress Ring in #fca311 */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-[#fca311] transition-[stroke-dashoffset] duration-75 ease-linear"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={isVouched ? 0 : strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Interactive Button */}
        <button
          id={id}
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={isVouched ? 'Vouched to My Vault (Click to unvouch)' : 'Press and hold 3 seconds to vouch'}
          className={`absolute w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 outline-none select-none cursor-pointer ${
            isVouched
              ? 'bg-[#fca311] text-[#14213d] shadow-sm'
              : isPressing
              ? 'bg-[#14213d] text-white scale-95 shadow-inner'
              : 'bg-white text-[#14213d] hover:bg-[#e5e5e5]/20'
          }`}
        >
          {isVouched ? (
            <div className="flex flex-col items-center">
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="text-[8px] font-black tracking-tight uppercase">Vouched</span>
            </div>
          ) : isPressing ? (
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-tighter text-[#fca311]">Hold</span>
              <span className="text-[10px] font-mono font-bold text-white leading-none">
                {Math.ceil(((100 - progress) / 100) * 3)}s
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-tighter text-[#14213d]/60">Hold</span>
              <span className="text-[10px] font-black text-[#14213d] tracking-tight">VOUCH</span>
            </div>
          )}
        </button>
      </div>

      {/* Button Helper State Text */}
      <div className="mt-2 text-center select-none">
        <span
          className={`text-[11px] font-medium tracking-wide transition-colors duration-200 ${
            isVouched
              ? 'text-[#fca311] font-semibold flex items-center gap-1 justify-center'
              : isPressing
              ? 'text-[#14213d] font-semibold'
              : 'text-[#14213d]/60'
          }`}
        >
          {isVouched ? (
            <>
              <Sparkles className="w-3 h-3 text-[#fca311]" /> Vouched to Vault
            </>
          ) : isPressing ? (
            'Hold for 3 seconds...'
          ) : (
            'Hold 3s to Vouch'
          )}
        </span>
        <span className="block text-[10px] text-[#14213d]/40 mt-0.5">
          {vouchCount.toLocaleString()} voyagers vouched
        </span>
      </div>
    </div>
  );
};
