#!/bin/bash
chmod +x "$0" 2>/dev/null
cd "$(dirname "$0")/.."
jupyter notebook
