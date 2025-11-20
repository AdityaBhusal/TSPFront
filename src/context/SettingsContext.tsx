import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface AppSettings {
  fuelEfficiency: number // km per liter
  fuelPricePerLiter: number // price in currency
  currency: string
  stopWaitingTime: number // minutes
  defaultStartLocation: { lat: number; lng: number } | null
}

const defaultSettings: AppSettings = {
  fuelEfficiency: 10, // 10 km/L
  fuelPricePerLiter: 162, // NPR 162/L
  currency: 'NPR',
  stopWaitingTime: 15, // 15 minutes
  defaultStartLocation: null,
}

interface SettingsContextType {
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('tsp-settings')
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('tsp-settings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
