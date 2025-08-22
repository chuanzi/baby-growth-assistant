# 测试指南

宝宝成长助手项目的完整测试体系，包含单元测试、集成测试、端到端测试、性能测试和安全测试。

## 测试架构

### 测试金字塔

```
    /\
   /  \     E2E Tests (端到端测试)
  /____\    
 /      \   Integration Tests (集成测试) 
/_______\   
/        \  Unit Tests (单元测试)
/__________\
```

### 测试类型

1. **单元测试** - 测试单个函数和组件
2. **集成测试** - 测试API端点和数据库交互
3. **端到端测试** - 测试完整的用户流程
4. **性能测试** - 测试API响应时间和性能基准
5. **安全测试** - 测试认证、授权和输入验证

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
npm run test:all
```

## 测试命令

### 基本测试命令

```bash
# 运行所有单元测试和集成测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 打开覆盖率报告
npm run test:coverage:open
```

### 分类测试命令

```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 安全测试
npm run test:security

# 性能测试
npm run test:performance
```

### 端到端测试

```bash
# 运行E2E测试
npm run test:e2e

# 带界面运行E2E测试
npm run test:e2e:ui

# 头显模式运行E2E测试
npm run test:e2e:headed

# 查看E2E测试报告
npm run test:e2e:report
```

### CI/CD测试

```bash
# CI环境测试（无监听模式）
npm run test:ci
```

## 测试结构

```
baby-growth-assistant/
├── src/
│   ├── utils/__tests__/          # 单元测试
│   ├── lib/__tests__/            # 库函数测试
│   └── components/ui/__tests__/  # UI组件测试
├── tests/
│   ├── setup/                   # 测试设置文件
│   ├── integration/             # API集成测试
│   ├── performance/             # 性能测试
│   └── security/                # 安全测试
├── e2e/                         # 端到端测试
│   ├── utils/                   # E2E测试工具
│   ├── global-setup.ts          # E2E环境设置
│   └── *.spec.ts               # E2E测试用例
├── jest.config.js              # Jest配置
├── jest.setup.js               # Jest设置
└── playwright.config.ts        # Playwright配置
```

## 测试配置

### Jest配置

- **测试环境**: jsdom (用于React组件测试)
- **覆盖率阈值**: 75%全局，90%核心业务逻辑
- **模拟**: Next.js路由、环境变量、外部依赖
- **超时**: 10秒

### Playwright配置

- **浏览器**: Chrome、Firefox、Safari
- **移动端**: Pixel 5、iPhone 12
- **并行执行**: 开启
- **重试机制**: CI环境2次重试
- **报告**: HTML、JSON、GitHub Actions

## 测试数据

### 测试数据库

- 使用SQLite内存数据库
- 每个测试独立的数据库实例
- 自动清理和重置
- 预设测试数据（用户、宝宝、记录）

### 测试用户

```javascript
// 默认测试用户
{
  phone: '13800138000',
  email: 'test@example.com',
  password: 'Password123'
}
```

### 测试宝宝档案

```javascript
// 默认测试宝宝
{
  name: '测试宝宝',
  birthDate: '2023-10-15',
  gestationalWeeks: 36,
  gestationalDays: 3
}
```

## 覆盖率目标

| 组件类型 | 分支覆盖率 | 函数覆盖率 | 行覆盖率 | 语句覆盖率 |
|---------|-----------|-----------|---------|-----------|
| 全局 | 75% | 75% | 75% | 75% |
| 年龄计算器 | 90% | 90% | 90% | 90% |
| 认证模块 | 85% | 85% | 85% | 85% |
| 数据验证 | 85% | 85% | 85% | 85% |

## 性能基准

| 测试类型 | 目标响应时间 |
|---------|-------------|
| 认证API | < 500ms |
| CRUD操作 | < 300ms |
| 简单查询 | < 100ms |
| 复杂查询 | < 500ms |
| JWT验证 | < 50ms |

## 编写测试

### 单元测试示例

```typescript
// src/utils/__tests__/age-calculator.test.ts
import { calculateAge } from '../age-calculator'

