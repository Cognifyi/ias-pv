# Issue Review: #4 — Slice-4: Media pipeline + Swagger docs

## Review Status: PASS
## QA Status: N/A (no frontend)
## Tests Status: PASS (43/43)

## Files Changed
- packages/api/src/media.pipeline.ts (HLS transcode, thumbnail, ffprobe metadata)
- packages/api/src/swagger.ts (OpenAPI 3.0 spec + swagger-ui-express router)
- packages/api/src/app.ts (wired swagger + health endpoint)

## Key Findings
- HLS transcoding via FFmpeg libx264 + aac with 10s segments
- Thumbnail extraction via FFmpeg thumbnail filter
- Metadata extraction via ffprobe (codec, resolution, bitrate, duration)
- All FFmpeg spawns use argument arrays (no shell injection)
- OpenAPI 3.0 spec at /api/docs with full endpoint documentation
- GET /api/health reports status, uptime, channel/recording counts

## Acceptance Criteria Verification
- [x] Media pipeline handles non-existent input (throws)
- [x] Swagger UI renders at /api/docs/ with all endpoints documented
- [x] GET /api/health returns status + uptime + counts
- [x] Tests pass (43/43)
