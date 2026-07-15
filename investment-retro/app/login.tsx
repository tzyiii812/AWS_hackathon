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

type Screen = 'login' | 'register' | 'newPassword';

export default function LoginScreen() {
  const { signIn, completeNewPassword, signUp } = useAuth();
  const [screen, setScreen] = useState<Screen>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challenge, setChallenge] = useState<NewPasswordChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Normalize username to email format for Cognito
  const toEmail = (name: string) => name.includes('@') ? name : `${name}@inv.local`;

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      setError('請輸入帳號和密碼。');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const nextChallenge = await signIn(toEmail(username.trim()), password);
      if (nextChallenge) {
        setChallenge(nextChallenge);
        setScreen('newPassword');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登入失敗。');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!username.trim()) {
      setError('請輸入帳號名稱。');
      return;
    }
    if (password.length < 6) {
      setError('密碼至少需要 6 個字元。');
      return;
    }
    if (password !== confirmPwd) {
      setError('兩次輸入的密碼不一致。');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await signUp(username.trim(), password);
      // Auto-confirmed by Lambda trigger, go straight to login
      setInfo('帳號建立成功！請登入。');
      setScreen('login');
      setConfirmPwd('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '註冊失敗。');
    } finally {
      setBusy(false);
    }
  };

  const handleNewPassword = async () => {
    if (!challenge || newPassword.length < 6) {
      setError('新密碼至少需要 6 個字元。');
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

  const switchToRegister = () => {
    setScreen('register');
    setError(null);
    setInfo(null);
  };

  const switchToLogin = () => {
    setScreen('login');
    setError(null);
    setInfo(null);
    setChallenge(null);
    setNewPassword('');
    setConfirmPwd('');
  };

  const renderForm = () => {
    switch (screen) {
      case 'login':
        return (
          <>
            <Text style={styles.cardTitle}>登入</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="帳號名稱"
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

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>登入</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={switchToRegister}>
              <Text style={styles.switchText}>還沒有帳號？<Text style={styles.switchLink}>建立帳號</Text></Text>
            </TouchableOpacity>
          </>
        );

      case 'register':
        return (
          <>
            <Text style={styles.cardTitle}>建立帳號</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="帳號名稱"
              placeholderTextColor="#BBBBBB"
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="密碼（至少 6 個字元）"
              placeholderTextColor="#BBBBBB"
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry
              placeholder="確認密碼"
              placeholderTextColor="#BBBBBB"
              editable={!busy}
              onSubmitEditing={handleSignUp}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={handleSignUp}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>註冊</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={switchToLogin}>
              <Text style={styles.switchText}>已有帳號？<Text style={styles.switchLink}>登入</Text></Text>
            </TouchableOpacity>
          </>
        );

      case 'newPassword':
        return (
          <>
            <Text style={styles.cardTitle}>設定新密碼</Text>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={handleNewPassword}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>儲存並登入</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={switchToLogin}>
              <Text style={styles.switchText}>返回登入</Text>
            </TouchableOpacity>
          </>
        );
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
            {renderForm()}
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
  info: { color: '#6B9E5B', fontSize: 14, lineHeight: 20, marginBottom: 12 },
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
  switchButton: { alignItems: 'center', paddingTop: 18 },
  switchText: { color: '#777777', fontSize: 14 },
  switchLink: { color: '#555555', fontWeight: '600' },
});
