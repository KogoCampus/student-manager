#!/bin/bash

# Function to check if Docker is installed
check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed. Please install Docker and try again."
        exit 1
    fi
}

# Function to check if Docker is running
check_docker_running() {
    if ! docker info &> /dev/null; then
        echo "Error: Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to build the project
build_project() {
    echo "Running yarn build..."
    yarn build
    if [ $? -ne 0 ]; then
        echo "Error: yarn build failed."
        exit 1
    fi
}

# Function to pull and run Redis in the background
start_redis() {
    echo "Starting Redis in the background..."
    docker pull redis:latest
    docker run --name student-manager-redis -d -p 63790:6379 redis:latest
    if [ $? -ne 0 ]; then
        echo "Error: Failed to start Redis."
        exit 1
    fi
}

# Function to stop Redis
stop_redis() {
    echo "Stopping Redis..."
    docker stop student-manager-redis
    docker rm student-manager-redis
}

# Function to start SAM local API
start_sam_api() {
    local START_CMD="sam local start-api -t serverless.yaml --host 127.0.0.1"

    # If DOCKER_HOST is passed as an argument, prefix the START_CMD with it
    if [ -n "$1" ]; then
        echo "Starting SAM local with DOCKER_HOST=$1"
        DOCKER_HOST="$1" $START_CMD
    else
        $START_CMD
    fi

    return $?
}

# Function to handle termination signals and stop Redis
cleanup_on_termination() {
    echo "Detected termination signal, stopping services..."
    stop_redis
    exit 0
}

# Set trap for all termination signals to ensure Redis is stopped properly
trap cleanup_on_termination SIGINT SIGTERM SIGHUP SIGQUIT

# Main script execution
check_docker_installed  # Check if Docker is installed
check_docker_running    # Check if Docker is running
build_project           # Always run yarn build to build the project
start_redis             # Start Redis in Docker

# Inspect Docker context
CONTEXT_OUTPUT=$(docker context inspect 2>/dev/null)

if [[ $? -eq 0 ]]; then
    DOCKER_HOST_VALUE=$(echo "$CONTEXT_OUTPUT" | jq -r '.[0].Endpoints.docker.Host')

    if [[ -n "$DOCKER_HOST_VALUE" ]]; then
        echo "Found Docker Host: $DOCKER_HOST_VALUE"
        # Retry the SAM command with DOCKER_HOST set only for the command
        start_sam_api "$DOCKER_HOST_VALUE"
    else
        echo "Error: Could not find Docker host value in context."
        exit 1
    fi
else
    echo "Error: Failed to inspect Docker context."
    exit 1
fi

# Stop Redis when SAM exits
stop_redis
exit $EXIT_CODE