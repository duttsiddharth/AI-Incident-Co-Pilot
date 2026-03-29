#!/usr/bin/env bash
# Render Build Script for Backend

set -e

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Creating logs directory..."
mkdir -p logs

echo "Build complete!"
