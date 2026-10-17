# AIFriend · 纸间

支持 **3D 虚拟人物**与 **2D 文字剧情**的 AI 陪伴项目。两个模式共用同一账号、人物资料、聊天记录和长期记忆，业务数据统一保存在服务器 SQLite 数据库。

本项目基于 [JuiceBoxxGames/utsuwa](https://github.com/JuiceBoxxGames/utsuwa) 二次开发，当前侧重中文 Web 体验。上游版权、许可证和第三方素材说明予以保留。

**仓库仅包含源码、依赖锁文件和公开素材，不包含生产密钥、数据库、用户数据、访问口令或证书私钥。**

## 功能

- 邮箱验证码注册、邮箱与密码登录；验证码有效期、发送频率和错误次数限制。
- 随机盐与 scrypt 密码哈希；HttpOnly、Secure、SameSite 登录 Cookie。
- 3D 人物选择、名字搜索、自定义 VRM 上传、性格设置、表情和动作。
- 2D 中文文字剧情，与 3D 模式共享人物状态、聊天和记忆。
- 按账号隔离存储人物、聊天、记忆、提醒、设置及上传素材。
- 火山方舟文本模型，豆包语音合成与语音识别适配。
- 旧浏览器存档迁移：验证原邮箱后导入，提交成功后再清理对应旧存档。
- 账号切换检测、提醒原子领取、存档导入冲突检测与回滚。

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | Svelte 5、SvelteKit、TypeScript、Vite |
| 3D | Three.js、Threlte、VRM |
| 服务端 | Node.js、SvelteKit Node Adapter |
| 数据库 | 内置 `node:sqlite`、SQLite WAL |
| 邮件 | Nodemailer、SMTP |
| 记忆检索 | 多语言文本向量模型与相似度检索 |

默认向量模型为 `Xenova/paraphrase-multilingual-MiniLM-L12-v2`，负责把文本转换为向量并寻找相关记忆。向量计算可以在浏览器运行，用户记忆与向量的持久化存储位于服务器；模型文件属于可缓存的程序资源。

## 本地开发

推荐 Node.js **22.22.1**，至少使用支持无额外参数运行 `node:sqlite` 的 Node.js 22.13；pnpm 版本为 **10.28.2**。

```bash
git clone https://github.com/comradeofjustice/AIFriend.git
cd AIFriend
npm install -g pnpm@10.28.2
pnpm install --frozen-lockfile
cp .env.example .env
```

编辑自己的 `.env`，填写模型、邮件和认证配置。`AUTH_SECRET` 必须是至少 32 字符的随机值，可在本地通过 Node.js 的 `crypto.randomBytes(48).toString('hex')` 生成，不要提交生成的值。

```bash
pnpm dev --host localhost
```

打开 `http://localhost:5173/login`。首次使用需要真实接收邮件并完成注册验证。

## 环境变量

完整模板见 [`.env.example`](.env.example)，其中的凭据字段均为空。

| 变量 | 用途 |
| --- | --- |
| `ARK_API_KEY` | 火山方舟 API Key |
| `ARK_BASE_URL`、`ARK_MODEL` | 接口地址及当前 Key 有权调用的模型 ID |
| `AUTH_SECRET` | 保护验证码摘要的随机密钥 |
| `AUTH_DATA_DIR` | 数据库目录；开发默认 `.data` |
| `SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE` | 发信服务器、端口和 TLS 配置 |
| `SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM` | 发信邮箱、邮箱密码或授权码、发件人 |
| `VOLC_TTS_API_KEY` | 语音合成 Key |
| `VOLC_TTS_RESOURCE_ID`、`VOLC_TTS_VOICE_ID` | 合成资源与音色 |
| `VOLC_ASR_API_KEY`、`VOLC_ASR_RESOURCE_ID` | 识别 Key 与已开通的资源 |
| `HOST`、`PORT`、`ORIGIN` | 生产监听地址、端口及对外访问地址 |
| `BODY_SIZE_LIMIT` | 上传请求大小限制 |
| `ADDRESS_HEADER`、`XFF_DEPTH` | 可信反向代理下的客户端 IP 配置 |
| `MCP_ENABLED` | 默认 `off` |

- 方舟接口和模型必须与 Key 类型匹配，普通方舟服务与 Coding Plan 不应混填。
- 语音服务还需要开通对应 Resource ID 和音色权限。
- SMTP 465 端口通常使用 `SMTP_SECURE=true`；587 使用 `false` 并通过 STARTTLS 加密。
- 只有通过可信反向代理访问服务时，才设置转发 IP 相关变量。
- 密钥不得使用 `PUBLIC_` 或 `VITE_` 前缀，也不要写入前端代码。

网站可直接访问 `/login` 注册或登录，无需额外的预览口令。账号验证和用户数据隔离仍然保留。

## 生产部署

```bash
pnpm check
pnpm build
node --dns-result-order=ipv4first --no-network-family-autoselection --env-file=.env build/index.js
```

将 `ORIGIN` 设置为实际 HTTPS 地址，将 `AUTH_DATA_DIR` 设置为项目目录之外的可写持久化目录。使用进程管理服务启动应用，并由 Nginx 等反向代理提供 HTTPS。`HOST=127.0.0.1` 时应用不直接暴露到公网。

代理上传限制应与 `BODY_SIZE_LIMIT` 保持一致，并保留 Host 与转发协议、IP 头。3D 页面需要足够的上游响应头空间，已验证的 Nginx 参数示例：

```nginx
client_max_body_size 128m;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 300s;
    proxy_buffering off;
}
```

HTTPS 证书及私钥由部署环境管理，不放入仓库。麦克风功能需要 HTTPS 或受信任的本机开发环境。

## 数据存储与备份

数据库文件为 `${AUTH_DATA_DIR}/utsuwa.sqlite`，首次使用时自动建立。

- `auth_users`、`auth_codes`、`auth_sessions`、`auth_limits`：账号、验证码摘要、会话摘要和限流。
- `user_records`、`user_sequences`：人物、聊天、事实记忆、会话、事件与提醒。
- `user_values`：个人设置及上传素材编码。
- `user_migrations`：旧存档迁移记录。

业务数据不再写入浏览器 localStorage 或 IndexedDB；浏览器仅保留安全登录 Cookie 和页面运行时内存。旧存档迁移模块是专门读取历史本地存档的兼容入口。

运行中的数据库使用 SQLite Backup API 备份，不要只复制主文件而遗漏 WAL。升级前备份数据库，并妥善保管 `.env`。详见 [`SERVER-DATA.txt`](SERVER-DATA.txt)。

## 检查与测试

```bash
python3 scripts/check-public-source.py
pnpm check
node --loader ./tests/local-mvp/ts-loader.mjs ./tests/local-mvp/verification-input.mjs
node --loader ./tests/local-mvp/ts-loader.mjs ./tests/local-mvp/auth.mjs
node --loader ./tests/local-mvp/ts-loader.mjs ./tests/local-mvp/server-storage.mjs
node --loader ./tests/local-mvp/ts-loader.mjs ./tests/local-mvp/remote-client.mjs
node --loader ./tests/local-mvp/ts-loader.mjs ./tests/local-mvp/accounts.mjs
pnpm build
```

回归测试覆盖验证码格式、注册验证、会话持久化、账号隔离、远程接口、原子更新和迁移回滚，使用临时数据库与模拟发信。

密钥检查脚本检查 Git 已跟踪文件；首次提交前先执行 `git add`。通过 `--private-env` 指定仓库外的私有环境文件，可额外检查其真实凭据是否出现在待提交文件中。脚本只报告文件和行号，不输出凭据内容。

## 目录

```text
src/lib/server/auth/         邮箱注册、密码和会话
src/lib/server/database/     SQLite 及按账号隔离的数据操作
src/lib/db/                  远程存储、素材和迁移
src/lib/services/            聊天、模型、语音和记忆服务
src/routes/login/            注册与登录
src/routes/app/              3D、2D 和设置页面
src/routes/api/              服务端接口
static/                      公开人物模型及素材
tests/local-mvp/             当前 Web 版本回归测试
```

`src-tauri/`、营销页面与部分工具来自上游。当前账号和数据流程依赖 Node.js 服务端，原有桌面独立离线打包不属于已验证范围。上游工作流保留在 `.github/upstream-workflows/`；当前 CI 检查 Web 版本，不自动发布上游桌面安装包。

## 上游与许可证

- 原始项目：[JuiceBoxxGames/utsuwa](https://github.com/JuiceBoxxGames/utsuwa)。
- 原始 README：[`docs/UPSTREAM_README.md`](docs/UPSTREAM_README.md)。
- 项目许可证：[`LICENSE`](LICENSE)，AGPL-3.0。
- 第三方素材：[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 及各素材目录的许可文件。
