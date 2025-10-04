import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'

export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (updates: {
      display_name?: string
      avatar_url?: string | null
    }) => {
      if (!user) throw new Error('Not authenticated')

      // Update profile in database
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      // Update auth user metadata if display_name changed
      if (updates.display_name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { display_name: updates.display_name }
        })
        if (authError) throw authError
      }

      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profile updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Password updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      // Delete user account - this will cascade delete all related data
      const { error } = await supabase.auth.admin.deleteUser(session.user.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Account deleted successfully')
      // User will be automatically signed out
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account')
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Upload via edge function (bypasses RLS using service role)
      const { error } = await supabase.functions.invoke('upload-avatar', {
        body: formData,
      })

      if (error) throw error

      // Fetch updated profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      return profile as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Avatar updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar')
    },
  })
}