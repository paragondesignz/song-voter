import { useState } from 'react'
import { MessageCircle, Trash2, Edit2, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useDeleteComment, useUpdateComment, type SongComment } from '@/hooks/useComments'

interface CommentListProps {
  comments: SongComment[]
  songId: string
}

export function CommentList({ comments, songId }: CommentListProps) {
  const { user } = useAuth()
  const deleteComment = useDeleteComment()
  const updateComment = useUpdateComment()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return
    }
    await deleteComment.mutateAsync({ commentId, songId })
  }

  const handleStartEdit = (comment: SongComment) => {
    setEditingId(comment.id)
    setEditText(comment.comment)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return
    await updateComment.mutateAsync({
      commentId,
      songId,
      comment: editText
    })
    setEditingId(null)
    setEditText('')
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-400">No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const isOwner = user?.id === comment.user_id
        const isEditing = editingId === comment.id

        return (
          <div
            key={comment.id}
            className="bg-[var(--color-surface-2)] rounded-lg p-4 border border-[var(--color-border)]"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {comment.user?.avatar_url ? (
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.display_name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-500 text-sm font-medium">
                      {comment.user?.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {comment.user?.display_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    {comment.updated_at !== comment.created_at && ' (edited)'}
                  </p>
                </div>
              </div>

              {isOwner && !isEditing && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStartEdit(comment)}
                    className="text-gray-400 hover:text-primary-400 p-1"
                    title="Edit comment"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-gray-400 hover:text-red-400 p-1"
                    title="Delete comment"
                    disabled={deleteComment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-[var(--color-text)] flex items-center"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(comment.id)}
                    disabled={!editText.trim() || updateComment.isPending}
                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {updateComment.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[var(--color-text)] whitespace-pre-wrap">{comment.comment}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
