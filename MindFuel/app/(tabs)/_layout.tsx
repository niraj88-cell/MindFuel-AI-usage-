import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { useAuth } from '../../lib/hooks/useAuth';
import { useSubscriptionInit } from '../../lib/hooks/useSubscription';
import { Theme } from '../../theme';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Timer,
  MessageCircle, 
  UserCircle,
} from 'lucide-react-native';

function TabIcon({ Icon, focused, color, size = 22 }: { Icon: any; focused: boolean; color: string; size?: number }) {
  return (
    <View className="items-center justify-center pt-1">
      <Icon size={size} color={color} strokeWidth={focused ? 3 : 2} />
      {focused && (
        <View 
          className="absolute -bottom-3 w-1 h-1 rounded-full bg-white" 
          style={{ 
            shadowColor: '#ffffff', 
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6, 
            shadowOpacity: 0.8, 
            elevation: 10 
          }} 
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  useSubscriptionInit();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#52525b',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderTopWidth: 0,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 32 : 20,
          left: 20,
          right: 20,
          height: 64,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 20,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={LayoutDashboard} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={PlusCircle} focused={focused} color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Timer} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MessageCircle} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={UserCircle} focused={focused} color={color} />
          ),
        }}
      />
      {/* Hidden tabs — accessible via navigation but not shown in tab bar */}
      <Tabs.Screen name="intercept" options={{ href: null }} />
      <Tabs.Screen name="pulse" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="challenges" options={{ href: null }} />
    </Tabs>
  );
}
