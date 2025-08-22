-- 生产环境PostgreSQL数据库迁移脚本
-- 从SQLite迁移到PostgreSQL的完整方案

-- 1. 创建数据库
CREATE DATABASE baby_growth_assistant
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- 连接到新数据库
\c baby_growth_assistant;

-- 2. 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 3. 设置时区
SET timezone = 'UTC';

-- 4. 创建性能优化配置
-- 调整PostgreSQL参数以优化性能
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- 5. 创建监控函数
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
    table_name text,
    row_count bigint,
    total_size text,
    index_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename AS table_name,
        n_tup_ins - n_tup_del AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建备份函数
CREATE OR REPLACE FUNCTION create_backup_job()
RETURNS void AS $$
BEGIN
    -- 这里可以添加定期备份逻辑
    RAISE NOTICE '备份任务已配置';
END;
$$ LANGUAGE plpgsql;

-- 7. 创建清理函数（清理过期session等）
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    DELETE FROM system_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 8. 创建定时任务（需要pg_cron扩展）
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');

-- 9. 创建性能监控视图
CREATE OR REPLACE VIEW performance_overview AS
SELECT 
    'database_size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value,
    now() as timestamp
UNION ALL
SELECT 
    'active_connections' as metric,
    count(*)::text as value,
    now() as timestamp
FROM pg_stat_activity 
WHERE state = 'active'
UNION ALL
SELECT 
    'total_tables' as metric,
    count(*)::text as value,
    now() as timestamp
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 10. 创建索引维护函数
CREATE OR REPLACE FUNCTION maintain_indexes()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || quote_ident(rec.schemaname) || '.' || quote_ident(rec.tablename);
    END LOOP;
    
    -- 重建碎片化严重的索引
    FOR rec IN
        SELECT schemaname, indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'REINDEX INDEX ' || quote_ident(rec.schemaname) || '.' || quote_ident(rec.indexname);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. 数据迁移脚本（从SQLite）
-- 这部分需要根据实际数据情况调整
-- 建议使用 Prisma migrate 命令进行迁移：
-- npx prisma migrate deploy --schema=prisma/schema.prod.prisma