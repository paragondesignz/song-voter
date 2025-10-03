import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'

export interface SongComment {
  id: string
  song_suggestion_id: string
  user_id: string
  band_id: string
  comment: string
  created_at: string
  updated_at: string
  user?: {
    display_name: string
    avatar_url?: string
  }
}

export function useSongComments(songId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['song-comments', songId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('song_comments')
        .select('id, song_suggestion_id, user_id, band_id, comment, created_at, updated_at')
        .eq('song_suggestion_id', songId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const userIds = Array.from(new Set(comments?.map(c => c.user_id) || []))
      let profiles: any[] = []

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)
        profiles = profilesData || []
      }

      const profileMap = profiles.reduce((acc, p) => {
        acc[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }
        return acc
      }, {} as Record<string, { display_name: string; avatar_url?: string }>)

      return (comments || []).map(comment => ({
        ...comment,
        user: profileMap[comment.user_id]
      })) as SongComment[]
    },
    enabled: !!songId && !!user,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      songId,
      bandId,
      comment
    }: {
      songId: string
      bandId: string
      comment: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to comment')
      }

      const { data, error } = await supabase
        .from('song_comments')
        .insert({
          song_suggestion_id: songId,
          user_id: session.user.id,
          band_id: bandId,
          comment: comment.trim()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { songId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-comments', songId] })
      toast.success('Comment added!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      songId: _songId
    }: {
      commentId: string
      songId: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in')
      }

      const { error } = await supabase
        .from('song_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session.user.id)

      if (error) throw error
    },
    onSuccess: (_, { songId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-comments', songId] })
      toast.success('Comment deleted!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment')
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      songId: _songId,
      comment
    }: {
      commentId: string
      songId: string
      comment: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in')
      }

      const { data, error } = await supabase
        .from('song_comments')
        .update({
          comment: comment.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { songId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-comments', songId] })
      toast.success('Comment updated!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update comment')
    },
  })
}
