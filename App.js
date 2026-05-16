import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import {
  View, Text, ActivityIndicator, StatusBar,
  TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LangProvider, useLang } from './src/utils/i18n';
import LoginScreen        from './src/screens/LoginScreen';
import HomeScreen         from './src/screens/HomeScreen';
import BoardScreen        from './src/screens/BoardScreen';
import JobDetailScreen    from './src/screens/JobDetailScreen';
import PostScreen         from './src/screens/PostScreen';
import PostJobScreen      from './src/screens/PostJobScreen';
import ProfileScreen      from './src/screens/ProfileScreen';
import AIScreen           from './src/screens/AIScreen';
import AdminScreen        from './src/screens/AdminScreen';
import CarScreen          from './src/screens/CarScreen';
import CarDetailScreen    from './src/screens/CarDetailScreen';
import RoomScreen         from './src/screens/RoomScreen';
import RoomDetailScreen   from './src/screens/RoomDetailScreen';
import PostCarScreen      from './src/screens/PostCarScreen';
import PostRoomScreen     from './src/screens/PostRoomScreen';
import BuySellScreen      from './src/screens/BuySellScreen';
import BuySellDetailScreen from './src/screens/BuySellDetailScreen';
import OnboardingScreen, { isOnboarded } from './src/screens/OnboardingScreen';
import ReferralScreen     from './src/screens/ReferralScreen';
import { registerForPushNotifications, addNotificationResponseListener } from './src/utils/notifications';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, i) { console.error('ErrorBoundary:', e, i); }
  render() {
    if (this.state.hasError) return (
      <View style={s.errBox}>
        <View style={s.errIcon}>
          <MaterialIcons name="warning" size={32} color={ORANGE} />
        </View>
        <Text style={s.errTitle}>Something went wrong</Text>
        <Text style={s.errMsg}>{this.state.error?.message || 'Unexpected error'}</Text>
        <TouchableOpacity style={s.errBtn} onPress={() => this.setState({ hasError: false, error: null })}>
          <Text style={s.errBtnTxt}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
    return this.props.children;
  }
}

