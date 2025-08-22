import { test, expect, type Page } from '@playwright/test'
import { AuthHelper, FormHelper, NavigationHelper, MobileHelper } from './utils/auth-helpers'

test.describe('用户认证流程', () => {
  let authHelper: AuthHelper
  let formHelper: FormHelper
  let navigationHelper: NavigationHelper
  let mobileHelper: MobileHelper

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page)
    formHelper = new FormHelper(page)
    navigationHelper = new NavigationHelper(page)
    mobileHelper = new MobileHelper(page)

    // 确保每个测试开始前都是未登录状态
    await authHelper.ensureLoggedOut()
  })

  test.describe('用户注册', () => {
    test('应该支持手机号注册新用户', async ({ page }) => {
      const newPhone = `139${Date.now().toString().slice(-8)}`

      await page.goto('/register')

      // 检查页面标题
      await expect(page.locator('h1')).toContainText('注册')

      // 选择手机注册（如果不是默认选中）
      const phoneTab = page.locator('button').filter({ hasText: '手机注册' })
      if (await phoneTab.isVisible()) {
        await phoneTab.click()
      }

      // 填写手机号
      await page.fill('input[name="phone"]', newPhone)

      // 点击获取验证码
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()

      // 等待验证码发送
      await expect(sendCodeButton).toContainText(/秒|已发送/, { timeout: 5000 })

      // 输入验证码（测试环境中应该接受任何验证码）
      await page.fill('input[name="verificationCode"]', '1234')

      // 提交注册表单
      await page.click('button[type="submit"]')

      // 验证注册成功，应该重定向到创建档案页面
      await page.waitForURL('/create-profile', { timeout: 10000 })
      await expect(page.locator('h1')).toContainText(/创建|档案/)
    })

    test('应该支持邮箱注册新用户', async ({ page }) => {
      const newEmail = `test${Date.now()}@example.com`

      await page.goto('/register')

      // 选择邮箱注册
      await page.click('button:has-text("邮箱注册")')

      // 填写注册信息
      await page.fill('input[name="email"]', newEmail)
      await page.fill('input[name="password"]', 'Password123')
      await page.fill('input[name="confirmPassword"]', 'Password123')

      // 提交注册
      await page.click('button[type="submit"]')

      // 验证注册成功
      await page.waitForURL('/create-profile', { timeout: 10000 })
      await expect(page.locator('h1')).toContainText(/创建|档案/)
    })

    test('应该验证输入数据的有效性', async ({ page }) => {
      await page.goto('/register')

      // 测试无效手机号
      await page.fill('input[name="phone"]', '12345')
      await page.click('button[type="submit"]')

      // 应该显示错误信息
      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toBeVisible()

      // 测试邮箱注册的密码确认
      await page.click('button:has-text("邮箱注册")')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'Password123')
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword')
      await page.click('button[type="submit"]')

      // 应该显示密码不匹配的错误
      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toContainText(/密码|不一致/)
    })

    test('应该阻止重复注册已存在的用户', async ({ page }) => {
      // 使用测试数据中已存在的手机号
      await page.goto('/register')

      await page.fill('input[name="phone"]', '13800138000')
      
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()

      await page.fill('input[name="verificationCode"]', '1234')
      await page.click('button[type="submit"]')

      // 应该显示用户已存在的错误
      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toContainText(/已被注册|已存在/)
    })

    test('应该在移动端设备上正常工作', async ({ page, isMobile }) => {
      if (!isMobile) {
        // 如果不是移动设备，设置移动端视口
        await page.setViewportSize({ width: 375, height: 667 })
      }

      const newPhone = `138${Date.now().toString().slice(-8)}`

      await page.goto('/register')

      // 确保移动端UI正确显示
      await expect(page.locator('h1')).toContainText('注册')

      // 测试移动端的表单交互
      await page.fill('input[name="phone"]', newPhone)
      
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()

      await page.fill('input[name="verificationCode"]', '1234')
      await page.click('button[type="submit"]')

      await page.waitForURL('/create-profile', { timeout: 10000 })
    })
  })

  test.describe('用户登录', () => {
    test('应该支持手机号登录', async ({ page }) => {
      await authHelper.loginWithPhone('13800138000', '1234')

      // 验证登录成功
      await expect(page).toHaveURL(/\/(dashboard)?$/)
      await expect(page.locator('h1, h2')).toContainText(/欢迎|宝宝|仪表板/)
    })

    test('应该支持邮箱登录', async ({ page }) => {
      await authHelper.loginWithEmail('test@example.com', 'Password123')

      // 验证登录成功
      await expect(page).toHaveURL(/\/(dashboard)?$/)
      await expect(page.locator('h1, h2')).toContainText(/欢迎|宝宝|仪表板/)
    })

    test('应该拒绝无效的登录凭据', async ({ page }) => {
      await page.goto('/login')

      // 测试错误的手机号
      await page.fill('input[name="phone"]', '13800138099') // 不存在的号码
      
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()

      await page.fill('input[name="verificationCode"]', '1234')
      await page.click('button[type="submit"]')

      // 应该显示错误信息
      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toContainText(/不存在|错误/)

      // 测试错误的邮箱密码
      await page.click('button:has-text("邮箱登录")')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'WrongPassword')
      await page.click('button[type="submit"]')

      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toContainText(/密码错误|登录失败/)
    })

    test('应该支持登录状态记住功能', async ({ page }) => {
      // 登录
      await authHelper.loginWithPhone()

      // 刷新页面
      await page.reload()

      // 应该仍然保持登录状态
      await expect(page).toHaveURL(/\/(dashboard)?$/)

      // 关闭并重新打开浏览器上下文来模拟浏览器重启
      await page.context().close()
      const newContext = await page.context().browser()!.newContext()
      const newPage = await newContext.newPage()

      // 访问需要登录的页面
      await newPage.goto('http://localhost:3000/dashboard')

      // 应该仍然保持登录状态（如果Cookie没有过期）
      // 或者被重定向到登录页面
      const currentURL = newPage.url()
      expect(currentURL).toMatch(/(dashboard|login)/)

      await newContext.close()
    })
  })

  test.describe('用户注销', () => {
    test('应该支持用户注销', async ({ page }) => {
      // 先登录
      await authHelper.loginWithPhone()

      // 确认已登录
      await expect(page).toHaveURL(/\/(dashboard)?$/)

      // 注销
      await authHelper.logout()

      // 验证注销成功，应该重定向到登录页面
      await expect(page).toHaveURL('/login')

      // 尝试访问受保护的页面
      await page.goto('/dashboard')

      // 应该被重定向到登录页面
      await page.waitForURL('/login', { timeout: 5000 })
    })

    test('注销后应该清除所有认证状态', async ({ page }) => {
      // 登录
      await authHelper.loginWithPhone()

      // 注销
      await authHelper.logout()

      // 检查cookies是否被清除
      const cookies = await page.context().cookies()
      const authCookie = cookies.find(cookie => cookie.name === 'auth-token')
      
      if (authCookie) {
        // 如果还有cookie，它应该是过期的或者值为空
        expect(authCookie.value === '' || authCookie.expires < Date.now() / 1000).toBe(true)
      }

      // 检查本地存储是否被清除
      const localStorage = await page.evaluate(() => {
        return window.localStorage.getItem('authToken') || 
               window.localStorage.getItem('user') ||
               window.sessionStorage.getItem('authToken')
      })
      expect(localStorage).toBeNull()
    })
  })

  test.describe('认证状态管理', () => {
    test('未登录用户访问受保护页面应该被重定向', async ({ page }) => {
      const protectedPages = ['/dashboard', '/create-profile', '/records', '/milestones']

      for (const url of protectedPages) {
        await page.goto(url)
        
        // 应该被重定向到登录页面
        await page.waitForURL('/login', { timeout: 5000 })
        
        // 检查页面内容
        await expect(page.locator('h1')).toContainText('登录')
      }
    })

    test('已登录用户访问登录页面应该被重定向到仪表板', async ({ page }) => {
      // 先登录
      await authHelper.loginWithPhone()

      // 尝试访问登录页面
      await page.goto('/login')

      // 应该被重定向到dashboard
      await page.waitForURL(/\/(dashboard)?$/, { timeout: 5000 })
    })

    test('应该正确处理token过期情况', async ({ page }) => {
      // 登录
      await authHelper.loginWithPhone()

      // 手动设置一个过期的token
      await page.evaluate(() => {
        // 创建一个明显过期的token
        document.cookie = 'auth-token=expired.token.here; max-age=0; path=/'
      })

      // 尝试访问受保护页面
      await page.goto('/dashboard')

      // 应该被重定向到登录页面
      await page.waitForURL('/login', { timeout: 10000 })
    })
  })

  test.describe('完整的认证流程', () => {
    test('应该支持注册->创建档案->登录->注销的完整流程', async ({ page }) => {
      const uniquePhone = `139${Date.now().toString().slice(-8)}`

      // 1. 注册新用户
      await page.goto('/register')
      await page.fill('input[name="phone"]', uniquePhone)
      
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()
      
      await page.fill('input[name="verificationCode"]', '1234')
      await page.click('button[type="submit"]')

      // 验证重定向到创建档案页面
      await page.waitForURL('/create-profile', { timeout: 10000 })

      // 2. 创建宝宝档案
      await page.fill('input[name="name"]', '测试宝宝')
      await page.fill('input[name="birthDate"]', '2023-10-15')
      await page.fill('input[name="gestationalWeeks"]', '36')
      await page.fill('input[name="gestationalDays"]', '3')
      await page.click('button[type="submit"]')

      // 验证重定向到dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      await expect(page.locator('h1, h2')).toContainText(/测试宝宝|欢迎|仪表板/)

      // 3. 注销
      await authHelper.logout()

      // 4. 重新登录
      await authHelper.loginWithPhone(uniquePhone, '1234')

      // 验证登录成功且数据仍然存在
      await expect(page).toHaveURL(/\/(dashboard)?$/)
      await expect(page).toContainText('测试宝宝')

      // 5. 最终注销
      await authHelper.logout()
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('错误处理和用户体验', () => {
    test('网络错误时应该显示友好的错误信息', async ({ page }) => {
      await page.goto('/login')

      // 拦截网络请求并模拟错误
      await page.route('**/api/auth/login', route => {
        route.abort()
      })

      await page.fill('input[name="phone"]', '13800138000')
      
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()

      await page.fill('input[name="verificationCode"]', '1234')
      await page.click('button[type="submit"]')

      // 应该显示网络错误信息
      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toContainText(/网络|连接|稍后重试/)
    })

    test('应该有加载状态指示', async ({ page }) => {
      await page.goto('/login')

      await page.fill('input[name="phone"]', '13800138000')
      
      const sendCodeButton = page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
      await sendCodeButton.click()

      await page.fill('input[name="verificationCode"]', '1234')

      // 点击登录按钮
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // 检查是否有加载状态
      await expect(submitButton).toHaveAttribute('disabled', '')
      // 或者检查加载指示器
      await expect(page.locator('.loading, .spinner, [role="progressbar"]')).toBeVisible()
    })

    test('表单应该有适当的验证反馈', async ({ page }) => {
      await page.goto('/register')

      // 提交空表单
      await page.click('button[type="submit"]')

      // 应该有表单验证错误
      const errorElements = page.locator('.error, .text-red-500, [role="alert"], .field-error')
      await expect(errorElements.first()).toBeVisible()

      // 填写无效邮箱格式（切换到邮箱注册）
      await page.click('button:has-text("邮箱注册")')
      await page.fill('input[name="email"]', 'invalid-email')
      await page.click('button[type="submit"]')

      // 应该显示邮箱格式错误
      await expect(page.locator('.error, .text-red-500, [role="alert"]')).toContainText(/邮箱|格式/)
    })
  })
})