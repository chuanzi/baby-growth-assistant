import { Page, expect } from '@playwright/test'

export class AuthHelper {
  constructor(private page: Page) {}

  async loginWithPhone(phone: string = '13800138000', verificationCode: string = '1234') {
    await this.page.goto('/login')
    
    // 等待页面加载
    await expect(this.page.locator('h1')).toContainText('登录')
    
    // 选择手机登录（默认应该已经选中）
    const phoneTab = this.page.locator('button').filter({ hasText: '手机登录' })
    if (await phoneTab.isVisible()) {
      await phoneTab.click()
    }
    
    // 输入手机号
    await this.page.fill('input[name="phone"]', phone)
    
    // 点击发送验证码
    const sendCodeButton = this.page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
    await sendCodeButton.click()
    
    // 等待按钮状态变化
    await expect(sendCodeButton).toContainText(/秒|已发送/)
    
    // 输入验证码
    await this.page.fill('input[name="verificationCode"]', verificationCode)
    
    // 点击登录
    await this.page.click('button[type="submit"]')
    
    // 等待登录成功，应该重定向到首页或dashboard
    await this.page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 })
  }

  async loginWithEmail(email: string = 'test@example.com', password: string = 'Password123') {
    await this.page.goto('/login')
    
    // 等待页面加载
    await expect(this.page.locator('h1')).toContainText('登录')
    
    // 选择邮箱登录
    await this.page.click('button:has-text("邮箱登录")')
    
    // 输入邮箱
    await this.page.fill('input[name="email"]', email)
    
    // 输入密码
    await this.page.fill('input[name="password"]', password)
    
    // 点击登录
    await this.page.click('button[type="submit"]')
    
    // 等待登录成功
    await this.page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 })
  }

  async registerWithPhone(phone: string = '13900139000', verificationCode: string = '1234') {
    await this.page.goto('/register')
    
    // 等待页面加载
    await expect(this.page.locator('h1')).toContainText('注册')
    
    // 选择手机注册（默认应该已经选中）
    const phoneTab = this.page.locator('button').filter({ hasText: '手机注册' })
    if (await phoneTab.isVisible()) {
      await phoneTab.click()
    }
    
    // 输入手机号
    await this.page.fill('input[name="phone"]', phone)
    
    // 点击发送验证码
    const sendCodeButton = this.page.locator('button').filter({ hasText: /发送验证码|获取验证码/ })
    await sendCodeButton.click()
    
    // 等待按钮状态变化
    await expect(sendCodeButton).toContainText(/秒|已发送/)
    
    // 输入验证码
    await this.page.fill('input[name="verificationCode"]', verificationCode)
    
    // 点击注册
    await this.page.click('button[type="submit"]')
    
    // 等待注册成功，应该重定向到创建宝宝档案页面
    await this.page.waitForURL('/create-profile', { timeout: 10000 })
  }

  async registerWithEmail(email: string = 'newuser@example.com', password: string = 'Password123') {
    await this.page.goto('/register')
    
    // 等待页面加载
    await expect(this.page.locator('h1')).toContainText('注册')
    
    // 选择邮箱注册
    await this.page.click('button:has-text("邮箱注册")')
    
    // 输入邮箱
    await this.page.fill('input[name="email"]', email)
    
    // 输入密码
    await this.page.fill('input[name="password"]', password)
    
    // 输入确认密码
    await this.page.fill('input[name="confirmPassword"]', password)
    
    // 点击注册
    await this.page.click('button[type="submit"]')
    
    // 等待注册成功
    await this.page.waitForURL('/create-profile', { timeout: 10000 })
  }

  async logout() {
    // 尝试在不同位置找到退出登录按钮
    const logoutSelectors = [
      'button:has-text("退出登录")',
      'a:has-text("退出登录")',
      '[data-testid="logout-button"]',
      '.logout-button',
    ]

    let logoutButton = null
    for (const selector of logoutSelectors) {
      try {
        logoutButton = this.page.locator(selector).first()
        if (await logoutButton.isVisible({ timeout: 1000 })) {
          break
        }
      } catch {
        continue
      }
    }

    if (logoutButton && await logoutButton.isVisible()) {
      await logoutButton.click()
      // 等待重定向到登录页面
      await this.page.waitForURL('/login', { timeout: 5000 })
    } else {
      // 如果找不到退出登录按钮，直接清除cookies
      await this.page.context().clearCookies()
      await this.page.goto('/login')
    }
  }

  async ensureLoggedOut() {
    // 清除所有cookies和本地存储
    await this.page.context().clearCookies()
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // 访问首页，应该重定向到登录页
    await this.page.goto('/')
    
    // 检查是否在登录页面
    try {
      await expect(this.page.locator('h1')).toContainText('登录', { timeout: 5000 })
    } catch {
      // 如果不在登录页面，手动导航到登录页面
      await this.page.goto('/login')
    }
  }

  async ensureLoggedIn() {
    // 检查是否已经登录
    try {
      await this.page.goto('/dashboard')
      await this.page.waitForURL('/dashboard', { timeout: 3000 })
      
      // 如果能成功访问dashboard，说明已经登录
      return true
    } catch {
      // 如果无法访问dashboard，可能未登录
      return false
    }
  }

  async waitForAuthStateChange() {
    // 等待认证状态变化（登录或注销完成）
    await this.page.waitForTimeout(1000)
    
    // 等待网络请求稳定
    await this.page.waitForLoadState('networkidle')
  }
}

