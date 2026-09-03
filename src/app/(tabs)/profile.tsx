import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import { useGoals } from '../../hooks/useGoals';
import { useProgress } from '../../hooks/useProgress';
import { theme } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { t, lang, setLanguage } = useLanguage();
  const { goals } = useGoals();
  const { fetchProgressForGoal, getTotalForItem, getWeekDates } = useProgress();
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [completedGoals, setCompletedGoals] = useState(0);

  const displayName = user?.user_metadata?.display_name || user?.email || '';

  useEffect(() => {
    loadStats();
  }, [goals]);

  const loadStats = async () => {
    let total = 0;
    let completed = 0;

    for (const goal of goals) {
      const itemIds = goal.goal_items.map((i) => i.id);
      const progress = await fetchProgressForGoal(itemIds, goal.period);
      
      let goalComplete = true;
      goal.goal_items.forEach((item) => {
        const count = getTotalForItem(progress, item.id);
        total += count;
        if (count < item.target_count) goalComplete = false;
      });
      if (goalComplete && goal.goal_items.length > 0) completed++;
    }

    setWeeklyTotal(total);
    setCompletedGoals(completed);
  };

  const handleSignOut = () => {
    Alert.alert(t.signOut, t.signOutConfirm, [
      { text: t.no, style: 'cancel' },
      { text: t.yes, onPress: signOut },
    ]);
  };

  const toggleLanguage = async () => {
    const newLang = lang === 'tr' ? 'ru' : 'tr';
    await setLanguage(newLang);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Stats */}
        <Text style={styles.sectionTitle}>{t.weeklyStats}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weeklyTotal}</Text>
            <Text style={styles.statLabel}>{t.totalDhikr}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedGoals}</Text>
            <Text style={styles.statLabel}>{t.goalsCompleted}</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>{t.settings}</Text>
        <View style={styles.settingsCard}>
          <Pressable
            onPress={toggleLanguage}
            style={({ pressed }) => [styles.settingItem, pressed && styles.settingPressed]}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌐</Text>
              <Text style={styles.settingText}>{t.language}</Text>
            </View>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>
                {lang === 'tr' ? '🇹🇷 Türkçe' : '🇷🇺 Русский'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.settingItem, pressed && styles.settingPressed]}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🚪</Text>
              <Text style={[styles.settingText, styles.signOutText]}>{t.signOut}</Text>
            </View>
          </Pressable>
        </View>
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
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadow.gold,
  },
  avatarText: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    color: '#0a0e27',
  },
  name: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  settingPressed: {
    backgroundColor: theme.colors.surfaceLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  signOutText: {
    color: theme.colors.error,
  },
  langBadge: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  langBadgeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
});