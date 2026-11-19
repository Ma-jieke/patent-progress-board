# PatentFlow v2 · 数据库升级与上线说明

> **请不要先合并代码。** 当前线上 `main` 仍是原版。先迁移 D1，再合并 v2，避免新代码查询新字段时发生错误。

## 一、上线前准备：保留数据库恢复点

打开 Cloudflare → Storage & databases → D1 → `patent-progress` → **Time Travel**，记录迁移前恢复时间/Bookmark。建议额外导出备份。D1 Time Travel 官方介绍：https://developers.cloudflare.com/d1/reference/time-travel/

## 二、执行一次性 SQL 迁移

进入 Cloudflare D1 → `patent-progress` → **Console**，打开仓库文件 [0002_patentflow_v2.sql](../migrations/0002_patentflow_v2.sql)。按文件顺序执行每条以分号结尾的 SQL 语句（Console 如不支持整段运行，就逐条执行）。

**只执行一次。** 其中 `ALTER TABLE ... ADD COLUMN` 重复运行会报重复列错误。迁移不会删除任何现有专利或历史记录。

主要新增字段：
- `category` 成果分类：发明专利 / 实用新型 / 软件著作权
- `agency` 代理机构：安徽阜梦 / 北京荟英
- `inventors` 发明人（软著界面显示为著作权人 / 开发人员）
- `version` 并发修改保护
- `staff` 人员下拉名录（输入新姓名后自动补入）
- `stage_owners` 各节点独立负责人

为避免直接重建旧版数据库的 `workflow` 约束，**软件著作权在数据库内通过 `category=software` 独立识别，兼容存储 `workflow=utility`，接口呈现的实际流程仍为 `software`**。

旧数据迁移规则：
- 原 `pre`（发明预审）和 `utility`（实用新型）记录及状态保留；
- 原 `priority` 的阶段 0–4 转为 `pre` 的对应阶段；
- 原 `priority` 阶段 5（预审不通过转优审）映射为新 `priority` 第 0 阶段（优先审查中）；
- 原 `priority` 阶段 6（下证）映射为新 `priority` 第 4 阶段（下证）；
- 原负责人被保留到该专利**当前节点**，其他阶段可由管理员补充，原始 `status_history` 历史不删除。

## 三、核查数据库

Console 执行：

```sql
SELECT id,title,category,workflow,stage,owner,version FROM patents LIMIT 20;
```

然后运行 `/tables`，应包含原来的三张表和新增 `staff`、`stage_owners`。

## 四、发布

1. 打开本次 GitHub PR，在确认迁移成功后点击 **Merge pull request**。
2. Cloudflare Pages Git 集成将自动重新部署 `main`（如果你没有关闭自动部署）。
3. 部署成功后打开 `https://patent-progress-board.pages.dev`，按分类切换、点击成果查看详细进度。
4. 用管理员密码登录，打开旧专利、指定代理机构/发明人及各阶段负责人，保存；刷新页面确认数据保留。
5. 新增一条测试软件著作权，检查其流程仅有「撰写中 → 审查中 → 下证」。
6. 测试发明专利由预审转优审，查看历史是否保留。注意在正式专利上只操作真实进度。

### 出现错误怎么办？

- `/api/patents` 提示「数据库可能尚未执行0002升级脚本」：先检查 SQL 是否全执行。
- `/api/staff` 返回 503：检查 `staff` 表是否已创建。
- 新 UI 出现旧数据：确认 Cloudflare **Production** 是否指向刚合并的 `main` 最新提交。
- 界面有问题可以通过 Cloudflare Pages **Deployments** 回滚前端版本。**回滚网页不会自动回滚 D1**，但本次新增数据库列与旧接口保持兼容。

## 项目设计

每条记录的当前负责人是其**当前阶段负责人**，并非整个专利固定负责人；`stage_owners` 保留每个阶段的人员。每次修改会写入 `status_history`，管理员身份验证依旧使用原来的 `ADMIN_PASSWORD` 和 `SESSION_SECRET`，不需要重新设置密码。