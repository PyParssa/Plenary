import React, { useState } from 'react';
import { GuestProfile, LlmProvider, LlmSettings } from '../types';
import { AlertTriangle, KeyRound, Save, Trash2 } from 'lucide-react';

interface AccountViewProps {
  profile: GuestProfile | null;
  onUpdateProfile: (displayName: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  llmSettings: LlmSettings;
  onSaveLlmSettings: (settings: LlmSettings) => void;
}

const MODEL_OPTIONS: Record<LlmProvider, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  anthropic: [
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
};

export const AccountView: React.FC<AccountViewProps> = ({ profile, onUpdateProfile, onDeleteAccount, llmSettings, onSaveLlmSettings }) => {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<LlmProvider>(llmSettings.provider);
  const [apiKey, setApiKey] = useState(llmSettings.apiKey);
  const [model, setModel] = useState(llmSettings.model);
  const [apiMessage, setApiMessage] = useState('');
  const modelOptions = MODEL_OPTIONS[provider];

  const handleSaveLlm = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedModel = modelOptions.some((option) => option.value === model) ? model : modelOptions[0].value;
    setModel(selectedModel);
    onSaveLlmSettings({ provider, apiKey: apiKey.trim(), model: selectedModel });
    setApiMessage('API settings saved locally on this device.');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await onUpdateProfile(displayName);
      setMessage('Your username has been updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your username.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account and all associated data? This cannot be undone.')) return;
    setIsDeleting(true);
    setError('');
    try {
      await onDeleteAccount();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete your account.');
      setIsDeleting(false);
    }
  };

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
          <form onSubmit={handleSave} className="mt-5 max-w-md">
            <label htmlFor="account-username" className="block text-xs font-semibold text-[#14213d] mb-1.5">
              Username
            </label>
            <div className="flex gap-2">
              <input
                id="account-username"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should we call you?"
                maxLength={80}
                required
                className="min-w-0 flex-1 rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#fca311]"
              />
              <button type="submit" disabled={isSaving} className="flex items-center gap-1.5 rounded-xl bg-[#14213d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                <Save className="h-3.5 w-3.5 text-[#fca311]" />
                {isSaving ? 'Saving' : 'Save'}
              </button>
            </div>
          </form>
          {message && <p className="mt-3 text-xs text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
        </div>
      </div>

      <div className="py-6 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-4 w-4 text-[#fca311]" />
          <h2 className="text-xl font-semibold text-[#14213d]">Socratic AI API</h2>
        </div>
        <p className="text-xs text-[#14213d]/60 max-w-xl mb-4">
          Add your own provider key to power reflections. It is stored only in this browser and is never saved to your Plenary account.
        </p>
        <form onSubmit={handleSaveLlm} className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-[#14213d]">
            Provider
            <select value={provider} onChange={(event) => {
              const nextProvider = event.target.value as LlmProvider;
              setProvider(nextProvider);
              setModel(MODEL_OPTIONS[nextProvider][0].value);
            }} className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#fca311]">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#14213d] sm:col-span-2">
            API key
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your provider key" className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm font-normal outline-none focus:border-[#fca311]" />
          </label>
          <label className="text-xs font-semibold text-[#14213d] sm:col-span-2">
            Model
            <select value={modelOptions.some((option) => option.value === model) ? model : modelOptions[0].value} onChange={(event) => setModel(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#fca311]">
              {modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button type="submit" className="self-end rounded-xl bg-[#14213d] px-4 py-2 text-xs font-semibold text-white hover:bg-black">
            Save API settings
          </button>
        </form>
        {apiMessage && <p className="mt-3 text-xs text-emerald-700">{apiMessage}</p>}
      </div>

      <div className="border-t border-red-200 pt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
          <div>
            <h2 className="text-sm font-semibold text-red-800">Delete account</h2>
            <p className="mt-1 text-xs text-red-700/80">This permanently removes your profile, vault, reflections, and account.</p>
            <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="mt-3 flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? 'Deleting account...' : 'Delete my account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
