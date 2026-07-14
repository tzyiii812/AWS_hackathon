import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { NewPasswordChallenge } from '@/services/cognito';

export default function LoginScreen() {
  const { signIn, completeNewPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challenge, setChallenge] = useState<NewPasswordChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('請輸入 Email 和密碼。');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const nextChallenge = await signIn(email, password);
      setChallenge(nextChallenge);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登入失敗。');
    } finally {
      setBusy(false);
    }
  };

  const handleNewPassword = async () => {
    if (!challenge || newPassword.length < 8) {
      setError('新密碼至少需要 8 個字元。');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await completeNewPassword(challenge, newPassword);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '設定新密碼失敗。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandIcon}>🌱</Text>
            <Text style={styles.title}>Investment Retro</Text>
            <Text style={styles.subtitle}>把投資紀錄，變成看得見的生活進度。</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {challenge ? '設定新密碼' : '登入'}
            </Text>

            {!challenge ? (
              <>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="#BBBBBB"
                  editable={!busy}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="密碼"
                  placeholderTextColor="#BBBBBB"
                  editable={!busy}
                  onSubmitEditing={handleSignIn}
                />
              </>
            ) : (
              <>
                <Text style={styles.challengeText}>
                  這是第一次登入，請設定一組正式密碼。
                </Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="新密碼"
                  placeholderTextColor="#BBBBBB"
                  editable={!busy}
                  onSubmitEditing={handleNewPassword}
                />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={challenge ? handleNewPassword : handleSignIn}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {challenge ? '儲存並登入' : '登入'}
                </Text>
              )}
            </TouchableOpacity>

            {challenge ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setChallenge(null);
                  setNewPassword('');
                  setError(null);
                }}
              >
                <Text style={styles.backButtonText}>返回登入</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF9F7' },
  keyboard: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FAF9F7',
  },
  brandBlock: { alignItems: 'center', marginBottom: 28, backgroundColor: 'transparent' },
  brandIcon: { fontSize: 54, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '700', color: '#222222' },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: { fontSize: 21, fontWeight: '600', color: '#222222', marginBottom: 18 },
  input: {
    backgroundColor: '#F7F5F2',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: '#222222',
    marginBottom: 12,
  },
  challengeText: { color: '#666666', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  error: { color: '#C86B6B', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  button: {
    backgroundColor: '#222222',
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  backButton: { alignItems: 'center', paddingTop: 18 },
  backButtonText: { color: '#777777', fontSize: 14 },
});
