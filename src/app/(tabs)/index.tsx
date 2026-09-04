import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import { useGoals, Goal } from '../../hooks/useGoals';
import { useProgress, ProgressEntry } from '../../hooks/useProgress';
import { DhikrCard } from '../../components/DhikrCard';
import { CircularProgress } from '../../components/CircularProgress';
import { theme } from '../../constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { goals, loading, fetchGoals, generateInviteCode, joinGoal } = useGoals();
  const { fetchProgressForGoal, getTotalForItem } = useProgress();
  const router = useRouter();
    const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressEntry[]>>({});
  const [inviteCode, setInviteCode] = useState((params.invite as string) || '');

  const loadProgress = useCallback(async () => {
    const map: Record<string, ProgressEntry[]> = {};
    for (const goal of goals) {
      const itemIds = goal.goal_items.map((i) => i.id);
      const progress = await fetchProgressForGoal(itemIds, goal.period);
      map[goal.id] = progress;
    }
    setProgressMap(map);
  }, [goals, fetchProgressForGoal]);

      const handleShare = async (goal: Goal) => {
      try {
        let code = goal.invite_code;
        if (!code) {
          const res = await generateInviteCode(goal.id);
          if (res.error) throw new Error(res.error);
          code = res.code;
        }
        
        await Share.share({
          message: 'Hadi beraber zikir çekelim! Hedefime katılmak için davet kodum: ' + code + '\n\nVeya bu linke tıkla: https://tesbih-takip.vercel.app/?invite=' + code
        });
      } catch (e: any) {
        Alert.alert('Hata', e.message);
      }
    };

    useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [])
  );

  useEffect(() => {
    if (goals.length > 0) {
      loadProgress();
    }
  }, [goals, loadProgress]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  const getGoalProgress = (goal: Goal) => {
    const progress = progressMap[goal.id] || [];
    let totalDone = 0;
    let totalTarget = 0;
    goal.goal_items.forEach((item) => {
      totalDone += getTotalForItem(progress, item.id);
      totalTarget += item.target_count;
    });
    return { totalDone, totalTarget };
  };

  const displayName = user?.user_metadata?.display_name || '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.welcomeBack}</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <Text style={styles.headerIcon}>☪</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {goals.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📿</Text>
            <Text style={styles.emptyTitle}>{t.noGoalsYet}</Text>
            <Pressable
              style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
              onPress={() => router.push('/goals/create')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>+ {t.createFirstGoal}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Goal cards */}
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 16}}>
              <TextInput 
                style={{flex: 1, backgroundColor: theme.colors.card, color: theme.colors.text, padding: 8, paddingHorizontal: 12, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.cardBorder}}
                placeholder="Davet Kodu ile Katıl..."
                placeholderTextColor={theme.colors.textMuted}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              <Pressable 
                style={[styles.addButton, {justifyContent: 'center'}]} 
                onPress={async () => {
                  if(!inviteCode.trim()) return;
                  const res = await joinGoal(inviteCode.trim());
                  if(res.error) Alert.alert('Hata', res.error);
                  else { 
                    Alert.alert('Başarılı', 'Hedefe başarıyla katıldınız!'); 
                    setInviteCode(''); 
                  }
                }}
              >
                <Text style={styles.addButtonText}>Katıl</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.activeGoals}</Text>
              <Pressable
                onPress={() => router.push('/goals/create')}
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>+ {t.newGoal}</Text>
              </Pressable>
            </View>

            {goals.map((goal) => {
              const { totalDone, totalTarget } = getGoalProgress(goal);
              const overallProgress = totalTarget > 0 ? totalDone / totalTarget : 0;
              const progress = progressMap[goal.id] || [];

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <Pressable
                    onPress={() => router.push(`/goals/${goal.id}`)}
                    style={styles.goalHeader}
                  >
                    <View style={styles.goalInfo}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
  <Text style={styles.goalName}>{goal.name}</Text>
  <Text style={{fontSize: 16}}>✏️</Text>
  <Pressable 
    onPress={(e) => {
      e.stopPropagation();
      handleShare(goal);
    }}
    hitSlop={10}
  >
    <Text style={{fontSize: 16}}>🔗</Text>
  </Pressable>
</View>
                      <Text style={styles.goalPeriod}>
                        {goal.period === 'weekly' ? t.weekly : t.daily}
                      </Text>
                    </View>
                    <CircularProgress
                      size={56}
                      strokeWidth={4}
                      progress={overallProgress}
                    >
                      <Text style={styles.progressPercent}>
                        {Math.round(overallProgress * 100)}%
                      </Text>
                    </CircularProgress>
                  </Pressable>

                  {goal.goal_items.map((item) => {
                    const current = getTotalForItem(progress, item.id);
                    return (
                      <DhikrCard
                        key={item.id}
                        name={item.dhikr_name}
                        description={item.description}
                        current={current}
                        target={item.target_count}
                        compact
                        onPress={() => router.push({
                          pathname: '/(tabs)/counter',
                          params: { goalItemId: item.id, goalId: goal.id },
                        })}
                      />
                    );
                  })}
                </View>
              );
            })}
          </>
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
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  headerIcon: {
    fontSize: 36,
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  addButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  goalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow.card,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  goalPeriod: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryLight,
    marginTop: 2,
  },
  progressPercent: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  createButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadow.gold,
  },
  createButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  createButtonGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  createButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: '#0a0e27',
  },
});