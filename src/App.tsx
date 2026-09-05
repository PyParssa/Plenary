/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, GuestProfile, LifeStage, LlmSettings, QuestionCard, ReflectionSession } from './types';
import { INITIAL_QUESTIONS, INITIAL_AUTHORS } from './data/initialData';
import { rankQuestions } from './data/journey';
import { TopNav } from './components/TopNav';
import { DeckView } from './components/DeckView';
import { VaultView } from './components/VaultView';
import { DiscoveryView } from './components/DiscoveryView';
import { AccountView } from './components/AccountView';
import { SocraticDrawer } from './components/SocraticDrawer';
import { SupportModal } from './components/SupportModal';
import { ShareModal } from './components/ShareModal';
import { AccountModal } from './components/AccountModal';
import { JourneyPicker } from './components/JourneyPicker';
import { Sparkles, CheckCircle2, Bookmark } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from './lib/supabase';
import { applyVouches, loadUserData, removeVouch, saveCard, savePreferences, saveProfile, saveReflection, saveVouch } from './lib/database';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('deck');
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
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedLifeStage, setSelectedLifeStage] = useState<LifeStage>('All Inquiries');
  const [isNightMode, setIsNightMode] = useState(() => localStorage.getItem('plenary_night_mode') === 'true');
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [llmSettings, setLlmSettings] = useState<LlmSettings>(() => {
    const saved = localStorage.getItem('plenary_llm_settings');
    if (saved) {
      try { return JSON.parse(saved) as LlmSettings; } catch { /* use defaults */ }
    }
    return { provider: 'openai', apiKey: '', model: 'gpt-4o-mini' };
  });

  const handleOpenAccount = () => {
    setActiveTab('account');
    if (!guestProfile) setIsAccountOpen(true);
  };

  const handleUpdateProfile = async (displayName: string) => {
    if (!userId || !guestProfile) throw new Error('Please sign in to update your username.');
    const nextName = displayName.trim();
    if (!nextName) throw new Error('Username cannot be empty.');
    const { error } = await supabase.auth.updateUser({ data: { display_name: nextName } });
    if (error) throw error;
    await saveProfile(userId, guestProfile.email, nextName);
    setGuestProfile({ ...guestProfile, displayName: nextName });
  };

  const handleDeleteAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'Unable to delete your account.');
    await supabase.auth.signOut();
    setUserId(null);
    setGuestProfile(null);
    setActiveTab('deck');
    showToast('Your account has been deleted.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setGuestProfile(null);
    setActiveTab('deck');
    showToast('You have been logged out.');
  };

  const handleSaveLlmSettings = (settings: LlmSettings) => {
    setLlmSettings(settings);
    localStorage.setItem('plenary_llm_settings', JSON.stringify(settings));
  };

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
    if (userId) void saveVouch(userId, cardId).catch((error) => console.error('Could not save vouch:', error));
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

  const handleCreateAccount = (email: string, displayName?: string) => {
    setGuestProfile({
      email,
      displayName,
      createdAt: Date.now(),
      selectedAtmospheres: guestProfile?.selectedAtmospheres ?? JSON.parse(localStorage.getItem('plenary_journey') ?? '[]'),
    });
    if (userId) void saveProfile(userId, email, displayName).catch((error) => console.error('Could not save profile:', error));
    setIsAccountOpen(false);
    pendingAction?.();
    setPendingAction(null);
    showToast('Account created. Your inquiry is now yours to keep.');
  };

  useEffect(() => {
    let isMounted = true;
    let authenticatedUserId: string | null = null;

    const hydrateSession = async (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
      allowSessionRecheck = true,
    ) => {
      if (!isMounted) return;

      setIsAuthReady(false);

      if (!session?.user?.id && allowSessionRecheck) {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession.session?.user?.id) {
          await hydrateSession(currentSession.session, false);
          return;
        }
        if (authenticatedUserId) return;
      }

      if (!session?.user?.id) {
        setUserId(null);
        setGuestProfile(null);
        setIsAuthReady(true);
        return;
      }

      authenticatedUserId = session.user.id;
      setUserId(session.user.id);
      const sessionEmail = session.user.email ?? '';
      const sessionDisplayName = typeof session.user.user_metadata?.display_name === 'string'
        ? session.user.user_metadata.display_name
        : typeof session.user.user_metadata?.full_name === 'string'
          ? session.user.user_metadata.full_name
          : undefined;
      if (sessionEmail) {
        const bootstrapResponse = session.access_token
          ? await fetch('/api/account/bootstrap', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
          : null;
        if (bootstrapResponse && !bootstrapResponse.ok) {
          console.error('Could not bootstrap authenticated user profile:', await bootstrapResponse.text());
        }
        await saveProfile(session.user.id, sessionEmail, sessionDisplayName).catch((error) => {
          console.error('Could not create authenticated user profile:', error);
        });
      }
      try {
        const saved = await loadUserData(session.user.id);
        if (!isMounted) return;
        const selectedAtmospheres = saved.profile?.selectedAtmospheres ?? JSON.parse(localStorage.getItem('plenary_journey') ?? '[]');
        setGuestProfile({
          email: saved.profile?.email ?? session.user.email ?? '',
          displayName: saved.profile?.displayName ?? session.user.user_metadata?.display_name,
          createdAt: saved.profile?.createdAt ?? Date.now(),
          selectedAtmospheres,
        });
        setCards((current) => saved.cards.length > 0
          ? applyVouches(saved.cards, saved.vouchedCardIds)
          : applyVouches(current, saved.vouchedCardIds));
        setReflectionSessions(saved.reflections);
        setIsJourneyOpen(selectedAtmospheres.length === 0);
      } catch (error) {
        console.error('Could not load account data:', error);
        setGuestProfile({
          email: session.user.email,
          createdAt: Date.now(),
          selectedAtmospheres: JSON.parse(localStorage.getItem('plenary_journey') ?? '[]'),
        });
        setIsJourneyOpen(!localStorage.getItem('plenary_journey'));
      }
      setIsAuthReady(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') authenticatedUserId = null;
      void hydrateSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => void hydrateSession(session));

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleJourneyComplete = (selectedIds: string[]) => {
    localStorage.setItem('plenary_journey', JSON.stringify(selectedIds));
    setGuestProfile((current) => (current ? { ...current, selectedAtmospheres: selectedIds } : current));
    if (userId) void savePreferences(userId, selectedIds).catch((error) => console.error('Could not save preferences:', error));
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

  const handleSelectDiscoveryAuthor = (authorName: string | null) => {
    setSelectedAuthor(authorName);
    setSelectedLifeStage('All Inquiries');
    setActiveTab('deck');
  };

  const handleSelectDiscoveryCategory = (category: LifeStage | null) => {
    setSelectedAuthor(null);
    setSelectedLifeStage(category ?? 'All Inquiries');
    setActiveTab('deck');
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
    if (userId) void removeVouch(userId, cardId).catch((error) => console.error('Could not remove vouch:', error));
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
    if (userId) void saveReflection(userId, session).catch((error) => console.error('Could not save reflection:', error));
  };

  // Add a custom card from Discovery
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
    if (userId) void saveCard(userId, newCard).catch((error) => console.error('Could not save card:', error));
    showToast('Illuminating Card published and added to The Deck & Vault!');
    setActiveTab('deck');
  };

  // Filter cards by life stage
  const filteredCards = cards.filter((card) => {
    const matchesCategory = selectedLifeStage === 'All Inquiries' || card.category === selectedLifeStage;
    const matchesAuthor = !selectedAuthor || card.author === selectedAuthor;
    return matchesCategory && matchesAuthor;
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
        onOpenAccount={handleOpenAccount}
        onLogout={handleLogout}
        vouchedCount={cards.filter((c) => c.vouched).length}
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode(!isNightMode)}
        accountEmail={guestProfile?.email}
        accountName={guestProfile?.displayName}
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
                onOpenVaultReflection={() => requireAccount(() => {
                  setSelectedReflectionCard(null);
                  setIsDrawerOpen(true);
                })}
                onUnvouch={handleUnvouchCard}
                onShareCard={(card) => setShareCard(card)}
                onGoToDeck={() => setActiveTab('deck')}
              />
            </motion.section>
          )}

          {activeTab === 'discovery' && (
            <motion.section
              key="discovery-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <DiscoveryView
                authors={authors}
                cards={cards}
                onAddCustomCard={(newCardData) => requireAccount(() => handleAddCustomCard(newCardData))}
                onSelectAuthorFilter={handleSelectDiscoveryAuthor}
                onSelectCategory={handleSelectDiscoveryCategory}
              />
            </motion.section>
          )}

          {activeTab === 'account' && (
            <motion.section
              key="account-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <AccountView profile={guestProfile} onUpdateProfile={handleUpdateProfile} onDeleteAccount={handleDeleteAccount} llmSettings={llmSettings} onSaveLlmSettings={handleSaveLlmSettings} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Socratic AI Slide-Over Drawer */}
      <SocraticDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        card={selectedReflectionCard}
        cards={selectedReflectionCard ? [selectedReflectionCard] : vouchedCards}
        apiSettings={llmSettings}
        savedSession={selectedReflectionCard ? reflectionSessions[selectedReflectionCard.id] : reflectionSessions['__vault__']}
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
