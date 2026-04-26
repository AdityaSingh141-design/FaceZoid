import { ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale as ms } from 'react-native-size-matters/lib/scaling-utils';
import { findTeacherForLogin, setCurrentTeacher, upsertTeacher } from '@/lib/authStorage';

type AuthMode = 'login' | 'signup';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [teacherId, setTeacherId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const compact = width < 370 || height < 760;
  const spacing = clamp(width * 0.05, 16, 22);
  const heroHeight = clamp(height * 0.4, 250, 340);
  const overlap = clamp(heroHeight * 0.1, 18, 34);
  const logoSize = clamp(width * 0.19, 72, 92);
  const brandFontSize = clamp(width * 0.12, 40, 54);
  const subFontSize = clamp(width * 0.045, 15, 18);
  const cardRadius = clamp(width * 0.06, 20, 28);
  const inputHeight = clamp(height * 0.068, 48, 56);
  const buttonHeight = clamp(height * 0.072, 52, 60);
  const cardPadding = clamp(width * 0.04, 14, 20);
  const maxCardWidth = clamp(width * 0.96, 320, 460);
  const keyboardExtraSpace = Platform.OS === 'android' ? keyboardHeight : 0;

  const primaryButtonLabel = useMemo(() => (mode === 'login' ? 'Login' : 'Create Account'), [mode]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!teacherId.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter both Teacher ID and password.');
      return;
    }

    const teacher = await findTeacherForLogin(teacherId, password);
    if (!teacher) {
      Alert.alert('Login failed', 'Invalid Teacher ID or password. Please sign up first or retry.');
      return;
    }

    await setCurrentTeacher({
      teacherId: teacher.teacherId,
      fullName: teacher.fullName,
    });
    router.replace('/classrooms');
  };

  const handleSignUp = async () => {
    if (!teacherId.trim() || !fullName.trim() || !email.trim() || !department.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please fill all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }
    await upsertTeacher({
      teacherId: teacherId.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      department: department.trim(),
      password,
    });
    Alert.alert('Account created', 'Account saved on device. You can now login.');
    setMode('login');
  };

  const handleForgotPassword = () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Missing email', 'Enter your registered email.');
      return;
    }
    Alert.alert('Reset link sent', `A password reset link was sent to ${forgotEmail}.`);
    setForgotOpen(false);
    setForgotEmail('');
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top + (compact ? 14 : 18) }]}>
          <View style={[styles.logoWrap, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.24 }]}>
            <Feather name="smile" size={logoSize * 0.38} color="#EAF4FF" />
          </View>
          <View style={styles.brandRow}>
            <Text style={[styles.brandText, { fontSize: brandFontSize }]}>FaceZoid</Text>
          </View>
          <Text style={[styles.subtitle, { fontSize: subFontSize }]}>Teacher Portal</Text>
        </View>

        <ScrollView
          style={{ marginTop: -overlap, zIndex: 2 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: spacing,
              paddingBottom: Math.max(insets.bottom, 12) + 14 + keyboardExtraSpace,
            },
          ]}>
          <View
            style={[
              styles.card,
              {
                maxWidth: maxCardWidth,
                borderRadius: cardRadius,
                padding: cardPadding,
              },
            ]}>
            <View style={styles.segment}>
              <Pressable
                style={[styles.segmentButton, mode === 'login' ? styles.segmentButtonActive : undefined]}
                onPress={() => setMode('login')}>
                <Text style={[styles.segmentText, mode === 'login' ? styles.segmentTextActive : undefined]}>Login</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, mode === 'signup' ? styles.segmentButtonActive : undefined]}
                onPress={() => setMode('signup')}>
                <Text style={[styles.segmentText, mode === 'signup' ? styles.segmentTextActive : undefined]}>Sign Up</Text>
              </Pressable>
            </View>

            <Field
              icon="credit-card"
              label="Teacher ID"
              placeholder={mode === 'login' ? 'Enter your Teacher ID' : 'Your unique Teacher ID'}
              value={teacherId}
              onChangeText={setTeacherId}
              inputHeight={inputHeight}
            />

            {mode === 'signup' ? (
              <>
                <Field icon="user" label="Full Name" placeholder="Enter your full name" value={fullName} onChangeText={setFullName} inputHeight={inputHeight} />
                <Field
                  icon="mail"
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  inputHeight={inputHeight}
                />
                <Field
                  icon="briefcase"
                  label="Department"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChangeText={setDepartment}
                  inputHeight={inputHeight}
                />
              </>
            ) : null}

            <Field
              icon="lock"
              label="Password"
              placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              inputHeight={inputHeight}
            />

            {mode === 'signup' ? (
              <Field
                icon="lock"
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                inputHeight={inputHeight}
              />
            ) : null}

            {mode === 'login' ? (
              <Pressable onPress={() => setForgotOpen(true)} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            ) : null}

            <Pressable style={[styles.primaryButton, { minHeight: buttonHeight }]} onPress={mode === 'login' ? handleLogin : handleSignUp}>
              <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
              <Feather name="arrow-right" size={20} color="#F2F8FF" />
            </Pressable>
          </View>

          <Text style={styles.footerText}>Only authorized teaching staff can access this application</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={forgotOpen} animationType="fade" onRequestClose={() => setForgotOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalInfo}>Enter your registered email to receive a reset link.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="teacher@college.edu"
              placeholderTextColor="#94A3B8"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              contextMenuHidden
              disableFullscreenUI
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={() => setForgotOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalPrimary]} onPress={handleForgotPassword}>
                <Text style={styles.modalPrimaryText}>Send Link</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  icon: ComponentProps<typeof Feather>['name'];
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  inputHeight: number;
};

