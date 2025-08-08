#!/bin/bash

# Login first to get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Login response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Token obtained successfully"

# Get video groups
echo -e "\nFetching video groups..."
GROUPS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/videos \
  -H "Authorization: Bearer $TOKEN")

echo "Video groups response:"
echo $GROUPS_RESPONSE | jq '.'

# Extract first video ID if available
VIDEO_ID=$(echo $GROUPS_RESPONSE | jq -r '.data[] | select(.videos | length > 0) | .videos[0].id' | head -1)

if [ -z "$VIDEO_ID" ]; then
  echo "No video found in the response"
  exit 1
fi

echo -e "\nFetching video details for ID: $VIDEO_ID"
VIDEO_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/v1/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Video details:"
echo $VIDEO_RESPONSE | jq '.data.milestones'

# Count questions
QUESTION_COUNT=$(echo $VIDEO_RESPONSE | jq '[.data.milestones[]?.questions? // [] | length] | add // 0')
echo -e "\nTotal questions across all milestones: $QUESTION_COUNT"

# Show milestones with questions
echo -e "\nMilestones with questions:"
echo $VIDEO_RESPONSE | jq '.data.milestones[] | select(.questions != null and (.questions | length) > 0) | {id: .id, title: .title, type: .type, questionsCount: (.questions | length), questions: .questions}'