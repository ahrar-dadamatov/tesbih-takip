import React, { useState } from 'react';
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
import { useRouter, Stack } from 'expo-router';
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

export default function CreateGoalScreen() {
  const { t } = useLanguage();
  const { createGoal } = useGoals();
  const router = useRouter();

  const [goalName, setGoalName] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'daily'>('weekly');
  const [dhikrItems, setDhikrItems] = useState<DhikrEntry[]>([
    { id: String(nextId++), name: '', description: '', target: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const loadTemplate = () => {
    Alert.alert('Şablon Yükle', 'Haftalık vird şablonu yüklenecek. Mevcut veriler silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Yükle',
        onPress: () => {
          setGoalName('Haftalık Vird');
          setPeriod('weekly');
          setDhikrItems([
            { id: String(nextId++), name: 'Kelime-i Tevhid', description: 'Lâ ilâhe illallah', target: '700' },
            { id: String(nextId++), name: 'İstiğfar', description: 'Estağfirullah el-Azîm', target: '1500' },
            { id: String(nextId++), name: 'Salavat', description: 'Allahümme salli alâ seyyidinâ Muhammed', target: '700' },
            { id: String(nextId++), name: 'Kelime-i Temcîd', description: 'Lâ havle velâ kuvvete illâ billâhi\'l-aliyyi\'l-azîm', target: '700' },
            { id: String(nextId++), name: 'Kelime-i Tenzih', description: 'Sübhânallahi ve bi-hamdihi', target: '700' },
            { id: String(nextId++), name: 'Ayetel Kürsi', description: '', target: '7' },
            { id: String(nextId++), name: 'Yasin', description: '', target: '7' },
            { id: String(nextId++), name: 'Mülk', description: '', target: '7' },
            { id: String(nextId++), name: 'Fatiha', description: '', target: '14' },
            { id: String(nextId++), name: 'İhlas', description: '', target: '14' },
            { id: String(nextId++), name: 'Felak', description: '', target: '14' },
            { id: String(nextId++), name: 'Nas', description: '', target: '14' },
          ]);
        }
      }
    ]);
  };

  const addDhikr = () => {
    setDhikrItems([...dhikrItems, { id: String(nextId++), name: '', description: '', target: '' }]);
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
    const { error } = await createGoal(
      goalName.trim(),
      period,
      validItems.map((item) => ({
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
          title: t.newGoal,
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