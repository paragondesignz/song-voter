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
      // Get memberships then fetch bands separately
      const { data: memberships, error: membershipsError } = await supabase
        .from('band_members')
        .select('band_id, role')
        .eq('user_id', user?.id)

      if (membershipsError) {
        throw membershipsError
      }

      if (!memberships || memberships.length === 0) {
        return []
      }

      // Get bands for those membership band_ids
      const bandIds = memberships.map(m => m.band_id)
      const { data: bands, error: bandsError } = await supabase
        .from('bands')
        .select('*')
        .in('id', bandIds)

      if (bandsError) {
        throw bandsError
      }

      // Merge the data
      const roleMap = new Map(memberships.map(m => [m.band_id, m.role]))
      
      return (bands || []).map((band: any) => ({
        id: band.id,
        name: band.name,
        invite_code: band.invite_code,
        created_by: band.created_by,
        created_at: band.created_at,
        role: roleMap.get(band.id) as 'admin' | 'member',
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
  return useQuery<BandMember[]>({
    queryKey: ['band-members', bandId],
    queryFn: async (): Promise<BandMember[]> => {
      
      // Query band members with profiles join
      const { data, error } = await supabase
        .from('band_members')
        .select(`
          *,
          profiles(
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('band_id', bandId)
        .order('joined_at', { ascending: true })

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Band members query error:', error)
        // Fallback: get band members and profiles separately
        const { data: members } = await supabase
          .from('band_members')
          .select('*')
          .eq('band_id', bandId)
          .order('joined_at', { ascending: true })
          
        if (members && members.length > 0) {
          const memberIds = members.map(m => m.user_id)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, email, avatar_url')
            .in('id', memberIds)
            
          const combinedData = members.map(member => ({
            ...member,
            user: profiles?.find(p => p.id === member.user_id) || {
              display_name: 'Unknown User',
              email: 'unknown@example.com',
              avatar_url: null
            }
          }))
          
          return combinedData as BandMember[]
        }
        
        throw error
      }
      
      // Transform the data to match expected structure
      const transformedData = data?.map((item: any) => ({
        ...item,
        user: item.profiles ?? {
          display_name: 'Unknown User',
          email: 'unknown@example.com',
          avatar_url: null,
        }
      })) || []
      
      return transformedData as BandMember[]
    },
    enabled: !!bandId,
    staleTime: 0, // Always refetch to see fresh data
    gcTime: 0, // Don't cache to ensure we see updates
  })
}

export function useCreateBand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      // Get the current session to ensure we have a valid user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to create a band')
      }

      const { data: band, error: bandError } = await supabase
        .from('bands')
        .insert({
          name,
          created_by: session.user.id,
        })
        .select()
        .single()

      if (bandError) throw bandError

      const { error: memberError } = await supabase
        .from('band_members')
        .insert({
          band_id: band.id,
          user_id: session.user.id,
          role: 'admin',
        })

      if (memberError) throw memberError

      return band
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      toast.success('Band created successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create band')
    },
  })
}

export function useJoinBand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      // Get the current session to ensure we have a valid user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to join a band')
      }

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
        .eq('user_id', session.user.id)
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
          user_id: session.user.id,
          role: 'member',
        })

      if (memberError) throw memberError

      return band
    },
    onSuccess: (band) => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      toast.success(`Successfully joined ${band.name}!`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to join band')
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    },
  })
}

export function useLeaveBand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bandId: string) => {
      // Get the current session to ensure we have a valid user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to leave a band')
      }

      const { error } = await supabase
        .from('band_members')
        .delete()
        .eq('band_id', bandId)
        .eq('user_id', session.user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      toast.success('Successfully left the band')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to leave band')
    },
  })
}

export function useUserBandRole(bandId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-band-role', bandId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('band_members')
        .select('role')
        .eq('band_id', bandId)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error
      return data.role as 'admin' | 'member'
    },
    enabled: !!bandId && !!user,
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      bandId, 
      userId, 
      newRole 
    }: { 
      bandId: string
      userId: string
      newRole: 'admin' | 'member'
    }) => {
      const { data, error } = await supabase
        .from('band_members')
        .update({ role: newRole })
        .eq('band_id', bandId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['band-members', bandId] })
      queryClient.invalidateQueries({ queryKey: ['user-band-role', bandId] })
      toast.success('Member role updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update member role')
    },
  })
}

export function useUpdateBandName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bandId, name }: { bandId: string; name: string }) => {
      const { data, error } = await supabase
        .from('bands')
        .update({ name })
        .eq('id', bandId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (band) => {
      queryClient.invalidateQueries({ queryKey: ['bands'] })
      queryClient.invalidateQueries({ queryKey: ['band', band.id] })
      toast.success('Band name updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update band name')
    },
  })
}

