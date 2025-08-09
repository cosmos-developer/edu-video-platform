#!/bin/bash

# Test script for lesson detail page
# Usage: ./test-lesson-detail.sh

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing Lesson Detail Page...${NC}"

# 1. Login as student to get token
echo -e "\n${BLUE}1. Logging in as student...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Demo123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get auth token${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Successfully logged in as student${NC}"

# 2. Get list of lessons
echo -e "\n${BLUE}2. Getting list of published lessons...${NC}"
LESSONS_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/v1/lessons?status=PUBLISHED&limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "Lessons response:"
echo $LESSONS_RESPONSE | python3 -m json.tool | head -50

# 3. Get first lesson ID
LESSON_ID=$(echo $LESSONS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$LESSON_ID" ]; then
  echo -e "${RED}No published lessons found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found lesson: $LESSON_ID${NC}"

# 4. Get lesson details
echo -e "\n${BLUE}3. Getting lesson details...${NC}"
LESSON_DETAIL=$(curl -s -X GET "http://localhost:3000/api/v1/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Lesson detail:"
echo $LESSON_DETAIL | python3 -m json.tool | head -30

# 5. Get video groups for the lesson
echo -e "\n${BLUE}4. Getting video groups for lesson...${NC}"
VIDEO_GROUPS=$(curl -s -X GET "http://localhost:3000/api/v1/videos?lessonId=$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Video groups for lesson:"
echo $VIDEO_GROUPS | python3 -m json.tool | head -50

# Check if there are video groups
if echo $VIDEO_GROUPS | grep -q '"data":\[\]'; then
  echo -e "${RED}No video groups found for this lesson${NC}"
else
  echo -e "${GREEN}✓ Video groups found for lesson${NC}"
fi

echo -e "\n${GREEN}Test complete!${NC}"
echo -e "You can now visit: ${BLUE}http://localhost:3001/lessons/$LESSON_ID${NC}"