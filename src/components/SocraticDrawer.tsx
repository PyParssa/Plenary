import React, { useState, useEffect, useRef } from 'react';
import { QuestionCard, ChatMessage, ReflectionSession } from '../types';
import { X, Send, Sparkles, Bot, User, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocraticDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: QuestionCard | null;
  savedSession?: ReflectionSession;
  onSaveSession: (session: ReflectionSession) => void;
}

export const SocraticDrawer: React.FC<SocraticDrawerProps> = ({
  isOpen,
  onClose,
  card,
  savedSession,
  onSaveSession,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turn, setTurn] = useState(1);
  const maxTurns = 5;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or restore session whenever the card or drawer opens
  useEffect(() => {
    if (!isOpen || !card) return;

    if (savedSession && savedSession.messages.length > 0) {
      setMessages(savedSession.messages);
      setTurn(Math.min(maxTurns, savedSession.turnsCompleted + 1));
    } else {
      // Craft an illuminating opening reflection prompt from Socratic AI
      const openingMessage: ChatMessage = {
        id: `msg-init-${card.id}`,
        role: 'assistant',
        content: `Welcome to this inquiry. ${card.author} framed this question inside '${card.book}'. When you hold the thought—"${card.question}"—what is the immediate internal resistance or quiet truth that surfaces in your mind?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([openingMessage]);
      setTurn(1);
    }
  }, [isOpen, card?.id]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputVal.trim() || isLoading || !card) return;

    const userText = inputVal.trim();
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    const currentTurn = turn;
    const isFinalTurn = currentTurn >= maxTurns;

    try {
      // Call server-side Gemini API endpoint
      const response = await fetch('/api/socratic-reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.question,
          backstory: card.backstory,
          author: card.author,
          book: card.book,
          currentTurn,
          maxTurns,
          messages: updatedMessages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
          })),
        }),
      });

      let aiReply = '';
      if (response.ok) {
        const data = await response.json();
        aiReply = data.reply;
      } else {
        // Fallback contextual response if server is offline or response not ok
        aiReply = getContextualSocraticFallback(card, userText, currentTurn);
      }

      const newAssistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, newAssistantMessage];
      setMessages(finalMessages);

      const nextTurn = Math.min(maxTurns, currentTurn + 1);
      setTurn(nextTurn);

      // Persist session
      onSaveSession({
        cardId: card.id,
        turnsCompleted: currentTurn,
        maxTurns,
        messages: finalMessages,
        completed: isFinalTurn,
      });
    } catch {
      // Offline fallback
      const aiReply = getContextualSocraticFallback(card, userText, currentTurn);
      const newAssistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, newAssistantMessage];
      setMessages(finalMessages);
      setTurn(Math.min(maxTurns, currentTurn + 1));

      onSaveSession({
        cardId: card.id,
        turnsCompleted: currentTurn,
        maxTurns,
        messages: finalMessages,
        completed: isFinalTurn,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRestartDialogue = () => {
    if (!card) return;
    const openingMessage: ChatMessage = {
      id: `msg-restart-${Date.now()}`,
      role: 'assistant',
      content: `Let us begin afresh. "${card.question}" In this moment, without self-censorship, what does this question ask you to let go of?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([openingMessage]);
    setTurn(1);
    onSaveSession({
      cardId: card.id,
      turnsCompleted: 0,
      maxTurns,
      messages: [openingMessage],
      completed: false,
    });
  };

  if (!isOpen || !card) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          id="socratic-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-over Drawer */}
        <motion.div
          id="socratic-drawer-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-[#e5e5e5] flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#e5e5e5] bg-[#e5e5e5]/10 flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#fca311]">
                Socratic AI
              </h3>
              <p className="text-xs font-semibold mt-0.5 text-[#14213d]">
                Guided Reflection
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRestartDialogue}
                title="Restart inquiry"
                className="p-1.5 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                id="close-socratic-drawer-button"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Pinned Question Banner at Top */}
          <div
            id="pinned-question-banner"
            className="px-5 py-3 bg-[#e5e5e5]/20 border-b border-[#e5e5e5] flex flex-col gap-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-[#14213d]/60 font-medium">
              <span className="uppercase tracking-wider font-bold text-[9px]">
                {card.category}
              </span>
              <span>
                {card.author} • <em className="not-italic opacity-80">{card.book}</em>
              </span>
            </div>
            <p className="font-serif text-sm text-[#14213d] leading-snug font-medium italic">
              “{card.question}”
            </p>
          </div>

          {/* Conversation Message List */}
          <div
            id="socratic-chat-messages"
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`text-xs leading-relaxed max-w-[85%] p-3.5 rounded-2xl ${
                    msg.role === 'user'
                      ? 'border border-[#e5e5e5] bg-white text-[#14213d]'
                      : 'bg-[#e5e5e5]/30 text-[#14213d]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl bg-[#e5e5e5]/30 text-xs flex items-center gap-2 text-[#14213d]/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fca311] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fca311] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fca311] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px]">Contemplating...</span>
                </div>
              </div>
            )}

            {turn > maxTurns && (
              <div className="my-2 p-3.5 rounded-2xl bg-[#fca311]/10 border border-[#fca311]/30 text-xs text-[#14213d]">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#14213d]">
                  <CheckCircle2 className="w-4 h-4 text-[#fca311]" />
                  5-Turn Socratic Deep Reflection Complete
                </div>
                <p className="text-[11px] leading-relaxed text-[#14213d]/80">
                  This reflection dialogue is etched in your vault. You can revisit it anytime.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="p-4 border-t border-[#e5e5e5] bg-white">
            <div className="flex flex-col gap-2">
              <div className="text-[9px] font-bold text-[#14213d]/40 uppercase tracking-wider">
                TURN {Math.min(turn, maxTurns)} OF {maxTurns} (Deep Reflection)
              </div>
              <div className="flex gap-2 items-center">
                <input
                  id="socratic-input-textarea"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Reflect further..."
                  className="flex-1 bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#fca311] text-[#14213d] placeholder:text-[#14213d]/40"
                />
                <button
                  id="send-socratic-message-button"
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputVal.trim() || isLoading}
                  aria-label="Send reflection message"
                  className="w-8 h-8 bg-[#fca311] hover:bg-[#e5950d] rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// High-caliber Socratic fallback logic when offline or server is warming up
function getContextualSocraticFallback(
  card: QuestionCard,
  userText: string,
  turn: number
): string {
  const words = userText.toLowerCase();

  if (turn === 1) {
    return `Notice what you just highlighted. You speak of "${userText.slice(
      0,
      40
    )}..." If you peel back the practical reasons, what belief about your own worth is silently steering this reaction?`;
  }

  if (turn === 2) {
    if (words.includes('fear') || words.includes('fail') || words.includes('afraid')) {
      return `Fear is often our mind's dramatic exaggeration of physical harm when only ego is at stake. How does ${card.author}'s premise—that failure is rarely fatal—alter your willingness to take the next step?`;
    }
    return `There is a distinct tension between what you know intellectually and what your habits allow. What would happen if you ceased trying to resolve this tension immediately and simply stood beside it?`;
  }

  if (turn === 3) {
    return `If you looked back at this specific dilemma ten years from today, would you mourn the discomfort of having taken action, or the polite comfort of staying silent?`;
  }

  if (turn === 4) {
    return `Notice how your focus has shifted during our turns. What is the single, non-negotiable boundary you must set today to honor the clarity you just described?`;
  }

  return `We have completed our five turns. Take a breath. The question was never meant to be solved like an arithmetic problem; it is a lens to live with. May this clarity stay close to your hands today.`;
}
