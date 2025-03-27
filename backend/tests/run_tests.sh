#!/bin/bash

# Navigate to the project root
cd "$(dirname "$0")/.."

# Set necessary environment variables for testing
export DATABASE_URL="sqlite:///:memory:"
export FLASK_ENV="testing"
export SECRET_KEY="test-secret-key"
export JWT_SECRET_KEY="test-jwt-secret-key"
export SMTP_SERVER="smtp.test.com"
export SMTP_PORT="587"
export SMTP_USERNAME="test@test.com"
export SMTP_PASSWORD="test_password"
export SENDER_EMAIL="sender@test.com"
export ENABLE_EMAIL_NOTIFICATIONS="True"
export SKIP_EXTERNAL_SERVICES="True"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Parse command line arguments
SKIP_EXTERNAL_SERVICES="False"
TEST_PATH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-external)
      SKIP_EXTERNAL_SERVICES="True"
      shift
      ;;
    -s|--skip)
      SKIP_EXTERNAL_SERVICES="True"
      shift
      ;;
    *)
      TEST_PATH="$1"
      shift
      ;;
  esac
done

# Set environment variable for skipping tests that require external services
export SKIP_EXTERNAL_SERVICES

# Check if a specific test file is provided
if [[ -z "$TEST_PATH" ]]; then
    echo -e "${YELLOW}No test file specified, running all tests${NC}"
    TEST_PATH="tests"
else
    # If path starts with "backend/", remove it
    TEST_PATH=$(echo "$TEST_PATH" | sed 's|^backend/||')
    echo -e "${YELLOW}Running tests in $TEST_PATH${NC}"
fi

if [[ "$SKIP_EXTERNAL_SERVICES" == "True" ]]; then
    echo -e "${YELLOW}Skipping tests that require external services (SMTP, etc.)${NC}"
fi

# Run the tests using unittest for package resolution
echo -e "${GREEN}Running tests...${NC}"
python3 -m unittest discover -s $(dirname "$TEST_PATH") -p $(basename "$TEST_PATH")

# Get the exit code
EXIT_CODE=$?

# Exit with the same code as the tests
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}Tests failed with exit code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE 