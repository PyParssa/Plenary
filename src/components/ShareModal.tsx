import React, { useState } from 'react';
import { QuestionCard } from '../types';
import { Share2, Check, Copy, X, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: QuestionCard | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, card }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !card) return null;

  const quoteSnippet = `“${card.question}”\n\n— ${card.author}, ${card.book}\nVia Plenary: Illuminating Questions`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quoteSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          className="relative w-full max-w-lg bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl p-6 sm:p-7 z-10"
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5] mb-5">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#fca311]" />
              <h3 className="font-serif-clean text-lg font-medium text-[#14213d]">
                Share Inquiry
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Minimalist Share Quote Preview */}
          <div className="p-6 rounded-2xl bg-[#e5e5e5]/30 border border-[#e5e5e5] mb-5 relative overflow-hidden">
            <div className="absolute top-2 right-3 opacity-15">
              <Sparkles className="w-16 h-16 text-[#fca311]" />
            </div>
            <span className="inline-flex px-3 py-1 bg-[#e5e5e5]/50 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#14213d] mb-3">
              {card.category}
            </span>
            <p
              className="font-serif text-xl sm:text-2xl text-[#14213d] leading-snug font-light italic mb-3"
              style={{ fontFamily: '"Georgia", serif' }}
            >
              “{card.question}”
            </p>
            <div className="text-xs text-[#14213d]/70 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#fca311]" />
              <span>
                {card.author} • <em className="not-italic opacity-80">{card.book}</em>
              </span>
            </div>
          </div>

          {/* Copy Button */}
          <button
            id="copy-quote-snippet-btn"
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#fca311]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#fca311]" />
                <span>Copy Quote & Source Citation</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
