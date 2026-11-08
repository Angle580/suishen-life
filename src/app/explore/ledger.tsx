
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

type Bill = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
};

const STORAGE_KEY = '@suishen_life_bills';

const expenseCategories = ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '其他'];
const incomeCategories = ['工资', '奖金', '兼职', '理财', '其他'];

export default function LedgerScreen() {
  const router = useRouter();

  const [bills, setBills] = useState<Bill[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('餐饮');
  const [note, setNote] = useState('');

  const [billDate, setBillDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loaded, setLoaded] = useState(false);

  // 读取本地账单
  useEffect(() => {
    const loadBills = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            setBills(parsed);
          }
        }
      } catch {
        Alert.alert('提示', '账单读取失败，请稍后重试。');
      } finally {
        setLoaded(true);
      }
    };

    loadBills();
  }, []);

  // 保存账单到本地
  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bills)).catch(() => {
      Alert.alert('提示', '账单保存失败，请检查手机存储空间。');
    });
  }, [bills, loaded]);

  // 使用本地年月计算当前月份
  const now = new Date();
  const currentMonth =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyBills = useMemo(
    () =>
      bills.filter((bill) => {
        const date = new Date(bill.date);

        if (Number.isNaN(date.getTime())) return false;

        const month =
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        return month === currentMonth;
      }),
    [bills, currentMonth]
  );

  const income = monthlyBills
    .filter((bill) => bill.type === 'income')
    .reduce((sum, bill) => sum + bill.amount, 0);

  const expense = monthlyBills
    .filter((bill) => bill.type === 'expense')
    .reduce((sum, bill) => sum + bill.amount, 0);

  const categories =
    type === 'expense' ? expenseCategories : incomeCategories;

  // 切换收入和支出
  const switchType = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'expense' ? '餐饮' : '工资');
  };

  // 保存账单
  const addBill = () => {
    const value = Number(amount);

    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('金额不正确', '请输入大于 0 的有效金额。');
      return;
    }

    const newBill: Bill = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      amount: Math.round(value * 100) / 100,
      category,
      note: note.trim(),
      date: billDate.toISOString(),
    };

    setBills((previous) => [newBill, ...previous]);
    setAmount('');
    setNote('');
    setBillDate(new Date());

    Alert.alert('记账成功', '这笔账单已经保存。');
  };

  // 删除账单
  const deleteBill = (id: string) => {
    Alert.alert('删除账单', '确定删除这条记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () =>
          setBills((previous) =>
            previous.filter((bill) => bill.id !== id)
          ),
      },
    ]);
  };

  // 格式化账单时间
  const formatDate = (date: string) => {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return '时间未知';

    const month = value.getMonth() + 1;
    const day = value.getDate();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ 返回</Text>
        </TouchableOpacity>

        <Text style={styles.title}>记账管理</Text>
        <Text style={styles.subtitle}>认真记录每一笔收支</Text>
      </View>

      {/* 本月收支统计 */}
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>本月结余</Text>

        <Text style={styles.balance}>
          ¥{(income - expense).toFixed(2)}
        </Text>

        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>收入</Text>
            <Text style={styles.income}>
              +¥{income.toFixed(2)}
            </Text>
          </View>

          <View>
            <Text style={styles.summaryLabel}>支出</Text>
            <Text style={styles.expense}>
              -¥{expense.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* 添加账单 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>记一笔</Text>

        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && styles.expenseActive,
            ]}
            onPress={() => switchType('expense')}
          >
            <Text
              style={[
                styles.typeText,
                type === 'expense' && styles.activeText,
              ]}
            >
              支出
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && styles.incomeActive,
            ]}
            onPress={() => switchType('income')}
          >
            <Text
              style={[
                styles.typeText,
                type === 'income' && styles.activeText,
              ]}
            >
              收入
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>金额（元）</Text>

        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="请输入金额"
          keyboardType="decimal-pad"
        />

        {/* 日期和时间选择 */}
        <Text style={styles.fieldLabel}>记账日期和时间</Text>

        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateTimeText}>
              📅 {billDate.getFullYear()}年
              {billDate.getMonth() + 1}月
              {billDate.getDate()}日
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateTimeText}>
              🕒 {String(billDate.getHours()).padStart(2, '0')}:
              {String(billDate.getMinutes()).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={billDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);

              if (selectedDate) {
                setBillDate((previous) => {
                  const updated = new Date(previous);

                  updated.setFullYear(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate()
                  );

                  return updated;
                });
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={billDate}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);

              if (selectedTime) {
                setBillDate((previous) => {
                  const updated = new Date(previous);

                  updated.setHours(
                    selectedTime.getHours(),
                    selectedTime.getMinutes(),
                    0,
                    0
                  );

                  return updated;
                });
              }
            }}
          />
        )}

        {/* 分类选择 */}
        <Text style={styles.fieldLabel}>分类</Text>

        <View style={styles.categoryGrid}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryButton,
                category === item && styles.categoryActive,
              ]}
              onPress={() => setCategory(item)}
            >
              <Text
                style={
                  category === item
                    ? styles.activeText
                    : styles.categoryText
                }
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 备注 */}
        <Text style={styles.fieldLabel}>备注（选填）</Text>

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="例如：午餐、地铁"
          maxLength={50}
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={addBill}
        >
          <Text style={styles.addButtonText}>保存账单</Text>
        </TouchableOpacity>
      </View>

      {/* 账单列表 */}
      <View style={styles.listSection}>
        <Text style={styles.cardTitle}>本月账单</Text>

        {monthlyBills.length === 0 ? (
          <Text style={styles.empty}>
            还没有账单，记下第一笔吧。
          </Text>
        ) : (
          monthlyBills.map((bill) => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billItem}
              activeOpacity={0.8}
              onLongPress={() => deleteBill(bill.id)}
            >
              <View style={styles.billIcon}>
                <Text style={styles.billIconText}>
                  {bill.type === 'income' ? '💵' : '🧾'}
                </Text>
              </View>

              <View style={styles.billInfo}>
                <Text style={styles.billCategory}>
                  {bill.category}
                </Text>

                <Text style={styles.billNote}>
                  {bill.note
                    ? `${bill.note} · ${formatDate(bill.date)}`
                    : formatDate(bill.date)}
                </Text>
              </View>

              <Text
                style={[
                  styles.billAmount,
                  bill.type === 'income'
                    ? styles.income
                    : styles.expense,
                ]}
              >
                {bill.type === 'income' ? '+' : '-'}
                ¥{bill.amount.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.hint}>
          长按一条账单可以删除。
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
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  back: {
    color: '#52745A',
    fontSize: 16,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#253C2D',
  },
  subtitle: {
    marginTop: 7,
    color: '#899184',
    fontSize: 14,
  },
  summary: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#294A36',
  },
  summaryLabel: {
    color: '#D9E4D8',
    fontSize: 13,
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  income: {
    color: '#29945E',
    fontWeight: '700',
  },
  expense: {
    color: '#D66A54',
    fontWeight: '700',
  },
  card: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#304C34',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F1F2EE',
    alignItems: 'center',
  },
  expenseActive: {
    backgroundColor: '#F9EBDD',
  },
  incomeActive: {
    backgroundColor: '#E5EFE3',
  },
  typeText: {
    color: '#7B8478',
    fontWeight: '700',
  },
  activeText: {
    color: '#304C34',
    fontWeight: '800',
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 9,
    color: '#596657',
    fontWeight: '600',
  },
  amountInput: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6F7F2',
    fontSize: 22,
    color: '#253C2D',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F6F7F2',
    alignItems: 'center',
  },
  dateTimeText: {
    color: '#304C34',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryButton: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#F1F2EE',
  },
  categoryActive: {
    backgroundColor: '#DDE9D9',
  },
  categoryText: {
    color: '#6F7D6D',
  },
  noteInput: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F6F7F2',
    color: '#253C2D',
  },
  addButton: {
    marginTop: 22,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#294A36',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listSection: {
    marginHorizontal: 20,
    marginBottom: 35,
  },
  empty: {
    padding: 25,
    textAlign: 'center',
    color: '#899184',
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECE5',
  },
  billIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E7EDE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billIconText: {
    fontSize: 21,
  },
  billInfo: {
    flex: 1,
    marginLeft: 12,
  },
  billCategory: {
    color: '#304C34',
    fontWeight: '700',
    fontSize: 15,
  },
  billNote: {
    marginTop: 4,
    color: '#899184',
    fontSize: 12,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  hint: {
    marginTop: 12,
    color: '#999F96',
    fontSize: 12,
  },
});
