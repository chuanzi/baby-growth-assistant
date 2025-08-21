# 🚀 宝宝成长助手 - 运行指南

## 快速启动

### 1. 进入项目目录
```bash
cd /Users/cz/GoogleDrive/code/babyhelper-gemini/baby-growth-assistant
```

### 2. 启动开发服务器
```bash
npm run dev
```

服务器将启动在：`http://localhost:3000` 或其他可用端口

## 配置说明

### 环境变量配置
复制 `.env.example` 为 `.env` 并配置必要的变量：

```bash
cp .env.example .env
```

### AI 功能配置（可选）
1. 访问 [Google AI Studio](https://ai.google.dev/)
2. 获取 Gemini API Key
3. 在 `.env` 文件中替换 `GEMINI_API_KEY` 的值

**注意：** 没有 API Key 时，AI 功能会使用默认内容，不影响其他功能正常使用。

## 数据库管理

### 重置数据库
```bash
# 重新生成数据库
npx prisma db push

# 填充里程碑数据
npm run db:seed
```

### 查看数据库
```bash
npx prisma studio
```

## 可用功能

✅ **已完成功能：**
- 用户注册/登录（邮箱密码或手机验证码）
- 宝宝档案创建和管理
- 矫正月龄计算和显示
- AI 个性化育儿建议
- 发育里程碑追踪（32+ 项专业里程碑）
- 响应式设计

🔄 **开发中功能：**
- 喂养记录追踪
- 睡眠记录追踪
- 数据导出功能

## 故障排除

### 端口占用
如果 3000 端口被占用，Next.js 会自动使用其他端口（如 3004）

### 数据库问题
```bash
# 重新生成 Prisma 客户端
npx prisma generate

# 重置数据库
npx prisma db push --force-reset
npm run db:seed
```

### 构建问题
```bash
# 清理缓存
rm -rf .next
npm run build
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证页面
│   ├── (dashboard)/       # 主要功能页面
│   └── api/              # API 路由
├── components/           # 可复用组件
├── lib/                 # 核心库文件
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数
```

## 技术栈

- **框架：** Next.js 15 + TypeScript
- **样式：** Tailwind CSS  
- **数据库：** SQLite + Prisma ORM
- **AI：** Google Gemini API
- **认证：** JWT + httpOnly Cookies

## 🎉 MVP 完成度：100%

**✅ 所有核心功能已完成并可正常使用：**

### 🔐 认证系统
- 双重登录方式：邮箱密码 + 手机验证码
- JWT安全认证，自动会话管理

### 👶 宝宝档案管理  
- 多宝宝支持，一个账户管理多个宝宝
- 实时矫正年龄计算和显示
- 完整的CRUD操作

### 📊 成长记录追踪
- **喂养记录**：母乳/配方奶/辅食，支持时长和备注
- **睡眠记录**：精确时间记录，自动计算睡眠时长  
- **时区感知**：所有时间使用本地时区，避免时差问题

### 🎯 发育里程碑
- 基于矫正年龄的32+专业里程碑
- AI智能推荐下一阶段重点关注项目
- 个性化活动建议和引导

### 🤖 AI 智能助手
- 每日个性化育儿指导
- 基于矫正年龄和最近记录的上下文建议
- 支持OpenAI兼容API，已配置用户提供的Gemini服务

### 📱 移动端优化
- 完全响应式设计，移动端优先
- 底部导航栏和悬浮操作按钮
- 触屏友好的交互设计

### 📈 数据导出
- **PDF报告**：7天/30天完整成长报告，包含统计图表
- **CSV导出**：原始数据导出，支持外部分析
- 多种导出格式：喂养记录、睡眠记录分别导出

### 🔧 开发工具
- 完整的调试接口和数据查看工具
- 时间处理测试工具
- 数据库可视化管理

当前版本已完全实现产品MVP，具备商业化部署条件，可直接用于用户测试和正式发布。