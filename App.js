import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import {
  View, Text, ActivityIndicator, StatusBar,
  TouchableOpacity, StyleSheet, Platform, useWindowDimensions,
  Animated, Easing, AppState,
} from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DistrictProvider, useDistrict } from './src/context/DistrictContext';
import { LangProvider, useLang } from './src/utils/i18n';
import DistrictPickerScreen from './src/screens/DistrictPickerScreen';
import LoginScreen      from './src/screens/LoginScreen';
import HomeScreen       from './src/screens/HomeScreen';
import BoardScreen      from './src/screens/BoardScreen';
import JobDetailScreen  from './src/screens/JobDetailScreen';
import PostScreen       from './src/screens/PostScreen';
import PostJobScreen    from './src/screens/PostJobScreen';
import ProfileScreen    from './src/screens/ProfileScreen';
import AIScreen         from './src/screens/AIScreen';
import AdminScreen      from './src/screens/AdminScreen';
import CarScreen        from './src/screens/CarScreen';
import CarDetailScreen  from './src/screens/CarDetailScreen';
import RoomScreen       from './src/screens/RoomScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import PostCarScreen    from './src/screens/PostCarScreen';
import PostRoomScreen   from './src/screens/PostRoomScreen';
import BuySellScreen    from './src/screens/BuySellScreen';
import BuySellDetailScreen from './src/screens/BuySellDetailScreen';
import PostItemScreen   from './src/screens/PostItemScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { isOnboarded } from './src/utils/storage';
import ReferralScreen from './src/screens/ReferralScreen';
import MyApplicationsScreen from './src/screens/MyApplicationsScreen';
import SeekerProfileScreen  from './src/screens/SeekerProfileScreen';
import AnalyticsScreen      from './src/screens/AnalyticsScreen';
import AlertsScreen         from './src/screens/AlertsScreen';
import PromoteBusinessScreen from './src/screens/PromoteBusinessScreen';
import HelpSupportScreen    from './src/screens/HelpSupportScreen';
// Bug fix #15: was SellItemForm.jsx — renamed to .js to match all other screens
// and avoid potential Metro / Expo SDK build pipeline resolution issues.
import SellItemForm         from './src/screens/SellItemForm';
import AboutScreen          from './src/screens/AboutScreen';
import ChatScreen           from './src/screens/ChatScreen';
import ChatListScreen       from './src/screens/ChatListScreen';
import { registerForPushNotifications, addNotificationResponseListener } from './src/utils/notifications';
import { BASE_URL } from './src/utils/constants';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const ORANGE = '#f97316';

export const navigationRef = createNavigationContainerRef();

// ── Per-screen error boundary HOC (defined later, used here via forward ref) ──
// Screens are wrapped below after the HOC class is declared. The wrappers are
// defined at module level so React Navigation never sees a new component
// identity between renders (which would cause unnecessary unmount/remount).
// These are filled in after the HOC definition — see the assignment block
// just before RootNavigator.
let _HomeScreen, _BoardScreen, _JobDetailScreen, _PostScreen, _PostJobScreen,
    _ProfileScreen, _AIScreen, _AdminScreen, _CarScreen, _CarDetailScreen,
    _RoomScreen, _RoomDetailScreen, _PostCarScreen, _PostRoomScreen,
    _BuySellScreen, _BuySellDetailScreen, _PostItemScreen, _LoginScreen,
    _ReferralScreen, _MyApplicationsScreen, _SeekerProfileScreen,
    _AnalyticsScreen, _AlertsScreen, _PromoteBusinessScreen,
    _HelpSupportScreen, _SellItemForm, _AboutScreen, _ChatScreen, _ChatListScreen;

// ── Online / offline detection ────────────────────────────────────────────────
// Uses the app's own /health endpoint rather than google.com/generate_204.
// Pinging Google fails in regions where Google is blocked (e.g. some corporate
// networks, certain ISPs) and gives a false "offline" even when the user can
// reach our server just fine. Our /health endpoint is a tiny JSON response so
// it adds negligible load and is a true indicator of whether the app's backend
// is reachable.
const PING_URL = `${BASE_URL}/health`;
const PING_TIMEOUT_MS = 4000;

