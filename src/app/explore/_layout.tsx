
import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '发现',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="schedule"
        options={{
          title: '日程管理',
          headerBackTitle: '返回',
        }}
      />
    </Stack>
  );
}
