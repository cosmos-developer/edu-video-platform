# Lesson Service Refactoring Plan

## Executive Summary
This document outlines the plan to unify the Lessons service architecture, eliminating fragmentation between teacher and student implementations. The new architecture is based on the teacher's proven working pattern where lesson data includes embedded video groups in a single API response.

## Current Problems

### 1. Fragmented Data Fetching
- **Teacher Implementation:** Single API call - lesson response includes videoGroups
- **Student Implementation:** Multiple API calls - lesson, then separate video fetching
- **Result:** Inconsistent patterns, duplicate code, maintenance burden

### 2. API Response Inconsistencies
- `/api/videos` returns different formats (array vs paginated)
- Type definitions don't match actual API responses
- Missing proper TypeScript typing for different response formats

### 3. Duplicate Logic
- Video loading logic duplicated across components
- Different approaches to handling lesson + video data
- No shared state management pattern for lesson/video data

## Core Principle: Teacher Pattern as Standard

The teacher's implementation works reliably because:
1. **Backend includes videoGroups in lesson response** - Single API call
2. **LessonManagementPage expects embedded data** - No separate video fetching  
3. **VideoStateManager handles video details** - Centralized state management
4. **Clear data flow** - Lesson → VideoGroups → Videos → Milestones

**This pattern will become the standard for ALL lesson/video handling.**

## New Unified Architecture

### 1. Backend Standardization

#### 1.1 Unified Lesson Response Structure
```typescript
// ALL roles get the same response structure
// Role-based filtering happens within the query
interface LessonResponse {
  success: true;
  data: {
    id: string;
    title: string;
    description: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    // ALWAYS includes videoGroups
    videoGroups: VideoGroup[];
    createdBy: User;
    studentProgress?: StudentProgress[]; // Only for students
    _count: {
      videoGroups: number;
      studentProgress: number;
    };
  };
}
```

#### 1.2 getLessonById Implementation
```typescript
async getLessonById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const lesson = await prisma.lesson.findFirst({
    where: { 
      id,
      // Role-based filtering
      ...(user.role === 'STUDENT' ? { status: 'PUBLISHED' } : {})
    },
    include: {
      // ALWAYS include videoGroups - the teacher pattern
      videoGroups: {
        orderBy: { order: 'asc' },
        include: {
          videos: {
            orderBy: { order: 'asc' },
            // Role-based video filtering
            where: user.role === 'STUDENT' 
              ? { status: 'READY' }
              : {}, // Teachers see all videos
            select: {
              // Core fields for all roles
              id: true,
              title: true,
              description: true,
              order: true,
              status: true,
              duration: true,
              thumbnailPath: true,
              // Sensitive fields only for teachers
              filePath: user.role === 'TEACHER' || user.role === 'ADMIN',
              processingStatus: user.role === 'TEACHER' || user.role === 'ADMIN',
              _count: {
                select: { milestones: true }
              }
            }
          }
        }
      },
      // Student-specific includes
      ...(user.role === 'STUDENT' ? {
        studentProgress: {
          where: { studentId: user.id }
        }
      } : {})
    }
  });

  res.json({ success: true, data: lesson });
}
```

### 2. Frontend Unified Service

#### 2.1 Single Lesson Service
```typescript
// frontend/src/services/lesson.ts
export const lessonService = {
  // Single method for all roles - returns lesson with embedded videos
  async getLesson(lessonId: string): Promise<LessonWithVideos> {
    const response = await apiService.get(`/lessons/${lessonId}`);
    return response.data; // ALWAYS includes videoGroups
  },

  // Keep existing methods for teachers
  async createLesson(data: CreateLessonData): Promise<Lesson> { /* ... */ },
  async updateLesson(id: string, data: UpdateLessonData): Promise<Lesson> { /* ... */ },
  async publishLesson(id: string): Promise<Lesson> { /* ... */ },
  async deleteLesson(id: string): Promise<void> { /* ... */ }
};
```

#### 2.2 Video Service Cleanup
```typescript
// frontend/src/services/video.ts
export const videoService = {
  // REMOVE: getVideoGroupsByLesson() - no longer needed
  
  // Keep video-specific operations
  async getVideo(videoId: string): Promise<Video> { /* ... */ },
  async createVideoGroup(data: CreateVideoGroupData): Promise<VideoGroup> { /* ... */ },
  async uploadVideo(groupId: string, file: File, data: VideoData): Promise<Video> { /* ... */ },
  getStreamingUrl(videoId: string): string { /* ... */ }
};
```

### 3. Shared Component Architecture

