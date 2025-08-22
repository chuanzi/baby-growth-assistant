'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // 预渲染项数量
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  loadingThreshold?: number; // 触发加载更多的阈值
}

/**
 * 虚拟化列表组件
 * 用于处理大量数据时的内存优化和滚动性能
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loading = false,
  loadMore,
  hasMore = false,
  loadingThreshold = 200,
}: VirtualListProps<T>) {
  const { measurePerformance } = usePerformanceMonitor();
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // 计算可视区域的项目索引范围
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    return { start, end, visibleCount };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 可视项目
  const visibleItems = useMemo(() => {
    const measure = measurePerformance('VirtualList visible items calculation');
    const result = items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      top: (visibleRange.start + index) * itemHeight,
    }));
    measure.end();
    return result;
  }, [items, visibleRange.start, visibleRange.end, itemHeight, measurePerformance]);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);

    // 标记正在滚动
    isScrollingRef.current = true;
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 设置滚动结束检测
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    // 检查是否需要加载更多
    if (loadMore && hasMore && !loading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const currentScroll = scrollTop + containerHeight;
      
      if (scrollHeight - currentScroll <= loadingThreshold) {
        loadMore();
      }
    }
  }, [onScroll, loadMore, hasMore, loading, containerHeight, loadingThreshold]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`virtual-list-container ${className}`}>
      <div
        ref={containerRef}
        className="scroll-container overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div
          className="relative"
          style={{ height: totalHeight }}
        >
          {visibleItems.map(({ item, index, top }) => (
            <div
              key={index}
              className="absolute inset-x-0"
              style={{
                top,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
          
          {/* 加载更多指示器 */}
          {loading && (
            <div
              className="absolute inset-x-0 flex items-center justify-center"
              style={{
                top: items.length * itemHeight,
                height: 60,
              }}
            >
              <div className="loading-skeleton w-full h-12 rounded mx-4"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 网格虚拟化组件
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  gap = 8,
  overscan = 5,
  className = '',
}: VirtualGridProps<T>) {
  const { measurePerformance } = usePerformanceMonitor();
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算每行可容纳的项目数
  const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columnsPerRow);

  // 计算可视区域的行范围
  const visibleRowRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / rowHeight);
    const endRow = Math.min(totalRows, startRow + visibleRows + overscan * 2);
    
    return { startRow, endRow };
  }, [scrollTop, rowHeight, containerHeight, totalRows, overscan]);

  // 可视项目
  const visibleItems = useMemo(() => {
    const measure = measurePerformance('VirtualGrid visible items calculation');
    const result = [];
    
    for (let row = visibleRowRange.startRow; row < visibleRowRange.endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index >= items.length) break;
        
        result.push({
          item: items[index],
          index,
          x: col * (itemWidth + gap),
          y: row * rowHeight,
        });
      }
    }
    
    measure.end();
    return result;
  }, [items, visibleRowRange, columnsPerRow, itemWidth, itemHeight, gap, rowHeight, measurePerformance]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div className={`virtual-grid-container ${className}`}>
      <div
        className="scroll-container overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div
          className="relative"
          style={{ height: totalRows * rowHeight }}
        >
          {visibleItems.map(({ item, index, x, y }) => (
            <div
              key={index}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 自适应虚拟列表 Hook
 */
export function useVirtualList<T>(items: T[], itemHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return {
    containerRef,
    containerHeight,
  };
}

/**
 * 虚拟化表格组件
 */
interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    width?: number;
    render?: (value: T[keyof T], record: T, index: number) => React.ReactNode;
  }>;
  rowHeight?: number;
  maxHeight?: number;
  className?: string;
}

export function VirtualTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight = 48,
  maxHeight = 400,
  className = '',
}: VirtualTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => (
    <div className="flex border-b border-border hover:bg-muted/50 transition-colors">
      {columns.map((column) => (
        <div
          key={String(column.key)}
          className="flex items-center px-4 py-2 text-sm"
          style={{ width: column.width || 'auto', minWidth: column.width || 100 }}
        >
          {column.render 
            ? column.render(item[column.key], item, index)
            : String(item[column.key] || '')
          }
        </div>
      ))}
    </div>
  ), [columns]);

  return (
    <div className={`virtual-table ${className}`}>
      {/* 表头 */}
      <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex items-center px-4 py-3 text-sm font-medium"
            style={{ width: column.width || 'auto', minWidth: column.width || 100 }}
          >
            {column.title}
          </div>
        ))}
      </div>
      
      {/* 表体 */}
      <VirtualList
        items={data}
        itemHeight={rowHeight}
        containerHeight={maxHeight}
        renderItem={renderRow}
        className="border-border border-l border-r border-b"
      />
    </div>
  );
}