# 随身生活管家 (suishen-life)

一个用 **Expo + React Native + TypeScript** 编写的跨端生活管理应用。把待办、日程、记账三件事收在一个 App 里，并内置一个连接 DeepSeek 的 AI 生活助手。

> 平台支持：Android / iOS / Web（同一套代码，Expo Router 文件路由）

---

## 目录

- [功能一览](#功能一览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [连接 AI 后端](#连接-ai-后端)
- [后端接口说明](#后端接口说明)
- [本地数据存储](#本地数据存储)
- [通知与提醒机制](#通知与提醒机制)
- [打包与发布](#打包与发布)
- [开发规范](#开发规范)
- [已知限制](#已知限制)
- [归档目录](#归档目录)
- [许可](#许可)

---

## 功能一览

### 1. 首页 `src/app/index.tsx`
- 显示当天日期、星期与欢迎语
- 统计卡片：待完成数、已完成数、完成百分比
- 今日待办列表：勾选完成（点击切换）、左滑样式删除（点 `×`）、完成项自动加删除线
- 快速添加任务（回车或点「添加」）
- 顶部入口展示 AI 生活管家占位卡

### 2. 待办事项 `src/app/explore/todo.tsx`
- 任务字段：标题、分类（工作 / 学习 / 生活 / 其他）、优先级（高 / 中 / 低）、截止时间
- 筛选：全部 / 待完成 / 已完成
- 逾期高亮：未完成且已过截止时间的任务会被标记
- 提醒设置：可设「提前 N 天 / 小时 / 分钟」提醒，并可选择「到点提醒」「逾期提醒」
- 支持编辑与删除，通知会自动重建或取消

### 3. 日程管理 `src/app/explore/schedule.tsx`
- 新增 / 编辑 / 删除日程，支持日期 + 时间选择器
- 提醒选项：不提醒 / 提前 5 / 15 / 30 分钟
- 列表按时间排序，展示未来与过期日程

### 4. 记账管理 `src/app/explore/ledger.tsx`
- 收入 / 支出两套分类（支出：餐饮、交通、购物、娱乐、住房、医疗、其他；收入：工资、奖金、兼职、理财、其他）
- 金额校验（必须为正数，保留两位小数）、备注、账单日期
- 按当前自然月汇总收入、支出与结余
- 按分类统计，支持删除单条账单

### 5. AI 生活助手 `src/app/assistant.tsx`
- 对话式界面，气泡区分用户 / AI
- 保留最近对话上下文（最多 20 条，单条截断 4000 字符）
- 请求失败时给出明确提示（后端未启动 / 不在同一 Wi-Fi）
- 支持一键清空对话

### 6. 发现页 `src/app/explore/index.tsx`
生活工具入口聚合页：日程管理、记账管理、待办事项、AI 助手四个卡片，外加生活小贴士。

---

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Expo SDK 58、React Native 0.88、React 19 |
| 语言 | TypeScript（`strict`）、React Compiler 开启 |
| 路由 | expo-router（文件路由，typed routes） |
| 原生 Tab | `expo-router/native-tabs`（移动端）、`expo-router/ui`（Web 端） |
| 本地存储 | `@react-native-async-storage/async-storage` |
| 通知 | `expo-notifications`（本地定时通知） |
| 时间选择 | `@react-native-community/datetimepicker` |
| 后端 | Node.js + Express 5 + CORS + dotenv |
| AI | DeepSeek Chat Completions API |
| 打包 | EAS Build / EAS Update |

---

## 项目结构

```
suishen-life/
├─ src/
│  ├─ app/                       # 所有页面（Expo Router 路由，每个文件即一个路由）
│  │  ├─ _layout.tsx             # 根布局：主题、启动屏、底部 Tab
│  │  ├─ index.tsx               # 首页
│  │  ├─ assistant.tsx           # AI 助手页
│  │  └─ explore/
│  │     ├─ _layout.tsx          # 发现模块 Stack 布局
│  │     ├─ index.tsx            # 发现页（工具入口）
│  │     ├─ schedule.tsx         # 日程管理
│  │     ├─ ledger.tsx           # 记账管理
│  │     └─ todo.tsx             # 待办事项
│  ├─ components/
│  │  ├─ app-tabs.tsx            # 移动端原生 Tab（首页 / 发现 / 助手）
│  │  ├─ app-tabs.web.tsx        # Web 端 Tab 实现
│  │  ├─ animated-icon.tsx       # 启动屏动画（.web.tsx 为 Web 版本）
│  │  ├─ themed-text.tsx         # 主题化文字
│  │  └─ themed-view.tsx         # 主题化容器
│  ├─ constants/theme.ts         # 颜色、字体、间距、断点常量
│  ├─ hooks/                     # 配色方案与主题 Hook
│  ├─ store/tasks.ts             # 待办数据层（增删改查 + 通知联动）
│  ├─ utils/notifications.ts     # 通知权限、排期、取消
│  └─ global.css                 # Web 端字体变量
├─ assets/
│  └─ images/                    # 应用图标、启动图、favicon、Tab 图标与启动动画素材
├─ scripts/
│  └─ make_icon.py               # 生成 1024×1024 应用图标（Pillow）
├─ server/                       # DeepSeek 代理后端（独立 npm 包）
│  ├─ index.js                   # Express 入口与 /api/chat
│  ├─ .env.example               # 环境变量模板（复制为 .env）
│  ├─ .gitignore                 # 忽略 .env 与 node_modules
│  └─ package.json
├─ archive/                      # 归档的历史备份与模板残留（不入库）
├─ app.json                      # Expo 应用配置
├─ eas.json                      # EAS 构建配置
├─ tsconfig.json                 # TypeScript 配置（@/* 指向 src/*）
├─ package.json
└─ README.md
```

---

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm（或 bun，若使用 bun 请把 `npx` 换成 `bunx`）
- 手机安装 **Expo Go**，或本地配置 Android Studio / Xcode 模拟器
- 需要 AI 对话功能时，另需一个 DeepSeek API Key

### 1. 安装依赖并启动 App

```bash
npm install
npx expo start
```

终端会给出二维码与可选启动方式：

- 手机扫码 → Expo Go 打开
- 按 `a` → Android 模拟器
- 按 `i` → iOS 模拟器
- 按 `w` → 浏览器

> 注意：本项目依赖 `expo-notifications`、`@react-native-community/datetimepicker` 等原生模块。Expo Go 已内置这些模块，但若后续加入自定义原生代码，需要用开发构建（`npx expo run:android` / `eas build --profile development`）。

### 2. 启动 AI 后端

```bash
cd server
npm install
```

复制环境变量模板并填入 Key：

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

编辑 `server/.env`：

```ini
DEEPSEEK_API_KEY=sk-你的Key
PORT=3000
```

启动：

```bash
npm start
# 输出：AI 后端服务已启动：http://localhost:3000
```

自检：

```bash
curl http://localhost:3000/api/health
# {"success":true,"message":"DeepSeek AI 接口已准备就绪"}
```

---

## 连接 AI 后端

App 端请求地址写在 `src/app/assistant.tsx` 顶部：

```ts
const API_URL = 'http://192.168.2.58:3000/api/chat';
```

这是**开发机的局域网地址**，换网络或换电脑后必须修改：

1. 在电脑上查本机 IPv4（Windows：`ipconfig`；macOS/Linux：`ifconfig` 或 `ip addr`）
2. 把 `API_URL` 里的 IP 换成该地址，端口与 `server/.env` 的 `PORT` 一致
3. 手机与电脑连**同一个 Wi-Fi**，并确保系统防火墙放行 3000 端口
4. 重启 Expo 开发服务（改常量后需要重新加载）

也可以用隧道方式免改 IP：

```bash
npx expo start --tunnel
```

此时手机端仍要能访问到后端，建议把后端部署到公网或使用内网穿透，再把 `API_URL` 指向可访问的域名。

---

## 后端接口说明

后端只做一件事：替 App 保管 API Key，并把请求转发给 DeepSeek，避免把密钥打进客户端。

### `GET /`
健康检查：

```json
{ "success": true, "message": "随身生活管家 AI 后端运行正常！" }
```

### `GET /api/health`
返回服务与 Key 的配置状态：

```json
{ "success": true, "message": "DeepSeek AI 接口已准备就绪" }
```

### `POST /api/chat`

请求体：

```json
{
  "messages": [
    { "role": "user", "content": "帮我安排一下今天的计划" }
  ]
}
```

校验规则（服务端强制）：

- `messages` 必须是非空数组
- 只接受 `role` 为 `user` / `assistant`，且 `content` 非空的项
- 只取最后 20 条，单条内容截断 4000 字符
- 最后一条必须是 `user`

成功响应：

```json
{ "success": true, "reply": "..." }
```

错误响应统一带 `success: false` 与 `message`：

| 状态码 | 场景 |
| --- | --- |
| 400 | 消息为空、格式非法、最后一条不是用户消息 |
| 500 | 未配置 `DEEPSEEK_API_KEY`、服务器内部异常 |
| 502 | DeepSeek 上游不可用、返回内容为空 |

服务端固定使用 `model: "deepseek-flash"`、`stream: false`、关闭 thinking，并注入一段中文系统提示词限定角色为「随身生活管家」。

> 若 `/api/chat` 一直返回 502，先核对 `server/index.js` 中的 `model` 是否与 DeepSeek 当前可用的模型名一致（官方对话模型为 `deepseek-chat` / `deepseek-reasoner`）。

---

## 本地数据存储

所有业务数据都保存在设备本地 `AsyncStorage`，不经过网络，也不做云同步。

| 存储键 | 内容 | 写入位置 |
| --- | --- | --- |
| `@suishen_life_tasks` | 待办任务数组 | `src/store/tasks.ts` |
| `@suishen_life_schedules` | 日程数组 | `src/app/explore/schedule.tsx` |
| `@suishen_life_bills` | 账单数组 | `src/app/explore/ledger.tsx` |

### 待办任务数据结构

```ts
type Task = {
  id: string;
  title: string;
  done: boolean;
  category: '工作' | '学习' | '生活' | '其他';
  priority: '高' | '中' | '低';
  dueAt: string | null;              // ISO 时间字符串
  reminderBeforeMinutes: number;     // 提前多少分钟提醒
  remindAtDue: boolean;              // 到点是否提醒
  remindWhenOverdue: boolean;        // 逾期是否提醒
  notificationIds: string[];         // 已排期的本地通知 ID
  createdAt: string;
  updatedAt: string;
};
```

数据层特性：

- 首次运行会写入 3 条示例任务（`DEFAULT_TASKS`）
- 读取时通过 `normalizeTask` 补齐旧版本缺失字段，兼容历史数据
- 增删改与通知保持事务式一致：保存失败会回滚已创建的通知
- 完成任务时会取消其全部待发通知

清空数据：删除 App 或清除应用数据即可（Web 端为清空对应站点存储）。

---

## 通知与提醒机制

全部使用**本地通知**，不依赖推送服务器，离线可用。

- 权限：首次排期前调用 `requestNotificationPermission()`，被拒绝时会抛错并提示「请先允许 App 发送通知」
- Android 渠道：`schedule-reminders`（日程提醒）、`todo-reminders`（待办提醒），重要性均为 `MAX`
- 待办会排期三类通知：
  1. 截止前自定义提前提醒（`reminderBeforeMinutes > 0`）
  2. 截止时间点提醒（`remindAtDue`）
  3. 逾期提醒：截止后连续 7 天，每天一次（`remindWhenOverdue`）
- 所有通知 ID 记录在任务的 `notificationIds` 中，编辑任务时先取消旧 ID 再重建，删除任务时一并取消

---

## 打包与发布

项目已配置 `eas.json`（`development` / `preview` / `production` 三个 profile，`appVersionSource: remote`）。

```bash
# 登录 EAS
npx eas-cli@latest login

# 开发构建（含开发客户端）
npx eas-cli@latest build --profile development --platform android

# 内测包（APK，可直接分发）
npx eas-cli@latest build --profile preview --platform android

# 生产包（自动递增版本号）
npx eas-cli@latest build --profile production --platform all

# 提交应用商店
npx eas-cli@latest submit --platform android

# OTA 更新
npx eas-cli@latest update --branch production
```

应用标识：

| 项目 | 值 |
| --- | --- |
| 名称 | 随身生活管家 |
| slug | `suishen-life` |
| scheme | `suishenlife` |
| iOS Bundle ID | `com.suishenlife.app` |
| Android Package | `com.suishenlife.app` |
| EAS Project ID | `0b47ba84-1e84-40c4-84ed-57741d8ac6a4` |

图标更新：修改 `assets/images/app-icon-square.png`，或在替换 `assets/images/splash-icon.png` 后执行：

```bash
python scripts/make_icon.py   # 需要 pip install pillow
```

---

## 开发规范

```bash
npm run typecheck   # tsc --noEmit，已通过
npm run lint        # expo lint，首次执行会提示安装 ESLint（当前项目未配置）
npx expo-doctor     # 检查依赖与配置是否与 SDK 版本匹配
```

约定：

- 页面只放 `src/app/`，**任何非路由文件都不要放这里**（否则会被注册成路由）
- 组件、Hook、数据层、工具函数放在 `src/` 对应目录
- 路径别名：`@/*` → `src/*`，`@/assets/*` → `assets/*`
- 新增依赖统一用 `npx expo install <package>`，自动匹配 SDK 版本
- 不要手写 `ios/` / `android/` 目录（由 CNG 生成），原生配置改 `app.json` 与 config plugin
- 提交前运行 `npm run typecheck` 与 `npm run lint`

---

## 已知限制

1. **后端地址硬编码**：`src/app/assistant.tsx` 中的 `API_URL` 写死了局域网 IP，未走环境变量，换网络必须手改。
2. **数据仅存本地**：无云同步、无导出/备份，卸载即丢失。
3. **AI 与业务数据未打通**：助手不读取本地待办/日程/账单，无法直接代你建任务。
4. **模型名待核对**：`server/index.js` 使用 `deepseek-flash`，需与 DeepSeek 官方当前模型名对齐，否则 `/api/chat` 会返回 502。
5. **Web 端 Tab 为独立实现**：`app-tabs.web.tsx` 与移动端 `app-tabs.tsx` 各自维护，改动 Tab 时需同步两处。
6. **许可证声明不一致**：`package.json` 声明 ISC，`LICENSE` 文件为 Expo 模板自带的 MIT（版权人为 650 Industries, Inc.），对外发布前应按实际情况统一。
7. **缺少质量保障手段**：未配置 ESLint，也没有单元测试与 E2E 测试，目前只靠 `tsc --noEmit` 兜底。

---

## 归档目录

`archive/` 存放整理过程中移出的历史文件，**已被 `.gitignore` 忽略，不参与构建**。保留原因是可以随时找回，确认无用后可整目录删除。

| 路径 | 说明 |
| --- | --- |
| `archive/app/assistant.backup.tsx` | AI 助手页旧版 |
| `archive/app/index-backup.tsx` | 首页旧版 |
| `archive/app/index - buckup.tsx` | 首页早期版本（原名含空格） |
| `archive/app/explore-backup.tsx` | Expo 模板自带的发现页 |
| `archive/components/web-badge.tsx` | 模板组件，仅旧版发现页引用 |
| `archive/components/hint-row.tsx` | 模板组件，无引用 |
| `archive/components/collapsible.tsx` | 模板组件，仅旧版发现页引用 |
| `archive/components/external-link.tsx` | 模板组件，Web Tab 改版后不再使用 |
| `archive/assets/` | 模板残留图片（react-logo、expo-badge、tutorial-web、未使用的 android 图标、重复的 `splash-icon (2).png`、799 KB 的 `icon.png`）与 `expo.icon/` 图标工程 |
| `archive/scripts/reset-project.js` | Expo 模板重置脚本（会把 `src/app` 移走，项目已开发完成，保留易误用） |
| `archive/package.json.backup` | 与整理前 `package.json` 完全相同的副本 |

> 这些文件原先放在 `src/app/`，会被 expo-router 当作页面路由（如 `/assistant.backup`、`/explore-backup`），已在整理时移出。

---

## 许可

见 [LICENSE](./LICENSE)。
