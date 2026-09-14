import React from 'react';
import { Heart, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SOLANA_WALLET_ADDRESS = 'ExHycmN3JJH2S3MuLjVLsGigz6PaaEkwsnb3KSxi9dQJ';
const WALLET_LINKS = [
  { name: 'Phantom', url: 'https://phantom.app/' },
  { name: 'Solflare', url: 'https://solflare.com/' },
  { name: 'Trust Wallet', url: 'https://trustwallet.com/' },
];

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl p-6 sm:p-7 z-10 text-center"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#e5e5e5]/50 text-[#14213d]/60 hover:text-[#14213d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-full bg-[#fca311]/15 border border-[#fca311]/30 mx-auto flex items-center justify-center mb-3">
            <Heart className="w-6 h-6 text-[#fca311] fill-[#fca311]" />
          </div>

          <h3 className="font-serif-clean text-2xl font-normal text-[#14213d] mb-1">
            Support Plenary
          </h3>
          <p className="text-xs text-[#14213d]/65 leading-relaxed mb-6 max-w-xs mx-auto">
            Plenary is an unhurried, ad-free sanctuary for philosophical inquiry. Your patron support sustains open access for thinkers worldwide.
          </p>

          <div className="mb-5 rounded-2xl bg-[#14213d] px-4 py-4 text-left text-white shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#fca311]">Solana wallet address</p>
            <p className="mt-2 break-all font-mono text-xs font-semibold leading-relaxed text-white">
              {SOLANA_WALLET_ADDRESS}
            </p>
          </div>

          <p className="mb-3 text-left text-[11px] font-semibold text-[#14213d]/70">Send SOL with your wallet</p>
          <div className="grid grid-cols-3 gap-2">
            {WALLET_LINKS.map((wallet) => (
              <a
                key={wallet.name}
                href={wallet.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-[#14213d]/20 px-2 text-center text-[11px] font-semibold text-[#14213d] transition-colors hover:border-[#fca311] hover:bg-[#fca311]/10"
              >
                <span>{wallet.name}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
