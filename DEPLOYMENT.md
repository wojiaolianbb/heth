# Heth 部署指南

## 部署到 Vercel

### 前置要求

1. 安装 Vercel CLI
```bash
npm i -g vercel
```

2. 登录 Vercel
```bash
vercel login
```

### 方案1：本地 Ollama + Cloudflare Tunnel（推荐）

适合：想使用本地 AI 模型，免费且速度快

#### 1. 安装 Cloudflare Tunnel

```bash
# Windows
winget install Cloudflare.cloudflared

# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### 2. 启动 Ollama 隧道

```bash
# 登录 Cloudflare（首次运行需要）
cloudflared tunnel login

# 启动隧道（保持运行）
cloudflared tunnel --url http://localhost:11434
```

**会显示类似：**
```
Your quick Tunnel has been created! Visit it at:
https://abc-def-ghi-jkl.trycloudflare.com
```

**复制这个 URL**，下一步需要用到。

#### 3. 部署到 Vercel

```bash
cd F:/hello/vibe-codex/heth

# 部署（会自动创建项目）
vercel --prod
```

#### 4. 配置 Vercel 环境变量

在 [Vercel Dashboard](https://vercel.com/dashboard) 找到你的项目：

1. 进入 **Settings** → **Environment Variables**
2. 添加以下变量：

```bash
VISION_PROVIDER=ollama
OLLAMA_BASE_URL=https://your-tunnel-url.trycloudflare.com  # 替换成你的隧道 URL
OLLAMA_MODEL=qwen2.5vl:7b
```

3. 点击 **Deployments** → **Redeploy** 重新部署

#### 5. 保持隧道运行

Cloudflare Tunnel 需要保持运行才能让 Vercel 访问你的本地 Ollama。

**持久化运行（推荐）：**

创建 `start-tunnel.bat` (Windows) 或 `start-tunnel.sh` (Mac/Linux)：

```bash
# Windows (start-tunnel.bat)
@echo off
:loop
cloudflared tunnel --url http://localhost:11434
timeout /t 5
goto loop

# Mac/Linux (start-tunnel.sh)
#!/bin/bash
while true; do
  cloudflared tunnel --url http://localhost:11434
  sleep 5
done
```

设置为开机自启动，或使用系统服务管理。

---

### 方案2：云端 OpenAI API

适合：不想维护本地服务，愿意付费使用云端 API

#### 1. 获取 OpenAI API Key

访问 https://platform.openai.com/api-keys

#### 2. 配置 Vercel 环境变量

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # 或 gpt-4o
```

#### 3. 部署

```bash
vercel --prod
```

---

### 方案3：混合模式（本地优先 + 云端备用）

同时配置 Ollama 和 OpenAI，当本地服务不可用时自动降级到云端。

#### Vercel 环境变量

```bash
# 优先使用本地 Ollama
VISION_PROVIDER=ollama
OLLAMA_BASE_URL=https://your-tunnel-url.trycloudflare.com
OLLAMA_MODEL=qwen2.5vl:7b

# 备用云端 API（Ollama 失败时自动使用）
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

---

## ⚠️ 重要注意事项

### 1. 数据存储问题

当前项目使用 `.data/` 本地文件存储，**在 Vercel 上无法持久化数据**。

解决方案：
- 使用 Vercel KV（简单键值对）
- 使用 Vercel Postgres（结构化数据）
- 使用 MongoDB Atlas（免费层可用）

### 2. Cloudflare Tunnel URL 会变

免费的快速隧道 URL 每次重启会变化。解决方案：

**创建命名隧道（持久 URL）：**

```bash
# 创建命名隧道
cloudflared tunnel create heth-ollama

# 配置隧道
cloudflared tunnel route dns heth-ollama ollama.yourdomain.com

# 运行命名隧道
cloudflared tunnel run heth-ollama
```

这样 URL 固定为：`https://ollama.yourdomain.com`

### 3. 安全建议

公开暴露 Ollama 服务有风险，建议：

1. 添加认证：在 Vercel 配置中添加 `OLLAMA_AUTH_TOKEN`
2. 限制访问来源（Cloudflare Access）
3. 定期检查隧道日志

---

## 验证部署

部署完成后，访问：
- `https://your-app.vercel.app/dashboard` - 主页
- `https://your-app.vercel.app/meals` - 测试 AI 分析

检查是否正常：
1. 上传餐食照片
2. 查看是否返回营养估算
3. 检查使用的是哪个 provider（ollama / openai-compatible）

---

## 快速部署命令

```bash
# 一键部署（使用当前配置）
cd F:/hello/vibe-codex/heth
vercel --prod

# 或首次部署
vercel
# 然后正式发布
vercel --prod
```

---

## 故障排查

### AI 分析失败

1. **检查隧道状态**
   ```bash
   curl https://your-tunnel-url.trycloudflare.com/api/tags
   ```

2. **检查 Vercel 日志**
   - Dashboard → Deployments → 点击部署 → Functions 日志

3. **测试 API**
   ```bash
   curl -X GET https://your-app.vercel.app/api/health
   ```

### 数据不持久化

Vercel 的文件系统是只读的，需要改用数据库存储。

---

## 成本估算

### 方案1（本地 Ollama）
- Cloudflare Tunnel: **免费**
- Vercel Hobby: **免费**
- 总成本: **$0/月**

### 方案2（OpenAI API）
- Vercel Hobby: **免费**
- GPT-4o-mini: **$0.15/百万输入 tokens + $0.60/百万输出 tokens**
- 每张图片约 1000 tokens，估计 **$0.001/张**

### 方案3（混合模式）
- 平时使用本地 Ollama: **免费**
- 偶尔降级到云端: **少量成本**
