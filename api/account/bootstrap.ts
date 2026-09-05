import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authorization = req.headers.authorization;
  const accessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Account bootstrap is not configured on the server.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !user?.email) return res.status(401).json({ error: 'Your session is invalid or missing an email.' });

  const displayName = typeof user.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name
    : typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : null;
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });

  if (profileError) return res.status(500).json({ error: profileError.message });
  return res.status(204).send('');
}
