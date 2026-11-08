
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
};

const API_URL = 'http://192.168.2.58:3000/api/chat';

export default function AssistantScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: '你好！我是你的 AI 生活助手 😊\n\n我可以帮助你安排日程、整理待办事项、制定生活计划，也可以回答日常问题。\n\n今天有什么事情需要我帮忙？',
      from: 'assistant',
    },
  ]);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || loading) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      text,
      from: 'user',
    };

    // 不把欢迎语发送给 AI，只发送真实聊天记录。
    const history = messages
      .filter(message => !message.id.startsWith('welcome'))
      .map(message => ({
        role: message.from,
        content: message.text,
      }));

    const requestMessages = [
      ...history,
      {
        role: 'user',
        content: text,
      },
    ];

    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: requestMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.message || `服务器请求失败：${response.status}`,
        );
      }

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        text: data.reply || 'AI 暂时没有返回内容，请再试一次。',
        from: 'assistant',
      };

      setMessages(previous => [...previous, assistantMessage]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '未知网络错误';

      setMessages(previous => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          text:
            `暂时无法连接 AI 服务。\n\n错误信息：${errorMessage}\n\n请检查电脑后端是否运行，以及手机和电脑是否连接同一个 Wi-Fi。`,
          from: 'assistant',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    if (loading) {
      Alert.alert('请稍等', 'AI 正在回复，完成后再清空对话。');
      return;
    }

    Alert.alert(
      '清空聊天记录',
      '确定要清空当前对话吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                text: '你好！我是你的 AI 生活助手 😊\n有什么事情需要我帮忙？',
                from: 'assistant',
              },
            ]);
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 85 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleArea}>
            <Text style={styles.title}>AI 生活助手</Text>
            <Text style={styles.subtitle}>让生活安排更简单</Text>
          </View>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearMessages}
          >
            <Text style={styles.clearButtonText}>清空对话</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>DeepSeek AI 对话模式</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.from === 'user'
                ? styles.userRow
                : styles.assistantRow,
            ]}
          >
            {message.from === 'assistant' && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AI</Text>
              </View>
            )}

            <View
              style={[
                styles.message,
                message.from === 'user'
                  ? styles.userMessage
                  : styles.assistantMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.from === 'user' && styles.userMessageText,
                ]}
              >
                {message.text}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.assistantRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AI</Text>
            </View>
            <View style={styles.assistantMessage}>
              <Text style={styles.loadingText}>DeepSeek 正在思考...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入你想问的问题..."
          placeholderTextColor="#9AA3B5"
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>
            {loading ? '...' : '发送'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingTop: 58,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0F5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#263B65',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#7A8499',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F3F8',
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 13,
    color: '#64718A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#35B779',
    marginRight: 7,
  },
  statusText: {
    fontSize: 12,
    color: '#8A93A5',
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4D73E8',
  },
  message: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
  },
  assistantMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 5,
  },
  userMessage: {
    backgroundColor: '#4D73E8',
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#26344D',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  loadingText: {
    color: '#8A93A5',
    fontSize: 14,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF2',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F3F8',
    borderRadius: 18,
    fontSize: 15,
    color: '#26344D',
  },
  sendButton: {
    backgroundColor: '#4D73E8',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  sendButtonDisabled: {
    backgroundColor: '#AAB9E9',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
