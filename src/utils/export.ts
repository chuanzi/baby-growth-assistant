import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FeedingRecord, SleepRecord, Baby } from '@/types';
import { formatDateTime, formatDuration } from './time-helpers';

interface ExportData {
  baby: Baby;
  feedingRecords: FeedingRecord[];
  sleepRecords: SleepRecord[];
  dateRange: {
    start: string;
    end: string;
  };
}

// 导出PDF报告
export function exportToPDF(data: ExportData) {
  const doc = new jsPDF();
  
  // 设置字体（支持中文）
  doc.setFont('helvetica');
  
  // 标题
  doc.setFontSize(20);
  doc.text('宝宝成长记录报告', 20, 30);
  
  // 宝宝信息
  doc.setFontSize(14);
  doc.text(`宝宝姓名: ${data.baby.name}`, 20, 50);
  doc.text(`出生日期: ${new Date(data.baby.birthDate).toLocaleDateString('zh-CN')}`, 20, 65);
  doc.text(`胎龄: ${data.baby.gestationalWeeks}周${data.baby.gestationalDays || 0}天`, 20, 80);
  doc.text(`报告日期: ${data.dateRange.start} 至 ${data.dateRange.end}`, 20, 95);
  
  let currentY = 120;
  
  // 喂养记录表格
  if (data.feedingRecords.length > 0) {
    doc.setFontSize(16);
    doc.text('喂养记录', 20, currentY);
    currentY += 10;
    
    const feedingTableData = data.feedingRecords.map(record => [
      formatDateTime(record.timestamp),
      getFeedingTypeText(record.type),
      record.amountOrDuration,
      record.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['时间', '类型', '量/时长', '备注']],
      body: feedingTableData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });
    
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }
  
  // 睡眠记录表格
  if (data.sleepRecords.length > 0) {
    // 检查是否需要新页面
    if (currentY > 200) {
      doc.addPage();
      currentY = 30;
    }
    
    doc.setFontSize(16);
    doc.text('睡眠记录', 20, currentY);
    currentY += 10;
    
    const sleepTableData = data.sleepRecords.map(record => [
      formatDateTime(record.startTime),
      formatDateTime(record.endTime),
      formatDuration(record.durationMinutes),
      record.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['开始时间', '结束时间', '睡眠时长', '备注']],
      body: sleepTableData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [92, 184, 92] },
    });
  }
  
  // 统计摘要
  if (currentY < 200) {
    currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY + 30 || currentY + 30;
  } else {
    doc.addPage();
    currentY = 30;
  }
  
  doc.setFontSize(16);
  doc.text('统计摘要', 20, currentY);
  currentY += 20;
  
  doc.setFontSize(12);
  doc.text(`总喂养次数: ${data.feedingRecords.length}`, 20, currentY);
  currentY += 15;
  
  const totalSleepMinutes = data.sleepRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  doc.text(`总睡眠时长: ${formatDuration(totalSleepMinutes)}`, 20, currentY);
  currentY += 15;
  
  doc.text(`睡眠次数: ${data.sleepRecords.length}`, 20, currentY);
  
  // 页脚
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`第 ${i} 页 / 共 ${pageCount} 页`, doc.internal.pageSize.width - 50, doc.internal.pageSize.height - 10);
    doc.text('宝宝成长助手 - 生成于 ' + new Date().toLocaleDateString('zh-CN'), 20, doc.internal.pageSize.height - 10);
  }
  
  // 下载文件
  const fileName = `${data.baby.name}_成长记录_${data.dateRange.start}_${data.dateRange.end}.pdf`;
  doc.save(fileName);
}

// 导出CSV格式
export function exportToCSV(data: ExportData, type: 'feeding' | 'sleep') {
  let csvContent = '';
  let fileName = '';
  
  if (type === 'feeding') {
    csvContent = '时间,类型,量/时长,备注\n';
    data.feedingRecords.forEach(record => {
      csvContent += `"${formatDateTime(record.timestamp)}","${getFeedingTypeText(record.type)}","${record.amountOrDuration}","${record.notes || ''}"\n`;
    });
    fileName = `${data.baby.name}_喂养记录_${data.dateRange.start}_${data.dateRange.end}.csv`;
  } else {
    csvContent = '开始时间,结束时间,睡眠时长,备注\n';
    data.sleepRecords.forEach(record => {
      csvContent += `"${formatDateTime(record.startTime)}","${formatDateTime(record.endTime)}","${formatDuration(record.durationMinutes)}","${record.notes || ''}"\n`;
    });
    fileName = `${data.baby.name}_睡眠记录_${data.dateRange.start}_${data.dateRange.end}.csv`;
  }
  
  // 创建下载链接
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 获取喂养类型文本
function getFeedingTypeText(type: string): string {
  switch (type) {
    case 'breast':
      return '母乳';
    case 'formula':
      return '配方奶';
    case 'solid':
      return '辅食';
    default:
      return type;
  }
}

// 生成周报/月报数据
export async function generateReport(babyId: string, type: 'week' | 'month'): Promise<ExportData | null> {
  try {
    const now = new Date();
    let startDate: Date;
    const endDate = new Date(now);
    
    if (type === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    }
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // 获取宝宝信息
    const babyResponse = await fetch(`/api/babies/${babyId}`);
    if (!babyResponse.ok) throw new Error('Failed to fetch baby info');
    const baby = await babyResponse.json();
    
    // 获取喂养记录
    const feedingResponse = await fetch(`/api/records/feeding?babyId=${babyId}&start=${startDateStr}&end=${endDateStr}`);
    const feedingData = feedingResponse.ok ? await feedingResponse.json() : { records: [] };
    
    // 获取睡眠记录
    const sleepResponse = await fetch(`/api/records/sleep?babyId=${babyId}&start=${startDateStr}&end=${endDateStr}`);
    const sleepData = sleepResponse.ok ? await sleepResponse.json() : { records: [] };
    
    return {
      baby: baby.baby || baby,
      feedingRecords: feedingData.records || [],
      sleepRecords: sleepData.records || [],
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
    };
  } catch (error) {
    console.error('Failed to generate report:', error);
    return null;
  }
}