import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Нажатия на счётчик сначала копятся здесь и в памяти телефона, а в базу уходят пачкой через
// полторы секунды тишины. Так счёт не теряется ни при закрытии приложения, ни без интернета:
// неотправленное лежит в AsyncStorage и досылается при следующей возможности.

export type SyncStatus = 'saved' | 'saving' | 'offline';

const STORAGE_KEY = 'tesbih:pending-progress';
const FLUSH_DELAY_MS = 1500;
const RETRY_DELAY_MS = 10000;
const FOREIGN_KEY_VIOLATION = '23503';

// Ключ: `${userId}|${goalItemId}|${date}` → сколько нажатий ещё не записано в базу
let pending: Record<string, number> = {};
let status: SyncStatus = 'saved';
let timer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(status: SyncStatus) => void>();

const ready = AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved: Record<string, number> = JSON.parse(raw);
    for (const [key, count] of Object.entries(saved)) {
      pending[key] = (pending[key] || 0) + count;
    }
    if (Object.keys(pending).length > 0) schedule(0);
  })
  .catch((e) => console.warn('Не удалось прочитать несохранённый счёт:', e));

export function localDateStr(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending)).catch((e) =>
    console.warn('Не удалось сохранить счёт на телефоне:', e)
  );
}

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener(next));
}

function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    flushProgress();
  }, delay);
}

/** Выполняет fn строго после текущих записей и не даёт новым записям начаться, пока fn не закончит. */
export function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export function addTaps(userId: string, goalItemId: string, count = 1) {
  const key = `${userId}|${goalItemId}|${localDateStr()}`;
  pending[key] = (pending[key] || 0) + count;
  persist();
  setStatus('saving');
  schedule(FLUSH_DELAY_MS);
}

/** Сумма ещё не записанных нажатий по зикру за указанные дни. */
export function pendingCount(userId: string, goalItemId: string, dates: string[]) {
  let total = 0;
  for (const date of dates) total += pending[`${userId}|${goalItemId}|${date}`] || 0;
  return total;
}

/** Сбрасывает несохранённые нажатия по зикру, например перед обнулением счётчика. */
export function discardPending(userId: string, goalItemId: string) {
  for (const key of Object.keys(pending)) {
    if (key.startsWith(`${userId}|${goalItemId}|`)) delete pending[key];
  }
  persist();
}

async function addToRow(userId: string, goalItemId: string, date: string, count: number) {
  const { data: existing, error: readErr } = await supabase
    .from('progress')
    .select('id, count')
    .eq('user_id', userId)
    .eq('goal_item_id', goalItemId)
    .eq('date', date)
    .maybeSingle();
  if (readErr) throw readErr;

  const { error } = existing
    ? await supabase.from('progress').update({ count: existing.count + count }).eq('id', existing.id)
    : await supabase.from('progress').insert({ user_id: userId, goal_item_id: goalItemId, date, count });
  if (error) throw error;
}

/** Записывает в базу всё накопленное. Вызывать только внутри withSyncLock. */
export async function flushUnlocked() {
  await ready;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  const keys = Object.keys(pending).filter((key) => key.startsWith(`${userId}|`));
  if (keys.length === 0) {
    setStatus('saved');
    return;
  }

  setStatus('saving');
  let failed = false;

  for (const key of keys) {
    const count = pending[key];
    if (!count) continue;
    const [, goalItemId, date] = key.split('|');

    try {
      await addToRow(userId, goalItemId, date, count);
      // Нажатия, сделанные во время записи, остаются в очереди
      pending[key] -= count;
      if (pending[key] <= 0) delete pending[key];
      persist();
    } catch (e: any) {
      if (e?.code === FOREIGN_KEY_VIOLATION) {
        // Зикр уже удалён: записывать этот счёт некуда
        delete pending[key];
        persist();
      } else {
        console.warn('Счёт не отправлен, повторим позже:', e?.message ?? e);
        failed = true;
      }
    }
  }

  if (failed) {
    setStatus('offline');
    schedule(RETRY_DELAY_MS);
  } else {
    setStatus(Object.keys(pending).some((key) => key.startsWith(`${userId}|`)) ? 'saving' : 'saved');
  }
}

export function flushProgress(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return withSyncLock(flushUnlocked);
}

export function getSyncStatus() {
  return status;
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  // Приложение свернули или закрыли: отправляем сразу, не дожидаясь таймера
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushProgress();
  });
  window.addEventListener('online', () => flushProgress());
}
