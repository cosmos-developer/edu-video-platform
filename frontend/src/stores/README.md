# VideoStateManager - Unified State Management

## Overview
The VideoStateManager is a centralized state management solution that eliminates desynchronization issues between components by providing a single source of truth for all video, milestone, and question data.

## Problem Solved
Previously, multiple components maintained their own local copies of state:
- LessonManagementPage had its own video/milestone state
- VideoPlayer had separate milestone tracking
- QuestionEditor managed questions locally without syncing
- AIQuestionGenerator didn't propagate generated questions
- Counts would become stale after adding/editing content

## Solution Architecture

### Core Components

1. **VideoStateManager** (`stores/VideoStateManager.ts`)
   - Singleton class managing all video states
   - Observable pattern for real-time updates
   - Intelligent caching with TTL
   - Optimistic updates for immediate UI feedback

2. **VideoStateContext** (`contexts/VideoStateContext.tsx`)
   - React Context providing manager instance
   - Available throughout the component tree

3. **useVideoState Hook** (`hooks/useVideoState.ts`)
   - React hook for accessing video state
   - Automatic subscription to updates
   - Returns video, milestones, questions, and metadata

## Key Features

### Real-time Synchronization
When any component updates data (add question, create milestone), ALL subscribed components immediately receive the update:
```typescript
// In QuestionEditor - adds question
await manager.addQuestion(videoId, milestoneId, question)
// LessonManagementPage automatically shows new count
// VideoPlayer sees the new question
// No manual refresh needed!
```

### Unified Metadata
Centralized tracking of:
- Total milestones per video
- Total questions per video
- Questions per milestone
- Completion percentages
- Last update timestamps

### Smart Caching
- 30-second cache for video data
- Automatic invalidation on updates
- Force refresh option available
- Background sync with backend

## Usage Examples

### Adding a Question
```typescript
// Old way - local state only
setQuestions(prev => [...prev, newQuestion])

// New way - updates all subscribers
await manager.addQuestion(videoId, milestoneId, newQuestion)
```

### Getting Current State
```typescript
// In any component
const { video, milestones, metadata } = useVideoState(videoId)

// metadata includes:
// - totalMilestones
// - totalQuestions  
// - questionsPerMilestone (Map)
```

### Subscribing to Changes
```typescript
// Automatic in components
const { state } = useVideoState(videoId) // Auto-subscribes

// Manual subscription
const unsubscribe = manager.subscribeToVideo(videoId, (id, state) => {
  console.log('Video updated:', state)
})
```

## Components Updated

1. **LessonManagementPage**
   - Uses `useVideoState` for selected video
   - No more manual milestone array updates
   - Counts always accurate

2. **VideoPlayer**
   - Subscribes to milestone updates
   - Shows real-time question counts
   - Unified progress tracking

3. **QuestionEditor**
   - Adds questions through manager
   - No local question array
   - Changes propagate instantly

4. **AIQuestionGenerator**
   - Batch adds questions through manager
   - No need for parent refresh
   - Immediate count updates

5. **VideoPlayerPage**
   - Uses unified session state
   - Consistent progress metrics
   - Real-time milestone tracking

## Benefits

1. **No More Desynchronization**
   - Single source of truth
   - All components see same data
   - Updates propagate instantly

2. **Reduced API Calls**
   - Smart caching reduces backend load
   - Only fetches when necessary
   - Optimistic updates for speed

3. **Better Developer Experience**
   - Simple API: `addQuestion`, `addMilestone`
   - Automatic subscriptions in React
   - TypeScript types throughout

4. **Improved User Experience**
   - Instant UI updates
   - No loading states for local changes
   - Consistent data everywhere

## Migration Guide

### Before (Local State)
```typescript
const [selectedVideo, setSelectedVideo] = useState(null)
const [questions, setQuestions] = useState([])

// Manual updates
setSelectedVideo(prev => ({
  ...prev,
  milestones: [...prev.milestones, newMilestone]
}))
```

### After (Unified State)
```typescript
const { video, milestones, questions } = useVideoState(videoId)
const manager = useVideoStateManager()

// Automatic updates
await manager.addMilestone(videoId, newMilestone)
// All components updated!
```

## Testing
The VideoStateManager ensures:
- Question counts update immediately when added
- Milestone counts reflect current state
- Preview shows same data as management view
- No stale data after edits
- Session progress syncs across components