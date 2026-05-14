import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import {
  View, Text, ActivityIndicator, StatusBar,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LangProvider, useLang } from './src/utils/i18n';
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
import OnboardingScreen, { isOnboarded } from './src/screens/OnboardingScreen';
import ReferralScreen from './src/screens/ReferralScreen';
import { registerForPushNotifications, addNotificationResponseListener } from './src/utils/notifications';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const ORANGE = '#f97316';

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, i) { console.error('ErrorBoundary:', e, i); }
  render() {
    if (this.state.hasError) return (
      <View style={s.errBox}>
        <MaterialIcons name="warning" size={48} color={ORANGE} style={{ marginBottom: 16 }} />
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

// ── Custom Tab Bar ────────────────────────────────────────────────────────────
function TabIcon({ name, focused, library = 'ion' }) {
  const color = focused ? ORANGE : '#aaa';
  const size = 22;
  if (library === 'material') return <MaterialIcons name={name} size={size} color={color} />;
  if (library === 'community') return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <Ionicons name={name} size={size} color={color} />;
}

function CustomTabBar({ state, descriptors, navigation }) {
  const { t } = useLang();
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
          <TouchableOpacity key={route.key} onPress={onPress} style={s.postSlot} activeOpacity={0.85}>
            <View style={s.postBtn}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
            <Text style={s.postLabel}>Post</Text>
          </TouchableOpacity>
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
  headerStyle:      { backgroundColor: '#111111' },
  headerTintColor:  '#ffffff',
  headerTitleStyle: { fontWeight: '800', fontSize: 16 },
};

// ── Tab Navigator ─────────────────────────────────────────────────────────────
function MainTabs() {
  const { t } = useLang();
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={HEADER}>
      <Tab.Screen name="Home"  component={HomeScreen}  options={{ headerShown: false, tabBarLabel: t('home') }} />
      <Tab.Screen name="Jobs"  component={BoardScreen} options={{ headerTitle: t('findJobs'), tabBarLabel: t('jobs') }} />
      <Tab.Screen name="Post"  component={PostScreen}  options={{ headerShown: false, tabBarLabel: t('post') }} />
      <Tab.Screen name="Rooms" component={RoomScreen}  options={{ headerTitle: t('roomsPG'), tabBarLabel: t('rooms') }} />
      <Tab.Screen name="Cars"  component={CarScreen}   options={{ headerTitle: t('carRental'), tabBarLabel: t('cars') }} />
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
      <View style={s.splashIcon}>
        <MaterialIcons name="location-city" size={36} color={ORANGE} />
      </View>
      <Text style={s.splashTitle}>
        <Text style={{ color: '#fff' }}>Nanded</Text>
        <Text style={{ color: ORANGE }}>Rozgar</Text>
      </Text>
      <Text style={s.splashSub}>Jobs · Cars · Rooms · Nanded</Text>
      <ActivityIndicator color={ORANGE} size="large" style={{ marginTop: 40 }} />
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
      <Stack.Screen name="JobDetail"  component={JobDetailScreen}  options={{ headerShown: true, headerTitle: t('carDetails'), ...HEADER }} />
      <Stack.Screen name="CarDetail"  component={CarDetailScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostJob"    component={PostJobScreen}    options={{ headerShown: true, headerTitle: t('postAJobTitle'), ...HEADER }} />
      <Stack.Screen name="PostCar"    component={PostCarScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="PostRoom"   component={PostRoomScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="BuySell"    component={BuySellScreen}       options={{ headerShown: true, headerTitle: t('buySell'), ...HEADER }} />
      <Stack.Screen name="BuySellDetail" component={BuySellDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile"    component={ProfileScreen}    options={{ headerShown: true, headerTitle: t('myProfile'), ...HEADER }} />
      <Stack.Screen name="AIMatch"    component={AIScreen}         options={{ headerShown: true, headerTitle: t('aiJobMatch'), ...HEADER }} />
      <Stack.Screen name="AdminPanel"  component={AdminScreen}      options={{ headerShown: true, headerTitle: t('admin'), ...HEADER }} />
      <Stack.Screen name="Referral"   component={ReferralScreen}   options={{ headerShown: true, headerTitle: t('referralTitle'), ...HEADER }} />
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
              <StatusBar barStyle="light-content" backgroundColor="#111111" />
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
  tabBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#ebebeb',
    height: 70, paddingBottom: 10, paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2 },
  tabLabel:       { fontSize: 10, fontWeight: '500', color: '#aaa' },
  tabLabelActive: { fontSize: 10, fontWeight: '700', color: ORANGE },

  postSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
});
