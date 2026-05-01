import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { GameState, SaveMetadata } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLOUD_SAVE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type SaveSlot = 1 | 2 | 3 | 'auto';

type CloudSaveRow = {
  slot: string;
  game_state: GameState;
  player_name: string | null;
  difficulty: string | null;
  current_turn: number;
  net_worth: number | null;
  is_game_over: boolean;
  created_at: string;
  updated_at: string;
};

let client: SupabaseClient | null = null;
let userPromise: Promise<User | null> | null = null;

export function isCloudSaveConfigured(): boolean {
  return CLOUD_SAVE_ENABLED;
}

function getClient(): SupabaseClient | null {
  if (!CLOUD_SAVE_ENABLED) return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'stocksim_supabase_auth',
      },
    });
  }
  return client;
}

function getSlotKey(slot: SaveSlot): string {
  return slot === 'auto' ? 'auto' : `slot_${slot}`;
}

function numericSlot(slotKey: string): SaveSlot {
  if (slotKey === 'auto') return 'auto';
  if (slotKey === 'slot_1') return 1;
  if (slotKey === 'slot_2') return 2;
  if (slotKey === 'slot_3') return 3;
  return 'auto';
}

function latestNetWorth(state: GameState): number {
  return state.netWorthHistory?.[state.netWorthHistory.length - 1]?.netWorth ?? state.cash;
}

function reviveDates(state: GameState): GameState {
  return {
    ...state,
    currentDate: new Date(state.currentDate),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    stocks: state.stocks.map(stock => ({
      ...stock,
      priceHistory: (stock.priceHistory || []).map(point => ({ ...point })),
    })),
    netWorthHistory: state.netWorthHistory?.map(snapshot => ({
      ...snapshot,
      date: new Date(snapshot.date),
    })) || [],
    transactionHistory: state.transactionHistory?.map(txn => ({
      ...txn,
      date: new Date(txn.date),
    })) || [],
    newsHistory: state.newsHistory?.map(news => ({
      ...news,
      date: new Date(news.date),
    })) || [],
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      events: state.currentScenario.events.map(event => ({
        ...event,
        date: new Date(event.date),
      })),
    } : null,
  };
}

async function ensureCloudUser(): Promise<User | null> {
  const supabase = getClient();
  if (!supabase) return null;
  if (!userPromise) {
    userPromise = (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (sessionData.session?.user) return sessionData.session.user;

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return data.user;
    })();
  }
  return userPromise;
}

async function ensureProfile(user: User, displayName?: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: displayName || user.user_metadata?.name || 'Guest Trader',
      avatar_url: user.user_metadata?.avatar_url || null,
      is_anonymous: Boolean(user.is_anonymous),
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function cloudSaveGame(slot: SaveSlot, state: GameState): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;

  const user = await ensureCloudUser();
  if (!user) return false;
  await ensureProfile(user, state.playerName);

  const { error } = await supabase
    .from('game_saves')
    .upsert({
      user_id: user.id,
      slot: getSlotKey(slot),
      game_state: state,
      player_name: state.playerName,
      difficulty: state.difficulty,
      current_turn: state.currentTurn,
      net_worth: latestNetWorth(state),
      is_game_over: state.isGameOver,
    }, { onConflict: 'user_id,slot' });

  if (error) throw error;
  return true;
}

export async function cloudLoadGame(slot: SaveSlot): Promise<GameState | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const user = await ensureCloudUser();
  if (!user) return null;
  await ensureProfile(user);

  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('user_id', user.id)
    .eq('slot', getSlotKey(slot))
    .maybeSingle();

  if (error) throw error;
  if (!data?.game_state) return null;
  return reviveDates(data.game_state as GameState);
}

export async function cloudGetSaveMetadata(): Promise<SaveMetadata[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const user = await ensureCloudUser();
  if (!user) return [];
  await ensureProfile(user);

  const { data, error } = await supabase
    .from('game_saves')
    .select('slot, game_state, player_name, difficulty, current_turn, net_worth, is_game_over, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data as CloudSaveRow[]).map(row => {
    const state = row.game_state;
    return {
      slot: numericSlot(row.slot),
      playerName: row.player_name || state?.playerName || 'Unknown',
      difficulty: (row.difficulty || state?.difficulty || 'normal') as SaveMetadata['difficulty'],
      currentTurn: row.current_turn || state?.currentTurn || 0,
      turnLimit: state?.difficulty === 'easy' ? 120 : state?.difficulty === 'hard' ? 80 : state?.difficulty === 'expert' ? 60 : 100,
      netWorth: Number(row.net_worth ?? latestNetWorth(state)),
      cash: Number(state?.cash ?? 0),
      date: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      exists: true,
    };
  });
}

export async function cloudDeleteSave(slot: SaveSlot): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;

  const user = await ensureCloudUser();
  if (!user) return false;

  const { error } = await supabase
    .from('game_saves')
    .delete()
    .eq('user_id', user.id)
    .eq('slot', getSlotKey(slot));

  if (error) throw error;
  return true;
}
