#!/bin/bash

# Make this script executable (for future runs)
chmod +x "$0" 2>/dev/null

# Change to the script's directory
cd "$(dirname "$0")"

echo "============================================"
echo " Anaconda Installer for macOS"
echo "============================================"
echo ""

# Detect architecture
ARCH=$(uname -m)

if [ "$ARCH" = "arm64" ]; then
    echo "Detected: macOS ARM64 (Apple Silicon - M1/M2/M3)"
    ANACONDA_ARCH="MacOSX-arm64"
elif [ "$ARCH" = "x86_64" ]; then
    echo "Detected: macOS x86_64 (Intel)"
    ANACONDA_ARCH="MacOSX-x86_64"
else
    echo "ERROR: Unknown architecture: $ARCH"
    exit 1
fi

ANACONDA_VERSION="2025.12-1"
DOWNLOAD_URL="https://repo.anaconda.com/archive/Anaconda3-${ANACONDA_VERSION}-${ANACONDA_ARCH}.sh"
INSTALLER_NAME="Anaconda3-${ANACONDA_VERSION}-${ANACONDA_ARCH}.sh"

echo ""
echo "Downloading Anaconda from:"
echo "$DOWNLOAD_URL"
echo ""
echo "This may take several minutes..."
echo ""

# Download using curl
curl -L -o "$INSTALLER_NAME" "$DOWNLOAD_URL"

if [ -f "$INSTALLER_NAME" ]; then
    echo ""
    echo "============================================"
    echo " Download complete!"
    echo "============================================"
    echo ""
    echo "Starting installer..."
    echo ""
    # Run the .sh installer
    bash "$INSTALLER_NAME"
else
    echo ""
    echo "ERROR: Download failed."
    echo "Please download manually from: https://www.anaconda.com/download"
fi
