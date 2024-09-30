#!/bin/bash

REDIS_CONTAINER_NAME="student-manager-redis"

check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed. Please install Docker and try again."
        exit 1
    fi
}

check_docker_running() {
    if ! docker info &> /dev/null; then
        echo "Error: Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

is_redis_running() {
    docker ps --filter "name=$REDIS_CONTAINER_NAME" --filter "status=running" | grep "$REDIS_CONTAINER_NAME" > /dev/null 2>&1
}

start_redis() {
    if is_redis_running; then
        echo "Redis is already running. Skipping start."
    else
        echo "Starting Redis in the background with container name $REDIS_CONTAINER_NAME..."
        docker pull redis:latest
        docker run --name "$REDIS_CONTAINER_NAME" -d -p 63790:6379 redis:latest
        if [ $? -ne 0 ]; then
            echo "Error: Failed to start Redis."
            exit 1
        fi
    fi
}

start_sam_api() {
    local START_CMD="sam local start-api -t dist/serverless.yaml --env-vars sam/.env.decrypted.json --host 127.0.0.1"

    # If DOCKER_HOST is passed as an argument, prefix the START_CMD with it
    if [ -n "$1" ]; then
        echo "Starting SAM local with DOCKER_HOST=$1"
        DOCKER_HOST="$1" $START_CMD
    else
        $START_CMD
    fi

    return $?
}

check_docker_installed
check_docker_running
start_redis

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