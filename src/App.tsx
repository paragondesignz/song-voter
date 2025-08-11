import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
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
import { RehearsalDetail } from '@/pages/RehearsalDetail'
import { RehearsalEdit } from '@/pages/RehearsalEdit'
import { Profile } from '@/pages/Profile'
import { VotingAnalytics } from '@/pages/VotingAnalytics'
import { BandMembers } from '@/pages/BandMembers'
import { MemberProfile } from '@/pages/MemberProfile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function AppContent() {
  useEffect(() => {
    // Clear any stale rate limit queries on app start
    queryClient.removeQueries({ queryKey: ['vote-rate-limit'] })
    // Ensure dark theme variables apply at root so body reads them
    const root = document.documentElement
    root.classList.remove('theme-dashboard')
    root.classList.add('theme-darkboard')
  }, [])

  return (
    <>
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
          <Route path="/band/:bandId/rehearsal/:rehearsalId" element={<RehearsalDetail />} />
          <Route path="/band/:bandId/rehearsal/:rehearsalId/edit" element={<RehearsalEdit />} />
          <Route path="/band/:bandId/voting-analytics" element={<VotingAnalytics />} />
          <Route path="/band/:bandId/members" element={<BandMembers />} />
          <Route path="/band/:bandId/profile" element={<MemberProfile />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App