#!/bin/bash
set -e

# OSRM Data Setup Script for Nepal
# This script downloads and prepares OSRM data for Nepal region

echo "======================================"
echo "OSRM Data Setup for Nepal"
echo "======================================"

# Configuration
REGION="nepal"
DATA_DIR="./osrm-data"
OSM_FILE="${REGION}-latest.osm.pbf"
DOWNLOAD_URL="https://download.geofabrik.de/asia/${OSM_FILE}"

# Create data directory
mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

# Download OSM data if not exists
if [ ! -f "$OSM_FILE" ]; then
    echo "Downloading OSM data for Nepal..."
    wget -c "$DOWNLOAD_URL"
    echo "Download complete!"
else
    echo "OSM file already exists, skipping download."
fi

# Extract OSRM data
if [ ! -f "${REGION}-latest.osrm" ]; then
    echo "Extracting OSRM data..."
    docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
        osrm-extract -p /opt/car.lua /data/$OSM_FILE
    echo "Extraction complete!"
else
    echo "OSRM file already extracted, skipping extraction."
fi

# Partition
if [ ! -f "${REGION}-latest.osrm.partition" ]; then
    echo "Partitioning OSRM data..."
    docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
        osrm-partition /data/${REGION}-latest.osrm
    echo "Partitioning complete!"
else
    echo "OSRM data already partitioned, skipping."
fi

# Customize
if [ ! -f "${REGION}-latest.osrm.cells" ]; then
    echo "Customizing OSRM data..."
    docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
        osrm-customize /data/${REGION}-latest.osrm
    echo "Customization complete!"
else
    echo "OSRM data already customized, skipping."
fi

echo "======================================"
echo "OSRM data setup complete!"
echo "Data location: $DATA_DIR"
echo "======================================"
echo ""
echo "To start the services, run:"
echo "  docker-compose up -d"
echo ""
echo "Access the application at:"
echo "  http://localhost:8080"
