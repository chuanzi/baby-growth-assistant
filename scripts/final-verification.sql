-- 最终性能验证测试
.headers on
.mode column
.timer on

-- 关键查询性能测试
.print "=== 最终性能验证 ==="

-- 测试1: 喂养记录查询 - 使用索引优化
.print "1. 喂养记录查询优化验证："
EXPLAIN QUERY PLAN 
SELECT * FROM feeding_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
ORDER BY timestamp DESC 
LIMIT 10;

-- 测试2: 里程碑查询 - 使用年龄范围索引
.print "2. 里程碑查询优化验证："
EXPLAIN QUERY PLAN
SELECT m.*, bm.achievedAt
FROM milestones m
LEFT JOIN baby_milestones bm ON m.id = bm.milestoneId AND bm.babyId = 'clz3kqfgr0000ykf7g8h4v5m8'
WHERE m.ageRangeMin <= 120 
  AND m.ageRangeMax >= 60
ORDER BY m.ageRangeMin;

-- 测试3: 统计查询优化验证
.print "3. 统计查询优化验证："
EXPLAIN QUERY PLAN
SELECT type, COUNT(*) as count, date(timestamp) as date
FROM feeding_records 
WHERE babyId = 'clz3kqfgr0000ykf7g8h4v5m8' 
  AND timestamp >= date('now', '-7 days')
GROUP BY type, date(timestamp);

-- 性能指标汇总
.print "=== 数据库优化总结 ==="
SELECT 
    'Total Indexes Created' as metric,
    COUNT(*) as value
FROM sqlite_master 
WHERE type = 'index' 
  AND tbl_name IN ('feeding_records', 'sleep_records', 'milestones', 'baby_milestones')
  AND name NOT LIKE 'sqlite_%';