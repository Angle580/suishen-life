
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 设置通知显示方式
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SCHEDULE_CHANNEL = 'schedule-reminders';
const TODO_CHANNEL = 'todo-reminders';

// 请求通知权限
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      SCHEDULE_CHANNEL,
      {
        name: '日程提醒',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      }
    );

    await Notifications.setNotificationChannelAsync(
      TODO_CHANNEL,
      {
        name: '待办事项提醒',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      }
    );
  }

  return true;
}

// 安排一个指定时间的本地通知
async function scheduleDateNotification(
  title: string,
  body: string,
  date: Date,
  channelId: string
): Promise<string | null> {
  if (date.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

// 创建日程提醒，保留原有功能
export async function scheduleReminder(
  title: string,
  date: string,
  time: string,
  minutesBefore: number
): Promise<string | null> {
  if (minutesBefore <= 0) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const scheduleDate = new Date(
    year,
    month - 1,
    day,
    hour,
    minute
  );

  const reminderDate = new Date(
    scheduleDate.getTime() - minutesBefore * 60 * 1000
  );

  return scheduleDateNotification(
    '日程提醒',
    `${title} 将在 ${minutesBefore} 分钟后开始`,
    reminderDate,
    SCHEDULE_CHANNEL
  );
}

// 待办事项通知设置
export type TaskNotificationOptions = {
  title: string;
  dueAt: Date;
  reminderBeforeMinutes?: number;
  remindAtDue?: boolean;
  remindWhenOverdue?: boolean;
};

// 创建待办事项的全部通知
// 返回所有通知 ID，方便完成或删除任务时统一取消
export async function scheduleTaskNotifications(
  options: TaskNotificationOptions
): Promise<string[]> {
  const {
    title,
    dueAt,
    reminderBeforeMinutes = 0,
    remindAtDue = true,
    remindWhenOverdue = true,
  } = options;

  const notificationIds: string[] = [];

  try {
    // 1. 截止前自定义提醒
    if (reminderBeforeMinutes > 0) {
      const reminderDate = new Date(
        dueAt.getTime() -
        reminderBeforeMinutes * 60 * 1000
      );

      const id = await scheduleDateNotification(
        '待办事项即将截止',
        `${title} 即将到达截止时间`,
        reminderDate,
        TODO_CHANNEL
      );

      if (id) notificationIds.push(id);
    }

    // 2. 截止时间提醒
    if (remindAtDue) {
      const id = await scheduleDateNotification(
        '待办事项已到期',
        `${title} 已到达截止时间，请及时处理`,
        dueAt,
        TODO_CHANNEL
      );

      if (id) notificationIds.push(id);
    }

    // 3. 逾期提醒：截止后每天一次，最多安排 7 次
    if (remindWhenOverdue) {
      const oneDay = 24 * 60 * 60 * 1000;

      for (let day = 1; day <= 7; day++) {
        const overdueDate = new Date(
          dueAt.getTime() + day * oneDay
        );

        const id = await scheduleDateNotification(
          '待办事项逾期提醒',
          `${title} 已逾期，请尽快处理`,
          overdueDate,
          TODO_CHANNEL
        );

        if (id) notificationIds.push(id);
      }
    }

    return notificationIds;
  } catch (error) {
    // 创建失败时，清理本次已经创建的通知
    await cancelTaskNotifications(notificationIds);
    throw error;
  }
}

// 取消待办事项的全部通知
export async function cancelTaskNotifications(
  notificationIds: string[]
): Promise<void> {
  await Promise.all(
    notificationIds.map(id =>
      Notifications.cancelScheduledNotificationAsync(id)
    )
  );
}

// 取消单条通知，保留原有日程功能
export async function cancelReminder(
  notificationId?: string
): Promise<void> {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(
    notificationId
  );
}
