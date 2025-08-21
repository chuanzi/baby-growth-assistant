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

## MVP 完成度：60%

当前版本已包含产品核心价值功能，可进行用户测试和反馈收集。