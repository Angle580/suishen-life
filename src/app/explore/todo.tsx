import React, { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  getTasks,
  addTask,
  updateTask,
  toggleTaskDone,
  deleteTask,
  Task,
  TaskCategory,
  TaskPriority,
} from '../../store/tasks';

type FilterType = '全部' | '待完成' | '已完成';
type PickerMode = 'date' | 'time' | null;

const categories: TaskCategory[] = ['工作', '学习', '生活', '其他'];
const priorities: TaskPriority[] = ['高', '中', '低'];

function formatDate(dateString: string | null) {
  if (!dateString) return '未设置截止时间';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return '时间无效';

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function isOverdue(task: Task) {
  return Boolean(
    task.dueAt &&
    !task.done &&
    new Date(task.dueAt).getTime() < Date.now()
  );
}

export default function TodoScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FilterType>('全部');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('生活');
  const [priority, setPriority] = useState<TaskPriority>('中');

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const [reminderDays, setReminderDays] = useState('0');
  const [reminderHours, setReminderHours] = useState('0');
  const [reminderMinutes, setReminderMinutes] = useState('30');

  const [remindAtDue, setRemindAtDue] = useState(true);
  const [remindWhenOverdue, setRemindWhenOverdue] = useState(true);

  // 每次页面显示时重新读取任务
  const loadTasks = useCallback(async () => {
    try {
      const result = await getTasks();
      setTasks(result);
    } catch (error) {
      console.log('读取任务失败：', error);
      Alert.alert('读取失败', '暂时无法读取任务，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const remaining = tasks.filter(task => !task.done).length;
  const completed = tasks.filter(task => task.done).length;

  const filteredTasks = tasks.filter(task => {
    if (filter === '待完成') return !task.done;
    if (filter === '已完成') return task.done;
    return true;
  });

  function resetForm() {
    setTitle('');
    setCategory('生活');
    setPriority('中');
    setDueDate(null);
    setReminderDays('0');
    setReminderHours('0');
    setReminderMinutes('30');
    setRemindAtDue(true);
    setRemindWhenOverdue(true);
    setEditingId(null);
    setPickerMode(null);
    setShowForm(false);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(task: Task) {
    setEditingId(task.id);
    setTitle(task.title);
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.dueAt ? new Date(task.dueAt) : null);

    const total = task.reminderBeforeMinutes || 0;

    setReminderDays(String(Math.floor(total / 1440)));
    setReminderHours(String(Math.floor((total % 1440) / 60)));
    setReminderMinutes(String(total % 60));

    setRemindAtDue(task.remindAtDue);
    setRemindWhenOverdue(task.remindWhenOverdue);
    setShowForm(true);
  }

  function openPicker(mode: 'date' | 'time') {
    Keyboard.dismiss();

    if (!dueDate) {
      const initial = new Date();
      initial.setHours(initial.getHours() + 1);
      setDueDate(initial);
    }

    setPickerMode(mode);
  }

  function handlePickerChange(event: any, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setPickerMode(null);
      return;
    }

    if (selectedDate) {
      setDueDate(selectedDate);

      if (Platform.OS === 'android') {
        setPickerMode(null);
      }
    }
  }

  async function handleSaveTask() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert('提示', '请输入任务名称。');
      return;
    }

    const days = Number(reminderDays || 0);
    const hours = Number(reminderHours || 0);
    const minutes = Number(reminderMinutes || 0);

    if (
      !Number.isInteger(days) ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      days < 0 ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      Alert.alert(
        '提醒时间无效',
        '天数必须是非负整数，小时范围为0至23，分钟范围为0至59。'
      );
      return;
    }

    const reminderBeforeMinutes =
      days * 1440 + hours * 60 + minutes;

    if (
      dueDate &&
      !Number.isNaN(dueDate.getTime()) &&
      reminderBeforeMinutes > 0 &&
      dueDate.getTime() - reminderBeforeMinutes * 60000 <= Date.now()
    ) {
      Alert.alert(
        '提醒时间过早',
        '提前提醒时间已经过去，请缩短提前时间或调整截止时间。'
      );
      return;
    }

    try {
      const taskData = {
        title: cleanTitle,
        category,
        priority,
        dueAt: dueDate ? dueDate.toISOString() : null,
        reminderBeforeMinutes,
        remindAtDue,
        remindWhenOverdue,
      };

      if (editingId) {
        await updateTask(editingId, taskData);
      } else {
        await addTask(taskData);
      }

      resetForm();
      await loadTasks();

      Alert.alert('保存成功', editingId ? '任务已更新。' : '新任务已添加。');
    } catch (error) {
      console.log('保存任务失败：', error);

      Alert.alert(
        '保存失败',
        error instanceof Error
          ? error.message
          : '请检查通知权限或稍后重试。'
      );
    }
  }

  async function handleToggle(task: Task) {
    try {
      await toggleTaskDone(task.id, !task.done);
      await loadTasks();
    } catch (error) {
      console.log('更新任务失败：', error);
      Alert.alert('操作失败', '任务状态更新失败，请重试。');
    }
  }

  function confirmDelete(task: Task) {
    Alert.alert(
      '删除任务',
      `确定删除「${task.title}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              await loadTasks();
            } catch (error) {
              console.log('删除任务失败：', error);
              Alert.alert('删除失败', '请稍后重试。');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>待办事项</Text>
          <Text style={styles.subtitle}>
            把每一件重要的事安排好
          </Text>
        </View>

        {/* 统计区域 */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{tasks.length}</Text>
            <Text style={styles.summaryLabel}>全部任务</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{remaining}</Text>
            <Text style={styles.summaryLabel}>待完成</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{completed}</Text>
            <Text style={styles.summaryLabel}>已完成</Text>
          </View>
        </View>

        {/* 添加按钮 */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={openAddForm}
        >
          <Text style={styles.primaryButtonText}>＋ 新建任务</Text>
        </TouchableOpacity>

        {/* 任务编辑表单 */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {editingId ? '编辑任务' : '创建新任务'}
            </Text>

            <Text style={styles.fieldLabel}>任务名称</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="例如：完成毕业设计"
              maxLength={100}
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>任务分类</Text>
            <View style={styles.optionRow}>
              {categories.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.option,
                    category === item && styles.optionSelected,
                  ]}
                  onPress={() => setCategory(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      category === item && styles.optionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>优先级</Text>
            <View style={styles.optionRow}>
              {priorities.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.option,
                    priority === item && styles.optionSelected,
                  ]}
                  onPress={() => setPriority(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      priority === item && styles.optionTextSelected,
                    ]}
                  >
                    {item}优先级
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>截止时间</Text>

            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openPicker('date')}
              >
                <Text style={styles.dateButtonText}>选择日期</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openPicker('time')}
              >
                <Text style={styles.dateButtonText}>选择时间</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => {
                  setDueDate(null);
                  setPickerMode(null);
                }}
              >
                <Text style={styles.clearDateText}>清除</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.dateValue}>
              {dueDate ? formatDate(dueDate.toISOString()) : '暂未设置截止时间'}
            </Text>

            {pickerMode && dueDate && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={dueDate}
                  mode={pickerMode}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handlePickerChange}
                  minimumDate={pickerMode === 'date' ? new Date() : undefined}
                />

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerDone}
                    onPress={() => setPickerMode(null)}
                  >
                    <Text style={styles.pickerDoneText}>确定</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.fieldLabel}>截止前自定义提醒</Text>
            <Text style={styles.helper}>
              可以分别设置提前多少天、小时和分钟提醒。
            </Text>

            <View style={styles.reminderRow}>
              <View style={styles.reminderInputGroup}>
                <TextInput
                  style={styles.numberInput}
                  value={reminderDays}
                  onChangeText={setReminderDays}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={styles.unit}>天</Text>
              </View>

              <View style={styles.reminderInputGroup}>
                <TextInput
                  style={styles.numberInput}
                  value={reminderHours}
                  onChangeText={setReminderHours}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.unit}>小时</Text>
              </View>

              <View style={styles.reminderInputGroup}>
                <TextInput
                  style={styles.numberInput}
                  value={reminderMinutes}
                  onChangeText={setReminderMinutes}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.unit}>分钟</Text>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextArea}>
                <Text style={styles.switchTitle}>截止时提醒</Text>
                <Text style={styles.switchDesc}>
                  到达任务截止时间时发送通知
                </Text>
              </View>
              <Switch
                value={remindAtDue}
                onValueChange={setRemindAtDue}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextArea}>
                <Text style={styles.switchTitle}>逾期提醒</Text>
                <Text style={styles.switchDesc}>
                  逾期后每天提醒一次，最多安排7次
                </Text>
              </View>
              <Switch
                value={remindWhenOverdue}
                onValueChange={setRemindWhenOverdue}
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveTask}
              >
                <Text style={styles.saveButtonText}>保存任务</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 筛选 */}
        <Text style={styles.sectionTitle}>我的任务</Text>

        <View style={styles.filterRow}>
          {(['全部', '待完成', '已完成'] as FilterType[]).map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.filterButton,
                filter === item && styles.filterSelected,
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item && styles.filterTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 任务列表 */}
        {loading ? (
          <Text style={styles.empty}>正在加载任务...</Text>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.empty}>这里还没有任务</Text>
            <Text style={styles.emptyHint}>
              点击上方按钮，创建你的第一个任务。
            </Text>
          </View>
        ) : (
          filteredTasks.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <TouchableOpacity
                style={[
                  styles.taskCheckbox,
                  task.done && styles.taskCheckboxDone,
                ]}
                onPress={() => handleToggle(task)}
              >
                <Text style={styles.checkmark}>
                  {task.done ? '✓' : ''}
                </Text>
              </TouchableOpacity>

              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.done && styles.taskCompleted,
                  ]}
                >
                  {task.title}
                </Text>

                <View style={styles.tagRow}>
                  <Text style={styles.tag}>{task.category}</Text>
                  <Text
                    style={[
                      styles.tag,
                      task.priority === '高' && styles.highTag,
                      task.priority === '低' && styles.lowTag,
                    ]}
                  >
                    {task.priority}优先级
                  </Text>
                </View>

                {task.dueAt && (
                  <Text
                    style={[
                      styles.dueText,
                      isOverdue(task) && styles.overdueText,
                    ]}
                  >
                    {isOverdue(task) ? '已逾期 · ' : '截止 · '}
                    {formatDate(task.dueAt)}
                  </Text>
                )}
              </View>

              <View style={styles.taskActions}>
                <TouchableOpacity
                  onPress={() => openEditForm(task)}
                >
                  <Text style={styles.editAction}>编辑</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => confirmDelete(task)}
                >
                  <Text style={styles.deleteAction}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={styles.footer}>
          认真安排每一件小事，让生活更有条理。
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
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 58,
    paddingBottom: 45,
  },
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#253C2D',
  },
  subtitle: {
    marginTop: 7,
    color: '#899184',
    fontSize: 13,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#294A36',
    borderRadius: 18,
    paddingVertical: 20,
    marginBottom: 18,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryLabel: {
    color: '#D9E4D8',
    fontSize: 12,
    marginTop: 5,
  },
  primaryButton: {
    backgroundColor: '#355B40',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 18,
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#28392C',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#354738',
    marginTop: 16,
    marginBottom: 9,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E3E8E0',
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#28392C',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#F1F3EF',
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: '#355B40',
  },
  optionText: {
    color: '#637064',
    fontSize: 12,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#E9EFE6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#355B40',
    fontWeight: '700',
    fontSize: 12,
  },
  clearDateButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  clearDateText: {
    color: '#9A655D',
    fontSize: 12,
  },
  dateValue: {
    color: '#657365',
    fontSize: 12,
    marginTop: 10,
  },
  pickerContainer: {
    marginTop: 12,
    backgroundColor: '#F6F7F2',
    borderRadius: 12,
    padding: 8,
  },
  pickerDone: {
    alignSelf: 'flex-end',
    backgroundColor: '#355B40',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  pickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  helper: {
    color: '#899184',
    fontSize: 11,
    marginBottom: 10,
  },
  reminderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  numberInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#E3E8E0',
    borderRadius: 9,
    textAlign: 'center',
    color: '#28392C',
    fontSize: 14,
  },
  unit: {
    color: '#657365',
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1ED',
  },
  switchTextArea: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    color: '#354738',
    fontSize: 13,
    fontWeight: '700',
  },
  switchDesc: {
    color: '#899184',
    fontSize: 11,
    marginTop: 4,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    flex: 1,
    height: 45,
    borderRadius: 11,
    backgroundColor: '#F0F2ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#657365',
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    height: 45,
    borderRadius: 11,
    backgroundColor: '#355B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#28392C',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 15,
  },
  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#E9ECE6',
  },
  filterSelected: {
    backgroundColor: '#355B40',
  },
  filterText: {
    color: '#697568',
    fontSize: 12,
  },
  filterTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 15,
    marginBottom: 10,
  },
  taskCheckbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#B9C5B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  taskCheckboxDone: {
    backgroundColor: '#4C7553',
    borderColor: '#4C7553',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: '#354738',
    fontSize: 14,
    fontWeight: '700',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0A79E',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 7,
  },
  tag: {
    color: '#657365',
    backgroundColor: '#EDF1EA',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
  },
  highTag: {
    color: '#A44F42',
    backgroundColor: '#F8E8E4',
  },
  lowTag: {
    color: '#567B9A',
    backgroundColor: '#E8EFF6',
  },
  dueText: {
    color: '#899184',
    fontSize: 10,
    marginTop: 7,
  },
  overdueText: {
    color: '#C34E40',
    fontWeight: '700',
  },
  taskActions: {
    alignItems: 'flex-end',
    gap: 12,
    marginLeft: 8,
  },
  editAction: {
    color: '#52765A',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAction: {
    color: '#B56A60',
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  empty: {
    color: '#899184',
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 12,
  },
  emptyHint: {
    color: '#A0A79E',
    fontSize: 11,
    marginTop: 5,
  },
  footer: {
    textAlign: 'center',
    color: '#899184',
    fontSize: 11,
    marginTop: 25,
  },
});