function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(true);
  const timerRef = React.useRef(null);

  const check = React.useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsOnline(navigator.onLine);
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      await fetch(PING_URL, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  }, []);

  React.useEffect(() => {
    check();
    // Re-check every 8 s while the app is active
    timerRef.current = setInterval(check, 8000);

    // Re-check immediately when app returns to foreground
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });

    // Web — listen to native online/offline events.
    // Bug fix #17: the previous code added anonymous arrow functions as
    // listeners but never removed them in the cleanup return, causing a
    // listener leak each time the component remounted. Fix: store the handler
    // references so the exact same function objects can be passed to
    // removeEventListener in the cleanup.
    let onOnline, onOffline;
    if (Platform.OS === 'web') {
      onOnline  = () => setIsOnline(true);
      onOffline = () => setIsOnline(false);
      window.addEventListener('online',  onOnline);
      window.addEventListener('offline', onOffline);
    }

    return () => {
      clearInterval(timerRef.current);
      sub.remove();
      // Remove web listeners only if they were registered
      if (Platform.OS === 'web' && onOnline && onOffline) {
        window.removeEventListener('online',  onOnline);
        window.removeEventListener('offline', onOffline);
      }
    };
  }, [check]);

  return isOnline;
}

// ── Offline banner ─────────────────────────────────────────────────────────────
// Bug fix #16: the previous implementation used position:'absolute', top:0 inside
// NavigationContainer. On Android this put the banner behind the status bar in
// certain configurations because NavigationContainer does not automatically apply
// safe area insets. Fix: use useSafeAreaInsets() to read the actual status bar
// height and apply it as paddingTop, so the banner always sits below the status
// bar regardless of device or Android API level.
function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-48)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[
      s.offlineBanner,
      // Push banner content below the status bar on Android; iOS inset is 0
      // here because NavigationContainer already handles the top safe area.
      { paddingTop: insets.top > 0 ? insets.top : 0 },
      { transform: [{ translateY: slideAnim }] },
    ]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={s.offlineTxt}>No internet connection</Text>
    </Animated.View>
  );
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, retryKey: 0 };
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, i) { console.error('ErrorBoundary:', e, i); }
  handleRetry = () => {
    // Increment retryKey so the child tree fully remounts on retry,
    // rather than re-rendering into the same broken state.
    this.setState(prev => ({ hasError: false, error: null, retryKey: prev.retryKey + 1 }));
  };
  render() {
    if (this.state.hasError) return (
      <View style={s.errBox}>
        <MaterialIcons name="warning" size={48} color={ORANGE} style={{ marginBottom: 16 }} />
        <Text style={s.errTitle}>Something went wrong</Text>
        <Text style={s.errMsg}>{this.state.error?.message || 'Unexpected error'}</Text>
        <TouchableOpacity style={s.errBtn} onPress={this.handleRetry}>
          <Text style={s.errBtnTxt}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

// ── Debounced window width ────────────────────────────────────────────────────
// useWindowDimensions fires on every resize event, including when the software
// keyboard opens/closes on Android. This causes CustomTabBar to flicker because
// it re-renders and conditionally returns null on web (width >= 600). A short
// debounce prevents rapid toggling while the keyboard is animating in/out.
function useStableWidth(delayMs = 150) {
  const { width } = useWindowDimensions();
  const [stableWidth, setStableWidth] = React.useState(width);
  const timerRef = React.useRef(null);
  React.useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStableWidth(width), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [width, delayMs]);
  return stableWidth;
}

// ── Per-screen Error Boundary HOC ─────────────────────────────────────────────
// Wraps an individual screen so a crash in one screen shows a contained
// "Go back" card rather than the full-app error boundary. The full-app
// ErrorBoundary above is kept as the last-resort catch-all.
function withScreenErrorBoundary(WrappedScreen, displayName) {
  class ScreenErrorBoundary extends React.Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
    componentDidCatch(e, info) { console.error(`[${displayName}] crashed:`, e, info); }
    render() {
      if (this.state.hasError) {
        return (
          <View style={s.screenErrBox}>
            <MaterialIcons name="warning-amber" size={40} color={ORANGE} style={{ marginBottom: 12 }} />
            <Text style={s.screenErrTitle}>This screen ran into a problem</Text>
            <Text style={s.screenErrMsg}>{this.state.error?.message || 'Unexpected error'}</Text>
            <TouchableOpacity
              style={s.screenErrBtn}
              onPress={() => {
                this.setState({ hasError: false, error: null });
                // Navigate back if possible, otherwise reset to Main
                try { this.props.navigation.goBack(); } catch { /* no-op */ }
              }}
            >
              <Text style={s.screenErrBtnTxt}>Go Back</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return <WrappedScreen {...this.props} />;
    }
  }
  ScreenErrorBoundary.displayName = `withScreenErrorBoundary(${displayName})`;
  return ScreenErrorBoundary;
}

// ── Custom Tab Bar ────────────────────────────────────────────────────────────
function TabIcon({ name, focused, library = 'ion' }) {
  const color = focused ? ORANGE : '#aaa';
  const size = 22;
  if (library === 'material') return <MaterialIcons name={name} size={size} color={color} />;
  if (library === 'community') return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <Ionicons name={name} size={size} color={color} />;
}

// ── Animated Post Button ──────────────────────────────────────────────────────
function AnimatedPostButton({ onPress }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const ringAnim  = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Pulse: gentle scale breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Ring: expanding ripple
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.delay(300),
      ])
    ).start();

    // Icon: slow spin on mount then idle
    Animated.sequence([
      Animated.timing(rotateAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start();
  }, []);

  const ringScale   = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.55, 0.2, 0] });
  const rotate      = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Web gets CSS-based animation via inline styles
  if (Platform.OS === 'web') {
    return (
      <button
        onClick={onPress}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <style>{`
          @keyframes cityplus-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.12); }
          }
          @keyframes cityplus-ring {
            0% { transform: scale(1); opacity: 0.55; }
            70% { opacity: 0.15; }
            100% { transform: scale(1.65); opacity: 0; }
          }
          @keyframes cityplus-spin-in {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          .cp-post-wrap {
            position: relative; display: flex;
            align-items: center; justify-content: center;
            width: 54px; height: 54px; margin-top: -22px;
          }
          .cp-ring {
            position: absolute; inset: 0; border-radius: 50%;
            background: #f97316;
            animation: cityplus-ring 1.7s ease-out infinite;
          }
          .cp-btn {
            position: relative; z-index: 1;
            width: 54px; height: 54px; border-radius: 50%;
            background: #f97316;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 5px 18px rgba(249,115,22,0.55);
            animation: cityplus-pulse 1.8s ease-in-out infinite;
          }
          .cp-icon {
            animation: cityplus-spin-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
          }
        `}</style>
        <div className="cp-post-wrap">
          <div className="cp-ring" />
          <div className="cp-btn">
            <span className="cp-icon" style={{ fontSize: 28, color: '#fff', lineHeight: 1, fontWeight: 300 }}>＋</span>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', marginTop: 2 }}>Post</span>
      </button>
    );
  }

  // Native (iOS / Android)
  return (
    <TouchableOpacity onPress={onPress} style={s.postSlot} activeOpacity={0.85}>
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Ripple ring */}
        <Animated.View style={[
          s.postRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity }
        ]} />
        {/* Main button */}
        <Animated.View style={[s.postBtn, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </Animated.View>
      </View>
      <Text style={s.postLabel}>Post</Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const { t } = useLang();
  const width = useStableWidth();

  // On web, only show the bottom tab bar when the viewport is mobile-sized (< 600px)
  // On desktop web, the HomeScreen renders its own sidebar navigation
  if (Platform.OS === 'web' && width >= 600) return null;

  return (
    <View style={s.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isPost    = route.name === 'Post';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isPost) return (
          <AnimatedPostButton key={route.key} onPress={onPress} />
        );

        const routeKey = route.name.toLowerCase();
        const label = t(routeKey) || descriptors[route.key].options.tabBarLabel || route.name;

        const iconMap = {
          Home:  { name: 'home',    library: 'ion' },
          Jobs:  { name: 'briefcase', library: 'ion' },
          Rooms: { name: 'business', library: 'ion' },
          Cars:  { name: 'car-sport', library: 'ion' },
        };
        const icon = iconMap[route.name] || { name: 'ellipse', library: 'ion' };

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={s.tabItem} activeOpacity={0.8}>
            <TabIcon name={icon.name} focused={isFocused} library={icon.library} />
            <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const HEADER = {
  headerStyle:      { backgroundColor: '#ffffff' },
  headerTintColor:  '#111111',
  headerTitleStyle: { fontWeight: '800', fontSize: 16, color: '#111111' },
  headerBackTitle:  '',
  headerBackTitleVisible: false,
};

// ── Tab Navigator ─────────────────────────────────────────────────────────────
function MainTabs() {
  const { t } = useLang();
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={HEADER}
    >
      <Tab.Screen name="Home"  component={_HomeScreen}  options={{ headerShown: false, tabBarLabel: t('home') }} />
      <Tab.Screen
        name="Jobs"
        component={_BoardScreen}
        options={({ navigation }) => ({
          headerTitle: 'Jobs',
          tabBarLabel: t('jobs'),
          headerShown: Platform.OS !== 'web',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ paddingHorizontal: 12 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#111111" />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen name="Post"  component={_PostScreen}  options={{ headerShown: false, tabBarLabel: t('post') }} />
      <Tab.Screen name="Rooms" component={_RoomScreen}  options={{ headerTitle: 'Rooms', tabBarLabel: t('rooms') }} />
      <Tab.Screen name="Cars"  component={_CarScreen}   options={{ headerTitle: 'Cars', tabBarLabel: t('cars') }} />
    </Tab.Navigator>
  );
}

// ── Admin Panel Guard ─────────────────────────────────────────────────────────
// Extracted into a real component so React hooks (useLayoutEffect) are called
// at the top level of a component, not inside a render prop / inline function.
// The previous pattern violated the Rules of Hooks and threw a warning in dev
// and could silently misbehave in production.
function AdminPanelGuard(props) {
  const { user: currentUser } = useAuth();
  React.useLayoutEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      props.navigation.replace('Main');
    }
  }, [currentUser]);
  if (!currentUser || currentUser.role !== 'admin') return null;
  return <AdminScreen {...props} />;
}

// ── Assign per-screen error boundary wrappers ─────────────────────────────────
// Defined at module scope (not inside a render function) so React Navigation
// always receives the same component reference and never needlessly remounts.
_HomeScreen            = withScreenErrorBoundary(HomeScreen,            'HomeScreen');
_BoardScreen           = withScreenErrorBoundary(BoardScreen,           'BoardScreen');
_JobDetailScreen       = withScreenErrorBoundary(JobDetailScreen,       'JobDetailScreen');
_PostScreen            = withScreenErrorBoundary(PostScreen,            'PostScreen');
_PostJobScreen         = withScreenErrorBoundary(PostJobScreen,         'PostJobScreen');
_ProfileScreen         = withScreenErrorBoundary(ProfileScreen,         'ProfileScreen');
_AIScreen              = withScreenErrorBoundary(AIScreen,              'AIScreen');
_AdminScreen           = withScreenErrorBoundary(AdminScreen,           'AdminScreen');
_CarScreen             = withScreenErrorBoundary(CarScreen,             'CarScreen');
_CarDetailScreen       = withScreenErrorBoundary(CarDetailScreen,       'CarDetailScreen');
_RoomScreen            = withScreenErrorBoundary(RoomScreen,            'RoomScreen');
_RoomDetailScreen      = withScreenErrorBoundary(RoomDetailScreen,      'RoomDetailScreen');
_PostCarScreen         = withScreenErrorBoundary(PostCarScreen,         'PostCarScreen');
_PostRoomScreen        = withScreenErrorBoundary(PostRoomScreen,        'PostRoomScreen');
_BuySellScreen         = withScreenErrorBoundary(BuySellScreen,         'BuySellScreen');
_BuySellDetailScreen   = withScreenErrorBoundary(BuySellDetailScreen,   'BuySellDetailScreen');
_PostItemScreen        = withScreenErrorBoundary(PostItemScreen,        'PostItemScreen');
_LoginScreen           = withScreenErrorBoundary(LoginScreen,           'LoginScreen');
_ReferralScreen        = withScreenErrorBoundary(ReferralScreen,        'ReferralScreen');
_MyApplicationsScreen  = withScreenErrorBoundary(MyApplicationsScreen,  'MyApplicationsScreen');
_SeekerProfileScreen   = withScreenErrorBoundary(SeekerProfileScreen,   'SeekerProfileScreen');
_AnalyticsScreen       = withScreenErrorBoundary(AnalyticsScreen,       'AnalyticsScreen');
_AlertsScreen          = withScreenErrorBoundary(AlertsScreen,          'AlertsScreen');
_PromoteBusinessScreen = withScreenErrorBoundary(PromoteBusinessScreen, 'PromoteBusinessScreen');
_HelpSupportScreen     = withScreenErrorBoundary(HelpSupportScreen,     'HelpSupportScreen');
_SellItemForm          = withScreenErrorBoundary(SellItemForm,          'SellItemForm');
_AboutScreen           = withScreenErrorBoundary(AboutScreen,           'AboutScreen');
_ChatScreen            = withScreenErrorBoundary(ChatScreen,            'ChatScreen');
_ChatListScreen        = withScreenErrorBoundary(ChatListScreen,        'ChatListScreen');

// ── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading, sessionPending } = useAuth();
  const { districtLoading } = useDistrict();
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
      if (!navigationRef.isReady()) return;
      if (data?.screen === 'JobDetail' && data?.id)
        navigationRef.navigate('JobDetail', { id: data.id });
      else if (data?.screen === 'ChatScreen' && data?.id)
        navigationRef.navigate('Chat', { chatId: data.id });
      else if (data?.screen === 'RoomDetail' && data?.id)
        navigationRef.navigate('RoomDetail', { id: data.id });
      else if (data?.screen === 'CarDetail' && data?.id)
        navigationRef.navigate('CarDetail', { id: data.id });
    });
    return unsub;
  }, []);

  if (loading || showOnboarding === null || sessionPending || districtLoading) return (
    <View style={s.splash}>
      <View style={s.splashIcon}>
        <MaterialIcons name="location-city" size={36} color={ORANGE} />
      </View>
      <Text style={s.splashTitle}>
        <Text style={{ color: '#fff' }}>City</Text>
        <Text style={{ color: ORANGE }}>Plus</Text>
      </Text>
      <Text style={s.splashSub}>Jobs · Cars · Rooms · Your City</Text>
      <ActivityIndicator color={ORANGE} size="large" style={{ marginTop: 40 }} />
    </View>
  );

  if (showOnboarding && !user) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  // ── Unauthenticated stack: only Login is accessible ─────────────────────
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={_LoginScreen} />
      </Stack.Navigator>
    );
  }

  // ── Authenticated stack: all app screens ──────────────────────────────────
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user.role === 'admin'
        ? <Stack.Screen name="Admin" component={_AdminScreen} options={{ headerShown: true, headerTitle: 'Admin Panel', ...HEADER }} />
        : <Stack.Screen name="Main"  component={MainTabs} />
      }
      <Stack.Screen name="JobDetail"  component={_JobDetailScreen}  options={{ headerShown: true, headerTitle: t('jobDetails'), ...HEADER }} />
      <Stack.Screen name="CarDetail"  component={_CarDetailScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="RoomDetail" component={_RoomDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostJob"    component={_PostJobScreen}    options={{ headerShown: true, headerTitle: t('postAJobTitle'), ...HEADER }} />
      <Stack.Screen name="PostCar"    component={_PostCarScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="PostRoom"   component={_PostRoomScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="BuySell"    component={_BuySellScreen}       options={{ headerShown: true, headerTitle: t('buySell'), ...HEADER }} />
      <Stack.Screen name="BuySellDetail" component={_BuySellDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostItem"   component={_PostItemScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="PromoteBusiness" component={_PromoteBusinessScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile"    component={_ProfileScreen}    options={{ headerShown: true, headerTitle: t('myProfile'), ...HEADER }} />
      <Stack.Screen name="AIMatch"    component={_AIScreen}         options={{ headerShown: true, headerTitle: t('aiJobMatch'), ...HEADER }} />
      <Stack.Screen
        name="AdminPanel"
        component={AdminPanelGuard}
        options={{ headerShown: true, headerTitle: t('admin'), ...HEADER }}
      />
      <Stack.Screen name="Referral"        component={_ReferralScreen}        options={{ headerShown: true, headerTitle: t('referralTitle'), ...HEADER }} />
      <Stack.Screen name="MyApplications"  component={_MyApplicationsScreen}  options={{ headerShown: true, headerTitle: 'My Applications',      ...HEADER }} />
      <Stack.Screen name="SeekerProfile"   component={_SeekerProfileScreen}   options={{ headerShown: true, headerTitle: 'My Seeker Profile',     ...HEADER }} />
      <Stack.Screen name="Analytics"       component={_AnalyticsScreen}       options={{ headerShown: true, headerTitle: 'Analytics',             ...HEADER }} />
      <Stack.Screen name="Alerts"          component={_AlertsScreen}          options={{ headerShown: true, headerTitle: 'Job Alerts',            ...HEADER }} />
      <Stack.Screen name="HelpSupport"     component={_HelpSupportScreen}     options={{ headerShown: true, headerTitle: 'Help & Support',         ...HEADER }} />
      <Stack.Screen name="SellItemForm"    component={_SellItemForm}          options={{ headerShown: false }} />
      <Stack.Screen name="About"           component={_AboutScreen}           options={{ headerShown: true, headerTitle: 'About CityPlus',          ...HEADER }} />
      <Stack.Screen name="Chat"            component={_ChatScreen}            options={{ headerShown: true, ...HEADER }} />
      <Stack.Screen name="ChatList"        component={_ChatListScreen}        options={{ headerShown: true, headerTitle: 'Messages',                 ...HEADER }} />
    </Stack.Navigator>
  );
}


// ── Web deep-link / refresh routing ──────────────────────────────────────────
// Without this, refreshing any non-root URL on web resets to Home.
// Each screen name maps to a URL path so React Navigation can restore
// the exact screen from the browser's current URL on reload.
const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      Admin: 'admin',
      Main: {
        screens: {
          Home:  '',
          Jobs:  'jobs',
          Post:  'post',
          Rooms: 'rooms',
          Cars:  'cars',
        },
      },
      JobDetail:       'jobs/:id',
      CarDetail:       'cars/:id',
      RoomDetail:      'rooms/:id',
      PostJob:         'post-job',
      PostCar:         'post-car',
      PostRoom:        'post-room',
      BuySell:         'buy-sell',
      BuySellDetail:   'buy-sell/:id',
      PostItem:        'post-item',
      PromoteBusiness: 'promote',
      Profile:         'profile',
      AIMatch:         'ai-match',
      Referral:        'referral',
      MyApplications:  'my-applications',
      SeekerProfile:   'seeker-profile',
      Analytics:       'analytics',
      Alerts:          'alerts',
      // Bug fix: screens that were registered in the Stack Navigator but missing
      // from the linking config — deep links and push notification tap-targets
      // for these screens now resolve correctly instead of crashing or redirecting.
      HelpSupport:     'help-support',
      About:           'about',
      Chat:            'chat/:chatId',
      ChatList:        'chat-list',
      SellItemForm:    'sell-item',
      AdminPanel:      'admin-panel',
      // NOTE: "Board" was removed from here — BoardScreen is only registered as
      // a Tab screen inside MainTabs (name "Jobs"), NOT as a named Stack screen.
      // The correct deep-link path for the board is already covered by
      // Main > Jobs: 'jobs' above. Having a phantom "Board: 'board'" entry here
      // caused any /board deep link to fail to resolve.
    },
  },
};

