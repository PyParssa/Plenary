import React from 'react';
import { Compass, ArrowRight, Sparkles, Shield, MessageSquare, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeModalProps {
  isOpen: boolean;
  onTakeTour: () => void;
  onProceed: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onTakeTour,
  onProceed,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#14213d]/80 px-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-[28px] bg-white p-6 sm:p-8 text-[#14213d] shadow-2xl border border-white/20 overflow-hidden"
        >
          {/* Top Amber Accent Glow */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#fca311] to-amber-500" />

          {/* Header Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#fca311]/15 text-[#fca311]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#fca311]">
              Welcome to Plenary
            </span>
          </div>

          {/* Headline & Subhead */}
          <h2 className="font-serif-clean text-3xl sm:text-4xl text-[#14213d] leading-tight mb-3">
            Illuminating questions for thoughtful minds.
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-[#14213d]/70 mb-6">
            Plenary is a contemplative space to explore questions from great thinkers, anchor insights into your personal vault, and deepen your perspective with Socratic AI.
          </p>

          {/* Quick Feature Highlights */}
          <div className="grid grid-cols-3 gap-2.5 mb-7 p-3 rounded-2xl bg-[#f5f5f5] border border-[#e5e5e5]/80">
            <div className="flex flex-col items-center text-center p-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs text-[#14213d] mb-1.5 border border-[#e5e5e5]">
                <Layers className="w-4 h-4 text-[#fca311]" />
              </div>
              <span className="text-[11px] font-bold text-[#14213d]">The Deck</span>
              <span className="text-[9px] text-[#14213d]/60 leading-tight mt-0.5">Explore curated inquiry cards</span>
            </div>

            <div className="flex flex-col items-center text-center p-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs text-[#14213d] mb-1.5 border border-[#e5e5e5]">
                <Shield className="w-4 h-4 text-[#fca311]" />
              </div>
              <span className="text-[11px] font-bold text-[#14213d]">3s Vouch</span>
              <span className="text-[9px] text-[#14213d]/60 leading-tight mt-0.5">Hold to anchor in your Vault</span>
            </div>

            <div className="flex flex-col items-center text-center p-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs text-[#14213d] mb-1.5 border border-[#e5e5e5]">
                <MessageSquare className="w-4 h-4 text-[#fca311]" />
              </div>
              <span className="text-[11px] font-bold text-[#14213d]">Socratic AI</span>
              <span className="text-[9px] text-[#14213d]/60 leading-tight mt-0.5">Challenge & refine thoughts</span>
            </div>
          </div>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Take a Tour Button */}
            <button
              id="welcome-take-tour-btn"
              type="button"
              onClick={onTakeTour}
              className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-[#14213d] hover:bg-black text-white px-5 py-3.5 text-xs font-bold transition-all shadow-md group cursor-pointer"
            >
              <Compass className="h-4 w-4 text-[#fca311] group-hover:rotate-45 transition-transform" />
              <span>Take a Tour</span>
            </button>

            {/* Proceed to App Button */}
            <button
              id="welcome-proceed-btn"
              type="button"
              onClick={onProceed}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-[#f5f5f5] text-[#14213d] border border-[#e5e5e5] px-5 py-3.5 text-xs font-bold transition-all cursor-pointer group"
            >
              <span>Proceed to App</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#14213d]/60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

