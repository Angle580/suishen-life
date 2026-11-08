
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  requestNotificationPermission,
  scheduleReminder,
  cancelReminder,
} from '../../utils/notifications';

type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  reminderMinutes?: number;
  notificationId?: string;
};

const STORAGE_KEY = '@suishen_life_schedules';

const REMINDER_OPTIONS = [
  { label: '不提醒', value: 0 },
  { label: '提前 5 分钟', value: 5 },
  { label: '提前 15 分钟', value: 15 },
  { label: '提前 30 分钟', value: 30 },
];

const pad = (value: number) => String(value).padStart(2, '0');

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTime = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parseScheduleDate = (item: ScheduleItem) => {
  const [year, month, day] = item.date.split('-').map(Number);
  const [hour, minute] = (item.time ?? '00:00').split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute);
};

const sortSchedules = (items: ScheduleItem[]) =>
  [...items].sort(
    (a, b) =>
      parseScheduleDate(a).getTime() -
      parseScheduleDate(b).getTime()
  );

export default function ScheduleScreen() {
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState(0);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(schedules)
      ).catch(() => {
        Alert.alert('提示', '日程保存失败，请检查设备存储空间。');
      });
    }
  }, [schedules, loaded]);

  const loadSchedules = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: ScheduleItem[] = JSON.parse(saved);
        setSchedules(parsed);
      }
    } catch {
      Alert.alert('提示', '读取日程失败。');
    } finally {
      setLoaded(true);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    date?: Date
  ) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (date) setSelectedDate(date);

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    date?: Date
  ) => {
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    if (date) setSelectedTime(date);

    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setEditingId(null);
    setReminderMinutes(0);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const saveSchedule = async () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert('提示', '请输入日程名称。');
      return;
    }

    const permissionGranted =
      reminderMinutes === 0 ||
      await requestNotificationPermission();

    if (!permissionGranted) {
      Alert.alert(
        '需要通知权限',
        '请允许随身生活管家发送通知，才能使用日程提醒。'
      );
      return;
    }

    const id = editingId ?? `${Date.now()}-${Math.random()}`;

    const oldSchedule = schedules.find(item => item.id === id);

    // 先取消旧通知
    if (oldSchedule?.notificationId) {
      try {
        await cancelReminder(oldSchedule.notificationId);
      } catch {
        Alert.alert('提示', '旧提醒取消失败，请检查通知设置。');
        return;
      }
    }

    let notificationId: string | undefined;

    // 创建新通知
    if (reminderMinutes > 0) {
      try {
        notificationId =
          (await scheduleReminder(
            cleanTitle,
            formatDate(selectedDate),
            formatTime(selectedTime),
            reminderMinutes
          )) ?? undefined;
      } catch {
        Alert.alert('提示', '创建提醒失败，请检查通知权限。');
        return;
      }

      if (!notificationId) {
        Alert.alert(
          '提醒时间无效',
          '所选提醒时间已经过去，请重新选择日期、时间或提醒方式。'
        );
        return;
      }
    }

    const newSchedule: ScheduleItem = {
      id,
      title: cleanTitle,
      date: formatDate(selectedDate),
      time: formatTime(selectedTime),
      reminderMinutes,
      notificationId,
    };

    if (editingId) {
      setSchedules(current =>
        sortSchedules(
          current.map(item => item.id === editingId ? newSchedule : item)
        )
      );
    } else {
      setSchedules(current =>
        sortSchedules([...current, newSchedule])
      );
    }

    resetForm();

    Alert.alert(
      '成功',
      editingId ? '日程已修改。' : '日程已添加。'
    );
  };

  const editSchedule = (item: ScheduleItem) => {
    setEditingId(item.id);
    setTitle(item.title);

    const date = parseScheduleDate(item);
    setSelectedDate(date);
    setSelectedTime(date);

    setReminderMinutes(item.reminderMinutes ?? 0);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const deleteSchedule = (id: string) => {
    Alert.alert('删除日程', '确定删除这条日程吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const item = schedules.find(schedule => schedule.id === id);

          if (item?.notificationId) {
            try {
              await cancelReminder(item.notificationId);
            } catch {
              Alert.alert('提示', '通知取消失败，请检查通知设置。');
              return;
            }
          }

          setSchedules(current =>
            current.filter(schedule => schedule.id !== id)
          );

          if (editingId === id) {
            resetForm();
          }
        },
      },
    ]);
  };

  const getReminderLabel = (minutes?: number) =>
    REMINDER_OPTIONS.find(option => option.value === (minutes ?? 0))
      ?.label ?? '不提醒';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>日程管理</Text>
      <Text style={styles.subtitle}>
        安排好每一天，让生活更有条理
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>日程名称</Text>

        <TextInput
          style={styles.input}
          placeholder="例如：完成毕业设计"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>选择日期</Text>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.pickerIcon}>📅</Text>
          <Text style={styles.pickerText}>
            {formatDate(selectedDate)}
          </Text>
          <Text style={styles.pickerHint}>选择日期</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneButtonText}>完成选择</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>选择时间</Text>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.pickerIcon}>🕒</Text>
          <Text style={styles.pickerText}>
            {formatTime(selectedTime)}
          </Text>
          <Text style={styles.pickerHint}>选择时间</Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              minuteInterval={1}
            />

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.doneButtonText}>完成选择</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>提醒时间</Text>

        <View style={styles.reminderOptions}>
          {REMINDER_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.reminderOption,
                reminderMinutes === option.value &&
                  styles.reminderOptionActive,
              ]}
              onPress={() => setReminderMinutes(option.value)}
            >
              <Text
                style={[
                  styles.reminderOptionText,
                  reminderMinutes === option.value &&
                    styles.reminderOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={saveSchedule}
        >
          <Text style={styles.addButtonText}>
            {editingId ? '保存修改' : '＋ 添加日程'}
          </Text>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetForm}
          >
            <Text style={styles.cancelButtonText}>取消编辑</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>
        我的日程（{schedules.length}）
      </Text>

      <FlatList
        data={schedules}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            暂时没有日程，添加一条试试吧。
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>
                {item.title}
              </Text>

              <Text style={styles.scheduleDate}>
                📅 {item.date}
              </Text>

              <Text style={styles.scheduleTime}>
                🕒 {item.time ?? '全天'}
              </Text>

              <Text style={styles.scheduleReminder}>
                🔔 {getReminderLabel(item.reminderMinutes)}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => editSchedule(item)}
              >
                <Text style={styles.editText}>编辑</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => deleteSchedule(item.id)}
              >
                <Text style={styles.deleteText}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
    paddingTop: 65,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#253C2D',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: '#899184',
    fontSize: 14,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#304C34',
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E3E8DF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    color: '#253C2D',
    backgroundColor: '#FAFBF8',
  },
  pickerButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8DF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#FAFBF8',
  },
  pickerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: '#253C2D',
    fontWeight: '600',
  },
  pickerHint: {
    color: '#899184',
    fontSize: 12,
  },
  pickerContainer: {
    marginBottom: 16,
    backgroundColor: '#F6F7F2',
    borderRadius: 12,
    padding: 8,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    color: '#294A36',
    fontWeight: '700',
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  reminderOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3E8DF',
    backgroundColor: '#FAFBF8',
  },
  reminderOptionActive: {
    backgroundColor: '#294A36',
    borderColor: '#294A36',
  },
  reminderOptionText: {
    fontSize: 12,
    color: '#526253',
  },
  reminderOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#294A36',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 10,
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#899184',
    fontSize: 14,
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#28392C',
  },
  list: {
    paddingBottom: 30,
  },
  empty: {
    textAlign: 'center',
    color: '#899184',
    paddingVertical: 30,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  scheduleInfo: {
    flex: 1,
    marginRight: 12,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#304C34',
  },
  scheduleDate: {
    marginTop: 7,
    fontSize: 13,
    color: '#899184',
  },
  scheduleTime: {
    marginTop: 5,
    fontSize: 13,
    color: '#899184',
  },
  scheduleReminder: {
    marginTop: 5,
    fontSize: 13,
    color: '#526253',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editText: {
    color: '#294A36',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteText: {
    color: '#D65B50',
    fontSize: 13,
    fontWeight: '600',
  },
});
