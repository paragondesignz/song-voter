import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import {
  MessageSquare,
  Plus,
  User,
  MoreVertical,
  Pin,
  MessageCircle,
  Heart,
  Send
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Placeholder interfaces - these would be replaced with real hooks
interface BandPost {
  id: string
  band_id: string
  author_id: string
  author: {
    display_name: string
    avatar_url?: string
  }
  title: string
  content: string
  is_pinned: boolean
  is_announcement: boolean
  created_at: string
  updated_at: string
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

// interface PostComment {
//   id: string
//   post_id: string
//   author_id: string
//   author: {
//     display_name: string
//     avatar_url?: string
//   }
//   content: string
//   created_at: string
// }

export function BandPosts() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    is_announcement: false,
    is_pinned: false
  })
  const [newComment, setNewComment] = useState('')

  // Mock data - replace with real hooks
  const posts: BandPost[] = [
    {
      id: '1',
      band_id: bandId!,
      author_id: 'user1',
      author: {
        display_name: 'John Doe',
        avatar_url: undefined
      },
      title: 'Next rehearsal songs selected!',
      content: 'Hey everyone! I\'ve selected the songs for our upcoming rehearsal on Friday. We\'ll be working on "Sweet Child O\' Mine", "Don\'t Stop Believin\'", and "Bohemian Rhapsody". Make sure to practice these before we meet!',
      is_pinned: true,
      is_announcement: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      likes_count: 5,
      comments_count: 3,
      user_has_liked: false
    },
    {
      id: '2',
      band_id: bandId!,
      author_id: 'user2',
      author: {
        display_name: 'Jane Smith',
        avatar_url: undefined
      },
      title: 'Great show last night!',
      content: 'What an amazing performance everyone! The crowd loved us. Special shoutout to our drummer for that epic solo in the middle of "Seven Nation Army". Can\'t wait for our next gig!',
      is_pinned: false,
      is_announcement: false,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      likes_count: 12,
      comments_count: 7,
      user_has_liked: true
    }
  ]

  const isAdmin = userRole === 'admin'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setNewPost(prev => ({ ...prev, [name]: checked }))
    } else {
      setNewPost(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement post creation
    console.log('Creating post:', newPost)
    setNewPost({ title: '', content: '', is_announcement: false, is_pinned: false })
    setShowCreateForm(false)
  }

  const handleLike = async (postId: string) => {
    // TODO: Implement like functionality
    console.log('Toggling like for post:', postId)
  }

  const handleComment = async (postId: string) => {
    if (!newComment.trim()) return
    // TODO: Implement comment creation
    console.log('Adding comment to post:', postId, newComment)
    setNewComment('')
  }

  if (!band) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

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
                <h2 className="text-xl font-semibold mb-4">Create New Post</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={newPost.title}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                      placeholder="What's this post about?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      name="content"
                      value={newPost.content}
                      onChange={handleInputChange}
                      rows={4}
                      className="input-field"
                      required
                      placeholder="Share your thoughts with the band..."
                    />
                  </div>

                  {isAdmin && (
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_announcement"
                          checked={newPost.is_announcement}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mark as announcement</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_pinned"
                          checked={newPost.is_pinned}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Pin to top</span>
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
                      className="btn-primary"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Posts List */}
            {posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.id} className={`card ${post.is_pinned ? 'border-l-4 border-yellow-500 bg-yellow-50' : ''}`}>
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {post.author.avatar_url ? (
                            <img src={post.author.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{post.author.display_name}</h3>
                            {post.is_announcement && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                Announcement
                              </span>
                            )}
                            {post.is_pinned && (
                              <Pin className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="relative">
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h2>
                      <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Post Actions */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center space-x-2 text-sm ${
                              post.user_has_liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-current' : ''}`} />
                            <span>{post.likes_count}</span>
                          </button>
                          <button
                            onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.comments_count}</span>
                          </button>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {selectedPost === post.id && (
                        <div className="border-t pt-4 space-y-4">
                          {/* Add Comment */}
                          <div className="flex space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                rows={2}
                                className="input-field text-sm"
                              />
                              <button
                                onClick={() => handleComment(post.id)}
                                disabled={!newComment.trim()}
                                className="btn-primary text-sm"
                              >
                                Comment
                              </button>
                            </div>
                          </div>

                          {/* Mock Comments */}
                          <div className="space-y-3">
                            <div className="flex space-x-3">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-100 rounded-lg p-3">
                                  <p className="font-semibold text-sm text-gray-900">Mike Johnson</p>
                                  <p className="text-sm text-gray-700">Great song choices! Can't wait to jam on Friday.</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Posts Yet</h3>
                <p className="text-gray-600 mb-6">
                  Start the conversation! Share updates, announcements, or just say hello.
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