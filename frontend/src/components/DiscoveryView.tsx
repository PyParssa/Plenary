import React, { useState, useEffect } from 'react';
import { LifeStage, QuestionCard } from '../types';
import { fetchDiscoveryConfig } from '../lib/api';
import {
  DISCOVERY_AUTHORS,
  DISCOVERY_CATEGORIES,
  DiscoveryAuthorCard,
  DiscoveryCategoryCard,
} from '../data/discoveryData';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  PenTool,
  X,
  Layers,
  Compass,
  Plus,
  Quote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiscoveryViewProps {
  cards: QuestionCard[];
  canCreateCards: boolean;
  onAddCustomCard: (newCard: Omit<QuestionCard, 'id' | 'vouched' | 'vouchCount'>) => void;
  onSelectAuthorFilter: (authorKey: string, label: string) => void;
  onSelectCategory: (categoryKey: LifeStage, label: string) => void;
}

const LIFE_STAGE_OPTIONS: LifeStage[] = [
  'Existential Inquiry',
  'Career Reinvention',
  'Solitude & Identity',
  'Mortality & Meaning',
  'Deep Relationships',
  'Creativity & Craft',
  'Midlife Reckoning',
];

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  cards,
  canCreateCards,
  onAddCustomCard,
  onSelectAuthorFilter,
  onSelectCategory,
}) => {
  const [discoveryData, setDiscoveryData] = useState<{ authors: DiscoveryAuthorCard[], categories: DiscoveryCategoryCard[] }>({
    authors: DISCOVERY_AUTHORS,
    categories: DISCOVERY_CATEGORIES
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchDiscoveryConfig().then(data => {
      if (isMounted && data) {
        setDiscoveryData(data);
      }
    }).catch(err => {
      console.error('Failed to fetch dynamic discovery config, falling back to static:', err);
    }).finally(() => {
      if (isMounted) setIsLoadingConfig(false);
    });
    return () => { isMounted = false; };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper to count cards matching an author
  const getAuthorCardCount = (authorKey: string): number => {
    const key = authorKey.toLowerCase().trim();
    return cards.filter(
      (c) => c.published !== false && (c.author.toLowerCase().includes(key) || key.includes(c.author.toLowerCase()))
    ).length;
  };

  // Helper to count cards matching a category
  const getCategoryCardCount = (categoryKey: LifeStage): number => {
    return cards.filter(
      (c) => c.published !== false && c.category.toLowerCase().trim() === categoryKey.toLowerCase().trim()
    ).length;
  };

  // Form states for "Craft an Illuminating Card" modal
  const [question, setQuestion] = useState('');
  const [backstory, setBackstory] = useState('');
  const [category, setCategory] = useState<LifeStage>('Existential Inquiry');
  const [authorName, setAuthorName] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [authorAvatar, setAuthorAvatar] = useState('/assets/default-avatar.svg');
  const [relatedInquiry1, setRelatedInquiry1] = useState('');
  const [relatedInquiry2, setRelatedInquiry2] = useState('');
  const [formError, setFormError] = useState('');

  const handleOpenModal = (author?: DiscoveryAuthorCard) => {
    if (author) {
      setAuthorName(author.name);
      setBookTitle('');
      setAuthorAvatar(author.avatarUrl);
    } else {
      setAuthorName('');
      setBookTitle('');
      setAuthorAvatar('/assets/default-avatar.svg');
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setFormError('Please enter an illuminating question headline.');
      return;
    }
    if (!backstory.trim()) {
      setFormError('Please provide a 2-sentence context backstory.');
      return;
    }
    if (!authorName.trim() || !bookTitle.trim()) {
      setFormError('Please specify the author name and source book/speech.');
      return;
    }

    const relatedInquiries = [relatedInquiry1.trim(), relatedInquiry2.trim()].filter(Boolean);

    onAddCustomCard({
      category,
      author: authorName.trim(),
      authorAvatar: authorAvatar || '/assets/default-avatar.svg',
      book: bookTitle.trim(),
      question: question.trim(),
      backstory: backstory.trim(),
      relatedInquiries:
        relatedInquiries.length > 0
          ? relatedInquiries
          : [
              'What silent assumption must be interrogated here?',
              'How does this shift your immediate priority today?',
            ],
    });

    // Reset and close
    setQuestion('');
    setBackstory('');
    setRelatedInquiry1('');
    setRelatedInquiry2('');
    setIsModalOpen(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#fca311]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#14213d]/50">
              Custom Inquiry Decks
            </span>
          </div>
          <h1 className="font-serif-clean text-3xl sm:text-4xl font-normal text-[#14213d]">
            Discovery
          </h1>
          <p className="text-xs sm:text-sm text-[#14213d]/60 mt-1.5 max-w-xl leading-relaxed">
            Explore focused decks through distinctive intellectual lenses or targeted life transitions.
          </p>
        </div>

        {canCreateCards && (
          <button
            id="craft-illuminating-card-button"
            type="button"
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-xs shrink-0 cursor-pointer self-start md:self-auto"
          >
            <PenTool className="w-3.5 h-3.5 text-[#fca311]" />
            <span>Craft an Illuminating Card</span>
          </button>
        )}
      </div>

      {/* SECTION 1: Author Persona Cards ("Voices") */}
      <div className="py-8 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#fca311]" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#14213d]/70">
              Voices & Thinkers
            </h2>
          </div>
          <span className="text-xs text-[#14213d]/40 hidden sm:inline">
            What would they ask you?
          </span>
        </div>
        <p className="text-xs text-[#14213d]/60 mb-6 max-w-2xl">
          Enter a custom deck anchored in the sharp inquiry of a philosopher, founder, or contemplative creator.
        </p>

        {/* Author Persona Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {discoveryData.authors.map((author) => {
            const count = getAuthorCardCount(author.filterKey);

            return (
              <div
                key={author.id}
                id={`author-persona-${author.id}`}
                style={
                  {
                    '--card-bg': author.accentColor,
                    '--card-bg-dark': author.darkAccentColor,
                  } as React.CSSProperties
                }
                onClick={() => onSelectAuthorFilter(author.filterKey, author.name)}
                className="discovery-card rounded-3xl border border-[#e5e5e5] p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden"
              >
                <div>
                  {/* Top Row: Avatar & Tagline */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <img
                      src={author.avatarUrl}
                      alt={author.name}
                      className="w-12 h-12 rounded-full object-cover border border-[#e5e5e5] shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/assets/default-avatar.svg';
                      }}
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
                        Perspective
                      </span>
                      <h3 className="discovery-author-name text-sm font-bold">
                        {author.name}
                      </h3>
                    </div>
                  </div>

                  {/* Headline Callout: "What would X ask you?" */}
                  <div className="mb-3">
                    <p className="discovery-tagline text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-[#fca311] shrink-0" />
                      <span>{author.tagline}</span>
                    </p>
                    <p className="discovery-quote-box font-serif italic text-sm leading-snug line-clamp-3 p-3.5 rounded-2xl border">
                      “{author.signatureQuestion}”
                    </p>
                  </div>

                  {/* Description / Lens */}
                  <p className="discovery-desc text-[11px] leading-relaxed mb-4">
                    {author.description}
                  </p>
                </div>

                {/* Footer Bar */}
                <div className="discovery-divider pt-3.5 border-t border-black/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#14213d]/60">
                    <Layers className="w-3.5 h-3.5 text-[#fca311]" />
                    <span>{count} {count === 1 ? 'inquiry' : 'inquiries'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canCreateCards && (
                      <button
                        type="button"
                        title={`Contribute card for ${author.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(author);
                        }}
                        className="p-1 rounded-full hover:bg-black/10 text-[#14213d]/70 hover:text-[#14213d] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="text-xs font-semibold text-[#14213d] flex items-center gap-1 group-hover:underline underline-offset-4">
                      <span>Enter Deck</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#fca311] transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Category Cards ("Explore by Theme") */}
      <div className="py-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#fca311]" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#14213d]/70">
              Explore by Theme
            </h2>
          </div>
          <span className="text-xs text-[#14213d]/40 hidden sm:inline">
            Choose your terrain
          </span>
        </div>
        <p className="text-xs text-[#14213d]/60 mb-6 max-w-2xl">
          Immerse in questions curated for specific life moments, career transitions, and deep questions.
        </p>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {discoveryData.categories.map((cat) => {
            const count = getCategoryCardCount(cat.filterKey);

            return (
              <div
                key={cat.id}
                id={`category-card-${cat.id}`}
                style={
                  {
                    '--card-bg': cat.accentColor,
                    '--card-bg-dark': cat.darkAccentColor,
                  } as React.CSSProperties
                }
                onClick={() => onSelectCategory(cat.filterKey, cat.label)}
                className="discovery-card rounded-3xl border border-[#e5e5e5] p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl select-none">{cat.emoji}</span>
                    <span className="discovery-badge text-[10px] px-2.5 py-0.5 rounded-full border font-medium">
                      {count} {count === 1 ? 'card' : 'cards'}
                    </span>
                  </div>

                  <h3 className="discovery-author-name text-base font-bold mb-1">
                    {cat.label}
                  </h3>

                  <p className="discovery-category-tagline text-xs font-semibold mb-2">
                    {cat.tagline}
                  </p>

                  <p className="discovery-desc text-[11px] leading-relaxed mb-4">
                    {cat.description}
                  </p>
                </div>

                <div className="discovery-divider pt-3 border-t border-black/10 flex items-center justify-end">
                  <span className="text-xs font-semibold text-[#14213d] flex items-center gap-1 group-hover:underline underline-offset-4">
                    <span>Open Theme Deck</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#fca311] transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Craft an Illuminating Card" Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5] mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#fca311]/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#fca311]" />
                  </div>
                  <div>
                    <h2 className="font-serif-clean text-xl font-medium text-[#14213d]">
                      Craft an Illuminating Card
                    </h2>
                    <p className="text-[11px] text-[#14213d]/60">
                      Discovery Editorial Submission
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {formError}
                </div>
              )}

              {/* Form & Live Preview Grid */}
              <form onSubmit={handleCreateCard} className="space-y-4">
                {/* Question Headline */}
                <div>
                  <label className="block text-xs font-semibold text-[#14213d] mb-1">
                    Question Headline <span className="text-[#fca311]">*</span>
                  </label>
                  <textarea
                    id="craft-question-input"
                    rows={2}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. What would you attempt if you knew failure was not fatal?"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d] font-serif text-base"
                  />
                </div>

                {/* Backstory (2 sentences) */}
                <div>
                  <label className="block text-xs font-semibold text-[#14213d] mb-1">
                    Context Backstory (2 sentences) <span className="text-[#fca311]">*</span>
                  </label>
                  <textarea
                    id="craft-backstory-input"
                    rows={2}
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value)}
                    placeholder="Provide concise philosophical grounding for why this question matters..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                  />
                </div>

                {/* Life Stage & Author row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Inquiry Category
                    </label>
                    <select
                      id="craft-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as LifeStage)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d] bg-white"
                    >
                      {LIFE_STAGE_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Author Name <span className="text-[#fca311]">*</span>
                    </label>
                    <input
                      id="craft-author-name-input"
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Steve Jobs, Naval Ravikant, Viktor Frankl"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                    />
                  </div>
                </div>

                {/* Source Book / Speech */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Source Book / Address <span className="text-[#fca311]">*</span>
                    </label>
                    <input
                      id="craft-book-input"
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="e.g. Stanford Commencement Address (2005)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Author Avatar Image URL
                    </label>
                    <input
                      id="craft-avatar-input"
                      type="text"
                      value={authorAvatar}
                      onChange={(e) => setAuthorAvatar(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                    />
                  </div>
                </div>

                {/* Related Inquiries */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Related Inquiry 1
                    </label>
                    <input
                      type="text"
                      value={relatedInquiry1}
                      onChange={(e) => setRelatedInquiry1(e.target.value)}
                      placeholder="e.g. What are you postponing?"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Related Inquiry 2
                    </label>
                    <input
                      type="text"
                      value={relatedInquiry2}
                      onChange={(e) => setRelatedInquiry2(e.target.value)}
                      placeholder="e.g. What if not knowing is the work?"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                    />
                  </div>
                </div>

                {/* Live Card Preview Section */}
                <div className="mt-4 pt-4 border-t border-[#e5e5e5]">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-[#14213d]/40 mb-2">
                    <BookOpen className="w-3 h-3" /> Live Deck Preview
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs">
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="inline-flex px-3 py-1 bg-[#e5e5e5]/40 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#14213d]">
                        {category}
                      </span>
                      <span
                        className={`font-semibold italic text-xs ${
                          authorName || bookTitle ? 'text-[#14213d]/60' : 'text-[#14213d]/30 italic'
                        }`}
                      >
                        {authorName || 'Author'} • {bookTitle || 'Source'}
                      </span>
                    </div>
                    <p
                      className={`font-serif text-xl font-light italic leading-snug ${
                        question ? 'text-[#14213d]' : 'text-[#14213d]/30 italic'
                      }`}
                      style={{ fontFamily: '"Georgia", serif' }}
                    >
                      “{question || 'Your headline question will appear here...'}”
                    </p>
                    <p
                      className={`text-[11px] mt-2 line-clamp-2 ${
                        backstory ? 'text-[#14213d]/70' : 'text-[#14213d]/35 italic'
                      }`}
                    >
                      {backstory || 'Context backstory will illuminate this card...'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[#14213d]/60 hover:text-[#14213d] rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-craft-card-btn"
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-full bg-[#14213d] hover:bg-black text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#fca311]" />
                    <span>Publish to Deck</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
