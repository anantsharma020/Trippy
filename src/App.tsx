import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './lib/db'
import { Spinner } from './ui/primitives'
import AuthScreen from './pages/AuthScreen'
import Home from './pages/Home'
import Friends from './pages/Friends'
import ProfilePage from './pages/ProfilePage'
import CorePackingPage from './pages/CorePackingPage'
import WorldPage from './pages/WorldPage'
import DreamsPage from './pages/DreamsPage'
import DreamDetail from './pages/DreamDetail'
import TripLayout from './pages/TripLayout'
import Overview from './sections/Overview'
import Itinerary from './sections/Itinerary'
import Ideas from './sections/Ideas'
import TravelDetails from './sections/TravelDetails'
import ActionItems from './sections/ActionItems'
import Packing from './sections/Packing'
import TripMap from './sections/TripMap'

export default function App() {
  const { ready, user, init } = useApp()

  useEffect(() => { init() }, [init])

  if (!ready) return <div className="min-h-screen grid place-items-center"><Spinner label="Loading Trippy…" /></div>
  if (!user) return <AuthScreen />

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/world" element={<WorldPage />} />
      <Route path="/dreams" element={<DreamsPage />} />
      <Route path="/dream/:id" element={<DreamDetail />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/core-packing" element={<CorePackingPage />} />
      <Route path="/trip/:id" element={<TripLayout />}>
        <Route index element={<Overview />} />
        <Route path="itinerary" element={<Itinerary />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="details" element={<TravelDetails />} />
        <Route path="actions" element={<ActionItems />} />
        <Route path="packing" element={<Packing />} />
        <Route path="map" element={<TripMap />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
