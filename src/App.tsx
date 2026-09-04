/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, GuestProfile, LifeStage, QuestionCard, ReflectionSession } from './types';
import { INITIAL_QUESTIONS, INITIAL_AUTHORS } from './data/initialData';
import { rankQuestions } from './data/journey';
import { TopNav } from './components/TopNav';
import { DeckView } from './components/DeckView';
import { VaultView } from './components/VaultView';
import { AuthorStudioView } from './components/AuthorStudioView';
import { SocraticDrawer } from './components/SocraticDrawer';
import { SupportModal } from './components/SupportModal';
import { ShareModal } from './components/ShareModal';
import { AccountModal } from './components/AccountModal';
import { JourneyPicker } from './components/JourneyPicker';
import { Sparkles, CheckCircle2, Bookmark } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [cards, setCards] = useState<QuestionCard[]>(() => {
    const saved = localStorage.getItem('plenary_cards');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_QUESTIONS;
      }
    }
    return INITIAL_QUESTIONS;
  });

  const [authors] = useState(INITIAL_AUTHORS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('deck');
  const [selectedLifeStage, setSelectedLifeStage] = useState<LifeStage>('All Inquiries');
  const [isNightMode, setIsNightMode] = useState(() => localStorage.getItem('plenary_night_mode') === 'true');
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(() => {
    const saved = localStorage.getItem('plenary_profile');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [isJourneyOpen, setIsJourneyOpen] = useState(() => !localStorage.getItem('plenary_journey'));
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Socratic Drawer State
  const [selectedReflectionCard, setSelectedReflectionCard] = useState<QuestionCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [reflectionSessions, setReflectionSessions] = useState<Record<string, ReflectionSession>>(() => {
    const saved = localStorage.getItem('plenary_reflections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Modals & Toast State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [shareCard, setShareCard] = useState<QuestionCard | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync cards with local storage
  useEffect(() => {
    localStorage.setItem('plenary_cards', JSON.stringify(cards));
  }, [cards]);

  // Sync reflections with local storage
  useEffect(() => {
    localStorage.setItem('plenary_reflections', JSON.stringify(reflectionSessions));
  }, [reflectionSessions]);

  useEffect(() => {
    localStorage.setItem('plenary_night_mode', String(isNightMode));
  }, [isNightMode]);

  useEffect(() => {
    if (guestProfile) localStorage.setItem('plenary_profile', JSON.stringify(guestProfile));
  }, [guestProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Vouch card interaction
  const handleVouchCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            vouched: true,
            vouchedAt: Date.now(),
            vouchCount: c.vouchCount + 1,
          };
        }
        return c;
      })
    );
    showToast('Inquiry vouched and anchored in your Vault');
  };

  const requireAccount = (action: () => void) => {
    if (guestProfile) {
      action();
      return;
    }
    setPendingAction(() => action);
    setIsAccountOpen(true);
  };

  const handleCreateAccount = (email: string) => {
    setGuestProfile({
      email,
      createdAt: Date.now(),
      selectedAtmospheres: guestProfile?.selectedAtmospheres ?? JSON.parse(localStorage.getItem('plenary_journey') ?? '[]'),
    });
    setIsAccountOpen(false);
    pendingAction?.();
    setPendingAction(null);
    showToast('Account created. Your inquiry is now yours to keep.');
  };

  const handleJourneyComplete = (selectedIds: string[]) => {
    localStorage.setItem('plenary_journey', JSON.stringify(selectedIds));
    setGuestProfile((current) => (current ? { ...current, selectedAtmospheres: selectedIds } : current));
    setCards((current) => rankQuestions(current, selectedIds));
    setIsJourneyOpen(false);
    showToast('Your first inquiry has been chosen from your path.');
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'vault' && !guestProfile) {
      requireAccount(() => setActiveTab(tab));
      return;
    }
    setActiveTab(tab);
  };

  const handleUnvouchCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            vouched: false,
            vouchCount: Math.max(0, c.vouchCount - 1),
          };
        }
        return c;
      })
    );
    showToast('Inquiry removed from Vault');
  };

  // Open Socratic AI Drawer
  const handleOpenReflection = (card: QuestionCard) => {
    requireAccount(() => {
      setSelectedReflectionCard(card);
      setIsDrawerOpen(true);
    });
  };

  // Save Socratic session
  const handleSaveSession = (session: ReflectionSession) => {
    setReflectionSessions((prev) => ({
      ...prev,
      [session.cardId]: session,
    }));
  };

  // Add custom card from Author Studio
  const handleAddCustomCard = (
    newCardData: Omit<QuestionCard, 'id' | 'vouched' | 'vouchCount'>
  ) => {
    const newCard: QuestionCard = {
      ...newCardData,
      id: `q-custom-${Date.now()}`,
      vouched: true, // auto-vouch created card
      vouchedAt: Date.now(),
      vouchCount: 1,
    };

    setCards((prev) => [newCard, ...prev]);
    showToast('Illuminating Card published and added to The Deck & Vault!');
    setActiveTab('deck');
  };

  // Filter cards by life stage
  const filteredCards = cards.filter((card) => {
    if (selectedLifeStage === 'All Inquiries') return true;
    return card.category === selectedLifeStage;
  });

  const vouchedCards = cards.filter((c) => c.vouched);

  return (
    <div
      className={`${isNightMode ? 'night-mode' : ''} w-full min-h-screen bg-white text-[#14213d] flex flex-col font-sans selection:bg-[#fca311]/25 transition-colors duration-300 overflow-x-hidden`}
    >
      {/* Top Navigation */}
      <TopNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedLifeStage={selectedLifeStage}
        onSelectLifeStage={setSelectedLifeStage}
        onOpenSupport={() => setIsSupportOpen(true)}
        vouchedCount={vouchedCards.length}
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode((current) => !current)}
        accountEmail={guestProfile?.email}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col items-center justify-start w-full relative">
        <AnimatePresence mode="wait">
          {activeTab === 'deck' && (
            <motion.section
              key="deck-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full flex-1 flex flex-col items-center justify-center"
            >
              <DeckView
                cards={filteredCards}
                onVouchCard={(cardId) => requireAccount(() => handleVouchCard(cardId))}
                onUnvouchCard={(cardId) => requireAccount(() => handleUnvouchCard(cardId))}
                onOpenReflection={handleOpenReflection}
                onShareCard={(card) => setShareCard(card)}
                onSelectRelated={(inquiry) => {
                  showToast(`Exploring related inquiry: "${inquiry.slice(0, 35)}..."`);
                }}
              />
            </motion.section>
          )}

          {activeTab === 'vault' && (
            <motion.section
              key="vault-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <VaultView
                vouchedCards={vouchedCards}
                onOpenReflection={handleOpenReflection}
                onUnvouch={handleUnvouchCard}
                onShareCard={(card) => setShareCard(card)}
                onGoToDeck={() => setActiveTab('deck')}
              />
            </motion.section>
          )}

          {activeTab === 'authors' && (
            <motion.section
              key="authors-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <AuthorStudioView
                authors={authors}
                cards={cards}
                onAddCustomCard={(newCardData) => requireAccount(() => handleAddCustomCard(newCardData))}
                onSelectAuthorFilter={(authorName) => {
                  setSelectedLifeStage('All Inquiries');
                  setActiveTab('deck');
                  showToast(`Curated inquiries by ${authorName}`);
                }}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Socratic AI Slide-Over Drawer */}
      <SocraticDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        card={selectedReflectionCard}
        savedSession={
          selectedReflectionCard ? reflectionSessions[selectedReflectionCard.id] : undefined
        }
        onSaveSession={handleSaveSession}
      />

      {/* Support / Patron Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={!!shareCard}
        onClose={() => setShareCard(null)}
        card={shareCard}
      />

      <AccountModal
        isOpen={isAccountOpen}
        selectedAtmospheres={guestProfile?.selectedAtmospheres ?? JSON.parse(localStorage.getItem('plenary_journey') ?? '[]')}
        onClose={() => {
          setIsAccountOpen(false);
          setPendingAction(null);
        }}
        onCreateAccount={handleCreateAccount}
      />

      {isJourneyOpen && <JourneyPicker onComplete={handleJourneyComplete} />}

      {/* Toast Notification Notification Pill */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#14213d] text-white text-xs font-medium flex items-center gap-2 shadow-xl border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#fca311]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
