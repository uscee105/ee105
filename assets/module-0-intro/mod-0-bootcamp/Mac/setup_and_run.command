#!/bin/bash

# Make this script and subscripts executable
chmod +x "$0" 2>/dev/null

# Change to the script's directory
cd "$(dirname "$0")"

echo "============================================"
echo "  EE105 Lab 0 - Complete Setup"
echo "============================================"
echo ""

# Check if Anaconda/conda is already installed
if command -v conda >/dev/null 2>&1; then
    echo "Anaconda is already installed!"
    echo ""
else
    echo "Anaconda not found. Starting installation..."
    echo ""
    
    # Make install script executable and run it
    chmod +x "./install_anaconda.command" 2>/dev/null
    bash "./install_anaconda.command"
    
    echo ""
    echo "============================================"
    echo "  Installation complete!"
    echo "============================================"
    echo ""
    echo "Please CLOSE this terminal and run this script again"
    echo "to launch the notebook."
    echo ""
    echo "(This is needed so the terminal recognizes the new conda installation)"
    echo ""
    read -p "Press Enter to exit..."
    exit 0
fi

# Launch the notebook
echo "Launching Jupyter Notebook..."
echo ""

# Source conda for this session (in case it's a fresh terminal)
if [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
    source "$HOME/anaconda3/etc/profile.d/conda.sh"
elif [ -f "$HOME/opt/anaconda3/etc/profile.d/conda.sh" ]; then
    source "$HOME/opt/anaconda3/etc/profile.d/conda.sh"
elif [ -f "/opt/anaconda3/etc/profile.d/conda.sh" ]; then
    source "/opt/anaconda3/etc/profile.d/conda.sh"
fi

conda activate base 2>/dev/null

# Make launch script executable and run it
chmod +x "./launch_notebook.command" 2>/dev/null
bash "./launch_notebook.command"
