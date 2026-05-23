# CEO Plan: ias-pv — IPTV Media Server

## Source
- Branch: main
- Mode: SCOPE EXPANSION
- Date: 2026-05-23T12:31:00Z

## Related Decisions
- docs/decisions/DECISION-001-office-hours-media-server-scope.md

## Scope Summary
统一的开源媒体服务器，以 IPTV 录制为核心差异化能力。从模块 A（IPTV 录制引擎 + 媒体管道自动化）开始。

## Core Scope (IN)
- **Module A: IPTV Recording Engine** (BullMQ + Redis)
  - Cron 驱动的定时录制任务
  - FFmpeg 子进程管理（拉起/监控/断线重连）
  - 并发源探活（协程池）
  - 任务状态持久化
- **Media Pipeline Automation**
  - 录制完成后自动触发 FFmpeg 转码 (TS → HLS)
  - 元数据提取和缩略图生成
- **WebSocket Real-time Push**
  - 录制进度实时推送
  - 探活结果实时推送
  - 任务状态变更推送
- **REST API + Swagger**
  - 频道管理 CRUD
  - 录制任务 CRUD
  - 系统状态
  - OpenAPI 文档
- **Docker Deployment**
  - Dockerfile + docker-compose.yml (Node.js + Redis)
  - 一条命令启动

## Expansion Acceptances
1. ✅ Media pipeline automation (post-recording transcode) — human ~2d / CC ~30min
2. ✅ WebSocket real-time push — human ~1d / CC ~20min
3. ✅ REST API + Swagger docs — human ~2d / CC ~40min
4. ✅ Docker deployment — human ~1d / CC ~15min

## Out of Scope (deferred)
- Module B: Dynamic transcoding (on-the-fly HLS)
- Module C: Multi-terminal sync & playback controls
- Frontend UI (WebUI)
- User authentication & permissions
- AI-powered features

## Key Decisions
- Tech Stack: TypeScript/Node.js, BullMQ, Redis, FFmpeg
- Task Queue: BullMQ (Redis-backed, supports retry/concurrency/persistence)
- API: REST + WebSocket (Express + socket.io or ws)
- Deployment: Docker Compose

## Target User
IPTV/media collection enthusiasts who want a unified, automated recording and media management solution.
