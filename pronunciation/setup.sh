#!/bin/bash
set -e
echo "=== Professor IELTS Pronunciation Pipeline Setup ==="

# Create conda environment
conda create -n ielts-pronunciation python=3.10 -y
conda activate ielts-pronunciation

# Install MFA
conda install -c conda-forge montreal-forced-aligner -y
mfa model download acoustic english_mfa
mfa model download dictionary english_mfa

# Install Python packages
pip install -r requirements.txt

# Verify
python -c "
from transformers import Wav2Vec2ForCTC
print('✓ Wav2Vec2 available')
import textgrid
print('✓ TextGrid parser available')
import librosa
print('✓ Librosa available')
print('=== Setup complete ===')
"

echo ""
echo "Start the server with: uvicorn main:app --host 0.0.0.0 --port 8000"
