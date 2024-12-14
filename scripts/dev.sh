#!/bin/bash

# Default values
ENV="staging"
FORCE_DECRYPT=false

# Parse command line arguments
for arg in "$@"; do
    case $arg in
        --env=*)
        ENV="${arg#*=}"
        FORCE_DECRYPT=true
        shift
        ;;
    esac
done

# Convert to lowercase for case-insensitive comparison
ENV=$(echo "$ENV" | tr '[:upper:]' '[:lower:]')

# Validate environment argument
if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
    echo "Error: Invalid environment. Please use 'staging' or 'production'"
    exit 1
fi

# Set file paths
CONFIG_DIR="./config"
DECRYPTED_FILE="${CONFIG_DIR}/settings.decrypted.json"

# Check if we should run decrypt
if [ "$FORCE_DECRYPT" = true ] || [ ! -f "$DECRYPTED_FILE" ]; then
    if [ "$FORCE_DECRYPT" = true ]; then
        echo "Environment flag provided (${ENV}), forcing decryption..."
    else
        echo "Decrypted settings file not found. Running decrypt..."
    fi
    
    ./scripts/decrypt.sh "$ENV"
    
    # Check if decryption was successful
    if [ $? -ne 0 ]; then
        echo "Error: Decryption failed"
        exit 1
    fi
else
    echo "Decrypted settings file exists, skipping decryption"
fi

# Run the build script
echo "Running build..."
node scripts/build.js

if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
fi

echo "Development setup complete!" 