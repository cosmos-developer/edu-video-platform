# Video Player System Architecture v2

## Overview

The Interactive Learning Platform's video player system is a sophisticated educational technology stack that provides milestone-based learning experiences with interactive questions, real-time progress tracking, and multi-device session persistence. This document reflects the current implementation as of the latest codebase updates.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        subgraph "Components"
            VPP[VideoPlayerPage]
            VP[VideoPlayer]
            QO[QuestionOverlay]
            MM[MilestoneMarkers]
            VC[VideoControls]
        end
        
        subgraph "State Management"
            VSM[VideoStateManager<br/>Singleton]
            VSC[VideoStateContext]
            UVS[useVideoState Hook]
            USS[useSessionState Hook]
        end
        
        subgraph "Services"
            VS[videoService]
            SS[sessionService]
            API[API Client]
        end
    end
    
    subgraph "Backend Layer"
        subgraph "API Routes"
            VR[Video Routes<br/>/api/videos/*]
            SR[Session Routes<br/>/api/sessions/*]
            MR[Milestone Routes<br/>/api/milestones/*]
            QR[Question Routes<br/>/api/questions/*]
            AR[Analytics Routes<br/>/api/analytics/*]
        end
        
        subgraph "Business Logic"
            VSB[VideoService]
            VSS[VideoSessionService]
            VPS[VideoProcessingService]
            AQS[AIQuestionService]
            AS[AnalyticsService]
        end
        
        subgraph "Storage"
            GCS[Google Cloud Storage]
            FS[Local File System]
        end
    end
    
    subgraph "Data Layer"
        PC[Prisma Client<br/>ORM]
        PG[(PostgreSQL<br/>Database)]
    end
    
    %% Frontend component connections
    VPP --> VP
    VP --> QO
    VP --> MM
    VP --> VC
    VP --> UVS
    VP --> VSM
    UVS --> VSC
    USS --> VSC
    VSC --> VSM
    
    %% Frontend service connections
    VP --> SS
    VP --> VS
    VSM --> VS
    VSM --> SS
    VS --> API
    SS --> API
    
    %% API Gateway connections (Frontend -> Backend)
    API -.->|HTTP/HTTPS| VR
    API -.->|HTTP/HTTPS| SR
    API -.->|HTTP/HTTPS| MR
    API -.->|HTTP/HTTPS| QR
    API -.->|HTTP/HTTPS| AR
    
    %% Backend route to service connections
    VR --> VSB
    SR --> VSS
    MR --> VSB
    QR --> VSB
    AR --> AS
    
    %% Backend service connections
    VSB --> VPS
    VSB --> GCS
    VPS --> FS
    VPS --> GCS
    
    %% Backend to Data Layer (Only backend accesses database)
    VSB --> PC
    VSS --> PC
    AS --> PC
    AQS --> PC
    PC --> PG
    
    %% Styling
    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef state fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#ff6f00,stroke-width:2px
    classDef backend fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef data fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef storage fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class VPP,VP,QO,MM,VC,VS,SS,API frontend
    class VSM,VSC,UVS,USS state
    class VR,SR,MR,QR,AR api
    class VSB,VSS,VPS,AQS,AS backend
    class PC,PG data
    class GCS,FS storage
```

## Core Components

### Frontend Components

#### VideoPlayer (`frontend/src/components/video/VideoPlayer.tsx`)
The main video playback component that orchestrates the entire learning experience.

**Key Responsibilities:**
- Video playback control and state management
- Milestone detection and triggering (within 2-second tolerance)
- Session lifecycle management (start, progress, complete)
- Progress tracking with 5-second update intervals
- Question overlay display coordination

**State Management:**
- Uses `useVideoState` hook for unified video/milestone data
- Maintains local state for playback controls (play, pause, volume, etc.)
- Tracks watch time and session progress
- Manages milestone reached states to prevent duplicate triggers

**Key Features:**
- Automatic session resumption from last position
- Real-time milestone checking during playback
- Pause video automatically when questions appear
- Progress persistence across page refreshes

#### VideoStateManager (`frontend/src/stores/VideoStateManager.ts`)
Centralized singleton state manager for all video-related data.

**Core Functionality:**
- Caches video, milestone, and question data
- Manages session state and progress
- Provides subscription-based state updates
- Handles optimistic updates for better UX

**Data Structures:**
```typescript
VideoState {
  video: Video
  milestones: Milestone[]
  questions: Map<string, Question[]>
  metadata: {
    totalMilestones: number
    totalQuestions: number
    questionsPerMilestone: Map<string, number>
    lastUpdated: Date
    isLoading: boolean
    error: string | null
  }
}

SessionState {
  session: VideoSession
  milestoneProgress: Set<string>
  questionAnswers: Map<string, QuestionAnswer>
  currentMilestone: Milestone | null
  metadata: {
    correctAnswers: number
    totalAnswers: number
    completionPercentage: number
    lastUpdated: Date
  }
}
```

#### QuestionOverlay (`frontend/src/components/video/QuestionOverlay.tsx`)
Modal component for displaying and handling interactive questions.

**Features:**
- Supports multiple question types (Multiple Choice, True/False, Short Answer)
- Real-time answer validation
- Feedback display with explanations
- Progress tracking within question sets

#### MilestoneMarkers (`frontend/src/components/video/MilestoneMarkers.tsx`)
Visual timeline component showing milestone positions.

**Features:**
- Interactive timeline with clickable markers
- Visual indicators for reached/unreached milestones
- Color coding for different milestone types
- Hover tooltips with milestone details

#### VideoControls (`frontend/src/components/video/VideoControls.tsx`)
Custom video control bar with enhanced features.

**Controls:**
- Play/Pause toggle
- Seekable progress bar
- Volume control with mute
- Fullscreen toggle
- Time display (current/total)
- Playback speed adjustment

### Backend Services

#### VideoService (`src/services/VideoService.ts`)
Core service for video management operations.

**Responsibilities:**
- Video CRUD operations with multi-tenant support
- Integration with storage services (GCS/local)
- Metadata extraction via VideoProcessingService
- Access control and enrollment verification
- Streaming URL generation with authentication

#### VideoSessionService (`src/services/VideoSessionService.ts`)
Manages student learning sessions and progress tracking.

**Key Functions:**
- Session creation and resumption logic
- Progress tracking with automatic save
- Milestone achievement recording
- Question answer validation and scoring
- Session completion with metrics calculation

**Session Lifecycle:**
1. **Start/Resume**: Creates new or retrieves existing session
2. **Progress Update**: Saves position and watch time periodically
3. **Milestone Reached**: Records achievement with timestamp
4. **Question Submit**: Validates answers and updates scores
5. **Complete**: Finalizes session with completion metrics

#### AIQuestionService (`src/services/AIQuestionService.ts`)
AI-powered question generation service.

**Features:**
- Multi-provider support (OpenAI, Claude)
- Context-aware question generation
- Multiple question type generation
- Difficulty level customization
- Batch question creation for milestones

#### VideoProcessingService (`src/services/VideoProcessingService.ts`)
Handles video file processing and metadata extraction.

**Processing Pipeline:**
1. Upload validation (format, size)
2. Metadata extraction (FFprobe)
3. Thumbnail generation (FFmpeg)
4. Duration calculation
5. Database update with metadata

### Data Models

#### Core Video Models
```prisma
Video {
  id: String
  title: String
  description: String?
  videoGroupId: String
  uploadedBy: String
  uploadedAt: DateTime
  processedAt: DateTime?
  status: VideoStatus
  duration: Float?
  metadata: Json?
  storageUrl: String
  thumbnailUrl: String?
  milestones: Milestone[]
  studentSessions: StudentSession[]
}

Milestone {
  id: String
  videoId: String
  timestamp: Float
  type: MilestoneType
  title: String
  description: String?
  order: Int
  isRequired: Boolean
  retryLimit: Int
  questions: Question[]
}

Question {
  id: String
  milestoneId: String
  type: QuestionType
  text: String
  questionData: Json
  explanation: String?
  createdById: String
  options: QuestionOption[]
}
```

#### Progress Tracking Models
```prisma
StudentSession {
  id: String
  studentId: String
  videoId: String
  status: SessionStatus
  currentPosition: Float
  totalWatchTime: Float
  completedMilestones: String[]
  sessionData: Json?
  startedAt: DateTime
  completedAt: DateTime?
  lastSeenAt: DateTime
  milestoneProgress: MilestoneProgress[]
  questionAttempts: QuestionAttempt[]
}

MilestoneProgress {
  id: String
  sessionId: String
  milestoneId: String
  reachedAt: DateTime
  attemptNumber: Int
}

QuestionAttempt {
  id: String
  sessionId: String
  questionId: String
  milestoneId: String
  studentAnswer: String
  isCorrect: Boolean?
  score: Float?
  feedback: String?
  attemptedAt: DateTime
}
```

## Data Flow Patterns

### 1. Video Loading with State Management

```mermaid
sequenceDiagram
    participant User
    participant VPP as VideoPlayerPage
    participant Hook as useVideoState
    participant VSM as VideoStateManager
    participant VS as videoService
    participant API as API Client
    participant BE as Backend API
    participant DB as PostgreSQL

    User->>VPP: Navigate to video page
    VPP->>Hook: useVideoState(videoId)
    Hook->>VSM: getVideoState(videoId)
    
    alt Cache Hit (< 30s old)
        VSM-->>Hook: Return cached state
        Hook-->>VPP: Video data
    else Cache Miss or Stale
        VSM->>VS: getVideo(videoId)
        VS->>API: GET /api/videos/:id
        API->>BE: HTTP Request
        BE->>DB: Query video + milestones + questions
        DB-->>BE: Video data with relations
        BE-->>API: Video response
        API-->>VS: Video object
        VS-->>VSM: Video data
        VSM->>VSM: Update cache
        VSM->>VSM: Notify subscribers
        VSM-->>Hook: Video state
        Hook-->>VPP: Video data
    end
    
    VPP->>VPP: Render video player
```

### 2. Session Management Flow

```mermaid
sequenceDiagram
    participant User
    participant VP as VideoPlayer
    participant VSM as VideoStateManager
    participant SS as sessionService
    participant API as API Client
    participant BE as Backend API
    participant VSS as VideoSessionService
    participant DB as PostgreSQL

    User->>VP: Click play button
    VP->>VP: Check currentSession
    
    alt No existing session
        VP->>SS: startSession(videoId)
        SS->>API: POST /api/sessions/start
        API->>BE: HTTP Request
        BE->>VSS: startOrResumeSession()
        VSS->>DB: Check existing session
        
        alt Session exists
            DB-->>VSS: Existing session
            VSS->>VSS: Resume session
        else No session
            VSS->>DB: Create new session
            DB-->>VSS: New session
        end
        
        VSS->>DB: Load progress data
        DB-->>VSS: MilestoneProgress, QuestionAttempts
        VSS-->>BE: Session with progress
        BE-->>API: Session response
        API-->>SS: Session object
        SS-->>VP: Session data
        VP->>VSM: Update session state
        VSM->>VSM: Notify subscribers
    else Session exists
        VP->>VP: Use existing session
    end
    
    VP->>VP: video.play()
    VP->>VP: Start from currentPosition
```

### 3. Milestone Detection and Question Flow

```mermaid
sequenceDiagram
    participant V as Video Element
    participant VP as VideoPlayer
    participant VSM as VideoStateManager
    participant SS as sessionService
    participant QO as QuestionOverlay
    participant API as API Client
    participant BE as Backend API
    participant VSS as VideoSessionService
    participant DB as PostgreSQL

    V->>VP: timeupdate event
    VP->>VP: checkForMilestones(currentTime)
    VP->>VSM: Get milestones from state
    VSM-->>VP: Milestones array
    
    VP->>VP: Find milestone within 2s window
    VP->>VP: Check if not already reached
    
    alt Milestone found and not reached
        VP->>VP: Add to locallyReachedMilestones
        VP->>V: Pause video
        VP->>SS: markMilestoneReached(sessionId, milestoneId)
        SS->>API: POST /api/sessions/:id/milestone
        API->>BE: HTTP Request
        BE->>VSS: markMilestoneReached()
        VSS->>DB: Create MilestoneProgress record
        DB-->>VSS: Success
        VSS-->>BE: Updated session
        BE-->>API: Response
        API-->>SS: Success
        
        VP->>VP: setCurrentMilestone(milestone)
        VP->>VP: setShowQuestionOverlay(true)
        VP->>QO: Display questions
        
        loop For each question
            QO->>User: Show question
            User->>QO: Submit answer
            QO->>SS: submitAnswer(sessionId, questionId, answer)
            SS->>API: POST /api/sessions/:id/question
            API->>BE: HTTP Request
            BE->>VSS: submitAnswer()
            VSS->>DB: Validate answer
            DB-->>VSS: Correct answer
            VSS->>DB: Create QuestionAttempt
            DB-->>VSS: Success
            VSS-->>BE: Result with explanation
            BE-->>API: Answer result
            API-->>SS: Response
            SS-->>QO: {isCorrect, explanation}
            QO->>VSM: Update question answers
            QO->>User: Show feedback
        end
        
        QO->>VP: onComplete()
        VP->>VP: setShowQuestionOverlay(false)
        VP->>V: Resume video
    end
```

### 4. Progress Tracking Flow

```mermaid
sequenceDiagram
    participant Timer as Progress Timer
    participant VP as VideoPlayer
    participant V as Video Element
    participant SS as sessionService
    participant API as API Client
    participant BE as Backend API
    participant VSS as VideoSessionService
    participant DB as PostgreSQL
    participant VSM as VideoStateManager

    Note over Timer,VP: Every 5 seconds during playback
    
    Timer->>VP: Interval fires
    VP->>V: Get currentTime
    V-->>VP: Current position
    VP->>VP: Calculate totalWatchTime
    
    alt Significant change (>5s or >5 position)
        VP->>SS: updateProgress(sessionId, data)
        SS->>API: PUT /api/sessions/:id/progress
        API->>BE: HTTP Request with {currentTime, totalWatchTime}
        BE->>VSS: updateProgress()
        VSS->>DB: Update StudentSession
        DB-->>VSS: Updated session
        VSS->>DB: Update sessionData JSON
        DB-->>VSS: Success
        VSS-->>BE: Updated session
        BE-->>API: Response
        API-->>SS: Session data
        SS->>VSM: Update session state
        VSM->>VSM: Update cache
        VSM->>VSM: Notify subscribers
        VP->>VP: Update lastProgressUpdate
    else No significant change
        VP->>VP: Skip update
    end
```

### 5. Video Upload and Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant VUF as VideoUploadForm
    participant VS as videoService
    participant API as API Client
    participant BE as Backend API
    participant VSB as VideoService
    participant VPS as VideoProcessingService
    participant GCS as Google Cloud Storage
    participant FFmpeg
    participant DB as PostgreSQL

    User->>VUF: Select video file
    VUF->>VUF: Validate file (type, size)
    VUF->>VS: uploadVideoFile(file, groupId)
    VS->>VS: Create FormData
    VS->>API: POST /api/videos/groups/:id/videos
    API->>BE: Multipart upload
    BE->>BE: Validate auth & permissions
    BE->>VSB: createVideo()
    VSB->>GCS: Upload video file
    GCS-->>VSB: Storage URL
    VSB->>DB: Create Video record (PROCESSING status)
    DB-->>VSB: Video ID
    
    VSB->>VPS: processVideo(videoId, filePath)
    VPS->>FFmpeg: Extract metadata
    FFmpeg-->>VPS: Duration, resolution, codec
    VPS->>FFmpeg: Generate thumbnail
    FFmpeg-->>VPS: Thumbnail image
    VPS->>GCS: Upload thumbnail
    GCS-->>VPS: Thumbnail URL
    VPS->>DB: Update Video (duration, metadata, thumbnail)
    DB-->>VPS: Success
    
    VPS-->>VSB: Processing complete
    VSB->>DB: Update status to READY
    DB-->>VSB: Success
    VSB-->>BE: Video object
    BE-->>API: Response
    API-->>VS: Video data
    VS-->>VUF: Upload complete
    VUF->>User: Show success
```

### 6. AI Question Generation Flow

```mermaid
sequenceDiagram
    participant Teacher
    participant AQG as AIQuestionGenerator
    participant AQS as AIQuestionService
    participant API as API Client
    participant BE as Backend API
    participant AQSB as AIQuestionService (Backend)
    participant AI as AI Provider (OpenAI/Claude)
    participant DB as PostgreSQL
    participant VSM as VideoStateManager

    Teacher->>AQG: Request question generation
    AQG->>AQG: Prepare context (video title, description, transcript)
    AQG->>API: POST /api/ai/generate-questions
    API->>BE: Request with context
    BE->>AQSB: generateQuestions(request)
    
    alt Provider is OpenAI
        AQSB->>AI: ChatGPT API call
    else Provider is Claude
        AQSB->>AI: Claude API call
    end
    
    AI-->>AQSB: Generated questions JSON
    AQSB->>AQSB: Parse and validate response
    
    loop For each question
        AQSB->>DB: Create Question record
        DB-->>AQSB: Question ID
        
        alt Question type is MULTIPLE_CHOICE
            AQSB->>DB: Create QuestionOption records
            DB-->>AQSB: Success
        end
    end
    
    AQSB->>DB: Link questions to milestone
    DB-->>AQSB: Success
    AQSB-->>BE: Questions created
    BE-->>API: Response with question IDs
    API-->>AQG: Success
    
    AQG->>VSM: addQuestions(videoId, milestoneId, questions)
    VSM->>VSM: Update cache
    VSM->>VSM: Notify subscribers
    AQG->>Teacher: Show generated questions
```

### 7. Session Recovery Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant VPP as VideoPlayerPage
    participant Hook as useVideoState
    participant VSM as VideoStateManager
    participant SS as sessionService
    participant API as API Client
    participant BE as Backend API
    participant DB as PostgreSQL

    User->>Browser: Refresh page / Network recovery
    Browser->>VPP: Reload VideoPlayerPage
    VPP->>Hook: useVideoState(videoId)
    Hook->>VSM: Check for cached session
    
    alt Session in cache
        VSM-->>Hook: Cached session data
    else No cached session
        VSM->>SS: getActiveSession(videoId)
        SS->>API: GET /api/sessions/active?videoId=:id
        API->>BE: HTTP Request
        BE->>DB: Query active session for user
        DB-->>BE: Session with progress
        BE-->>API: Session data
        API-->>SS: Session object
        SS-->>VSM: Session data
        VSM->>VSM: Update cache
    end
    
    VSM-->>Hook: Session state
    Hook-->>VPP: Session data
    VPP->>VPP: Initialize video at currentPosition
    VPP->>VPP: Restore milestone progress
    VPP->>VPP: Show completion status
    VPP->>User: Resumed session
```

## Key Features Implementation

### Milestone Tolerance System
- Milestones trigger within a 2-second window of their timestamp
- Prevents duplicate triggers using local and server tracking
- Immediately adds to local state to prevent re-triggering

### Session Persistence
- Sessions saved to database with current position
- Automatic resumption on page reload
- Cross-device continuation support
- Session recovery after network failures

### Progress Calculation
- Real-time completion percentage
- Watch time tracking (actual time watched, not video duration)
- Milestone achievement tracking
- Question answer statistics

### State Synchronization
- VideoStateManager acts as single source of truth
- Subscription-based updates for reactive UI
- Optimistic updates for better perceived performance
- Cache invalidation after 30 seconds

## Performance Optimizations

### Frontend
1. **Debounced Progress Updates**: Updates sent every 5 seconds
2. **State Caching**: 30-second cache for video data
3. **Lazy Loading**: Components loaded on demand
4. **Optimistic UI Updates**: Immediate local state updates

### Backend
1. **Database Indexing**: Optimized queries on frequently accessed fields
2. **Streaming Responses**: Video served with range requests
3. **Connection Pooling**: Prisma connection management
4. **Query Optimization**: Selective field loading with Prisma select

## Security Measures

### Authentication & Authorization
- JWT-based authentication for all API calls
- Role-based access control (Student, Teacher, Admin)
- Enrollment verification for video access
- Token refresh mechanism for long sessions

### Data Protection
- Input validation on all endpoints
- SQL injection prevention via Prisma parameterized queries
- XSS protection through React's automatic escaping
- CORS configuration for API security

### Video Security
- Signed URLs for video streaming
- Access token validation on stream requests
- Rate limiting on API endpoints
- File upload validation and sanitization

## Error Handling Strategy

### Frontend Error Recovery
- Network failure retry with exponential backoff
- Graceful degradation for missing features
- User-friendly error messages
- Automatic session recovery

### Backend Error Handling
- Structured error responses with error codes
- Detailed logging for debugging
- Transaction rollback on failures
- Circuit breaker pattern for external services

## Testing Considerations

### Unit Testing
- Component testing with React Testing Library
- Service layer testing with mocked dependencies
- State manager testing with various scenarios

### Integration Testing
- API endpoint testing with supertest
- Database integration tests with test database
- Video processing pipeline testing

### E2E Testing
- Full user journey testing
- Cross-browser compatibility
- Mobile responsiveness
- Performance testing under load

## Future Enhancements

### Planned Features
1. **Adaptive Bitrate Streaming**: Quality adjustment based on bandwidth
2. **Offline Mode**: Download videos for offline viewing
3. **Collaborative Features**: Shared watching sessions
4. **Advanced Analytics**: Detailed learning analytics dashboard
5. **AI-Powered Recommendations**: Personalized learning paths

### Technical Improvements
1. **WebSocket Integration**: Real-time progress sync
2. **CDN Integration**: Global video delivery
3. **Microservices Architecture**: Service decomposition
4. **GraphQL API**: More efficient data fetching
5. **Server-Side Rendering**: Improved SEO and performance

## Deployment Considerations

### Infrastructure Requirements
- Node.js 18+ for backend
- PostgreSQL 14+ for database
- Redis for session caching (optional)
- FFmpeg for video processing
- Google Cloud Storage for video storage

### Scaling Strategy
- Horizontal scaling for API servers
- Read replicas for database
- CDN for static assets and videos
- Queue system for video processing
- Load balancing with health checks

## Monitoring & Observability

### Metrics to Track
- Video loading times
- Session creation success rate
- Question answer submission latency
- Progress update frequency
- Error rates by endpoint

### Logging Strategy
- Structured logging with correlation IDs
- Error tracking with stack traces
- Performance metrics logging
- User action audit trail
- Security event logging

## Conclusion

The video player system architecture provides a robust foundation for interactive video-based learning. The combination of real-time state management, milestone-based interactions, and comprehensive progress tracking creates an engaging educational experience. The modular design allows for easy extension and maintenance while maintaining high performance and reliability standards.