import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { VerifyEmail } from '@/pages/VerifyEmail'
import { Dashboard } from '@/pages/Dashboard'
import { BandSetup } from '@/pages/BandSetup'
import { BandDashboard } from '@/pages/BandDashboard'
import { SongSearch } from '@/pages/SongSearch'
import { Suggestions } from '@/pages/Suggestions'
import { Leaderboard } from '@/pages/Leaderboard'
import { Rehearsals } from '@/pages/Rehearsals'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-center" />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/band-setup" element={<BandSetup />} />
              <Route path="/band/:bandId" element={<BandDashboard />} />
              <Route path="/band/:bandId/search" element={<SongSearch />} />
              <Route path="/band/:bandId/suggestions" element={<Suggestions />} />
              <Route path="/band/:bandId/leaderboard" element={<Leaderboard />} />
              <Route path="/band/:bandId/rehearsals" element={<Rehearsals />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App