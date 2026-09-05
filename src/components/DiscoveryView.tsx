import React, { useState } from 'react';
import { AuthorProfile, LifeStage, QuestionCard } from '../types';
import {
  Plus,
  CheckCircle,
  BookOpen,
  Bookmark,
  Sparkles,
  X,
  Eye,
  PenTool,
  Quote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiscoveryViewProps {
  authors: AuthorProfile[];
  onAddCustomCard: (newCard: Omit<QuestionCard, 'id' | 'vouched' | 'vouchCount'>) => void;
  onSelectAuthorFilter: (authorName: string) => void;
  onSelectCategory: (category: LifeStage) => void;
  cards: QuestionCard[];
  canCreateCards: boolean;
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
  authors,
  onAddCustomCard,
  onSelectAuthorFilter,
  onSelectCategory,
  cards,
  canCreateCards,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  // Form states for "Craft an Illuminating Card"
  const [question, setQuestion] = useState('');
  const [backstory, setBackstory] = useState('');
  const [category, setCategory] = useState<LifeStage>('Existential Inquiry');
  const [authorName, setAuthorName] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [authorAvatar, setAuthorAvatar] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );
  const [relatedInquiry1, setRelatedInquiry1] = useState('');
  const [relatedInquiry2, setRelatedInquiry2] = useState('');
  const [formError, setFormError] = useState('');

  const handleOpenModalWithAuthor = (author?: AuthorProfile) => {
    if (author) {
      setAuthorName(author.name);
      setBookTitle(author.booksPublished[0] || '');
      setAuthorAvatar(author.avatar);
    } else {
      setAuthorName('');
      setBookTitle('');
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
      setFormError('Please specify the author name and source book.');
      return;
    }

    const relatedInquiries = [relatedInquiry1.trim(), relatedInquiry2.trim()].filter(Boolean);

    onAddCustomCard({
      category,
      author: authorName.trim(),
      authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner & Craft Trigger */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#fca311]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#14213d]/50">
              Creator & Publisher Board
            </span>
          </div>
          <h1 className="font-serif-clean text-3xl sm:text-4xl font-normal text-[#14213d]">
            Discovery
          </h1>
          <p className="text-xs sm:text-sm text-[#14213d]/60 mt-1 max-w-xl">
            Verified authors, philosophers, and contemplative voices whose inquiries anchor our collective compass.
          </p>
        </div>

        {canCreateCards && (
          <button
            id="craft-illuminating-card-button"
            type="button"
            onClick={() => handleOpenModalWithAuthor()}
            className="px-5 py-2.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-xs"
          >
            <PenTool className="w-3.5 h-3.5 text-[#fca311]" />
            <span>Craft an Illuminating Card</span>
          </button>
        )}
      </div>

      <div className="py-6 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-3.5 h-3.5 text-[#fca311]" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#14213d]/60">Browse Categories</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {LIFE_STAGE_OPTIONS.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => onSelectCategory(stage)}
              className="px-3 py-1.5 rounded-full border border-[#e5e5e5] bg-white text-xs text-[#14213d]/75 hover:border-[#14213d]/40 hover:text-[#14213d] transition-colors"
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Author Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
        {authors.map((author) => {
          const authorQuestions = cards.filter((c) =>
            c.author.toLowerCase().includes(author.name.toLowerCase().split(' ')[0])
          );

          return (
            <div
              key={author.id}
              id={`author-card-${author.id}`}
              className="bg-white rounded-3xl border border-[#e5e5e5] p-6 flex flex-col justify-between hover:border-[#14213d]/30 transition-all duration-200 shadow-2xs group"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-center gap-3.5 mb-4">
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-12 h-12 rounded-full object-cover border border-[#e5e5e5]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-[#14213d]">
                        {author.name}
                      </h3>
                      {author.verified && (
                        <CheckCircle className="w-3.5 h-3.5 text-[#fca311]" />
                      )}
                    </div>
                    <span className="text-[11px] text-[#14213d]/60">
                      {author.role}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs text-[#14213d]/75 leading-relaxed mb-4 line-clamp-3 font-normal">
                  {author.bio}
                </p>

                {/* Books Published */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-[#14213d]/40 mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Published Works
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {author.booksPublished.map((book, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#e5e5e5]/50 text-[#14213d]/80 border border-[#e5e5e5]"
                      >
                        {book}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats & Quick Actions */}
              <div className="pt-4 border-t border-[#e5e5e5] flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-[#14213d]/60 font-mono">
                  <Bookmark className="w-3.5 h-3.5 text-[#fca311]" />
                  <span>{author.totalVouches.toLocaleString()} vouches</span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectAuthorFilter(author.name)}
                  className="text-xs text-[#14213d] hover:text-black font-semibold flex items-center gap-1 hover:underline underline-offset-4"
                >
                  <Eye className="w-3.5 h-3.5 text-[#fca311]" />
                  <span>View Cards</span>
                </button>

                {canCreateCards && (
                  <button
                    id={`craft-for-author-${author.id}`}
                    type="button"
                    onClick={() => handleOpenModalWithAuthor(author)}
                    className="text-xs text-[#14213d] hover:text-black font-semibold flex items-center gap-1 hover:underline underline-offset-4"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#fca311]" />
                    <span>Contribute Card</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
                  className="p-1 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d]"
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
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d] font-serif-clean text-base"
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
                      placeholder="e.g. Viktor Frankl"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e5e5e5] focus:border-[#14213d] outline-none text-[#14213d]"
                    />
                  </div>
                </div>

                {/* Source Book Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#14213d] mb-1">
                      Source Book / Essay <span className="text-[#fca311]">*</span>
                    </label>
                    <input
                      id="craft-book-input"
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="e.g. Man's Search for Meaning"
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
                    <Eye className="w-3 h-3" /> Live Deck Preview
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs">
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="inline-flex px-3 py-1 bg-[#e5e5e5]/40 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#14213d]">
                        {category}
                      </span>
                      <span className="text-[#14213d]/60 font-semibold italic text-xs">
                        {authorName || 'Author'} • {bookTitle || 'Source Book'}
                      </span>
                    </div>
                    <p
                      className="font-serif text-xl text-[#14213d] font-light italic leading-snug"
                      style={{ fontFamily: '"Georgia", serif' }}
                    >
                      “{question || 'Your headline question will appear here...'}”
                    </p>
                    <p className="text-[11px] text-[#14213d]/70 mt-2 line-clamp-2">
                      {backstory || 'Context backstory will illuminate this card...'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[#14213d]/60 hover:text-[#14213d] rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-craft-card-btn"
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-full bg-[#14213d] hover:bg-black text-white transition-colors flex items-center gap-1.5 shadow-xs"
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
