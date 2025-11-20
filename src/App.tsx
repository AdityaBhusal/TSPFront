import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { MapPinIcon, BeakerIcon, TruckIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { ResearchView } from './pages/ResearchView'
import { LogisticsView } from './pages/LogisticsView'
import { SettingsModal } from './components/SettingsModal'
import { useState } from 'react'

export type AlgoKey = 'brute_force' | 'nearest_neighbor' | 'genetic'

export type Pin = {
  id: string
  lat: number
  lng: number
  label?: string
}

export type Matrix = {
  durations: number[][]
  distances: number[][]
}

export type RouteResult = {
  order: number[]
  totalDistance: number
  totalDuration: number
  legs: Array<{ from: number; to: number; distance: number; duration: number }>
  executionTime?: number
}

function Navigation() {
  const location = useLocation()
  const [showSettings, setShowSettings] = useState(false)
  
  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <MapPinIcon className="w-6 h-6 text-primary-600" aria-hidden />
                <span>TSP Solver</span>
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Route Optimization & Benchmarking Tool
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                to="/research"
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  location.pathname === '/research'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BeakerIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Research</span>
              </Link>
              
              <Link
                to="/logistics"
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  location.pathname === '/logistics' || location.pathname === '/'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <TruckIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Logistics</span>
              </Link>
              
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
                title="Settings"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        
        <Routes>
          <Route path="/" element={<LogisticsView />} />
          <Route path="/logistics" element={<LogisticsView />} />
          <Route path="/research" element={<ResearchView />} />
        </Routes>
        
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="container mx-auto px-4 py-3 text-center">
            <p className="text-sm text-gray-600">
              Map tiles © <a href="https://www.openstreetmap.org/copyright" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
              {' '} | Routing by <a href="http://project-osrm.org/" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">OSRM</a>
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