function Field({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  inputHeight,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, { minHeight: inputHeight }]}>
        <Feather name={icon} size={18} color="#667085" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#7A8699"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          secureTextEntry={!!secureTextEntry}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          contextMenuHidden
          disableFullscreenUI
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6E8EC',
  },
  root: {
    flex: 1,
  },
  hero: {
    backgroundColor: '#0D5E98',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  logoWrap: {
    backgroundColor: '#1B8FD8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandEye: {
    marginTop: ms(12),
  },
  brandText: {
    color: '#F3FAFF',
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#D1E5F4',
    marginTop: 2,
  },
  scrollContent: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#F0F2F4',
    borderWidth: 1,
    borderColor: '#D9DEE5',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  segment: {
    backgroundColor: '#DDE2E8',
    borderRadius: 16,
    padding: 4,
    flexDirection: 'row',
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#EEF2F6',
  },
  segmentText: {
    color: '#5D687A',
    fontSize: ms(17),
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#141D2A',
    fontWeight: '700',
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#132033',
    fontSize: ms(15),
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#C9D0DA',
    backgroundColor: '#E9EDF2',
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  input: {
    flex: 1,
    color: '#435064',
    fontSize: ms(14),
    paddingVertical: 6,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotText: {
    color: '#0E74B8',
    fontWeight: '700',
    fontSize: ms(13),
  },
  primaryButton: {
    backgroundColor: '#1A90DD',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#F2F8FF',
    fontSize: ms(18),
    fontWeight: '800',
  },
  footerText: {
    marginTop: 18,
    color: '#5C6B80',
    fontSize: ms(12),
    textAlign: 'center',
    paddingHorizontal: 14,
    lineHeight: 18,
    maxWidth: 440,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.74)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: ms(19),
    fontWeight: '800',
    marginBottom: 6,
  },
  modalInfo: {
    color: '#475569',
    fontSize: ms(13),
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    color: '#0F172A',
    fontSize: ms(14),
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: '#E2E8F0',
  },
  modalPrimary: {
    backgroundColor: '#0F8CDC',
  },
  modalCancelText: {
    color: '#334155',
    fontWeight: '700',
  },
  modalPrimaryText: {
    color: '#EFF6FF',
    fontWeight: '800',
  },
});
