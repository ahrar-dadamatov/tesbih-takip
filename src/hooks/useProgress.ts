import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export type ProgressEntry = {
  id: string;
  user_id: string;
  goal_item_id: string;
  date: string;
  count: number;
};

export function useProgress() {
  const { user } = useAuth();

  const getDateStr = (date?: Date) => {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
  };

  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(getDateStr(d));
    }
    return dates;
  };

  const fetchProgressForGoal = useCallback(async (goalItemIds: string[], period: 'daily' | 'weekly') => {
    if (!user || goalItemIds.length === 0) return [];

    let query = supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .in('goal_item_id', goalItemIds);

    if (period === 'daily') {
      query = query.eq('date', getDateStr());
    } else {
      const weekDates = getWeekDates();
      query = query.gte('date', weekDates[0]).lte('date', weekDates[6]);
    }

    try {
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching progress:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('Network request failed or other exception:', e);
      return [];
    }
  }, [user]);

  const incrementCount = useCallback(async (goalItemId: string, incrementBy: number = 1) => {
    if (!user) return { error: 'Not authenticated' };

    const today = getDateStr();

    try {
      // Try to get existing progress
      const { data: existing } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_item_id', goalItemId)
        .eq('date', today)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('progress')
          .update({ count: existing.count + incrementBy })
          .eq('id', existing.id);
        
        if (error) throw error;
        return { error: null, newCount: existing.count + incrementBy };
      } else {
        const { error } = await supabase
          .from('progress')
          .insert({
            user_id: user.id,
            goal_item_id: goalItemId,
            date: today,
            count: incrementBy,
          });
        
        if (error) throw error;
        return { error: null, newCount: incrementBy };
      }
    } catch (e: any) {
      return { error: e.message, newCount: 0 };
    }
  }, [user]);

  const resetCount = useCallback(async (goalItemId: string) => {
    if (!user) return;

    const today = getDateStr();
    await supabase
      .from('progress')
      .delete()
      .eq('user_id', user.id)
      .eq('goal_item_id', goalItemId)
      .eq('date', today);
  }, [user]);

  const getTotalForItem = (progressList: ProgressEntry[], goalItemId: string) => {
    return progressList
      .filter(p => p.goal_item_id === goalItemId)
      .reduce((sum, p) => sum + p.count, 0);
  };

  return {
    fetchProgressForGoal,
    incrementCount,
    resetCount,
    getTotalForItem,
    getDateStr,
    getWeekDates,
  };
}