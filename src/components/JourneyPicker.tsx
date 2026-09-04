import React, { useState } from 'react';
import { ArrowRight, Check, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { ATMOSPHERE_CHOICES } from '../data/journey';

interface JourneyPickerProps {
  onComplete: (selectedIds: string[]) => void;
}

export const JourneyPicker: React.FC<JourneyPickerProps> = ({ onComplete }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleChoice = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return [...current.slice(1), id];
      return [...current, id];
    });
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#14213d]/95 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center">
        <div className="mb-8 max-w-xl">
          <div className="mb-4 flex items-center gap-2 text-[#fca311]">
            <Compass className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em]">Your first inquiry</span>
          </div>
          <h2 className="font-serif-clean text-4xl leading-none sm:text-6xl">Where does your mind want to begin?</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
            Choose up to three places. We will use the pattern in your choices to place a question in front of you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          {ATMOSPHERE_CHOICES.map((choice, index) => {
            const isSelected = selectedIds.includes(choice.id);
            return (
              <motion.button
                key={choice.id}
                type="button"
                onClick={() => toggleChoice(choice.id)}
                whileHover={{ y: -5 }}
                className={`group relative aspect-[0.78] overflow-hidden rounded-[24px] border text-left transition-all ${
                  isSelected ? 'border-[#fca311] ring-2 ring-[#fca311]/60' : 'border-white/15'
                }`}
              >
                <img src={`/assets/journey/${choice.id}.jpg`} alt={choice.label} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = choice.image; }} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/20 text-xs">
                  {isSelected ? <Check className="h-4 w-4 text-[#fca311]" /> : index + 1}
                </div>
                <div className="absolute inset-x-4 bottom-4">
                  <p className="font-serif-clean text-2xl leading-none">{choice.label}</p>
                  <p className="mt-1 text-[10px] leading-snug text-white/65">{choice.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <span className="text-xs text-white/45">{selectedIds.length} of 3 choices selected</span>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => onComplete(selectedIds)}
            className="inline-flex items-center gap-2 rounded-full bg-[#fca311] px-5 py-3 text-xs font-bold text-[#14213d] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
          >
            Begin the deck <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};