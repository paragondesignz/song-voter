import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'

export interface Band {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  role?: string
  member_count?: number
}

export interface BandMember {
  id: string
  band_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  user?: {
    display_name: string
    email: string
    avatar_url?: string
  }
}

export function useUserBands() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['bands', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('band_members')
        .select(`
          band_id,
          role,
          bands:band_id (
            id,
            name,
            invite_code,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user?.id)

      if (error) throw error

      return data.map((item: any) => ({
        ...item.bands,
        role: item.role,
      })) as Band[]
    },
    enabled: !!user,
  })
}

export function useBand(bandId: string) {
  return useQuery({
    queryKey: ['band', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bands')
        .select(`
          *,
          band_members (
            count
          )
        `)
        .eq('id', bandId)
        .single()

      if (error) throw error

      return {
        ...data,
        member_count: data.band_members[0].count,
      } as Band
    },
    enabled: !!bandId,
  })
}

export function useBandMembers(bandId: string) {
  return useQuery({
    queryKey: ['band-members', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('band_members')
        .select(`
          *,
          user:user_id (
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('band_id', bandId)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return data as BandMember[]
    },
    enabled: !!bandId,
  })
}

export function useCreateBand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .insert({
          name,
          created_by: user?.id,
        })
        .select()
        .single()

      if (bandError) throw bandError

      const { error: memberError } = await supabase
        .from('band_members')
        .insert({
          band_id: band.id,
          user_id: user?.id,
          role: 'admin',
        })

      if (memberError) throw memberError

      return band
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      toast.success('Band created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create band')
    },
  })
}

export function useJoinBand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data: band, error: bandError } = await supabase
        .from('bands')
        .select('id, name')
        .eq('invite_code', inviteCode.toUpperCase())
        .single()

      if (bandError) throw new Error('Invalid invite code')

      const { data: existingMember } = await supabase
        .from('band_members')
        .select('id')
        .eq('band_id', band.id)
        .eq('user_id', user?.id)
        .single()

      if (existingMember) throw new Error('You are already a member of this band')

      const { data: memberCount } = await supabase
        .from('band_members')
        .select('id', { count: 'exact' })
        .eq('band_id', band.id)

      if (memberCount && memberCount.length >= 10) {
        throw new Error('This band has reached the maximum number of members')
      }

      const { error: memberError } = await supabase
        .from('band_members')
        .insert({
          band_id: band.id,
          user_id: user?.id,
          role: 'member',
        })

      if (memberError) throw memberError

      return band
    },
    onSuccess: (band) => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      toast.success(`Successfully joined ${band.name}!`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join band')
    },
  })
}

export function useRemoveBandMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bandId, userId }: { bandId: string; userId: string }) => {
      const { error } = await supabase
        .from('band_members')
        .delete()
        .eq('band_id', bandId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['band-members', bandId] })
      toast.success('Member removed successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member')
    },
  })
}

export function useLeaveBand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (bandId: string) => {
      const { error } = await supabase
        .from('band_members')
        .delete()
        .eq('band_id', bandId)
        .eq('user_id', user?.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      toast.success('Successfully left the band')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to leave band')
    },
  })
}