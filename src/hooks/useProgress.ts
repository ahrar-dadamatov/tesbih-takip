import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import {
  addTaps,
  discardPending,
  flushProgress,
  flushUnlocked,
  localDateStr,
  pendingCount,
  withSyncLock,
} from '../lib/progressSync';

export type ProgressEntry = {
  id: string;
  user_id: string;
  goal_item_id: string;
  date: string;
  count: number;
};

export function useProgress() {
  const { user } = useAuth();

  const getDateStr = (date?: Date) => localDateStr(date);

  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Неделя начинается в пятницу: в пятницу daysSinceFriday = 0, в четверг 6.
    const daysSinceFriday = (dayOfWeek + 2) % 7;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceFriday);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(getDateStr(d));
    }
    return dates;
  };

  const getPeriodDates = (period: 'daily' | 'weekly') =>
    period === 'daily' ? [getDateStr()] : getWeekDates();

  const queryPeriod = (userId: string, goalItemIds: string[], period: 'daily' | 'weekly') => {
    const dates = getPeriodDates(period);
    return supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .in('goal_item_id', goalItemIds)
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1]);
  };

  // Сначала досылаем накопленные нажатия, потом читаем: так экран не покажет устаревший счёт.
  // То, что отправить не удалось (нет интернета), добавляем к ответу базы.
  const fetchProgressForGoal = useCallback(async (goalItemIds: string[], period: 'daily' | 'weekly') => {
    if (!user || goalItemIds.length === 0) return [];

    return withSyncLock(async () => {
      await flushUnlocked();

      let rows: ProgressEntry[] = [];
      try {
        const { data, error } = await queryPeriod(user.id, goalItemIds, period);
        if (error) console.error('Error fetching progress:', error);
        else rows = data || [];
      } catch (e) {
        console.error('Network request failed or other exception:', e);
      }

      const dates = getPeriodDates(period);
      for (const goalItemId of goalItemIds) {
        const count = pendingCount(user.id, goalItemId, dates);
        if (count > 0) {
          rows.push({ id: `pending-${goalItemId}`, user_id: user.id, goal_item_id: goalItemId, date: getDateStr(), count });
        }
      }
      return rows;
    });
  }, [user]);

  const fetchFullHistory = useCallback(async () => {
    if (!user) return { data: [], error: 'Not authenticated' };

    try {
      await flushProgress();
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching full history:', error);
        return { data: [], error: error.message };
      }
      return { data: data || [], error: null };
    } catch (e: any) {
      console.error('Network request failed:', e);
      return { data: [], error: e.message || 'Network request failed' };
    }
  }, [user]);

  /** Мгновенно учитывает нажатия; в базу они уйдут сами чуть позже. */
  const addCount = useCallback((goalItemId: string, count: number = 1) => {
    if (!user) return;
    addTaps(user.id, goalItemId, count);
  }, [user]);

  /**
   * Делает счёт за период (день или неделю) равным newCount. Для недели меняем только
   * сегодняшнюю запись на разницу, чтобы по дням история не сбивалась; если для этого
   * пришлось бы уйти в минус, заменяем записи недели одной сегодняшней.
   */
  const setExactCount = useCallback(async (goalItemId: string, newCount: number, period: 'daily' | 'weekly') => {
    if (!user) return { error: 'Not authenticated' };
    const today = getDateStr();

    return withSyncLock(async () => {
      try {
        await flushUnlocked();
        discardPending(user.id, goalItemId);

        const { data, error: readErr } = await queryPeriod(user.id, [goalItemId], period);
        if (readErr) throw readErr;

        const rows: ProgressEntry[] = data || [];
        const total = rows.reduce((sum, row) => sum + row.count, 0);
        const todayRow = rows.find((row) => row.date === today);
        const todayCount = (todayRow?.count || 0) + newCount - total;

        if (todayCount >= 0) {
          const { error } = todayRow
            ? await supabase.from('progress').update({ count: todayCount }).eq('id', todayRow.id)
            : await supabase.from('progress').insert({ user_id: user.id, goal_item_id: goalItemId, date: today, count: todayCount });
          if (error) throw error;
        } else {
          const { error: delErr } = await supabase.from('progress').delete().in('id', rows.map((row) => row.id));
          if (delErr) throw delErr;
          const { error } = await supabase
            .from('progress')
            .insert({ user_id: user.id, goal_item_id: goalItemId, date: today, count: newCount });
          if (error) throw error;
        }
        return { error: null, newCount };
      } catch (e: any) {
        return { error: e.message || String(e), newCount: 0 };
      }
    });
  }, [user]);

  /** Обнуляет счёт за весь период цели, а не только за сегодня. */
  const resetCount = useCallback(async (goalItemId: string, period: 'daily' | 'weekly') => {
    if (!user) return { error: 'Not authenticated' };
    const dates = getPeriodDates(period);

    return withSyncLock(async () => {
      discardPending(user.id, goalItemId);
      const { error } = await supabase
        .from('progress')
        .delete()
        .eq('user_id', user.id)
        .eq('goal_item_id', goalItemId)
        .gte('date', dates[0])
        .lte('date', dates[dates.length - 1]);
      return { error: error ? error.message : null };
    });
  }, [user]);

  const getTotalForItem = (progressList: ProgressEntry[], goalItemId: string) => {
    return progressList
      .filter(p => p.goal_item_id === goalItemId)
      .reduce((sum, p) => sum + p.count, 0);
  };

  return {
    fetchProgressForGoal,
    fetchFullHistory,
    addCount,
    setExactCount,
    resetCount,
    getTotalForItem,
    getDateStr,
    getWeekDates,
  };
}