# Decision: DECISION-003-eng-review-tech-architecture

## Phase: INCEPTION
## Sub-phase: eng-review
## Date: 2026-05-23T13:00:00Z
## Status: PENDING

## Context
Eng Review of the IPTV Recording Engine (Module A) — technical architecture, data flow, interface design, test strategy, and NFRs.

## Decision

### Architecture
1. **Express + socket.io** for REST API + WebSocket push
2. **BullMQ dual queues** (ProbeQueue + RecordQueue) with separate workers
3. **Redis** for queue persistence and job state
4. **child_process.spawn** for FFmpeg (not fluent-ffmpeg wrapper) for fine-grained process control during recording
5. **Media Pipeline** as a post-recording worker for TS→HLS transcoding, thumbnail extraction, ffprobe metadata

### Recording State Machine
- States: PENDING → RECORDING → TRANSCODING → DONE
- Error path: RECORDING → RETRYING (max 3 retries, exponential backoff) → FAILED
- Network recovery: seek via FFmpeg `-ss` flag to last known position

### Security
- FFmpeg parameters MUST be sanitized — URL validated against m3u8 pattern regex
- No shell injection vectors: use `spawn` with argument array, never `exec` or shell string
- Orphaned FFmpeg process detection via health check + timeout (configurable, default 30s)

### Performance
- Probe concurrency: configurable (default 50 parallel probes)
- Recording queue: sequential per-channel (BullMQ group concurrency)
- Storage: configurable output paths per channel

### Test Strategy
- Unit tests: service layer CRUD, validation, state transitions
- Mock tests: worker logic with mocked FFmpeg child_process
- Integration tests: BullMQ queue operations (with mock Redis)
- E2E: full recording cycle (requires FFmpeg installed)

### Interface Design
- REST API: 10 endpoints (channels CRUD + probe, recordings CRUD + cancel, health)
- WebSocket: 4 event types (probe:progress, probe:complete, recording:progress, recording:done/failed)
- Swagger docs via `swagger-jsdoc` + `swagger-ui-express`

## Consequences
- +2d for Swagger integration (accepted expansion)
- +1d for WebSocket push (accepted expansion)
- Sequential recording per-channel prevents disk I/O contention
- spawn-based FFmpeg control enables accurate progress reporting via stderr parsing
- Redis dependency introduces operational complexity but is necessary for BullMQ
