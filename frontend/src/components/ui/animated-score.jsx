import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Determine score type based on point delta
function getScoreType(delta) {
  if (delta === 6) return 'touchdown'
  if (delta === 7) return 'td-pat' // TD + PAT scored together
  if (delta === 3) return 'fieldgoal'
  if (delta === 2) return 'two-point' // Could be safety or 2PT conversion
  if (delta === 1) return 'pat'
  if (delta === 8) return 'td-2pt' // TD + 2PT scored together
  if (delta < 0) return 'correction'
  return 'other'
}

// Get animation class based on score type
function getAnimationClass(scoreType) {
  switch (scoreType) {
    case 'touchdown':
    case 'td-pat':
    case 'td-2pt':
      return 'animate-td-explode'
    case 'fieldgoal':
      return 'animate-fg-arc'
    case 'two-point':
      return 'animate-score-pop'
    case 'pat':
      return 'animate-pat-bump'
    default:
      return 'animate-score-pop'
  }
}

// Get label text for the score type
function getScoreLabel(scoreType, delta) {
  switch (scoreType) {
    case 'touchdown': return 'TD!'
    case 'td-pat': return 'TD + PAT!'
    case 'td-2pt': return 'TD + 2PT!'
    case 'fieldgoal': return 'FG!'
    case 'two-point': return '+2!'
    case 'pat': return 'PAT!'
    case 'correction': return `${delta}`
    default: return delta > 0 ? `+${delta}` : `${delta}`
  }
}

// Get color for the score type
function getScoreColor(scoreType) {
  switch (scoreType) {
    case 'touchdown':
    case 'td-pat':
    case 'td-2pt':
      return { bg: 'rgba(34, 197, 94, 0.4)', text: 'text-green-400', glow: '#22c55e' }
    case 'fieldgoal':
      return { bg: 'rgba(234, 179, 8, 0.4)', text: 'text-yellow-400', glow: '#eab308' }
    case 'two-point':
      return { bg: 'rgba(59, 130, 246, 0.4)', text: 'text-blue-400', glow: '#3b82f6' }
    case 'pat':
      return { bg: 'rgba(59, 130, 246, 0.3)', text: 'text-blue-400', glow: '#3b82f6' }
    case 'correction':
      return { bg: 'rgba(239, 68, 68, 0.3)', text: 'text-red-500', glow: '#ef4444' }
    default:
      return { bg: 'rgba(34, 197, 94, 0.3)', text: 'text-green-500', glow: '#22c55e' }
  }
}

export function AnimatedScore({ 
  score, 
  className = '', 
  color = '',
  size = 'default' // 'sm', 'default', 'lg', 'xl'
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [scoreDelta, setScoreDelta] = useState(null)
  const [scoreType, setScoreType] = useState(null)
  const [showFireworks, setShowFireworks] = useState(false)
  const prevScoreRef = useRef(score)

  useEffect(() => {
    if (prevScoreRef.current !== score) {
      const delta = score - prevScoreRef.current
      const type = getScoreType(delta)
      
      setScoreDelta(delta)
      setScoreType(type)
      setIsAnimating(true)
      
      // Show fireworks for touchdowns
      if (type === 'touchdown' || type === 'td-pat' || type === 'td-2pt') {
        setShowFireworks(true)
        setTimeout(() => setShowFireworks(false), 800)
      }
      
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setScoreDelta(null)
        setScoreType(null)
      }, 1200)
      
      prevScoreRef.current = score
      return () => clearTimeout(timer)
    }
  }, [score])

  const sizeClasses = {
    sm: 'text-2xl',
    default: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-7xl',
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-lg',
    xl: 'text-xl',
  }

  const colors = scoreType ? getScoreColor(scoreType) : null

  return (
    <div className="relative inline-block">
      {/* Firework effects for TDs */}
      {showFireworks && (
        <>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full animate-firework pointer-events-none"
            style={{ backgroundColor: colors?.glow, opacity: 0.6 }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full animate-firework pointer-events-none"
            style={{ backgroundColor: colors?.glow, opacity: 0.4, animationDelay: '0.1s' }}
          />
        </>
      )}
      
      {/* Main score display */}
      <div
        className={cn(
          "font-bold tabular-nums transition-all duration-200",
          sizeClasses[size] || sizeClasses.default,
          isAnimating && scoreType && getAnimationClass(scoreType),
          className
        )}
        style={{ 
          color: color || undefined,
          textShadow: isAnimating && colors ? `0 0 20px ${colors.glow}` : undefined
        }}
      >
        {score}
      </div>
      
      {/* Floating score type label */}
      {scoreDelta !== null && scoreDelta !== 0 && scoreType && (
        <div
          className={cn(
            "absolute -top-2 left-1/2 -translate-x-1/2 font-bold pointer-events-none animate-label-float whitespace-nowrap",
            labelSizeClasses[size] || labelSizeClasses.default,
            colors?.text
          )}
        >
          {getScoreLabel(scoreType, scoreDelta)}
        </div>
      )}
      
      {/* Flash overlay with score-type-specific color */}
      {isAnimating && colors && (
        <div 
          className="absolute inset-0 rounded-lg animate-score-flash pointer-events-none"
          style={{ backgroundColor: colors.bg }}
        />
      )}
    </div>
  )
}

// Simpler version for scoreboards with multiple players
export function ScoreDisplay({ 
  score, 
  previousScore,
  className = '',
  showDelta = true 
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const delta = score - (previousScore ?? score)

  useEffect(() => {
    if (previousScore !== undefined && previousScore !== score) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [score, previousScore])

  return (
    <div className="relative inline-flex items-center gap-2">
      <span
        className={cn(
          "font-bold tabular-nums transition-transform",
          isAnimating && "animate-score-pop",
          className
        )}
      >
        {score}
      </span>
      
      {showDelta && isAnimating && delta !== 0 && (
        <span
          className={cn(
            "text-sm font-semibold animate-score-up",
            delta > 0 ? "text-green-500" : "text-red-500"
          )}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  )
}
