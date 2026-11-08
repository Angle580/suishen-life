
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

const tools = [
  {
    icon: '📅',
    title: '日程管理',
    desc: '安排每天的重要事项',
    color: '#E5EFE3',
    route: '/explore/schedule',
  },
  {
    icon: '💰',
    title: '记账管理',
    desc: '记录收入与日常支出',
    color: '#F9EBDD',
    route: '/explore/ledger',
  },
  {
    icon: '✅',
    title: '待办事项',
    desc: '管理每天的任务',
    color: '#E5EAF5',
    route: '/explore/todo',
  },
  {
    icon: '🤖',
    title: 'AI 助手',
    desc: '让 AI 帮你安排生活',
    color: '#EEE7F7',
    route: '/assistant',
  },
];

export default function ExploreScreen() {
  const router = useRouter();

  const handleToolPress = (tool: (typeof tools)[number]) => {
    router.push(tool.route as any);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>发现</Text>
        <Text style={styles.subtitle}>探索更多实用生活工具</Text>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>让生活更简单</Text>
        <Text style={styles.bannerText}>
          用一个 App 管理你的日常生活
        </Text>
        <Text style={styles.bannerIcon}>🌿</Text>
      </View>

      <Text style={styles.sectionTitle}>生活工具</Text>

      <View style={styles.grid}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.title}
            activeOpacity={0.8}
            style={styles.toolCard}
            onPress={() => handleToolPress(tool)}
          >
            <View style={[styles.iconBox, { backgroundColor: tool.color }]}>
              <Text style={styles.icon}>{tool.icon}</Text>
            </View>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDesc}>{tool.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>生活小贴士</Text>
        <Text style={styles.tipText}>
          每天花几分钟整理计划，可以让生活更有条理。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#253C2D',
  },
  subtitle: {
    marginTop: 8,
    color: '#899184',
    fontSize: 14,
  },
  banner: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#294A36',
  },
  bannerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerText: {
    marginTop: 10,
    fontSize: 13,
    color: '#D9E4D8',
  },
  bannerIcon: {
    position: 'absolute',
    right: 20,
    top: 24,
    fontSize: 42,
  },
  sectionTitle: {
    marginTop: 30,
    marginHorizontal: 20,
    marginBottom: 15,
    fontSize: 19,
    fontWeight: '700',
    color: '#28392C',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },
  toolCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 25,
  },
  toolTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#304C34',
  },
  toolDesc: {
    marginTop: 7,
    fontSize: 11,
    color: '#899184',
  },
  tip: {
    margin: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#E7EDE1',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#304C34',
  },
  tipText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 21,
    color: '#6F7D6D',
  },
});
