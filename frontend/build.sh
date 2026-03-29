#!/usr/bin/env bash
# Render Build Script for Frontend

set -e

echo "Installing dependencies..."
yarn install --frozen-lockfile

echo "Building React app..."
yarn build

echo "Build complete!"
