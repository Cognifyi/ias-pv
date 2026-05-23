# 001-iptv-recording-engine

## Source
- Branch: main
- Date: 2026-05-23T13:00:00Z
- Version: 1.0

## Related Decisions
- docs/decisions/DECISION-001-office-hours-media-server-scope.md
- docs/decisions/DECISION-002-ceo-review-scope-decisions.md
- docs/decisions/DECISION-003-eng-review-tech-architecture.md

## Related Specs
- docs/specs/SPEC-001-iptv-recording-engine.md

## Problem Statement

Users who consume IPTV content (m3u8 live streams) lack a dedicated, open-source tool to manage their channel lineup, probe channel health, and schedule recordings. Existing solutions are either:

- **Commercial & heavy** (Plex, Emby) — designed for local media libraries, IPTV is an afterthought with poor recording support
- **Niche & limited** (Tvheadend) — powerful but terrible UX, no modern API, no TypeScript ecosystem
- **CLI-only** (ffmpeg scripts, cron-based) — no scheduling UI, no monitoring, no persistence

No existing open-source project combines media library management + IPTV recording + on-the-fly transcoding + multi-device sync into one unified product.

## Solution

Build **ias-pv** — an IPTV Recording Engine (Module A) as the first deliverable of a larger media server platform. It provides:

1. A REST API to manage m3u8 channels and recording schedules
2. A probe system that checks channel health (HTTP reachability, TS delay, resolution)
3. A recording scheduler using BullMQ + cron expressions
4. An FFmpeg-based recording worker that captures live streams to disk
5. A media pipeline for post-recording transcoding (TS → HLS) and metadata extraction
6. WebSocket push for real-time progress updates
7. Swagger/OpenAPI documentation

## User Stories

1. As a media server operator, I want to add m3u8 channels via API, so that I can build my channel lineup programmatically
2. As a media server operator, I want to probe a channel's health (latency, resolution, reachability), so that I know which channels are reliable
3. As a media server operator, I want to schedule recordings using cron expressions, so that I can capture live shows automatically
4. As a media server operator, I want to see real-time recording progress via WebSocket, so that I can monitor active recordings
5. As a media server operator, I want recordings to automatically transcode from TS to HLS after completion, so that files are ready for streaming
6. As a media server operator, I want failed recordings to retry automatically with exponential backoff, so that transient network issues don't lose content
7. As a media server operator, I want to cancel a scheduled or in-progress recording, so that I can free resources when plans change
8. As a media server operator, I want to view the full system health status (queue depth, active recordings, Redis connection), so that I can diagnose issues
9. As a media server operator, I want to query recording history with status and metadata, so that I can audit what was captured
10. As a media server operator, I want orphaned FFmpeg processes to be detected and cleaned up automatically, so that system resources are not wasted

## Implementation Decisions

### Architecture
- **Express** for REST API with `socket.io` for WebSocket push
- **BullMQ** with two dedicated queues (ProbeQueue, RecordQueue) and separate worker processes
- **Redis** for job persistence, queue state, and inter-process communication
- **FFmpeg via child_process.spawn** (not fluent-ffmpeg wrapper) for fine-grained process control during recording; `fluent-ffmpeg` reserved for post-processing transcoding where the higher-level API is beneficial
- **Media Pipeline**: a post-recording worker that handles TS→HLS transcoding, thumbnail extraction via FFmpeg, and metadata extraction via ffprobe

### Recording State Machine
States: PENDING → RECORDING → TRANSCODING → DONE
Error recovery: RECORDING → RETRYING (max 3 retries, exponential backoff) → FAILED
Network recovery: FFmpeg resumed with `-ss` seek to last known position

### Data Models
- **Channel**: id, name, url (m3u8), group, status (unknown/online/offline), metadata (resolution, bitrate, latency)
- **Recording**: id, channelId, channelName, cronExpression, duration (minutes), status (pending/recording/transcoding/done/failed), retryCount, maxRetries, lastError, scheduledAt

### REST API
10 endpoints covering channels CRUD + probe, recordings CRUD + cancel, and system health. Documented via swagger-jsdoc + swagger-ui-express.

### Security
FFmpeg parameters sanitized — m3u8 URL pattern validation, no shell injection vectors (spawn with argument array, never shell string). Orphaned process detection via heartbeat + timeout.

### Temporal Decisions
- Monorepo with clear package boundaries (api/, workers/, shared/)
- No database in Phase A — all state in Redis via BullMQ job data
- Configurable recording output paths (per-channel or global default)
- Unit tests with mocked FFmpeg, integration tests with real BullMQ + mock Redis

## Testing Decisions

- **Unit tests**: Service layer CRUD logic, validation, state transition logic — pure function tests, no I/O
- **Mock tests**: Worker logic with mocked FFmpeg child_process — verify spawn args, exit code handling, retry logic
- **Integration tests**: BullMQ queue operations with mock Redis — verify job lifecycle, cron scheduling, concurrency
- **E2E tests**: Full recording cycle with real FFmpeg (when available) — smoke test
- Good tests only verify external behavior (API responses, state transitions, file output), never implementation details (internal method calls, private state)

## Out of Scope
- User authentication and permissions (Phase B)
- Multi-device sync (Phase C)
- Media library management / catalog (Phase D)
- Frontend UI (separate phase after API is stable)
- Database (Redis-only persistence in Phase A)
- HLS-to-mp4 or other output formats beyond TS→HLS
- Hardware acceleration (NVENC, VAAPI — future optimization)

## Further Notes

This is the first module of a larger platform. The IPTV Recording Engine is intentionally scoped as the narrowest wedge that delivers standalone value while establishing the architecture (BullMQ, Redis, FFmpeg integration) that subsequent modules will build upon.

Module A targets 3-5 days human-equivalent engineering effort. All API routes are prefixed `/api/` for future reverse-proxy compatibility.
