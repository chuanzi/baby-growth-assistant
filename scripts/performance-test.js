#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * 性能测试脚本
 * 用于运行各种性能测试和基准测试
 */

/**
 * 运行命令并返回结果
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * 分析构建产物大小
 */
async function analyzeBundleSize() {
  console.log('📦 分析构建产物大小...');
  
  try {
    const buildResult = await runCommand('npm', ['run', 'build']);
    
    const buildDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(buildDir, 'static');
    
    if (await pathExists(staticDir)) {
      const stats = await analyzeBuildDirectory(staticDir);
      return stats;
    } else {
      throw new Error('构建目录不存在，请先运行 npm run build');
    }
  } catch (error) {
    console.error('❌ 构建分析失败:', error.message);
    throw error;
  }
}

/**
 * 检查路径是否存在
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 分析构建目录
 */
async function analyzeBuildDirectory(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const stats = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    files: [],
    jsFiles: [],
    cssFiles: [],
  };

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      const subStats = await analyzeBuildDirectory(filePath);
      stats.totalSize += subStats.totalSize;
      stats.jsSize += subStats.jsSize;
      stats.cssSize += subStats.cssSize;
      stats.files.push(...subStats.files);
      stats.jsFiles.push(...subStats.jsFiles);
      stats.cssFiles.push(...subStats.cssFiles);
    } else {
      const stat = await fs.stat(filePath);
      const fileInfo = {
        name: file.name,
        path: filePath.replace(process.cwd(), ''),
        size: stat.size,
        sizeKB: Math.round(stat.size / 1024),
      };

      stats.files.push(fileInfo);
      stats.totalSize += stat.size;

      if (file.name.endsWith('.js')) {
        stats.jsSize += stat.size;
        stats.jsFiles.push(fileInfo);
      } else if (file.name.endsWith('.css')) {
        stats.cssSize += stat.size;
        stats.cssFiles.push(fileInfo);
      }
    }
  }

  return stats;
}

/**
 * 运行内存泄漏测试
 */
async function runMemoryLeakTest() {
  console.log('🧠 运行内存泄漏测试...');
  
  const testScript = `
    const puppeteer = require('puppeteer');
    
    (async () => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      const measurements = [];
      
      for (let i = 0; i < 10; i++) {
        await page.goto('http://localhost:3000');
        await page.waitForLoadEvent('networkidle');
        
        const metrics = await page.metrics();
        measurements.push({
          iteration: i + 1,
          jsHeapSize: metrics.JSHeapUsedSize,
          jsHeapSizeLimit: metrics.JSHeapTotalSize,
          domNodes: metrics.Nodes,
        });
        
        console.log(\`Iteration \${i + 1}: JS Heap \${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB\`);
      }
      
      await browser.close();
      
      // 检查内存是否持续增长
      const firstMeasurement = measurements[0];
      const lastMeasurement = measurements[measurements.length - 1];
      const memoryIncrease = lastMeasurement.jsHeapSize - firstMeasurement.jsHeapSize;
      
      console.log(\`Memory change: \${Math.round(memoryIncrease / 1024 / 1024)}MB\`);
      
      if (memoryIncrease > 10 * 1024 * 1024) { // 10MB增长认为有泄漏
        console.error('⚠️  Potential memory leak detected');
        process.exit(1);
      } else {
        console.log('✅ No memory leaks detected');
      }
    })();
  `;

  try {
    await fs.writeFile(path.join(process.cwd(), 'temp-memory-test.js'), testScript);
    await runCommand('node', ['temp-memory-test.js']);
    await fs.unlink(path.join(process.cwd(), 'temp-memory-test.js'));
  } catch (error) {
    console.error('❌ 内存泄漏测试失败:', error.message);
    throw error;
  }
}

/**
 * 运行API性能测试
 */
async function runAPIPerformanceTest() {
  console.log('🚀 运行API性能测试...');
  
  const apiEndpoints = [
    '/api/babies',
    '/api/records/timeline/test-baby-id',
    '/api/milestones/test-baby-id',
    '/api/ai/daily-content/test-baby-id',
  ];

  const results = [];

  for (const endpoint of apiEndpoints) {
    console.log(`📊 测试端点: ${endpoint}`);
    
    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        const duration = Date.now() - start;
        times.push(duration);
        
        if (!response.ok && response.status !== 401) { // 401是预期的（未登录）
          console.warn(`⚠️  HTTP ${response.status} for ${endpoint}`);
        }
      } catch (error) {
        console.warn(`⚠️  请求失败 ${endpoint}:`, error.message);
        times.push(5000); // 记录为5秒超时
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    results.push({
      endpoint,
      avgTime: Math.round(avgTime),
      minTime,
      maxTime,
      times,
    });

    console.log(`   平均响应时间: ${Math.round(avgTime)}ms`);
    console.log(`   最快: ${minTime}ms, 最慢: ${maxTime}ms`);
  }

  return results;
}

