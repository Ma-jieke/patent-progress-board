# PatentFlow · 课题组专利进度看板

Apple 风格的轻量级专利管理看板。老师公开查看，管理员登录后维护状态；没有在线文件或复杂审批流。

## 三套流程
- 预审：撰写中 → 学校平台预审 → 预审通过后交专利公司撰写 → 撰写研发证明材料等相关材料 → 学校盖章 → 预审中 → 下证
- 优先审查：撰写中 → 学校平台预审 → 预审通过后交专利公司撰写 → 撰写研发证明材料等相关材料 → 学校盖章 → 预审不通过转优审 → 下证
- 实用新型：撰写中 → 学校平台预审 → 预审通过后交专利公司撰写 → 审查中 → 下证

## Cloudflare Pages 部署（无需 npm 构建）
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选择本仓库。
2. **Build command 留空**，**Build output directory 填 `site`**，Root directory 为仓库根目录。
3. 首次部署后创建 Cloudflare **D1** 数据库，建议名称 `patent-progress`。
4. D1 → Console，运行 `migrations/0001_init.sql` 中全部 SQL。
5. Pages → Settings → Bindings → Add → D1 database，Variable name 必须为 `DB`，选择刚创建的数据库。
6. Pages → Settings → Variables and Secrets，新增两个 **Secret**：
   - `ADMIN_PASSWORD`：自定义长密码（建议至少16字符）。
   - `SESSION_SECRET`：另一条独立的随机字符串，至少32字符。
7. **重新部署**，让 D1 绑定与 Secrets 进入生产环境。
8. 打开 Pages 分配的 `https://项目名.pages.dev`，验证空列表、管理员登录、新增专利和跨浏览器查看。

Windows PowerShell 生成 SESSION_SECRET：
```powershell
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**安全提醒：** 不要把管理员密码、会话密钥放入仓库或发送到聊天中。网站数据对持有网址者公开，编辑操作仅限服务端签名会话授权。首次上线为空数据，不自动导入任何演示专利。

## 目录
- `site/index.html`：完整独立前端，不依赖 npm/Vite。
- `site/_routes.json`：API 才触发 Functions。
- `functions/api`：实时数据、管理登录、修改专利状态。
- `shared/workflows.ts`：课题组三套状态配置。
- `migrations/0001_init.sql`：D1 初始化 SQL。

当前默认前端从 /api/patents 加载信息，并每30秒刷新一次；状态修改直接存入数据库。
