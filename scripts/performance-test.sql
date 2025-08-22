-- Database Performance Test Script
-- 测试数据库优化后的查询性能

.headers on
.mode column
.timer on

-- ===== 性能测试查询 =====

-- 测试1: 喂养记录列表查询 (最常用)
.print "=== 测试1: 喂养记录列表查询 ==="
EXPLAIN QUERY PLAN 
SELECT * FROM feeding_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
ORDER BY timestamp DESC 
LIMIT 20;

-- 执行实际查询测试性能
SELECT COUNT(*) as feeding_records_count FROM feeding_records;

-- 测试2: 喂养统计查询
.print "=== 测试2: 喂养统计查询 ==="
EXPLAIN QUERY PLAN
SELECT type, COUNT(*) as count, date(timestamp) as date
FROM feeding_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
  AND timestamp >= date('now', '-7 days')
  AND timestamp < date('now', '+1 day')
GROUP BY type, date(timestamp);

-- 测试3: 睡眠记录查询
.print "=== 测试3: 睡眠记录查询 ==="
EXPLAIN QUERY PLAN
SELECT * FROM sleep_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
ORDER BY startTime DESC 
LIMIT 20;

SELECT COUNT(*) as sleep_records_count FROM sleep_records;

-- 测试4: 里程碑查询优化
.print "=== 测试4: 里程碑查询优化 ==="
EXPLAIN QUERY PLAN
SELECT m.*, bm.achievedAt
FROM milestones m
LEFT JOIN baby_milestones bm ON m.id = bm.milestoneId AND bm.babyId = 'clz3kqfgr0000ykf7g8h4v5m8'
WHERE m.ageRangeMin <= 120 
  AND m.ageRangeMax >= 60
ORDER BY m.ageRangeMin, m.category;

SELECT COUNT(*) as milestones_count FROM milestones;

-- 测试5: 综合仪表板查询
.print "=== 测试5: 综合仪表板查询 ==="
-- 最近的喂养记录
SELECT 'Recent Feeding' as query_type, COUNT(*) as count
FROM feeding_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
  AND timestamp >= date('now', '-1 day');

-- 今日睡眠时长
SELECT 'Today Sleep' as query_type, SUM(durationMinutes) as total_minutes
FROM sleep_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
  AND date(startTime) = date('now');

-- 完成的里程碑数量
SELECT 'Achieved Milestones' as query_type, COUNT(*) as count
FROM baby_milestones 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
  AND achievedAt IS NOT NULL;

-- ===== 索引使用情况分析 =====
.print "=== 索引使用情况分析 ==="
SELECT 
    name as index_name,
    tbl_name as table_name,
    CASE 
        WHEN name LIKE '%babyId%timestamp%' THEN 'Timeline Queries'
        WHEN name LIKE '%age_range%' THEN 'Milestone Queries' 
        WHEN name LIKE '%date%' THEN 'Statistics Queries'
        ELSE 'Other'
    END as optimization_target
FROM sqlite_master 
WHERE type = 'index' 
  AND tbl_name IN ('feeding_records', 'sleep_records', 'milestones', 'baby_milestones')
  AND name NOT LIKE 'sqlite_%'
ORDER BY tbl_name, name;

-- ===== 数据库统计信息 =====
.print "=== 数据库统计信息 ==="
SELECT 
    name as table_name,
    CASE 
        WHEN name = 'feeding_records' THEN (SELECT COUNT(*) FROM feeding_records)
        WHEN name = 'sleep_records' THEN (SELECT COUNT(*) FROM sleep_records)  
        WHEN name = 'milestones' THEN (SELECT COUNT(*) FROM milestones)
        WHEN name = 'baby_milestones' THEN (SELECT COUNT(*) FROM baby_milestones)
        WHEN name = 'babies' THEN (SELECT COUNT(*) FROM babies)
        WHEN name = 'User' THEN (SELECT COUNT(*) FROM User)
    END as record_count
FROM sqlite_master 
WHERE type = 'table' 
  AND name IN ('feeding_records', 'sleep_records', 'milestones', 'baby_milestones', 'babies', 'User')
ORDER BY record_count DESC;