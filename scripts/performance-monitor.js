#!/usr/bin/env node

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

/**
 * 性能监控脚本
 * 用于自动化性能测试和报告生成
 */

const PERFORMANCE_CONFIG = {
  // 性能预算配置
  budget: {
    fcp: 2000,      // First Contentful Paint < 2s
    lcp: 2500,      // Largest Contentful Paint < 2.5s
    cls: 0.1,       // Cumulative Layout Shift < 0.1
    fid: 100,       // First Input Delay < 100ms
    ttfb: 600,      // Time to First Byte < 600ms
    bundleSize: 512 * 1024, // Bundle size < 512KB
  },
  
  // 测试URL配置
  urls: [
    { name: 'Home', url: 'http://localhost:3000' },
    { name: 'Dashboard', url: 'http://localhost:3000/dashboard' },
    { name: 'Login', url: 'http://localhost:3000/login' },
    { name: 'Records', url: 'http://localhost:3000/records' },
    { name: 'Milestones', url: 'http://localhost:3000/milestones' },
  ],
  
  // Lighthouse配置
  lighthouseConfig: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1638.4,
        uploadThroughputKbps: 675,
      },
      emulatedUserAgent: 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4695.0 Mobile Safari/537.36 Chrome-Lighthouse',
    },
    categories: {
      performance: { weight: 1 },
      accessibility: { weight: 1 },
      'best-practices': { weight: 1 },
      seo: { weight: 1 },
      pwa: { weight: 1 },
    }
  }
};

/**
 * 启动Chrome浏览器
 */
async function launchChrome() {
  return await chromeLauncher.launch({
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
    ]
  });
}

/**
 * 运行Lighthouse测试
 */
async function runLighthouse(url, chrome) {
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options, PERFORMANCE_CONFIG.lighthouseConfig);
  return runnerResult;
}

/**
 * 分析性能结果
 */
function analyzePerformance(results, budget) {
  const analysis = {
    passed: [],
    failed: [],
    warnings: [],
    score: 0,
  };

  const metrics = results.lhr.audits;
  const performanceScore = results.lhr.categories.performance.score * 100;
  
  analysis.score = performanceScore;

  // 检查Core Web Vitals
  const coreWebVitals = {
    fcp: metrics['first-contentful-paint']?.numericValue,
    lcp: metrics['largest-contentful-paint']?.numericValue,
    cls: metrics['cumulative-layout-shift']?.numericValue,
    fid: metrics['max-potential-fid']?.numericValue,
    ttfb: metrics['server-response-time']?.numericValue,
  };

  Object.entries(coreWebVitals).forEach(([metric, value]) => {
    if (value !== undefined && budget[metric]) {
      if (value <= budget[metric]) {
        analysis.passed.push(`${metric.toUpperCase()}: ${Math.round(value)}ms (✓)`);
      } else {
        analysis.failed.push(`${metric.toUpperCase()}: ${Math.round(value)}ms (✗ > ${budget[metric]}ms)`);
      }
    }
  });

  // 检查资源大小
  const bundleSize = metrics['total-byte-weight']?.numericValue;
  if (bundleSize) {
    const bundleSizeKB = Math.round(bundleSize / 1024);
    if (bundleSize <= budget.bundleSize) {
      analysis.passed.push(`Bundle Size: ${bundleSizeKB}KB (✓)`);
    } else {
      analysis.failed.push(`Bundle Size: ${bundleSizeKB}KB (✗ > ${Math.round(budget.bundleSize / 1024)}KB)`);
    }
  }

  // 检查其他关键指标
  const opportunities = results.lhr.audits;
  Object.entries(opportunities).forEach(([key, audit]) => {
    if (audit.details && audit.details.overallSavingsMs > 1000) {
      analysis.warnings.push(`${audit.title}: 可节省 ${Math.round(audit.details.overallSavingsMs)}ms`);
    }
  });

  return analysis;
}

/**
 * 生成性能报告
 */
function generateReport(testResults) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      totalTests: testResults.length,
      averageScore: Math.round(testResults.reduce((sum, result) => sum + result.analysis.score, 0) / testResults.length),
      passedTests: testResults.filter(result => result.analysis.score >= 90).length,
      failedTests: testResults.filter(result => result.analysis.score < 70).length,
    },
    budget: PERFORMANCE_CONFIG.budget,
    results: testResults,
  };

  return report;
}

/**
 * 生成HTML报告
 */
