import React, { useState } from 'react';
import { Heart, Sparkles, X, Check, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState<number>(5);
  const [tipped, setTipped] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTip = () => {
    setTipped(true);
    setTimeout(() => {
      setTipped(false);
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl p-6 sm:p-7 z-10 text-center"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-full bg-[#fca311]/15 border border-[#fca311]/30 mx-auto flex items-center justify-center mb-3">
            <Heart className="w-6 h-6 text-[#fca311] fill-[#fca311]" />
          </div>

          <h3 className="font-serif-clean text-2xl font-normal text-[#14213d] mb-1">
            Support Plenary
          </h3>
          <p className="text-xs text-[#14213d]/65 leading-relaxed mb-6 max-w-xs mx-auto">
            Plenary is an unhurried, ad-free sanctuary for philosophical inquiry. Your patron support sustains open access for thinkers worldwide.
          </p>

          {tipped ? (
            <div className="py-6 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#14213d] text-white flex items-center justify-center animate-bounce">
                <Check className="w-5 h-5 text-[#fca311]" />
              </div>
              <p className="text-xs font-semibold text-[#14213d]">
                Heartfelt gratitude for holding this ember.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                {[3, 5, 12].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setSelectedTier(amount)}
                    className={`py-3 px-2 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      selectedTier === amount
                        ? 'border-[#14213d] bg-[#14213d] text-white shadow-xs scale-102'
                        : 'border-[#e5e5e5] bg-white text-[#14213d] hover:border-[#14213d]/40'
                    }`}
                  >
                    <span className="font-mono text-sm">${amount}</span>
                    <span className={`text-[10px] font-normal ${selectedTier === amount ? 'text-white/70' : 'text-[#14213d]/50'}`}>
                      {amount === 3 ? 'Ember' : amount === 5 ? 'Vessel' : 'Patron'}
                    </span>
                  </button>
                ))}
              </div>

              <button
                id="confirm-support-tip-btn"
                type="button"
                onClick={handleTip}
                className="w-full py-2.5 rounded-full bg-[#fca311] hover:bg-[#e5950d] text-[#14213d] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Coffee className="w-4 h-4" />
                <span>Tip ${selectedTier} to Support Inquiry</span>
              </button>

              <p className="text-[10px] text-[#14213d]/40 mt-3">
                No subscription required • One-time patron gift
              </p>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