export default function App() {
  const isOnline = useOnlineStatus();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <DistrictProvider>
            <LangProvider>
            <NavigationContainer linking={linking} ref={navigationRef}>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
              {!isOnline && <OfflineBanner />}
              <RootNavigator />
            </NavigationContainer>
            <Toast />
          </LangProvider>
          </DistrictProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
    height: 72, paddingBottom: Platform.OS === 'web' ? 0 : 10, paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 16,
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      width: '100%',
    } : {}),
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2 },
  tabLabel:       { fontSize: 10, fontWeight: '500', color: '#aaa' },
  tabLabelActive: { fontSize: 10, fontWeight: '700', color: ORANGE },

  postSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postRing: {
    position: 'absolute',
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: ORANGE,
    marginTop: -22,
  },
  postBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -22,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 12,
  },
  postLabel: { fontSize: 10, fontWeight: '700', color: ORANGE, marginTop: 2 },

  errBox:   { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#111', padding:32 },
  errTitle: { color:'#fff', fontSize:20, fontWeight:'800', marginBottom:12, textAlign:'center' },
  errMsg:   { color:'#aaa', fontSize:13, textAlign:'center', marginBottom:24, lineHeight:20 },
  errBtn:   { backgroundColor:ORANGE, borderRadius:10, paddingVertical:12, paddingHorizontal:28 },
  errBtnTxt:{ color:'#fff', fontWeight:'700', fontSize:14 },

  splash:     { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#111' },
  splashIcon: { width:80, height:80, backgroundColor:'#222', borderRadius:20, alignItems:'center', justifyContent:'center', marginBottom:16 },
  splashTitle:{ fontSize:28, fontWeight:'900', letterSpacing:0.5 },
  splashSub:  { color:'#888', fontSize:13, marginTop:4 },

  offlineBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    backgroundColor: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  offlineTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

  screenErrBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  screenErrTitle:  { color: '#111', fontSize: 17, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  screenErrMsg:    { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  screenErrBtn:    { backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  screenErrBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
