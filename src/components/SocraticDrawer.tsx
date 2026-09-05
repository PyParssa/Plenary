import React, { useState, useEffect, useRef } from 'react';
import { QuestionCard, ChatMessage, LlmSettings, ReflectionSession } from '../types';
import { X, Send, Sparkles, Bot, User, Download, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocraticDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: QuestionCard | null;
  cards: QuestionCard[];
  apiSettings: LlmSettings;
  savedSession?: ReflectionSession;
  onSaveSession: (session: ReflectionSession) => void;
}

export const SocraticDrawer: React.FC<SocraticDrawerProps> = ({
  isOpen,
  onClose,
  card,
  cards,
  apiSettings,
  savedSession,
  onSaveSession,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turn, setTurn] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or restore session whenever the card or drawer opens
  useEffect(() => {
    if (!isOpen || cards.length === 0) return;

    if (savedSession && savedSession.messages.length > 0) {
      setMessages(savedSession.messages);
      setTurn(savedSession.turnsCompleted + 1);
    } else {
      // Craft an illuminating opening reflection prompt from Socratic AI
      const openingMessage: ChatMessage = {
        id: `msg-init-${card?.id ?? 'vault'}`,
        role: 'assistant',
        content: card
          ? `Welcome to this inquiry. ${card.author} framed this question inside '${card.book}'. When you hold the thought—"${card.question}"—what is the immediate internal resistance or quiet truth that surfaces in your mind?`
          : `Welcome to your vouched inquiries. I have brought ${cards.length} cards into this reflection. Which question is asking for your attention first, and what does it reveal about the life you are currently living?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([openingMessage]);
      setTurn(1);
    }
  }, [isOpen, card?.id, cards.length]);

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
    if (!inputVal.trim() || isLoading || cards.length === 0) return;

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
    try {
      // Call server-side Gemini API endpoint
      const response = await fetch('/api/socratic-reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiSettings,
          cards,
          currentTurn,
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

      const nextTurn = currentTurn + 1;
      setTurn(nextTurn);

      // Persist session
      onSaveSession({
        cardId: card?.id ?? '__vault__',
        turnsCompleted: currentTurn,
        maxTurns: 0,
        messages: finalMessages,
        completed: false,
      });
    } catch {
      // Offline fallback
      const aiReply = getContextualSocraticFallback(card ?? cards[0], userText, currentTurn);
      const newAssistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, newAssistantMessage];
      setMessages(finalMessages);
      setTurn(currentTurn + 1);

      onSaveSession({
        cardId: card?.id ?? '__vault__',
        turnsCompleted: currentTurn,
        maxTurns: 0,
        messages: finalMessages,
        completed: false,
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

  const handleNewChat = () => {
    const contextCard = card ?? cards[0];
    if (!contextCard) return;
    const openingMessage: ChatMessage = {
      id: `msg-new-${Date.now()}`,
      role: 'assistant',
      content: card
        ? `Let us begin a new reflection. "${contextCard.question}" In this moment, without self-censorship, what does this question ask you to let go of?`
        : `Let us begin a new reflection across your vouched inquiries. Which question is most alive for you right now, and what does it ask you to examine?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([openingMessage]);
    setTurn(1);
    onSaveSession({
      cardId: card?.id ?? '__vault__',
      turnsCompleted: 0,
      maxTurns: 0,
      messages: [openingMessage],
      completed: false,
    });
  };

  const handleExportMarkdown = () => {
    const title = card ? `Reflection on: ${card.question}` : 'Plenary Socratic Reflection';
    const context = cards.map((contextCard) => `- **${contextCard.author}** (${contextCard.category}): ${contextCard.question}`).join('\n');
    const conversation = messages.map((message) => `### ${message.role === 'user' ? 'You' : 'Plenary Socratic AI'}\n\n${message.content}`).join('\n\n');
    const markdown = `# ${title}\n\n## Vouched inquiry context\n\n${context}\n\n## Conversation\n\n${conversation}\n`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plenary-reflection-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || cards.length === 0) return null;

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
              <button type="button" onClick={handleNewChat} title="New chat" aria-label="New chat" className="p-1.5 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] transition-colors cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
              <button type="button" onClick={handleExportMarkdown} title="Export chat as Markdown" aria-label="Export chat as Markdown" className="p-1.5 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] transition-colors cursor-pointer">
                <Download className="w-4 h-4" />
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
                {card ? card.category : `${cards.length} vouched cards`}
              </span>
              <span>{card ? <>{card.author} • <em className="not-italic opacity-80">{card.book}</em></> : 'Your complete reflection context'}</span>
            </div>
            <p className="font-serif text-sm text-[#14213d] leading-snug font-medium italic">{card ? `“${card.question}”` : 'The Socratic AI is holding your complete vouched collection.'}</p>
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

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="p-4 border-t border-[#e5e5e5] bg-white">
            <div className="flex flex-col gap-2">
              <div className="text-[9px] font-bold text-[#14213d]/40 uppercase tracking-wider">
                TURN {turn} (Deep Reflection)
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
