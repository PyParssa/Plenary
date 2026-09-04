import React, { useState } from 'react';
import { ArrowRight, Mail, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: (email: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onCreateAccount }) => {
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail) onCreateAccount(normalizedEmail);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#14213d]/70 px-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md rounded-[28px] bg-white p-7 text-[#14213d] shadow-2xl sm:p-9">
        <button type="button" onClick={onClose} aria-label="Close account dialog" className="absolute right-5 top-5 rounded-full p-2 text-[#14213d]/45 hover:bg-[#e5e5e5]/40 hover:text-[#14213d]">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fca311]/15 text-[#fca311]"><Mail className="h-5 w-5" /></div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fca311]">Save your place</p>
        <h2 className="font-serif-clean text-4xl leading-none">Make this inquiry yours.</h2>
        <p className="mt-4 text-sm leading-relaxed text-[#14213d]/65">You are currently exploring as a guest. Add your email to save reflections, vouches, and your personal starting point.</p>
        <form onSubmit={handleSubmit} className="mt-7">
          <label htmlFor="account-email" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]/55">Email address</label>
          <input id="account-email" type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none transition-colors focus:border-[#fca311]" />
          <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3156]">Create my account <ArrowRight className="h-4 w-4 text-[#fca311]" /></button>
        </form>
        <p className="mt-4 text-center text-[10px] text-[#14213d]/45">No password yet. This prototype stores your account on this device.</p>
      </motion.div>
    </div>
  );
};