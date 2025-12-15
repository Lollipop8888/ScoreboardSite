import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Sliding digit component - each digit slides up/down when it changes
function SlidingDigit({ digit, direction = 'up', color, size }) {
  const prevDigitRef = useRef(digit)
  const [animKey, setAnimKey] = useState(0)
  const [slideOut, setSlideOut] = useState(null)
  
  useEffect(() => {
    if (digit !== prevDigitRef.current) {
      setSlideOut({ digit: prevDigitRef.current, dir: direction })
      prevDigitRef.current = digit
      setAnimKey(k => k + 1)
      
      const timer = setTimeout(() => setSlideOut(null), 350)
      return () => clearTimeout(timer)
    }
  }, [digit, direction])
  
  const sizeClasses = {
    sm: 'text-2xl',
    default: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-7xl',
  }
  
  const heightClasses = {
    sm: 'h-8',
    default: 'h-12',
    lg: 'h-16',
    xl: 'h-20',
  }
  
  const textStyle = { 
    color: color || '#ffffff',
    textShadow: `0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.9)`,
    WebkitTextStroke: '1.5px rgba(255,255,255,0.7)',
    paintOrder: 'stroke fill',
  }
  
  return (
    <span 
      className={cn(
        "relative inline-flex items-center justify-center font-bold tabular-nums overflow-hidden",
        sizeClasses[size] || sizeClasses.default,
        heightClasses[size] || heightClasses.default
      )}
      style={{ width: '0.65em' }}
    >
      {/* Sliding out digit */}
      {slideOut && (
        <span
          key={`out-${animKey}`}
          className="absolute inset-0 flex items-center justify-center animate-slide-out"
          style={{
            ...textStyle,
            '--slide-dir': slideOut.dir === 'up' ? '-100%' : '100%',
          }}
        >
          {slideOut.digit}
        </span>
      )}
      
      {/* Current digit - slides in when changed */}
      <span
        key={`in-${animKey}`}
        className={cn(
          "flex items-center justify-center",
          slideOut && "animate-slide-in"
        )}
        style={{
          ...textStyle,
          '--slide-dir': direction === 'up' ? '100%' : '-100%',
        }}
      >
        {digit}
      </span>
    </span>
  )
}

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
  size = 'default', // 'sm', 'default', 'lg', 'xl'
  animationDelay = 0 // Delay in ms before animation starts (useful for TD celebrations)
}) {
  const [animKey, setAnimKey] = useState(0)
  const [oldScore, setOldScore] = useState(score)
  const [displayScore, setDisplayScore] = useState(score)
  const [direction, setDirection] = useState('up')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showDelta, setShowDelta] = useState(false)
  const [delta, setDelta] = useState(0)
  const [pendingScore, setPendingScore] = useState(null)
  const prevScoreRef = useRef(score)

  useEffect(() => {
    if (prevScoreRef.current !== score) {
      const scoreDelta = score - prevScoreRef.current
      const previousScore = prevScoreRef.current
      prevScoreRef.current = score
      
      // Store pending score and keep showing old score during delay
      setPendingScore(score)
      
      // Delay the animation if specified
      const delayTimer = setTimeout(() => {
        setOldScore(previousScore)
        setDirection(scoreDelta > 0 ? 'up' : 'down')
        setDelta(scoreDelta)
        setAnimKey(k => k + 1)
        setIsAnimating(true)
        setShowDelta(true)
        setDisplayScore(score)
        setPendingScore(null)
      }, animationDelay)
      
      // Clear animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, animationDelay + 500)
      
      // Hide delta popup after 1.2 seconds
      const deltaTimer = setTimeout(() => {
        setShowDelta(false)
      }, animationDelay + 1200)
      
      return () => {
        clearTimeout(delayTimer)
        clearTimeout(timer)
        clearTimeout(deltaTimer)
      }
    }
  }, [score, animationDelay])

  const sizeClasses = {
    sm: 'text-3xl',
    default: 'text-5xl',
    lg: 'text-7xl',
    xl: 'text-8xl',
  }
  
  const heightClasses = {
    sm: 'h-10',
    default: 'h-14',
    lg: 'h-20',
    xl: 'h-24',
  }
  
  const deltaSizeClasses = {
    sm: 'text-sm',
    default: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  }

  const textStyle = { 
    color: color || '#ffffff',
    textShadow: `0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.8)`,
    WebkitTextStroke: '1.5px rgba(255,255,255,0.6)',
    paintOrder: 'stroke fill'
  }

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ padding: '16px 24px' }} // Padding for glow visibility (vertical and horizontal)
    >
      {/* Inner container with clip for slide animation - only clip Y axis */}
      <div 
        className={cn(
          "relative inline-flex items-center justify-center overflow-x-visible overflow-y-clip",
          heightClasses[size] || heightClasses.default
        )}
      >
        {/* Old score sliding out - only show during animation */}
        {isAnimating && (
          <span
            key={`out-${animKey}`}
            className={cn(
              "absolute font-bold tabular-nums",
              sizeClasses[size] || sizeClasses.default,
              direction === 'up' ? 'animate-slide-out-up' : 'animate-slide-out-down'
            )}
            style={textStyle}
          >
            {oldScore}
          </span>
        )}
        
        {/* Current score - slides in during animation, static otherwise */}
        <span
          key={`in-${animKey}`}
          className={cn(
            "font-bold tabular-nums",
            sizeClasses[size] || sizeClasses.default,
            isAnimating && (direction === 'up' ? 'animate-slide-in-up' : 'animate-slide-in-down')
          )}
          style={textStyle}
        >
          {displayScore}
        </span>
      </div>
      
      {/* Floating +/- delta popup */}
      {showDelta && delta !== 0 && (
        <span
          key={`delta-${animKey}`}
          className={cn(
            "absolute font-bold animate-label-float pointer-events-none",
            deltaSizeClasses[size] || deltaSizeClasses.default,
            delta > 0 ? 'text-green-400' : 'text-red-400'
          )}
          style={{
            top: '-0.5em',
            right: '-1.5em',
            textShadow: delta > 0 
              ? '0 0 8px rgba(34,197,94,0.8), 0 0 16px rgba(34,197,94,0.4)' 
              : '0 0 8px rgba(239,68,68,0.8), 0 0 16px rgba(239,68,68,0.4)'
          }}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
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
