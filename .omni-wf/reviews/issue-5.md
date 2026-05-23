# Issue Review: #5 — Slice-5: Orphan cleanup + health daemon + QA hardening

## Review Status: PASS
## QA Status: N/A (no frontend)
## Tests Status: PASS (46/46)

## Files Changed
- packages/api/src/health.daemon.ts (periodic orphan FFmpeg detection + kill)
- packages/api/src/logger.ts (structured JSON logger with level filtering)
- packages/api/src/recording.worker.ts (silent crash detection via output file check + logger integration)
- packages/api/src/recording.routes.ts (per-channel outputPath support)
- packages/api/src/index.ts (graceful shutdown with drain + health daemon startup)
- packages/shared/src/channel.ts (metadata.outputPath field)

## Key Findings
- HealthDaemon checks tracked PIDs every 30s, kills orphans exceeding 1h timeout
- Silent crash detection: FFmpeg exit 0 with no output file → treated as failure + retry
- Graceful shutdown (SIGTERM/SIGINT): drain queues, kill processes, close connections
- Structured JSON logger with level filtering and context fields
- Per-channel output path via channel.metadata.outputPath with global fallback

## Acceptance Criteria Verification
- [x] Graceful shutdown: SIGTERM drains queues and cleans up
- [x] FFmpeg silent crash (exit 0, no output) detected and marked FAILED
- [x] Structured logging via JSON logger
- [x] Configurable output path per channel (with global default fallback)
- [x] All existing tests pass (46/46)
