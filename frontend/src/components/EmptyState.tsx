import React from 'react';
import { ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  illustration: string;
  headline: string;
  subtext: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaIcon?: React.ReactNode;
  className?: string;
  testId?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  headline,
  subtext,
  ctaLabel,
  onCta,
  ctaIcon,
  className = '',
  testId,
}) => {
  return (
    <div
      data-testid={testId}
      className={`py-16 sm:py-20 px-4 text-center max-w-md mx-auto flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 ${className}`}
    >
      <div className="w-36 h-36 sm:w-44 sm:h-44 mb-6 select-none relative flex items-center justify-center">
        <img
          src={illustration}
          alt={headline}
          className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
        />
      </div>

      <h3 className="font-serif-clean text-2xl sm:text-3xl text-[#14213d] font-normal mb-2 leading-snug">
        {headline}
      </h3>

      <p className="text-xs sm:text-sm text-[#14213d]/60 leading-relaxed mb-6 max-w-sm">
        {subtext}
      </p>

      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="px-6 py-2.5 rounded-full bg-[#14213d] hover:bg-black text-white text-xs sm:text-sm font-medium transition-all duration-200 inline-flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer group"
        >
          <span>{ctaLabel}</span>
          {ctaIcon ?? <ArrowRight className="w-4 h-4 text-[#fca311] transition-transform group-hover:translate-x-0.5" />}
        </button>
      )}
    </div>
  );
};

