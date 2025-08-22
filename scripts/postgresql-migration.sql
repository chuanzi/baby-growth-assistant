-- 宝宝成长助手 PostgreSQL 生产环境性能优化脚本
-- 从SQLite迁移到PostgreSQL时应用的性能优化

-- ===== 1. 核心查询性能索引 =====

-- 喂养记录优化索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS feeding_records_babyId_timestamp_desc_idx 
ON feeding_records(babyId, timestamp DESC);

-- 喂养统计查询索引 (复合索引优化)
CREATE INDEX CONCURRENTLY IF NOT EXISTS feeding_records_babyId_type_timestamp_idx 
ON feeding_records(babyId, type, timestamp);

-- 时间范围查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS feeding_records_timestamp_idx 
ON feeding_records(timestamp);

-- 睡眠记录性能索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS sleep_records_babyId_startTime_desc_idx 
ON sleep_records(babyId, startTime DESC);

-- 睡眠统计查询索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS sleep_records_babyId_timestamp_idx 
ON sleep_records(babyId, timestamp);

-- ===== 2. 里程碑查询优化索引 =====

-- 年龄范围查询优化 (PostgreSQL GIN索引优化)
CREATE INDEX CONCURRENTLY IF NOT EXISTS milestones_age_range_category_idx 
ON milestones(ageRangeMin, ageRangeMax, category);

-- 宝宝里程碑状态查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS baby_milestones_babyId_achievedAt_idx 
ON baby_milestones(babyId, achievedAt) 
WHERE achievedAt IS NOT NULL;

-- ===== 3. 用户和宝宝档案查询优化 =====

-- 用户宝宝档案查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS babies_userId_createdAt_idx 
ON babies(userId, createdAt);

-- ===== 4. PostgreSQL特定优化 =====

-- 部分索引优化 (PostgreSQL特性)
CREATE INDEX CONCURRENTLY IF NOT EXISTS feeding_records_recent_idx
ON feeding_records(babyId, timestamp DESC)
WHERE timestamp >= NOW() - INTERVAL '30 days';

-- 时间戳函数索引 (统计查询优化)
CREATE INDEX CONCURRENTLY IF NOT EXISTS feeding_records_date_type_idx 
ON feeding_records(DATE(timestamp), type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS sleep_records_date_idx 
ON sleep_records(DATE(startTime));

-- ===== 5. PostgreSQL表和索引优化设置 =====

-- 设置填充因子以减少页面分裂
ALTER TABLE feeding_records SET (fillfactor = 85);
ALTER TABLE sleep_records SET (fillfactor = 85);
ALTER TABLE baby_milestones SET (fillfactor = 90);

-- 自动清理设置优化
ALTER TABLE feeding_records SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE sleep_records SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ===== 6. 连接池优化建议 =====

-- 设置连接池参数 (需要在postgresql.conf中配置)
/*
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
*/

-- ===== 7. 查询性能验证 =====

-- 更新统计信息
ANALYZE;

-- 检查索引使用情况的查询
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
ORDER BY idx_tup_read DESC;

-- 慢查询监控设置
SET log_min_duration_statement = 1000; -- 记录超过1秒的查询

-- ===== 8. 数据迁移后验证脚本 =====

-- 验证数据完整性
SELECT 
    'feeding_records' as table_name, COUNT(*) as count FROM feeding_records
UNION ALL
SELECT 
    'sleep_records' as table_name, COUNT(*) as count FROM sleep_records  
UNION ALL
SELECT 
    'milestones' as table_name, COUNT(*) as count FROM milestones
UNION ALL
SELECT 
    'baby_milestones' as table_name, COUNT(*) as count FROM baby_milestones
UNION ALL
SELECT 
    'babies' as table_name, COUNT(*) as count FROM babies
UNION ALL
SELECT 
    'User' as table_name, COUNT(*) as count FROM "User";

-- 性能测试查询
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM feeding_records 
WHERE babyId = 'test-baby-id' 
ORDER BY timestamp DESC 
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT type, COUNT(*) as count, DATE(timestamp) as date
FROM feeding_records 
WHERE babyId = 'test-baby-id' 
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY type, DATE(timestamp);

-- ===== 9. 监控和维护脚本 =====

-- 索引大小监控
SELECT 
    t.tablename,
    indexname,
    c.reltuples::bigint AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(indexrelname))) AS index_size
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
LEFT OUTER JOIN (
    SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns, idx_scan, idx_tup_read, idx_tup_fetch,indexrelname FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class ipg ON ipg.oid = x.indexrelid
    JOIN pg_stat_all_indexes psai ON x.indexrelid = psai.indexrelid
) AS foo ON t.tablename = foo.ctablename
WHERE t.schemaname='public'
ORDER BY pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(indexrelname)) DESC;