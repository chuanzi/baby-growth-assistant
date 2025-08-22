# 🚀 Vercel部署指南

## 当前部署状态
- **版本**: v1.0.0
- **最新提交**: 91dafa3
- **GitHub仓库**: https://github.com/chuanzi/baby-growth-assistant

## 手动触发Vercel部署的方法

### 方法1: Vercel仪表板
1. 登录 https://vercel.com/dashboard
2. 找到 `baby-growth-assistant` 项目
3. 点击 "Visit" 旁边的三个点菜单
4. 选择 "Redeploy"
5. 选择最新的 commit (91dafa3)
6. 点击 "Redeploy"

### 方法2: Vercel CLI
```bash
# 安装Vercel CLI (如果没有)
npm i -g vercel

# 登录
vercel login

# 手动部署
vercel --prod
```

### 方法3: GitHub集成重新连接
1. 在Vercel项目设置中
2. 转到 "Git" 标签
3. 点击 "Disconnect" 然后重新连接GitHub仓库
4. 确保选择了正确的分支 (main)

## 修复的问题
- ✅ 修复了vercel.json中的构建命令
- ✅ 移除了--turbopack参数（Vercel不兼容）
- ✅ 添加了Node.js版本控制 (.nvmrc)
- ✅ 优化了API函数路径配置
- ✅ 创建了.vercelignore排除文件

## 环境变量配置

### 必需的环境变量
在Vercel项目设置 > Environment Variables 中添加：

1. **DATABASE_URL** (必需)
   - 推荐使用外部数据库服务
   - 选项1: `postgresql://user:password@host:port/database` (PostgreSQL)
   - 选项2: `mysql://user:password@host:port/database` (MySQL)
   - 选项3: 暂时留空，将使用内存数据库进行构建

2. **JWT_SECRET** (必需)
   - 生成强密钥: `openssl rand -base64 32`
   - 示例: `your-super-secret-jwt-key-here`

3. **GEMINI_API_KEY** (可选，AI功能)
   - Google Gemini API密钥
   - 格式: `your-gemini-api-key`

### 配置步骤
1. 登录Vercel仪表板
2. 选择项目 > Settings > Environment Variables
3. 添加上述变量，选择所有环境 (Production, Preview, Development)
4. 保存后重新部署项目

## 部署验证
部署完成后，访问以下端点验证：
- `/health` - 健康检查
- `/api/health` - API健康状态
- `/dashboard` - 主要应用界面

---
更新时间: $(date)