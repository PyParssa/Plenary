import React from 'react';
import { Compass, ArrowRight, Sparkles } from 'lucide-react';
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
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#14213d]/75 px-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-[32px] bg-white p-8 sm:p-10 text-[#14213d] shadow-2xl border border-[#e5e5e5] text-center flex flex-col items-center"
        >
          {/* Subtle Accent Glow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fca311]/15 text-[#14213d] mb-6 border border-[#fca311]/30">
            <span className="w-2 h-2 rounded-full bg-[#fca311] shadow-[0_0_8px_#fca311]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#14213d]">
              Welcome to Plenary
            </span>
          </div>

          {/* Elegant Serif Headline */}
          <h2
            className="text-3xl sm:text-4xl leading-tight font-serif italic text-[#14213d] mb-4 font-light"
            style={{ fontFamily: '"Georgia", serif' }}
          >
            “Where deep questions meet thoughtful minds.”
          </h2>

          {/* Refined Description */}
          <p className="text-sm leading-relaxed text-[#14213d]/70 max-w-md mb-8">
            Explore timeless inquiries from great thinkers, hold for 3 seconds to anchor questions into your personal Vault, and deepen your perspective with Socratic AI.
          </p>

          {/* Dual Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3 items-stretch justify-center">
            {/* Take a Tour Button */}
            <button
              id="welcome-take-tour-btn"
              type="button"
              onClick={onTakeTour}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#14213d] hover:bg-black text-white px-6 py-3.5 text-xs font-semibold transition-all shadow-md cursor-pointer group"
            >
              <Compass className="h-4 w-4 text-[#fca311] group-hover:rotate-45 transition-transform" />
              <span>Take a Tour</span>
            </button>

            {/* Proceed to App Button */}
            <button
              id="welcome-proceed-btn"
              type="button"
              onClick={onProceed}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#f5f5f5] text-[#14213d] border border-[#e5e5e5] hover:border-[#14213d]/30 px-6 py-3.5 text-xs font-semibold transition-all cursor-pointer group"
            >
              <span>Proceed to App</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#14213d]/60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <p className="text-[11px] text-[#14213d]/45 mt-5">
            You can also replay the tour anytime from your Account settings.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
