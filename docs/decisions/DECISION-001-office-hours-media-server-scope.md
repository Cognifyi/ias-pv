# Decision: DECISION-001-office-hours-media-server-scope

## Phase: INCEPTION
## Sub-phase: office-hours
## Date: 2026-05-23T12:31:00Z
## Status: FINAL

## Context
- 项目定位：开源本地私有媒体服务器，类轻量级 Plex/Emby + Sonarr 合体
- 目标用户：IPTV 爱好者 / 媒体收藏家，有大量本地媒体文件，追求统一播放体验
- Builder Mode：开源社区项目，非商业化方向
- 用户画像：技术能力中高，自建 NAS/服务器，需要自动化媒体管理

## Key Findings (from forcing questions)
1. 最酷版本：全自动媒体中心 — 下载→转码→分类→播放，零人工干预
2. 目标受众：IPTV/媒体收藏爱好者，非泛化用户
3. 最快路径：IPTV 录制引擎（模块 A）— 最差异化的核心能力
4. 与现有方案区别：Jellyfin 是参考但不够好；Jellyfin 的 IPTV/Live TV 是附加功能而非一等公民
5. 十年版本：真正的全自动媒体中心

## Landscape Analysis
- Layer 1 (常识)：Jellyfin 乃开源媒体服务器之王；Tvheadend 是 DVR/录制后端但 UI 糟糕；FFmpeg + HLS 是转码标准方案
- Layer 2 (当前讨论)：2026 年用户正在逃离 Plex（付费墙/广告）；没有项目把 IPTV 录制作为一等公民
- Layer 3 (EUREKA)：当前没有开源项目把"媒体库管理 + IPTV 录制引擎 + 即时转码 + 多端同步"打包成一个统一产品

## Decision
1. 项目定位：统一的开源媒体服务器，以 IPTV 录制为核心差异化能力
2. 切入策略：先从模块 A（IPTV 录制引擎）开始，这是最核心+最差异化的能力
3. 技术栈：TypeScript/Node.js（生态成熟，贡献者最多，媒体处理生态丰富）
4. 开发顺序：模块 A（录制引擎）→ 模块 B（动态转码）→ 模块 C（播放器与同步）

## Consequences
### Positive
- 精确填补了市场空白（Jellyfin 的 IPTV 是附加功能，Tvheadend 无好 UI）
- 模块 A 可以独立于前端运行和验证
- TypeScript 降低社区贡献门槛
- EUREKA 定位提供了清晰的叙述：不是又一个 Jellyfin 克隆

### Negative
- 需要从零搭建，没有现有代码基础
- 模块 A（录制引擎）涉及进程管理、断线重连等复杂问题
- 开源项目需要持续维护和社区建设

## Related PRD
- [待生成]

## Architecture Notes
- 三个核心模块各自独立但数据互通
- 优先确保模块 A 的可独立运行和测试能力
