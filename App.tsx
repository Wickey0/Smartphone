import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  BarChart3,
  UserCircle,
  MapPin,
  Plus,
  ScanLine,
  Sparkles,
  Ticket,
  Trash2,
  X,
  Layers,
} from 'lucide-react-native';
import { supabase, type EventRecord, type Profile, type StampRecord, type UserRole } from './lib/supabase';

const { width } = Dimensions.get('window');

const COLORS = {
  blue: '#A2D5EA',
  yellow: '#F4CC60',
  brown: '#7C6154',
  dark: '#381D0E',
  bg: '#FDFBF7',
  white: '#FFFFFF',
  red: '#FF6B6B',
  green: '#88B04B',
  gray: '#A0A0A0',
  lightGray: '#F0F0F0',
  overlay: 'rgba(0,0,0,0.9)',
};

const STAMP_IMAGES: { [key: string]: any } = {
  '01': require('./assets/images/01.png'),
  '02': require('./assets/images/02.png'),
  '03': require('./assets/images/03.png'),
  '04': require('./assets/images/04.png'),
  '05': require('./assets/images/05.png'),
  '06': require('./assets/images/06.png'),
  '07': require('./assets/images/07.png'),
};

const PROFILE_IMAGES: { [key: string]: any } = {
  p01: require('./assets/profiles/p01.png'),
  p02: require('./assets/profiles/p02.png'),
  p03: require('./assets/profiles/p03.png'),
  p04: require('./assets/profiles/p04.png'),
  p05: require('./assets/profiles/p05.png'),
  p06: require('./assets/profiles/p06.png'),
};

const PROFILE_IMAGE_KEYS = Object.keys(PROFILE_IMAGES);

type EventWithStamps = EventRecord & { stamps: StampRecord[] };
type StampPadData = StampRecord & { event_id: string };

