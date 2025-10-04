import { useState } from 'react'
import { Send } from 'lucide-react'
import { useCreateComment } from '@/hooks/useComments'

interface CommentFormProps {
  songId: string
  bandId: string
  parentId?: string | null
  onSuccess?: () => void
  placeholder?: string
  compact?: boolean
}

export function CommentForm({
  songId,
  bandId,
  parentId,
  onSuccess,
  placeholder = 'Add a comment...',
  compact = false
}: CommentFormProps) {
  const [comment, setComment] = useState('')
  const createComment = useCreateComment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    await createComment.mutateAsync({
      songId,
      bandId,
      comment: comment.trim(),
      parentId
    })

    setComment('')
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-2' : 'space-y-3'}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        rows={compact ? 2 : 3}
        disabled={createComment.isPending}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!comment.trim() || createComment.isPending}
          className={`${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Send className={`${compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
          {createComment.isPending ? 'Posting...' : (parentId ? 'Post Reply' : 'Post Comment')}
        </button>
      </div>
    </form>
  )
}
