# SPEC-001-iptv-recording-engine

## Source
- Eng Review: DECISION-002-ceo-review-scope-decisions
- Date: 2026-05-23T13:00:00Z

## Architecture Overview
```
┌───────────────────────────────────────────────────────────┐
│                   ias-pv — Phase 1                         │
│                                                           │
│  ┌─────────────────────┐   ┌───────────────────────────┐  │
│  │  REST API (Express)  │   │  WebSocket (socket.io)    │  │
│  │  - Channel CRUD      │   │  - Recording progress     │  │
│  │  - Recording CRUD    │   │  - Probe results           │  │
│  │  - System status     │   │  - Task state changes      │  │
│  └─────────┬───────────┘   └────────────┬──────────────┘  │
│            │                            │                  │
│  ┌─────────┴────────────────────────────┴──────────────┐  │
│  │              Service Layer                           │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ ChannelService   │  │ RecordingService         │   │  │
│  │  │ - CRUD operations│  │ - Schedule management    │   │  │
│  │  │ - Health check   │  │ - Status tracking        │   │  │
│  │  └────────┬────────┘  │ - FFmpeg process mgmt    │   │  │
│  │           │            └───────────┬──────────────┘   │  │
│  │  ┌────────┴───────────────────────┴──────────────┐   │  │
│  │  │           BullMQ                              │   │  │
│  │  │  ┌────────────────┐ ┌────────────────────┐    │   │  │
│  │  │  │ ProbeQueue      │ │ RecordQueue         │    │   │  │
│  │  │  │ - HTTP check    │ │ - FFmpeg spawn      │    │   │  │
│  │  │  │ - TS delay test │ │ - Process monitor   │    │   │  │
│  │  │  │ - Resolution    │ │ - Reconnect logic   │    │   │  │
│  │  │  └────────────────┘ └────────────────────┘    │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Media Pipeline (Worker)                              │  │
│  │  - TS → HLS transcoding                               │  │
│  │  - Thumbnail extraction                               │  │
│  │  - Metadata extraction (ffprobe)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Recording State Machine
```
                  ┌──────────┐
                  │  PENDING  │
                  └────┬─────┘
                       │ (cron trigger / manual start)
                       ▼
                  ┌──────────┐
           ┌──────│RECORDING │◄──────────────┐
           │      └────┬─────┘               │
           │           │                     │
           │      ┌────┴─────┐               │
           │      │  Network  │──────────────┘
           │      │  Lost     │ (reconnect)
           │      └──────────┘
           │           │ (max retries exceeded)
           │           ▼
           │      ┌──────────┐
           │      │  FAILED  │
           │      └──────────┘
           │
           │ (recording completed)
           ▼
     ┌────────────┐
     │TRANSCODING  │
     └──────┬─────┘
            │ (done)
            ▼
      ┌──────────┐
      │  DONE    │
      └──────────┘
```

## Data Flow — Recording Lifecycle

### Happy Path
```
User → POST /recordings (schedule)
  → RecordingService.create()
  → BullMQ RecordQueue.add(job) with cron
  → [at scheduled time] Worker picks job
  → FFmpeg child_process.spawn(INPUT=m3u8_url, OUTPUT=file.ts)
  → Monitor stderr for progress
  → On 'close' with code 0: job complete
  → Trigger MediaPipeline (TS→HLS, thumbnails, metadata)
  → WebSocket emits "recording:done"
  → State: DONE
```

### Error Path — Network Disconnect
```
FFmpeg process exits with code != 0
  → Worker detects exit code
  → Check retry count < MAX_RETRIES (default: 3)
  → If yes: increment retry, re-add job with delay (exponential backoff)
    → FFmpeg spawn with -ss flag for seek to last known position
  → If no: mark FAILED, emit WebSocket notification
```

## Interface Design

### REST API Endpoints
```
GET    /api/channels          — List channels
POST   /api/channels          — Create channel
GET    /api/channels/:id      — Get channel detail
PUT    /api/channels/:id      — Update channel
DELETE /api/channels/:id      — Delete channel
POST   /api/channels/:id/probe— Probe channel health

GET    /api/recordings        — List recordings
POST   /api/recordings        — Schedule recording
GET    /api/recordings/:id    — Get recording status
DELETE /api/recordings/:id    — Cancel recording

GET    /api/health            — System health status
```

### WebSocket Events (socket.io)
```
server → client:
  probe:progress    — { channelId, status, latency, resolution }
  probe:complete    — { channelId, result }
  recording:progress— { recordingId, duration, size }
  recording:done    — { recordingId, outputPath }
  recording:failed  — { recordingId, error }
```

## Data Model

### Channel
```typescript
interface Channel {
  id: string;
  name: string;
  url: string;          // m3u8 URL
  group: string;        // channel group/category
  status: 'unknown' | 'online' | 'offline';
  metadata?: {
    resolution?: string;
    bitrate?: number;
    latency?: number;    // TS delay in ms
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Recording
```typescript
interface Recording {
  id: string;
  channelId: string;
  channelName: string;
  cronExpression: string;   // cron schedule
  duration: number;          // max recording duration (minutes)
  status: RecordingStatus;
  outputPath?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type RecordingStatus = 
  | 'pending' 
  | 'recording' 
  | 'transcoding' 
  | 'done' 
  | 'failed';
```

## Test Strategy
- **Unit tests**: Service layer logic (CRUD, validation, state transitions)
- **Mock tests**: Worker logic with mocked FFmpeg child_process
- **Integration tests**: BullMQ queue operations (with mock Redis)
- **E2E tests**: Full recording cycle (requires FFmpeg installed)

## NFR Considerations
- **Security**: FFmpeg parameter sanitization (URL validation against m3u8 pattern, no shell injection vectors)
- **Performance**: Probe concurrency configurable (default 50 parallel)
- **Reliability**: Job persistence via Redis, retry with exponential backoff
- **Observability**: Structured logging + WebSocket events for real-time monitoring
- **Resource cleanup**: Orphaned FFmpeg processes detected via health check + timeout
