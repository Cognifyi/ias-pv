# Issue Review: #2 — Slice-2: Channel probe system

## Review Status: PASS
## QA Status: N/A (no frontend)
## Tests Status: PASS (24/24)

## Files Changed
- packages/shared/src/channel.ts (UpdateChannelInput widened)
- packages/api/src/channel.service.ts (update() now spreads all fields)
- packages/api/src/queue.ts (BullMQ queue + Redis connection)
- packages/api/src/ws.ts (WebSocket server)
- packages/api/src/probe.worker.ts (HTTP HEAD + ffprobe probe worker)
- packages/api/src/app.ts (probe endpoint added)
- packages/api/src/index.ts (top-level await worker init)

## Key Findings
- Bug found + fixed: `ChannelService.update()` did not spread `status`/`metadata` fields (only `name`/`url`/`group`)
- `UpdateChannelInput` widened from `Partial<CreateChannelInput>` to `Partial<Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>>` to auto-sync with Channel model
- Redis started on port 6380 (protected mode disabled for dev)

## Acceptance Criteria Verification
- [x] POST /api/channels/:id/probe returns 202 + job ID
- [x] Worker runs probe: HEAD check, ffprobe metadata, latency measurement
- [x] Channel status updates to online/offline after probe
- [x] WebSocket emits probe:progress and probe:complete events
- [x] Timeout/non-m3u8/network errors handled without crash
- [x] Unit tests pass (2/2)
- [x] Integration tests pass (12/12 existing + 2 new)
