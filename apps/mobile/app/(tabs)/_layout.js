import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Text, Platform, View } from 'react-native';
import { getTabsForRole, ROLES, ROLE_ICONS } from '../../src/utils/permissions';
import RoleSwitcher from '../../src/components/RoleSwitcher';

export default function TabLayout() {
  const { user, activeRole } = useAuth();

  if (!user || !activeRole) {
    return <Redirect href="/login" />;
  }

  // Get the tab configuration for the active role
  const tabConfig = getTabsForRole(activeRole);
  const isConsumerRole = [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN].includes(activeRole);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff', // Premium dark card color
            borderTopColor: '#ffffff',
            height: Platform.OS === 'ios' ? 80 : 65,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            paddingTop: 10,
            elevation: 8,
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          }
        }}
      >
        {/* We map over the configured tabs for this role */}
        {tabConfig.tabs.map((tab) => {
          // The actual route name comes from the tab definition.
          // Since all roles are now mapped to the (tabs) group in permissions.js,
          // they dynamically share the tabs available in this directory.
          let routeName = tab.name;
          
          return (
            <Tabs.Screen
              key={tab.name}
              name={routeName}
              options={{
                title: tab.title,
                tabBarIcon: ({ color, focused }) => (
                  <View style={{
                    backgroundColor: focused ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    padding: 6,
                    borderRadius: 12,
                  }}>
                    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{tab.icon}</Text>
                  </View>
                ),
              }}
            />
          );
        })}
        
        {/* Hide screens that are not part of the active role's tab config */}
        {['index', 'directory', 'community', 'wallet', 'profile', 'services', 'orders', 'products', 'appointments', 'available', 'active', 'earnings', 'bookings', 'reviews', 'onboard', 'leads', 'shops', 'agents', 'revenue'].map(screen => {
          if (!tabConfig.tabs.find(t => t.name === screen)) {
            return (
              <Tabs.Screen
                key={screen}
                name={screen}
                options={{ href: null }} // Hides from tab bar
              />
            );
          }
          return null;
        })}
      </Tabs>
      
      {/* Floating Role Switcher */}
      <RoleSwitcher />
    </>
  );
}
