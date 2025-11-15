#!/bin/bash
set -e

echo "======================================"
echo "TSP Frontend - Quick Start"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if OSRM data exists
if [ ! -d "osrm-data" ] || [ ! -f "osrm-data/nepal-latest.osrm" ]; then
    echo "📦 OSRM data not found. Setting up..."
    ./docker/setup-osrm.sh
else
    echo "✅ OSRM data already prepared"
fi

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "======================================"
    echo "✅ Services are running!"
    echo "======================================"
    echo ""
    echo "Access the application:"
    echo "  🌐 Frontend: http://localhost:8080"
    echo "  🗺️  OSRM API: http://localhost:5000"
    echo ""
    echo "Useful commands:"
    echo "  📊 View logs:        docker-compose logs -f"
    echo "  🔄 Restart:          docker-compose restart"
    echo "  🛑 Stop:             docker-compose down"
    echo "  🗑️  Clean up:         docker-compose down -v && rm -rf osrm-data/"
    echo ""
else
    echo ""
    echo "❌ Services failed to start. Check logs:"
    echo "   docker-compose logs"
    exit 1
fi