describe('calculateAge', () => {
  it('应该正确计算足月儿的年龄', () => {
    const baby = {
      birthDate: new Date('2023-10-15'),
      gestationalWeeks: 40,
      gestationalDays: 0,
    }

    const result = calculateAge(baby)

    expect(result.actualAge.months).toBe(3)
    expect(result.correctedAge.months).toBe(3)
  })
})
```

### 集成测试示例

```typescript
// tests/integration/auth-api.test.ts
import { POST as loginHandler } from '@/app/api/auth/login/route'

describe('POST /api/auth/login', () => {
  it('应该成功登录现有用户', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        phone: '13800138000',
        verificationCode: '1234',
      }),
    })

    const response = await loginHandler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### E2E测试示例

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test('用户应该能够注册和登录', async ({ page }) => {
  await page.goto('/register')
  
  await page.fill('input[name="phone"]', '13900139000')
  await page.click('button:has-text("发送验证码")')
  await page.fill('input[name="verificationCode"]', '1234')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/create-profile')
})
```

## 最佳实践

### 1. 测试命名

- 使用描述性的测试名称
- 遵循"应该...当...时"的格式
- 中文命名以提高可读性

### 2. 测试结构

```typescript
describe('功能模块', () => {
  describe('特定功能', () => {
    it('应该满足特定条件', () => {
      // Arrange - 准备
      const input = createTestData()
      
      // Act - 执行
      const result = functionUnderTest(input)
      
      // Assert - 断言
      expect(result).toEqual(expected)
    })
  })
})
```

### 3. 测试数据

- 使用工厂函数创建测试数据
- 每个测试使用独立的数据
- 避免测试之间的依赖

### 4. 异步测试

```typescript
it('应该处理异步操作', async () => {
  await expect(asyncFunction()).resolves.toEqual(expectedValue)
})
```

### 5. 错误测试

```typescript
it('应该正确处理错误情况', () => {
  expect(() => functionThatThrows()).toThrow('Expected error message')
})
```

## 持续集成

### GitHub Actions

项目配置了完整的CI/CD流水线：

1. **代码检查**: ESLint、TypeScript类型检查
2. **单元测试**: Jest测试套件
3. **集成测试**: API和数据库测试
4. **安全测试**: 依赖审计、权限验证
5. **E2E测试**: Playwright自动化测试
6. **性能测试**: 响应时间基准测试
7. **覆盖率报告**: Codecov集成

### 质量门禁

- 所有测试必须通过
- 代码覆盖率不低于75%
- 无高危安全漏洞
- 构建成功

## 调试测试

### Jest调试

```bash
# 调试特定测试
npm test -- --testNamePattern="测试名称"

# 监听模式调试
npm run test:watch

# 详细输出
npm test -- --verbose
```

### E2E调试

```bash
# 头显模式（看到浏览器操作）
npm run test:e2e:headed

# 调试特定测试
npx playwright test auth-flow.spec.ts --debug

# 查看测试报告
npm run test:e2e:report
```

## 故障排查

### 常见问题

1. **测试超时**
   - 检查异步操作是否正确等待
   - 增加超时时间配置
   - 检查测试数据库连接

2. **E2E测试失败**
   - 确保开发服务器运行
   - 检查测试数据设置
   - 验证选择器是否正确

3. **覆盖率不足**
   - 添加边界情况测试
   - 测试错误处理路径
   - 检查未测试的代码分支

## 贡献测试

1. 为新功能编写测试
2. 遵循现有测试模式
3. 确保测试独立性
4. 添加适当的文档注释
5. 运行完整测试套件验证

## 测试报告

测试完成后会生成以下报告：

- **覆盖率报告**: `coverage/lcov-report/index.html`
- **E2E报告**: `playwright-report/index.html`
- **性能报告**: `lighthouse-report.html`

定期查看这些报告以了解项目质量状况。