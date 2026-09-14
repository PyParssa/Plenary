import React, { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAtmospheres: string[];
  onCreateAccount: (email: string, displayName?: string) => void;
}

function describeAuthError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;

  const details = error as {
    message?: unknown;
    code?: unknown;
    status?: unknown;
    name?: unknown;
  };
  const message = typeof details.message === 'string' ? details.message : fallback;
  const metadata = [
    typeof details.name === 'string' ? `name: ${details.name}` : '',
    typeof details.code === 'string' ? `code: ${details.code}` : '',
    typeof details.status === 'number' ? `status: ${details.status}` : '',
  ].filter(Boolean);

  return metadata.length > 0 ? `${message} (${metadata.join(', ')})` : message;
}

function getAuthRedirectUrl(): string {
  const url = new URL(window.location.href);
  if (url.hostname === '0.0.0.0') url.hostname = 'localhost';
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.origin;
}

const OTP_LENGTH = 8;

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, selectedAtmospheres, onCreateAccount }) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot-password'>('sign-up');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || (mode === 'sign-in' && !password) || (mode === 'sign-up' && !displayName.trim()) || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      if (mode === 'sign-up') {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: true, data: { display_name: displayName.trim() } },
        });

        if (authError) throw authError;
        setIsVerifying(true);
        setError(`Check your email for the ${OTP_LENGTH}-digit verification code.`);
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (authError) throw authError;
        onCreateAccount(normalizedEmail);
      }
    } catch (authError) {
      console.error('Supabase email authentication error:', authError);
      const rawMessage = authError instanceof Error ? authError.message : '';
      const exactMessage = describeAuthError(authError, 'Unable to authenticate with email.');
      const message = rawMessage.toLowerCase().includes('rate limit')
        ? `Supabase rate limit: ${exactMessage}. Wait a few minutes before requesting another code.`
        : exactMessage;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (verificationCode.trim().length !== OTP_LENGTH || password.length < 6 || isLoading) return;

    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: verificationCode.trim(),
        type: 'email',
      });
      if (authError) throw authError;
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      onCreateAccount(email.trim().toLowerCase(), displayName.trim());
    } catch (authError) {
      console.error('Supabase email verification error:', authError);
      const message = describeAuthError(authError, 'That verification code is invalid or expired.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${getAuthRedirectUrl()}/account`,
      });
      if (authError) throw authError;
      setError('Password reset instructions sent. Check your email.');
    } catch (authError) {
      setError(describeAuthError(authError, 'Unable to send password reset instructions.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#14213d]/70 px-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md rounded-[28px] bg-white p-7 text-[#14213d] shadow-2xl sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fca311]/15 text-[#fca311]"><Mail className="h-5 w-5" /></div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fca311]">Save your place</p>
        <h2 className="font-serif-clean text-4xl leading-none">{mode === 'sign-in' ? 'Welcome back.' : mode === 'forgot-password' ? 'Reset your password.' : 'Make this inquiry yours.'}</h2>
        <p className="mt-4 text-sm leading-relaxed text-[#14213d]/65">
          {isVerifying ? `Enter the ${OTP_LENGTH}-digit code we sent to your email and create a password for future sign-ins.` : mode === 'forgot-password' ? 'Enter your email and we will send you a secure password reset link.' : mode === 'sign-in' ? 'Sign in with the password you created for your account.' : 'Create your account, then verify your email before continuing.'}
        </p>

        {!isVerifying && <div className="mt-7 mb-4 flex overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-1">
          {(['sign-up', 'sign-in'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setMode(option); setError(''); }}
              className={`auth-mode-toggle flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${mode === option ? 'is-active' : 'is-inactive'}`}
            >
              {option === 'sign-up' ? 'Sign up' : 'Sign in'}
            </button>
          ))}
        </div>}

        {isVerifying ? <form onSubmit={handleVerification} className="space-y-3">
          <label htmlFor="verification-code" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]/55">Verification code</label>
          <input id="verification-code" inputMode="numeric" pattern="[0-9]{8}" maxLength={OTP_LENGTH} required value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} placeholder="12345678" className="w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-sm tracking-[0.35em] outline-none transition-colors focus:border-[#fca311]" />
          <label htmlFor="account-password" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]">Create a password</label>
          <input id="account-password" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-colors placeholder:text-[#14213d]/50 focus:border-[#fca311]" />
          <button type="submit" disabled={isLoading || verificationCode.length !== OTP_LENGTH || password.length < 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3156] disabled:opacity-50">
            {isLoading ? 'Creating account...' : 'Verify and create account'}
            <ArrowRight className="h-4 w-4 text-[#fca311]" />
          </button>
        </form> : mode === 'forgot-password' ? <form onSubmit={handlePasswordReset} className="space-y-3">
          <label htmlFor="reset-email" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]">Email address</label>
          <input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-colors placeholder:text-[#14213d]/50 focus:border-[#fca311]" />
          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3156] disabled:opacity-50">
            {isLoading ? 'Sending...' : 'Send reset link'}
            <ArrowRight className="h-4 w-4 text-[#fca311]" />
          </button>
          <button type="button" onClick={() => { setMode('sign-in'); setError(''); }} className="w-full text-xs font-semibold text-[#14213d]/65 hover:text-[#14213d]">Back to sign in</button>
        </form> : <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'sign-up' && <>
            <label htmlFor="account-display-name" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]">Your name</label>
            <input id="account-display-name" type="text" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should we call you?" className="w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-colors placeholder:text-[#14213d]/50 focus:border-[#fca311]" />
          </>}
          <label htmlFor="account-email" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]">Email address</label>
          <input id="account-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-colors placeholder:text-[#14213d]/50 focus:border-[#fca311]" />
          {mode === 'sign-in' && <>
            <label htmlFor="account-password" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#14213d]">Password</label>
            <input id="account-password" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-colors placeholder:text-[#14213d]/50 focus:border-[#fca311]" />
          </>}
          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3156] disabled:opacity-50">
            {isLoading ? 'Please wait...' : mode === 'sign-up' ? 'Send verification code' : 'Sign in with password'}
            <ArrowRight className="h-4 w-4 text-[#fca311]" />
          </button>
          {mode === 'sign-in' && <button type="button" onClick={() => { setMode('forgot-password'); setError(''); }} className="w-full text-xs font-semibold text-[#14213d]/65 hover:text-[#14213d]">Forgot your password?</button>}
        </form>}

        {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
          <p className="font-semibold">Authentication error</p>
          <p className="mt-1 break-words">{error}</p>
          <p className="mt-2 text-[10px] text-red-600/75">More details are available in the browser console.</p>
        </div>}
        <p className="mt-4 text-center text-[10px] text-[#14213d]/45">Secure auth is handled by Supabase.</p>
      </motion.div>
    </div>
  );
};