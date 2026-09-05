import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../providers/LanguageProvider';
import { useGoals } from '../../hooks/useGoals';
import { useProgress, ProgressEntry } from '../../hooks/useProgress';
import { theme } from '../../constants/theme';

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay();
  const daysSinceFriday = (dayOfWeek + 2) % 7;
  
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - daysSinceFriday);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    label: `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`,
    sortKey: startOfWeek.toISOString().split('T')[0]
  };
}

type GroupedHistory = {
  label: string;
  sortKey: string;
  totals: Record<string, number>; // goal_item_id -> count
};

export default function HistoryScreen() {
  const { t } = useLanguage();
  const { goals, loading: goalsLoading, fetchGoals } = useGoals();
  const { fetchFullHistory } = useProgress();
  
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await fetchFullHistory();
    setHistory(data);
    setLoading(false);
  }, [fetchFullHistory]);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
      loadData();
    }, [fetchGoals, loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    await loadData();
    setRefreshing(false);
  };

  // Group history by week
  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedHistory> = {};
    
    history.forEach(entry => {
      const week = getWeekRange(entry.date);
      if (!groups[week.sortKey]) {
        groups[week.sortKey] = {
          label: week.label,
          sortKey: week.sortKey,
          totals: {}
        };
      }
      
      if (!groups[week.sortKey].totals[entry.goal_item_id]) {
        groups[week.sortKey].totals[entry.goal_item_id] = 0;
      }
      groups[week.sortKey].totals[entry.goal_item_id] += entry.count;
    });
    
    return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [history]);

  // Map goal item IDs to names
  const itemNames = useMemo(() => {
    const map: Record<string, { goal: string, item: string }> = {};
    goals.forEach(g => {
      g.goal_items.forEach(i => {
        map[i.id] = { goal: g.name, item: i.dhikr_name };
      });
    });
    return map;
  }, [goals]);

  if (loading || goalsLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{(t as any).history}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {groupedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>{t.noGoalsYet}</Text>
          </View>
        ) : (
          groupedData.map(group => (
            <View key={group.sortKey} style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <Text style={styles.weekLabel}>{group.label}</Text>
              </View>
              <View style={styles.weekContent}>
                {Object.entries(group.totals).map(([itemId, count]) => {
                  const names = itemNames[itemId];
                  if (!names) return null; // Goal might have been deleted
                  
                  return (
                    <View key={itemId} style={styles.historyItem}>
                      <View style={styles.historyItemInfo}>
                        <Text style={styles.dhikrName}>{names.item}</Text>
                        <Text style={styles.goalName}>{names.goal}</Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{count}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: theme.borderRadius.2xl,
    borderBottomRightRadius: theme.borderRadius.2xl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.2xl,
    fontWeight: '800',
    color: theme.colors.text,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 100, // For tab bar
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  weekCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weekHeader: {
    backgroundColor: 'rgba(212, 168, 83, 0.1)',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  weekLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  weekContent: {
    padding: theme.spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyItemInfo: {
    flex: 1,
  },
  dhikrName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  goalName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.3)',
  },
  countText: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
});
