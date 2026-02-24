#!/bin/bash

# Build script for uptime-kuma-api

set -e

echo "Building Uptime Kuma TypeScript Client..."
echo ""

# Clean previous build
if [ -d "dist" ]; then
  echo "Cleaning previous build..."
  rm -rf dist
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run linter
echo "Running linter..."
npm run lint

# Run tests
echo "Running tests..."
npm test

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

echo ""
echo "Build completed successfully!"
echo ""
echo "Output directory: ./dist"
echo ""

# Show build output
if [ -d "dist" ]; then
  echo "Built files:"
  ls -lh dist/
fi