#### 3.1 Base Lesson Page Component
```typescript
// frontend/src/components/lessons/BaseLessonPage.tsx
export function BaseLessonPage({ lessonId, role, children }) {
  const [lesson, setLesson] = useState<LessonWithVideos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      // Single API call for ALL roles
      const lessonData = await lessonService.getLesson(lessonId);
      setLesson(lessonData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render children with lesson data
  return children({ lesson, videoGroups: lesson?.videoGroups || [] });
}
```

#### 3.2 Shared Video Components
- `VideoList` - Display list of videos (used by both roles)
- `VideoCard` - Individual video display
- `VideoThumbnailCard` - Grid view video card
- `LessonHeader` - Lesson metadata display
- `ProgressBar` - Student progress tracking

### 4. Page Implementations

#### 4.1 Teacher Lesson Management
```typescript
export default function LessonManagementPage() {
  return (
    <BaseLessonPage lessonId={lessonId} role="TEACHER">
      {({ lesson, videoGroups }) => (
        // Teacher-specific UI with management features
      )}
    </BaseLessonPage>
  );
}
```

#### 4.2 Student Lesson Detail
```typescript
export default function LessonDetailPage() {
  return (
    <BaseLessonPage lessonId={id} role="STUDENT">
      {({ lesson, videoGroups }) => (
        // Student-specific UI with learning features
      )}
    </BaseLessonPage>
  );
}
```

## Implementation Plan

### Phase 1: Backend Updates (Week 1)
1. Update `getLessonById` to always include videoGroups
2. Add role-based filtering within Prisma queries
3. Ensure consistent response structure
4. Test with different user roles

### Phase 2: Frontend Service Layer (Week 1-2)
1. Update lesson service to expect embedded videoGroups
2. Remove redundant video fetching methods
3. Update TypeScript interfaces to match new structure
4. Add proper error handling

### Phase 3: Shared Components (Week 2)
1. Create `BaseLessonPage` component
2. Build shared video display components
3. Create role-specific wrapper components
4. Implement consistent styling

### Phase 4: Page Migration (Week 2-3)
1. Migrate TeacherLessonManagementPage
2. Migrate StudentLessonDetailPage
3. Update any other lesson-related pages
4. Ensure VideoStateManager integration works

### Phase 5: Testing & Cleanup (Week 3)
1. Comprehensive testing of all user flows
2. Remove deprecated code
3. Update API documentation
4. Performance optimization

## Success Metrics

1. **Single API Call:** Both teachers and students load lesson data in one request
2. **Code Reduction:** 40-50% reduction in lesson/video related code
3. **Type Safety:** 100% TypeScript coverage for lesson/video types
4. **Performance:** Reduced page load time by eliminating sequential API calls
5. **Maintainability:** Single pattern for all lesson/video operations

## Risk Mitigation

1. **Feature Flags:** Deploy changes behind feature flags for gradual rollout
2. **Backward Compatibility:** Keep old endpoints during transition period
3. **Comprehensive Testing:** Unit, integration, and E2E tests for all changes
4. **Rollback Plan:** Git branches and deployment tags for quick reversion
5. **Monitoring:** Track API performance and error rates during rollout

## Technical Decisions

### Why Teacher Pattern?
- Already working in production
- Simpler data flow (single API call)
- Better performance (no waterfall requests)
- Easier to maintain (one pattern)

### Why Embedded VideoGroups?
- Reduces API calls
- Simplifies frontend state management
- Ensures data consistency
- Natural data hierarchy (Lesson → VideoGroups → Videos)

### Why Role-Based Filtering at Backend?
- Security (students can't access draft content)
- Performance (less data transferred)
- Consistency (single source of truth)
- Flexibility (easy to adjust permissions)

## Expected Outcomes

1. **Unified Codebase:** Single pattern for all lesson/video operations
2. **Improved Performance:** Faster page loads with fewer API calls
3. **Better Maintainability:** Less code, clearer patterns
4. **Enhanced Type Safety:** Consistent types across frontend/backend
5. **Scalability:** Easier to add new features with clear patterns

## Future Enhancements

Once the unified architecture is in place:
1. Add caching layer for lesson data
2. Implement optimistic updates for better UX
3. Add real-time collaboration features
4. Enhance progress tracking granularity
5. Build offline support for video content

## Conclusion

This refactoring eliminates the fragmentation between teacher and student implementations by standardizing on the teacher's proven pattern. The result will be a more maintainable, performant, and consistent codebase that provides a better experience for all users.

---

*Document Version: 1.0*  
*Created: January 2025*  
*Status: Approved for Implementation*