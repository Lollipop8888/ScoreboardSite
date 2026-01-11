import { Flag } from 'lucide-react'
import { useState, useEffect, Component } from 'react'
import { AnimatedScore } from '@/components/ui/animated-score'

// Error boundary to prevent white screens
class ScoreboardErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Scoreboard render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-semibold">Display Error</p>
          <p className="text-slate-400 text-sm mt-2">Unable to render scoreboard</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function GameScoreboardDisplay({ 
  game, 
  // Display state - can come from local state or parsed from game.display_state
  displayState = {},
  // Local state from controller (LiveGamePage passes these directly)
  possession,
  down,
  distance,
  playClock,
  homeTimeouts,
  awayTimeouts,
  gameStatus,
  showLiveIndicator,
  // Overlay states - use undefined so displayState fallback works
  bigPlay,
  flagDisplayStage,
  displayedPenalties,
  noTeamFlagText,
  flagResult,
  declinedPenaltyIndex,
  reviewDisplayStage,
  reviewReason,
  reviewCallOnField,
  reviewResult,
  scoreCelebration,
  showTouchback,
  showOnsideKick,
  showFirstDown,
  showIncomplete,
  showOutOfBounds,
  showTurnoverOnDowns,
  showTurnover,
  showFumbleRecovery,
  showRedZone,
  showTimeoutDisplay,
  timeoutTeam,
  usedTimeoutIndex,
  timeoutClock,
  specialDistance,
  challengeActive,
  challengeTeam,
  countdown,
  showFGAttempt,
  fgDistance,
  fgResult,
  showPATAttempt,
  patResult,
  showDownOnly,
  hideDownDistance,
  hideTimeouts,
  hideScore,
  showRecords,
  teamRecords,
  displayTitle,
  showDisplayTitle,
  showPlayClock,
  showCustomMessage,
  customMessage,
  customMessageColor,
  kickoffReceiver,
  showKickoffChoice,
  injuryTeam,
  showInjury,
  showCommercial,
  extraInfo,
  hidePossession,
  hideClock,
  displayStats,
  quickStats,
  viewerCount,
}) {
  const homeTeam = game.home_team || { name: 'Home', abbreviation: 'HME', color: '#3B82F6' }
  const awayTeam = game.away_team || { name: 'Away', abbreviation: 'AWY', color: '#6B7280' }

  // Merge displayState values - props take priority, then displayState, then defaults
  bigPlay = bigPlay ?? displayState?.bigPlay ?? null
  flagDisplayStage = flagDisplayStage ?? displayState?.flagDisplayStage ?? 0
  displayedPenalties = displayedPenalties ?? displayState?.displayedPenalties ?? []
  noTeamFlagText = noTeamFlagText ?? displayState?.noTeamFlagText ?? ''
  flagResult = flagResult ?? displayState?.flagResult ?? null
  declinedPenaltyIndex = declinedPenaltyIndex ?? displayState?.declinedPenaltyIndex ?? null
  scoreCelebration = scoreCelebration ?? displayState?.scoreCelebration ?? null
  showTouchback = showTouchback ?? displayState?.showTouchback ?? false
  showOnsideKick = showOnsideKick ?? displayState?.showOnsideKick ?? null
  showFirstDown = showFirstDown ?? displayState?.showFirstDown ?? false
  showIncomplete = showIncomplete ?? displayState?.showIncomplete ?? false
  showOutOfBounds = showOutOfBounds ?? displayState?.showOutOfBounds ?? false
  showTurnoverOnDowns = showTurnoverOnDowns ?? displayState?.showTurnoverOnDowns ?? false
  showTurnover = showTurnover ?? displayState?.showTurnover ?? null
  showFumbleRecovery = showFumbleRecovery ?? displayState?.showFumbleRecovery ?? null
  showRedZone = showRedZone ?? displayState?.showRedZone ?? false
  showTimeoutDisplay = showTimeoutDisplay ?? displayState?.showTimeoutDisplay ?? false
  timeoutTeam = timeoutTeam ?? displayState?.timeoutTeam ?? null
  usedTimeoutIndex = usedTimeoutIndex ?? displayState?.usedTimeoutIndex ?? null
  timeoutClock = timeoutClock ?? displayState?.timeoutClock ?? null
  specialDistance = specialDistance ?? displayState?.specialDistance ?? null
  gameStatus = gameStatus ?? displayState?.gameStatus ?? null
  showLiveIndicator = showLiveIndicator ?? displayState?.showLiveIndicator ?? true
  challengeActive = challengeActive ?? displayState?.challengeActive ?? false
  challengeTeam = challengeTeam ?? displayState?.challengeTeam ?? null
  reviewDisplayStage = reviewDisplayStage ?? displayState?.reviewDisplayStage ?? 0
  reviewReason = reviewReason ?? displayState?.reviewReason ?? ''
  reviewCallOnField = reviewCallOnField ?? displayState?.reviewCallOnField ?? ''
  reviewResult = reviewResult ?? displayState?.reviewResult ?? null
  showFGAttempt = showFGAttempt ?? displayState?.showFGAttempt ?? false
  fgDistance = fgDistance ?? displayState?.fgDistance ?? 30
  fgResult = fgResult ?? displayState?.fgResult ?? null
  showPATAttempt = showPATAttempt ?? displayState?.showPATAttempt ?? null
  patResult = patResult ?? displayState?.patResult ?? null
  showDownOnly = showDownOnly ?? displayState?.showDownOnly ?? false
  // Hide D&D during kickoff
  hideDownDistance = hideDownDistance ?? displayState?.hideDownDistance ?? (gameStatus === 'kickoff')
  hideTimeouts = hideTimeouts ?? displayState?.hideTimeouts ?? false
  hideScore = hideScore ?? displayState?.hideScore ?? false
  showRecords = showRecords ?? displayState?.showRecords ?? false
  teamRecords = teamRecords ?? displayState?.teamRecords ?? { home: null, away: null }
  displayTitle = displayTitle ?? displayState?.displayTitle ?? ''
  showDisplayTitle = showDisplayTitle ?? displayState?.showDisplayTitle ?? false
  showCustomMessage = showCustomMessage ?? displayState?.showCustomMessage ?? false
  customMessage = customMessage ?? displayState?.customMessage ?? ''
  customMessageColor = customMessageColor ?? displayState?.customMessageColor ?? '#6366f1'
  kickoffReceiver = kickoffReceiver ?? displayState?.kickoffReceiver ?? null
  showKickoffChoice = showKickoffChoice ?? displayState?.showKickoffChoice ?? false
  injuryTeam = injuryTeam ?? displayState?.injuryTeam ?? null
  showInjury = showInjury ?? displayState?.showInjury ?? false
  showCommercial = showCommercial ?? displayState?.showCommercial ?? false
  extraInfo = extraInfo ?? displayState?.extraInfo ?? { show: false, side: 'away', lines: [{ text: '', fontSize: 'md' }], bgColor: '#3b82f6', textColor: '#ffffff' }
  showPlayClock = showPlayClock ?? displayState?.showPlayClock ?? true
  hidePossession = hidePossession ?? displayState?.hidePossession ?? false
  hideClock = hideClock ?? displayState?.hideClock ?? false
  displayStats = displayStats ?? displayState?.displayStats ?? { show: false, quarterScores: false, turnovers: false, firstDowns: false, penalties: false, all: false }
  quickStats = quickStats ?? displayState?.quickStats ?? { home: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 }, away: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 } }

  // Delayed D&D space removal - after 3 seconds of being hidden, remove the space entirely
  const [removeDownDistanceSpace, setRemoveDownDistanceSpace] = useState(false)
  
  useEffect(() => {
    if (hideDownDistance) {
      const timer = setTimeout(() => {
        setRemoveDownDistanceSpace(true)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setRemoveDownDistanceSpace(false)
    }
  }, [hideDownDistance])

  // Use game data for state if not provided directly
  // Note: possession can be null (no possession), so only fall back if undefined
  possession = possession !== undefined ? possession : game.possession
  down = down ?? game.down ?? 1
  distance = distance ?? game.distance ?? 10
  playClock = playClock ?? game.play_clock ?? 40
  homeTimeouts = homeTimeouts ?? game.home_timeouts ?? 3
  awayTimeouts = awayTimeouts ?? game.away_timeouts ?? 3

  // Helper to format team record (W-L or W-L-T)
  const formatRecord = (record) => {
    if (!record) return null
    const { wins, losses, ties } = record
    if (ties > 0) {
      return `(${wins}-${losses}-${ties})`
    }
    return `(${wins}-${losses})`
  }

  // Helper to get luminance of a color
  const getLuminance = (hexColor) => {
    if (!hexColor) return 0
    const hex = hexColor.replace('#', '')
    if (hex.length < 6) return 0
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  // Helper to check if a color is too dark (luminance < threshold)
  const isColorTooDark = (hexColor) => {
    if (!hexColor) return true // No color = treat as dark/unusable
    return getLuminance(hexColor) < 0.25
  }

  // Helper to check if a color is too light/white (luminance > threshold)
  const isColorTooLight = (hexColor) => {
    if (!hexColor) return false
    return getLuminance(hexColor) > 0.85
  }

  // Helper to check if a color is usable (not too dark and not too light)
  const isColorUsable = (hexColor) => {
    if (!hexColor) return false
    const lum = getLuminance(hexColor)
    return lum >= 0.25 && lum <= 0.85
  }

  // Get the best color for timeout overlay (use alternate color if primary is too dark or too light)
  const getTimeoutColors = (team) => {
    const primaryColor = team?.color || '#3B82F6'
    const color2 = team?.color2
    const color3 = team?.color3
    
    // Check each color's usability (not too dark, not too light)
    const primaryUsable = isColorUsable(primaryColor)
    const color2Usable = isColorUsable(color2)
    const color3Usable = isColorUsable(color3)
    
    // If primary is not usable (too dark or too light), find an alternative
    if (!primaryUsable) {
      if (color2Usable) {
        return { primary: color2, secondary: color3Usable ? color3 : color2 }
      }
      if (color3Usable) {
        return { primary: color3, secondary: color3 }
      }
      // No usable colors - use a default blue gradient
      return { primary: '#3B82F6', secondary: '#2563EB' }
    }
    
    // Primary is usable - use it with a usable secondary
    const secondary = color2Usable ? color2 : primaryColor
    return { primary: primaryColor, secondary }
  }

  const getDownText = () => {
    const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1]
    
    // If showDownOnly is enabled, just show "2nd DOWN" format (but not for Goal)
    if (showDownOnly && specialDistance !== 'goal') {
      return `${ordinal} DOWN`
    }
    
    let distText = distance
    if (specialDistance === 'goal') distText = 'Goal'
    else if (specialDistance === 'inches') distText = 'Inches'
    return `${ordinal} & ${distText}`
  }

  // Get font size class for extra info
  const getExtraInfoFontSize = (size) => {
    switch (size) {
      case 'xs': return 'text-[10px]'
      case 'sm': return 'text-xs'
      case 'md': return 'text-sm'
      case 'lg': return 'text-base'
      case 'xl': return 'text-lg'
      case '2xl': return 'text-xl'
      default: return 'text-sm'
    }
  }

  return (
    <ScoreboardErrorBoundary>
    <div className="flex flex-col overflow-visible">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl p-6 text-white relative shadow-2xl border border-slate-800/50 overflow-visible">
        {/* Subtle ambient background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Display Title */}
      {showDisplayTitle && displayTitle && (
        <div className="text-center mb-3 -mt-2">
          <p className="text-sm font-bold text-amber-400 uppercase tracking-wider">
            {displayTitle}
          </p>
        </div>
      )}
      
      {/* TOUCHDOWN Celebration Overlay */}
      {scoreCelebration?.type === 'touchdown' && (
        <div 
          className="absolute inset-0 flex items-center justify-center rounded-lg z-20 animate-bounce-in overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${
              scoreCelebration.team === 'home' ? homeTeam.color : awayTeam.color
            } 0%, ${
              scoreCelebration.team === 'home' ? (homeTeam.color2 || homeTeam.color) : (awayTeam.color2 || awayTeam.color)
            } 50%, ${
              scoreCelebration.team === 'home' ? (homeTeam.color3 || homeTeam.color) : (awayTeam.color3 || awayTeam.color)
            } 100%)`,
            boxShadow: `inset 0 0 100px rgba(255,255,255,0.2), 0 0 60px ${scoreCelebration.team === 'home' ? homeTeam.color : awayTeam.color}80`
          }}
        >
          {/* Animated shimmer overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
          {/* Radial glow effect */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              background: `radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 70%)`
            }}
          />
          <div className="text-center px-4 relative z-10">
            <div className="text-6xl mb-3 animate-bounce drop-shadow-lg">🏈</div>
            <p 
              className="text-5xl font-black text-white tracking-wider mb-3 drop-shadow-lg"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4), 0 4px 8px rgba(0,0,0,0.5)',
                animation: 'pulse 1s ease-in-out infinite'
              }}
            >
              TOUCHDOWN!
            </p>
            <div className="flex items-center justify-center gap-3">
              {scoreCelebration.team === 'home' ? (
                homeTeam.logo_url ? (
                  <img src={homeTeam.logo_url} alt="" className="h-12 w-auto max-w-16 object-contain drop-shadow-lg" />
                ) : (
                  <span className="text-xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {homeTeam.abbreviation}
                  </span>
                )
              ) : (
                awayTeam.logo_url ? (
                  <img src={awayTeam.logo_url} alt="" className="h-12 w-auto max-w-16 object-contain drop-shadow-lg" />
                ) : (
                  <span className="text-xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {awayTeam.abbreviation}
                  </span>
                )
              )}
              <span className="text-2xl font-bold text-white drop-shadow-lg">
                {scoreCelebration.team === 'home' ? homeTeam.name : awayTeam.name}
              </span>
            </div>
            {scoreCelebration.yards && (
              <p className="text-xl text-white mt-3 font-bold drop-shadow-lg">
                {scoreCelebration.yards} YD {scoreCelebration.playType?.toUpperCase()}
              </p>
            )}
            <p className="text-lg text-white/90 mt-2 font-semibold drop-shadow">+{scoreCelebration.points} points</p>
          </div>
          {/* Floating celebration emojis */}
          <div className="absolute top-2 left-4 text-4xl animate-bounce drop-shadow-lg">🎉</div>
          <div className="absolute top-4 right-6 text-3xl animate-bounce drop-shadow-lg" style={{ animationDelay: '0.1s' }}>✨</div>
          <div className="absolute bottom-4 left-8 text-3xl animate-bounce drop-shadow-lg" style={{ animationDelay: '0.2s' }}>🎊</div>
          <div className="absolute bottom-2 right-4 text-4xl animate-bounce drop-shadow-lg" style={{ animationDelay: '0.15s' }}>🏆</div>
          <div className="absolute top-1/2 left-2 text-2xl animate-bounce drop-shadow-lg" style={{ animationDelay: '0.25s' }}>⭐</div>
          <div className="absolute top-1/2 right-2 text-2xl animate-bounce drop-shadow-lg" style={{ animationDelay: '0.3s' }}>⭐</div>
        </div>
      )}
      
      {/* FIELD GOAL Celebration Overlay - covers center area only, not logos */}
      {scoreCelebration?.type === 'fieldgoal' && (
        <div 
          className="absolute left-[15%] right-[15%] top-12 bottom-[140px] flex items-center justify-center rounded-2xl z-20 animate-bounce-in overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${
              scoreCelebration.team === 'home' ? homeTeam.color : awayTeam.color
            } 0%, ${
              scoreCelebration.team === 'home' ? (homeTeam.color2 || homeTeam.color) : (awayTeam.color2 || awayTeam.color)
            } 50%, ${
              scoreCelebration.team === 'home' ? (homeTeam.color3 || homeTeam.color) : (awayTeam.color3 || awayTeam.color)
            } 100%)`,
            boxShadow: `inset 0 0 80px rgba(255,255,255,0.2), 0 0 50px ${scoreCelebration.team === 'home' ? homeTeam.color : awayTeam.color}70, 0 8px 32px rgba(0,0,0,0.3)`
          }}
        >
          {/* Animated shimmer overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
          {/* Radial glow effect */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              background: `radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 70%)`
            }}
          />
          {/* Goal post uprights effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-8">
            <div className="w-1.5 h-8 bg-yellow-400/60 rounded-b-full shadow-lg" style={{ boxShadow: '0 0 10px rgba(250,204,21,0.5)' }} />
            <div className="w-1.5 h-8 bg-yellow-400/60 rounded-b-full shadow-lg" style={{ boxShadow: '0 0 10px rgba(250,204,21,0.5)' }} />
          </div>
          <div className="text-center px-4 py-3 relative z-10">
            {/* Football going through uprights animation */}
            <div className="relative mb-2">
              <div className="text-4xl animate-bounce drop-shadow-lg" style={{ animation: 'bounce 0.6s ease-in-out infinite' }}>🏈</div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl opacity-80" style={{ animation: 'pulse 1s ease-in-out infinite' }}>✨</div>
            </div>
            <p 
              className="text-3xl font-black text-white tracking-wider mb-1 drop-shadow-lg uppercase"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4), 0 4px 8px rgba(0,0,0,0.5)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            >
              It's Good!
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              {scoreCelebration.team === 'home' ? (
                homeTeam.logo_url ? (
                  <img src={homeTeam.logo_url} alt="" className="h-8 w-auto max-w-12 object-contain drop-shadow-lg" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {homeTeam.abbreviation}
                  </span>
                )
              ) : (
                awayTeam.logo_url ? (
                  <img src={awayTeam.logo_url} alt="" className="h-8 w-auto max-w-12 object-contain drop-shadow-lg" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {awayTeam.abbreviation}
                  </span>
                )
              )}
              <span className="text-lg font-bold text-white drop-shadow-lg">
                {scoreCelebration.team === 'home' ? homeTeam.name : awayTeam.name}
              </span>
            </div>
            {scoreCelebration.distance && (
              <p className="text-xl text-white font-black drop-shadow-lg" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
                {scoreCelebration.distance} YARD FIELD GOAL
              </p>
            )}
            <p className="text-base text-white/90 font-bold mt-1 drop-shadow">+3 points</p>
          </div>
          {/* Floating celebration elements */}
          <div className="absolute top-2 left-3 text-xl animate-bounce drop-shadow-lg">🎉</div>
          <div className="absolute top-3 right-4 text-lg animate-bounce drop-shadow-lg" style={{ animationDelay: '0.1s' }}>✨</div>
          <div className="absolute bottom-2 left-4 text-lg animate-bounce drop-shadow-lg" style={{ animationDelay: '0.2s' }}>⭐</div>
          <div className="absolute bottom-3 right-3 text-xl animate-bounce drop-shadow-lg" style={{ animationDelay: '0.15s' }}>🎊</div>
          <div className="absolute top-1/2 left-1 text-sm animate-pulse drop-shadow-lg" style={{ animationDelay: '0.25s' }}>✨</div>
          <div className="absolute top-1/2 right-1 text-sm animate-pulse drop-shadow-lg" style={{ animationDelay: '0.3s' }}>✨</div>
        </div>
      )}
      
      {/* SAFETY Celebration Overlay */}
      {scoreCelebration?.type === 'safety' && (
        <div className="absolute inset-x-0 top-0 h-1/2 flex items-center justify-center bg-gradient-to-b from-red-600/95 to-red-700/90 rounded-t-lg z-20 animate-bounce-in">
          <div className="text-center">
            <div className="text-6xl mb-2 animate-pulse">🛡️</div>
            <p className="text-4xl font-black text-white tracking-wider mb-2">SAFETY!</p>
            <div className="flex items-center justify-center gap-3">
              {scoreCelebration.team === 'home' ? (
                homeTeam.logo_url ? (
                  <img src={homeTeam.logo_url} alt="" className="h-10 w-auto max-w-14 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    {homeTeam.abbreviation}
                  </span>
                )
              ) : (
                awayTeam.logo_url ? (
                  <img src={awayTeam.logo_url} alt="" className="h-10 w-auto max-w-14 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    {awayTeam.abbreviation}
                  </span>
                )
              )}
              <span className="text-xl font-bold text-white">
                {scoreCelebration.team === 'home' ? homeTeam.name : awayTeam.name}
              </span>
            </div>
            <p className="text-lg text-red-200 mt-2">+2 Points - Defensive Score</p>
          </div>
        </div>
      )}

      {/* 2PT Conversion Celebration */}
      {scoreCelebration?.type === '2pt' && (
        <div className="absolute inset-x-4 top-4 z-20 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg px-4 py-3 animate-bounce-in">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">✌️</span>
            <span className="text-2xl font-black text-white tracking-wider">2-POINT CONVERSION!</span>
            <span className="text-2xl">✌️</span>
          </div>
        </div>
      )}

      {/* Offsetting Penalties Overlay */}
      {flagResult === 'offsetting' && (
        <div className="absolute inset-x-4 top-4 z-20 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg px-4 py-3 animate-bounce-in">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">⚖️</span>
            <span className="text-2xl font-black text-white tracking-wider">OFFSETTING PENALTIES</span>
            <span className="text-2xl">⚖️</span>
          </div>
          <p className="text-center text-white/90 text-sm mt-1">Replay the down</p>
        </div>
      )}

      {/* Flag Picked Up Overlay */}
      {flagResult === 'picked-up' && (
        <div className="absolute inset-x-4 top-4 z-20 bg-gradient-to-r from-green-600 to-green-500 rounded-lg px-4 py-3 animate-bounce-in">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="text-2xl font-black text-white tracking-wider">FLAG PICKED UP</span>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-center text-white/90 text-sm mt-1">No penalty</p>
        </div>
      )}

      {/* Penalty Declined Overlay */}
      {flagResult === 'declined' && (
        <div className="absolute inset-x-4 top-4 z-20 bg-gradient-to-r from-slate-600 to-slate-500 rounded-lg px-4 py-3 animate-bounce-in">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🚫</span>
            <span className="text-2xl font-black text-white tracking-wider">PENALTY DECLINED</span>
            <span className="text-2xl">🚫</span>
          </div>
        </div>
      )}


      {/* Timeout Overlay - positioned on the outside of the team who called it */}
      {showTimeoutDisplay && timeoutTeam && timeoutClock === null && (() => {
        const team = timeoutTeam === 'home' ? homeTeam : awayTeam
        const colors = getTimeoutColors(team)
        const remainingTimeouts = timeoutTeam === 'home' ? homeTimeouts : awayTimeouts
        // Position: away team = left side (before scoreboard), home team = right side (after scoreboard)
        return null // Rendered in the team sections instead
      })()}



      {/* Red Zone Bar */}
      {showRedZone && (
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-lg px-4 py-2 mb-4 animate-bounce-in ring-2 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-2 relative z-10">
            <span className="text-xl animate-pulse">🔴</span>
            <span className="text-xl font-bold text-white tracking-wider">RED ZONE</span>
            <span className="text-xl animate-pulse">🔴</span>
          </div>
        </div>
      )}

      {/* Injury Overlay */}
      {showInjury && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl animate-pulse">🚑</span>
            <span className="text-2xl font-bold text-white tracking-wider">INJURY TIMEOUT</span>
            <span className="text-2xl animate-pulse">⚕️</span>
          </div>
        </div>
      )}

      {/* Commercial Break Overlay */}
      {showCommercial && (
        <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-slate-500 shadow-[0_0_25px_rgba(100,116,139,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl">📺</span>
            <span className="text-2xl font-bold text-white tracking-wider">COMMERCIAL BREAK</span>
            <span className="text-2xl">📺</span>
          </div>
        </div>
      )}

      {/* Touchback Bar */}
      {showTouchback && (
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl animate-bounce">🏈</span>
            <span className="text-2xl font-bold text-white tracking-wider">TOUCHBACK</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.15s' }}>🏈</span>
          </div>
        </div>
      )}

      {/* Onside Kick Display */}
      {showOnsideKick === 'attempt' && (
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl animate-bounce">🎯</span>
            <span className="text-2xl font-bold text-white tracking-wider animate-pulse">ONSIDE KICK!</span>
            <span className="text-2xl animate-bounce">🎯</span>
          </div>
        </div>
      )}

      {/* Onside Kick - Offense Recovers */}
      {showOnsideKick === 'offense' && (
        <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl animate-bounce">✅</span>
            <span className="text-2xl font-bold text-white tracking-wider">KICKING TEAM RECOVERS!</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🏈</span>
          </div>
        </div>
      )}

      {/* Onside Kick - Defense Recovers */}
      {showOnsideKick === 'defense' && (
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl animate-pulse">❌</span>
            <span className="text-2xl font-bold text-white tracking-wider">RECEIVING TEAM RECOVERS</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🏈</span>
          </div>
        </div>
      )}

      {/* Game Status Overlay Bar */}
      {gameStatus && ['kickoff', 'onside-kick', 'punt', 'injury', 'injury-timeout', 'measurement', 'two-minute', 'weather', 'technical', 'end-quarter', 'halftime-show'].includes(gameStatus) && (
        <div className={`rounded-lg px-4 py-3 mb-4 animate-bounce-in relative overflow-hidden ring-2 ${
          gameStatus === 'kickoff' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
          gameStatus === 'onside-kick' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' :
          gameStatus === 'punt' ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]' :
          gameStatus === 'injury' ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]' :
          gameStatus === 'injury-timeout' ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]' :
          gameStatus === 'measurement' ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]' :
          gameStatus === 'two-minute' ? 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 ring-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.5)]' :
          gameStatus === 'weather' ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 ring-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.5)]' :
          gameStatus === 'end-quarter' ? 'bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 ring-slate-400 shadow-lg' :
          gameStatus === 'halftime-show' ? 'bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]' :
          'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          {/* Radial glow effect */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%)`
            }}
          />
          <div className="flex items-center justify-center gap-3 relative z-10">
            {gameStatus === 'kickoff' && kickoffReceiver ? (
              <>
                <span className="text-2xl animate-bounce">🏈</span>
                <span 
                  className="text-2xl font-bold text-white tracking-wider"
                  style={{ textShadow: '0 0 10px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  KICKOFF TO
                </span>
                {(kickoffReceiver === 'home' ? homeTeam.logo_url : awayTeam.logo_url) ? (
                  <img 
                    src={kickoffReceiver === 'home' ? homeTeam.logo_url : awayTeam.logo_url}
                    alt=""
                    className="h-8 w-auto max-w-12 object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {kickoffReceiver === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
                  </span>
                )}
              </>
            ) : (
              <span 
                className="text-2xl font-bold text-white tracking-wider"
                style={{ textShadow: '0 0 10px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {gameStatus === 'kickoff' && <><span className="animate-bounce inline-block mr-2">🏈</span> KICKOFF</>}
                {gameStatus === 'onside-kick' && <><span className="animate-bounce inline-block mr-2">🎯</span> ONSIDE KICK!</>}
                {gameStatus === 'punt' && <><span className="animate-bounce inline-block mr-2">🦶</span> PUNT</>}
                {gameStatus === 'injury' && (
                  <><span className="animate-pulse inline-block mr-2">🤕</span> INJURY{injuryTeam && ` - ${injuryTeam === 'home' ? homeTeam.name : awayTeam.name}`}</>
                )}
                {gameStatus === 'injury-timeout' && (
                  <><span className="animate-pulse inline-block mr-2">🏥</span> INJURY TIMEOUT{injuryTeam && ` - ${injuryTeam === 'home' ? homeTeam.name : awayTeam.name}`}</>
                )}
                {gameStatus === 'measurement' && <><span className="animate-pulse inline-block mr-2">📏</span> MEASUREMENT</>}
                {gameStatus === 'two-minute' && <><span className="animate-pulse inline-block mr-2">⏱️</span> TWO-MINUTE WARNING</>}
                {gameStatus === 'weather' && <><span className="animate-pulse inline-block mr-2">⛈️</span> WEATHER DELAY</>}
                {gameStatus === 'technical' && <><span className="animate-pulse inline-block mr-2">⚠️</span> TECHNICAL DIFFICULTIES</>}
                {gameStatus === 'end-quarter' && <><span className="inline-block mr-2">🏁</span> END OF QUARTER</>}
                {gameStatus === 'halftime-show' && <><span className="animate-bounce inline-block mr-2">🎭</span> HALFTIME</>}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Custom Message Overlay */}
      {showCustomMessage && customMessage && (
        <div 
          className="rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-white/30 shadow-lg relative overflow-hidden"
          style={{ backgroundColor: customMessageColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center relative z-10">
            <span className="text-2xl font-bold text-white tracking-wider text-center">
              {customMessage.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Kickoff Receiver Overlay */}
      {showKickoffChoice && kickoffReceiver && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <span className="text-2xl">🏈</span>
            {(kickoffReceiver === 'home' ? homeTeam.logo_url : awayTeam.logo_url) ? (
              <img 
                src={kickoffReceiver === 'home' ? homeTeam.logo_url : awayTeam.logo_url}
                alt=""
                className="h-8 w-auto max-w-12 object-contain"
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {kickoffReceiver === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
              </span>
            )}
            <span className="text-xl font-black text-white tracking-wider">TO RECEIVE</span>
            <span className="text-2xl">🏈</span>
          </div>
        </div>
      )}
      
      {/* Live indicator */}
      {showLiveIndicator && game.status === 'live' && (
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-red-400">LIVE</span>
        </div>
      )}
      
      {/* D&D Bar Container - holds both D&D and overlays that cover it */}
      <div className={`relative overflow-hidden rounded-xl transition-all duration-500 ${
        hideDownDistance && removeDownDistanceSpace && !(flagDisplayStage > 0 || reviewDisplayStage > 0 || challengeActive || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break' || showTimeoutDisplay)
          ? 'h-0 mb-0'
          : 'mb-4'
      }`}>
      {/* Flag/Review/Challenge/Big Play/Ad Break/Timeout Overlays - positioned absolutely to cover D&D */}
      {(flagDisplayStage > 0 || reviewDisplayStage > 0 || challengeActive || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break' || showTimeoutDisplay) && (
      <div className="absolute inset-0 z-10">
        {/* Commercial Break Overlay */}
        {gameStatus === 'ad-break' && (
          <div className="rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 ring-2 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className="text-2xl relative z-10">📺</span>
            <span className="text-xl font-black text-white tracking-wider relative z-10">COMMERCIAL BREAK</span>
            <span className="text-2xl relative z-10">📺</span>
          </div>
        )}
        
        {/* Flag Overlay - only show for stages 1 and 2 */}
        {flagDisplayStage > 0 && flagDisplayStage < 3 && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in transition-colors duration-300 relative overflow-hidden ${
            flagResult === 'picked-up' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-2 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
            flagResult === 'offsetting' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-2 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' :
            flagResult === 'declined' ? 'bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 ring-2 ring-slate-400 shadow-lg' :
            'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 ring-2 ring-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.5)]'
          }`}>
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
            <Flag className={`h-6 w-6 relative z-10 ${flagResult ? 'text-white' : 'text-black'} ${!flagResult ? 'animate-bounce' : ''}`} />
            {flagDisplayStage === 1 ? (
              <span className={`text-xl font-black tracking-wider relative z-10 ${flagResult ? 'text-white' : 'text-black'}`}>
                {noTeamFlagText || 'FLAG ON THE PLAY'}
              </span>
            ) : displayedPenalties.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap justify-center relative z-10">
                {displayedPenalties.map((dp, idx) => (
                  <div key={idx} className={`flex items-center gap-2 ${declinedPenaltyIndex === idx ? 'opacity-50 line-through' : ''}`}>
                    {idx > 0 && <span className={flagResult ? 'text-white font-bold' : 'text-black font-bold'}>&</span>}
                    <span className={`text-base font-black tracking-wider ${flagResult ? 'text-white' : 'text-black'}`}>{dp.name?.toUpperCase() || 'FLAG'}</span>
                    <span className={flagResult ? 'text-white' : 'text-black'}>—</span>
                    {dp.teamLogo ? (
                      <img src={dp.teamLogo} alt="" className="h-6 w-auto max-w-10 object-contain" />
                    ) : (
                      <span 
                        className="text-sm font-bold"
                        style={{ color: flagResult ? '#fff' : dp.teamColor }}
                      >
                        {dp.teamAbbreviation}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className={`text-xl font-black tracking-wider relative z-10 ${flagResult ? 'text-white' : 'text-black'}`}>FLAG ON THE PLAY</span>
            )}
            <Flag className={`h-6 w-6 relative z-10 ${flagResult ? 'text-white' : 'text-black'} ${!flagResult ? 'animate-bounce' : ''}`} />
          </div>
        )}
        
        {/* Review Overlay */}
        {reviewDisplayStage > 0 && !challengeActive && (
          <div className={`rounded-xl flex items-center justify-between gap-4 py-2.5 px-5 animate-bounce-in relative overflow-hidden ring-2 ${
            reviewResult === 'upheld' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
            reviewResult === 'reversed' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' :
            'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-2xl">📹</span>
              <span className="text-xl font-black text-white tracking-wider">
                {reviewResult === 'upheld' ? 'RULING STANDS ✓' :
                 reviewResult === 'reversed' ? 'CALL REVERSED ↩️' :
                 'PLAY UNDER REVIEW'}
              </span>
            </div>
            {(reviewReason || reviewCallOnField) && reviewDisplayStage === 2 && (
              <div className="flex items-center gap-4 text-white/90 relative z-10">
                {reviewReason && (
                  <span className="text-sm font-semibold">Reviewing: {reviewReason}</span>
                )}
                {reviewCallOnField && (
                  <span className="text-sm font-medium">Call: {reviewCallOnField}</span>
                )}
              </div>
            )}
            <span className="text-2xl relative z-10">📹</span>
          </div>
        )}
        
        {/* Challenge Overlay - same style as review but with CHALLENGE text */}
        {challengeActive && challengeTeam && (
          <div className={`rounded-xl flex items-center justify-between gap-4 py-2.5 px-5 animate-bounce-in relative overflow-hidden ring-2 ${
            reviewResult === 'upheld' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
            reviewResult === 'reversed' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' :
            'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-2xl">🚩</span>
              <span className="text-xl font-black text-white tracking-wider">
                {reviewResult === 'upheld' ? 'RULING STANDS ✓' :
                 reviewResult === 'reversed' ? 'CALL REVERSED ↩️' :
                 `${challengeTeam === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation} CHALLENGE`}
              </span>
            </div>
            {(reviewReason || reviewCallOnField) && reviewDisplayStage === 2 && (
              <div className="flex items-center gap-4 text-white/90 relative z-10">
                {reviewReason && (
                  <span className="text-sm font-semibold">Challenging: {reviewReason}</span>
                )}
                {reviewCallOnField && (
                  <span className="text-sm font-medium">Call: {reviewCallOnField}</span>
                )}
              </div>
            )}
            <span className="text-2xl relative z-10">🚩</span>
          </div>
        )}
        
        {/* FG Attempt Overlay */}
        {showFGAttempt && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in relative overflow-hidden ring-2 ${
            fgResult === 'good' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
            fgResult === 'no-good' || fgResult === 'blocked' ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]' :
            'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className="text-2xl relative z-10">🥅</span>
            <span className="text-xl font-black text-white tracking-wider relative z-10">{fgDistance} YD FG ATTEMPT</span>
            {fgResult && (
              <span className="text-xl font-black text-white relative z-10">
                {fgResult === 'good' ? '✓ GOOD!' : fgResult === 'blocked' ? '🚫 BLOCKED!' : '✗ NO GOOD!'}
              </span>
            )}
            <span className="text-2xl relative z-10">🥅</span>
          </div>
        )}
        
        {/* PAT/2PT Attempt Overlay */}
        {showPATAttempt && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in relative overflow-hidden ring-2 ${
            patResult === 'good' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
            patResult === 'no-good' ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]' :
            showPATAttempt === 'pat' ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]' : 
            'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className={`text-2xl relative z-10 ${!patResult ? 'animate-bounce' : ''}`}>🏈</span>
            <span 
              key={`pat-text-${patResult}`}
              className={`text-xl font-black text-white tracking-wider relative z-10 ${patResult ? 'animate-fade-in' : ''}`}
            >
              {showPATAttempt === 'pat' ? 'EXTRA POINT' : '2-POINT CONVERSION'}
            </span>
            {patResult && (
              <span 
                key={`pat-result-${patResult}`}
                className={`text-xl font-black relative z-10 animate-fade-in ${
                  patResult === 'good' ? 'text-white' : 'text-white'
                }`}
                style={{
                  textShadow: patResult === 'good' 
                    ? '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(34,197,94,0.6)' 
                    : '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(239,68,68,0.6)'
                }}
              >
                {patResult === 'good' ? '✓ GOOD!' : '✗ NO GOOD!'}
              </span>
            )}
            <span className={`text-2xl relative z-10 ${!patResult ? 'animate-bounce' : ''}`}>🏈</span>
          </div>
        )}
        
        {/* Turnover Overlay */}
        {showTurnover && showTurnover !== 'selecting' && (
          <div className={`rounded-xl flex items-center justify-center gap-2 py-2.5 px-4 animate-bounce-in relative overflow-hidden ring-2 ${
            showTurnover === 'reversed' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' : 
            'bg-gradient-to-r from-red-700 via-red-600 to-red-700 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className="text-xl animate-bounce relative z-10">
              {showTurnover === 'downs' && '🔄'}
              {showTurnover === 'interception' && '🙌'}
              {showTurnover === 'fumble' && '🏈'}
              {showTurnover === 'reversed' && '↩️'}
            </span>
            <span className="text-lg font-bold text-white tracking-wider relative z-10 whitespace-nowrap">
              {showTurnover === 'downs' && 'TURNOVER ON DOWNS'}
              {showTurnover === 'interception' && 'INTERCEPTION'}
              {showTurnover === 'fumble' && 'FUMBLE'}
              {showTurnover === 'reversed' && 'REVERSED'}
            </span>
            <span className="text-xl animate-bounce relative z-10" style={{ animationDelay: '0.15s' }}>
              {showTurnover === 'downs' && '🔄'}
              {showTurnover === 'interception' && '🙌'}
              {showTurnover === 'fumble' && '🏈'}
              {showTurnover === 'reversed' && '↩️'}
            </span>
          </div>
        )}
        
        {/* Big Play Overlay */}
        {bigPlay && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in relative overflow-hidden ring-2 ${
            bigPlay === 'fumble' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' :
            bigPlay === 'interception' ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]' :
            bigPlay === 'sack' ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]' :
            bigPlay === 'blocked-kick' ? 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]' :
            bigPlay === 'safety' ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]' :
            'bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 ring-slate-400 shadow-lg'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className="text-2xl relative z-10 animate-bounce">
              {bigPlay === 'fumble' && '🏈'}
              {bigPlay === 'interception' && '🙌'}
              {bigPlay === 'sack' && '💥'}
              {bigPlay === 'blocked-kick' && '✋'}
              {bigPlay === 'safety' && '🛡️'}
            </span>
            <span className="text-xl font-black text-white tracking-wider uppercase relative z-10">
              {bigPlay === 'fumble' && 'FUMBLE!'}
              {bigPlay === 'interception' && 'INTERCEPTION!'}
              {bigPlay === 'sack' && 'SACK!'}
              {bigPlay === 'blocked-kick' && 'BLOCKED!'}
              {bigPlay === 'safety' && 'SAFETY!'}
            </span>
            <span className="text-2xl relative z-10 animate-bounce" style={{ animationDelay: '0.15s' }}>
              {bigPlay === 'fumble' && '🏈'}
              {bigPlay === 'interception' && '🙌'}
              {bigPlay === 'sack' && '💥'}
              {bigPlay === 'blocked-kick' && '✋'}
              {bigPlay === 'safety' && '🛡️'}
            </span>
          </div>
        )}
        
        {/* Timeout Overlay - Centered in D&D bar area */}
        {showTimeoutDisplay && timeoutTeam && (() => {
          const team = timeoutTeam === 'home' ? homeTeam : awayTeam
          const colors = getTimeoutColors(team)
          const remainingTimeouts = timeoutTeam === 'home' ? homeTimeouts : awayTimeouts
          return (
            <div 
              className="rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in relative overflow-hidden ring-2"
              style={{
                background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
                boxShadow: `0 0 25px ${colors.primary}80`,
                ringColor: colors.primary
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              <span className="text-xl relative z-10">⏱️</span>
              <span className="text-lg font-black text-white tracking-wider relative z-10">
                {team.abbreviation} TIMEOUT
              </span>
              <div className="flex gap-1 relative z-10">
                {[1, 2, 3].map((t) => (
                  <div 
                    key={t}
                    className={`w-3 h-3 rounded-full border border-white ${
                      t <= remainingTimeouts ? 'bg-white' : 'bg-transparent opacity-40'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xl relative z-10">⏱️</span>
            </div>
          )
        })()}
        
      </div>
      )}
      
      {/* Down & Distance Bar - animates collapse/expand horizontally from center */}
      <div 
        className={`transition-all duration-700 ease-in-out ${
          hideDownDistance && !(flagDisplayStage > 0 || reviewDisplayStage > 0 || challengeActive || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break' || showTimeoutDisplay)
            ? removeDownDistanceSpace ? 'hidden' : 'w-0 opacity-0 overflow-hidden h-0 mb-0'
            : 'w-full opacity-100 mb-4'
        }`}
        style={{ margin: '0 auto' }}
      >
        <div className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 transition-all duration-100 backdrop-blur-sm relative overflow-hidden ${
          hideDownDistance 
            ? 'bg-slate-800/60 border border-slate-700/50' 
            : showFirstDown 
              ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 ring-2 ring-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-bounce-in' 
              : showTurnoverOnDowns
                ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 ring-2 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-bounce-in'
                : showFumbleRecovery === 'offense'
                  ? 'bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 ring-2 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)] animate-bounce-in'
                  : showFumbleRecovery === 'defense'
                    ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 ring-2 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-bounce-in'
                    : showFumbleRecovery === 'oob'
                      ? 'bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 ring-2 ring-slate-400 shadow-lg animate-bounce-in'
                      : showIncomplete
                        ? 'bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 ring-2 ring-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.4)] animate-incomplete-shake'
                        : showOutOfBounds
                          ? 'bg-gradient-to-r from-white/20 via-white/30 to-white/20 ring-2 ring-white/50 animate-bounce-in'
                          : down === 4
                            ? 'bg-gradient-to-r from-red-900/40 via-red-800/30 to-red-900/40 border border-red-700/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                            : (down === 3 && distance >= 5)
                              ? 'bg-gradient-to-r from-yellow-700/15 via-amber-600/12 to-yellow-700/15 border border-yellow-600/25'
                              : 'bg-slate-800/60 border border-slate-700/50'
        }`}>
          {/* Animated shimmer effect for special states */}
          {(showFirstDown || showTurnoverOnDowns || showFumbleRecovery || showIncomplete || showOutOfBounds) && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
          )}
          {possession && !showFumbleRecovery && !hidePossession && (
            <>
              <span 
                className="text-xl font-black tracking-tight"
                style={{ 
                  color: possession === 'home' ? homeTeam.color : awayTeam.color,
                  textShadow: '0 0 6px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.6), 0 2px 3px rgba(0,0,0,0.9)',
                  WebkitTextStroke: '1px rgba(255,255,255,0.7)',
                  paintOrder: 'stroke fill'
                }}
              >
                {possession === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
              </span>
              <span className="text-white/60 text-xl">-</span>
            </>
          )}
          <span 
            key={`${down}-${distance}-${specialDistance}-${showFirstDown}-${showTurnoverOnDowns}-${showFumbleRecovery}-${showIncomplete}-${showOutOfBounds}`}
            className={`text-xl font-bold animate-fade-in ${
              showFirstDown ? 'text-yellow-100' 
                : showTurnoverOnDowns ? 'text-red-100' 
                : showFumbleRecovery ? 'text-white' 
                : showIncomplete ? 'text-slate-300' 
                : showOutOfBounds ? 'text-white/80' 
                : specialDistance === 'goal' ? 'bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300 bg-clip-text text-transparent' 
                : 'text-white'
            }`}
            style={specialDistance === 'goal' && !showFirstDown && !showTurnoverOnDowns && !showFumbleRecovery && !showIncomplete && !showOutOfBounds ? {
              textShadow: '0 0 12px rgba(250,204,21,0.8), 0 0 24px rgba(250,204,21,0.4)',
              animation: 'goal-shimmer 2s ease-in-out infinite',
              WebkitBackgroundClip: 'text',
              backgroundSize: '200% 100%'
            } : {}}
          >
            {showFumbleRecovery === 'offense' ? '🏈 RECOVERED BY OFFENSE' : 
             showFumbleRecovery === 'defense' ? '🔄 TURNOVER' : 
             showFumbleRecovery === 'oob' ? '📍 FUMBLE OUT OF BOUNDS' :
             showTurnoverOnDowns ? 'TURNOVER ON DOWNS' : showIncomplete ? 'INCOMPLETE' : showOutOfBounds ? 'OUT OF BOUNDS' : getDownText()}
          </span>
        </div>
      </div>
      </div>
      
      {/* Teams and Scores */}
      <div className="grid grid-cols-3 gap-4 items-center overflow-visible">
        {/* Away Team (Left) - with extra info on left side */}
        <div className="flex items-center gap-2 overflow-visible">
          {/* Extra Info Box - Left of Away Team */}
          {extraInfo?.show && extraInfo?.side === 'away' && extraInfo?.lines?.some(l => l.text) && (
            <div 
              className="w-20 rounded-lg p-2 flex flex-col items-center justify-center text-center animate-slide-up transition-all duration-300 shrink-0"
              style={{ backgroundColor: extraInfo.bgColor }}
            >
              {extraInfo.lines.map((line, index) => (
                line.text && (
                  <p 
                    key={index} 
                    className={`font-bold ${line.fontSize === 'xl' ? 'text-lg' : line.fontSize === 'lg' ? 'text-base' : 'text-sm'}`}
                    style={{ color: line.textColor || extraInfo.textColor }}
                  >
                    {line.text}
                  </p>
                )
              ))}
            </div>
          )}
          <div className="text-center transition-all duration-500 overflow-visible flex-1">
            {awayTeam.logo_url ? (
              <img 
                src={awayTeam.logo_url}
                alt={awayTeam.name}
                className={`w-auto mx-auto object-contain mb-2 transition-all duration-500 ${
                  hideDownDistance ? 'h-24 max-w-32' : 'h-16 max-w-24'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'away') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg' 
                    : (possession === 'away' && !hidePossession) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg' : ''
                }`}
              />
            ) : (
              <div 
                className={`mx-auto flex items-center justify-center mb-2 transition-all duration-500 ${
                  hideDownDistance ? 'w-24 h-24' : 'w-16 h-16'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'away') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg p-2' 
                    : (possession === 'away' && !hidePossession) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg p-2' : ''
                }`}
              >
                <span className={`font-bold transition-all duration-500 ${hideDownDistance ? 'text-4xl' : 'text-2xl'}`} style={{ color: awayTeam.color, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  {awayTeam.abbreviation}
                </span>
              </div>
            )}
            <p className="text-sm font-medium">{awayTeam.name}</p>
            {showRecords && teamRecords?.away && (
              <p className="text-xs text-slate-400 font-medium">{formatRecord(teamRecords.away)}</p>
            )}
            {possession === 'away' && !hidePossession && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
              </div>
            )}
            {!hideScore && (
              <div className="mt-2 py-2 overflow-visible transition-all duration-500">
                <AnimatedScore score={game.away_score} color={awayTeam.color} size={hideDownDistance ? 'xl' : 'lg'} animationDelay={0} />
              </div>
            )}
            {/* Timeouts - shrink/expand animation for hide/show */}
            {game.status !== 'final' && game.quarter !== 'Final' && gameStatus !== 'halftime-show' && game.quarter !== 'Halftime' && (
              <div className={`flex justify-center gap-1.5 mt-2 transition-all duration-300 ease-in-out origin-center ${
                hideTimeouts ? 'scale-0 opacity-0 h-0' : 'scale-100 opacity-100'
              }`}>
                {[1, 2, 3].map((t) => {
                  const isActive = t <= awayTimeouts
                  const isChallenged = challengeActive && challengeTeam === 'away' && t === awayTimeouts
                  const toColor = awayTeam.color3 || awayTeam.color2 || '#fbbf24'
                  return (
                    <div 
                      key={t}
                      className={`h-2 w-6 rounded-full transition-all duration-300 ${
                        isChallenged ? 'animate-pulse' : !isActive ? 'bg-slate-600/50' : ''
                      }`}
                      style={
                        isChallenged 
                          ? { backgroundColor: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(239,68,68,0.4)' }
                          : isActive 
                            ? { backgroundColor: toColor, boxShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3)' }
                            : {}
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center - Clock */}
        <div className="text-center relative">
          {gameStatus === 'pregame' || game.quarter === 'Pregame' ? (
            <div className="py-2">
              <span className="text-4xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-wider drop-shadow-lg">
                PREGAME
              </span>
              <div className="mt-2">
                {countdown && !countdown.passed ? (
                  <div className="text-center">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Kickoff In</span>
                    <div className="flex items-center justify-center gap-1 text-lg font-mono font-bold text-cyan-400">
                      {countdown.days > 0 && <><span>{countdown.days}d</span><span className="text-slate-500">:</span></>}
                      <span>{String(countdown.hours).padStart(2, '0')}</span>
                      <span className="text-slate-500 animate-pulse">:</span>
                      <span>{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className="text-slate-500 animate-pulse">:</span>
                      <span>{String(countdown.seconds).padStart(2, '0')}</span>
                    </div>
                  </div>
                ) : countdown?.passed ? (
                  <span className="text-green-400 text-sm uppercase tracking-wider animate-pulse">Ready to Start!</span>
                ) : (
                  <span className="text-slate-400 text-sm uppercase tracking-wider">Kickoff Soon</span>
                )}
              </div>
            </div>
          ) : gameStatus === 'final' || game.quarter === 'Final' ? (
            <div className="py-2">
              <span className="text-slate-500 text-sm font-semibold block mb-1 uppercase tracking-wider">{game.quarter}</span>
              <span className="text-4xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent tracking-wider drop-shadow-lg">
                FINAL
              </span>
            </div>
          ) : gameStatus === 'halftime-show' || game.quarter === 'Halftime' ? (
            <div className="py-2">
              <span className="text-4xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-wider drop-shadow-lg">
                HALFTIME
              </span>
              <div className="mt-1">
                <span className={`text-2xl font-mono font-bold ${
                  game.game_time === '0:00' 
                    ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse' 
                    : 'text-yellow-400 drop-shadow-glow'
                }`}>{game.game_time}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Timeout clock above game clock with single progress bar */}
              {showTimeoutDisplay && timeoutClock !== null && (() => {
                const team = timeoutTeam === 'home' ? homeTeam : awayTeam
                const maxTimeout = 60 // Assume 60 second timeout max
                const progress = Math.min(100, (timeoutClock / maxTimeout) * 100)
                return (
                  <div className="mb-2 w-full max-w-[180px] mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <span className="text-amber-400 text-lg font-mono font-bold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                        {Math.floor(timeoutClock / 60)}:{(timeoutClock % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="text-amber-500 text-xs uppercase tracking-wider">
                        {timeoutTeam === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation} TO
                      </span>
                    </div>
                    {/* Single continuous progress bar */}
                    <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-600/50">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-linear relative overflow-hidden"
                        style={{ 
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${team.color || '#f59e0b'} 0%, ${team.color2 || team.color || '#fbbf24'} 100%)`,
                          boxShadow: progress > 0 ? `0 0 8px ${team.color || '#f59e0b'}80` : 'none'
                        }}
                      >
                        {/* Shimmer effect */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
                          style={{ backgroundSize: '200% 100%' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}
              <div className={`flex items-center justify-center gap-3 transition-all duration-300 ${hideClock ? 'scale-0 opacity-0 h-0' : 'scale-100 opacity-100'}`}>
                <span className="text-slate-500 text-lg font-bold uppercase tracking-wider">{game.quarter}</span>
                <span className={`text-4xl font-mono font-black tracking-tight ${
                  game.game_time === '0:00' 
                    ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse' 
                    : (['2nd', '4th', 'OT', 'OT1', 'OT2', 'OT3'].includes(game.quarter) && 
                       game.game_time && 
                       (() => {
                         const parts = game.game_time.split(':')
                         const mins = parseInt(parts[0]) || 0
                         return mins < 2
                       })())
                      ? 'text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]'
                      : 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                }`}>{game.game_time}</span>
              </div>
              {/* Play clock - shrink/expand animation for hide/show */}
              <div className={`mt-1.5 transition-all duration-300 ease-in-out origin-center ${
                showPlayClock 
                  ? 'scale-100 opacity-100 max-h-10' 
                  : 'scale-0 opacity-0 max-h-0'
              }`}>
                <span className={`text-xl font-mono font-bold ${playClock <= 5 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`}>
                  {playClock}
                </span>
                <span className="text-slate-600 text-xs ml-1.5 uppercase tracking-wider">Play</span>
              </div>
            </>
          )}
        </div>

        {/* Home Team (Right) - with extra info on right side */}
        <div className="flex items-center gap-2 overflow-visible">
          <div className="text-center transition-all duration-500 overflow-visible flex-1">
            {homeTeam.logo_url ? (
              <img 
                src={homeTeam.logo_url}
                alt={homeTeam.name}
                className={`w-auto mx-auto object-contain mb-2 transition-all duration-500 ${
                  hideDownDistance ? 'h-24 max-w-32' : 'h-16 max-w-24'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'home') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg' 
                    : (possession === 'home' && !hidePossession) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg' : ''
                }`}
              />
            ) : (
              <div 
                className={`mx-auto flex items-center justify-center mb-2 transition-all duration-500 ${
                  hideDownDistance ? 'h-24' : 'h-16'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'home') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg p-2' 
                    : (possession === 'home' && !hidePossession) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg p-2' : ''
                }`}
              >
                <span className={`font-bold transition-all duration-500 ${hideDownDistance ? 'text-4xl' : 'text-2xl'}`} style={{ color: homeTeam.color, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  {homeTeam.abbreviation}
                </span>
              </div>
            )}
            <p className="text-sm font-medium">{homeTeam.name}</p>
            {showRecords && teamRecords?.home && (
              <p className="text-xs text-slate-400 font-medium">{formatRecord(teamRecords.home)}</p>
            )}
            {possession === 'home' && !hidePossession && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
              </div>
            )}
            {!hideScore && (
              <div className="mt-2 py-2 overflow-visible transition-all duration-500">
                <AnimatedScore score={game.home_score} color={homeTeam.color} size={hideDownDistance ? 'xl' : 'lg'} animationDelay={0} />
              </div>
            )}
            {/* Timeouts - shrink/expand animation for hide/show */}
            {game.status !== 'final' && game.quarter !== 'Final' && gameStatus !== 'halftime-show' && game.quarter !== 'Halftime' && (
              <div className={`flex justify-center gap-1.5 mt-2 transition-all duration-300 ease-in-out origin-center ${
                hideTimeouts ? 'scale-0 opacity-0 h-0' : 'scale-100 opacity-100'
              }`}>
                {[1, 2, 3].map((t) => {
                  const isActive = t <= homeTimeouts
                  const isChallenged = challengeActive && challengeTeam === 'home' && t === homeTimeouts
                  const toColor = homeTeam.color3 || homeTeam.color2 || '#fbbf24'
                  return (
                    <div 
                      key={t}
                      className={`h-2 w-6 rounded-full transition-all duration-300 ${
                        isChallenged ? 'animate-pulse' : !isActive ? 'bg-slate-600/50' : ''
                      }`}
                      style={
                        isChallenged 
                          ? { backgroundColor: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(239,68,68,0.4)' }
                          : isActive 
                            ? { backgroundColor: toColor, boxShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3)' }
                            : {}
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
          {/* Extra Info Box - Right of Home Team */}
          {extraInfo?.show && extraInfo?.side === 'home' && extraInfo?.lines?.some(l => l.text) && (
            <div 
              className="w-20 rounded-lg p-2 flex flex-col items-center justify-center text-center animate-slide-up transition-all duration-300 shrink-0"
              style={{ backgroundColor: extraInfo.bgColor }}
            >
              {extraInfo.lines.map((line, index) => (
                line.text && (
                  <p 
                    key={index} 
                    className={`font-bold ${line.fontSize === 'xl' ? 'text-lg' : line.fontSize === 'lg' ? 'text-base' : 'text-sm'}`}
                    style={{ color: line.textColor || extraInfo.textColor }}
                  >
                    {line.text}
                  </p>
                )
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Stats Bottom Bar - integrated display */}
      {displayStats?.show && (displayStats.quarterScores || displayStats.turnovers || displayStats.firstDowns || displayStats.penalties || displayStats.customStats?.length > 0) && (
        <div className="w-full mt-3 bg-slate-800/90 rounded-xl p-3 animate-slide-up">
          {/* Quarter Scores Table */}
          {displayStats.quarterScores && (
            <div className="mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    <th className="text-left py-1.5 pl-2 w-24">Team</th>
                    <th className="text-center w-10">Q1</th>
                    <th className="text-center w-10">Q2</th>
                    <th className="text-center w-10">Q3</th>
                    <th className="text-center w-10">Q4</th>
                    <th className="text-center w-10">OT</th>
                    <th className="text-center w-12 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  <tr className="border-b border-slate-700/50">
                    <td className="py-1.5 pl-2 font-semibold" style={{ color: awayTeam.color }}>{awayTeam.abbreviation}</td>
                    <td className="text-center">{quickStats?.away?.q1 || 0}</td>
                    <td className="text-center">{quickStats?.away?.q2 || 0}</td>
                    <td className="text-center">{quickStats?.away?.q3 || 0}</td>
                    <td className="text-center">{quickStats?.away?.q4 || 0}</td>
                    <td className="text-center">{quickStats?.away?.ot || 0}</td>
                    <td className="text-center font-bold text-lg">{game.away_score}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pl-2 font-semibold" style={{ color: homeTeam.color }}>{homeTeam.abbreviation}</td>
                    <td className="text-center">{quickStats?.home?.q1 || 0}</td>
                    <td className="text-center">{quickStats?.home?.q2 || 0}</td>
                    <td className="text-center">{quickStats?.home?.q3 || 0}</td>
                    <td className="text-center">{quickStats?.home?.q4 || 0}</td>
                    <td className="text-center">{quickStats?.home?.ot || 0}</td>
                    <td className="text-center font-bold text-lg">{game.home_score}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Team Stats - Away on left, stat name in middle, Home on right */}
          {(displayStats.turnovers || displayStats.firstDowns || displayStats.penalties || displayStats.customStats?.length > 0) && (
            <div className={`space-y-1.5 ${displayStats.quarterScores ? 'pt-2 border-t border-slate-700' : ''}`}>
              {displayStats.turnovers && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl font-bold w-12 text-left" style={{ color: awayTeam.color }}>{quickStats?.away?.turnovers || 0}</span>
                  <span className="text-sm font-medium text-slate-300 flex-1 text-center">Turnovers</span>
                  <span className="text-xl font-bold w-12 text-right" style={{ color: homeTeam.color }}>{quickStats?.home?.turnovers || 0}</span>
                </div>
              )}
              {displayStats.firstDowns && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl font-bold w-12 text-left" style={{ color: awayTeam.color }}>{quickStats?.away?.firstDowns || 0}</span>
                  <span className="text-sm font-medium text-slate-300 flex-1 text-center">First Downs</span>
                  <span className="text-xl font-bold w-12 text-right" style={{ color: homeTeam.color }}>{quickStats?.home?.firstDowns || 0}</span>
                </div>
              )}
              {displayStats.penalties && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl font-bold w-16 text-left" style={{ color: awayTeam.color }}>{quickStats?.away?.penalties || 0}-{quickStats?.away?.penaltyYards || 0}</span>
                  <span className="text-sm font-medium text-slate-300 flex-1 text-center">Penalties-Yards</span>
                  <span className="text-xl font-bold w-16 text-right" style={{ color: homeTeam.color }}>{quickStats?.home?.penalties || 0}-{quickStats?.home?.penaltyYards || 0}</span>
                </div>
              )}
              {/* Custom stats */}
              {displayStats.customStats?.map(statId => {
                const stat = quickStats?.custom?.find(s => s.id === statId)
                if (!stat) return null
                return (
                  <div key={statId} className="flex items-center justify-between px-2">
                    <span className="text-xl font-bold w-12 text-left" style={{ color: awayTeam.color }}>{stat.away || 0}</span>
                    <span className="text-sm font-medium text-slate-300 flex-1 text-center">{stat.label}</span>
                    <span className="text-xl font-bold w-12 text-right" style={{ color: homeTeam.color }}>{stat.home || 0}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Extra Info Box - Bottom */}
      {extraInfo?.show && extraInfo?.side === 'bottom' && extraInfo?.lines?.some(l => l.text) && (
        <div 
          className="rounded-lg p-3 flex flex-col items-center justify-center text-center animate-slide-up transition-all duration-300 mt-3"
          style={{ backgroundColor: extraInfo.bgColor }}
        >
          {extraInfo.lines.map((line, index) => (
            line.text && (
              <p 
                key={index} 
                className={`font-bold ${line.fontSize === 'xl' ? 'text-xl' : line.fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
                style={{ color: line.textColor || extraInfo.textColor }}
              >
                {line.text}
              </p>
            )
          ))}
        </div>
      )}

      {/* Viewer Count */}
      {viewerCount > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-400 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>{viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span>
        </div>
      )}
    </div>
    </ScoreboardErrorBoundary>
  )
}
