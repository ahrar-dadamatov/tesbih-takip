import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../constants/theme';

type DhikrCardProps = {
  name: string;
  description?: string;
  current: number;
  target: number;
  onPress?: () => void;
  compact?: boolean;
};

export function DhikrCard({ name, description, current, target, onPress, compact }: DhikrCardProps) {
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const isCompleted = current >= target;
  const progressColor = isCompleted ? theme.colors.success : theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
          {name}
        </Text>
        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </View>

      <View style={styles.countRow}>
        <Text style={[styles.current, { color: progressColor }]}>{current}</Text>
        <Text style={styles.separator}>/</Text>
        <Text style={styles.target}>{target}</Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow.card,
  },
  cardCompact: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  nameCompact: {
    fontSize: theme.fontSize.sm,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  descriptionCompact: {
    fontSize: theme.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  checkmark: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.success,
    marginLeft: theme.spacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  current: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
  },
  separator: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginHorizontal: 4,
  },
  target: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});