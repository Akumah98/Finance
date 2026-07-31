import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardSkeleton } from '@/components/shimmer/DashboardSkeleton';

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  if (token) {
    return <Redirect href="/(main)/dashboard" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
});
