import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';

import OnboardingScreen, { isOnboarded } from './src/screens/OnboardingScreen';
import LoginScreen         from './src/screens/LoginScreen';
import HomeScreen          from './src/screens/HomeScreen';
import JobDetailScreen     from './src/screens/JobDetailScreen';
import PostScreen          from './src/screens/PostScreen';
import PostJobScreen       from './src/screens/PostJobScreen';
import PostRoomScreen      from './src/screens/PostRoomScreen';
import PostCarScreen       from './src/screens/PostCarScreen';
import ProfileScreen       from './src/screens/ProfileScreen';
import AdminScreen         from './src/screens/AdminScreen';
import AIScreen            from './src/screens/AIScreen';
import RoomScreen          from './src/screens/RoomScreen';
import RoomDetailScreen    from './src/screens/RoomDetailScreen';
import CarScreen           from './src/screens/CarScreen';
import CarDetailScreen     from './src/screens/CarDetailScreen';
import BuySellScreen       from './src/screens/BuySellScreen';
import BuySellDetailScreen from './src/screens/BuySellDetailScreen';
import ReferralScreen      from './src/screens/ReferralScreen';
import BoardScreen         from './src/screens/BoardScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user } = useAuth();
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    isOnboarded().then(setOnboarded);
  }, []);

  // Still loading onboarding status — render nothing (Expo splash stays up)
  if (onboarded === null) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboarded ? (
        <Stack.Screen name="Onboarding">
          {props => <OnboardingScreen {...props} onDone={() => setOnboarded(true)} />}
        </Stack.Screen>
      ) : !user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main"          component={HomeScreen} />
          <Stack.Screen name="Jobs"          component={HomeScreen} />
          <Stack.Screen name="JobDetail"     component={JobDetailScreen} />
          <Stack.Screen name="Post"          component={PostScreen} />
          <Stack.Screen name="PostJob"       component={PostJobScreen} />
          <Stack.Screen name="PostRoom"      component={PostRoomScreen} />
          <Stack.Screen name="PostCar"       component={PostCarScreen} />
          <Stack.Screen name="Profile"       component={ProfileScreen} />
          <Stack.Screen name="Admin"         component={AdminScreen} />
          <Stack.Screen name="AIMatch"       component={AIScreen} />
          <Stack.Screen name="Rooms"         component={RoomScreen} />
          <Stack.Screen name="RoomDetail"    component={RoomDetailScreen} />
          <Stack.Screen name="Cars"          component={CarScreen} />
          <Stack.Screen name="CarDetail"     component={CarDetailScreen} />
          <Stack.Screen name="BuySell"       component={BuySellScreen} />
          <Stack.Screen name="BuySellDetail" component={BuySellDetailScreen} />
          <Stack.Screen name="Referral"      component={ReferralScreen} />
          <Stack.Screen name="Board"         component={BoardScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <Toast />
    </AuthProvider>
  );
}
