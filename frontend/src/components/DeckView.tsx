import React, { useState } from 'react';
import { QuestionCard } from '../types';
import { VouchButton } from './VouchButton';
import {
  ChevronRight,
  ChevronLeft,
  Share2,
  Sparkles,
  CheckCircle,
  BookOpen,
  ArrowRight,
  MessageSquareQuote,
  Flame,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { EmptyState } from './EmptyState';

export interface DiscoveryFilterState {
  type: 'author' | 'category';
  key: string;
  label: string;
}

interface DeckViewProps {
  cards: QuestionCard[];
  onVouchCard: (cardId: string) => void;
  onUnvouchCard: (cardId: string) => void;
  onOpenReflection: (card: QuestionCard) => void;
  onShareCard: (card: QuestionCard) => void;
  onSelectRelated: (inquiryText: string) => void;
  discoveryFilter?: DiscoveryFilterState | null;
  onClearDiscoveryFilter?: () => void;
}

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  onVouchCard,
  onUnvouchCard,
  onOpenReflection,
  onShareCard,
  onSelectRelated,
  discoveryFilter,
  onClearDiscoveryFilter,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const visibleCards = cards.filter((c) => {
    if (c.published === false) return false;
    if (!discoveryFilter) return true;
    if (discoveryFilter.type === 'author') {
      const authorQuery = discoveryFilter.key.toLowerCase().trim();
      const cardAuthor = c.author.toLowerCase().trim();
      return cardAuthor.includes(authorQuery) || authorQuery.includes(cardAuthor);
    }
    if (discoveryFilter.type === 'category') {
      return c.category.toLowerCase().trim() === discoveryFilter.key.toLowerCase().trim();
    }
    return true;
  });

  // Fallback if cards array is empty
  if (visibleCards.length === 0) {
    return (
      <EmptyState
        testId="empty-deck-state"
        illustration="/assets/empty-states/no-results.svg"
        headline={discoveryFilter ? `No Inquiries for "${discoveryFilter.label}"` : 'The Deck is Quiet'}
        subtext={
          discoveryFilter
            ? 'No questions match this custom deck filter yet. Return to the full deck or explore other voices.'
            : "No questions found under this filter. Try selecting 'All Inquiries' or craft a new illuminating card in Discovery."
        }
        ctaLabel={discoveryFilter ? 'Back to Full Deck' : undefined}
        onCta={discoveryFilter ? onClearDiscoveryFilter : undefined}
      />
    );
  }

  const activeIndex = currentIndex % visibleCards.length;
  const currentCard = visibleCards[activeIndex];
  const nextCard = visibleCards[(activeIndex + 1) % visibleCards.length];

  const handleNext = () => {
    setSwipeDirection('right');
    setCurrentIndex((prev) => (prev + 1) % visibleCards.length);
    window.setTimeout(() => setSwipeDirection(null), 120);
  };

  const handlePrev = () => {
    setSwipeDirection('left');
    setCurrentIndex((prev) => (prev - 1 + visibleCards.length) % visibleCards.length);
    window.setTimeout(() => setSwipeDirection(null), 120);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
      {/* Custom Deck Filter Banner */}
      {discoveryFilter && (
        <div className="discovery-banner w-full mb-4 px-4 py-2.5 bg-[#fca311]/10 border border-[#fca311]/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#14213d] shadow-2xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#fca311] shrink-0" />
            <span className="truncate">
              Custom Deck: <strong className="font-semibold">{discoveryFilter.label}</strong> ({visibleCards.length} {visibleCards.length === 1 ? 'card' : 'cards'})
            </span>
          </div>
          {onClearDiscoveryFilter && (
            <button
              type="button"
              onClick={onClearDiscoveryFilter}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-[#14213d] hover:text-white border border-[#e5e5e5] text-[11px] font-medium text-[#14213d] transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Back to Full Deck</span>
              <X className="w-3 h-3 text-[#fca311]" />
            </button>
          )}
        </div>
      )}

      {/* Deck Breadcrumb / Counter Indicator */}
      <div className="w-full flex items-center justify-between text-xs text-[#14213d]/60 mb-5 px-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[#14213d]">
            <Flame className="w-3.5 h-3.5 text-[#fca311]" />
            Card {activeIndex + 1} of {visibleCards.length}
          </span>
          <span className="text-[#e5e5e5]">•</span>
          <span className="text-[11px]">{currentCard.category}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#14213d]/50 hidden sm:inline">
            Swipe or use arrow keys
          </span>
        </div>
      </div>

      {/* Card Stack Container */}
      <div className="relative w-full min-h-[580px] flex items-center justify-center">
        {/* Natural Tones Background Depth Stack Cards */}
        <div
          aria-hidden="true"
          className="absolute w-[440px] max-w-[90vw] h-[580px] bg-white border border-[#e5e5e5] rounded-[32px] rotate-[-2deg] opacity-40 translate-y-2 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute w-[440px] max-w-[90vw] h-[580px] bg-white border border-[#e5e5e5] rounded-[32px] rotate-[1deg] opacity-60 translate-y-1 pointer-events-none"
        />

        {/* Active Swipeable Card */}
        <AnimatePresence mode="wait">
          <SwipeableCard
            key={currentCard.id}
            card={currentCard}
            onSwipeLeft={handlePrev}
            onSwipeRight={handleNext}
            onVouchSuccess={() => onVouchCard(currentCard.id)}
            onUnvouch={() => onUnvouchCard(currentCard.id)}
            onOpenReflection={() => onOpenReflection(currentCard)}
            onShare={() => onShareCard(currentCard)}
            onSelectRelated={onSelectRelated}
            direction={swipeDirection}
          />
        </AnimatePresence>
      </div>

      {/* Bottom Sub-Action Navigation Indicator */}
      <div className="mt-8 flex items-center gap-6 select-none">
        <button
          id="deck-prev-card-btn"
          type="button"
          onClick={handlePrev}
          aria-label="Previous inquiry card"
          className="flex items-center gap-1 text-xs text-[#14213d]/60 hover:text-[#14213d] transition-colors py-1.5 px-3 rounded-full hover:bg-[#e5e5e5]/40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-medium">Previous</span>
        </button>

        <div className="h-4 w-px bg-[#e5e5e5]" />

        <button
          id="deck-next-card-btn"
          type="button"
          onClick={handleNext}
          aria-label="Next inquiry card"
          className="flex items-center gap-1 text-xs text-[#14213d]/60 hover:text-[#14213d] transition-colors py-1.5 px-3 rounded-full hover:bg-[#e5e5e5]/40"
        >
          <span className="font-medium">Next Inquiry</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface SwipeableCardProps {
  card: QuestionCard;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onVouchSuccess: () => void;
  onUnvouch: () => void;
  onOpenReflection: () => void;
  onShare: () => void;
  onSelectRelated: (inquiry: string) => void;
  direction: 'left' | 'right' | null;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  card,
  onSwipeLeft,
  onSwipeRight,
  onVouchSuccess,
  onUnvouch,
  onOpenReflection,
  onShare,
  onSelectRelated,
  direction,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 110) {
      onSwipeRight();
    } else if (info.offset.x < -110) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      id={`card-${card.id}`}
      data-tour="tour-first-card"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{
        scale: 0.96,
        opacity: 0,
        x: direction === 'left' ? -80 : direction === 'right' ? 80 : 0,
      }}
      animate={{ scale: 1, opacity: 1, x: 0 }}
      exit={{
        scale: 0.94,
        opacity: 0,
        x: direction === 'left' ? -120 : direction === 'right' ? 120 : 0,
      }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="relative w-[460px] max-w-[92vw] min-h-[580px] bg-white border border-[#e5e5e5] rounded-[32px] shadow-xl p-8 sm:p-10 flex flex-col items-center text-center justify-between cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top Meta & Content Section */}
      <div className="flex flex-col items-center w-full">
        {/* Category Badge */}
        <div
          id={`category-badge-${card.id}`}
          className="inline-flex px-3 py-1 bg-[#e5e5e5]/40 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#14213d] mb-6 sm:mb-8"
        >
          {card.category}
        </div>

        {/* Author & Source Tag */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-[#e5e5e5] bg-[#e5e5e5]">
            <img
              src={card.authorAvatar}
              alt={card.author}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/default-avatar.svg';
              }}
            />
          </div>
          <span className="text-xs font-medium text-[#14213d]">{card.author}</span>
          <CheckCircle className="w-3 h-3 text-[#fca311] fill-[#fca311]" />
          <span className="text-xs italic opacity-40 text-[#14213d] max-w-[180px] truncate">
            {card.book}
          </span>
        </div>

        {/* Main Headline Question */}
        <h2
          id={`question-headline-${card.id}`}
          className="text-3xl sm:text-4xl leading-tight font-serif mb-6 sm:mb-8 italic font-light text-[#14213d]"
          style={{ fontFamily: '"Georgia", serif' }}
        >
          “{card.question}”
        </h2>

        {/* Backstory Context */}
        <p className="text-sm leading-relaxed opacity-70 mb-6 sm:mb-8 max-w-[320px] text-[#14213d]">
          {card.backstory}
        </p>

        {/* Related Inquiries (Clickable chips) */}
        {card.relatedInquiries && card.relatedInquiries.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
            {card.relatedInquiries.slice(0, 2).map((inquiry, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRelated(inquiry);
                }}
                className="px-3 py-1 border border-[#e5e5e5] hover:border-[#14213d]/40 rounded-full text-[10px] font-medium text-[#14213d] bg-white transition-colors cursor-pointer"
              >
                #{inquiry.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || `Inquiry${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="w-full flex flex-col items-center">
        <div className="flex items-center justify-center gap-8 sm:gap-10 w-full">
          {/* Skip Button */}
          <button
            id={`skip-card-btn-${card.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSwipeLeft();
            }}
            title="Skip to next card"
            className="w-12 h-12 rounded-full border border-[#14213d] flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity bg-white outline-none cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[#14213d]" />
          </button>

          {/* Core VOUCH Button (3s Hold Mechanic) */}
          <div className="relative" data-tour="tour-vouch-btn">
            <VouchButton
              id={`vouch-btn-${card.id}`}
              isVouched={card.vouched}
              onVouchSuccess={onVouchSuccess}
              onUnvouch={onUnvouch}
              vouchCount={card.vouchCount}
            />
          </div>

          {/* Share Button */}
          <button
            id={`share-card-btn-${card.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            title="Share question"
            className="w-12 h-12 rounded-full border border-[#14213d] flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity bg-white outline-none cursor-pointer"
          >
            <Share2 className="w-4 h-4 stroke-[#14213d]" />
          </button>
        </div>

        {/* Surface Drawer Trigger: "Reflect with AI" when vouched */}
        {card.vouched && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-3 border-t border-[#e5e5e5] w-full flex items-center justify-between"
          >
            <div className="text-[11px] text-[#14213d]/70 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#fca311]" />
              <span>Ready for Socratic reflection</span>
            </div>
            <button
              id={`reflect-with-ai-btn-${card.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReflection();
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span>Reflect with AI</span>
              <ArrowRight className="w-3 h-3 text-[#fca311]" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
