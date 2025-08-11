import { Music } from 'lucide-react'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  textOnly?: boolean // Show only text, no icon
}

export function Logo({ size = 'md', showText = true, className = '', textOnly = false }: LogoProps) {
  const iconSizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const textSizeClasses = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl', 
    lg: 'text-3xl'
  }

  if (textOnly) {
    return (
      <span className={`${textSizeClasses[size]} font-semibold text-gray-900 font-sans ${className}`}>
        Rehearsalist
      </span>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Music 
        className={`${iconSizeClasses[size]} text-primary-600 ${showText ? 'mr-2' : ''}`}
      />
      {showText && (
        <span className={`${textSizeClasses[size]} font-semibold text-gray-900 font-sans`}>
          Rehearsalist
        </span>
      )}
    </div>
  )
}