-- PatentFlow v2 升级脚本：仅执行一次。不会删除原有专利及历史记录。
-- 在 Cloudflare D1 Console 中按顺序逐句执行。
ALTER TABLE patents ADD COLUMN category TEXT NOT NULL DEFAULT 'invention' CHECK(category IN ('invention','utility','software'));
ALTER TABLE patents ADD COLUMN agency TEXT NOT NULL DEFAULT '';
ALTER TABLE patents ADD COLUMN inventors TEXT NOT NULL DEFAULT '';
ALTER TABLE patents ADD COLUMN version INTEGER NOT NULL DEFAULT 0;

UPDATE patents SET category='utility' WHERE workflow='utility';
CREATE TABLE IF NOT EXISTS staff (
 name TEXT PRIMARY KEY,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stage_owners (
 patent_id TEXT NOT NULL,
 workflow TEXT NOT NULL,
 stage INTEGER NOT NULL,
 owner TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL,
 PRIMARY KEY (patent_id,workflow,stage),
 FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_stage_owners_patent ON stage_owners(patent_id);
INSERT OR IGNORE INTO staff(name,created_at) SELECT DISTINCT trim(owner), datetime('now') FROM patents WHERE trim(owner)<>'';
-- 旧版优审在转换前包含预审步骤。保留旧状态变更历史，并记录迁移原因。
INSERT INTO status_history(id,patent_id,previous_workflow,next_workflow,previous_stage,next_stage,note,changed_at)
SELECT lower(hex(randomblob(16))),id,'priority',
CASE WHEN stage<=4 THEN 'pre' ELSE 'priority' END,
stage,CASE WHEN stage=5 THEN 0 WHEN stage=6 THEN 4 ELSE stage END,
'系统升级：旧版优审流程阶段自动映射，历史记录已保留',datetime('now')
FROM patents WHERE workflow='priority';
UPDATE patents SET
 workflow=CASE WHEN workflow='priority' AND stage<=4 THEN 'pre' ELSE workflow END,
 stage=CASE WHEN workflow='priority' AND stage=5 THEN 0 WHEN workflow='priority' AND stage=6 THEN 4 ELSE stage END,
 version=version+1
WHERE workflow='priority';
-- 旧版仅记录单一负责人，将其作为当前节点负责人，其余节点由管理员补充。
INSERT OR IGNORE INTO stage_owners(patent_id,workflow,stage,owner,updated_at)
SELECT id,workflow,stage,trim(owner),updated_at FROM patents WHERE trim(owner)<>'';
