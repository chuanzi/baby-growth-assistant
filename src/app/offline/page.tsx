import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '离线模式 - 宝宝成长助手',
  description: '您当前处于离线状态，部分功能可能受限',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25V21.75m0 0l-3.536-3.536M12 21.75l3.536-3.536"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            离线模式
          </h1>
          <p className="text-muted-foreground">
            您当前处于离线状态，网络连接恢复后可继续使用完整功能
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">离线可用功能</h2>
          <ul className="text-sm space-y-2 text-left">
            <li className="flex items-center">
              <svg className="w-4 h-4 text-accent mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              查看已缓存的宝宝资料
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-accent mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              浏览历史记录和里程碑
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-accent mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              创建离线记录（稍后同步）
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors touch-friendly"
          >
            重试连接
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors touch-friendly"
          >
            返回上一页
          </button>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          <p>网络恢复后，您的离线数据将自动同步</p>
        </div>
      </div>
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // 监听网络状态变化
            window.addEventListener('online', function() {
              // 网络恢复，自动刷新
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            });
            
            // 检查Service Worker状态
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(function(registration) {
                console.log('Service Worker ready');
              });
            }
          `
        }}
      />
    </div>
  );
}