#!/usr/bin/env bash
set -e

echo "Building Python Backend Sidecar..."

cd ../backend

# Ensure pyinstaller is available
if ! command -v pyinstaller &> /dev/null
then
    echo "pyinstaller could not be found. Please setup virtual environment and pip install pyinstaller."
    exit 1
fi

# Compile the FastAPI app into a single executable sidecar
pyinstaller --onefile \
            --name buddy-sidecar \
            --clean \
            main.py

# Tauri expects the sidecar to have the target triple for its platform (e.g. x86_64-unknown-linux-gnu)
# We will use rustc to get the current host target triple, or fallback to standard Arch Linux x86_64
TARGET_TRIPLE=$(rustc -vV | sed -n 's|host: ||p')
if [ -z "$TARGET_TRIPLE" ]; then
    TARGET_TRIPLE="x86_64-unknown-linux-gnu"
    echo "Could not detect rustc target triple, defaulting to $TARGET_TRIPLE"
fi

echo "Copying to Tauri sidecar binary path: ../src-tauri/binaries/buddy-sidecar-${TARGET_TRIPLE}"

mkdir -p ../src-tauri/binaries
cp dist/buddy-sidecar "../src-tauri/binaries/buddy-sidecar-${TARGET_TRIPLE}"

echo "Build sidecar complete."
