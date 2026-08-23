import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
import { APP_CONFIG } from './config.js';

const looksConfigured = !APP_CONFIG.supabase.url.includes('PEGA_AQUI') && !APP_CONFIG.supabase.key.includes('PEGA_AQUI');

export const supabase = looksConfigured
  ? createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

export function assertConfigured() {
  if (!supabase) throw new Error('Supabase todavía no está configurado. Abre js/config.js y coloca URL + publishable/anon key.');
}

export async function ensureVisitorSession() {
  assertConfigured();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export async function isPermanentUser() {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session?.user && session.user.is_anonymous === false;
}

export async function requirePermanentUser() {
  assertConfigured();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user || session.user.is_anonymous !== false) {
    throw new Error('Debes iniciar sesión con una cuenta permanente para editar.');
  }
  return session.user;
}

export async function signInAdmin(email, password) {
  assertConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  assertConfigured();
  await supabase.auth.signOut();
  return ensureVisitorSession();
}
