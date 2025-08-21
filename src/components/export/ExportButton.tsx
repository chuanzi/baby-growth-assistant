'use client';

import React, { useState } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportToPDF, exportToCSV, generateReport } from '@/utils/export';
import type { Baby } from '@/types';

interface ExportButtonProps {
  baby: Baby;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function ExportButton({ baby, variant = 'outline', size = 'sm' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (type: 'pdf' | 'csv-feeding' | 'csv-sleep', period: 'week' | 'month') => {
    setLoading(true);
    try {
      const data = await generateReport(baby.id, period);
      if (!data) {
        alert('生成报告失败，请稍后重试');
        return;
      }

      switch (type) {
        case 'pdf':
          exportToPDF(data);
          break;
        case 'csv-feeding':
          exportToCSV(data, 'feeding');
          break;
        case 'csv-sleep':
          exportToCSV(data, 'sleep');
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
      >
        <Download size={16} className="mr-1" />
        {loading ? '导出中...' : '导出'}
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <h4 className="font-medium text-gray-900 mb-3">选择导出格式</h4>
            
            {/* PDF导出 */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FileText size={14} className="mr-1" />
                PDF完整报告
              </h5>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport('pdf', 'week')}
                  className="w-full justify-start text-sm"
                >
                  近7天报告
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport('pdf', 'month')}
                  className="w-full justify-start text-sm"
                >
                  近30天报告
                </Button>
              </div>
            </div>

            {/* CSV导出 */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Calendar size={14} className="mr-1" />
                CSV数据表格
              </h5>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport('csv-feeding', 'week')}
                  className="w-full justify-start text-sm"
                >
                  喂养记录 (7天)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport('csv-sleep', 'week')}
                  className="w-full justify-start text-sm"
                >
                  睡眠记录 (7天)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport('csv-feeding', 'month')}
                  className="w-full justify-start text-sm"
                >
                  喂养记录 (30天)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExport('csv-sleep', 'month')}
                  className="w-full justify-start text-sm"
                >
                  睡眠记录 (30天)
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(false)}
              className="w-full"
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 遮罩层 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}