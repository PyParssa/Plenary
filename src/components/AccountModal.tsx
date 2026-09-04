import React, { useState } from 'react';
import { ArrowRight, Mail, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAtmospheres: string[];
  onCreateAccount: (email: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, selectedAtmospheres, onCreateAccount }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [developmentCode, setDevelopmentCode] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to send the code.');
      setDevelopmentCode(data.developmentCode);
      setStep('code');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6 || isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, selectedAtmospheres }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'That code could not be verified.');
      onCreateAccount(email.trim().toLowerCase());
      setStep('email');
      setCode('');
      setDevelopmentCode(undefined);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'That code could not be verified.');
    } finally {
      setIsLoading(false);
    }
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
        <p className="mt-4 text-sm leading-relaxed text-[#14213d]/65">You are currently exploring as a guest. Verify your email to save reflections, vouches, and your personal starting point.</p>
        {step === 'email' ? (
          <form onSubmit={handleSubmit} className="mt-7">
            <label htmlFor="account-email" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]/55">Email address</label>
            <input id="account-email" type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none transition-colors focus:border-[#fca311]" />
            <button type="submit" disabled={isLoading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3156] disabled:opacity-50">{isLoading ? 'Sending code...' : 'Email me a code'} <ArrowRight className="h-4 w-4 text-[#fca311]" /></button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-7">
            <label htmlFor="verification-code" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]/55">6-digit code sent to {email}</label>
            <input id="verification-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-center font-mono text-xl tracking-[0.4em] outline-none transition-colors focus:border-[#fca311]" />
            {developmentCode && <p className="mt-2 text-xs text-[#fca311]">Development code: {developmentCode}</p>}
            <button type="submit" disabled={isLoading || code.length !== 6} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3156] disabled:opacity-50">{isLoading ? 'Verifying...' : 'Verify and create account'} <ArrowRight className="h-4 w-4 text-[#fca311]" /></button>
            <button type="button" onClick={() => { setStep('email'); setError(''); }} className="mt-3 w-full text-xs text-[#14213d]/55 hover:text-[#14213d]">Use a different email</button>
          </form>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        <p className="mt-4 text-center text-[10px] text-[#14213d]/45">Codes expire after 10 minutes.</p>
      </motion.div>
    </div>
  );
};