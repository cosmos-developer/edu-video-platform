#!/bin/bash

# Frontend debugging script for Claude Code
# This script helps capture screenshots and debug frontend issues

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Frontend Debugging Tool${NC}"
echo "========================"

# Check if frontend is running
check_frontend() {
    if curl -s http://localhost:5173 > /dev/null; then
        echo -e "${GREEN}✓ Frontend is running on port 5173${NC}"
        return 0
    else
        echo -e "${RED}✗ Frontend is not running${NC}"
        echo "Please run: cd frontend && npm run dev"
        return 1
    fi
}

# Capture screenshot function
capture() {
    local url="${1:-http://localhost:5173}"
    local name="${2:-screenshot}"
    
    echo -e "${YELLOW}Capturing screenshot of $url...${NC}"
    npx tsx scripts/frontend/screenshot.ts capture "$url"
    
    # Find the latest screenshot
    latest=$(ls -t screenshots/*.png 2>/dev/null | head -1)
    if [ -n "$latest" ]; then
        echo -e "${GREEN}Screenshot saved: $latest${NC}"
        echo "You can now read this file with the Read tool to see the visual state"
    fi
}

# Debug specific page
debug_page() {
    local path="${1:-/}"
    local url="http://localhost:5173${path}"
    
    echo -e "${YELLOW}Debugging page: $url${NC}"
    npx tsx scripts/frontend/screenshot.ts debug "$url"
}

# Capture element
capture_element() {
    local selector="$1"
    local url="${2:-http://localhost:5173}"
    
    if [ -z "$selector" ]; then
        echo -e "${RED}Error: Please provide a CSS selector${NC}"
        echo "Usage: ./debug-frontend.sh element 'selector' [url]"
        return 1
    fi
    
    echo -e "${YELLOW}Capturing element: $selector${NC}"
    npx tsx scripts/frontend/screenshot.ts element "$selector" "$url"
}

# Capture multiple viewports
capture_responsive() {
    echo -e "${YELLOW}Capturing responsive views...${NC}"
    npx tsx scripts/frontend/screenshot.ts multi
}

# Interactive debug session
interactive_debug() {
    local url="${1:-http://localhost:5173}"
    
    echo -e "${YELLOW}Starting interactive debug session...${NC}"
    echo "This will:"
    echo "  1. Navigate to $url"
    echo "  2. Capture page metrics"
    echo "  3. Look for error elements"
    echo "  4. Monitor network failures"
    echo "  5. Save a debug screenshot"
    
    npx tsx scripts/frontend/screenshot.ts debug "$url"
}

# Main menu
show_menu() {
    echo ""
    echo "Commands:"
    echo "  capture [url]           - Capture a screenshot"
    echo "  element <selector> [url] - Capture specific element"
    echo "  debug [path]            - Debug a specific page"
    echo "  responsive              - Capture all viewports"
    echo "  interactive [url]       - Start interactive debug"
    echo "  check                   - Check if frontend is running"
    echo ""
}

# Main execution
if ! check_frontend; then
    exit 1
fi

case "${1:-capture}" in
    capture)
        capture "$2" "$3"
        ;;
    element)
        capture_element "$2" "$3"
        ;;
    debug)
        debug_page "$2"
        ;;
    responsive)
        capture_responsive
        ;;
    interactive)
        interactive_debug "$2"
        ;;
    check)
        # Already checked above
        ;;
    help|--help|-h)
        show_menu
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_menu
        exit 1
        ;;
esac