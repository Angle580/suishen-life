
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 首页测试
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '随身生活管家 AI 后端运行正常！',
  });
});

// 服务状态
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DeepSeek AI 接口已准备就绪',
  });
});

// DeepSeek 聊天接口
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: '服务器尚未配置 DeepSeek API Key',
      });
    }

    const messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供聊天消息',
      });
    }

    // 只接受 user 和 assistant 消息
    const validMessages = messages
      .filter(item =>
        item &&
        ['user', 'assistant'].includes(item.role) &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
      )
      .slice(-20)
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 4000),
      }));

    if (
      validMessages.length === 0 ||
      validMessages[validMessages.length - 1].role !== 'user'
    ) {
      return res.status(400).json({
        success: false,
        message: '最后一条消息必须是有效的用户消息',
      });
    }

    const response = await fetch(
      'https://api.deepseek.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-flash',
          messages: [
            {
              role: 'system',
              content:
                '你是随身生活管家的AI生活助手。请使用自然、友好的中文回答。你擅长日程规划、待办整理、时间管理和日常生活建议。回答清晰、实用，不要编造已经执行的操作。',
            },
            ...validMessages,
          ],
          thinking: {
            type: 'disabled',
          },
          stream: false,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('DeepSeek API 请求失败，状态码：', response.status);

      return res.status(502).json({
        success: false,
        message: 'DeepSeek 暂时无法响应，请检查 API 配置或账户状态',
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== 'string' || !reply.trim()) {
      return res.status(502).json({
        success: false,
        message: 'AI 暂时没有返回有效内容',
      });
    }

    res.json({
      success: true,
      reply,
    });

  } catch (error) {
    console.error('聊天接口发生错误：', error.message);

    res.status(500).json({
      success: false,
      message: '服务器发生错误，请稍后重试',
    });
  }
});

// 启动服务
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI 后端服务已启动：http://localhost:${PORT}`);
});