// ── Custom Geometric Tab Bar ──────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const { t } = useLang();

  const tabConfig = {
    Home:  { icon: 'home',      activeIcon: 'home',      color: ORANGE },
    Jobs:  { icon: 'briefcase-outline', activeIcon: 'briefcase', color: INDIGO },
    Post:  { icon: 'add',       activeIcon: 'add',       color: ORANGE, isCenter: true },
    Rooms: { icon: 'business-outline', activeIcon: 'business', color: CYAN },
    Cars:  { icon: 'car-sport-outline', activeIcon: 'car-sport', color: '#a78bfa' },
  };

  return (
    <View style={s.tabBar}>
      {/* Geometric top border */}
      <View style={s.tabTopLine} />
      <View style={s.tabTopGlow} />

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const cfg       = tabConfig[route.name] || { icon: 'ellipse-outline', activeIcon: 'ellipse', color: ORANGE };
        const isPost    = route.name === 'Post';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isPost) return (
          <TouchableOpacity key={route.key} onPress={onPress} style={s.postSlot} activeOpacity={0.8}>
            <View style={s.postBtn}>
              {/* Geometric inner ring */}
              <View style={s.postBtnRing} />
              <Ionicons name="add" size={30} color="#fff" />
            </View>
            <Text style={s.postLabel}>Post</Text>
          </TouchableOpacity>
        );

        const label = t(route.name.toLowerCase()) || route.name;

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={s.tabItem} activeOpacity={0.75}>
            {isFocused && <View style={[s.tabActiveBg, { backgroundColor: cfg.color + '15' }]} />}
            {isFocused && (
              <View style={[s.tabActiveDiamond, { backgroundColor: cfg.color, shadowColor: cfg.color }]} />
            )}
            <Ionicons
              name={isFocused ? cfg.activeIcon : cfg.icon}
              size={22}
              color={isFocused ? cfg.color : 'rgba(255,255,255,0.25)'}
            />
            <Text style={[s.tabLabel, isFocused && { color: cfg.color, fontWeight: '700' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const HEADER = {
  headerStyle:      { backgroundColor: '#0e0e1c' },
  headerTintColor:  '#ffffff',
  headerTitleStyle: { fontWeight: '800', fontSize: 16, color: '#fff' },
  headerShadowVisible: false,
};

// ── Tab Navigator ─────────────────────────────────────────────────────────────
function MainTabs() {
  const { t } = useLang();
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={HEADER}>
      <Tab.Screen name="Home"  component={HomeScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Jobs"  component={BoardScreen} options={{ headerTitle: t('findJobs') }} />
      <Tab.Screen name="Post"  component={PostScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Rooms" component={RoomScreen}  options={{ headerTitle: t('roomsPG') }} />
      <Tab.Screen name="Cars"  component={CarScreen}   options={{ headerTitle: t('carRental') }} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const [showOnboarding, setShowOnboarding] = React.useState(null);

  React.useEffect(() => {
    isOnboarded().then(done => setShowOnboarding(!done));
  }, []);

  React.useEffect(() => {
    if (user) registerForPushNotifications().catch(() => {});
  }, [user?.id]);

  React.useEffect(() => {
    const unsub = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
    });
    return unsub;
  }, []);

  if (loading || showOnboarding === null) return (
    <View style={s.splash}>
      {/* Geometric splash decorations */}
      <View style={[s.splashGeo1, { borderBottomColor: ORANGE + '15' }]} />
      <View style={[s.splashGeo2, { backgroundColor: INDIGO + '12', borderColor: INDIGO + '20' }]} />
      <View style={[s.splashGeo3, { borderColor: CYAN + '15' }]} />
      <View style={[s.splashGeo4, { borderBottomColor: '#8b5cf630' }]} />

      {/* Logo mark */}
      <View style={s.splashIconWrap}>
        <View style={s.splashIconRing} />
        <View style={s.splashIcon}>
          <MaterialIcons name="location-city" size={36} color={ORANGE} />
        </View>
        {/* Corner diamonds */}
        <View style={[s.iconCorner1, { backgroundColor: ORANGE }]} />
        <View style={[s.iconCorner2, { backgroundColor: INDIGO }]} />
        <View style={[s.iconCorner3, { backgroundColor: CYAN }]} />
      </View>

      <Text style={s.splashTitle}>
        <Text style={{ color: '#fff' }}>Nanded</Text>
        <Text style={{ color: ORANGE }}>Rozgar</Text>
      </Text>
      <Text style={s.splashSub}>Jobs · Cars · Rooms · Nanded</Text>

      <View style={s.splashLoader}>
        <ActivityIndicator color={ORANGE} size="small" />
        <Text style={s.splashLoaderTxt}>Loading…</Text>
      </View>
    </View>
  );

  if (showOnboarding && !user) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user
        ? <Stack.Screen name="Login" component={LoginScreen} />
        : user.role === 'admin'
          ? <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: true, headerTitle: 'Admin Panel', ...HEADER }} />
          : <Stack.Screen name="Main"  component={MainTabs} />
      }
      <Stack.Screen name="JobDetail"     component={JobDetailScreen}     options={{ headerShown: true, headerTitle: t('jobDetails'), ...HEADER }} />
      <Stack.Screen name="CarDetail"     component={CarDetailScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="RoomDetail"    component={RoomDetailScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="PostJob"       component={PostJobScreen}       options={{ headerShown: true, headerTitle: t('postAJobTitle'), ...HEADER }} />
      <Stack.Screen name="PostCar"       component={PostCarScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="PostRoom"      component={PostRoomScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="BuySell"       component={BuySellScreen}       options={{ headerShown: true, headerTitle: t('buySell'), ...HEADER }} />
      <Stack.Screen name="BuySellDetail" component={BuySellDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile"       component={ProfileScreen}       options={{ headerShown: true, headerTitle: t('myProfile'), ...HEADER }} />
      <Stack.Screen name="AIMatch"       component={AIScreen}            options={{ headerShown: true, headerTitle: t('aiJobMatch'), ...HEADER }} />
      <Stack.Screen name="AdminPanel"    component={AdminScreen}         options={{ headerShown: true, headerTitle: t('admin'), ...HEADER }} />
      <Stack.Screen name="Referral"      component={ReferralScreen}      options={{ headerShown: true, headerTitle: t('referralTitle'), ...HEADER }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <LangProvider>
              <NavigationContainer>
                <StatusBar barStyle="light-content" backgroundColor="#080812" />
                <RootNavigator />
              </NavigationContainer>
              <Toast />
            </LangProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a0a18',
    height: 72, paddingBottom: 10, paddingHorizontal: 4,
    borderTopWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 20,
    overflow: 'hidden',
  },
  tabTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  tabTopGlow: { position: 'absolute', top: 0, left: '30%', right: '30%', height: 2, backgroundColor: ORANGE + '30', borderRadius: 1 },

  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 3, borderRadius: 12, marginHorizontal: 2, overflow: 'hidden' },
  tabActiveBg: { position: 'absolute', inset: 2, borderRadius: 10 },
  tabActiveDiamond: { position: 'absolute', top: 4, width: 4, height: 4, borderRadius: 1, transform: [{ rotate: '45deg' }], shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
  tabLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.25)' },

  postSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postBtn: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -24,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55, shadowRadius: 16, elevation: 14,
    overflow: 'hidden',
    transform: [{ perspective: 400 }, { rotateX: '4deg' }],
  },
  postBtnRing: { position: 'absolute', inset: 4, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  postLabel: { fontSize: 10, fontWeight: '800', color: ORANGE, marginTop: 3 },

  // ── Splash ──
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080812', overflow: 'hidden' },
  splashGeo1: { position: 'absolute', top: 60, right: -10, width: 0, height: 0, borderLeftWidth: 70, borderRightWidth: 70, borderBottomWidth: 120, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  splashGeo2: { position: 'absolute', top: 120, left: -20, width: 80, height: 80, borderRadius: 12, borderWidth: 1.5, transform: [{ rotate: '25deg' }] },
  splashGeo3: { position: 'absolute', bottom: 80, right: 30, width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, backgroundColor: 'transparent' },
  splashGeo4: { position: 'absolute', bottom: 120, left: 20, width: 0, height: 0, borderLeftWidth: 35, borderRightWidth: 35, borderBottomWidth: 60, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  splashIconWrap: { position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  splashIconRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderColor: ORANGE + '30', backgroundColor: 'transparent' },
  splashIcon: { width: 74, height: 74, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 22, borderWidth: 1.5, borderColor: ORANGE + '40', alignItems: 'center', justifyContent: 'center', shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  iconCorner1: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  iconCorner2: { position: 'absolute', top: 2, left: 2, width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  iconCorner3: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 1, transform: [{ rotate: '45deg' }] },

  splashTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 0.5 },
  splashSub:   { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6, fontWeight: '500' },
  splashLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18 },
  splashLoaderTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600' },

  // ── Error ──
  errBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080812', padding: 32 },
  errIcon:  { width: 72, height: 72, backgroundColor: ORANGE + '15', borderRadius: 20, borderWidth: 1.5, borderColor: ORANGE + '35', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  errTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  errMsg:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  errBtn:   { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  errBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 14 },
});
