import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export type GoalItem = {
  id: string;
  goal_id: string;
  dhikr_name: string;
  description?: string;
  target_count: number;
  sort_order: number;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  period: 'weekly' | 'daily';
  is_active: boolean;
  is_global: boolean;
  invite_code?: string;
  created_at: string;
  goal_items: GoalItem[];
};

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('goals')
        .select('*, goal_items(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (err) throw err;
      
      // Sort goal items
      const sorted = (data || []).map((g: any) => ({
        ...g,
        goal_items: (g.goal_items || []).sort((a: GoalItem, b: GoalItem) => a.sort_order - b.sort_order),
      }));
      setGoals(sorted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (
    name: string,
    period: 'weekly' | 'daily',
    items: { dhikr_name: string; description?: string; target_count: number }[]
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data: goal, error: goalErr } = await supabase
        .from('goals')
        .insert({ user_id: user.id, name, period })
        .select()
        .single();

      if (goalErr) throw goalErr;

      const goalItems = items.map((item, index) => ({
        goal_id: goal.id,
        dhikr_name: item.dhikr_name,
        description: item.description,
        target_count: item.target_count,
        sort_order: index,
      }));

      const { error: itemsErr } = await supabase
        .from('goal_items')
        .insert(goalItems);

      if (itemsErr) throw itemsErr;

      await fetchGoals();
      return { error: null, goalId: goal.id };
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const updateGoal = async (
    goalId: string,
    name: string,
    period: 'weekly' | 'daily',
    items: { id?: string; dhikr_name: string; description?: string; target_count: number }[]
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: goalErr } = await supabase
        .from('goals')
        .update({ name, period })
        .eq('id', goalId);

      if (goalErr) throw goalErr;

      // Удаление зикра каскадно удаляет весь его счёт в progress, поэтому существующие зикры
      // обновляем на месте, а удаляем только те, что пользователь убрал из списка, и только в конце:
      // если что-то упадёт раньше, цель не останется без зикров.
      const { data: existingItems, error: fetchErr } = await supabase
        .from('goal_items')
        .select('id')
        .eq('goal_id', goalId);

      if (fetchErr) throw fetchErr;

      const existingIds = new Set((existingItems || []).map((item: { id: string }) => item.id));
      const fields = (item: (typeof items)[number], index: number) => ({
        dhikr_name: item.dhikr_name,
        description: item.description,
        target_count: item.target_count,
        sort_order: index,
      });

      for (const [index, item] of items.entries()) {
        if (!item.id || !existingIds.has(item.id)) continue;
        const { error: updErr } = await supabase
          .from('goal_items')
          .update(fields(item, index))
          .eq('id', item.id);

        if (updErr) throw updErr;
      }

      const newItems = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.id || !existingIds.has(item.id))
        .map(({ item, index }) => ({ goal_id: goalId, ...fields(item, index) }));

      if (newItems.length > 0) {
        const { error: insErr } = await supabase.from('goal_items').insert(newItems);
        if (insErr) throw insErr;
      }

      const keptIds = new Set(items.map((item) => item.id).filter(Boolean));
      const removedIds = [...existingIds].filter((id) => !keptIds.has(id));

      if (removedIds.length > 0) {
        const { error: delErr } = await supabase.from('goal_items').delete().in('id', removedIds);
        if (delErr) throw delErr;
      }

      await fetchGoals();
      return { error: null };
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error: err } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (err) throw err;
      await fetchGoals();
      return { error: null };
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const generateInviteCode = async (goalId: string) => {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase
        .from('goals')
        .update({ invite_code: code })
        .eq('id', goalId);
      
      if (error) throw error;
      await fetchGoals();
      return { error: null, code };
    } catch (e: any) {
      return { error: e.message, code: null };
    }
  };

  const joinGoal = async (inviteCode: string) => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { data, error } = await supabase.rpc('join_goal_by_invite', {
        p_invite_code: inviteCode
      });
      
      if (error) throw error;
      await fetchGoals();
      return { error: null, goalId: data };
    } catch (e: any) {
      return { error: e.message };
    }
  };

  return { goals, loading, error, fetchGoals, createGoal, updateGoal, deleteGoal, generateInviteCode, joinGoal };
}