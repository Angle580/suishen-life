
import { useCallback, useState } from 'react';

import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from 'expo-router';

import {
  getTasks,
  addTask as createTask,
  toggleTaskDone,
  deleteTask as removeTask,
  Task,
} from '../store/tasks';

// 获取当前日期
function getTodayDate() {
  const now = new Date();

  const date = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const weekday = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
  }).format(now);

  return { date, weekday };
}

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [today] = useState(getTodayDate());

  // 页面每次获得焦点时，重新读取统一任务数据
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadTasks() {
        try {
          const savedTasks = await getTasks();

          if (active) {
            setTasks(savedTasks);
          }
        } catch (error) {
          console.log('读取任务失败：', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadTasks();

      return () => {
        active = false;
      };
    }, [])
  );

  const remaining = tasks.filter(task => !task.done).length;
  const completed = tasks.length - remaining;

  // 添加任务
  async function handleAddTask() {
    const title = newTask.trim();

    if (!title) {
      return;
    }

    try {
      const task = await createTask({ title });

      setTasks(current => [...current, task]);
      setNewTask('');
    } catch (error) {
      console.log('添加任务失败：', error);
    }
  }

  // 切换任务完成状态
  async function handleToggleTask(id: string, done: boolean) {
    try {
      const updated = await toggleTaskDone(id, !done);

      setTasks(current =>
        current.map(task =>
          task.id === id ? updated : task
        )
      );
    } catch (error) {
      console.log('更新任务失败：', error);
    }
  }

  // 删除任务
  async function handleDeleteTask(id: string) {
    try {
      await removeTask(id);

      setTasks(current =>
        current.filter(task => task.id !== id)
      );
    } catch (error) {
      console.log('删除任务失败：', error);
    }
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* 顶部标题 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              YOUR DAILY COMPANION
            </Text>

            <Text style={styles.brand}>
              随身生活管家
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              管
            </Text>
          </View>
        </View>

        {/* 欢迎区域 */}
        <View style={styles.welcome}>
          <Text style={styles.dateText}>
            {today.date} · {today.weekday}
          </Text>

          <Text style={styles.greeting}>
            你好，欢迎回来 👋
          </Text>

          <Text style={styles.welcomeText}>
            一点一点，把生活安排得更好。
          </Text>

          <View style={styles.stats}>
            <View>
              <Text style={styles.statNumber}>
                {remaining}
              </Text>

              <Text style={styles.statLabel}>
                待完成事项
              </Text>
            </View>

            <View style={styles.divider} />

            <View>
              <Text style={styles.statNumber}>
                {completed}
              </Text>

              <Text style={styles.statLabel}>
                已完成事项
              </Text>
            </View>

            <View style={styles.divider} />

            <View>
              <Text style={styles.statNumber}>
                {tasks.length === 0
                  ? 0
                  : Math.round(completed / tasks.length * 100)}
                %
              </Text>

              <Text style={styles.statLabel}>
                完成进度
              </Text>
            </View>
          </View>
        </View>

        {/* 今日待办 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            今日待办
          </Text>

          <Text style={styles.hint}>
            {loading ? '正在加载...' : '完成一件，轻松一点'}
          </Text>
        </View>

        <View style={styles.card}>
          {loading ? (
            <Text style={styles.empty}>
              正在读取任务...
            </Text>
          ) : tasks.length === 0 ? (
            <Text style={styles.empty}>
              还没有任务，添加一件试试吧。
            </Text>
          ) : (
            tasks.map(task => (
              <View
                key={task.id}
                style={styles.taskRow}
              >
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    task.done && styles.checkboxDone,
                  ]}
                  onPress={() =>
                    handleToggleTask(task.id, task.done)
                  }
                >
                  <Text style={styles.checkmark}>
                    {task.done ? '✓' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.taskTextArea}
                  onPress={() =>
                    handleToggleTask(task.id, task.done)
                  }
                >
                  <Text
                    style={[
                      styles.taskText,
                      task.done && styles.completed,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteTask(task.id)}
                >
                  <Text style={styles.delete}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* 添加任务 */}
        <Text style={styles.sectionTitle}>
          添加新任务
        </Text>

        <View style={styles.addRow}>
          <TextInput
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={handleAddTask}
            placeholder="例如：明天预约体检"
            placeholderTextColor="#9A9F9A"
            style={styles.input}
            returnKeyType="done"
            maxLength={100}
          />

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddTask}
          >
            <Text style={styles.addButtonText}>
              添加
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI 管家 */}
        <View style={styles.aiCard}>
          <Text style={styles.aiIcon}>
            ✦
          </Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>
              AI 生活管家
            </Text>

            <Text style={styles.aiText}>
              下一步，接入中国大陆可用的 AI 服务。
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          让每一天，都井井有条。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#73816E',
    marginBottom: 5,
  },

  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: '#253C2D',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCE8D7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#34553B',
  },

  welcome: {
    backgroundColor: '#294A36',
    padding: 22,
    borderRadius: 22,
    marginBottom: 28,
  },

  dateText: {
    color: '#C5D8C4',
    fontSize: 13,
    marginBottom: 13,
    fontWeight: '600',
  },

  greeting: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },

  welcomeText: {
    color: '#D9E4D8',
    fontSize: 13,
    marginTop: 9,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 18,
  },

  statNumber: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  statLabel: {
    fontSize: 11,
    color: '#D9E4D8',
    marginTop: 4,
  },

  divider: {
    height: 40,
    width: 1,
    backgroundColor: '#718774',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28392C',
    marginBottom: 12,
  },

  hint: {
    fontSize: 11,
    color: '#8A9388',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1ED',
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#B9C5B5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxDone: {
    backgroundColor: '#4C7553',
    borderColor: '#4C7553',
  },

  checkmark: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  taskTextArea: {
    flex: 1,
    paddingHorizontal: 12,
  },

  taskText: {
    fontSize: 14,
    color: '#39443A',
  },

  completed: {
    textDecorationLine: 'line-through',
    color: '#A0A79E',
  },

  delete: {
    color: '#A5AAA2',
    fontSize: 25,
    paddingHorizontal: 5,
  },

  empty: {
    color: '#8A9388',
    paddingVertical: 20,
    fontSize: 14,
  },

  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    marginBottom: 24,
  },

  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#28392C',
  },

  addButton: {
    backgroundColor: '#355B40',
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7EDE1',
    padding: 17,
    borderRadius: 18,
    marginBottom: 20,
    gap: 13,
  },

  aiIcon: {
    fontSize: 25,
    color: '#47684B',
  },

  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#304C34',
  },

  aiText: {
    fontSize: 12,
    color: '#6F7D6D',
    marginTop: 5,
    lineHeight: 18,
  },

  footer: {
    textAlign: 'center',
    color: '#899184',
    fontSize: 12,
    marginTop: 12,
  },
});
