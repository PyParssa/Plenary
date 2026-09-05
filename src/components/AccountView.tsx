import React from 'react';
import { GuestProfile } from '../types';

interface AccountViewProps {
  profile: GuestProfile | null;
}

export const AccountView: React.FC<AccountViewProps> = ({ profile }) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#fca311]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#14213d]/50">
              User Settings
            </span>
          </div>
          <h1 className="font-serif-clean text-3xl sm:text-4xl font-normal text-[#14213d]">
            My Account
          </h1>
          <p className="text-xs sm:text-sm text-[#14213d]/60 mt-1 max-w-xl">
            Manage your profile, preferences, and account settings.
          </p>
        </div>
      </div>

      {/* Account Details Section */}
      <div className="py-6">
        <h2 className="text-xl font-semibold text-[#14213d] mb-4">Profile Information</h2>
        <div className="bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm">
          <p className="text-[#14213d]/80">Email: {profile?.email ?? 'Not signed in'}</p>
          <p className="text-[#14213d]/80 mt-2">Display Name: {profile?.displayName ?? 'Guest'}</p>
        </div>
      </div>
    </div>
  );
};
