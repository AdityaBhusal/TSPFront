import { Fragment } from 'react'
import { XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useSettings } from '../context/SettingsContext'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const { settings, updateSettings } = useSettings()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative z-[9999] bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Cog6ToothIcon className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Vehicle Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Settings</h3>
              
              <div className="space-y-4">
                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={settings.fuelEfficiency}
                    onChange={(e) => updateSettings({ fuelEfficiency: parseFloat(e.target.value) || 12 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                    <option value="bike">Motorcycle</option>
                  </select>
                </div>

                {/* Fuel Efficiency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Efficiency (km/L)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.5"
                    value={settings.fuelEfficiency}
                    onChange={(e) => updateSettings({ fuelEfficiency: parseFloat(e.target.value) || 12 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Average fuel consumption of your vehicle
                  </p>
                </div>

                {/* Fuel Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Price (per L)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="0.01"
                    value={settings.fuelPricePerLiter}
                    onChange={(e) => updateSettings({ fuelPricePerLiter: parseFloat(e.target.value) || 1.5 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current fuel price per liter
                  </p>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => updateSettings({ currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NPR">NPR (रू)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cost Preview */}
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2">Cost Estimate Preview</h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">10 km route:</span> ${(10 / settings.fuelEfficiency * settings.fuelPricePerLiter).toFixed(2)}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">50 km route:</span> ${(50 / settings.fuelEfficiency * settings.fuelPricePerLiter).toFixed(2)}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">100 km route:</span> ${(100 / settings.fuelEfficiency * settings.fuelPricePerLiter).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
