#!/bin/bash

# Development setup script

set -e

echo "Setting up development environment for uptime-kuma-api..."
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$MAJOR_VERSION" -lt 16 ]; then
  echo "Error: Node.js 16.0.0 or higher is required"
  exit 1
fi

echo "Node.js version is compatible"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  npm run build       - Build the project"
echo "  npm run dev         - Build in watch mode"
echo "  npm test            - Run tests"
echo "  npm run lint        - Run linter"
echo "  npm run format      - Format code"
echo ""
echo "Example files are in the ./examples directory"
echo "Run them with: npx ts-node examples/basic-usage.ts"
