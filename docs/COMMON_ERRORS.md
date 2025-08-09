# Common Development Errors & Solutions

This document catalogs recurring errors encountered during development and their solutions to prevent future occurrences.

## JavaScript/Node.js Serialization Issues

### 1. BigInt Serialization Error

**Error Message:**
```
Do not know how to serialize a BigInt
```

**Root Cause:**
- Prisma database fields with `BigInt` type (e.g., file sizes, large numbers)
- Node.js `JSON.stringify()` cannot serialize BigInt values natively
- Occurs when returning API responses containing BigInt fields

**Database Schema Example:**
```prisma
model Video {
  id       String  @id @default(cuid())
  size     BigInt? // File size in bytes - THIS CAUSES THE ERROR
  // ... other fields
}
```

**Solution:**
Add BigInt-to-string conversion in controllers before sending responses:

```typescript
// Convert BigInt values to strings to avoid serialization issues
const processedData = JSON.parse(JSON.stringify(data, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
));

res.json({
  success: true,
  data: processedData
});
```

**Prevention:**
- Always test API endpoints after adding BigInt fields to schema
- Consider using `String` or `Int` types for most numeric fields
- Only use `BigInt` when truly necessary for large numbers (> 2^53)

## Prisma Common Issues

### 2. Query Performance with Nested Relations

**Symptoms:**
- Slow API responses
- High database CPU usage
- Timeouts on complex queries

**Common Causes:**
```typescript
// PROBLEMATIC: Deep nesting without select optimization
const lessons = await prisma.lesson.findMany({
  include: {
    videoGroups: {
      include: {
        videos: {
          include: {
            milestones: {
              include: {
                questions: true // TOO DEEP
              }
            }
          }
        }
      }
    }
  }
});
```

**Solution:**
```typescript
// OPTIMIZED: Use select to limit fields and depth
const lessons = await prisma.lesson.findMany({
  select: {
    id: true,
    title: true,
    description: true,
    videoGroups: {
      select: {
        id: true,
        title: true,
        videos: {
          select: {
            id: true,
            title: true,
            duration: true,
            _count: {
              select: { milestones: true }
            }
          }
        }
      }
    }
  }
});
```

### 3. Multi-tenant Data Isolation

**Error:** Students/teachers accessing data from other tenants

**Root Cause:** Missing tenant filtering in queries

**Solution:**
```typescript
// ALWAYS add tenant filtering when applicable
const where: any = { id };

// Multi-tenant filtering
if (currentUser.tenantId) {
  where.tenantId = currentUser.tenantId;
}

const lesson = await prisma.lesson.findFirst({ where });
```

## Express.js API Issues

### 4. Missing Error Handling

**Problem:** Unhandled promise rejections causing server crashes

**Solution Pattern:**
```typescript
export const controllerMethod = {
  async methodName(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Your logic here
      
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error in methodName:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform operation'
      });
      return; // Important: explicit return
    }
  }
};
```

### 5. Authentication Token Issues

**Symptoms:**
- 401 Unauthorized errors
- "jwt malformed" errors
- Expired token errors

**Common Causes:**
- Expired JWT tokens
- Missing Authorization header
- Incorrect Bearer token format

**Debug Steps:**
1. Check token expiration in JWT payload
2. Verify Authorization header format: `Bearer <token>`
3. Check JWT_SECRET environment variable
4. Validate token issuer/audience claims

## Frontend Integration Issues

### 6. Video Upload File/URL Mismatch

**Error Message:** "Video file is required"

**Symptoms:**
- Video upload fails with 400 Bad Request
- Request shows `"data": "{\"video\":{},\"title\":\"test\"}"`
- Content-Type is `application/json` instead of `multipart/form-data`
- Debug info shows `bodyKeys: ["video", "title"]` instead of `["videoUrl", "title"]`

**Root Cause:** Frontend sending wrong field names or using deprecated component:

1. **File Upload**: Requires `FormData` with actual file and `multipart/form-data`
2. **URL-based Video**: Requires JSON with `videoUrl` field and `application/json`

**Problematic Pattern:**
```typescript
// WRONG: Sending empty video object to file upload endpoint
await videoService.post('/videos/groups/123/videos', {
  video: {}, // ← Empty object instead of File or URL
  title: 'test'
})
```

**Solution - Use correct upload method:**

```typescript
// For FILE uploads - use uploadVideoFile()
await videoService.uploadVideoFile(groupId, file, {
  title: 'Video Title',
  description: 'Optional description'
})

// For URL-based videos - use addVideoToGroup()
await videoService.addVideoToGroup(groupId, {
  title: 'Video Title', 
  videoUrl: 'https://example.com/video.mp4',
  description: 'Optional description',
  duration: 300, // optional
  thumbnailUrl: 'https://example.com/thumb.jpg' // optional
})
```

**Backend Fix Applied:** Updated endpoint to handle both multipart file uploads and JSON URL requests conditionally.

### 7. Authentication Routing Issues

**Problem:** Teachers redirected to `/teacher/dashboard` instead of `/dashboard` after login

**Symptoms:**
- Users see empty page after successful login
- URL shows `/teacher/dashboard` which doesn't exist in routing
- Browser console shows navigation errors

**Root Cause:** Incorrect role-based redirects in `ProtectedRoute.tsx`:
```typescript
// PROBLEMATIC: Non-existent route
const roleRedirects = {
  STUDENT: '/dashboard',
  TEACHER: '/teacher/dashboard', // ← This route doesn't exist
  ADMIN: '/admin/dashboard'      // ← This route doesn't exist
}
```

