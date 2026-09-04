import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useLanguage } from '../../providers/LanguageProvider';
import { useGoals, GoalItem } from '../../hooks/useGoals';
import { useProgress } from '../../hooks/useProgress';
import { CounterButton } from '../../components/CounterButton';
import { CircularProgress } from '../../components/CircularProgress';
import { theme } from '../../constants/theme';

export default function CounterScreen() {
  const { t } = useLanguage();
  const { goals, loading: goalsLoading, fetchGoals } = useGoals();
  const { incrementCount, resetCount, fetchProgressForGoal, getTotalForItem } = useProgress();
  const params = useLocalSearchParams<{ goalItemId?: string; goalId?: string }>();

  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  

  const countAnim = useSharedValue(1);

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countAnim.value }],
  }));

  // Flatten all goal items for selection
  const allItems: { goalItem: GoalItem; goalName: string; goalId: string; period: 'weekly' | 'daily' }[] = [];
  goals.forEach((goal) => {
    goal.goal_items.forEach((item) => {
      allItems.push({
        goalItem: item,
        goalName: goal.name,
        goalId: goal.id,
        period: goal.period,
      });
    });
  });

  // Set initial selection based on params
  useEffect(() => {
    if (params.goalItemId && allItems.length > 0) {
      const idx = allItems.findIndex((i) => i.goalItem.id === params.goalItemId);
      if (idx >= 0) setSelectedItemIndex(idx);
    }
  }, [params.goalItemId, allItems.length]);

  const selectedItem = allItems[selectedItemIndex];

  // Load current count
  const loadCountForId = async (goalItemId: string, period: 'weekly' | 'daily') => {
    const progress = await fetchProgressForGoal([goalItemId], period);
    const total = getTotalForItem(progress, goalItemId);
    setCurrentCount(total);
  };

  // Only run when the selected goal item changes
  useEffect(() => {
    if (selectedItem) {
      loadCountForId(selectedItem.goalItem.id, selectedItem.period);
    }
  }, [selectedItem?.goalItem.id, selectedItem?.period]);

  // Only run ONCE when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchGoals();
      // We don't call loadCount here because useEffect above will handle it when selectedItem is ready,
      // and we want to avoid re-fetching on every state change.
    }, [])
  );

    const syncState = useRef({ id: '', count: 0 });
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);

  const flushSync = useCallback(async () => {
    if (syncState.current.count > 0 && syncState.current.id) {
      const { id, count } = syncState.current;
      syncState.current.count = 0;
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      
      const { error } = await incrementCount(id, count);
      if (error) {
        console.error('Sync failed:', error);
      }
    }
  }, [incrementCount]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        flushSync();
      };
    }, [flushSync])
  );

  const handleCount = () => {
    if (!selectedItem) return;

    setCurrentCount((prev) => prev + 1);
    const newCount = currentCount + 1;

    countAnim.value = withSpring(1.15, { damping: 5, stiffness: 300 }, () => {
      countAnim.value = withSpring(1);
    });

    if (newCount >= selectedItem.goalItem.target_count && currentCount < selectedItem.goalItem.target_count) {
      Alert.alert('Tebrikler', t.goalCompleted);
    }

    if (syncState.current.id && syncState.current.id !== selectedItem.goalItem.id) {
      flushSync();
    }

    syncState.current.id = selectedItem.goalItem.id;
    syncState.current.count += 1;

    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    
    syncTimeout.current = setTimeout(() => {
      flushSync();
    }, 20000);
  };

  const handleCountRef = useRef(handleCount);
  useEffect(() => {
    handleCountRef.current = handleCount;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleCountRef.current();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReset = () => {
    if (!selectedItem) return;
    Alert.alert(t.reset, t.resetConfirm, [
      { text: t.no, style: 'cancel' },
      {
        text: t.yes,
        style: 'destructive',
        onPress: async () => {
          await resetCount(selectedItem.goalItem.id);
          setCurrentCount(0);
        },
      },
    ]);
  };

  const selectPrev = () => {
    if (selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1);
    }
  };

  const selectNext = () => {
    if (selectedItemIndex < allItems.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1);
    }
  };

  if (goalsLoading && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </LinearGradient>
      </View>
    );
  }

  if (allItems.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.surface, theme.colors.background]}
          style={styles.emptyContainer}
        >
          <Text style={styles.emptyIcon}>📿</Text>
          <Text style={styles.emptyText}>{t.noGoalsYet}</Text>
        </LinearGradient>
      </View>
    );
  }

  const target = selectedItem?.goalItem.target_count || 0;
  const progress = target > 0 ? currentCount / target : 0;
  const isCompleted = currentCount >= target;
  const progressColor = isCompleted ? theme.colors.success : theme.colors.primary;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        style={styles.gradient}
      >
        {/* Dhikr selector */}
        <View style={styles.selectorContainer}>
          <Pressable onPress={selectPrev} style={styles.arrowButton}>
            <Text style={[styles.arrow, selectedItemIndex === 0 && styles.arrowDisabled]}>‹</Text>
          </Pressable>
          <View style={styles.selectorInfo}>
            <Text style={styles.dhikrName} numberOfLines={1}>
              {selectedItem?.goalItem.dhikr_name}
            </Text>
            {selectedItem?.goalItem.description ? (
              <Text style={styles.dhikrDescription} numberOfLines={2}>
                {selectedItem.goalItem.description}
              </Text>
            ) : null}
            <Text style={styles.goalLabel}>{selectedItem?.goalName}</Text>
          </View>
          <Pressable onPress={selectNext} style={styles.arrowButton}>
            <Text style={[styles.arrow, selectedItemIndex === allItems.length - 1 && styles.arrowDisabled]}>›</Text>
          </Pressable>
        </View>

        {/* Counter display (Clickable) */}
        <View style={[styles.counterArea, { flex: 1, justifyContent: 'center' }]}>
          <Pressable 
            onPress={handleCount} 
            disabled={isCompleted}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <CircularProgress
              size={320}
              strokeWidth={10}
              progress={Math.min(progress, 1)}
              color={progressColor}
            >
              <Animated.View style={[styles.countDisplay, countStyle]}>
                <Text style={[styles.countText, { color: progressColor }]}>
                  {currentCount}
                </Text>
                <Text style={styles.targetText}>
                  {t.target}: {target}
                </Text>
                <Text style={[styles.buttonLabel, { marginTop: 24 }]}>
                  {isCompleted ? '✓' : t.tapToCount}
                </Text>
              </Animated.View>
            </CircularProgress>
          </Pressable>
        </View>

        {/* Reset button */}
        <View style={styles.resetArea}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.resetButton, pressed && styles.resetPressed]}
          >
            <Text style={styles.resetText}>{t.reset}</Text>
          </Pressable>
        </View>

        {/* Item dots indicator */}
        <View style={styles.dots}>
          {allItems.map((_, idx) => (
            <Pressable key={idx} onPress={() => setSelectedItemIndex(idx)}>
              <View
                style={[
                  styles.dot,
                  idx === selectedItemIndex && styles.dotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  arrowButton: {
    padding: theme.spacing.md,
  },
  arrow: {
    fontSize: 36,
    color: theme.colors.primary,
    fontWeight: '300',
  },
  arrowDisabled: {
    color: theme.colors.textMuted,
  },
  selectorInfo: {
    flex: 1,
    alignItems: 'center',
  },
  dhikrName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  goalLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryLight,
    marginTop: 2,
  },
  dhikrDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: theme.spacing.sm,
  },
  counterArea: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  countDisplay: {
    alignItems: 'center',
  },
  countText: {
    fontSize: theme.fontSize.counter,
    fontWeight: '800',
  },
  targetText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  buttonArea: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  buttonLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryLight,
    textAlign: 'center',
    fontWeight: '600',
  },
  resetArea: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  resetButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetPressed: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: theme.colors.error,
  },
  resetText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: theme.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textMuted,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
});