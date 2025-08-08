#!/bin/bash

# Login as teacher
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@example.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to login"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi

echo "Logged in successfully"
VIDEO_ID="cme1aawsy0003l43s6nffdodu"
MILESTONE_ID="cme1km61t0001l6lftzpj8yqo"
QUESTION_ID="cme1kusax0003l6lfv66h1saw"

# Start a session first
echo "Starting session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/sessions/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"videoId\": \"$VIDEO_ID\"}")

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.data.id')
echo "Session ID: $SESSION_ID"

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "Failed to start session"
  echo $SESSION_RESPONSE | jq '.'
  exit 1
fi

# Submit answer - testing with index 1 (which should be "ho" - the correct answer)
echo -e "\nSubmitting answer with index 1..."
ANSWER_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/sessions/$SESSION_ID/question" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"answer\": \"1\",
    \"milestoneId\": \"$MILESTONE_ID\"
  }")

echo "Answer response:"
echo $ANSWER_RESPONSE | jq '.'

# Also test with index 0 (which should be incorrect)
echo -e "\nSubmitting answer with index 0..."
ANSWER_RESPONSE_2=$(curl -s -X POST "http://localhost:3000/api/v1/sessions/$SESSION_ID/question" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"answer\": \"0\",
    \"milestoneId\": \"$MILESTONE_ID\"
  }")

echo "Answer response 2:"
echo $ANSWER_RESPONSE_2 | jq '.'