import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number | null // Current rating (1-5) or null for no rating
  onRate?: (rating: number | null) => void // Callback when user clicks a star
  readonly?: boolean // If true, stars are not clickable
  size?: 'sm' | 'md' | 'lg' // Size variant
  showValue?: boolean // Show the numeric rating value
  showCount?: boolean // Show the count of ratings
  count?: number // Number of ratings
}

export function StarRating({ 
  rating, 
  onRate, 
  readonly = false, 
  size = 'md', 
  showValue = false,
  showCount = false,
  count = 0 
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const handleStarClick = (starValue: number) => {
    if (readonly || !onRate) return
    
    // If clicking the same star that's already selected, remove the rating
    if (rating === starValue) {
      onRate(null)
    } else {
      onRate(starValue)
    }
  }

  const renderStars = () => {
    const stars = []
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = rating !== null && i <= rating
      const isClickable = !readonly && onRate
      
      stars.push(
        <button
          key={i}
          onClick={() => handleStarClick(i)}
          disabled={readonly || !onRate}
          className={`
            ${sizeClasses[size]} 
            ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
            ${isFilled ? 'text-yellow-400' : 'text-gray-300'}
            transition-all duration-150
            ${isClickable ? 'hover:text-yellow-300' : ''}
          `}
          title={isClickable ? `Rate ${i} star${i === 1 ? '' : 's'}` : undefined}
        >
          <Star 
            className={`w-full h-full ${isFilled ? 'fill-current' : ''}`}
          />
        </button>
      )
    }
    
    return stars
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center space-x-0.5">
        {renderStars()}
      </div>
      
      {showValue && rating !== null && (
        <span className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {showCount && count > 0 && (
        <span className={`text-gray-500 ${textSizeClasses[size]}`}>
          ({count})
        </span>
      )}
    </div>
  )
}