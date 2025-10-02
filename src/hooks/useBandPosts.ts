import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export interface BandPost {
  id: string
  band_id: string
  author_id: string
  author_name: string
  author_avatar_url: string | null
  title: string
  content: string
  is_pinned: boolean
  is_announcement: boolean
  likes_count: number
  comments_count: number
  user_has_liked: boolean
  created_at: string
  updated_at: string
}

export interface BandPostComment {
  id: string
  post_id: string
  author_id: string
  author_name: string
  author_avatar_url: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface CreatePostData {
  title: string
  content: string
  is_pinned?: boolean
  is_announcement?: boolean
}

export interface UpdatePostData {
  title?: string
  content?: string
  is_pinned?: boolean
  is_announcement?: boolean
}

// Hook to get all posts for a band
export function useBandPosts(bandId: string) {
  return useQuery({
    queryKey: ['band-posts', bandId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .rpc('get_band_posts_with_user_data', {
          band_id_param: bandId,
          user_id_param: session.user.id
        })

      if (error) throw error
      return data as BandPost[]
    },
    enabled: !!bandId,
  })
}

// Hook to get comments for a specific post
export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_post_comments', {
          post_id_param: postId
        })

      if (error) throw error
      return data as BandPostComment[]
    },
    enabled: !!postId,
  })
}

// Hook to create a new post
export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bandId, postData }: { bandId: string; postData: CreatePostData }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('band_posts')
        .insert({
          band_id: bandId,
          author_id: session.user.id,
          title: postData.title,
          content: postData.content,
          is_pinned: postData.is_pinned || false,
          is_announcement: postData.is_announcement || false
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['band-posts', data.band_id] })
      toast.success('Post created successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create post')
    },
  })
}

// Hook to update a post
export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, postData }: { postId: string; bandId: string; postData: UpdatePostData }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('band_posts')
        .update({
          ...postData,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['band-posts', bandId] })
      toast.success('Post updated successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update post')
    },
  })
}

// Hook to delete a post
export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId }: { postId: string; bandId: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('band_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      return postId
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['band-posts', bandId] })
      toast.success('Post deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    },
  })
}

// Hook to like/unlike a post
export function useTogglePostLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; bandId: string; isLiked: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      if (isLiked) {
        // Unlike the post
        const { error } = await supabase
          .from('band_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id)

        if (error) throw error
      } else {
        // Like the post
        const { error } = await supabase
          .from('band_post_likes')
          .insert({
            post_id: postId,
            user_id: session.user.id
          })

        if (error) throw error
      }

      return !isLiked
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['band-posts', bandId] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update like')
    },
  })
}

// Hook to create a comment
export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; bandId: string; content: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('band_post_comments')
        .insert({
          post_id: postId,
          author_id: session.user.id,
          content
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { postId, bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['band-posts', bandId] })
      toast.success('Comment added successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
    },
  })
}

// Hook to update a comment
export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; postId: string; bandId: string; content: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('band_post_comments')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { postId, bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['band-posts', bandId] })
      toast.success('Comment updated successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update comment')
    },
  })
}

// Hook to delete a comment
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string; bandId: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('band_post_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      return commentId
    },
    onSuccess: (_, { postId, bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['band-posts', bandId] })
      toast.success('Comment deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment')
    },
  })
}