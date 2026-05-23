# Issue Review: #3 — Slice-3: Recording scheduler + FFmpeg execution

## Review Status: PASS
## QA Status: N/A (no frontend)
## Tests Status: PASS (40/40)

## Files Changed
- packages/shared/src/recording.ts (Recording types)
- packages/shared/src/index.ts (barrel export update)
- packages/api/src/recording.service.ts (CRUD + state machine + retry logic)
- packages/api/src/recording.worker.ts (FFmpeg spawn, progress parsing, cancel, retry)
- packages/api/src/recording.routes.ts (REST endpoints for recordings)
- packages/api/src/queue.ts (added recordQueue)
- packages/api/src/app.ts (wired recording router)
- packages/api/test/recording.service.test.ts (7 unit tests)
- packages/api/test/recording.worker.test.ts (3 tests: arg building, shell injection safety, cancel)
- packages/api/test/channel.routes.test.ts (added 5 recording API integration tests)

## Key Findings
- FFmpeg args built as array (no shell injection)
- FFmpeg `-c copy` used for stream copy (no re-encode) for speed
- Recording state machine: pending → recording → done/failed
- Retry with exponential backoff (30s, 2m, 5m) via BullMQ delay
- Active process tracking for SIGTERM-based cancellation
- WebSocket emits: recording:progress, recording:done, recording:retrying, recording:failed

## Acceptance Criteria Verification
- [x] POST /api/recordings schedules a recording and enqueues job
- [x] Worker spawns FFmpeg with argument array (no shell string)
- [x] State transitions: PENDING → RECORDING → DONE
- [x] Retry logic: incrementRetry, exponential backoff via BullMQ delay
- [x] DELETE /api/recordings/:id cancels (kills FFmpeg + marks failed)
- [x] WebSocket emits progress/done/failed events
- [x] All FFmpeg params passed as spawn argument array
- [x] Unit/integration tests pass (40/40)