**Solution:** All roles should redirect to the unified `/dashboard` route:
```typescript
// CORRECT: All roles use the same dashboard
const roleRedirects = {
  STUDENT: '/dashboard',
  TEACHER: '/dashboard',
  ADMIN: '/dashboard'
}
```

**Location:** `frontend/src/components/auth/ProtectedRoute.tsx` (lines 41-45 and 81-85)

### 7. CORS and Request Headers

**Error:** CORS policy blocks requests

**Solution:** Ensure proper headers in API requests:
```typescript
const response = await apiService.get('/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 7. TypeScript Type Mismatches

**Problem:** Frontend types don't match API response structure

**Solution:** 
- Keep types synchronized between frontend and backend
- Use shared type definitions when possible
- Validate API responses in development

```typescript
// Shared types
interface LessonWithVideos {
  id: string;
  title: string;
  videoGroups: VideoGroup[];
  // Ensure BigInt fields are typed as strings after serialization
  size?: string; // Not BigInt!
}
```

## Database Migration Issues

### 8. Schema Changes Breaking Existing Data

**Prevention:**
- Always backup database before migrations
- Test migrations on development data first
- Use nullable fields for new required columns
- Consider data migration scripts for complex changes

```bash
# Safe migration workflow
npm run db:backup
npm run db:migrate:dev
npm run test
npm run db:migrate:production
```

## Testing & Debugging

### 9. Inconsistent Test Data

**Problem:** Tests passing locally but failing in CI

**Solution:**
- Use deterministic test data
- Clean database between tests
- Avoid timezone-dependent comparisons
- Mock external dependencies

### 10. Environment Variable Issues

**Symptoms:**
- Connection errors
- Missing configuration
- Different behavior between environments

**Checklist:**
- Verify `.env` file exists and is loaded
- Check all required variables are set
- Validate environment-specific values
- Use `.env.example` as template

```bash
# Debug environment variables
node -e "console.log(process.env.DATABASE_URL)"
```

## Monitoring & Production Issues

### 11. Memory Leaks

**Warning Signs:**
- Gradually increasing memory usage
- Server crashes with out-of-memory errors
- Slow response times over time

**Common Causes:**
- Unclosed database connections
- Event listeners not removed
- Large objects not garbage collected
- Missing connection pooling

**Prevention:**
```typescript
// Always handle cleanup
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## Quick Reference Commands

```bash
# Check server logs
npm run dev

# Test specific endpoint
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/endpoint

# Database inspection
npx prisma studio

# Reset development database
npx prisma migrate reset --force

# Check environment variables
printenv | grep -E "(DATABASE_URL|JWT_SECRET)"
```

## Frontend Code Quality Issues

### 12. ESLint Common Violations

**Most Frequent Issues Found (130+ errors):**

1. **TypeScript `any` Type Usage (60+ occurrences)**
   - Files affected: Most service files, context files, utility files
   - Pattern: `@typescript-eslint/no-explicit-any`
   
   **Fix:** Replace `any` with proper types:
   ```typescript
   // BAD
   } catch (error: any) {
   
   // GOOD
   } catch (error: unknown) {
     const message = error instanceof Error ? error.message : 'Unknown error'
   ```

2. **React Refresh Export Issues (40+ occurrences)**
   - Files affected: Context files, utility files
   - Pattern: `react-refresh/only-export-components`
   
   **Fix:** Move non-component exports to separate files:
   ```typescript
   // BAD - mixing exports in component file
   export const useAuth = () => {...}
   export const AuthProvider = () => {...}
   
   // GOOD - separate files
   // hooks/useAuth.ts
   export const useAuth = () => {...}
   // components/AuthProvider.tsx
   export const AuthProvider = () => {...}
   ```

3. **Unused Variables (Multiple occurrences)**
   - Pattern: `@typescript-eslint/no-unused-vars`
   - Common in: Event handlers, destructured objects
   
   **Fix:** Prefix with underscore or remove:
   ```typescript
   // BAD
   const { data, error } = response // error unused
   
   // GOOD
   const { data, _error } = response
   // OR
   const { data } = response
   ```

4. **Case Block Declarations**
   - Pattern: `no-case-declarations`
   - Files: QuestionOverlay.tsx
   
   **Fix:** Wrap case blocks in braces:
   ```typescript
   // BAD
   switch(type) {
     case 'MULTIPLE_CHOICE':
       const options = data.options
       break
   }
   
   // GOOD
   switch(type) {
     case 'MULTIPLE_CHOICE': {
       const options = data.options
       break
     }
   }
   ```

5. **Missing useEffect Dependencies**
   - Pattern: `react-hooks/exhaustive-deps`
   - Files: VideoPlayer.tsx, BaseLessonPage.tsx
   
   **Fix:** Include all dependencies or use useCallback:
   ```typescript
   // Use useCallback for stable function references
   const loadData = useCallback(() => {
     // function body
   }, [dependencies])
   
   useEffect(() => {
     loadData()
   }, [loadData])
   ```

### 13. Dead Code and Unused Files

**Files to Review for Removal:**
- `frontend/src/contexts/AuthContext.old.tsx` - Old authentication context
- `frontend/src/services/api.old.ts` - Old API service
- `frontend/src/services/auth.old.ts` - Old auth service

**Recommendation:** Archive or remove `.old` files after confirming they're not needed.

---

*Last Updated: January 2025*  
*Maintainer: Development Team*