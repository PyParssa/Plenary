import {
  AdminCard,
  AdminUser,
  AnalyticsOverview,
  BulkImportCard,
  BulkImportResult,
  UserRole,
} from '../types';

/**
 * Returns the full API URL for a given endpoint.
 * If VITE_API_URL is configured, it prepends the base URL.
 * Otherwise returns the relative endpoint as-is for local Vite proxy forwarding.
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (baseUrl && baseUrl.trim()) {
    const cleanBase = baseUrl.trim().replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
  return endpoint;
}

/**
 * Admin API Helper: Fetch paginated, sortable, filterable list of cards
 */
export async function adminFetchCards(
  token: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<{ cards: AdminCard[]; total: number; page: number; per_page: number }> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.set(k, String(v));
      }
    });
  }

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const res = await fetch(getApiUrl(`/api/admin/cards${queryString}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to fetch cards: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin API Helper: Update card fields or toggle published status
 */
export async function adminUpdateCard(
  token: string,
  cardId: string,
  updates: Partial<AdminCard>
): Promise<{ ok: boolean; card: any }> {
  const payload: Record<string, any> = {};
  if (updates.question !== undefined) payload.question = updates.question;
  if (updates.backstory !== undefined) payload.backstory = updates.backstory;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.author !== undefined) payload.author = updates.author;
  if (updates.authorAvatar !== undefined) payload.author_avatar = updates.authorAvatar;
  if (updates.authorBio !== undefined) payload.author_bio = updates.authorBio;
  if (updates.book !== undefined) payload.book = updates.book;
  if (updates.relatedInquiries !== undefined) payload.related_inquiries = updates.relatedInquiries;
  if (updates.published !== undefined) payload.published = updates.published;

  const res = await fetch(getApiUrl(`/api/admin/cards/${encodeURIComponent(cardId)}`), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to update card: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin API Helper: Delete a card
 */
export async function adminDeleteCard(
  token: string,
  cardId: string
): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(getApiUrl(`/api/admin/cards/${encodeURIComponent(cardId)}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to delete card: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin API Helper: Bulk import cards
 */
export async function adminImportCards(
  token: string,
  cards: BulkImportCard[]
): Promise<BulkImportResult> {
  const res = await fetch(getApiUrl('/api/admin/cards/import'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cards }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to import cards: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin API Helper: Export cards as file download
 */
export async function adminExportCards(
  token: string,
  format: 'json' | 'csv',
  category?: string,
  published?: boolean
): Promise<Blob> {
  const searchParams = new URLSearchParams({ format });
  if (category && category !== 'All Inquiries') searchParams.set('category', category);
  if (published !== undefined) searchParams.set('published', String(published));

  const res = await fetch(getApiUrl(`/api/admin/cards/export?${searchParams.toString()}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to export cards: ${res.statusText}`);
  }

  return res.blob();
}

/**
 * Admin API Helper: Fetch registered users with activity stats
 */
export async function adminFetchUsers(
  token: string,
  params?: Record<string, string | number | undefined>
): Promise<{ users: AdminUser[]; total: number; page: number; per_page: number }> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.set(k, String(v));
      }
    });
  }

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const res = await fetch(getApiUrl(`/api/admin/users${queryString}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to fetch users: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin API Helper: Update user role
 */
export async function adminUpdateUserRole(
  token: string,
  userId: string,
  role: UserRole
): Promise<{ ok: boolean; id: string; role: UserRole }> {
  const res = await fetch(getApiUrl(`/api/admin/users/${encodeURIComponent(userId)}/role`), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to update user role: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin API Helper: Fetch overview analytics
 */
export async function adminFetchAnalytics(token: string): Promise<AnalyticsOverview> {
  const res = await fetch(getApiUrl('/api/admin/analytics'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to fetch analytics: ${res.statusText}`);
  }

  return res.json();
}
