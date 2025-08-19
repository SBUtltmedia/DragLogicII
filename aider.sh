#!/usr/bin/env bash

# ==============================================================================
# Aider Wrapper Script for Ollama
# ==============================================================================
#
# Description:
# This script acts as a convenient wrapper for the 'aider' command.
# It assumes you have already set the required environment variables by
# running 'source .env' in your terminal. It constructs the full aider
# command with the correct flags and passes along any additional arguments
# (like filenames) that you provide.
#
# Prerequisites:
# The following environment variables must be set before running this script:
#   - OPENAI_API_KEY
#   - OPENAI_BASE_URL
#   - OPENAI_MODEL
#
# Usage:
#   1. Save this script (e.g., as 'ai') and make it executable (chmod +x ai).
#   2. source .env
#   3. ./ai <file1> <file2> ...
#
# Example:
#   ./ai README.md src/main.py
#
# ==============================================================================

# --- Check for required environment variables ---
if [ -z "$OPENAI_API_KEY" ] || [ -z "$OPENAI_BASE_URL" ] || [ -z "$OPENAI_MODEL" ]; then
    echo "Error: Required environment variables are not set."
    echo "Please ensure OPENAI_API_KEY, OPENAI_BASE_URL, and OPENAI_MODEL are exported."
    echo "Hint: Did you run 'source .env' in your current terminal session?"
    exit 1
fi

# Announce the configuration being used
echo "--- Starting Aider with the following configuration ---"
echo "Model:     ollama/${OPENAI_MODEL}"
echo "Base URL:  ${OPENAI_BASE_URL}"
echo "-------------------------------------------------------"
echo

# --- Execute the Aider command ---
# It uses the environment variables to set the flags and passes all
# script arguments (like filenames) through using "$@".
aider \
    --model "ollama/${OPENAI_MODEL}" \
    --openai-api-key "${OPENAI_API_KEY}" \
    
    "$@"
