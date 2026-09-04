import React, { useState } from 'react';
import { ActiveTab, LifeStage } from '../types';
import { Sparkles, Heart, Filter, ChevronDown, Check, User, ShieldCheck, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';

interface TopNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedLifeStage: LifeStage;
  onSelectLifeStage: (stage: LifeStage) => void;
  onOpenSupport: () => void;
  vouchedCount: number;
  isNightMode: boolean;
  onToggleNightMode: () => void;
}

const LIFE_STAGES: LifeStage[] = [
  'All Inquiries',
  'Existential Inquiry',
  'Career Reinvention',
  'Solitude & Identity',
  'Mortality & Meaning',
  'Deep Relationships',
  'Creativity & Craft',
  'Midlife Reckoning',
];

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  selectedLifeStage,
  onSelectLifeStage,
  onOpenSupport,
  vouchedCount,
  isNightMode,
  onToggleNightMode,
}) => {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5e5e5] text-[#14213d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-10 py-4 sm:py-5 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div
          id="brand-header-logo"
          onClick={() => onTabChange('deck')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-3 h-3 bg-[#fca311] rounded-full shadow-[0_0_10px_#fca311] transition-transform duration-300 group-hover:scale-125" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#14213d] leading-none">
              PLENARY
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 text-[#14213d] mt-0.5">
              Illuminating Questions
            </p>
          </div>
        </div>

        {/* Center Pill Navigation Bar */}
        <nav
          id="central-pill-navigation"
          aria-label="View selection"
          className="hidden md:flex items-center bg-[#e5e5e5]/20 p-1 rounded-full border border-[#e5e5e5]"
        >
          <button
            id="nav-pill-deck"
            type="button"
            onClick={() => onTabChange('deck')}
            className={`px-7 py-1.5 text-xs rounded-full transition-all duration-200 outline-none ${
              activeTab === 'deck'
                ? 'bg-white font-bold shadow-xs border border-[#e5e5e5] text-[#14213d]'
                : 'font-medium opacity-50 hover:opacity-80 text-[#14213d]'
            }`}
          >
            THE DECK
          </button>

          <button
            id="nav-pill-vault"
            type="button"
            onClick={() => onTabChange('vault')}
            className={`px-7 py-1.5 text-xs rounded-full transition-all duration-200 outline-none flex items-center gap-1.5 ${
              activeTab === 'vault'
                ? 'bg-white font-bold shadow-xs border border-[#e5e5e5] text-[#14213d]'
                : 'font-medium opacity-50 hover:opacity-80 text-[#14213d]'
            }`}
          >
            <span>MY VAULT</span>
            {vouchedCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#14213d] text-white font-mono font-normal">
                {vouchedCount}
              </span>
            )}
          </button>

          <button
            id="nav-pill-authors"
            type="button"
            onClick={() => onTabChange('authors')}
            className={`px-7 py-1.5 text-xs rounded-full transition-all duration-200 outline-none ${
              activeTab === 'authors'
                ? 'bg-white font-bold shadow-xs border border-[#e5e5e5] text-[#14213d]'
                : 'font-medium opacity-50 hover:opacity-80 text-[#14213d]'
            }`}
          >
            AUTHOR STUDIO
          </button>
        </nav>

        {/* Right-Hand Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="night-mode-toggle"
            type="button"
            onClick={onToggleNightMode}
            aria-label={isNightMode ? 'Switch to day mode' : 'Switch to night mode'}
            title={isNightMode ? 'Switch to day mode' : 'Switch to night mode'}
            className="w-9 h-9 rounded-full border border-[#e5e5e5] flex items-center justify-center text-[#14213d] hover:bg-[#e5e5e5]/40 transition-colors outline-none cursor-pointer"
          >
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Life Stage Filter Pill */}
          <div className="relative">
            <button
              id="filter-life-stage-button"
              type="button"
              onClick={() => {
                setFilterDropdownOpen(!filterDropdownOpen);
                setProfileOpen(false);
              }}
              className="flex items-center bg-[#e5e5e5]/30 border border-[#e5e5e5] rounded-full px-3.5 sm:px-4 py-1.5 gap-2 cursor-pointer hover:border-[#14213d]/30 text-xs font-medium text-[#14213d] transition-all outline-none"
            >
              <span className="max-w-[85px] sm:max-w-[130px] truncate">
                {selectedLifeStage}
              </span>
              <ChevronDown
                className={`w-3 h-3 opacity-60 transition-transform duration-200 ${
                  filterDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Filter Dropdown Menu */}
            {filterDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setFilterDropdownOpen(false)}
                />
                <div
                  id="life-stage-dropdown-panel"
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#e5e5e5] shadow-lg py-2 z-30 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#14213d]/40">
                    Filter Inquiry Dimension
                  </div>
                  {LIFE_STAGES.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => {
                        onSelectLifeStage(stage);
                        setFilterDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#e5e5e5]/40 transition-colors text-[#14213d]"
                    >
                      <span className={stage === selectedLifeStage ? 'font-semibold' : ''}>
                        {stage}
                      </span>
                      {stage === selectedLifeStage && (
                        <Check className="w-3.5 h-3.5 text-[#fca311]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Support / Patron Tip Button */}
          <button
            id="support-patron-button"
            type="button"
            onClick={onOpenSupport}
            className="text-xs font-semibold px-3.5 sm:px-4 py-1.5 border border-[#fca311] text-[#fca311] rounded-full hover:bg-[#fca311]/5 transition-colors outline-none cursor-pointer"
          >
            Support
          </button>

          {/* Clean Avatar Profile Icon with Dropdown */}
          <div className="relative">
            <button
              id="user-profile-menu-button"
              type="button"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setFilterDropdownOpen(false);
              }}
              aria-label="User Profile and Stats"
              className="w-9 h-9 rounded-full border border-[#e5e5e5] bg-[#14213d] flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-105 outline-none cursor-pointer"
            >
              JD
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  id="user-profile-dropdown"
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#e5e5e5] shadow-lg p-4 z-30 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-[#e5e5e5]">
                    <div className="w-10 h-10 rounded-full bg-[#14213d] text-white flex items-center justify-center font-serif-clean text-lg">
                      P
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#14213d] flex items-center gap-1">
                        Seeker Voyager
                        <ShieldCheck className="w-3.5 h-3.5 text-[#fca311]" />
                      </div>
                      <div className="text-[11px] text-[#14213d]/60">Socratic Inquirer</div>
                    </div>
                  </div>

                  <div className="py-3 space-y-2 text-xs border-b border-[#e5e5e5]">
                    <div className="flex items-center justify-between text-[#14213d]">
                      <span className="text-[#14213d]/60">Vouched Inquiries</span>
                      <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-[#e5e5e5]/50">
                        {vouchedCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#14213d]">
                      <span className="text-[#14213d]/60">Socratic Reflections</span>
                      <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-[#fca311]/20 text-[#14213d]">
                        5-Turn Mode
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#14213d]">
                      <span className="text-[#14213d]/60">Inquiry Habit</span>
                      <span className="text-[#fca311] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Daily Ember
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange('vault');
                        setProfileOpen(false);
                      }}
                      className="w-full py-1.5 text-center text-xs font-medium rounded-lg bg-[#14213d] text-white hover:bg-black transition-colors"
                    >
                      Open My Vault
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-[#e5e5e5] px-4 py-2 flex justify-around bg-white">
        <button
          id="mobile-nav-deck"
          type="button"
          onClick={() => onTabChange('deck')}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            activeTab === 'deck'
              ? 'bg-[#14213d] text-white'
              : 'text-[#14213d]/60 hover:text-[#14213d]'
          }`}
        >
          The Deck
        </button>
        <button
          id="mobile-nav-vault"
          type="button"
          onClick={() => onTabChange('vault')}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            activeTab === 'vault'
              ? 'bg-[#14213d] text-white'
              : 'text-[#14213d]/60 hover:text-[#14213d]'
          }`}
        >
          My Vault ({vouchedCount})
        </button>
        <button
          id="mobile-nav-authors"
          type="button"
          onClick={() => onTabChange('authors')}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            activeTab === 'authors'
              ? 'bg-[#14213d] text-white'
              : 'text-[#14213d]/60 hover:text-[#14213d]'
          }`}
        >
          Author Studio
        </button>
      </div>
    </header>
  );
};
