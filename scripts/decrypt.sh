#!/bin/bash

# Check if sops is installed
if ! command -v sops &> /dev/null; then
    echo "Error: 'sops' is not installed"
    echo "Please install sops first. Visit: https://github.com/mozilla/sops#install"
    exit 1
fi

# Check if environment argument is provided
if [ -z "$1" ]; then
    echo "Error: Please provide an environment (staging or production)"
    echo "Usage: ./decrypt.sh <environment>"
    exit 1
fi

# Convert to lowercase for case-insensitive comparison
ENV=$(echo "$1" | tr '[:upper:]' '[:lower:]')

# Validate environment argument
if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
    echo "Error: Invalid environment. Please use 'staging' or 'production'"
    exit 1
fi

# Set file paths
CONFIG_DIR="./config"
SOPS_CONFIG="${CONFIG_DIR}/sops.yaml"
SETTINGS_FILE="${CONFIG_DIR}/settings.${ENV}.json"
DECRYPTED_FILE="${CONFIG_DIR}/settings.decrypted.json"

# Check if files exist
if [ ! -f "$SOPS_CONFIG" ]; then
    echo "Error: SOPS config file not found at ${SOPS_CONFIG}"
    exit 1
fi

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "Error: Settings file not found at ${SETTINGS_FILE}"
    exit 1
fi

# Decrypt the file
echo "Decrypting ${ENV} settings..."
sops --config "$SOPS_CONFIG" -d "$SETTINGS_FILE" > "$DECRYPTED_FILE"

if [ $? -eq 0 ]; then
    echo "Successfully decrypted to ${DECRYPTED_FILE}"
else
    echo "Error: Decryption failed"
    exit 1
fi
