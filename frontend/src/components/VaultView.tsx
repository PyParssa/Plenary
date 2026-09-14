import React, { useState } from 'react';
import { QuestionCard, LifeStage } from '../types';
import {
  Bookmark,
  Sparkles,
  ArrowRight,
  Share2,
  Trash2,
  Filter,
  CheckCircle,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface VaultViewProps {
  vouchedCards: QuestionCard[];
  onOpenReflection: (card: QuestionCard) => void;
  onUnvouch: (cardId: string) => void;
  onShareCard: (card: QuestionCard) => void;
  onGoToDeck: () => void;
  onOpenVaultReflection: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  vouchedCards,
  onOpenReflection,
  onUnvouch,
  onShareCard,
  onGoToDeck,
  onOpenVaultReflection,
}) => {
  const [filterStage, setFilterStage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract distinct stages present in vouched cards
  const stages = ['All', ...Array.from(new Set(vouchedCards.map((c) => c.category)))];

  const filteredCards = vouchedCards.filter((card) => {
    const matchesStage = filterStage === 'All' || card.category === filterStage;
    const matchesSearch =
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.book.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#fca311]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#14213d]/50">
              Personal Repository
            </span>
          </div>
          <h1 className="font-serif-clean text-3xl sm:text-4xl font-normal text-[#14213d]">
            My Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#14213d]/60 mt-1 max-w-xl">
            A sanctuary of inquiries you have vouched for with deliberate presence. Revisit them for ongoing contemplation.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white border border-[#e5e5e5] shadow-2xs flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#fca311] fill-[#fca311]" />
            <span className="font-mono text-sm font-bold text-[#14213d]">
              {vouchedCards.length}
            </span>
            <span className="text-xs text-[#14213d]/60">Vouched Inquiries</span>
          </div>
        </div>
      </div>

      {vouchedCards.length > 0 && (
        <button type="button" onClick={onOpenVaultReflection} className="my-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#14213d] px-5 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-black">
          <Sparkles className="h-5 w-5 text-[#fca311]" />
          Reflection - Socratic AI
          <span className="text-xs font-normal text-white/60">Explore your complete vouched collection</span>
        </button>
      )}

      {/* Filter and Search Bar */}
      {vouchedCards.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-6">
          {/* Life Stage Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-[#14213d]/50 mr-1 flex-shrink-0" />
            {stages.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStage(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStage === st
                    ? 'bg-[#14213d] text-white'
                    : 'bg-[#e5e5e5]/40 text-[#14213d]/70 hover:bg-[#e5e5e5] hover:text-[#14213d]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="w-full sm:w-64">
            <input
              id="vault-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by author or phrase..."
              className="w-full px-3.5 py-1.5 rounded-full border border-[#e5e5e5] focus:border-[#14213d] text-xs text-[#14213d] placeholder:text-[#14213d]/40 outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {vouchedCards.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#fca311]/10 border border-[#fca311]/30 mx-auto flex items-center justify-center mb-4">
            <Bookmark className="w-7 h-7 text-[#fca311]" />
          </div>
          <h2 className="font-serif-clean text-2xl text-[#14213d] font-normal mb-2">
            Your Vault is Empty
          </h2>
          <p className="text-xs text-[#14213d]/60 leading-relaxed mb-6">
            Inquiries you hold for 3 seconds on The Deck are anchored here. Begin exploring questions that confront and illuminate.
          </p>
          <button
            id="empty-vault-go-deck-btn"
            type="button"
            onClick={onGoToDeck}
            className="px-5 py-2.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs font-medium transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <span>Enter The Deck</span>
            <ArrowRight className="w-4 h-4 text-[#fca311]" />
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#14213d]/60">
          No vouched questions found matching your filter or search.
        </div>
      ) : (
        /* 2-Column Responsive Breathable Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCards.map((card) => (
            <motion.div
              key={card.id}
              id={`vault-card-${card.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-7 hover:border-[#14213d]/30 transition-all duration-200 flex flex-col justify-between shadow-2xs group"
            >
              <div>
                {/* Meta Top Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex px-3 py-1 bg-[#e5e5e5]/40 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#14213d]">
                    {card.category}
                  </span>

                  <div className="flex items-center gap-2">
                    <img
                      src={card.authorAvatar}
                      alt={card.author}
                      className="w-6 h-6 rounded-full object-cover border border-[#e5e5e5]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-[#14213d] flex items-center gap-1 justify-end">
                        {card.author}
                        <CheckCircle className="w-3 h-3 text-[#fca311] fill-[#fca311]" />
                      </div>
                      <div className="text-[9px] text-[#14213d]/50 max-w-[130px] truncate italic">
                        {card.book}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Headline */}
                <h3
                  className="text-xl sm:text-2xl font-serif font-light italic leading-snug text-[#14213d] mb-3"
                  style={{ fontFamily: '"Georgia", serif' }}
                >
                  “{card.question}”
                </h3>

                {/* Backstory Snippet */}
                <p className="text-xs text-[#14213d]/70 leading-relaxed line-clamp-3 mb-5">
                  {card.backstory}
                </p>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-[#e5e5e5] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    id={`vault-revisit-btn-${card.id}`}
                    type="button"
                    onClick={() => onOpenReflection(card)}
                    className="px-3.5 py-1.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#fca311]" />
                    <span>Revisit Reflection</span>
                  </button>

                  <button
                    id={`vault-share-btn-${card.id}`}
                    type="button"
                    onClick={() => onShareCard(card)}
                    title="Share Inquiry"
                    className="p-1.5 rounded-full border border-[#e5e5e5] hover:border-[#14213d] text-[#14213d] transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Remove from vault */}
                <button
                  id={`vault-unvouch-btn-${card.id}`}
                  type="button"
                  onClick={() => onUnvouch(card.id)}
                  title="Remove from Vault"
                  className="p-1.5 rounded-full hover:bg-[#e5e5e5]/60 text-[#14213d]/40 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
