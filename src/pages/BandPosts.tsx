import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import {
  useBandPosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useTogglePostLike,
  useCreateComment,
  usePostComments,
  useDeleteComment,
  BandPost,
  CreatePostData
} from '@/hooks/useBandPosts'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import {
  MessageSquare,
  Heart,
  Pin,
  Megaphone,
  Edit,
  Trash2,
  Plus,
  Send,
  Users,
  X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Component for displaying post comments
function PostComments({ postId, bandId, onCommentAdded }: { postId: string; bandId: string; onCommentAdded: () => void }) {
  const [newComment, setNewComment] = useState('')
  const { data: comments = [] } = usePostComments(postId)
  const createComment = useCreateComment()
  const deleteComment = useDeleteComment()

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    await createComment.mutateAsync({ postId, bandId, content: newComment })
    setNewComment('')
    onCommentAdded()
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    await deleteComment.mutateAsync({ commentId, postId, bandId })
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      {/* Add Comment */}
      <form onSubmit={handleComment} className="mb-4">
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-gray-600" />
            </div>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="input-field"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newComment.trim() || createComment.isPending}
                className="btn-primary btn-sm"
              >
                <Send className="h-3 w-3 mr-1" />
                {createComment.isPending ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3">
            <div className="flex-shrink-0">
              {comment.author_avatar_url ? (
                <img
                  src={comment.author_avatar_url}
                  alt={comment.author_name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900">{comment.author_name}</h4>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BandPosts() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: posts = [], isLoading: isLoadingPosts, refetch: refetchPosts } = useBandPosts(bandId!)

  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', is_pinned: false, is_announcement: false })
  const [showComments, setShowComments] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editData, setEditData] = useState({ title: '', content: '', is_pinned: false, is_announcement: false })

  // Mutations
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()
  const toggleLike = useTogglePostLike()

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.title.trim() || !newPost.content.trim() || !bandId) return

    const postData: CreatePostData = {
      title: newPost.title,
      content: newPost.content,
      is_pinned: newPost.is_pinned,
      is_announcement: newPost.is_announcement
    }

    await createPost.mutateAsync({ bandId, postData })
    setNewPost({ title: '', content: '', is_pinned: false, is_announcement: false })
    setShowCreateForm(false)
  }

  const handleEditPost = (post: BandPost) => {
    setEditingPost(post.id)
    setEditData({
      title: post.title,
      content: post.content,
      is_pinned: post.is_pinned,
      is_announcement: post.is_announcement
    })
  }

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPost || !bandId) return

    await updatePost.mutateAsync({
      postId: editingPost,
      bandId,
      postData: editData
    })
    setEditingPost(null)
  }

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return
    if (!bandId) return

    await deletePost.mutateAsync({ postId, bandId })
  }

  const handleLike = async (post: BandPost) => {
    if (!bandId) return
    await toggleLike.mutateAsync({
      postId: post.id,
      bandId,
      isLiked: post.user_has_liked
    })
  }

  if (!band || isLoadingPosts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Sort posts: pinned first, then by creation date
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-8 w-8 mr-3 text-blue-600" />
                Band Posts
              </h1>
              {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Create Post Form */}
            {showCreateForm && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Create New Post</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="input-field"
                      placeholder="Post title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      rows={4}
                      className="input-field"
                      placeholder="What's on your mind?"
                      required
                    />
                  </div>

                  {userRole === 'admin' && (
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newPost.is_pinned}
                          onChange={(e) => setNewPost({ ...newPost, is_pinned: e.target.checked })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Pin this post</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newPost.is_announcement}
                          onChange={(e) => setNewPost({ ...newPost, is_announcement: e.target.checked })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mark as announcement</span>
                      </label>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createPost.isPending}
                      className="btn-primary"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {createPost.isPending ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Posts List */}
            <div className="space-y-6">
              {sortedPosts.map((post) => (
                <div
                  key={post.id}
                  className={`card ${post.is_pinned ? 'border-l-4 border-yellow-500 bg-yellow-50' : ''}`}
                >
                  {editingPost === post.id ? (
                    /* Edit Post Form */
                    <form onSubmit={handleUpdatePost} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editData.title}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content
                        </label>
                        <textarea
                          value={editData.content}
                          onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                          rows={4}
                          className="input-field"
                          required
                        />
                      </div>

                      {userRole === 'admin' && (
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editData.is_pinned}
                              onChange={(e) => setEditData({ ...editData, is_pinned: e.target.checked })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Pin this post</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editData.is_announcement}
                              onChange={(e) => setEditData({ ...editData, is_announcement: e.target.checked })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Mark as announcement</span>
                          </label>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setEditingPost(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={updatePost.isPending}
                          className="btn-primary"
                        >
                          {updatePost.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Regular Post Display */
                    <>
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {post.author_avatar_url ? (
                            <img
                              src={post.author_avatar_url}
                              alt={post.author_name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{post.author_name}</h3>
                              {post.is_pinned && (
                                <Pin className="h-4 w-4 text-yellow-600" />
                              )}
                              {post.is_announcement && (
                                <Megaphone className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {(userRole === 'admin' || post.author_id === post.author_id) && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditPost(post)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Edit post"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Delete post"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h2>
                        <div className="text-gray-700">
                          {expandedPost === post.id || post.content.length <= 200 ? (
                            <p className="whitespace-pre-wrap">{post.content}</p>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap">{post.content.substring(0, 200)}...</p>
                              <button
                                onClick={() => setExpandedPost(post.id)}
                                className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-1"
                              >
                                Read more
                              </button>
                            </>
                          )}
                          {expandedPost === post.id && post.content.length > 200 && (
                            <button
                              onClick={() => setExpandedPost(null)}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-1 block"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Post Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleLike(post)}
                            disabled={toggleLike.isPending}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors disabled:opacity-50 ${
                              post.user_has_liked
                                ? 'bg-red-50 text-red-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-current' : ''}`} />
                            <span className="text-sm font-medium">{post.likes_count}</span>
                          </button>

                          <button
                            onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                            className="flex items-center space-x-2 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm font-medium">{post.comments_count}</span>
                          </button>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {showComments === post.id && (
                        <PostComments postId={post.id} bandId={bandId!} onCommentAdded={() => refetchPosts()} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {posts.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-6">
                  Start the conversation! Share updates, announcements, or anything with your band.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <BandSidebar bandId={bandId!} />
          </div>
        </div>
      </main>
    </div>
  )
}