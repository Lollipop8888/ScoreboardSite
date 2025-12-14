import { Flag } from 'lucide-react'
import { AnimatedScore } from '@/components/ui/animated-score'

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
  showPlayClock = true,
  showCustomMessage,
  customMessage,
  customMessageColor,
  kickoffReceiver,
  showKickoffChoice,
  injuryTeam,
  extraInfo,
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
  extraInfo = extraInfo ?? displayState?.extraInfo ?? { show: false, side: 'away', lines: [{ text: '', fontSize: 'md' }], bgColor: '#3b82f6', textColor: '#ffffff' }

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
    <div className="flex items-stretch gap-2 overflow-visible">
      {/* Left Extra Info Box (Away side) */}
      {extraInfo?.show && extraInfo?.side === 'away' && extraInfo?.lines?.some(l => l.text) && (
        <div 
          className="w-32 rounded-xl p-3 flex flex-col items-center justify-center text-center animate-slide-up transition-all duration-300"
          style={{ backgroundColor: extraInfo.bgColor }}
        >
          {extraInfo.lines.map((line, index) => (
            line.text && (
              <p 
                key={index} 
                className={`font-bold ${getExtraInfoFontSize(line.fontSize)}`}
                style={{ color: line.textColor || extraInfo.textColor }}
              >
                {line.text}
              </p>
            )
          ))}
        </div>
      )}
      
      <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl p-6 text-white relative shadow-2xl border border-slate-800/50">
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
            } 100%)`
          }}
        >
          <div className="text-center px-4">
            <div className="text-5xl mb-2 animate-bounce">🏈</div>
            <p className="text-4xl font-black text-white tracking-wider mb-2 animate-pulse drop-shadow-lg">TOUCHDOWN!</p>
            <div className="flex items-center justify-center gap-3">
              {scoreCelebration.team === 'home' ? (
                homeTeam.logo_url ? (
                  <img src={homeTeam.logo_url} alt="" className="h-10 w-auto max-w-14 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {homeTeam.abbreviation}
                  </span>
                )
              ) : (
                awayTeam.logo_url ? (
                  <img src={awayTeam.logo_url} alt="" className="h-10 w-auto max-w-14 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {awayTeam.abbreviation}
                  </span>
                )
              )}
              <span className="text-xl font-bold text-white drop-shadow-lg">
                {scoreCelebration.team === 'home' ? homeTeam.name : awayTeam.name}
              </span>
            </div>
            {scoreCelebration.yards && (
              <p className="text-xl text-white mt-2 font-bold drop-shadow-lg">
                {scoreCelebration.yards} YD {scoreCelebration.playType?.toUpperCase()}
              </p>
            )}
            <p className="text-lg text-white/90 mt-1 font-semibold drop-shadow">+{scoreCelebration.points} points</p>
          </div>
          <div className="absolute top-2 left-4 text-3xl animate-bounce">🎉</div>
          <div className="absolute top-4 right-6 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</div>
          <div className="absolute bottom-4 left-8 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
          <div className="absolute bottom-2 right-4 text-3xl animate-bounce" style={{ animationDelay: '0.15s' }}>🏆</div>
        </div>
      )}
      
      {/* FIELD GOAL Celebration Overlay */}
      {scoreCelebration?.type === 'fieldgoal' && (
        <div 
          className="absolute inset-0 flex items-center justify-center rounded-lg z-20 animate-bounce-in overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${
              scoreCelebration.team === 'home' ? homeTeam.color : awayTeam.color
            } 0%, ${
              scoreCelebration.team === 'home' ? (homeTeam.color2 || homeTeam.color) : (awayTeam.color2 || awayTeam.color)
            } 100%)`
          }}
        >
          <div className="text-center px-4">
            <div className="text-5xl mb-2 animate-pulse">🥅</div>
            <p className="text-4xl font-black text-white tracking-wider mb-2 drop-shadow-lg">FIELD GOAL!</p>
            <div className="flex items-center justify-center gap-3">
              {scoreCelebration.team === 'home' ? (
                homeTeam.logo_url ? (
                  <img src={homeTeam.logo_url} alt="" className="h-10 w-auto max-w-14 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {homeTeam.abbreviation}
                  </span>
                )
              ) : (
                awayTeam.logo_url ? (
                  <img src={awayTeam.logo_url} alt="" className="h-10 w-auto max-w-14 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {awayTeam.abbreviation}
                  </span>
                )
              )}
              <span className="text-xl font-bold text-white drop-shadow-lg">
                {scoreCelebration.team === 'home' ? homeTeam.name : awayTeam.name}
              </span>
            </div>
            {scoreCelebration.distance && (
              <p className="text-xl text-white mt-2 font-bold drop-shadow-lg">
                {scoreCelebration.distance} YARDS
              </p>
            )}
            <p className="text-lg text-white/90 mt-1 font-semibold drop-shadow">+3 points</p>
          </div>
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

      {/* Challenge Overlay */}
      {challengeActive && challengeTeam && (
        <div className="absolute inset-x-4 top-4 z-20 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg px-4 py-3 animate-bounce-in">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🏳️</span>
            {(challengeTeam === 'home' ? homeTeam.logo_url : awayTeam.logo_url) ? (
              <img 
                src={challengeTeam === 'home' ? homeTeam.logo_url : awayTeam.logo_url}
                alt=""
                className="h-8 w-auto max-w-12 object-contain"
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {challengeTeam === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
              </span>
            )}
            <span className="text-xl font-black text-white tracking-wider">CHALLENGE</span>
            <span className="text-2xl">🏳️</span>
          </div>
        </div>
      )}

      {/* Timeout Overlay */}
      {showTimeoutDisplay && timeoutTeam && (() => {
        const team = timeoutTeam === 'home' ? homeTeam : awayTeam
        const colors = getTimeoutColors(team)
        return (
        <div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg animate-bounce-in"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            {(timeoutTeam === 'home' ? homeTeam.logo_url : awayTeam.logo_url) ? (
              <img 
                src={timeoutTeam === 'home' ? homeTeam.logo_url : awayTeam.logo_url}
                alt=""
                className="h-16 w-auto max-w-20 object-contain"
              />
            ) : (
              <span className="text-3xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                {timeoutTeam === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
              </span>
            )}
            <div className="text-center">
              <p className="text-4xl font-black text-white tracking-wider drop-shadow-lg">TIMEOUT</p>
              <p className="text-xl font-semibold text-white/90">
                {timeoutTeam === 'home' ? homeTeam.name : awayTeam.name}
              </p>
            </div>
          </div>
          {/* Amplified Timeout Indicators */}
          <div className="flex justify-center gap-3 mt-2">
            {[1, 2, 3].map((t) => {
              const remainingTimeouts = timeoutTeam === 'home' ? homeTimeouts : awayTimeouts
              const isActive = t <= remainingTimeouts
              return (
                <div 
                  key={t}
                  className={`w-8 h-8 rounded-full border-4 border-white transition-all duration-300 ${
                    isActive 
                      ? 'bg-white shadow-lg shadow-white/50' 
                      : 'bg-transparent opacity-40'
                  }`}
                />
              )
            })}
          </div>
          {/* Timeout Clock */}
          {timeoutClock !== null && (
            <div className="mt-3 bg-black/30 rounded-lg px-6 py-2">
              <p className="text-4xl font-mono font-bold text-white text-center">
                {Math.floor(timeoutClock / 60)}:{(timeoutClock % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
          <p className="text-lg text-white/80 mt-2 font-medium">
            {timeoutTeam === 'home' ? homeTimeouts : awayTimeouts} remaining
          </p>
        </div>
        )
      })()}

      {/* Red Zone Bar */}
      {showRedZone && (
        <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-lg px-4 py-2 mb-4 animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🔴</span>
            <span className="text-xl font-bold text-white tracking-wider">RED ZONE</span>
            <span className="text-xl">🔴</span>
          </div>
        </div>
      )}

      {/* Touchback Bar */}
      {showTouchback && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg px-4 py-3 mb-4 animate-slide-down">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🏈</span>
            <span className="text-2xl font-bold text-white tracking-wider">TOUCHBACK</span>
            <span className="text-2xl">🏈</span>
          </div>
        </div>
      )}

      {/* Onside Kick Display */}
      {showOnsideKick === 'attempt' && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg px-4 py-3 mb-4 animate-slide-down">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎯</span>
            <span className="text-2xl font-bold text-white tracking-wider animate-pulse">ONSIDE KICK!</span>
            <span className="text-2xl">🎯</span>
          </div>
        </div>
      )}

      {/* Onside Kick - Offense Recovers */}
      {showOnsideKick === 'offense' && (
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-lg px-4 py-3 mb-4 animate-slide-down">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="text-2xl font-bold text-white tracking-wider">KICKING TEAM RECOVERS!</span>
            <span className="text-2xl">🏈</span>
          </div>
        </div>
      )}

      {/* Onside Kick - Defense Recovers */}
      {showOnsideKick === 'defense' && (
        <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-lg px-4 py-3 mb-4 animate-slide-down">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">❌</span>
            <span className="text-2xl font-bold text-white tracking-wider">RECEIVING TEAM RECOVERS</span>
            <span className="text-2xl">🏈</span>
          </div>
        </div>
      )}

      {/* Game Status Overlay Bar */}
      {gameStatus && ['kickoff', 'onside-kick', 'punt', 'injury', 'injury-timeout', 'measurement', 'two-minute', 'weather', 'technical', 'end-quarter', 'halftime-show'].includes(gameStatus) && (
        <div className={`rounded-lg px-4 py-3 mb-4 animate-slide-down ${
          gameStatus === 'kickoff' ? 'bg-gradient-to-r from-green-600 to-green-500' :
          gameStatus === 'onside-kick' ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
          gameStatus === 'punt' ? 'bg-gradient-to-r from-amber-600 to-amber-500' :
          gameStatus === 'injury' ? 'bg-gradient-to-r from-red-700 to-red-600' :
          gameStatus === 'injury-timeout' ? 'bg-gradient-to-r from-red-700 to-red-600' :
          gameStatus === 'measurement' ? 'bg-gradient-to-r from-blue-600 to-blue-500' :
          gameStatus === 'two-minute' ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
          gameStatus === 'weather' ? 'bg-gradient-to-r from-sky-600 to-sky-500' :
          gameStatus === 'end-quarter' ? 'bg-gradient-to-r from-slate-600 to-slate-500' :
          gameStatus === 'halftime-show' ? 'bg-gradient-to-r from-indigo-600 to-purple-500' :
          'bg-gradient-to-r from-orange-600 to-orange-500'
        }`}>
          <div className="flex items-center justify-center gap-3">
            {gameStatus === 'kickoff' && kickoffReceiver ? (
              <>
                <span className="text-2xl font-bold text-white tracking-wider">🏈 KICKOFF TO</span>
                {(kickoffReceiver === 'home' ? homeTeam.logo_url : awayTeam.logo_url) ? (
                  <img 
                    src={kickoffReceiver === 'home' ? homeTeam.logo_url : awayTeam.logo_url}
                    alt=""
                    className="h-8 w-auto max-w-12 object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {kickoffReceiver === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
                  </span>
                )}
              </>
            ) : (
              <span className="text-2xl font-bold text-white tracking-wider">
                {gameStatus === 'kickoff' && '🏈 KICKOFF'}
                {gameStatus === 'onside-kick' && '🎯 ONSIDE KICK!'}
                {gameStatus === 'punt' && '🦶 PUNT'}
                {gameStatus === 'injury' && (
                  <>🤕 INJURY{injuryTeam && ` - ${injuryTeam === 'home' ? homeTeam.name : awayTeam.name}`}</>
                )}
                {gameStatus === 'injury-timeout' && (
                  <>🏥 INJURY TIMEOUT{injuryTeam && ` - ${injuryTeam === 'home' ? homeTeam.name : awayTeam.name}`}</>
                )}
                {gameStatus === 'measurement' && '📏 MEASUREMENT'}
                {gameStatus === 'two-minute' && '⏱️ TWO-MINUTE WARNING'}
                {gameStatus === 'weather' && '⛈️ WEATHER DELAY'}
                {gameStatus === 'technical' && '⚠️ TECHNICAL DIFFICULTIES'}
                {gameStatus === 'end-quarter' && '🏁 END OF QUARTER'}
                {gameStatus === 'halftime-show' && '🎭 HALFTIME'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Custom Message Overlay */}
      {showCustomMessage && customMessage && (
        <div 
          className="rounded-lg px-4 py-3 mb-4 animate-bounce-in"
          style={{ backgroundColor: customMessageColor }}
        >
          <div className="flex items-center justify-center">
            <span className="text-2xl font-bold text-white tracking-wider text-center">
              {customMessage.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Kickoff Receiver Overlay */}
      {showKickoffChoice && kickoffReceiver && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
          <div className="flex items-center justify-center gap-3">
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
      <div className="relative mb-4 overflow-hidden rounded-xl">
      {/* Flag/Review/Big Play/Ad Break Overlays - positioned absolutely to cover D&D */}
      {(flagDisplayStage > 0 || reviewDisplayStage > 0 || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break') && (
      <div className="absolute inset-0 z-10">
        {/* Commercial Break Overlay */}
        {gameStatus === 'ad-break' && (
          <div className="rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-slide-down bg-gradient-to-r from-purple-600 to-purple-500">
            <span className="text-2xl">📺</span>
            <span className="text-xl font-black text-white tracking-wider">COMMERCIAL BREAK</span>
            <span className="text-2xl">📺</span>
          </div>
        )}
        
        {/* Flag Overlay - only show for stages 1 and 2 */}
        {flagDisplayStage > 0 && flagDisplayStage < 3 && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-slide-in-left transition-colors duration-300 ${
            flagResult === 'picked-up' ? 'bg-green-500' :
            flagResult === 'offsetting' ? 'bg-orange-500' :
            flagResult === 'declined' ? 'bg-slate-500' :
            'bg-yellow-500'
          }`}>
            <Flag className={`h-6 w-6 ${flagResult ? 'text-white' : 'text-black'}`} />
            {flagDisplayStage === 1 ? (
              <span className={`text-xl font-black tracking-wider ${flagResult ? 'text-white' : 'text-black'}`}>
                {noTeamFlagText || 'FLAG ON THE PLAY'}
              </span>
            ) : displayedPenalties.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap justify-center">
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
              <span className={`text-xl font-black tracking-wider ${flagResult ? 'text-white' : 'text-black'}`}>FLAG ON THE PLAY</span>
            )}
            <Flag className={`h-6 w-6 ${flagResult ? 'text-white' : 'text-black'}`} />
          </div>
        )}
        
        {/* Review Overlay */}
        {reviewDisplayStage > 0 && (
          <div className={`rounded-xl flex items-center justify-between gap-4 py-2.5 px-5 animate-slide-in-left ${
            reviewResult === 'upheld' ? 'bg-green-600' :
            reviewResult === 'reversed' ? 'bg-orange-600' :
            'bg-red-600'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📹</span>
              <span className="text-xl font-black text-white tracking-wider">
                {reviewResult === 'upheld' ? 'RULING STANDS ✓' :
                 reviewResult === 'reversed' ? 'CALL REVERSED ↩️' :
                 'PLAY UNDER REVIEW'}
              </span>
            </div>
            {(reviewReason || reviewCallOnField) && (
              <div className="flex items-center gap-4 text-white/90">
                {reviewReason && (
                  <span className="text-sm font-semibold">Reviewing: {reviewReason}</span>
                )}
                {reviewCallOnField && (
                  <span className="text-sm font-medium">Call: {reviewCallOnField}</span>
                )}
              </div>
            )}
            <span className="text-2xl">📹</span>
          </div>
        )}
        
        {/* FG Attempt Overlay */}
        {showFGAttempt && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-slide-in-left ${
            fgResult === 'good' ? 'bg-green-600' :
            fgResult === 'no-good' || fgResult === 'blocked' ? 'bg-red-600' :
            'bg-amber-500'
          }`}>
            <span className="text-2xl">🥅</span>
            <span className="text-xl font-black text-white tracking-wider">{fgDistance} YD FG ATTEMPT</span>
            {fgResult && (
              <span className="text-xl font-black text-white">
                {fgResult === 'good' ? '✓ GOOD!' : fgResult === 'blocked' ? '🚫 BLOCKED!' : '✗ NO GOOD!'}
              </span>
            )}
            <span className="text-2xl">🥅</span>
          </div>
        )}
        
        {/* PAT/2PT Attempt Overlay */}
        {showPATAttempt && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-slide-in-left ${
            patResult === 'good' ? 'bg-green-600' :
            patResult === 'no-good' ? 'bg-red-600' :
            showPATAttempt === 'pat' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            <span className="text-2xl">🏈</span>
            <span className="text-xl font-black text-white tracking-wider">
              {showPATAttempt === 'pat' ? 'EXTRA POINT' : '2-POINT CONVERSION'}
            </span>
            {patResult && (
              <span className="text-xl font-black text-white">
                {patResult === 'good' ? '✓ GOOD!' : '✗ NO GOOD!'}
              </span>
            )}
            <span className="text-2xl">🏈</span>
          </div>
        )}
        
        {/* Turnover Overlay */}
        {showTurnover && showTurnover !== 'selecting' && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in ${
            showTurnover === 'reversed' ? 'bg-gradient-to-r from-orange-600 to-orange-500' : 'bg-gradient-to-r from-red-700 to-red-600'
          }`}>
            <span className="text-2xl font-bold text-white tracking-wider">
              {showTurnover === 'downs' && '🔄 TURNOVER ON DOWNS 🔄'}
              {showTurnover === 'interception' && '🙌 INTERCEPTION 🙌'}
              {showTurnover === 'fumble' && '🏈 FUMBLE - TURNOVER 🏈'}
              {showTurnover === 'reversed' && '↩️ TURNOVER REVERSED ↩️'}
            </span>
          </div>
        )}
        
        {/* Big Play Overlay */}
        {bigPlay && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-2.5 px-5 animate-bounce-in ${
            bigPlay === 'fumble' ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
            bigPlay === 'interception' ? 'bg-gradient-to-r from-blue-600 to-blue-500' :
            bigPlay === 'sack' ? 'bg-gradient-to-r from-purple-600 to-purple-500' :
            bigPlay === 'blocked-kick' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500' :
            bigPlay === 'safety' ? 'bg-gradient-to-r from-red-700 to-red-600' :
            'bg-gradient-to-r from-slate-600 to-slate-500'
          }`}>
            <span className="text-2xl">
              {bigPlay === 'fumble' && '🏈'}
              {bigPlay === 'interception' && '🙌'}
              {bigPlay === 'sack' && '💥'}
              {bigPlay === 'blocked-kick' && '✋'}
              {bigPlay === 'safety' && '🛡️'}
            </span>
            <span className="text-xl font-black text-white tracking-wider uppercase">
              {bigPlay === 'fumble' && 'FUMBLE!'}
              {bigPlay === 'interception' && 'INTERCEPTION!'}
              {bigPlay === 'sack' && 'SACK!'}
              {bigPlay === 'blocked-kick' && 'BLOCKED!'}
              {bigPlay === 'safety' && 'SAFETY!'}
            </span>
            <span className="text-2xl">
              {bigPlay === 'fumble' && '🏈'}
              {bigPlay === 'interception' && '🙌'}
              {bigPlay === 'sack' && '💥'}
              {bigPlay === 'blocked-kick' && '✋'}
              {bigPlay === 'safety' && '🛡️'}
            </span>
          </div>
        )}
        
      </div>
      )}
      
      {/* Down & Distance Bar - shows underneath overlays, or invisible placeholder when hidden but overlay active */}
      {(!hideDownDistance || (flagDisplayStage > 0 || reviewDisplayStage > 0 || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break')) && (
        <div className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 transition-all duration-500 backdrop-blur-sm ${
          hideDownDistance 
            ? 'bg-slate-800/60 border border-slate-700/50' 
            : showFirstDown 
              ? 'bg-gradient-to-r from-yellow-600/90 to-orange-500/90 ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/20' 
              : showTurnoverOnDowns
                ? 'bg-gradient-to-r from-red-700/90 to-red-600/90 ring-2 ring-red-400 shadow-lg shadow-red-500/20'
                : showFumbleRecovery === 'offense'
                  ? 'bg-gradient-to-r from-green-600/90 to-emerald-500/90 ring-2 ring-green-400 shadow-lg shadow-green-500/20'
                  : showFumbleRecovery === 'defense'
                    ? 'bg-gradient-to-r from-red-600/90 to-orange-500/90 ring-2 ring-red-400 shadow-lg shadow-red-500/20'
                    : showFumbleRecovery === 'oob'
                      ? 'bg-gradient-to-r from-slate-600/90 to-slate-500/90 ring-2 ring-slate-400 shadow-lg shadow-slate-500/20'
                      : showIncomplete
                        ? 'bg-slate-700/80 ring-2 ring-slate-500'
                        : showOutOfBounds
                          ? 'bg-white/15 ring-2 ring-white/40'
                          : 'bg-slate-800/60 border border-slate-700/50'
        }`}>
          {possession && !showFumbleRecovery && (
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
          <span className={`text-xl font-bold transition-colors duration-500 ${
            showFirstDown ? 'text-yellow-100' : showTurnoverOnDowns ? 'text-red-100' : showFumbleRecovery ? 'text-white' : showIncomplete ? 'text-slate-300' : showOutOfBounds ? 'text-white/80' : 'text-white'
          }`}>
            {showFumbleRecovery === 'offense' ? '🏈 RECOVERED BY OFFENSE' : 
             showFumbleRecovery === 'defense' ? '🔄 RECOVERED BY DEFENSE' : 
             showFumbleRecovery === 'oob' ? '📍 FUMBLE OUT OF BOUNDS' :
             showTurnoverOnDowns ? 'TURNOVER ON DOWNS' : showIncomplete ? 'INCOMPLETE' : showOutOfBounds ? 'OUT OF BOUNDS' : getDownText()}
          </span>
        </div>
      )}
      </div>
      
      {/* Teams and Scores */}
      <div className="grid grid-cols-3 gap-4 items-center overflow-visible">
        {/* Away Team (Left) */}
        <div className="text-center transition-all duration-300 overflow-visible">
          {awayTeam.logo_url ? (
            <img 
              src={awayTeam.logo_url}
              alt={awayTeam.name}
              className={`h-16 w-auto max-w-24 mx-auto object-contain mb-2 transition-all duration-300 ${
                flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'away') 
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg' 
                  : possession === 'away' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg' : ''
              }`}
            />
          ) : (
            <div 
              className={`h-16 mx-auto flex items-center justify-center mb-2 transition-all duration-300 ${
                flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'away') 
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg p-2' 
                  : possession === 'away' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg p-2' : ''
              }`}
            >
              <span className="text-2xl font-bold" style={{ color: awayTeam.color, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {awayTeam.abbreviation}
              </span>
            </div>
          )}
          <p className="text-sm font-medium">{awayTeam.name}</p>
          {showRecords && teamRecords?.away && (
            <p className="text-xs text-slate-400 font-medium">{formatRecord(teamRecords.away)}</p>
          )}
          {possession === 'away' && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
            </div>
          )}
          {!hideScore && (
            <div className="mt-2 py-2 overflow-visible">
              <AnimatedScore score={game.away_score} color={awayTeam.color} size="lg" />
            </div>
          )}
          {/* Timeouts - hide when final, halftime, or hideTimeouts is true */}
          {game.status !== 'final' && game.quarter !== 'Final' && gameStatus !== 'halftime-show' && game.quarter !== 'Halftime' && !hideTimeouts && (
            <div className="flex justify-center gap-1.5 mt-2">
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
                <span className="text-yellow-400 text-2xl font-mono font-bold drop-shadow-glow">{game.game_time}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3">
                <span className="text-slate-500 text-lg font-bold uppercase tracking-wider">{game.quarter}</span>
                <span className="text-yellow-400 text-4xl font-mono font-black tracking-tight drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">{game.game_time}</span>
              </div>
              {showPlayClock && (
                <div className="mt-1.5">
                  <span className={`text-xl font-mono font-bold ${playClock <= 5 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`}>
                    {playClock}
                  </span>
                  <span className="text-slate-600 text-xs ml-1.5 uppercase tracking-wider">Play</span>
                </div>
              )}
              {/* Timeout Timer */}
              {showTimeoutDisplay && timeoutClock !== null && (
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="text-amber-400 text-lg font-mono font-bold">
                    {Math.floor(timeoutClock / 60)}:{(timeoutClock % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-amber-500 text-xs uppercase tracking-wider">
                    {timeoutTeam === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation} TO
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Home Team (Right) */}
        <div className="text-center transition-all duration-300 overflow-visible">
          {homeTeam.logo_url ? (
            <img 
              src={homeTeam.logo_url}
              alt={homeTeam.name}
              className={`h-16 w-auto max-w-24 mx-auto object-contain mb-2 transition-all duration-300 ${
                flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'home') 
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg' 
                  : possession === 'home' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg' : ''
              }`}
            />
          ) : (
            <div 
              className={`h-16 mx-auto flex items-center justify-center mb-2 transition-all duration-300 ${
                flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'home') 
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg p-2' 
                  : possession === 'home' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg p-2' : ''
              }`}
            >
              <span className="text-2xl font-bold" style={{ color: homeTeam.color, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {homeTeam.abbreviation}
              </span>
            </div>
          )}
          <p className="text-sm font-medium">{homeTeam.name}</p>
          {showRecords && teamRecords?.home && (
            <p className="text-xs text-slate-400 font-medium">{formatRecord(teamRecords.home)}</p>
          )}
          {possession === 'home' && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
            </div>
          )}
          {!hideScore && (
            <div className="mt-2 py-2 overflow-visible">
              <AnimatedScore score={game.home_score} color={homeTeam.color} size="lg" />
            </div>
          )}
          {/* Timeouts - hide when final, halftime, or hideTimeouts is true */}
          {game.status !== 'final' && game.quarter !== 'Final' && gameStatus !== 'halftime-show' && game.quarter !== 'Halftime' && !hideTimeouts && (
            <div className="flex justify-center gap-1.5 mt-2">
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
      </div>
      </div>
      
      {/* Right Extra Info Box (Home side) */}
      {extraInfo?.show && extraInfo?.side === 'home' && extraInfo?.lines?.some(l => l.text) && (
        <div 
          className="w-32 rounded-xl p-3 flex flex-col items-center justify-center text-center animate-slide-up transition-all duration-300"
          style={{ backgroundColor: extraInfo.bgColor }}
        >
          {extraInfo.lines.map((line, index) => (
            line.text && (
              <p 
                key={index} 
                className={`font-bold ${getExtraInfoFontSize(line.fontSize)}`}
                style={{ color: line.textColor || extraInfo.textColor }}
              >
                {line.text}
              </p>
            )
          ))}
        </div>
      )}
    </div>
  )
}
