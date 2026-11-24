export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
  user: AuthUser;
}

interface SupabaseAuthPayload {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user: AuthUser;
}

const STORAGE_KEY = "adrab.auth.session";
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function requireConfig(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return { url: supabaseUrl, key: supabaseAnonKey };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { msg?: string; message?: string; error_description?: string; error?: string };
    return body.msg || body.message || body.error_description || body.error || `Authentication request failed (${response.status}).`;
  } catch {
    return `Authentication request failed (${response.status}).`;
  }
}

function normalizeSession(payload: SupabaseAuthPayload): AuthSession {
  const expiresAt = payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type || "bearer",
    expires_at: expiresAt,
    user: payload.user,
  };
}

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeAuthSession(session: AuthSession | null): void {
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const { url, key } = requireConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const session = normalizeSession(await response.json() as SupabaseAuthPayload);
  storeAuthSession(session);
  return session;
}

export async function refreshAuthSession(session: AuthSession): Promise<AuthSession> {
  const { url, key } = requireConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    storeAuthSession(null);
    throw new Error(await readError(response));
  }
  const refreshed = normalizeSession(await response.json() as SupabaseAuthPayload);
  storeAuthSession(refreshed);
  return refreshed;
}

export async function fetchAuthUser(session: AuthSession): Promise<AuthUser> {
  const { url, key } = requireConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error(await readError(response));
  return await response.json() as AuthUser;
}

export async function signOutFromSupabase(session: AuthSession | null): Promise<void> {
  if (!session || !supabaseUrl || !supabaseAnonKey) return;
  const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok && response.status !== 401) {
    throw new Error(await readError(response));
  }
}
