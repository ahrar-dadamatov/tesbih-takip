import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import { theme } from '../../constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      Alert.alert(t.error, error.message);
    }
  };

  return (
    <LinearGradient
      colors={[theme.colors.background, '#0d1235', theme.colors.background]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.bismillah}>﷽</Text>
            <Text style={styles.title}>{t.loginTitle}</Text>
            <Text style={styles.subtitle}>☪ Tesbih Takip</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.email}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="mail@example.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.password}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? t.loading : t.login}
                </Text>
              </LinearGradient>
            </Pressable>

            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.linkButton}>
                <Text style={styles.linkText}>
                  {t.dontHaveAccount}{' '}
                  <Text style={styles.linkTextBold}>{t.register}</Text>
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  bismillah: {
    fontSize: 42,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primaryLight,
    fontWeight: '300',
  },
  form: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
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
  button: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadow.gold,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: '#0a0e27',
  },
  linkButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  linkTextBold: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});