export class FormHelper {
  constructor(private page: Page) {}

  async fillFormField(name: string, value: string) {
    const input = this.page.locator(`input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`)
    await input.fill(value)
  }

  async selectFromDropdown(name: string, value: string) {
    const select = this.page.locator(`select[name="${name}"]`)
    await select.selectOption(value)
  }

  async clickSubmitButton(text: string = '提交') {
    await this.page.click(`button[type="submit"]:has-text("${text}")`)
  }

  async waitForFormSubmission() {
    // 等待表单提交完成
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(500)
  }

  async expectFormError(message: string) {
    await expect(this.page.locator('.error, .text-red-500, [role="alert"]')).toContainText(message)
  }

  async expectFormSuccess(message: string) {
    await expect(this.page.locator('.success, .text-green-500, [role="status"]')).toContainText(message)
  }
}

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToPage(path: string) {
    await this.page.goto(path)
    await this.page.waitForLoadState('networkidle')
  }

  async clickNavLink(text: string) {
    await this.page.click(`nav a:has-text("${text}")`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectCurrentUrl(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern)
  }

  async expectPageTitle(title: string) {
    await expect(this.page.locator('h1, h2')).toContainText(title)
  }
}

export class MobileHelper {
  constructor(private page: Page) {}

  async openMobileMenu() {
    // 查找移动端菜单按钮
    const menuButton = this.page.locator('button[aria-label*="menu"], .mobile-menu-button, [data-testid="mobile-menu-button"]')
    
    if (await menuButton.isVisible()) {
      await menuButton.click()
    }
  }

  async closeMobileMenu() {
    // 查找关闭按钮或点击遮罩层
    const closeButton = this.page.locator('button[aria-label*="close"], .close-menu, [data-testid="close-menu"]')
    
    if (await closeButton.isVisible()) {
      await closeButton.click()
    } else {
      // 如果没有明确的关闭按钮，尝试点击页面其他地方
      await this.page.click('main')
    }
  }

  async isMobileView() {
    const viewport = this.page.viewportSize()
    return viewport ? viewport.width < 768 : false
  }

  async swipeLeft() {
    await this.page.mouse.move(300, 200)
    await this.page.mouse.down()
    await this.page.mouse.move(100, 200)
    await this.page.mouse.up()
  }

  async swipeRight() {
    await this.page.mouse.move(100, 200)
    await this.page.mouse.down()
    await this.page.mouse.move(300, 200)
    await this.page.mouse.up()
  }
}