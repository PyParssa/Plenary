import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AdminCard,
  AdminUser,
  AnalyticsOverview,
  BulkImportCard,
  LifeStage,
  UserRole,
} from '../types';
import {
  adminFetchCards,
  adminUpdateCard,
  adminDeleteCard,
  adminImportCards,
  adminExportCards,
  adminFetchUsers,
  adminUpdateUserRole,
  adminUpdateUserPassword,
  adminDeleteUser,
  adminFetchAnalytics,
} from '../lib/api';
import {
  Shield,
  Layers,
  Users,
  BarChart3,
  Search,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Sparkles,
  Key,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminViewProps {
  token: string;
  currentUserId?: string;
  onShowToast: (msg: string) => void;
  onCardsModified?: () => void;
}

const LIFE_STAGES: LifeStage[] = [
  'All Inquiries',
  'Career Reinvention',
  'Existential Inquiry',
  'Deep Relationships',
  'Solitude & Identity',
  'Creativity & Craft',
  'Midlife Reckoning',
  'Mortality & Meaning',
];

export const AdminView: React.FC<AdminViewProps> = ({
  token,
  currentUserId,
  onShowToast,
  onCardsModified,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cards' | 'users' | 'analytics'>('cards');

  // =========================================================================
  // CARDS STATE
  // =========================================================================
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsTotal, setCardsTotal] = useState(0);
  const [cardsPage, setCardsPage] = useState(1);
  const [cardsPerPage, setCardsPerPage] = useState(25);
  const [cardsSearch, setCardsSearch] = useState('');
  const [cardsCategory, setCardsCategory] = useState<LifeStage>('All Inquiries');
  const [cardsPublishedFilter, setCardsPublishedFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [cardsSortBy, setCardsSortBy] = useState('created_at');
  const [cardsSortOrder, setCardsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Card Modals State
  const [editingCard, setEditingCard] = useState<AdminCard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<AdminCard | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewCards, setImportPreviewCards] = useState<BulkImportCard[]>([]);
  const [importErrors, setImportErrors] = useState<{ index: number; message: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    question: string;
    backstory: string;
    category: LifeStage;
    author: string;
    authorAvatar: string;
    authorBio: string;
    book: string;
    relatedInquiries: string;
    published: boolean;
  }>({
    question: '',
    backstory: '',
    category: 'Existential Inquiry',
    author: '',
    authorAvatar: '',
    authorBio: '',
    book: '',
    relatedInquiries: '',
    published: true,
  });

  // =========================================================================
  // USERS STATE
  // =========================================================================
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(25);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<string>('all');
  const [usersSortBy, setUsersSortBy] = useState('created_at');
  const [usersSortOrder, setUsersSortOrder] = useState<'asc' | 'desc'>('desc');
  const [roleChangePending, setRoleChangePending] = useState<{ user: AdminUser; newRole: UserRole } | null>(null);
  const [passwordChangeUser, setPasswordChangeUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // =========================================================================
  // ANALYTICS STATE
  // =========================================================================
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // =========================================================================
  // TOAST REF & LOADERS
  // =========================================================================
  const onShowToastRef = useRef(onShowToast);
  useEffect(() => {
    onShowToastRef.current = onShowToast;
  }, [onShowToast]);

  const loadCards = useCallback(async () => {
    if (!token) return;
    setCardsLoading(true);
    try {
      const params: Record<string, any> = {
        page: cardsPage,
        per_page: cardsPerPage,
        sort_by: cardsSortBy,
        sort_order: cardsSortOrder,
      };
      if (cardsCategory !== 'All Inquiries') params.category = cardsCategory;
      if (cardsPublishedFilter === 'published') params.published = true;
      if (cardsPublishedFilter === 'unpublished') params.published = false;
      if (cardsSearch.trim()) params.search = cardsSearch.trim();

      const data = await adminFetchCards(token, params);
      setCards(data.cards);
      setCardsTotal(data.total);
    } catch (err: any) {
      console.error('Error fetching admin cards:', err);
      onShowToastRef.current?.(err.message || 'Failed to fetch cards');
    } finally {
      setCardsLoading(false);
    }
  }, [token, cardsPage, cardsPerPage, cardsSortBy, cardsSortOrder, cardsCategory, cardsPublishedFilter, cardsSearch]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const params: Record<string, any> = {
        page: usersPage,
        per_page: usersPerPage,
        sort_by: usersSortBy,
        sort_order: usersSortOrder,
      };
      if (usersRoleFilter !== 'all') params.role = usersRoleFilter;
      if (usersSearch.trim()) params.search = usersSearch.trim();

      const data = await adminFetchUsers(token, params);
      setUsersList(data.users);
      setUsersTotal(data.total);
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      onShowToastRef.current?.(err.message || 'Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  }, [token, usersPage, usersPerPage, usersSortBy, usersSortOrder, usersRoleFilter, usersSearch]);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const data = await adminFetchAnalytics(token);
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      onShowToastRef.current?.(err.message || 'Failed to fetch analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  // Distinct effects per active tab to avoid cross-tab refetch cascades
  useEffect(() => {
    if (activeSubTab === 'cards') {
      loadCards();
    }
  }, [activeSubTab, loadCards]);

  useEffect(() => {
    if (activeSubTab === 'users') {
      loadUsers();
    }
  }, [activeSubTab, loadUsers]);

  useEffect(() => {
    if (activeSubTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeSubTab, loadAnalytics]);

  // =========================================================================
  // CARD ACTIONS
  // =========================================================================

  const handleOpenEdit = (card: AdminCard) => {
    setEditingCard(card);
    setEditForm({
      question: card.question,
      backstory: card.backstory,
      category: card.category,
      author: card.author,
      authorAvatar: card.authorAvatar,
      authorBio: card.authorBio || '',
      book: card.book,
      relatedInquiries: (card.relatedInquiries || []).join('\n'),
      published: card.published,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    try {
      const relatedInquiriesArray = editForm.relatedInquiries
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await adminUpdateCard(token, editingCard.id, {
        question: editForm.question.trim(),
        backstory: editForm.backstory.trim(),
        category: editForm.category,
        author: editForm.author.trim(),
        authorAvatar: editForm.authorAvatar.trim(),
        authorBio: editForm.authorBio.trim(),
        book: editForm.book.trim(),
        relatedInquiries: relatedInquiriesArray,
        published: editForm.published,
      });

      onShowToast('Card updated successfully');
      setIsEditModalOpen(false);
      setEditingCard(null);
      loadCards();
      onCardsModified?.();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update card');
    }
  };

  const handleTogglePublish = async (card: AdminCard) => {
    try {
      const nextPublished = !card.published;
      await adminUpdateCard(token, card.id, { published: nextPublished });
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, published: nextPublished } : c))
      );
      onShowToast(nextPublished ? 'Card published' : 'Card unpublished');
      onCardsModified?.();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to toggle card visibility');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;
    try {
      await adminDeleteCard(token, cardToDelete.id);
      onShowToast('Card deleted permanently');
      setCardToDelete(null);
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        next.delete(cardToDelete.id);
        return next;
      });
      loadCards();
      onCardsModified?.();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete card');
    }
  };

  const handleBulkPublish = async (publishedState: boolean) => {
    const ids = Array.from(selectedCardIds);
    if (!ids.length) return;
    try {
      await Promise.all(
        ids.map((id) => adminUpdateCard(token, id, { published: publishedState }))
      );
      onShowToast(`${ids.length} card(s) ${publishedState ? 'published' : 'unpublished'}`);
      setSelectedCardIds(new Set());
      loadCards();
      onCardsModified?.();
    } catch (err: any) {
      onShowToast(err.message || 'Failed bulk update');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedCardIds);
    if (!ids.length) return;
    if (!window.confirm(`Are you sure you want to delete ${ids.length} selected card(s)? This cannot be undone.`)) {
      return;
    }
    try {
      await Promise.all(ids.map((id) => adminDeleteCard(token, id)));
      onShowToast(`${ids.length} card(s) deleted`);
      setSelectedCardIds(new Set());
      loadCards();
      onCardsModified?.();
    } catch (err: any) {
      onShowToast(err.message || 'Failed bulk delete');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const published =
        cardsPublishedFilter === 'published'
          ? true
          : cardsPublishedFilter === 'unpublished'
          ? false
          : undefined;

      const blob = await adminExportCards(token, format, cardsCategory, published);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plenary_cards_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onShowToast(`Exported cards as ${format.toUpperCase()}`);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to export cards');
    }
  };

  // Parse CSV File Helper
  const parseCSV = (text: string): BulkImportCard[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const results: BulkImportCard[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex for parsing CSV row respecting quoted strings
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const values: string[] = [];
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        let val = match[1];
        if (val === undefined) break;
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        values.push(val.trim());
        if (regex.lastIndex >= lines[i].length) break;
      }

      if (values.length >= 4) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });

        const inquiries: string[] = [];
        if (rowObj.related_inquiry_1) inquiries.push(rowObj.related_inquiry_1);
        if (rowObj.related_inquiry_2) inquiries.push(rowObj.related_inquiry_2);
        if (rowObj.related_inquiries) {
          try {
            const parsed = JSON.parse(rowObj.related_inquiries);
            if (Array.isArray(parsed)) inquiries.push(...parsed);
          } catch {
            inquiries.push(rowObj.related_inquiries);
          }
        }

        results.push({
          category: rowObj.category || 'Existential Inquiry',
          author: rowObj.author || '',
          author_avatar: rowObj.author_avatar || '',
          author_bio: rowObj.author_bio || '',
          book: rowObj.book || '',
          question: rowObj.question || '',
          backstory: rowObj.backstory || '',
          related_inquiries: inquiries,
          published: true,
        });
      }
    }
    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setImportPreviewCards(parsed);
            validateImport(parsed);
          } else {
            onShowToast('JSON file must contain an array of cards');
          }
        } catch {
          onShowToast('Invalid JSON file');
        }
      } else if (file.name.endsWith('.csv')) {
        try {
          const parsed = parseCSV(content);
          setImportPreviewCards(parsed);
          validateImport(parsed);
        } catch {
          onShowToast('Invalid CSV file');
        }
      } else {
        onShowToast('Supported formats: .json, .csv');
      }
    };
    reader.readAsText(file);
  };

  const validateImport = (items: BulkImportCard[]) => {
    const errs: { index: number; message: string }[] = [];
    items.forEach((c, idx) => {
      if (!c.question?.trim()) errs.push({ index: idx, message: 'Missing question text' });
      if (!c.author?.trim()) errs.push({ index: idx, message: 'Missing author' });
      if (!c.book?.trim()) errs.push({ index: idx, message: 'Missing book' });
      if (!c.category?.trim()) errs.push({ index: idx, message: 'Missing category' });
    });
    setImportErrors(errs);
  };

  const handleExecuteImport = async () => {
    if (!importPreviewCards.length) return;
    setIsImporting(true);
    try {
      const result = await adminImportCards(token, importPreviewCards);
      onShowToast(`Imported ${result.imported} card(s), ${result.failed} failed`);
      setIsImportModalOpen(false);
      setImportPreviewCards([]);
      setImportErrors([]);
      loadCards();
      onCardsModified?.();
    } catch (err: any) {
      onShowToast(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // =========================================================================
  // USER ACTIONS
  // =========================================================================

  const handleRoleChangeConfirm = async () => {
    if (!roleChangePending) return;
    try {
      await adminUpdateUserRole(token, roleChangePending.user.id, roleChangePending.newRole);
      onShowToast(`Updated role for ${roleChangePending.user.email} to ${roleChangePending.newRole}`);
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === roleChangePending.user.id
            ? { ...u, role: roleChangePending.newRole }
            : u
        )
      );
      setRoleChangePending(null);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update user role');
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeUser) return;
    const pwd = newPassword.trim();
    if (pwd.length < 6) {
      onShowToast('Password must be at least 6 characters long');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await adminUpdateUserPassword(token, passwordChangeUser.id, pwd);
      onShowToast(`Password updated for ${passwordChangeUser.email}`);
      setPasswordChangeUser(null);
      setNewPassword('');
      setShowNewPassword(false);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update user password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await adminDeleteUser(token, userToDelete.id);
      onShowToast(`User ${userToDelete.email} and all associated data deleted`);
      setUsersList((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUsersTotal((prev) => Math.max(0, prev - 1));
      setUserToDelete(null);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Total pages
  const cardsTotalPages = Math.max(1, Math.ceil(cardsTotal / cardsPerPage));
  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersPerPage));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#14213d] text-white flex items-center justify-center shadow-xs">
              <Shield className="w-4 h-4 text-[#fca311]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#14213d]">
              Admin Control Panel
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#14213d]/60 mt-1">
            Manage inquiries, moderate user accounts, review live metrics, and bulk import/export cards.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center bg-[#e5e5e5]/40 p-1 rounded-full border border-[#e5e5e5] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('cards')}
            className={`px-5 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all outline-none ${
              activeSubTab === 'cards'
                ? 'bg-white shadow-xs text-[#14213d]'
                : 'text-[#14213d]/60 hover:text-[#14213d]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Cards ({cardsTotal})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('users')}
            className={`px-5 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all outline-none ${
              activeSubTab === 'users'
                ? 'bg-white shadow-xs text-[#14213d]'
                : 'text-[#14213d]/60 hover:text-[#14213d]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`px-5 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all outline-none ${
              activeSubTab === 'analytics'
                ? 'bg-white shadow-xs text-[#14213d]'
                : 'text-[#14213d]/60 hover:text-[#14213d]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. CARDS MANAGEMENT VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'cards' && (
        <div className="space-y-6">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e5e5e5] shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-[#14213d]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cardsSearch}
                  onChange={(e) => {
                    setCardsSearch(e.target.value);
                    setCardsPage(1);
                  }}
                  placeholder="Search cards, authors, books..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl text-[#14213d] placeholder:text-[#14213d]/40 focus:outline-none focus:border-[#14213d]"
                />
                {cardsSearch && (
                  <button
                    type="button"
                    onClick={() => setCardsSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#14213d]/40 hover:text-[#14213d]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={cardsCategory}
                onChange={(e) => {
                  setCardsCategory(e.target.value as LifeStage);
                  setCardsPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl text-[#14213d] dark:bg-[#14213d] dark:text-white focus:outline-none"
              >
                {LIFE_STAGES.map((stg) => (
                  <option key={stg} value={stg}>
                    {stg}
                  </option>
                ))}
              </select>

              {/* Published Status Filter */}
              <select
                value={cardsPublishedFilter}
                onChange={(e) => {
                  setCardsPublishedFilter(e.target.value as any);
                  setCardsPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl text-[#14213d] dark:bg-[#14213d] dark:text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published Only</option>
                <option value="unpublished">Unpublished Only</option>
              </select>

              <button
                type="button"
                onClick={() => loadCards()}
                className="p-1.5 text-xs rounded-xl border border-[#e5e5e5] text-[#14213d]/70 hover:text-[#14213d] hover:bg-[#e5e5e5]/30 transition-colors"
                title="Refresh cards list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cardsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Import / Export Controls */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <div className="relative group">
                <button
                  type="button"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#14213d]/20 text-[#14213d] hover:bg-[#14213d]/5 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#fca311]" />
                  Export
                </button>
                <div className="absolute right-0 lg:left-0 mt-1 w-36 bg-white border border-[#e5e5e5] rounded-xl shadow-lg p-1.5 hidden group-hover:block z-20 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-[#e5e5e5]/40 text-[#14213d]"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-[#e5e5e5]/40 text-[#14213d]"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#14213d] text-white hover:bg-black flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#fca311]" />
                Import Cards
              </button>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedCardIds.size > 0 && (
            <div className="flex items-center justify-between bg-[#14213d] text-white px-4 py-2.5 rounded-xl text-xs shadow-md animate-in slide-in-from-top duration-200">
              <span className="font-medium">
                {selectedCardIds.size} card{selectedCardIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkPublish(true)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-green-400" />
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkPublish(false)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  Unpublish
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCardIds(new Set())}
                  className="p-1 hover:bg-white/10 rounded-lg ml-2"
                  title="Deselect all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Cards Table */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#14213d]">
                <thead className="bg-[#e5e5e5]/30 text-[#14213d]/70 uppercase tracking-wider font-semibold border-b border-[#e5e5e5]">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={cards.length > 0 && cards.every((c) => selectedCardIds.has(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCardIds(new Set(cards.map((c) => c.id)));
                          } else {
                            setSelectedCardIds(new Set());
                          }
                        }}
                        className="rounded border-[#e5e5e5] text-[#14213d] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-[#14213d]"
                      onClick={() => {
                        if (cardsSortBy === 'question') {
                          setCardsSortOrder(cardsSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setCardsSortBy('question');
                          setCardsSortOrder('asc');
                        }
                      }}
                    >
                      Question {cardsSortBy === 'question' && (cardsSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-[#14213d]"
                      onClick={() => {
                        if (cardsSortBy === 'author') {
                          setCardsSortOrder(cardsSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setCardsSortBy('author');
                          setCardsSortOrder('asc');
                        }
                      }}
                    >
                      Author & Book {cardsSortBy === 'author' && (cardsSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-[#14213d]"
                      onClick={() => {
                        if (cardsSortBy === 'category') {
                          setCardsSortOrder(cardsSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setCardsSortBy('category');
                          setCardsSortOrder('asc');
                        }
                      }}
                    >
                      Category {cardsSortBy === 'category' && (cardsSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-[#14213d] text-center"
                      onClick={() => {
                        if (cardsSortBy === 'vouch_count') {
                          setCardsSortOrder(cardsSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setCardsSortBy('vouch_count');
                          setCardsSortOrder('desc');
                        }
                      }}
                    >
                      Vouches {cardsSortBy === 'vouch_count' && (cardsSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-3 text-center">Status</th>
                    <th
                      className="p-3 cursor-pointer hover:text-[#14213d] text-right"
                      onClick={() => {
                        if (cardsSortBy === 'created_at') {
                          setCardsSortOrder(cardsSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setCardsSortBy('created_at');
                          setCardsSortOrder('desc');
                        }
                      }}
                    >
                      Created {cardsSortBy === 'created_at' && (cardsSortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]/60">
                  {cardsLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#14213d]/50">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#fca311]" />
                        Loading cards...
                      </td>
                    </tr>
                  ) : cards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#14213d]/50">
                        No cards found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    cards.map((card) => {
                      const isSelected = selectedCardIds.has(card.id);
                      return (
                        <tr
                          key={card.id}
                          className={`hover:bg-[#e5e5e5]/20 transition-colors ${
                            isSelected ? 'bg-[#fca311]/5' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedCardIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(card.id);
                                  else next.delete(card.id);
                                  return next;
                                });
                              }}
                              className="rounded border-[#e5e5e5] text-[#14213d] focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 max-w-xs sm:max-w-md">
                            <div className="font-serif-clean font-medium text-[#14213d] line-clamp-2">
                              {card.question}
                            </div>
                            <div className="text-[10px] text-[#14213d]/50 mt-0.5 line-clamp-1 font-mono">
                              ID: {card.id}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-semibold">{card.author}</div>
                            <div className="text-[10px] text-[#14213d]/60 italic">{card.book}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-[#e5e5e5]/60 text-[10px] font-medium text-[#14213d]">
                              {card.category}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap font-mono font-bold text-[#14213d]">
                            {card.vouchCount}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(card)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                card.published
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                              title="Click to toggle publish status"
                            >
                              {card.published ? (
                                <>
                                  <Eye className="w-3 h-3" /> Published
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Draft
                                </>
                              )}
                            </button>
                          </td>
                          <td className="p-3 text-right text-[11px] text-[#14213d]/60 whitespace-nowrap">
                            {card.createdAt ? new Date(card.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(card)}
                                className="p-1.5 rounded-lg border border-[#e5e5e5] text-[#14213d]/70 hover:text-[#14213d] hover:bg-[#e5e5e5]/40 transition-colors"
                                title="Edit card"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardToDelete(card)}
                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#e5e5e5]/10 border-t border-[#e5e5e5] text-xs text-[#14213d]/70">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={cardsPerPage}
                  onChange={(e) => {
                    setCardsPerPage(Number(e.target.value));
                    setCardsPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-[#e5e5e5] rounded-lg text-xs dark:bg-[#14213d] dark:text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>cards per page • Total {cardsTotal} cards</span>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  Page {cardsPage} of {cardsTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={cardsPage <= 1}
                    onClick={() => setCardsPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#e5e5e5] bg-white disabled:opacity-30 hover:bg-[#e5e5e5]/30 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={cardsPage >= cardsTotalPages}
                    onClick={() => setCardsPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-[#e5e5e5] bg-white disabled:opacity-30 hover:bg-[#e5e5e5]/30 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. USERS MANAGEMENT VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e5e5e5] shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-[#14213d]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  placeholder="Search user by email or name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl text-[#14213d] placeholder:text-[#14213d]/40 focus:outline-none focus:border-[#14213d]"
                />
              </div>

              <select
                value={usersRoleFilter}
                onChange={(e) => {
                  setUsersRoleFilter(e.target.value);
                  setUsersPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl text-[#14213d] dark:bg-[#14213d] dark:text-white focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="creator">Creator</option>
                <option value="manager">Manager</option>
              </select>

              <button
                type="button"
                onClick={() => loadUsers()}
                className="p-1.5 text-xs rounded-xl border border-[#e5e5e5] text-[#14213d]/70 hover:text-[#14213d] hover:bg-[#e5e5e5]/30 transition-colors"
                title="Refresh users"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#14213d]">
                <thead className="bg-[#e5e5e5]/30 text-[#14213d]/70 uppercase tracking-wider font-semibold border-b border-[#e5e5e5]">
                  <tr>
                    <th className="p-3">User & Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-center">Vouches</th>
                    <th className="p-3 text-center">Reflections</th>
                    <th className="p-3 text-center">Cards Created</th>
                    <th className="p-3 text-right">Joined</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]/60">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#14213d]/50">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#fca311]" />
                        Loading users...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#14213d]/50">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => {
                      const isSelf = user.id === currentUserId;
                      const managerEmails = (import.meta.env.VITE_MANAGER_EMAILS || '')
                        .split(',')
                        .map((e: string) => e.trim().toLowerCase())
                        .filter(Boolean);
                      const isSystemManager = managerEmails.includes(user.email.trim().toLowerCase());
                      const isLocked = isSelf || isSystemManager;

                      return (
                        <tr key={user.id} className="hover:bg-[#e5e5e5]/20 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-[#14213d] flex items-center gap-1.5">
                              {user.displayName || user.email.split('@')[0]}
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-[#fca311]/20 text-[#14213d] rounded text-[9px] font-bold">
                                  YOU
                                </span>
                              )}
                              {isSystemManager && (
                                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                                  SYS ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#14213d]/60 font-mono">{user.email}</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={isSystemManager ? 'manager' : user.role}
                              disabled={isLocked}
                              onChange={(e) => {
                                const newRole = e.target.value as UserRole;
                                setRoleChangePending({ user, newRole });
                              }}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#e5e5e5] bg-white cursor-pointer dark:bg-[#14213d] dark:text-white ${
                                isLocked ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-[#14213d]'
                              }`}
                              title={
                                isSystemManager
                                  ? 'System manager configured via environment variable'
                                  : isSelf
                                  ? 'Cannot change your own role'
                                  : 'Change user role'
                              }
                            >
                              <option value="user">User</option>
                              <option value="creator">Creator</option>
                              <option value="manager">Manager</option>
                            </select>
                          </td>
                          <td className="p-3 text-center font-mono font-semibold">{user.vouchCount}</td>
                          <td className="p-3 text-center font-mono font-semibold">{user.reflectionCount}</td>
                          <td className="p-3 text-center font-mono font-semibold">{user.cardsCreated}</td>
                          <td className="p-3 text-right text-[11px] text-[#14213d]/60">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordChangeUser(user);
                                  setNewPassword('');
                                  setShowNewPassword(false);
                                }}
                                className="p-1.5 rounded-lg border border-[#e5e5e5] text-[#14213d]/70 hover:text-[#14213d] hover:bg-[#e5e5e5]/40 transition-colors cursor-pointer"
                                title="Change user password"
                              >
                                <Key className="w-3.5 h-3.5 text-[#fca311]" />
                              </button>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => setUserToDelete(user)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isLocked
                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed opacity-40'
                                    : 'border-red-200 text-red-600 hover:bg-red-50 cursor-pointer'
                                }`}
                                title={
                                  isSystemManager
                                    ? 'System manager account cannot be deleted'
                                    : isSelf
                                    ? 'Cannot delete your own account from admin panel'
                                    : 'Delete user account'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#e5e5e5]/10 border-t border-[#e5e5e5] text-xs text-[#14213d]/70">
              <div>Total {usersTotal} registered users</div>
              <div className="flex items-center gap-2">
                <span>
                  Page {usersPage} of {usersTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#e5e5e5] bg-white disabled:opacity-30 hover:bg-[#e5e5e5]/30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => setUsersPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-[#e5e5e5] bg-white disabled:opacity-30 hover:bg-[#e5e5e5]/30 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ANALYTICS DASHBOARD VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => loadAnalytics()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#e5e5e5] hover:bg-[#e5e5e5]/40 text-[#14213d] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
              Refresh Analytics
            </button>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-[#e5e5e5] shadow-xs">
              <div className="text-[11px] uppercase font-bold tracking-wider text-[#14213d]/50">
                Total Users
              </div>
              <div className="text-3xl font-extrabold text-[#14213d] mt-2 font-mono">
                {analytics?.totalUsers ?? '—'}
              </div>
              <div className="text-xs text-[#14213d]/60 mt-1">Registered voyagers</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#e5e5e5] shadow-xs">
              <div className="text-[11px] uppercase font-bold tracking-wider text-[#14213d]/50">
                Total Cards
              </div>
              <div className="text-3xl font-extrabold text-[#14213d] mt-2 font-mono">
                {analytics?.totalCards ?? '—'}
              </div>
              <div className="text-xs text-[#14213d]/60 mt-1">
                {analytics?.publishedCards ?? 0} published • {analytics?.unpublishedCards ?? 0} draft
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#e5e5e5] shadow-xs">
              <div className="text-[11px] uppercase font-bold tracking-wider text-[#14213d]/50">
                Total Vouches
              </div>
              <div className="text-3xl font-extrabold text-[#14213d] mt-2 font-mono">
                {analytics?.totalVouches ?? '—'}
              </div>
              <div className="text-xs text-[#14213d]/60 mt-1">All-time resonance holds</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#e5e5e5] shadow-xs">
              <div className="text-[11px] uppercase font-bold tracking-wider text-[#14213d]/50">
                Vouches (7 Days)
              </div>
              <div className="text-3xl font-extrabold text-[#fca311] mt-2 font-mono">
                {analytics?.vouchesThisWeek ?? '—'}
              </div>
              <div className="text-xs text-[#14213d]/60 mt-1">
                {analytics?.vouchesToday ?? 0} recorded today
              </div>
            </div>
          </div>

          {/* Leaderboards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Most Vouched Cards */}
            <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#14213d] mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#fca311]" />
                Top 10 Most Vouched Inquiries
              </h3>
              <div className="space-y-3">
                {analytics?.topCards?.length ? (
                  analytics.topCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="p-3 rounded-xl bg-[#e5e5e5]/20 border border-[#e5e5e5]/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#14213d] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-serif-clean font-medium text-[#14213d] truncate">
                            {card.question}
                          </p>
                          <p className="text-[10px] text-[#14213d]/60 mt-0.5">
                            {card.author} {card.category ? `• ${card.category}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold px-2.5 py-1 rounded-lg bg-[#fca311]/20 text-[#14213d] shrink-0">
                        {card.vouchCount} vouches
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#14213d]/50 italic">No vouches recorded yet.</p>
                )}
              </div>
            </div>

            {/* Top Active Reflectors */}
            <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#14213d] mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#14213d]" />
                Most Active Socratic Reflectors
              </h3>
              <div className="space-y-3">
                {analytics?.mostActiveReflectors?.length ? (
                  analytics.mostActiveReflectors.map((reflector, idx) => (
                    <div
                      key={reflector.id}
                      className="p-3 rounded-xl bg-[#e5e5e5]/20 border border-[#e5e5e5]/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#14213d]/80 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#14213d] truncate">
                            {reflector.email}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-[#e5e5e5] text-[#14213d] shrink-0">
                        {reflector.reflectionCount} sessions
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#14213d]/50 italic">No reflection sessions recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT CARD */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-[#e5e5e5] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#14213d] flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#fca311]" />
                  Edit Inquiry Card
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#e5e5e5]/40 text-[#14213d]/60 hover:text-[#14213d]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-[#14213d]">
                <div>
                  <label className="font-bold block mb-1">Headline Question *</label>
                  <textarea
                    rows={2}
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                    className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold block mb-1">Author *</label>
                    <input
                      type="text"
                      value={editForm.author}
                      onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d]"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Source Book / Essay *</label>
                    <input
                      type="text"
                      value={editForm.book}
                      onChange={(e) => setEditForm({ ...editForm, book: e.target.value })}
                      className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold block mb-1">Category *</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value as LifeStage })}
                      className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d] dark:bg-[#14213d] dark:text-white"
                    >
                      {LIFE_STAGES.filter((s) => s !== 'All Inquiries').map((stg) => (
                        <option key={stg} value={stg}>
                          {stg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Author Avatar URL</label>
                    <input
                      type="text"
                      value={editForm.authorAvatar}
                      onChange={(e) => setEditForm({ ...editForm, authorAvatar: e.target.value })}
                      className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Philosophical Backstory</label>
                  <textarea
                    rows={3}
                    value={editForm.backstory}
                    onChange={(e) => setEditForm({ ...editForm, backstory: e.target.value })}
                    className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d]"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">
                    Related Inquiries (One question per line)
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.relatedInquiries}
                    onChange={(e) => setEditForm({ ...editForm, relatedInquiries: e.target.value })}
                    className="w-full p-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl focus:outline-none focus:border-[#14213d]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="publishedCheckbox"
                    checked={editForm.published}
                    onChange={(e) => setEditForm({ ...editForm, published: e.target.checked })}
                    className="rounded border-[#e5e5e5] text-[#14213d] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="publishedCheckbox" className="font-bold cursor-pointer">
                    Published (visible in public deck)
                  </label>
                </div>
              </div>

              <div className="p-4 bg-[#e5e5e5]/20 border-t border-[#e5e5e5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#e5e5e5] text-[#14213d] font-semibold hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-[#14213d] text-white font-semibold hover:bg-black"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {cardToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-[#14213d]">Delete Inquiry Card?</h3>
              </div>
              <p className="text-xs text-[#14213d]/70 leading-relaxed">
                Are you sure you want to delete <span className="font-bold">"{cardToDelete.question}"</span>?
                This will permanently remove the card and cascade-delete all associated user vouches and reflection sessions.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCardToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-[#e5e5e5] text-xs font-semibold text-[#14213d] hover:bg-[#e5e5e5]/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL: ROLE CHANGE CONFIRMATION */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {roleChangePending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-[#14213d]">
                <Shield className="w-5 h-5 text-[#fca311]" />
                <h3 className="text-base font-bold text-[#14213d]">Confirm Role Change</h3>
              </div>
              <p className="text-xs text-[#14213d]/70 leading-relaxed">
                Change role of <span className="font-bold font-mono">{roleChangePending.user.email}</span> from{' '}
                <span className="font-bold uppercase">{roleChangePending.user.role}</span> to{' '}
                <span className="font-bold uppercase text-[#fca311]">{roleChangePending.newRole}</span>?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleChangePending(null)}
                  className="px-4 py-2 rounded-xl border border-[#e5e5e5] text-xs font-semibold text-[#14213d] hover:bg-[#e5e5e5]/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRoleChangeConfirm}
                  className="px-4 py-2 rounded-xl bg-[#14213d] text-white text-xs font-semibold hover:bg-black"
                >
                  Confirm Role Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL: CHANGE USER PASSWORD */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {passwordChangeUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <div className="flex items-center gap-2.5 text-[#14213d]">
                  <div className="w-8 h-8 rounded-xl bg-[#fca311]/15 text-[#fca311] flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#14213d]">Set User Password</h3>
                    <p className="text-[11px] text-[#14213d]/60 font-mono">{passwordChangeUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordChangeUser(null)}
                  className="p-1 rounded-lg hover:bg-[#e5e5e5]/40 text-[#14213d]/60 hover:text-[#14213d]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-[#14213d] block mb-1">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-3 pr-10 py-2.5 bg-[#e5e5e5]/20 border border-[#e5e5e5] rounded-xl text-xs text-[#14213d] focus:outline-none focus:border-[#14213d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#14213d]/50 hover:text-[#14213d]"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#14213d]/50 mt-1">
                    This will immediately update the authentication credentials for this user account.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e5e5]">
                  <button
                    type="button"
                    onClick={() => setPasswordChangeUser(null)}
                    className="px-4 py-2 rounded-xl border border-[#e5e5e5] text-xs font-semibold text-[#14213d] hover:bg-[#e5e5e5]/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newPassword.trim().length < 6 || isUpdatingPassword}
                    className="px-4 py-2 rounded-xl bg-[#14213d] text-white text-xs font-semibold hover:bg-black disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#fca311]" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL: DELETE USER CONFIRMATION */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-[#14213d]">Delete User Account?</h3>
              </div>
              <p className="text-xs text-[#14213d]/70 leading-relaxed">
                Are you sure you want to delete the user <span className="font-bold font-mono text-[#14213d]">{userToDelete.email}</span>?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 space-y-1">
                <p className="font-semibold">This action is permanent and will cascade-delete:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>User profile and authentication login</li>
                  <li>All personal vouches and bookmarks ({userToDelete.vouchCount})</li>
                  <li>All Socratic reflection sessions ({userToDelete.reflectionCount})</li>
                  <li>All custom inquiry cards created by this user ({userToDelete.cardsCreated})</li>
                </ul>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-[#e5e5e5] text-xs font-semibold text-[#14213d] hover:bg-[#e5e5e5]/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={handleDeleteUserConfirm}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeletingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete User Permanently'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL: BULK IMPORT CARDS */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e5e5e5] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-[#e5e5e5] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#14213d] flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#fca311]" />
                  Bulk Import Inquiry Cards
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportPreviewCards([]);
                    setImportErrors([]);
                  }}
                  className="p-1 rounded-lg hover:bg-[#e5e5e5]/40 text-[#14213d]/60 hover:text-[#14213d]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-[#14213d]">
                {/* Templates & Guidelines */}
                <div className="p-4 rounded-2xl bg-[#e5e5e5]/30 border border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#14213d]">Need a format template?</div>
                    <div className="text-[11px] text-[#14213d]/60 mt-0.5">
                      Download sample CSV or JSON templates structured for batch import.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/assets/templates/card-import-template.csv"
                      download="plenary_card_import_template.csv"
                      className="px-3 py-1.5 bg-white border border-[#e5e5e5] hover:bg-[#e5e5e5]/40 rounded-xl font-semibold text-[#14213d] flex items-center gap-1 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#fca311]" /> CSV Template
                    </a>
                    <a
                      href="/assets/templates/card-import-template.json"
                      download="plenary_card_import_template.json"
                      className="px-3 py-1.5 bg-white border border-[#e5e5e5] hover:bg-[#e5e5e5]/40 rounded-xl font-semibold text-[#14213d] flex items-center gap-1 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#fca311]" /> JSON Template
                    </a>
                  </div>
                </div>

                {/* File Dropzone */}
                <div>
                  <label className="font-bold block mb-2">Upload .CSV or .JSON File</label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-[#14213d] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#14213d] file:text-white hover:file:bg-black cursor-pointer border border-[#e5e5e5] rounded-2xl p-2 bg-[#e5e5e5]/20"
                  />
                </div>

                {/* Validation Warnings */}
                {importErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Validation issues found (
                      {importErrors.length}):
                    </div>
                    <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                      {importErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          Row {err.index + 1}: {err.message}
                        </li>
                      ))}
                      {importErrors.length > 5 && (
                        <li>...and {importErrors.length - 5} more issues</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Preview Table */}
                {importPreviewCards.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-bold">
                      Parsed Preview ({importPreviewCards.length} cards):
                    </div>
                    <div className="max-h-60 overflow-y-auto border border-[#e5e5e5] rounded-xl">
                      <table className="w-full text-left text-xs text-[#14213d]">
                        <thead className="bg-[#e5e5e5]/40 font-semibold border-b border-[#e5e5e5]">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Question</th>
                            <th className="p-2">Author</th>
                            <th className="p-2">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e5]/60">
                          {importPreviewCards.map((c, idx) => (
                            <tr key={idx} className="hover:bg-[#e5e5e5]/20">
                              <td className="p-2 font-mono text-[11px]">{idx + 1}</td>
                              <td className="p-2 font-serif-clean max-w-xs truncate">{c.question}</td>
                              <td className="p-2 whitespace-nowrap">{c.author}</td>
                              <td className="p-2 whitespace-nowrap">{c.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#e5e5e5]/20 border-t border-[#e5e5e5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportPreviewCards([]);
                    setImportErrors([]);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#e5e5e5] text-[#14213d] font-semibold hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importPreviewCards.length === 0 || isImporting}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 rounded-xl bg-[#14213d] text-white font-semibold hover:bg-black disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...
                    </>
                  ) : (
                    <>Import {importPreviewCards.length} Cards</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