function generateHTMLReport(report) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>宝宝成长助手 - 性能测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
        .summary-card .value { font-size: 32px; font-weight: bold; margin: 0; }
        .test-result { margin-bottom: 30px; border: 1px solid #e1e5e9; border-radius: 8px; overflow: hidden; }
        .test-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e1e5e9; display: flex; justify-content: space-between; align-items: center; }
        .test-content { padding: 20px; }
        .score { font-weight: bold; padding: 5px 15px; border-radius: 20px; }
        .score.excellent { background: #d4edda; color: #155724; }
        .score.good { background: #fff3cd; color: #856404; }
        .score.poor { background: #f8d7da; color: #721c24; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metrics-group h4 { color: #495057; margin-bottom: 10px; }
        .metric-item { padding: 8px 0; border-bottom: 1px solid #f1f3f4; }
        .metric-item:last-child { border-bottom: none; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .budget-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .budget-table th, .budget-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e1e5e9; }
        .budget-table th { background: #f8f9fa; font-weight: 600; }
        .timestamp { text-align: center; color: #6c757d; margin-top: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 宝宝成长助手 - 性能测试报告</h1>
            <p>自动化性能监控与优化建议</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>总体评分</h3>
                <p class="value">${report.summary.averageScore}</p>
            </div>
            <div class="summary-card">
                <h3>测试页面</h3>
                <p class="value">${report.summary.totalTests}</p>
            </div>
            <div class="summary-card">
                <h3>优秀页面</h3>
                <p class="value">${report.summary.passedTests}</p>
            </div>
            <div class="summary-card">
                <h3>需优化</h3>
                <p class="value">${report.summary.failedTests}</p>
            </div>
        </div>

        <h2>📊 性能预算</h2>
        <table class="budget-table">
            <thead>
                <tr>
                    <th>指标</th>
                    <th>目标值</th>
                    <th>描述</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>FCP (First Contentful Paint)</td><td>&lt; ${report.budget.fcp}ms</td><td>首次内容绘制时间</td></tr>
                <tr><td>LCP (Largest Contentful Paint)</td><td>&lt; ${report.budget.lcp}ms</td><td>最大内容绘制时间</td></tr>
                <tr><td>CLS (Cumulative Layout Shift)</td><td>&lt; ${report.budget.cls}</td><td>累积布局偏移</td></tr>
                <tr><td>FID (First Input Delay)</td><td>&lt; ${report.budget.fid}ms</td><td>首次输入延迟</td></tr>
                <tr><td>TTFB (Time to First Byte)</td><td>&lt; ${report.budget.ttfb}ms</td><td>首字节时间</td></tr>
                <tr><td>Bundle Size</td><td>&lt; ${Math.round(report.budget.bundleSize / 1024)}KB</td><td>JavaScript包大小</td></tr>
            </tbody>
        </table>

        <h2>📋 详细测试结果</h2>
        ${report.results.map(result => `
            <div class="test-result">
                <div class="test-header">
                    <h3>${result.name}</h3>
                    <span class="score ${result.analysis.score >= 90 ? 'excellent' : result.analysis.score >= 70 ? 'good' : 'poor'}">
                        ${result.analysis.score}/100
                    </span>
                </div>
                <div class="test-content">
                    <div class="metrics">
                        <div class="metrics-group">
                            <h4>✅ 通过的指标</h4>
                            ${result.analysis.passed.map(item => `<div class="metric-item passed">${item}</div>`).join('')}
                        </div>
                        <div class="metrics-group">
                            <h4>❌ 未达标指标</h4>
                            ${result.analysis.failed.map(item => `<div class="metric-item failed">${item}</div>`).join('')}
                        </div>
                        <div class="metrics-group">
                            <h4>⚠️ 优化建议</h4>
                            ${result.analysis.warnings.map(item => `<div class="metric-item warning">${item}</div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}

        <div class="timestamp">
            📅 生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}
        </div>
    </div>
</body>
</html>`;
  
  return html;
}

/**
 * 主测试函数
 */
async function runPerformanceTests() {
  console.log('🚀 开始性能测试...');
  
  let chrome;
  let testResults = [];

  try {
    chrome = await launchChrome();
    console.log('✅ Chrome 浏览器启动成功');

    for (const { name, url } of PERFORMANCE_CONFIG.urls) {
      console.log(`📊 测试页面: ${name} (${url})`);
      
      try {
        const result = await runLighthouse(url, chrome);
        const analysis = analyzePerformance(result, PERFORMANCE_CONFIG.budget);
        
        testResults.push({
          name,
          url,
          analysis,
          result,
        });

        console.log(`   评分: ${analysis.score}/100`);
        console.log(`   通过: ${analysis.passed.length} 项`);
        console.log(`   失败: ${analysis.failed.length} 项`);
        
      } catch (error) {
        console.error(`❌ 测试 ${name} 失败:`, error.message);
        testResults.push({
          name,
          url,
          analysis: { score: 0, passed: [], failed: [`测试失败: ${error.message}`], warnings: [] },
          error: error.message,
        });
      }
    }

  } catch (error) {
    console.error('❌ 性能测试失败:', error);
    throw error;
  } finally {
    if (chrome) {
      await chrome.kill();
      console.log('✅ Chrome 浏览器已关闭');
    }
  }

  return testResults;
}

/**
 * 保存报告文件
 */
async function saveReports(report) {
  const reportsDir = path.join(process.cwd(), 'performance-reports');
  
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // 保存JSON报告
  const jsonPath = path.join(reportsDir, `performance-report-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON 报告已保存: ${jsonPath}`);
  
  // 保存HTML报告
  const htmlPath = path.join(reportsDir, `performance-report-${timestamp}.html`);
  const htmlContent = generateHTMLReport(report);
  await fs.writeFile(htmlPath, htmlContent);
  console.log(`🌐 HTML 报告已保存: ${htmlPath}`);
  
  // 保存最新报告副本
  const latestHtmlPath = path.join(reportsDir, 'latest-report.html');
  await fs.writeFile(latestHtmlPath, htmlContent);
  console.log(`📋 最新报告: ${latestHtmlPath}`);

  return { jsonPath, htmlPath, latestHtmlPath };
}

/**
 * 主函数
 */
async function main() {
  try {
    const testResults = await runPerformanceTests();
    const report = generateReport(testResults);
    const { htmlPath } = await saveReports(report);
    
    console.log('\n🎉 性能测试完成!');
    console.log(`📊 平均得分: ${report.summary.averageScore}/100`);
    console.log(`✅ 优秀页面: ${report.summary.passedTests}/${report.summary.totalTests}`);
    console.log(`⚠️  需要优化: ${report.summary.failedTests}/${report.summary.totalTests}`);
    console.log(`📋 查看详细报告: file://${htmlPath}`);
    
    // 如果有失败的测试，退出码为1
    if (report.summary.failedTests > 0) {
      process.exit(1);
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
  runPerformanceTests,
  generateReport,
  saveReports,
  PERFORMANCE_CONFIG,
};