-- 宝宝成长助手数据库性能优化迁移脚本
-- 为现有表添加关键性能索引

-- ===== 1. 核心查询性能索引 =====

-- 喂养记录优化索引 (解决 SCAN + TEMP B-TREE 问题)
CREATE INDEX IF NOT EXISTS "feeding_records_babyId_timestamp_desc_idx" 
ON "feeding_records"("babyId", "timestamp" DESC);

-- 喂养统计查询索引
CREATE INDEX IF NOT EXISTS "feeding_records_babyId_type_timestamp_idx" 
ON "feeding_records"("babyId", "type", "timestamp");

-- 日期范围查询索引
CREATE INDEX IF NOT EXISTS "feeding_records_timestamp_idx" 
ON "feeding_records"("timestamp");

-- 睡眠记录性能索引
CREATE INDEX IF NOT EXISTS "sleep_records_babyId_startTime_desc_idx" 
ON "sleep_records"("babyId", "startTime" DESC);

-- 睡眠统计查询索引
CREATE INDEX IF NOT EXISTS "sleep_records_babyId_timestamp_idx" 
ON "sleep_records"("babyId", "timestamp");

-- ===== 2. 里程碑查询优化索引 =====

-- 年龄范围查询优化 (解决里程碑性能瓶颈)
CREATE INDEX IF NOT EXISTS "milestones_age_range_category_idx" 
ON "milestones"("ageRangeMin", "ageRangeMax", "category");

-- 宝宝里程碑状态查询
CREATE INDEX IF NOT EXISTS "baby_milestones_babyId_achievedAt_idx" 
ON "baby_milestones"("babyId", "achievedAt");

-- ===== 3. 用户和宝宝档案查询优化 =====

-- 用户宝宝档案查询
CREATE INDEX IF NOT EXISTS "babies_userId_isActive_idx" 
ON "babies"("userId", "createdAt");

-- 活跃档案查询 (为将来的isActive字段准备)
-- CREATE INDEX IF NOT EXISTS "babies_userId_isActive_idx" 
-- ON "babies"("userId", "isActive");

-- ===== 4. 统计分析查询优化 =====

-- 按日期统计 (支持仪表板统计)
CREATE INDEX IF NOT EXISTS "feeding_records_date_type_idx" 
ON "feeding_records"(date("timestamp"), "type");

CREATE INDEX IF NOT EXISTS "sleep_records_date_idx" 
ON "sleep_records"(date("startTime"));

-- ===== 5. 分析当前查询性能 =====

-- 验证索引效果的查询计划
.headers on
.mode column

-- 测试喂养记录查询性能
EXPLAIN QUERY PLAN 
SELECT * FROM feeding_records 
WHERE babyId = 'test123' 
ORDER BY timestamp DESC 
LIMIT 20;

-- 测试喂养统计查询性能  
EXPLAIN QUERY PLAN
SELECT type, COUNT(*) as count, date(timestamp) as date
FROM feeding_records 
WHERE babyId = 'test123' 
  AND timestamp >= date('now', '-7 days')
  AND timestamp < date('now', '+1 day')
GROUP BY type, date(timestamp);

-- 测试里程碑查询性能
EXPLAIN QUERY PLAN
SELECT m.*, bm.achievedAt
FROM milestones m
LEFT JOIN baby_milestones bm ON m.id = bm.milestoneId AND bm.babyId = 'test123'
WHERE m.ageRangeMin <= 120 
  AND m.ageRangeMax >= 60
ORDER BY m.ageRangeMin, m.category;

-- ===== 6. 数据库统计信息 =====

-- 更新SQLite统计信息以优化查询计划
ANALYZE;

-- 检查表大小和索引使用情况
.schema --indent

-- 显示所有索引
SELECT name, tbl_name, sql 
FROM sqlite_master 
WHERE type = 'index' 
  AND tbl_name IN ('feeding_records', 'sleep_records', 'milestones', 'baby_milestones')
ORDER BY tbl_name, name;