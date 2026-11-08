
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermission,
  scheduleTaskNotifications,
  cancelTaskNotifications,
} from '../utils/notifications';

export type TaskCategory = '工作' | '学习' | '生活' | '其他';
export type TaskPriority = '高' | '中' | '低';

export type Task = {
  id: string;
  title: string;
  done: boolean;
  category: TaskCategory;
  priority: TaskPriority;
  dueAt: string | null;
  reminderBeforeMinutes: number;
  remindAtDue: boolean;
  remindWhenOverdue: boolean;
  notificationIds: string[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = '@suishen_life_tasks';

type LegacyTask = {
  id: string | number;
  title: string;
  done: boolean;
};

const DEFAULT_TASKS: LegacyTask[] = [
  { id: 1, title: '整理今天的计划', done: false },
  { id: 2, title: '给家人打个电话', done: false },
  { id: 3, title: '晚上散步 20 分钟', done: true },
];

function createTaskFromLegacy(item: LegacyTask): Task {
  const now = new Date().toISOString();

  return {
    id: String(item.id),
    title: item.title,
    done: item.done,
    category: '生活',
    priority: '中',
    dueAt: null,
    reminderBeforeMinutes: 0,
    remindAtDue: true,
    remindWhenOverdue: true,
    notificationIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeTask(item: any): Task {
  const now = new Date().toISOString();

  return {
    id: String(item.id ?? Date.now()),
    title: String(item.title ?? ''),
    done: Boolean(item.done),
    category: ['工作', '学习', '生活', '其他'].includes(item.category)
      ? item.category
      : '生活',
    priority: ['高', '中', '低'].includes(item.priority)
      ? item.priority
      : '中',
    dueAt: typeof item.dueAt === 'string' ? item.dueAt : null,
    reminderBeforeMinutes: Math.max(
      0,
      Number(item.reminderBeforeMinutes) || 0
    ),
    remindAtDue: item.remindAtDue !== false,
    remindWhenOverdue: item.remindWhenOverdue !== false,
    notificationIds: Array.isArray(item.notificationIds)
      ? item.notificationIds.filter(
          (id: unknown): id is string => typeof id === 'string'
        )
      : item.notificationId
        ? [String(item.notificationId)]
        : [],
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function getTasks(): Promise<Task[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const initialTasks = DEFAULT_TASKS.map(createTaskFromLegacy);
      await saveTasks(initialTasks);
      return initialTasks;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error('任务数据格式错误');
    }

    const tasks = parsed
      .map(normalizeTask)
      .filter(task => task.title.trim().length > 0);

    // 自动补齐旧版本任务字段，并保留原来的标题和完成状态
    await saveTasks(tasks);

    return tasks;
  } catch (error) {
    console.error('读取待办事项失败：', error);
    throw error;
  }
}

export async function addTask(
  input: Pick<Task, 'title'> &
    Partial<Omit<Task, 'id' | 'title' | 'createdAt' | 'updatedAt'>>
): Promise<Task> {
  const title = input.title.trim();

  if (!title) {
    throw new Error('任务名称不能为空');
  }

  const now = new Date().toISOString();

  const task: Task = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    done: false,
    category: input.category ?? '生活',
    priority: input.priority ?? '中',
    dueAt: input.dueAt ?? null,
    reminderBeforeMinutes: input.reminderBeforeMinutes ?? 0,
    remindAtDue: input.remindAtDue ?? true,
    remindWhenOverdue: input.remindWhenOverdue ?? true,
    notificationIds: [],
    createdAt: now,
    updatedAt: now,
  };

  if (task.dueAt) {
    task.notificationIds = await createTaskReminders(task);
  }

  try {
    const tasks = await getTasks();
    await saveTasks([...tasks, task]);
    return task;
  } catch (error) {
    await cancelTaskNotifications(task.notificationIds);
    throw error;
  }
}

async function createTaskReminders(task: Task): Promise<string[]> {
  if (!task.dueAt || task.done) {
    return [];
  }

  const dueDate = new Date(task.dueAt);

  if (Number.isNaN(dueDate.getTime())) {
    throw new Error('任务截止时间无效');
  }

  const hasFutureReminder =
    (task.reminderBeforeMinutes > 0 &&
      dueDate.getTime() - task.reminderBeforeMinutes * 60000 > Date.now()) ||
    dueDate.getTime() > Date.now() ||
    (task.remindWhenOverdue &&
      dueDate.getTime() + 24 * 60 * 60 * 1000 > Date.now());

  if (!hasFutureReminder) {
    return [];
  }

  const granted = await requestNotificationPermission();

  if (!granted) {
    throw new Error('请先允许 App 发送通知');
  }

  return scheduleTaskNotifications({
    title: task.title,
    dueAt: dueDate,
    reminderBeforeMinutes: task.reminderBeforeMinutes,
    remindAtDue: task.remindAtDue,
    remindWhenOverdue: task.remindWhenOverdue,
  });
}

export async function updateTask(
  id: string,
  changes: Partial<Omit<Task, 'id' | 'createdAt' | 'notificationIds'>>
): Promise<Task> {
  const tasks = await getTasks();
  const oldTask = tasks.find(item => item.id === id);

  if (!oldTask) {
    throw new Error('找不到该任务');
  }

  const updated: Task = {
    ...oldTask,
    ...changes,
    title: changes.title?.trim() ?? oldTask.title,
    updatedAt: new Date().toISOString(),
    notificationIds: [],
  };

  const reminderSettingsChanged =
    changes.title !== undefined ||
    changes.dueAt !== undefined ||
    changes.reminderBeforeMinutes !== undefined ||
    changes.remindAtDue !== undefined ||
    changes.remindWhenOverdue !== undefined;

  if (!updated.done && reminderSettingsChanged) {
    updated.notificationIds = await createTaskReminders(updated);
  } else if (!updated.done && !reminderSettingsChanged) {
    updated.notificationIds = oldTask.notificationIds;
  }

  try {
    await saveTasks(
      tasks.map(item => item.id === id ? updated : item)
    );
  } catch (error) {
    await cancelTaskNotifications(updated.notificationIds);
    throw error;
  }

  if (oldTask.notificationIds.length > 0) {
    await cancelTaskNotifications(oldTask.notificationIds);
  }

  return updated;
}

export async function toggleTaskDone(
  id: string,
  done: boolean
): Promise<Task> {
  return updateTask(id, { done });
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  await saveTasks(tasks.filter(item => item.id !== id));

  if (task.notificationIds.length > 0) {
    await cancelTaskNotifications(task.notificationIds);
  }
}
