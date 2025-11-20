#!/bin/bash
# Start the FastAPI backend server

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# Start the server
echo "Starting FastAPI backend on http://localhost:8000"
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