/**
 * 生成性能测试报告
 */
function generatePerformanceTestReport(bundleStats, apiResults) {
  const report = {
    timestamp: new Date().toISOString(),
    bundle: {
      totalSizeKB: Math.round(bundleStats.totalSize / 1024),
      jsSizeKB: Math.round(bundleStats.jsSize / 1024),
      cssSizeKB: Math.round(bundleStats.cssSize / 1024),
      largestJSFiles: bundleStats.jsFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 5)
        .map(f => ({ name: f.name, sizeKB: f.sizeKB })),
    },
    api: {
      averageResponseTime: Math.round(
        apiResults.reduce((sum, result) => sum + result.avgTime, 0) / apiResults.length
      ),
      slowestEndpoint: apiResults.reduce((prev, current) => 
        prev.avgTime > current.avgTime ? prev : current
      ),
      fastestEndpoint: apiResults.reduce((prev, current) => 
        prev.avgTime < current.avgTime ? prev : current
      ),
      results: apiResults,
    },
    recommendations: [],
  };

  // 生成建议
  if (report.bundle.totalSizeKB > 500) {
    report.recommendations.push('🔍 构建产物总大小超过500KB，建议优化代码分割');
  }

  if (report.bundle.jsSizeKB > 300) {
    report.recommendations.push('📦 JavaScript包大小超过300KB，建议移除未使用的依赖');
  }

  if (report.api.averageResponseTime > 500) {
    report.recommendations.push('⚡ API平均响应时间较慢，建议优化数据库查询和添加缓存');
  }

  const slowEndpoints = apiResults.filter(r => r.avgTime > 1000);
  if (slowEndpoints.length > 0) {
    report.recommendations.push(`🐌 以下端点响应时间过长: ${slowEndpoints.map(e => e.endpoint).join(', ')}`);
  }

  return report;
}

/**
 * 生成HTML报告
 */
function generateHTMLTestReport(report) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能基准测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e1e5e9; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .recommendations { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; }
        .recommendation-item { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 性能基准测试报告</h1>
            <p>生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <div class="section">
            <h2>📦 构建产物分析</h2>
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-value">${report.bundle.totalSizeKB}KB</div>
                    <div>总大小</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.bundle.jsSizeKB}KB</div>
                    <div>JavaScript</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.bundle.cssSizeKB}KB</div>
                    <div>CSS</div>
                </div>
            </div>
            
            <h3>最大的JS文件</h3>
            <table class="table">
                <thead>
                    <tr><th>文件名</th><th>大小</th></tr>
                </thead>
                <tbody>
                    ${report.bundle.largestJSFiles.map(file => 
                        `<tr><td>${file.name}</td><td>${file.sizeKB}KB</td></tr>`
                    ).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🚀 API性能测试</h2>
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-value">${report.api.averageResponseTime}ms</div>
                    <div>平均响应时间</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.api.fastestEndpoint.avgTime}ms</div>
                    <div>最快端点</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.api.slowestEndpoint.avgTime}ms</div>
                    <div>最慢端点</div>
                </div>
            </div>

            <h3>详细结果</h3>
            <table class="table">
                <thead>
                    <tr><th>端点</th><th>平均时间</th><th>最快</th><th>最慢</th></tr>
                </thead>
                <tbody>
                    ${report.api.results.map(result => 
                        `<tr>
                            <td>${result.endpoint}</td>
                            <td>${result.avgTime}ms</td>
                            <td>${result.minTime}ms</td>
                            <td>${result.maxTime}ms</td>
                        </tr>`
                    ).join('')}
                </tbody>
            </table>
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="section">
            <h2>💡 优化建议</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => 
                    `<div class="recommendation-item">${rec}</div>`
                ).join('')}
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始性能基准测试...');
    
    // 分析构建产物
    const bundleStats = await analyzeBundleSize();
    console.log('✅ 构建分析完成');
    
    // API性能测试
    const apiResults = await runAPIPerformanceTest();
    console.log('✅ API性能测试完成');
    
    // 生成报告
    const report = generatePerformanceTestReport(bundleStats, apiResults);
    const htmlContent = generateHTMLTestReport(report);
    
    // 保存报告
    const reportsDir = path.join(process.cwd(), 'performance-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(reportsDir, `benchmark-test-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    
    console.log('\n🎉 性能基准测试完成!');
    console.log(`📦 构建大小: ${report.bundle.totalSizeKB}KB (JS: ${report.bundle.jsSizeKB}KB)`);
    console.log(`⚡ API平均响应: ${report.api.averageResponseTime}ms`);
    console.log(`📋 详细报告: file://${htmlPath}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 优化建议:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
  } catch (error) {
    console.error('💥 性能测试失败:', error);
    process.exit(1);
  }
}

// 如果作为脚本运行
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  runAPIPerformanceTest,
  generatePerformanceTestReport,
};