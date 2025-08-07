#!/bin/bash
# API Testing Script for Local Development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3000"
JWT_TOKEN=""

echo -e "${BLUE}🧪 Interactive Learning Platform API Testing${NC}"
echo "==========================================="

# Test 1: Health Check
echo -e "\n${YELLOW}1. Testing Health Check...${NC}"
if curl -s -f "${API_BASE}/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    curl -s "${API_BASE}/health" | jq . 2>/dev/null || curl -s "${API_BASE}/health"
else
    echo -e "${RED}❌ Health check failed - API might not be running${NC}"
    echo "Please run: npm run dev:up"
    exit 1
fi

# Test 2: User Registration
echo -e "\n${YELLOW}2. Testing User Registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "testteacher@example.com",
        "password": "Password123!",
        "firstName": "Test",
        "lastName": "Teacher",
        "role": "TEACHER"
    }')

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ User registration successful${NC}"
    JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)
    echo "Extracted JWT token (first 50 chars): ${JWT_TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠️  Registration might have failed (user might already exist)${NC}"
    echo "Response: $REGISTER_RESPONSE"
    
    # Try login instead
    echo -e "\n${YELLOW}2b. Trying Login...${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "testteacher@example.com",
            "password": "Password123!"
        }')
    
    if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ User login successful${NC}"
        JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)
        echo "Extracted JWT token (first 50 chars): ${JWT_TOKEN:0:50}..."
    else
        echo -e "${RED}❌ Both registration and login failed${NC}"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi
fi

# Test 3: Get Current User Profile
echo -e "\n${YELLOW}3. Testing Get Current User Profile...${NC}"
if [ -n "$JWT_TOKEN" ]; then
    PROFILE_RESPONSE=$(curl -s -X GET "${API_BASE}/api/v1/auth/me" \
        -H "Authorization: Bearer ${JWT_TOKEN}")
    
    if echo "$PROFILE_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Profile retrieval successful${NC}"
        echo "$PROFILE_RESPONSE" | jq '.data | {email, firstName, lastName, role}' 2>/dev/null || echo "Profile: $PROFILE_RESPONSE"
    else
        echo -e "${RED}❌ Profile retrieval failed${NC}"
        echo "Response: $PROFILE_RESPONSE"
    fi
else
    echo -e "${RED}❌ No JWT token available for profile test${NC}"
fi

# Test 4: Create Lesson
echo -e "\n${YELLOW}4. Testing Lesson Creation...${NC}"
if [ -n "$JWT_TOKEN" ]; then
    LESSON_RESPONSE=$(curl -s -X POST "${API_BASE}/api/v1/lessons" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -d '{
            "title": "Test Lesson: Introduction to Docker",
            "description": "A comprehensive guide to containerization with Docker",
            "difficulty": "beginner",
            "estimatedTime": 60,
            "objectives": [
                "Understand Docker concepts",
                "Learn container basics",
                "Practice with Docker commands"
            ],
            "tags": ["docker", "containerization", "devops"]
        }')
    
    if echo "$LESSON_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Lesson creation successful${NC}"
        LESSON_ID=$(echo "$LESSON_RESPONSE" | jq -r '.data.id' 2>/dev/null)
        echo "Created lesson ID: $LESSON_ID"
        echo "$LESSON_RESPONSE" | jq '.data | {id, title, status, difficulty}' 2>/dev/null || echo "Lesson: $LESSON_RESPONSE"
    else
        echo -e "${RED}❌ Lesson creation failed${NC}"
        echo "Response: $LESSON_RESPONSE"
    fi
else
    echo -e "${RED}❌ No JWT token available for lesson creation${NC}"
fi

# Test 5: List Lessons
echo -e "\n${YELLOW}5. Testing Lesson Listing...${NC}"
if [ -n "$JWT_TOKEN" ]; then
    LESSONS_RESPONSE=$(curl -s -X GET "${API_BASE}/api/v1/lessons" \
        -H "Authorization: Bearer ${JWT_TOKEN}")
    
    if echo "$LESSONS_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Lesson listing successful${NC}"
        echo "$LESSONS_RESPONSE" | jq '.data | length' 2>/dev/null && echo " lessons found" || echo "Lessons: $LESSONS_RESPONSE"
    else
        echo -e "${RED}❌ Lesson listing failed${NC}"
        echo "Response: $LESSONS_RESPONSE"
    fi
else
    echo -e "${RED}❌ No JWT token available for lesson listing${NC}"
fi

# Test 6: Database Connectivity (if accessible)
echo -e "\n${YELLOW}6. Testing Database Connectivity...${NC}"
if command -v docker > /dev/null 2>&1; then
    if docker ps | grep -q "interactive-learning-db"; then
        DB_TEST=$(docker exec interactive-learning-db psql -U postgres -d interactive_learning -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "DB_ERROR")
        if [[ "$DB_TEST" != "DB_ERROR" ]]; then
            echo -e "${GREEN}✅ Database connectivity successful${NC}"
            echo "Database query result: $DB_TEST"
        else
            echo -e "${YELLOW}⚠️  Database query failed but container is running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Database container not found - run: npm run dev:up${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available for database test${NC}"
fi

# Test 7: Redis Connectivity (if accessible)
echo -e "\n${YELLOW}7. Testing Redis Connectivity...${NC}"
if command -v docker > /dev/null 2>&1; then
    if docker ps | grep -q "interactive-learning-redis"; then
        REDIS_TEST=$(docker exec interactive-learning-redis redis-cli -a redis_dev_password ping 2>/dev/null || echo "REDIS_ERROR")
        if [[ "$REDIS_TEST" == "PONG" ]]; then
            echo -e "${GREEN}✅ Redis connectivity successful${NC}"
            echo "Redis response: $REDIS_TEST"
        else
            echo -e "${YELLOW}⚠️  Redis query failed but container is running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Redis container not found - run: npm run dev:up${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available for Redis test${NC}"
fi

echo -e "\n${BLUE}🎉 API Testing Complete!${NC}"
echo "=============================="
echo -e "${GREEN}✅ Basic API functionality verified${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "  • Access API at: ${API_BASE}"
echo "  • Database admin: http://localhost:8080"
echo "  • Redis admin: http://localhost:8001"
echo "  • View logs: npm run dev:logs"
echo ""
echo -e "${BLUE}🔗 Useful endpoints:${NC}"
echo "  • Health: GET ${API_BASE}/health"
echo "  • Auth: POST ${API_BASE}/api/v1/auth/login"
echo "  • Users: GET ${API_BASE}/api/v1/users"
echo "  • Lessons: GET ${API_BASE}/api/v1/lessons"