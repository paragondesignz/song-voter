interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  textOnly?: boolean // Show only the logo image from the PNG, no additional text
}

export function Logo({ size = 'md', showText = true, className = '', textOnly = false }: LogoProps) {
  const sizeClasses = {
    xs: 'h-5',
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  }

  const textSizeClasses = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl', 
    lg: 'text-3xl'
  }

  if (textOnly) {
    return (
      <span className={`${textSizeClasses[size]} font-semibold text-gray-900 ${className}`}>
        Song Voter
      </span>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/hands-off-song-voter.png" 
        alt="Song Voter Logo" 
        className={`${sizeClasses[size]} w-auto ${showText ? 'mr-3' : ''}`}
      />
      {showText && (
        <span className={`${textSizeClasses[size]} font-semibold text-gray-900`}>
          Song Voter
        </span>
      )}
    </div>
  )
}