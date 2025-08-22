import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SupabaseAuthProvider } from "@/lib/supabase-auth-context";
import "./globals.css";

// 字体优化：启用display swap，减少字体阻塞渲染时间
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // 非关键字体延迟加载
});

// SEO和性能优化的metadata
export const metadata: Metadata = {
  title: {
    default: "宝宝成长助手",
    template: "%s - 宝宝成长助手"
  },
  description: "专业的早产儿成长跟踪平台，提供个性化的发育指导和记录功能",
  keywords: ["早产儿", "宝宝成长", "发育跟踪", "里程碑记录", "喂养记录", "睡眠记录"],
  authors: [{ name: "宝宝成长助手团队" }],
  creator: "宝宝成长助手团队",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "宝宝成长助手",
    description: "专业的早产儿成长跟踪平台",
    siteName: "宝宝成长助手",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// 移动端视口优化
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <head>
        {/* 预连接到外部资源 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS预解析 */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* PWA相关 */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="宝宝成长助手" />
        
        {/* 性能提示 */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <SupabaseAuthProvider>
          <div id="app-root" className="min-h-screen">
            {children}
          </div>
          
          {/* 性能监控脚本占位 */}
          <div id="performance-monitor" style={{ display: 'none' }}></div>
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