const APP_LOGO = require('./assets/logo.png');

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authRole, setAuthRole] = useState<UserRole>('user');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventWithStamps[]>([]);
  const [joinedEventIds, setJoinedEventIds] = useState<string[]>([]);
  const [collectedStampIds, setCollectedStampIds] = useState<string[]>([]);
  const [eventDrafts, setEventDrafts] = useState<Record<string, Pick<EventRecord, 'title' | 'location' | 'date' | 'description'>>>({});
  const [stampDrafts, setStampDrafts] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [showUnlockSuccess, setShowUnlockSuccess] = useState<string | null>(null);
  const [showCongratulations, setShowCongratulations] = useState<string | null>(null);
  const [stampPadData, setStampPadData] = useState<StampPadData | null>(null);
  const [lastStampedImg, setLastStampedImg] = useState<any>(null);
  const [stampSuccessTitle, setStampSuccessTitle] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const isProcessingScan = useRef(false);

  const role: UserRole = profile?.role ?? 'user';
  const visibleEvents = useMemo(() => {
    if (role === 'merchant') return events.filter(e => e.merchant_id === session?.user.id);
    return events.filter(e => joinedEventIds.includes(e.id));
  }, [events, joinedEventIds, role, session?.user.id]);

  const activeEvent = useMemo(
    () => events.find(e => e.id === activeEventId) ?? null,
    [events, activeEventId],
  );

  const collectedStamps = useMemo(() => {
    return events.flatMap(event =>
      event.stamps
        .filter(stamp => collectedStampIds.includes(stamp.id))
        .map(stamp => ({ ...stamp, eventTitle: event.title, eventColor: event.cover_color, eventLocation: event.location })),
    );
  }, [events, collectedStampIds]);

  const userTotalStampCount = events
    .filter(event => joinedEventIds.includes(event.id))
    .reduce((sum, event) => sum + event.stamps.length, 0);
  const userCollectedCount = collectedStamps.length;
  const userCompletionRate = userTotalStampCount > 0 ? Math.round((userCollectedCount / userTotalStampCount) * 100) : 0;

  const activeAvatarKey = profile?.avatar_key && PROFILE_IMAGES[profile.avatar_key] ? profile.avatar_key : 'p01';
  const activeAvatarImage = PROFILE_IMAGES[activeAvatarKey];

  const merchantStats = useMemo(() => {
    const eventCount = events.filter(event => event.merchant_id === session?.user.id).length;
    const stampCount = events
      .filter(event => event.merchant_id === session?.user.id)
      .reduce((sum, event) => sum + event.stamps.length, 0);
    return { eventCount, stampCount };
  }, [events, session?.user.id]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    const nextEventDrafts: Record<string, Pick<EventRecord, 'title' | 'location' | 'date' | 'description'>> = {};
    const nextStampDrafts: Record<string, string> = {};

    events.forEach(event => {
      nextEventDrafts[event.id] = {
        title: event.title,
        location: event.location,
        date: event.date,
        description: event.description,
      };
      event.stamps.forEach(stamp => {
        nextStampDrafts[stamp.id] = stamp.name;
      });
    });

    setEventDrafts(nextEventDrafts);
    setStampDrafts(nextStampDrafts);
  }, [events]);

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id, data.session.user.email ?? null);
        await loadWorkspace(data.session.user.id);
      }
      setIsLoading(false);
    };

    boot();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await loadProfile(nextSession.user.id);
        await loadWorkspace(nextSession.user.id);
      } else {
        setProfile(null);
        setEvents([]);
        setJoinedEventIds([]);
        setCollectedStampIds([]);
        setActiveEventId(null);
      }
      setIsLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const ensureProfile = async (userId: string, email: string | null, selectedRole: UserRole = 'user') => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,role,display_name,avatar_key,created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      Alert.alert('Profile error', error.message);
      return null;
    }

    if (data) {
      setProfile(data);
      return data as Profile;
    }

    const fallbackProfile = {
      id: userId,
      email,
      role: selectedRole,
      display_name: selectedRole === 'merchant' ? 'Merchant' : 'Explorer',
      avatar_key: 'p01',
    };

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert(fallbackProfile)
      .select('id,email,role,display_name,created_at')
      .single();

    if (createError) {
      Alert.alert('Profile setup failed', createError.message);
      setProfile(fallbackProfile);
      return fallbackProfile as Profile;
    }

    setProfile(createdProfile);
    return createdProfile as Profile;
  };

  const loadProfile = async (userId: string, email?: string | null) => {
    await ensureProfile(userId, email ?? session?.user.email ?? null, 'user');
  };

  const loadWorkspace = async (userId: string) => {
    const [eventsRes, progressRes, recordsRes] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('user_event_progress').select('event_id').eq('user_id', userId),
      supabase.from('stamp_records').select('stamp_id').eq('user_id', userId),
    ]);

    if (eventsRes.error) {
      Alert.alert('Load failed', eventsRes.error.message);
      return;
    }

    if (progressRes.error) {
      Alert.alert('Progress load failed', progressRes.error.message);
      return;
    }

    if (recordsRes.error) {
      Alert.alert('Stamp records load failed', recordsRes.error.message);
      return;
    }

    const stampResults = await Promise.all(
      (eventsRes.data ?? []).map(async event => {
        const { data: stampData, error: stampError } = await supabase
          .from('stamps')
          .select('*')
          .eq('event_id', event.id)
          .order('position', { ascending: true });

        if (stampError) {
          throw stampError;
        }

        return {
          ...event,
          stamps: stampData ?? [],
        } as EventWithStamps;
      }),
    ).catch(error => {
      Alert.alert('Stamp load failed', error.message);
      return [] as EventWithStamps[];
    });

    setEvents(stampResults);
    setJoinedEventIds((progressRes.data ?? []).map(item => item.event_id));
    setCollectedStampIds((recordsRes.data ?? []).map(item => item.stamp_id));
  };

  const handleAuthSubmit = async () => {
    const email = authEmail.trim();
    if (!email || !authPassword) {
      Alert.alert('Missing Details', 'Please enter both email and password.');
      return;
    }
    if (authPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setIsAuthLoading(true);
    const result =
      authMode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password: authPassword })
        : await supabase.auth.signUp({
            email,
            password: authPassword,
            options: { data: { role: authRole } },
          });

    if (result.error) {
      setIsAuthLoading(false);
      Alert.alert(authMode === 'login' ? 'Login Failed' : 'Sign Up Failed', result.error.message);
      return;
    }

    if (result.data.user) {
      const nextProfile = await ensureProfile(result.data.user.id, result.data.user.email ?? email, authRole);
      if (authMode === 'login' && nextProfile?.role !== authRole) {
        Alert.alert(
          'Role Notice',
          `This account is registered as ${nextProfile?.role === 'merchant' ? 'Merchant' : 'Explorer'}, so we opened the matching workspace.`,
        );
      }
      await loadWorkspace(result.data.user.id);
    }

    setIsAuthLoading(false);

    if (authMode === 'signup') {
      Alert.alert(
        'Account Created',
        authRole === 'merchant'
          ? 'Merchant account created. You can now manage events and QR codes.'
          : 'Explorer account created. You can now scan events and collect stamps.',
      );
      setAuthMode('login');
    }
  };

  const updateAvatar = async (avatarKey: string) => {
    if (!session?.user.id) return;

    setProfile(prev => (prev ? { ...prev, avatar_key: avatarKey } : prev));
    setShowAvatarPicker(false);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_key: avatarKey })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert('Avatar update failed', error.message);
      return;
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign Out Failed', error.message);
      return;
    }
    setProfile(null);
    setEvents([]);
    setJoinedEventIds([]);
    setCollectedStampIds([]);
    setActiveEventId(null);
    setShowProfile(false);
    setStampPadData(null);
    setLastStampedImg(null);
    setStampSuccessTitle(null);
    setShowCongratulations(null);
    setShowScanner(false);
  };

  const createDemoEvent = async () => {
    if (!session?.user.id || role !== 'merchant') return;
    const newEvent = {
      merchant_id: session.user.id,
      title: 'New Heritage Trail',
      location: 'HKU Campus',
      date: '2026.09.01',
      description: 'Enter description here.',
      cover_color: COLORS.yellow,
      scan_secret: `scan_${Math.random().toString(36).slice(2, 10)}`,
    };
    const { data, error } = await supabase.from('events').insert(newEvent).select('*').single();
    if (error) {
      Alert.alert('Create failed', error.message);
      return;
    }
    const firstStamp = {
      event_id: data.id,
      name: 'Checkpoint 1',
      img_key: '01',
      position: 1,
    };
    const { error: stampError } = await supabase.from('stamps').insert(firstStamp);
    if (stampError) {
      Alert.alert('Create stamp failed', stampError.message);
      return;
    }
    await loadWorkspace(session.user.id);
  };

  const setEventDraftField = (id: string, field: keyof Pick<EventRecord, 'title' | 'location' | 'date' | 'description'>, value: string) => {
    setEventDrafts(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { title: '', location: '', date: '', description: '' }),
        [field]: value,
      },
    }));
  };

  const saveEventDraft = async (id: string) => {
    const draft = eventDrafts[id];
    if (!draft || !session?.user.id) return;
    const original = events.find(event => event.id === id);
    if (
      original &&
      original.title === draft.title &&
      original.location === draft.location &&
      original.date === draft.date &&
      original.description === draft.description
    ) {
      return;
    }

    const { error } = await supabase.from('events').update(draft).eq('id', id);
    if (error) {
      Alert.alert('Update failed', error.message);
      return;
    }
    setEvents(prev => prev.map(event => (event.id === id ? { ...event, ...draft } : event)));
  };

  const deleteEvent = async (id: string) => {
    Alert.alert('Delete Event?', 'All visitor progress will be lost.', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('stamps').delete().eq('event_id', id);
          await supabase.from('user_event_progress').delete().eq('event_id', id);
          const { error } = await supabase.from('events').delete().eq('id', id);
          if (error) {
            Alert.alert('Delete failed', error.message);
            return;
          }
          await loadWorkspace(session!.user.id);
        },
      },
    ]);
  };

  const addStamp = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const { error } = await supabase.from('stamps').insert({
      event_id: eventId,
      name: 'New Point',
      img_key: '01',
      position: event.stamps.length + 1,
    });
    if (error) {
      Alert.alert('Add failed', error.message);
      return;
    }
    await loadWorkspace(session!.user.id);
  };

  const saveStampName = async (stampId: string) => {
    const nextName = stampDrafts[stampId]?.trim();
    if (!nextName) return;
    const original = events.flatMap(event => event.stamps).find(stamp => stamp.id === stampId);
    if (original?.name === nextName) return;

    const { error } = await supabase.from('stamps').update({ name: nextName }).eq('id', stampId);
    if (error) {
      Alert.alert('Update failed', error.message);
      return;
    }

    setEvents(prev => prev.map(event => ({
      ...event,
      stamps: event.stamps.map(stamp => (stamp.id === stampId ? { ...stamp, name: nextName } : stamp)),
    })));
  };

  const cycleStampImage = async (stampId: string, currentImgKey: string) => {
    const next = (parseInt(currentImgKey, 10) % 7 + 1).toString().padStart(2, '0');
    const { error } = await supabase.from('stamps').update({ img_key: next }).eq('id', stampId);
    if (error) {
      Alert.alert('Update failed', error.message);
      return;
    }

    setEvents(prev => prev.map(event => ({
      ...event,
      stamps: event.stamps.map(stamp => (stamp.id === stampId ? { ...stamp, img_key: next } : stamp)),
    })));
  };

  const deleteStamp = async (eventId: string, stampId: string) => {
    Alert.alert('Delete checkpoint?', 'This will also remove collected records for this checkpoint.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const [recordsDel, stampDel] = await Promise.all([
            supabase.from('stamp_records').delete().eq('stamp_id', stampId),
            supabase.from('stamps').delete().eq('id', stampId),
          ]);

          if (recordsDel.error) {
            Alert.alert('Delete failed', recordsDel.error.message);
            return;
          }
          if (stampDel.error) {
            Alert.alert('Delete failed', stampDel.error.message);
            return;
          }

          setEvents(prev => prev.map(event => (
            event.id === eventId
              ? { ...event, stamps: event.stamps.filter(stamp => stamp.id !== stampId) }
              : event
          )));
          setStampDrafts(prev => {
            const next = { ...prev };
            delete next[stampId];
            return next;
          });
          setCollectedStampIds(prev => prev.filter(id => id !== stampId));
        },
      },
    ]);
  };

  const handleScan = async ({ data }: any) => {
    if (isProcessingScan.current || !showScanner) return;
    isProcessingScan.current = true;

    const event = events.find(item => item.id === data || item.scan_secret === data);
    if (!event) {
      isProcessingScan.current = false;
      Alert.alert('Invalid QR', 'This QR code is not recognized.');
      return;
    }

    if (!session?.user.id) {
      isProcessingScan.current = false;
      return;
    }

    const { error } = await supabase.from('user_event_progress').upsert(
      { user_id: session.user.id, event_id: event.id },
      { onConflict: 'user_id,event_id' },
    );

    if (error) {
      isProcessingScan.current = false;
      Alert.alert('Scan failed', error.message);
      return;
    }

    if (!joinedEventIds.includes(event.id)) {
      setJoinedEventIds(prev => [...prev, event.id]);
      Vibration.vibrate(120);
      setShowScanner(false);
      setTimeout(() => {
        setShowUnlockSuccess(event.title);
        isProcessingScan.current = false;
      }, 400);
    } else {
      Vibration.vibrate(50);
      setShowScanner(false);
      setTimeout(() => {
        Alert.alert('Already unlocked', 'You already joined this event.');
        isProcessingScan.current = false;
      }, 350);
    }
  };

  const openStamp = async (stamp: StampRecord & { event_id?: string }) => {
    if (!activeEvent?.id) return;
    const { data, error } = await supabase
      .from('stamp_records')
      .select('id')
      .eq('user_id', session?.user.id)
      .eq('event_id', activeEvent.id)
      .eq('stamp_id', stamp.id)
      .maybeSingle();

    if (error) {
      Alert.alert('Load failed', error.message);
      return;
    }
    if (data) {
      Alert.alert('Already collected', 'This stamp has already been collected.');
      return;
    }
    setStampPadData({ ...stamp, event_id: activeEvent.id });
  };

  const collectStamp = async () => {
    if (!stampPadData || !session?.user.id || !activeEvent?.id) return;

    const alreadyCollected = collectedStampIds.includes(stampPadData.id);

    if (!alreadyCollected) {
      const { error } = await supabase.from('stamp_records').insert({
        user_id: session.user.id,
        event_id: activeEvent.id,
        stamp_id: stampPadData.id,
        collected_at: new Date().toISOString(),
      });

      if (error && error.code !== '23505') {
        Alert.alert('Collect failed', error.message);
        return;
      }
    }

    const nextCollectedStampIds = collectedStampIds.includes(stampPadData.id)
      ? collectedStampIds
      : [...collectedStampIds, stampPadData.id];
    const eventIsComplete = activeEvent.stamps.length > 0 && activeEvent.stamps.every(s => nextCollectedStampIds.includes(s.id));

    setCollectedStampIds(nextCollectedStampIds);
    setStampSuccessTitle(eventIsComplete ? activeEvent.title : null);
    setLastStampedImg(STAMP_IMAGES[stampPadData.img_key]);
    setStampPadData(null);
    Vibration.vibrate([0, 100, 50, 100]);
  };

  const removeJoinedEvent = async (eventId: string) => {
    if (!session?.user.id) return;
    Alert.alert('Remove this journal?', 'This will remove it from your journey list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const [progressDel, recordsDel] = await Promise.all([
            supabase.from('user_event_progress').delete().eq('user_id', session.user.id).eq('event_id', eventId),
            supabase.from('stamp_records').delete().eq('user_id', session.user.id).eq('event_id', eventId),
          ]);

          if (progressDel.error) {
            Alert.alert('Remove failed', progressDel.error.message);
            return;
          }

          if (recordsDel.error) {
            Alert.alert('Remove failed', recordsDel.error.message);
            return;
          }

          setJoinedEventIds(prev => prev.filter(id => id !== eventId));
          setCollectedStampIds(prev =>
            prev.filter(stampId => !events.find(e => e.id === eventId)?.stamps.some(s => s.id === stampId)),
          );
          if (activeEventId === eventId) setActiveEventId(null);
        },
      },
    ]);
  };

  const merchantEvents = role === 'merchant' ? visibleEvents : [];
  const userJoinedEvents = visibleEvents;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Image source={APP_LOGO} style={styles.loadingLogo} />
        <Text style={styles.loadingText}>StampLog</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.authRoot}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
          <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.authCard}>
              <Image source={APP_LOGO} style={styles.authLogo} />
              <Text style={styles.authSlogan}>No cloud check-ins. Stamp your 26:13</Text>
              <Text style={styles.authTitle}>StampLog</Text>
              <Text style={styles.authSubtitle}>
                {authMode === 'login' ? 'Choose your portal and sign in.' : 'Create the right workspace for your role.'}
              </Text>

              <View style={styles.authRoleSelector}>
            <TouchableOpacity
              style={[styles.authRoleCard, authRole === 'user' && styles.authRoleCardActive]}
              onPress={() => setAuthRole('user')}
              disabled={isAuthLoading}
            >
              <ScanLine color={authRole === 'user' ? COLORS.yellow : COLORS.dark} size={24} />
              <Text style={[styles.authRoleTitle, authRole === 'user' && styles.authRoleTitleActive]}>User Login</Text>
              <Text style={[styles.authRoleDesc, authRole === 'user' && styles.authRoleDescActive]}>Scan events and collect stamps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authRoleCard, authRole === 'merchant' && styles.authRoleCardActive]}
              onPress={() => setAuthRole('merchant')}
              disabled={isAuthLoading}
            >
              <Ticket color={authRole === 'merchant' ? COLORS.yellow : COLORS.dark} size={24} />
              <Text style={[styles.authRoleTitle, authRole === 'merchant' && styles.authRoleTitleActive]}>Merchant Login</Text>
              <Text style={[styles.authRoleDesc, authRole === 'merchant' && styles.authRoleDescActive]}>Create projects and QR codes</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.authInput}
            value={authEmail}
            onChangeText={setAuthEmail}
            placeholder="Email"
            placeholderTextColor={COLORS.gray}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.authInput}
            value={authPassword}
            onChangeText={setAuthPassword}
            placeholder="Password"
            placeholderTextColor={COLORS.gray}
            secureTextEntry
          />

          <TouchableOpacity style={[styles.authButton, isAuthLoading && styles.authButtonDisabled]} onPress={handleAuthSubmit} disabled={isAuthLoading}>
            {isAuthLoading ? (
              <ActivityIndicator color={COLORS.yellow} />
            ) : (
              <Text style={styles.authButtonText}>
                {authMode === 'login'
                  ? `LOG IN AS ${authRole === 'merchant' ? 'MERCHANT' : 'USER'}`
                  : `SIGN UP AS ${authRole === 'merchant' ? 'MERCHANT' : 'USER'}`}
              </Text>
            )}
          </TouchableOpacity>

              <TouchableOpacity style={styles.authSwitch} onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} disabled={isAuthLoading}>
                <Text style={styles.authSwitchText}>{authMode === 'login' ? 'Need an account? Sign up with selected role' : 'Already have an account? Log in'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.navHeader}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.headerTitle}>{role === 'merchant' ? 'Merchant Console' : showProfile ? 'Profile Center' : 'My Journey'}</Text>
              <Text style={styles.headerSubtitle}>{role === 'merchant' ? 'Merchant workspace' : showProfile ? 'Collected stamps and account summary' : 'Explorer workspace'} · {profile?.email ?? 'Signed in'}</Text>
            </View>
            {showProfile && role === 'user' && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowProfile(false)}>
                <ArrowLeft color={COLORS.dark} size={18} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <LogOut color={COLORS.dark} size={16} />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {role === 'merchant' ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
            <ScrollView style={styles.adminScroll} contentContainerStyle={styles.adminScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>Merchant Dashboard</Text>
              <TouchableOpacity style={styles.adminAdd} onPress={createDemoEvent}>
                <Plus color="white" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: COLORS.yellow }]}> 
                <BarChart3 color={COLORS.dark} size={22} />
                <Text style={styles.statNumber}>{merchantStats.eventCount}</Text>
                <Text style={styles.statLabel}>My Events</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.blue }]}> 
                <Award color={COLORS.dark} size={22} />
                <Text style={styles.statNumber}>{merchantStats.stampCount}</Text>
                <Text style={styles.statLabel}>Checkpoints</Text>
              </View>
            </View>

            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardTitle}>My Activity Statistics</Text>
              <Text style={styles.dashboardCardText}>Manage event QR codes, checkpoint images, and synced visitor progress from your merchant workspace.</Text>
            </View>

            {merchantEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyCircle}><Layers color={COLORS.gray} size={40} /></View>
                <Text style={styles.emptyText}>Create your first event to begin managing QR entry and stamp points.</Text>
              </View>
            ) : (
              merchantEvents.map(ev => (
                <View key={ev.id} style={styles.adminCard}>
                  <View style={styles.adminCardTop}>
                    <TextInput style={styles.adminInputTitle} value={eventDrafts[ev.id]?.title ?? ev.title} onChangeText={v => setEventDraftField(ev.id, 'title', v)} onBlur={() => saveEventDraft(ev.id)} />
                    <TouchableOpacity onPress={() => deleteEvent(ev.id)}>
                      <Trash2 size={20} color={COLORS.red} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={styles.adminInputSub} value={eventDrafts[ev.id]?.location ?? ev.location} onChangeText={v => setEventDraftField(ev.id, 'location', v)} onBlur={() => saveEventDraft(ev.id)} placeholder="Location" />
                  <TextInput style={styles.adminInputSub} value={eventDrafts[ev.id]?.date ?? ev.date} onChangeText={v => setEventDraftField(ev.id, 'date', v)} onBlur={() => saveEventDraft(ev.id)} placeholder="Date" />
                  <TextInput style={styles.adminInputArea} value={eventDrafts[ev.id]?.description ?? ev.description} onChangeText={v => setEventDraftField(ev.id, 'description', v)} onBlur={() => saveEventDraft(ev.id)} multiline placeholder="Description" />

                  <View style={styles.adminQRBox}>
                    <QRCode value={ev.scan_secret || ev.id} size={140} color={COLORS.dark} />
                    <Text style={styles.adminQRId}>Entrance QR Code</Text>
                  </View>

                  <Text style={styles.adminLabel}>Stamp Points ({ev.stamps.length})</Text>
                  {ev.stamps.map((s, sIdx) => (
                    <View key={s.id} style={styles.adminStampRow}>
                      <Text style={styles.adminStampIdx}>{sIdx + 1}</Text>
                      <TextInput
                        style={styles.adminStampInput}
                        value={stampDrafts[s.id] ?? s.name}
                        onChangeText={v => setStampDrafts(prev => ({ ...prev, [s.id]: v }))}
                        onBlur={() => saveStampName(s.id)}
                      />
                      <TouchableOpacity style={styles.adminStampIcon} onPress={() => cycleStampImage(s.id, s.img_key)}>
                        <Image source={STAMP_IMAGES[s.img_key]} style={{ width: 24, height: 24 }} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.adminStampDelete} onPress={() => deleteStamp(ev.id, s.id)}>
                        <Trash2 size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.adminAddPoint} onPress={() => addStamp(ev.id)}>
                    <Plus size={16} color={COLORS.brown} />
                    <Text style={styles.adminAddPointText}>Add Checkpoint</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: stampPadData ? 0 : 24 }}>
            {lastStampedImg ? (
              <SuccessModal
                img={lastStampedImg}
                completeTitle={stampSuccessTitle}
                onDone={() => {
                  const completedTitle = stampSuccessTitle;
                  setLastStampedImg(null);
                  setStampSuccessTitle(null);
                  if (completedTitle) setShowCongratulations(completedTitle);
                }}
              />
            ) : stampPadData ? (
              <GeometricStampScreen data={stampPadData} onCancel={() => setStampPadData(null)} onSuccess={collectStamp} />
            ) : showProfile ? (
              <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileScroll}>
                  <View style={styles.profileHero}>
                    <TouchableOpacity style={styles.profileAvatar} onPress={() => setShowAvatarPicker(true)} activeOpacity={0.85}>
                      <Image source={activeAvatarImage} style={styles.profileAvatarImg} />
                      <View style={styles.profileAvatarEditBadge}><Text style={styles.profileAvatarEditText}>Edit</Text></View>
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{profile?.display_name ?? 'Explorer'}</Text>
                    <Text style={styles.profileEmail}>{profile?.email ?? session?.user.email}</Text>
                  </View>

                  <View style={styles.profileStatsList}>
                    <View style={[styles.profileStatRow, { backgroundColor: COLORS.yellow }]}> 
                      <View style={styles.profileStatIcon}><Award color={COLORS.dark} size={21} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileStatLabel}>Collected</Text>
                        <Text style={styles.profileStatHint}>Digital stamps saved in your journal</Text>
                      </View>
                      <Text style={styles.profileStatValue}>{userCollectedCount}</Text>
                    </View>
                    <View style={[styles.profileStatRow, { backgroundColor: COLORS.blue }]}> 
                      <View style={styles.profileStatIcon}><Layers color={COLORS.dark} size={21} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileStatLabel}>Journals</Text>
                        <Text style={styles.profileStatHint}>Events currently unlocked</Text>
                      </View>
                      <Text style={styles.profileStatValue}>{userJoinedEvents.length}</Text>
                    </View>
                    <View style={[styles.profileStatRow, { backgroundColor: COLORS.white }]}> 
                      <View style={styles.profileStatIcon}><Sparkles color={COLORS.dark} size={21} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileStatLabel}>Complete</Text>
                        <Text style={styles.profileStatHint}>{userCollectedCount}/{userTotalStampCount} checkpoints collected</Text>
                      </View>
                      <Text style={styles.profileStatValue}>{userCompletionRate}%</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Collected Stamps</Text>
                  {collectedStamps.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={styles.emptyCircle}><Award color={COLORS.gray} size={38} /></View>
                      <Text style={styles.emptyText}>No stamps collected yet. Scan an event QR and start your physical journey.</Text>
                    </View>
                  ) : (
                    <View style={styles.collectedList}>
                      {collectedStamps.map(stamp => (
                        <View key={stamp.id} style={styles.collectedRow}>
                          <View style={[styles.collectedIcon, { backgroundColor: stamp.eventColor }]}> 
                            <Image source={STAMP_IMAGES[stamp.img_key]} style={styles.collectedImg} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.collectedName}>{stamp.name}</Text>
                            <Text style={styles.collectedMeta}>{stamp.eventTitle} · {stamp.eventLocation}</Text>
                          </View>
                          <CheckCircle2 color={COLORS.green} fill={COLORS.green} size={20} />
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={{ height: 120 }} />
                </ScrollView>
              </View>
            ) : activeEvent ? (
              <View style={{ flex: 1 }}>
                <View style={[styles.detailHero, { backgroundColor: activeEvent.cover_color }]}> 
                  <View style={styles.detailTopActions}>
                    <TouchableOpacity onPress={() => setActiveEventId(null)} style={styles.backBtn}><ArrowLeft color={COLORS.dark} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => removeJoinedEvent(activeEvent.id)} style={styles.detailDeleteBtn}><Trash2 size={18} color={COLORS.red} /></TouchableOpacity>
                  </View>
                  <Text style={styles.detailTitle}>{activeEvent.title}</Text>
                  <View style={styles.detailMeta}>
                    <View style={styles.pill}><Award size={14} color="white" /><Text style={styles.pillText}>{activeEvent.stamps.length} points</Text></View>
                    <View style={styles.pillLight}><MapPin size={12} color={COLORS.dark} /><Text style={styles.pillTextDark}>{activeEvent.location}</Text></View>
                  </View>
                </View>
                <ScrollView contentContainerStyle={styles.detailScrollBody}>
                  <View style={styles.infoRow}><Clock size={14} color={COLORS.brown} /><Text style={styles.infoText}>{activeEvent.date}</Text></View>
                  <Text style={styles.detailDesc}>{activeEvent.description}</Text>
                  <View style={styles.stampGrid}>
                    {activeEvent.stamps.map((s, idx) => {
                      const isCollected = collectedStampIds.includes(s.id);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => !isCollected && openStamp(s)}
                          style={[styles.stampTile, isCollected ? styles.tileCollected : styles.tileLocked]}
                        >
                          <Text style={styles.tileIdx}>{String(idx + 1).padStart(2, '0')}</Text>
                          {isCollected ? (
                            <Image source={STAMP_IMAGES[s.img_key]} style={styles.tileImg} />
                          ) : (
                            <Image source={STAMP_IMAGES[s.img_key]} style={[styles.tileImg, styles.tileImgLocked]} />
                          )}
                          <Text style={styles.tileName}>{s.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.homeHero}>
                    <View>
                      <Text style={styles.brandTitle}>StampLog</Text>
                      <Text style={styles.brandSub}>Track your physical journey.</Text>
                    </View>
                    <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfile(true)} activeOpacity={0.85}>
                      <Image source={activeAvatarImage} style={styles.profileButtonImg} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.userProgressCard}>
                    <View>
                      <Text style={styles.userProgressTitle}>Journey Progress</Text>
                      <Text style={styles.userProgressText}>{userCollectedCount}/{userTotalStampCount} stamps collected</Text>
                    </View>
                    <Text style={styles.userProgressPercent}>{userCompletionRate}%</Text>
                  </View>

                  {userJoinedEvents.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={styles.emptyCircle}><Layers color={COLORS.gray} size={40} /></View>
                      <Text style={styles.emptyText}>Scan an Event QR code at the entrance to begin your collection.</Text>
                    </View>
                  ) : (
                    userJoinedEvents.map(ev => (
                      <TouchableOpacity key={ev.id} onPress={() => setActiveEventId(ev.id)} style={[styles.eventCard, { backgroundColor: ev.cover_color }]}> 
                        <Text style={styles.eventCardTitle}>{ev.title}</Text>
                        <View style={styles.eventCardFooter}>
                          <View style={styles.stack}>
                            {ev.stamps.map((s, idx) => {
                              const isCollected = collectedStampIds.includes(s.id);
                              return (
                                <View key={s.id} style={[styles.stackCircle, { marginLeft: idx === 0 ? 0 : -15 }, !isCollected && styles.stackLocked]}>
                                  <Image source={STAMP_IMAGES[s.img_key]} style={[styles.stackStampImg, !isCollected && styles.stackStampImgLocked]} />
                                </View>
                              );
                            })}
                          </View>
                          <View style={styles.cardAction}>
                            <Text style={styles.cardActionText}>Details</Text>
                            <ChevronRight color="white" size={14} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                  <View style={{ height: 120 }} />
                </ScrollView>
                <TouchableOpacity style={styles.fab} onPress={() => { isProcessingScan.current = false; setShowScanner(true); }}>
                  <ScanLine color={COLORS.dark} size={32} />
                  <Text style={styles.fabText}>SCAN ENTRANCE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>

      <Modal visible={showScanner} animationType="slide">
        <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={handleScan} barcodeSettings={{ barcodeTypes: ['qr'] }} />
        <View style={styles.scannerUI}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
            <View style={[styles.corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
          </View>
          <Text style={styles.scannerText}>Align Entrance QR Code</Text>
        </View>
        <TouchableOpacity style={styles.scannerClose} onPress={() => { isProcessingScan.current = false; setShowScanner(false); }}>
          <X color="white" size={32} />
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!showUnlockSuccess} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popCard}>
            <View style={styles.popIcon}><Ticket color={COLORS.yellow} size={40} /></View>
            <Text style={styles.popTitle}>New Journal Unlocked!</Text>
            <Text style={styles.popDesc}>{showUnlockSuccess}</Text>
            <TouchableOpacity style={styles.popBtn} onPress={() => setShowUnlockSuccess(null)}>
              <Text style={styles.popBtnText}>Start Journey</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!showCongratulations} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.victoryCard}>
            <Sparkles color={COLORS.yellow} size={58} />
            <Text style={styles.congratsTitle} numberOfLines={1} adjustsFontSizeToFit>Congratulations!</Text>
            <Text style={styles.victoryDesc}>You collected every stamp in {showCongratulations}. Your full journey has been saved.</Text>
            <TouchableOpacity style={styles.victoryBtn} onPress={() => setShowCongratulations(null)}>
              <Text style={styles.victoryBtnText}>AWESOME</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAvatarPicker} transparent animationType="slide">
        <View style={styles.avatarPickerOverlay}>
          <View style={styles.avatarPickerCard}>
            <View style={styles.avatarPickerHeader}>
              <View>
                <Text style={styles.avatarPickerTitle}>Choose Avatar</Text>
                <Text style={styles.avatarPickerSub}>Select one built-in profile image.</Text>
              </View>
              <TouchableOpacity style={styles.avatarPickerClose} onPress={() => setShowAvatarPicker(false)}>
                <X color={COLORS.dark} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarGrid}>
              {PROFILE_IMAGE_KEYS.map(key => {
                const selected = activeAvatarKey === key;
                return (
                  <TouchableOpacity key={key} style={[styles.avatarOption, selected && styles.avatarOptionActive]} onPress={() => updateAvatar(key)}>
                    <Image source={PROFILE_IMAGES[key]} style={styles.avatarOptionImg} />
                    {selected && <View style={styles.avatarSelectedBadge}><CheckCircle2 color="white" fill={COLORS.green} size={20} /></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GeometricStampScreen({ data, onCancel, onSuccess }: { data: StampPadData; onCancel: () => void; onSuccess: () => void }) {
  const [touches, setTouches] = useState<{ x: number; y: number }[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<any>(null);

  const validateGeometry = (pts: { x: number; y: number }[]) => {
    if (pts.length !== 4) return false;
    const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
    const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
    return pts.every(p => Math.abs(Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) - 176.7) < 45);
  };

  const handleTouch = (e: any) => {
    const pts = e.nativeEvent.touches.map((t: any) => ({ x: t.locationX, y: t.locationY }));
    setTouches(pts);
    const valid = validateGeometry(pts);
    setIsValid(valid);

    if (valid) {
      if (!timer.current) {
        timer.current = setInterval(() => {
          setProgress(p => {
            if (p >= 100) {
              clearInterval(timer.current);
              timer.current = null;
              onSuccess();
              return 100;
            }
            return p + 5;
          });
        }, 40);
      }
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      setProgress(0);
    }
  };

  return (
    <View style={styles.padRoot} onStartShouldSetResponder={() => true} onResponderMove={handleTouch} onResponderRelease={() => { setTouches([]); setIsValid(false); setProgress(0); if (timer.current) clearInterval(timer.current); timer.current = null; }}>
      <TouchableOpacity style={styles.padBack} onPress={onCancel}><X color="white" size={30} /></TouchableOpacity>
      <View style={styles.padHead}>
        <Text style={styles.padTitle}>Verify Stamp</Text>
        <Text style={styles.padSub}>Apply your physical stamp to the screen.</Text>
      </View>
      <View style={styles.padCenter}>
        <Svg width="300" height="300" style={StyleSheet.absoluteFill}>
          <Circle cx="150" cy="150" r="140" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
          <Circle cx="150" cy="150" r="140" stroke={COLORS.yellow} strokeWidth="10" fill="none" strokeDasharray="880" strokeDashoffset={880 - (880 * progress) / 100} />
        </Svg>
        <Image source={STAMP_IMAGES[data.img_key]} style={[styles.padPreview, { opacity: isValid ? 1 : 0.2, transform: [{ scale: isValid ? 1.1 : 1 }] }]} />
        {touches.map((t, i) => <View key={i} style={[styles.touchIndicator, { left: t.x - 25, top: t.y - 25, borderColor: isValid ? COLORS.green : COLORS.red }]} />)}
      </View>
      <Text style={[styles.padStatus, { color: isValid ? COLORS.yellow : 'white' }]}>{isValid ? 'RECOGNIZED! HOLDING...' : `SENSORS: ${touches.length}/4`}</Text>
    </View>
  );
}

function SuccessModal({ img, completeTitle, onDone }: { img: any; completeTitle?: string | null; onDone: () => void }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.victoryCard}>
        <Sparkles color={COLORS.yellow} size={60} />
        <Text style={styles.victoryTitle}>STAMPED!</Text>
        <View style={styles.victoryImgWrap}><Image source={img} style={{ width: 120, height: 120 }} /></View>
        <Text style={styles.victoryDesc}>{completeTitle ? 'Final stamp collected. Your full journal is complete.' : 'Your physical action has been recorded in the digital journal.'}</Text>
        <TouchableOpacity style={styles.victoryBtn} onPress={onDone}><Text style={styles.victoryBtnText}>{completeTitle ? 'SEE COMPLETE' : 'CONTINUE'}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loadingLogo: { width: 118, height: 118, borderRadius: 30, marginBottom: 20 },
  loadingText: { fontSize: 32, fontWeight: '900', color: COLORS.dark },
  authRoot: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', paddingHorizontal: 24 },
  authCard: { backgroundColor: COLORS.white, borderRadius: 40, padding: 28, borderWidth: 3, borderColor: COLORS.dark, shadowColor: COLORS.dark, shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1 },
  authScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32 },
  authLogo: { width: 132, height: 132, borderRadius: 34, alignSelf: 'center', marginBottom: 18 },
  authSlogan: { fontSize: 14, color: COLORS.brown, textAlign: 'center', fontWeight: '700', marginBottom: 8 },
  authTitle: { fontSize: 44, fontWeight: '900', color: COLORS.dark, textAlign: 'center', letterSpacing: -1.5 },
  authSubtitle: { fontSize: 14, color: COLORS.brown, textAlign: 'center', fontWeight: '700', marginTop: 6, marginBottom: 28 },
  authRoleSelector: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  authRoleCard: { flex: 1, minHeight: 126, backgroundColor: COLORS.bg, borderRadius: 24, padding: 14, borderWidth: 2, borderColor: '#EFE7DC', justifyContent: 'space-between' },
  authRoleCardActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark, shadowColor: COLORS.dark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.25 },
  authRoleTitle: { color: COLORS.dark, fontSize: 14, fontWeight: '900', marginTop: 10 },
  authRoleTitleActive: { color: COLORS.yellow },
  authRoleDesc: { color: COLORS.brown, fontSize: 11, fontWeight: '700', lineHeight: 15, marginTop: 4 },
  authRoleDescActive: { color: COLORS.white, opacity: 0.85 },
  authInput: { backgroundColor: COLORS.bg, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, marginBottom: 14, borderWidth: 2, borderColor: '#EFE7DC', color: COLORS.dark, fontWeight: '700' },
  authButton: { backgroundColor: COLORS.dark, borderRadius: 22, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  authButtonDisabled: { opacity: 0.7 },
  authButtonText: { color: COLORS.yellow, fontWeight: '900', letterSpacing: 1 },
  authSwitch: { alignItems: 'center', paddingTop: 20 },
  authSwitchText: { color: COLORS.brown, fontWeight: '900' },
  navHeader: { padding: 15, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.dark },
  headerSubtitle: { fontSize: 12, fontWeight: '700', color: COLORS.brown, marginTop: 2 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EFE7DC' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)' },
  signOutText: { color: COLORS.dark, fontSize: 12, fontWeight: '900' },
  homeHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20, marginBottom: 18 },
  profileButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.yellow, borderWidth: 3, borderColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileButtonImg: { width: 48, height: 48, borderRadius: 24 },
  brandTitle: { fontSize: 50, fontWeight: '900', color: COLORS.dark, letterSpacing: -2 },
  brandSub: { fontSize: 16, color: COLORS.brown, fontWeight: 'bold' },
  userProgressCard: { backgroundColor: COLORS.white, borderRadius: 30, padding: 20, marginBottom: 24, borderWidth: 2, borderColor: '#EFE7DC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userProgressTitle: { color: COLORS.dark, fontSize: 16, fontWeight: '900' },
  userProgressText: { color: COLORS.brown, fontSize: 12, fontWeight: '700', marginTop: 4 },
  userProgressPercent: { color: COLORS.dark, fontSize: 32, fontWeight: '900' },
  profileScroll: { paddingBottom: 30 },
  profileHero: { backgroundColor: COLORS.dark, borderRadius: 36, padding: 26, alignItems: 'center', marginTop: 12, marginBottom: 20 },
  profileAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 3, borderColor: COLORS.yellow },
  profileAvatarImg: { width: 86, height: 86, borderRadius: 43 },
  profileAvatarEditBadge: { position: 'absolute', bottom: -8, backgroundColor: COLORS.yellow, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: COLORS.dark },
  profileAvatarEditText: { color: COLORS.dark, fontSize: 10, fontWeight: '900' },
  profileName: { color: COLORS.yellow, fontSize: 26, fontWeight: '900', marginTop: 6 },
  profileEmail: { color: COLORS.white, opacity: 0.75, fontSize: 12, fontWeight: '700', marginTop: 5 },
  profileStatsList: { gap: 12, marginBottom: 22 },
  profileStatRow: { minHeight: 92, borderRadius: 28, padding: 16, borderWidth: 2, borderColor: COLORS.dark, flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileStatIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileStatLabel: { color: COLORS.dark, fontSize: 17, fontWeight: '900' },
  profileStatHint: { color: COLORS.brown, fontSize: 11, fontWeight: '700', marginTop: 4 },
  profileStatValue: { color: COLORS.dark, fontSize: 30, fontWeight: '900', minWidth: 58, textAlign: 'right' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minHeight: 116, borderRadius: 28, padding: 14, borderWidth: 2, borderColor: COLORS.dark, justifyContent: 'space-between' },
  statNumber: { color: COLORS.dark, fontSize: 28, fontWeight: '900', marginTop: 8 },
  statLabel: { color: COLORS.dark, fontSize: 11, fontWeight: '900', opacity: 0.75 },
  sectionTitle: { color: COLORS.dark, fontSize: 22, fontWeight: '900', marginBottom: 14 },
  collectedList: { gap: 12 },
  collectedRow: { backgroundColor: COLORS.white, borderRadius: 24, padding: 14, borderWidth: 2, borderColor: '#EFE7DC', flexDirection: 'row', alignItems: 'center', gap: 12 },
  collectedIcon: { width: 58, height: 58, borderRadius: 20, borderWidth: 2, borderColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' },
  collectedImg: { width: 38, height: 38 },
  collectedName: { color: COLORS.dark, fontSize: 15, fontWeight: '900' },
  collectedMeta: { color: COLORS.brown, fontSize: 11, fontWeight: '700', marginTop: 4 },
  emptyState: { paddingVertical: 80, alignItems: 'center', backgroundColor: 'white', borderRadius: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD' },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { textAlign: 'center', paddingHorizontal: 40, color: COLORS.gray, fontWeight: '700', lineHeight: 22 },
  eventCard: { padding: 25, borderRadius: 38, marginBottom: 22, minHeight: 190, borderWidth: 2, borderColor: COLORS.dark, shadowColor: COLORS.dark, shadowOffset: { width: 4, height: 5 }, shadowOpacity: 0.28, shadowRadius: 0, overflow: 'visible' },
  eventCardTitle: { fontSize: 26, fontWeight: '900', color: COLORS.dark, marginBottom: 30 },
  eventCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stack: { flexDirection: 'row' },
  stackCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.dark, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  stackLocked: { backgroundColor: 'rgba(255,255,255,0.45)', borderStyle: 'dashed', borderColor: 'rgba(56,29,14,0.35)' },
  stackStampImg: { width: 22, height: 22 },
  stackStampImgLocked: { opacity: 0.22 },
  userDeleteBtn: { position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', zIndex: 5, borderWidth: 1, borderColor: 'rgba(56,29,14,0.15)' },
  cardAction: { backgroundColor: COLORS.dark, padding: 10, paddingHorizontal: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  cardActionText: { color: 'white', fontSize: 11, fontWeight: '900', marginRight: 5 },
  fab: { position: 'absolute', bottom: 40, alignSelf: 'center', height: 70, paddingHorizontal: 25, borderRadius: 35, backgroundColor: COLORS.yellow, borderWidth: 4, borderColor: COLORS.dark, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3 },
  fabText: { marginLeft: 10, fontWeight: '900', color: COLORS.dark, fontSize: 14 },
  detailHero: { padding: 30, paddingBottom: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, borderBottomWidth: 3, borderColor: COLORS.dark },
  detailTopActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  detailDeleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  detailTitle: { fontSize: 34, fontWeight: '900', color: COLORS.dark },
  detailMeta: { flexDirection: 'row', gap: 10, marginTop: 15 },
  pill: { backgroundColor: COLORS.dark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, flexDirection: 'row', alignItems: 'center' },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, flexDirection: 'row', alignItems: 'center' },
  pillText: { color: 'white', fontSize: 11, fontWeight: '900', marginLeft: 5 },
  pillTextDark: { color: COLORS.dark, fontSize: 11, fontWeight: '900', marginLeft: 5 },
  detailScrollBody: { padding: 24, flexGrow: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { fontSize: 14, fontWeight: '900', color: COLORS.brown, marginLeft: 8 },
  detailDesc: { color: COLORS.dark, fontWeight: '700', lineHeight: 22, opacity: 0.7, marginBottom: 30 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  stampTile: { width: '47%', aspectRatio: 1, borderRadius: 32, padding: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  tileCollected: { backgroundColor: COLORS.yellow, borderWidth: 3, borderColor: COLORS.dark, shadowColor: COLORS.dark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1 },
  tileLocked: { backgroundColor: 'transparent', borderWidth: 0 },
  tileIdx: { position: 'absolute', top: 15, left: 20, fontSize: 18, fontWeight: '900', color: COLORS.dark, opacity: 0.1 },
  tileImg: { width: 80, height: 80 },
  tileImgLocked: { opacity: 0.2 },
  tileName: { position: 'absolute', bottom: 15, fontSize: 11, fontWeight: '900', color: COLORS.dark },
  adminScroll: { padding: 24 },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  adminTitle: { fontSize: 28, fontWeight: '900' },
  adminAdd: { width: 50, height: 50, borderRadius: 20, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' },
  adminScrollContent: { paddingBottom: 30 },
  dashboardCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 18, borderWidth: 2, borderColor: COLORS.dark, marginBottom: 20 },
  dashboardCardTitle: { fontSize: 16, fontWeight: '900', color: COLORS.dark, marginBottom: 8 },
  dashboardCardText: { color: COLORS.brown, fontWeight: '700', lineHeight: 20 },
  adminCard: { backgroundColor: 'white', borderRadius: 35, padding: 20, marginBottom: 28, borderWidth: 2, borderColor: COLORS.dark, shadowColor: COLORS.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, overflow: 'visible' },
  adminCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  adminInputTitle: { fontSize: 20, fontWeight: '900', flex: 1, color: COLORS.dark },
  adminInputSub: { fontSize: 14, color: COLORS.gray, marginBottom: 10, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 12 },
  adminInputArea: { fontSize: 14, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 15, height: 60, color: COLORS.brown },
  adminQRBox: { alignItems: 'center', padding: 25, backgroundColor: '#FAFAFA', borderRadius: 25, marginVertical: 20, borderWidth: 1, borderColor: '#EEE' },
  adminQRId: { fontSize: 10, color: '#AAA', marginTop: 15, fontWeight: 'bold' },
  adminLabel: { fontSize: 14, fontWeight: '900', marginBottom: 15, color: COLORS.dark },
  adminStampRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  adminStampIdx: { width: 24, fontSize: 12, color: '#CCC', fontWeight: '900' },
  adminStampInput: { flex: 1, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 'bold' },
  adminStampIcon: { padding: 5, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  adminStampDelete: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FFE0E0', justifyContent: 'center', alignItems: 'center' },
  adminAddPoint: { flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'center' },
  adminAddPointText: { color: COLORS.brown, fontSize: 13, fontWeight: '900', marginLeft: 8 },
  padRoot: { flex: 1, backgroundColor: COLORS.dark },
  padBack: { marginTop: 60, marginLeft: 30, padding: 10 },
  padHead: { alignItems: 'center', paddingHorizontal: 50, marginTop: 20 },
  padTitle: { color: COLORS.yellow, fontSize: 32, fontWeight: '900' },
  padSub: { color: 'white', opacity: 0.5, textAlign: 'center', marginTop: 10, fontSize: 14 },
  padCenter: { width: 300, height: 300, alignSelf: 'center', marginTop: 60, justifyContent: 'center', alignItems: 'center' },
  padPreview: { width: 120, height: 120 },
  touchIndicator: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  padStatus: { textAlign: 'center', marginTop: 50, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  popCard: { width: 300, backgroundColor: 'white', borderRadius: 45, padding: 35, alignItems: 'center', borderWidth: 4, borderColor: COLORS.dark },
  popIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  popTitle: { fontSize: 24, fontWeight: '900', color: COLORS.dark, textAlign: 'center' },
  popDesc: { color: COLORS.gray, textAlign: 'center', marginVertical: 15, fontWeight: '700' },
  popBtn: { backgroundColor: COLORS.dark, paddingHorizontal: 35, paddingVertical: 18, borderRadius: 22 },
  popBtnText: { color: COLORS.yellow, fontWeight: '900' },
  victoryCard: { width: width - 54, maxWidth: 390, backgroundColor: COLORS.bg, borderRadius: 50, padding: 34, alignItems: 'center', borderWidth: 4, borderColor: COLORS.dark },
  victoryTitle: { fontSize: 32, fontWeight: '900', color: COLORS.dark },
  congratsTitle: { width: '100%', fontSize: 30, fontWeight: '900', color: COLORS.dark, textAlign: 'center', lineHeight: 36 },
  victoryImgWrap: { marginVertical: 30, padding: 25, backgroundColor: 'white', borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1 },
  victoryDesc: { textAlign: 'center', color: COLORS.brown, fontWeight: 'bold', marginBottom: 30, lineHeight: 20 },
  victoryBtn: { backgroundColor: COLORS.dark, paddingHorizontal: 40, paddingVertical: 18, borderRadius: 25 },
  victoryBtnText: { color: COLORS.yellow, fontWeight: '900' },
  scannerUI: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerFrame: { width: 250, height: 250, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: COLORS.yellow, borderWidth: 5, borderRadius: 10 },
  scannerText: { color: 'white', marginTop: 40, fontWeight: '900', letterSpacing: 1 },
  scannerClose: { position: 'absolute', top: 60, right: 30, padding: 10 },
  avatarPickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  avatarPickerCard: { backgroundColor: COLORS.bg, borderTopLeftRadius: 38, borderTopRightRadius: 38, padding: 24, paddingBottom: 38, borderWidth: 3, borderColor: COLORS.dark },
  avatarPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  avatarPickerTitle: { color: COLORS.dark, fontSize: 26, fontWeight: '900' },
  avatarPickerSub: { color: COLORS.brown, fontSize: 12, fontWeight: '700', marginTop: 4 },
  avatarPickerClose: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EFE7DC' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  avatarOption: { width: '30%', aspectRatio: 1, borderRadius: 30, backgroundColor: COLORS.white, borderWidth: 2, borderColor: '#EFE7DC', justifyContent: 'center', alignItems: 'center' },
  avatarOptionActive: { borderColor: COLORS.dark, backgroundColor: COLORS.yellow, shadowColor: COLORS.dark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.25 },
  avatarOptionImg: { width: 76, height: 76, borderRadius: 38 },
  avatarSelectedBadge: { position: 'absolute', top: 8, right: 8 },
});
