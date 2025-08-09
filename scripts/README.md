# Scripts Directory Organization

This directory contains utility scripts organized by functionality.

## Directory Structure

### 📁 frontend/
Frontend debugging and screenshot utilities
- `screenshot.ts` - Puppeteer-based screenshot capture utility
- `debug-frontend.sh` - Frontend debugging helper script

### 📁 testing/
Test scripts and utilities
- `test-api.sh` - API endpoint testing
- `test-lesson-detail.sh` - Lesson detail testing
- `test-session.ts` - Session testing
- `test-video-player.ts` - Video player testing
- `run-tests.sh` - Main test runner
- `check-access.ts` - Access control testing
- `enroll-student.ts` - Student enrollment testing

### 📁 database/
Database seeding and management scripts
- `simple-seed.js` - Basic database seeding
- `seed-video.js` - Video data seeding
- `check-user.js` - User verification utility

### 📁 video/
Video processing scripts
- `process-video.ts` - TypeScript video processor
- `process-video.mjs` - ES module video processor

### 📁 dev/
Development utilities
- `dev.sh` - Development environment helper

## Usage Examples

### Frontend Screenshot Capture
```bash
# Capture full page screenshot
npx tsx scripts/frontend/screenshot.ts capture http://localhost:3001

# Capture specific element
npx tsx scripts/frontend/screenshot.ts element '.login-form' http://localhost:3001

# Debug mode with metrics
npx tsx scripts/frontend/screenshot.ts debug http://localhost:3001
```

### Running Tests
```bash
# Run API tests
npm run test:api

# Run all tests
bash scripts/testing/run-tests.sh
```

### Database Operations
```bash
# Seed database
node scripts/database/simple-seed.js

# Check user
node scripts/database/check-user.js
```