import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../providers/LanguageProvider';
import { useGoals } from '../../hooks/useGoals';
import { theme } from '../../constants/theme';

type DhikrEntry = {
  id: string;
  name: string;
  description: string;
  target: string;
};

let nextId = 1;

export default function EditGoalScreen() {
  const { t } = useLanguage();
  const { goals, updateGoal, deleteGoal } = useGoals();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  
  const goal = goals.find(g => g.id === params.id);

  const [goalName, setGoalName] = useState(goal?.name || '');
  const [period, setPeriod] = useState<'weekly' | 'daily'>(goal?.period || 'weekly');
  const [dhikrItems, setDhikrItems] = useState<DhikrEntry[]>(
    goal?.goal_items.map(i => ({
      id: i.id,
      name: i.dhikr_name,
      description: i.description || '',
      target: String(i.target_count),
    })) || []
  );
  const [saving, setSaving] = useState(false);

  const isInitialized = useRef(false);

  useEffect(() => {
    if (goal && !isInitialized.current) {
      setGoalName(goal.name);
      setPeriod(goal.period);
      if (goal.goal_items && goal.goal_items.length > 0) {
        setDhikrItems(
          goal.goal_items.map(i => ({
            id: i.id,
            name: i.dhikr_name,
            description: i.description || '',
            target: String(i.target_count),
          }))
        );
      }
      isInitialized.current = true;
    }
  }, [goal]);

  const addDhikr = () => {
    setDhikrItems([...dhikrItems, { id: 'new-' + String(nextId++), name: '', description: '', target: '' }]);
  };

  const removeDhikr = (id: string) => {
    if (dhikrItems.length <= 1) return;
    setDhikrItems(dhikrItems.filter((item) => item.id !== id));
  };

  const updateDhikr = (id: string, field: keyof DhikrEntry, value: string) => {
    setDhikrItems(
      dhikrItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async () => {
    if (!goalName.trim()) {
      Alert.alert(t.error, 'Lütfen bir hedef adı girin');
      return;
    }

    const validItems = dhikrItems.filter((item) => item.name.trim() && parseInt(item.target, 10) > 0);
    if (validItems.length === 0) {
      Alert.alert(t.error, 'En az bir tane geçerli zikir ekleyin');
      return;
    }

    setSaving(true);
    const { error } = await updateGoal(
      params.id, 
      goalName.trim(),
      period,
      validItems.map((item) => ({
        id: item.id.startsWith('new-') ? undefined : item.id, // Only send real IDs to Supabase
        dhikr_name: item.name.trim(),
        description: item.description.trim(),
        target_count: parseInt(item.target, 10),
      }))
    );
    setSaving(false);

    if (error) {
      Alert.alert(t.error, error);
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Hedefi Düzenle',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.label}>{t.goalName}</Text>
            <TextInput
              style={styles.input}
              value={goalName}
              onChangeText={setGoalName}
              placeholder={t.goalName}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.period}</Text>
            <View style={styles.periodRow}>
              <Pressable
                style={[styles.periodButton, period === 'weekly' && styles.periodActive]}
                onPress={() => setPeriod('weekly')}
              >
                <Text style={[styles.periodText, period === 'weekly' && styles.periodTextActive]}>
                   {t.weekly}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.periodButton, period === 'daily' && styles.periodActive]}
                onPress={() => setPeriod('daily')}
              >
                <Text style={[styles.periodText, period === 'daily' && styles.periodTextActive]}>
                   {t.daily}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.addDhikr}</Text>
            {dhikrItems.map((item, index) => (
              <View key={item.id} style={styles.dhikrRow}>
                <View style={styles.dhikrNumber}>
                  <Text style={styles.dhikrNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.dhikrInputsContainer}>
                  <View style={styles.dhikrInputs}>
                    <TextInput
                      style={styles.dhikrNameInput}
                      value={item.name}
                      onChangeText={(v) => updateDhikr(item.id, 'name', v)}
                      placeholder={t.dhikrName}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TextInput
                      style={styles.dhikrTargetInput}
                      value={item.target}
                      onChangeText={(v) => updateDhikr(item.id, 'target', v)}
                      placeholder={t.targetCount}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                  <TextInput
                    style={styles.dhikrDescriptionInput}
                    value={item.description}
                    onChangeText={(v) => updateDhikr(item.id, 'description', v)}
                    placeholder="Açıklama (Nasıl okunur, vs.)"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                {dhikrItems.length > 1 && (
                  <Pressable onPress={() => removeDhikr(item.id)} style={styles.removeButton}>
                    <Text style={styles.removeText}>X</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={addDhikr} style={styles.addDhikrButton}>
              <Text style={styles.addDhikrText}>+ {t.addDhikr}</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              style={styles.saveGradient}
            >
              <Text style={styles.saveText}>{saving ? t.loading : t.save}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.md, paddingBottom: 100 },
  section: { marginBottom: theme.spacing.lg },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodRow: { flexDirection: 'row', gap: theme.spacing.sm },
  periodButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(212, 168, 83, 0.1)' },
  periodText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, fontWeight: '500' },
  periodTextActive: { color: theme.colors.primary, fontWeight: '700' },
  dhikrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  dhikrNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    alignItems: 'center', justifyContent: 'center'
  },
  dhikrNumberText: { fontSize: theme.fontSize.xs, color: theme.colors.primary, fontWeight: '700' },
  dhikrInputsContainer: { flex: 1, flexDirection: 'column', gap: theme.spacing.sm },
  dhikrInputs: { flexDirection: 'row', gap: theme.spacing.sm },
  dhikrNameInput: {
    flex: 2,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dhikrTargetInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
  },
  dhikrDescriptionInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  removeButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    alignItems: 'center', justifyContent: 'center'
  },
  removeText: { color: theme.colors.error, fontSize: theme.fontSize.xs, fontWeight: '700' },
  addDhikrButton: {
    borderWidth: 1, borderColor: theme.colors.cardBorder, borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md, padding: theme.spacing.md,
    alignItems: 'center', marginTop: theme.spacing.sm
  },
  addDhikrText: { color: theme.colors.primary, fontSize: theme.fontSize.md, fontWeight: '600' },
  footer: {
    padding: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.border
  },
  saveButton: { borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadow.gold },
  saveButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveButtonDisabled: { opacity: 0.6 },
  saveGradient: { paddingVertical: theme.spacing.md, alignItems: 'center' },
  saveText: { fontSize: theme.fontSize.lg, fontWeight: '700', color: '#0a0e27' },
});