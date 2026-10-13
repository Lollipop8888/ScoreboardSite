import { Flag } from 'lucide-react'
import { getOvertimeRules } from '@/lib/overtime'
import { CLOSE_CALLS } from '@/lib/closeCalls'
import { spotLabel, spotToFieldPercent, yardsToGoal as spotYardsToGoal } from '@/lib/fieldPosition'
import { homeWinProbability } from '@/lib/winProbability'
import { useState, useEffect, useRef, Component } from 'react'
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
  show3AndOut,
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
  hidePossessionOutline,
  hideClock,
  displayStats,
  quickStats,
  timeOfPossession,
  showOTRules,
  closeCall,
  extras, // scoring page preview: { scoreboardExtras, driveSummary, scoringRun, ballOn, gameLog }
  viewerCount,
  showCoinToss,
  coinTossData,
}) {
  // Early return if no game data
  if (!game) {
    return (
      <div className="bg-slate-900 rounded-2xl p-6 text-center">
        <p className="text-slate-400">Loading game data...</p>
      </div>
    )
  }
  
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
  show3AndOut = show3AndOut ?? displayState?.show3AndOut ?? false
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
  showCoinToss = showCoinToss ?? displayState?.showCoinToss ?? false
  coinTossData = coinTossData ?? displayState?.coinTossData ?? { winner: null, choice: null }
  hidePossession = hidePossession ?? displayState?.hidePossession ?? false
  hidePossessionOutline = hidePossessionOutline ?? displayState?.hidePossessionOutline ?? false
  hideClock = hideClock ?? displayState?.hideClock ?? false
  displayStats = displayStats ?? displayState?.displayStats ?? { show: false, quarterScores: false, turnovers: false, firstDowns: false, penalties: false, all: false }
  quickStats = quickStats ?? displayState?.quickStats ?? { home: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 }, away: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 } }
  timeOfPossession = timeOfPossession ?? displayState?.timeOfPossession ?? { home: 0, away: 0 }
  showOTRules = showOTRules ?? displayState?.showOTRules ?? false
  closeCall = closeCall ?? displayState?.closeCall ?? null
  // Scoreboard extras (ball spot, drives, scoring summary, runs, sponsors, other scores, venue, theme, size)
  const ex = { ...(displayState || {}), ...(extras || {}) }
  const sbx = ex.scoreboardExtras || {}
  const ballSpot = ex.ballOn ?? game.ball_on ?? 25
  const scoringPlays = (ex.gameLog || []).filter(e => e.type === 'score' && e.points)
  const formatTOP = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const conversions = (team, key) => `${quickStats?.[team]?.[`${key}Conv`] || 0}/${quickStats?.[team]?.[`${key}Att`] || 0}`
  const showTeamStats = displayStats?.turnovers || displayStats?.firstDowns || displayStats?.penalties || displayStats?.thirdDowns || displayStats?.fourthDowns || displayStats?.timeOfPossession || displayStats?.customStats?.length > 0

  // Delayed D&D space removal - after 3 seconds of being hidden, remove the space entirely
  const [removeDownDistanceSpace, setRemoveDownDistanceSpace] = useState(false)

  // Lead change: the new leader's score glows for a few seconds
  const leader = game.home_score > game.away_score ? 'home' : game.away_score > game.home_score ? 'away' : null
  const lastLeaderRef = useRef(leader)
  const [leadGlow, setLeadGlow] = useState(null)
  useEffect(() => {
    const last = lastLeaderRef.current
    lastLeaderRef.current = leader
    if (!leader || leader === last) return
    setLeadGlow(leader)
    const t = setTimeout(() => setLeadGlow(null), 4000)
    return () => clearTimeout(t)
  }, [leader])

  // Sponsors rotate
  const sponsorItems = (sbx.sponsors?.items || []).filter(i => i.text?.trim() || i.imageUrl?.trim())
  const [sponsorIndex, setSponsorIndex] = useState(0)
  useEffect(() => {
    if (!sbx.sponsors?.show || sponsorItems.length < 2) return
    const t = setInterval(() => setSponsorIndex(i => i + 1), (sbx.sponsors.interval || 8) * 1000)
    return () => clearInterval(t)
  }, [sbx.sponsors?.show, sponsorItems.length, sbx.sponsors?.interval])

  // League games (other scores ticker, last meeting), refreshed every minute
  const needLeagueGames = (sbx.showOtherScores || sbx.showPreviousMeeting) && !!game.league_id
  const [leagueGames, setLeagueGames] = useState([])
  useEffect(() => {
    if (!needLeagueGames) { setLeagueGames([]); return }
    let cancelled = false
    const load = () => fetch(`/api/leagues/${game.league_id}/games`).then(r => r.json()).then(all => {
      if (!cancelled && Array.isArray(all)) setLeagueGames(all)
    }).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(t) }
  }, [needLeagueGames, game.league_id])
  const otherGames = sbx.showOtherScores ? leagueGames.filter(g => g.id !== game.id && g.season_id === game.season_id &&
    g.game_unit === game.game_unit && (g.game_unit_type || 1) === (game.game_unit_type || 1)) : []
  // Most recent final between the same two teams before this game
  const lastMeeting = sbx.showPreviousMeeting ? leagueGames
    .filter(g => g.id !== game.id && (g.status === 'final' || g.quarter?.startsWith('Final')) &&
      [g.home_team?.id, g.away_team?.id].sort().join() === [homeTeam.id, awayTeam.id].sort().join() &&
      (!game.scheduled_at || !g.scheduled_at || new Date(g.scheduled_at) < new Date(game.scheduled_at)))
    .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))[0] : null

  // Season context: division rank from the league standings, refreshed every 2 minutes
  const [standings, setStandings] = useState([])
  useEffect(() => {
    if (!sbx.showSeasonContext || !game.league_id) { setStandings([]); return }
    let cancelled = false
    const load = () => fetch(`/api/leagues/${game.league_id}/standings`).then(r => r.json()).then(t => {
      if (!cancelled && Array.isArray(t)) setStandings(t)
    }).catch(() => {})
    load()
    const t = setInterval(load, 120000)
    return () => { cancelled = true; clearInterval(t) }
  }, [sbx.showSeasonContext, game.league_id])
  const seasonContext = (teamId) => {
    const team = standings.find(t => t.id === teamId)
    if (!team?.group_2) return null
    const pct = (t) => { const n = (t.wins || 0) + (t.losses || 0) + (t.ties || 0); return n ? ((t.wins || 0) + (t.ties || 0) * 0.5) / n : 0 }
    const division = standings.filter(t => t.group_1 === team.group_1 && t.group_2 === team.group_2)
      .sort((a, b) => pct(b) - pct(a) || (b.wins || 0) - (a.wins || 0))
    const rank = division.findIndex(t => t.id === teamId) + 1
    const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'
    return `${rank}${suffix} in ${[team.group_1, team.group_2].filter(Boolean).join(' ')}`
  }

  // Pregame: kickoff countdown (viewer pages work it out from the scheduled time) and Pick'em
  const isPregame = gameStatus === 'pregame' || game.quarter === 'Pregame' || game.status === 'scheduled'
  const isFinal = game.status === 'final' || game.quarter?.startsWith('Final') || gameStatus === 'final'
  const [localCountdown, setLocalCountdown] = useState(null)
  useEffect(() => {
    if (countdown || !isPregame || !game.scheduled_at) { setLocalCountdown(null); return }
    const tick = () => {
      const diff = new Date(game.scheduled_at) - new Date()
      if (diff <= 0) { setLocalCountdown({ passed: true }); return }
      setLocalCountdown({
        passed: false,
        days: Math.floor(diff / 86400000),
        hours: Math.floor(diff / 3600000) % 24,
        minutes: Math.floor(diff / 60000) % 60,
        seconds: Math.floor(diff / 1000) % 60,
      })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [countdown, isPregame, game.scheduled_at])
  const kickoffCountdown = countdown || localCountdown
  const [picks, setPicks] = useState(null)
  useEffect(() => {
    if (!game.share_code || !(isPregame || isFinal)) return
    let cancelled = false
    const load = () => fetch(`/api/picks/${game.share_code}`).then(r => r.json()).then(p => {
      if (!cancelled && p && typeof p.total === 'number') setPicks(p)
    }).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [game.share_code, isPregame, isFinal])

  // Commercial break clock (2:00 from when the break started)
  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    if (gameStatus !== 'ad-break') return
    const t = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [gameStatus])
  
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
  
  // Fade-out state management for overlays
  const [fading3AndOut, setFading3AndOut] = useState(false)
  const [visible3AndOut, setVisible3AndOut] = useState(false)
  const [fadingTurnover, setFadingTurnover] = useState(false)
  const [visibleTurnover, setVisibleTurnover] = useState(null)
  const [fadingFirstDown, setFadingFirstDown] = useState(false)
  const [visibleFirstDown, setVisibleFirstDown] = useState(false)
  const [fadingIncomplete, setFadingIncomplete] = useState(false)
  const [visibleIncomplete, setVisibleIncomplete] = useState(false)
  const [fadingOutOfBounds, setFadingOutOfBounds] = useState(false)
  const [visibleOutOfBounds, setVisibleOutOfBounds] = useState(false)
  
  // Handle 3 and out fade
  useEffect(() => {
    if (show3AndOut && !visible3AndOut) {
      setVisible3AndOut(true)
      setFading3AndOut(false)
    } else if (!show3AndOut && visible3AndOut) {
      setFading3AndOut(true)
      const timer = setTimeout(() => {
        setVisible3AndOut(false)
        setFading3AndOut(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [show3AndOut, visible3AndOut])
  
  // Handle turnover fade
  useEffect(() => {
    if (showTurnover && showTurnover !== 'selecting' && visibleTurnover !== showTurnover) {
      setVisibleTurnover(showTurnover)
      setFadingTurnover(false)
    } else if (!showTurnover && visibleTurnover) {
      setFadingTurnover(true)
      const timer = setTimeout(() => {
        setVisibleTurnover(null)
        setFadingTurnover(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showTurnover, visibleTurnover])
  
  // Handle first down fade
  useEffect(() => {
    if (showFirstDown && !visibleFirstDown) {
      setVisibleFirstDown(true)
      setFadingFirstDown(false)
    } else if (!showFirstDown && visibleFirstDown) {
      setFadingFirstDown(true)
      const timer = setTimeout(() => {
        setVisibleFirstDown(false)
        setFadingFirstDown(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showFirstDown, visibleFirstDown])
  
  // Handle incomplete fade
  useEffect(() => {
    if (showIncomplete && !visibleIncomplete) {
      setVisibleIncomplete(true)
      setFadingIncomplete(false)
    } else if (!showIncomplete && visibleIncomplete) {
      setFadingIncomplete(true)
      const timer = setTimeout(() => {
        setVisibleIncomplete(false)
        setFadingIncomplete(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showIncomplete, visibleIncomplete])
  
  // Handle out of bounds fade
  useEffect(() => {
    if (showOutOfBounds && !visibleOutOfBounds) {
      setVisibleOutOfBounds(true)
      setFadingOutOfBounds(false)
    } else if (!showOutOfBounds && visibleOutOfBounds) {
      setFadingOutOfBounds(true)
      const timer = setTimeout(() => {
        setVisibleOutOfBounds(false)
        setFadingOutOfBounds(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showOutOfBounds, visibleOutOfBounds])

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
    <div className={`flex flex-col overflow-visible sb-size-${sbx.size || 'normal'}`}>
      <div
        className={`rounded-xl p-6 relative shadow-2xl overflow-visible ${
          sbx.theme === 'light' ? 'sb-theme-light bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900 border border-slate-200'
          : sbx.theme === 'team' ? 'text-white border border-white/10'
          : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800/50'
        }`}
        style={sbx.theme === 'team' ? { background: `linear-gradient(110deg, ${awayTeam.color}cc 0%, #0f172a 38%, #0f172a 62%, ${homeTeam.color}cc 100%)` } : undefined}
      >
        {/* Subtle ambient background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Pregame hype screen: both teams and the kickoff countdown */}
        {isPregame && kickoffCountdown && !kickoffCountdown.passed && !showCoinToss && (
          <div className="absolute inset-0 z-20 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 px-4 py-5 text-white"
               style={{ background: `linear-gradient(115deg, ${awayTeam.color} 0%, #020617 42%, #020617 58%, ${homeTeam.color} 100%)` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            {showDisplayTitle && displayTitle && <p className="relative text-xs sm:text-sm font-black tracking-[0.2em] text-amber-400 uppercase text-center">{displayTitle}</p>}
            <div className="relative grid grid-cols-3 items-center w-full max-w-xl gap-2">
              {[awayTeam, null, homeTeam].map((team, i) => team ? (
                <div key={team.id || i} className="flex flex-col items-center text-center min-w-0">
                  {team.logo_url
                    ? <img src={team.logo_url} alt="" className="h-16 sm:h-24 w-auto max-w-full object-contain drop-shadow-2xl" />
                    : <span className="text-3xl sm:text-5xl font-black">{team.abbreviation}</span>}
                  <p className="mt-2 text-sm sm:text-lg font-bold truncate max-w-full">{team.name}</p>
                  {teamRecords?.[i === 0 ? 'away' : 'home'] && <p className="text-xs text-white/70">{formatRecord(teamRecords[i === 0 ? 'away' : 'home'])}</p>}
                </div>
              ) : (
                <div key="vs" className="text-center text-2xl sm:text-4xl font-black text-white/80">VS</div>
              ))}
            </div>
            <div className="relative text-center">
              <p className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-cyan-300">KICKOFF IN</p>
              <p className="text-3xl sm:text-5xl font-mono font-black tabular-nums drop-shadow-lg">
                {kickoffCountdown.days > 0 ? `${kickoffCountdown.days}d ` : ''}{String(kickoffCountdown.hours).padStart(2, '0')}:{String(kickoffCountdown.minutes).padStart(2, '0')}:{String(kickoffCountdown.seconds).padStart(2, '0')}
              </p>
            </div>
            {sbx.venue?.show && sbx.venue.text?.trim() && <p className="relative text-xs sm:text-sm text-white/80 text-center">{sbx.venue.text}</p>}
          </div>
        )}

        {/* Display Title */}
      {showDisplayTitle && displayTitle && (
        <div className="text-center mb-3 -mt-2">
          <p className="text-sm font-bold text-amber-400 uppercase tracking-wider">
            {displayTitle}
          </p>
        </div>
      )}

      {/* Venue / weather line */}
      {sbx.venue?.show && sbx.venue.text?.trim() && (
        <p className={`text-center text-xs font-medium text-slate-400 tracking-wide ${showDisplayTitle && displayTitle ? '-mt-2 mb-3' : '-mt-2 mb-3'}`}>{sbx.venue.text}</p>
      )}

      {/* Drive summary when possession changes */}
      {ex.driveSummary && (() => {
        const d = ex.driveSummary
        const team = d.team === 'home' ? homeTeam : awayTeam
        const parts = [`${d.plays} play${d.plays === 1 ? '' : 's'}`]
        if (d.yards !== null && d.yards !== undefined) parts.push(`${d.yards} yd${Math.abs(d.yards) === 1 ? '' : 's'}`)
        parts.push(`${Math.floor(d.seconds / 60)}:${String(d.seconds % 60).padStart(2, '0')}`)
        return (
          <div key={`drive-${d.id}`} className="rounded-lg px-4 py-2.5 mb-4 animate-bounce-in relative overflow-hidden ring-1 ring-white/20 text-white" style={{ background: `linear-gradient(90deg, ${team.color}, ${team.color2 || team.color})` }}>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 relative z-10 text-center">
              <span className="text-xs font-black tracking-[0.2em]">{team.abbreviation} DRIVE</span>
              <span className="text-base font-bold">{parts.join(' · ')}</span>
              {d.result && <span className="text-base font-black uppercase">→ {d.result}</span>}
            </div>
          </div>
        )
      })()}
      
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
      
      {/* FIELD GOAL Celebration Overlay - full scoreboard like the TD overlay, compact so it fits any size */}
      {scoreCelebration?.type === 'fieldgoal' && (() => {
        const team = scoreCelebration.team === 'home' ? homeTeam : awayTeam
        return (
          <div 
            className="absolute inset-0 flex items-center justify-center rounded-lg z-20 animate-bounce-in overflow-hidden"
            style={{
              background: `linear-gradient(145deg, ${team.color} 0%, ${team.color2 || team.color} 55%, ${team.color3 || team.color} 100%)`,
              boxShadow: `inset 0 0 80px rgba(255,255,255,0.15), 0 0 40px ${team.color}70`
            }}
          >
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
            <div className="relative z-10 flex items-center gap-5 px-6">
              {/* Goalpost with the ball sailing through */}
              <div className="relative w-16 h-20 shrink-0" aria-hidden="true">
                <div className="absolute left-1 top-0 bottom-6 w-1.5 rounded-full bg-yellow-300 animate-fg-uprights-glow" />
                <div className="absolute right-1 top-0 bottom-6 w-1.5 rounded-full bg-yellow-300 animate-fg-uprights-glow" />
                <div className="absolute left-1 right-1 bottom-6 h-1.5 rounded-full bg-yellow-300" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1.5 h-6 rounded-full bg-yellow-300" />
                <div className="absolute left-1/2 bottom-0 text-2xl animate-fg-ball-through">🏈</div>
              </div>
              <div className="text-center min-w-0">
                <p 
                  className="text-4xl font-black text-white tracking-wider uppercase leading-none animate-result-stamp"
                  style={{ textShadow: '0 0 20px rgba(255,255,255,0.7), 0 4px 8px rgba(0,0,0,0.5)' }}
                >
                  It's Good!
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="h-7 w-auto max-w-10 object-contain drop-shadow-lg" />
                  ) : null}
                  <span className="text-lg font-bold text-white truncate" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                    {team.name}
                  </span>
                </div>
                <p className="text-base font-bold text-white/90 mt-1 drop-shadow">
                  {scoreCelebration.distance ? `${scoreCelebration.distance} YD FIELD GOAL · ` : ''}+{scoreCelebration.points || 3}
                </p>
              </div>
            </div>
          </div>
        )
      })()}
      
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

      {/* Coin Toss Display */}
      {showCoinToss && coinTossData?.winner && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 rounded-lg px-4 py-4 mb-4 animate-bounce-in ring-2 ring-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.6)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          {/* Coin sparkle effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1 left-4 w-2 h-2 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '1.5s' }} />
            <div className="absolute top-2 right-8 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
            <div className="absolute bottom-2 left-12 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDuration: '1.8s', animationDelay: '0.6s' }} />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-spin" style={{ animationDuration: '0.5s', animationIterationCount: '2' }}>🪙</span>
              <span className="text-2xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 10px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)' }}>
                COIN TOSS
              </span>
              <span className="text-3xl animate-spin" style={{ animationDuration: '0.5s', animationIterationCount: '2', animationDirection: 'reverse' }}>🪙</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {/* Winner team display */}
              {(coinTossData.winner === 'home' ? homeTeam.logo_url : awayTeam.logo_url) ? (
                <img 
                  src={coinTossData.winner === 'home' ? homeTeam.logo_url : awayTeam.logo_url}
                  alt=""
                  className="h-10 w-auto max-w-14 object-contain drop-shadow-lg"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                  style={{ backgroundColor: coinTossData.winner === 'home' ? homeTeam.color : awayTeam.color }}
                >
                  {coinTossData.winner === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation}
                </div>
              )}
              <div className="text-center">
                <div className="text-lg font-bold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {coinTossData.winner === 'home' ? homeTeam.name : awayTeam.name} WINS
                </div>
                {coinTossData.choice && (
                  <div className="text-sm font-semibold text-yellow-100 uppercase tracking-wide">
                    Elects to {coinTossData.choice === 'receive' ? '📥 Receive' : coinTossData.choice === 'kick' ? '🦵 Kick' : '⏳ Defer'}
                  </div>
                )}
              </div>
            </div>
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

      {/* Close Call - the question while it's being decided, then the ruling */}
      {closeCall && CLOSE_CALLS[closeCall.type] && (() => {
        const call = CLOSE_CALLS[closeCall.type]
        const decided = closeCall.result === 'yes' || closeCall.result === 'no'
        return (
          <div
            key={`close-call-${closeCall.type}-${closeCall.result || 'open'}`}
            className={`rounded-lg px-4 py-3 mb-4 animate-bounce-in relative overflow-hidden ring-2 ${
              !decided ? 'bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-700 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]' :
              closeCall.result === 'yes' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)]' :
              'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <div className="flex items-center justify-center gap-3 relative z-10">
              {decided ? (
                <span className="text-2xl font-black text-white tracking-wider uppercase animate-result-stamp" style={{ textShadow: '0 0 10px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)' }}>
                  {closeCall.result === 'yes' ? `✓ ${call.yes}` : `✗ ${call.no}`}
                </span>
              ) : (
                <>
                  <span className="text-xs font-black tracking-[0.2em] text-cyan-100">CLOSE CALL</span>
                  <span className="text-2xl font-black text-white tracking-wider uppercase animate-pulse" style={{ textShadow: '0 0 10px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)' }}>
                    {call.question}
                  </span>
                </>
              )}
            </div>
          </div>
        )
      })()}

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
                {gameStatus === 'end-quarter' && (
                  game.quarter === 'Q4' && game.home_score === game.away_score 
                    ? <><span className="inline-block mr-2">🏁</span> END OF REGULATION</>
                    : <><span className="inline-block mr-2">🏁</span> END OF QUARTER</>
                )}
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
      <div className={`relative rounded-xl transition-all duration-500 ${
        hideDownDistance && removeDownDistanceSpace && !(flagDisplayStage > 0 || reviewDisplayStage > 0 || challengeActive || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break' || showTimeoutDisplay)
          ? 'h-0 mb-0 overflow-hidden'
          : 'mb-4'
      }`}>
      {/* Flag/Review/Challenge/Big Play/Ad Break/Timeout Overlays - positioned to cover D&D */}
      {(flagDisplayStage > 0 || reviewDisplayStage > 0 || challengeActive || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break' || showTimeoutDisplay) && (
      <div className="relative z-10">
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
        {showFGAttempt && scoreCelebration?.type !== 'fieldgoal' && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-3 px-5 relative overflow-hidden ring-2 ${
            fgResult === 'good' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_40px_rgba(34,197,94,0.7)] animate-glow-pulse' :
            fgResult === 'doink' ? 'bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 ring-pink-400 shadow-[0_0_40px_rgba(236,72,153,0.7)] animate-fg-no-good-shake' :
            fgResult === 'no-good' || fgResult === 'blocked' ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_40px_rgba(239,68,68,0.7)] animate-fg-no-good-shake' :
            'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-bounce-in'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            
            {/* Left upright */}
            <div className={`w-1 h-10 rounded ${fgResult === 'good' ? 'bg-yellow-300 animate-fg-uprights-glow' : fgResult === 'doink' ? 'bg-pink-300 animate-pulse' : fgResult ? 'bg-gray-400' : 'bg-yellow-400'}`} />
            
            {/* Center content */}
            <div className="flex flex-col items-center relative z-10">
              <span 
                key={`fg-text-${fgResult}`}
                className={`text-xl font-black text-white tracking-wider ${fgResult ? 'animate-fade-in' : ''}`}
              >
                {fgDistance} YD FIELD GOAL
              </span>
              
              {/* Result stamp */}
              {fgResult && (
                <span 
                  key={`fg-result-${fgResult}`}
                  className="text-2xl font-black animate-result-stamp text-white"
                  style={{
                    textShadow: fgResult === 'good' 
                      ? '0 0 15px rgba(34,197,94,1), 0 0 30px rgba(34,197,94,0.8)' 
                      : fgResult === 'doink'
                      ? '0 0 15px rgba(236,72,153,1), 0 0 30px rgba(236,72,153,0.8)'
                      : '0 0 15px rgba(239,68,68,1), 0 0 30px rgba(239,68,68,0.8)'
                  }}
                >
                  {fgResult === 'good' ? '✓ GOOD!' : fgResult === 'doink' ? '🎯 DOINK!' : fgResult === 'blocked' ? '🚫 BLOCKED!' : '✗ NO GOOD!'}
                </span>
              )}
            </div>
            
            {/* Right upright */}
            <div className={`w-1 h-10 rounded ${fgResult === 'good' ? 'bg-yellow-300 animate-fg-uprights-glow' : fgResult === 'doink' ? 'bg-pink-300 animate-pulse' : fgResult ? 'bg-gray-400' : 'bg-yellow-400'}`} />
          </div>
        )}
        
        {/* PAT/2PT Attempt Overlay */}
        {showPATAttempt && (
          <div className={`rounded-xl flex items-center justify-center gap-3 py-3 px-5 relative overflow-hidden ring-2 ${
            patResult === 'good' ? 'bg-gradient-to-r from-green-600 via-green-500 to-green-600 ring-green-400 shadow-[0_0_40px_rgba(34,197,94,0.7)] animate-glow-pulse' :
            patResult === 'doink' ? 'bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 ring-pink-400 shadow-[0_0_40px_rgba(236,72,153,0.7)] animate-fg-no-good-shake' :
            patResult === 'no-good' || patResult === 'blocked' ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 ring-red-400 shadow-[0_0_40px_rgba(239,68,68,0.7)] animate-fg-no-good-shake' :
            patResult === 'blocked-return' ? 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600 ring-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.7)]' :
            showPATAttempt === 'pat' ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)] animate-bounce-in' : 
            'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)] animate-bounce-in'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            
            {/* Left upright (PAT only) */}
            {showPATAttempt === 'pat' && (
              <div className={`w-1 h-10 rounded ${patResult === 'good' ? 'bg-yellow-300 animate-fg-uprights-glow' : patResult === 'doink' ? 'bg-pink-300 animate-pulse' : patResult ? 'bg-gray-400' : 'bg-yellow-400'}`} />
            )}
            
            {/* 2PT left icon */}
            {showPATAttempt === '2pt' && (
              <span className={`text-2xl ${!patResult ? 'animate-bounce' : ''}`}>🏃</span>
            )}
            
            {/* Center content */}
            <div className="flex flex-col items-center relative z-10">
              <span 
                key={`pat-text-${patResult}`}
                className={`text-xl font-black text-white tracking-wider ${patResult ? 'animate-fade-in' : ''}`}
              >
                {showPATAttempt === 'pat' ? 'EXTRA POINT' : '2-POINT CONVERSION'}
              </span>
              
              {/* Result stamp */}
              {patResult && (
                <span 
                  key={`pat-result-${patResult}`}
                  className="text-2xl font-black animate-result-stamp text-white"
                  style={{
                    textShadow: patResult === 'good' 
                      ? '0 0 15px rgba(34,197,94,1), 0 0 30px rgba(34,197,94,0.8)' 
                      : patResult === 'doink'
                      ? '0 0 15px rgba(236,72,153,1), 0 0 30px rgba(236,72,153,0.8)'
                      : patResult === 'blocked-return'
                      ? '0 0 15px rgba(6,182,212,1), 0 0 30px rgba(6,182,212,0.8)'
                      : '0 0 15px rgba(239,68,68,1), 0 0 30px rgba(239,68,68,0.8)'
                  }}
                >
                  {patResult === 'good' ? '✓ GOOD!' : 
                   patResult === 'doink' ? '🎯 DOINK!' :
                   patResult === 'blocked' ? '🚫 BLOCKED!' :
                   patResult === 'blocked-return' ? (showPATAttempt === 'pat' ? '🏈 PICK 6!' : '🏈 PICK 2!') :
                   '✗ NO GOOD!'}
                </span>
              )}
            </div>
            
            {/* Right upright (PAT only) */}
            {showPATAttempt === 'pat' && (
              <div className={`w-1 h-10 rounded ${patResult === 'good' ? 'bg-yellow-300 animate-fg-uprights-glow' : patResult === 'doink' ? 'bg-pink-300 animate-pulse' : patResult ? 'bg-gray-400' : 'bg-yellow-400'}`} />
            )}
            
            {/* 2PT right icon */}
            {showPATAttempt === '2pt' && (
              <span className="text-2xl">🥅</span>
            )}
          </div>
        )}
        
        {/* 3 and Out Overlay */}
        {visible3AndOut && (
          <div className={`rounded-xl flex items-center justify-center gap-2 py-2.5 px-4 relative overflow-hidden ring-2 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)] ${fading3AndOut ? 'animate-fade-out' : 'animate-bounce-in'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className="text-xl animate-bounce relative z-10">3</span>
            <span className="text-lg font-bold text-white tracking-wider relative z-10 whitespace-nowrap">AND OUT</span>
            <span className="text-xl animate-bounce relative z-10" style={{ animationDelay: '0.15s' }}>🦶</span>
          </div>
        )}
        
        {/* Turnover Overlay */}
        {visibleTurnover && visibleTurnover !== 'selecting' && (
          <div className={`rounded-xl flex items-center justify-center gap-2 py-2.5 px-4 relative overflow-hidden ring-2 ${fadingTurnover ? 'animate-fade-out' : 'animate-bounce-in'} ${
            visibleTurnover === 'reversed' ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)]' : 
            'bg-gradient-to-r from-red-700 via-red-600 to-red-700 ring-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <span className="text-xl animate-bounce relative z-10">
              {visibleTurnover === 'downs' && '🔄'}
              {visibleTurnover === 'interception' && '🙌'}
              {visibleTurnover === 'fumble' && '🏈'}
              {visibleTurnover === 'reversed' && '↩️'}
            </span>
            <span className="text-lg font-bold text-white tracking-wider relative z-10 whitespace-nowrap">
              {visibleTurnover === 'downs' && 'TURNOVER ON DOWNS'}
              {visibleTurnover === 'interception' && 'INTERCEPTION'}
              {visibleTurnover === 'fumble' && 'FUMBLE'}
              {visibleTurnover === 'reversed' && 'REVERSED'}
            </span>
            <span className="text-xl animate-bounce relative z-10" style={{ animationDelay: '0.15s' }}>
              {visibleTurnover === 'downs' && '🔄'}
              {visibleTurnover === 'interception' && '🙌'}
              {visibleTurnover === 'fumble' && '🏈'}
              {visibleTurnover === 'reversed' && '↩️'}
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
      {/* Hide when overlay is showing */}
      {!(flagDisplayStage > 0 || reviewDisplayStage > 0 || challengeActive || showFGAttempt || showPATAttempt || (showTurnover && showTurnover !== 'selecting') || bigPlay || gameStatus === 'ad-break' || showTimeoutDisplay) && (
      <div 
        className={`transition-all duration-700 ease-in-out ${
          hideDownDistance
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
            key={`${down}-${showDownOnly ? 'downonly' : distance}-${specialDistance}-${showFirstDown}-${showTurnoverOnDowns}-${showFumbleRecovery}-${showIncomplete}-${showOutOfBounds}`}
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
      )}
      </div>
      
      {/* Ball spot and field strip */}
      {sbx.showBallSpot && (possession === 'home' || possession === 'away') && !hideDownDistance && (() => {
        const offense = possession === 'home' ? homeTeam : awayTeam
        const dir = possession === 'home' ? 1 : -1
        const lineToGain = specialDistance === 'goal' ? null : Math.min(100, Math.max(0, ballSpot + dir * (distance || 10)))
        const toGoal = spotYardsToGoal(ballSpot, possession)
        const redZone = sbx.showRedZoneAuto && toGoal <= 20
        const goalLine = redZone && (toGoal <= 5 || specialDistance === 'goal')
        return (
          <div className="mb-4 -mt-2">
            <p className="text-center text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-center gap-2 flex-wrap">
              <span>{offense.abbreviation} ball on <span className="text-sm font-bold sb-spot">{spotLabel(ballSpot, homeTeam.abbreviation, awayTeam.abbreviation)}</span></span>
              {redZone && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white bg-red-600 ${goalLine ? 'animate-pulse' : ''}`}>
                  {goalLine ? 'GOAL LINE' : 'RED ZONE'}
                </span>
              )}
            </p>
            <div className={`flex h-5 rounded-md overflow-hidden ${redZone ? `ring-2 ring-red-500 shadow-[0_0_14px_rgba(239,68,68,0.6)] ${goalLine ? 'animate-pulse' : ''}` : 'ring-1 ring-white/10'}`}>
              <div className="w-[8%] flex items-center justify-center text-[9px] font-black text-white/90" style={{ backgroundColor: awayTeam.color }}>{awayTeam.abbreviation}</div>
              <div className={`relative flex-1 bg-gradient-to-b ${redZone ? 'from-red-700 to-red-900' : 'from-green-700 to-green-800'}`}>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(y => (
                  <div key={y} className={`absolute top-0 bottom-0 w-px ${y === 50 ? 'bg-white/50' : 'bg-white/20'}`} style={{ left: `${y}%` }} />
                ))}
                {lineToGain !== null && (
                  <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" style={{ left: `${spotToFieldPercent(lineToGain)}%` }} />
                )}
                <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" style={{ left: `${spotToFieldPercent(ballSpot)}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[11px] leading-none" style={{ left: `${spotToFieldPercent(ballSpot)}%` }}>🏈</div>
              </div>
              <div className="w-[8%] flex items-center justify-center text-[9px] font-black text-white/90" style={{ backgroundColor: homeTeam.color }}>{homeTeam.abbreviation}</div>
            </div>
          </div>
        )
      })()}

      {/* Teams and Scores */}
      <div className="grid grid-cols-3 gap-1 sm:gap-4 items-center overflow-visible [&>*]:min-w-0">
        {/* Away Team (Left) - with extra info on left side */}
        <div className="flex items-center gap-2 overflow-visible">
          {/* Extra Info Box - Left of Away Team */}
          {extraInfo?.show && extraInfo?.side === 'away' && extraInfo?.lines?.some(l => l.text) && (
            <div 
              className="w-24 rounded-lg p-2.5 flex flex-col items-center justify-center text-center animate-slide-up transition-all duration-300 shrink-0"
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
                  hideDownDistance ? 'h-16 max-w-20 sm:h-24 sm:max-w-32' : 'h-12 max-w-16 sm:h-16 sm:max-w-24'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'away') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg' 
                    : (possession === 'away' && !hidePossession && !hidePossessionOutline) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg' : ''
                }`}
              />
            ) : (
              <div 
                className={`mx-auto flex items-center justify-center mb-2 transition-all duration-500 ${
                  hideDownDistance ? 'w-16 h-16 sm:w-24 sm:h-24' : 'w-12 h-12 sm:w-16 sm:h-16'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'away') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg p-2' 
                    : (possession === 'away' && !hidePossession && !hidePossessionOutline) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg p-2' : ''
                }`}
              >
                <span className={`font-bold transition-all duration-500 ${hideDownDistance ? 'text-4xl' : 'text-2xl'}`} style={{ color: awayTeam.color, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  {awayTeam.abbreviation}
                </span>
              </div>
            )}
            <p className="text-sm font-medium">{awayTeam.name}</p>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showRecords && teamRecords?.away ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-xs text-slate-400 font-medium">{teamRecords?.away ? formatRecord(teamRecords.away) : ''}</p>
            </div>
            {sbx.showSeasonContext && seasonContext(awayTeam.id) && (
              <p className="text-[11px] text-slate-400 font-medium">{seasonContext(awayTeam.id)}</p>
            )}
            {possession === 'away' && !hidePossession && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
              </div>
            )}
            {!hideScore && (
              <div className={`mt-2 py-2 overflow-visible transition-all duration-500 rounded-xl ${leadGlow === 'away' ? 'animate-lead-glow' : ''}`} style={{ '--glow': awayTeam.color }}>
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
                {kickoffCountdown && !kickoffCountdown.passed ? (
                  <div className="text-center">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Kickoff In</span>
                    <div className="flex items-center justify-center gap-1 text-lg font-mono font-bold text-cyan-400">
                      {kickoffCountdown.days > 0 && <><span>{kickoffCountdown.days}d</span><span className="text-slate-500">:</span></>}
                      <span>{String(kickoffCountdown.hours).padStart(2, '0')}</span>
                      <span className="text-slate-500 animate-pulse">:</span>
                      <span>{String(kickoffCountdown.minutes).padStart(2, '0')}</span>
                      <span className="text-slate-500 animate-pulse">:</span>
                      <span>{String(kickoffCountdown.seconds).padStart(2, '0')}</span>
                    </div>
                  </div>
                ) : kickoffCountdown?.passed ? (
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
                const maxTimeout = 120 // 2 minute max timeout
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
              <div className={`flex items-center justify-center gap-1.5 sm:gap-3 transition-all duration-300 ${hideClock ? 'scale-0 opacity-0 h-0' : 'scale-100 opacity-100'}`}>
                <span className="text-slate-500 text-sm sm:text-lg font-bold uppercase tracking-wider">{game.quarter}</span>
                <span className={`sb-clock text-3xl sm:text-4xl font-mono font-black tracking-tight ${
                  game.game_time === '0:00' 
                    ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse' 
                    : ((['Q2', 'Q4'].includes(game.quarter) || game.quarter?.startsWith('OT')) && 
                       game.game_time && 
                       (() => {
                         const parts = game.game_time.split(':')
                         const mins = parseInt(parts[0]) || 0
                         const secs = parseInt(parts[1]) || 0
                         const totalSeconds = mins * 60 + secs
                         return totalSeconds <= 120 // 2 minutes or less
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
                  hideDownDistance ? 'h-16 max-w-20 sm:h-24 sm:max-w-32' : 'h-12 max-w-16 sm:h-16 sm:max-w-24'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'home') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg' 
                    : (possession === 'home' && !hidePossession && !hidePossessionOutline) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg' : ''
                }`}
              />
            ) : (
              <div 
                className={`mx-auto flex items-center justify-center mb-2 transition-all duration-500 ${
                  hideDownDistance ? 'w-16 h-16 sm:w-24 sm:h-24' : 'w-12 h-12 sm:w-16 sm:h-16'
                } ${
                  flagDisplayStage === 2 && displayedPenalties.some(p => p.team === 'home') 
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 rounded-lg p-2' 
                    : (possession === 'home' && !hidePossession && !hidePossessionOutline) ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50 rounded-lg p-2' : ''
                }`}
              >
                <span className={`font-bold transition-all duration-500 ${hideDownDistance ? 'text-4xl' : 'text-2xl'}`} style={{ color: homeTeam.color, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  {homeTeam.abbreviation}
                </span>
              </div>
            )}
            <p className="text-sm font-medium">{homeTeam.name}</p>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showRecords && teamRecords?.home ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-xs text-slate-400 font-medium">{teamRecords?.home ? formatRecord(teamRecords.home) : ''}</p>
            </div>
            {sbx.showSeasonContext && seasonContext(homeTeam.id) && (
              <p className="text-[11px] text-slate-400 font-medium">{seasonContext(homeTeam.id)}</p>
            )}
            {possession === 'home' && !hidePossession && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
              </div>
            )}
            {!hideScore && (
              <div className={`mt-2 py-2 overflow-visible transition-all duration-500 rounded-xl ${leadGlow === 'home' ? 'animate-lead-glow' : ''}`} style={{ '--glow': homeTeam.color }}>
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
      
      {/* Break card: big countdown during a timeout or commercial break, with the sponsor */}
      {sbx.showBreakCard && (gameStatus === 'ad-break' || (showTimeoutDisplay && timeoutClock !== null)) && (() => {
        const isAd = gameStatus === 'ad-break'
        const remaining = isAd
          ? (ex.breakStartedAt ? Math.max(0, 120 - Math.floor((nowTick - ex.breakStartedAt) / 1000)) : null)
          : timeoutClock
        const team = !isAd && timeoutTeam ? (timeoutTeam === 'home' ? homeTeam : awayTeam) : null
        const sponsor = sponsorItems.length ? sponsorItems[sponsorIndex % sponsorItems.length] : null
        return (
          <div className="w-full mt-3 rounded-xl p-4 text-white text-center ring-1 ring-white/15 animate-slide-up"
               style={{ background: team ? `linear-gradient(135deg, ${team.color}, #0f172a)` : 'linear-gradient(135deg, #6d28d9, #0f172a)' }}>
            <p className="text-xs font-black tracking-[0.25em] text-white/80">{isAd ? 'COMMERCIAL BREAK' : `TIMEOUT · ${team?.abbreviation || ''}`}</p>
            {remaining !== null && (
              <p className="text-5xl font-mono font-black tabular-nums my-1">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>
            )}
            <p className="text-xs text-white/70">We'll be right back</p>
            {sponsor && (
              <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-center gap-3">
                <span className="text-[10px] font-bold tracking-widest text-white/60">PRESENTED BY</span>
                {sponsor.imageUrl?.trim() && <img src={sponsor.imageUrl} alt="" className="h-7 w-auto max-w-[7rem] object-contain" />}
                {sponsor.text?.trim() && <span className="text-sm font-semibold">{sponsor.text}</span>}
              </div>
            )}
          </div>
        )
      })()}

      {/* Win probability */}
      {sbx.showWinProb && !isPregame && (() => {
        const tracked = sbx.showBallSpot && (possession === 'home' || possession === 'away')
        const home = homeWinProbability(game, possession, tracked ? spotYardsToGoal(ballSpot, possession) : null)
        const homePct = Math.round(home * 100)
        const awayPct = 100 - homePct
        return (
          <div className="w-full mt-3 rounded-lg bg-slate-800/90 px-3 py-2 text-white">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span><span className="inline-block h-2 w-2 rounded-full mr-1 align-middle ring-1 ring-white/30" style={{ backgroundColor: awayTeam.color }} />{awayTeam.abbreviation} {awayPct}%</span>
              <span className="text-[10px] tracking-[0.2em] text-slate-400">WIN PROBABILITY</span>
              <span>{homePct}% {homeTeam.abbreviation}<span className="inline-block h-2 w-2 rounded-full ml-1 align-middle ring-1 ring-white/30" style={{ backgroundColor: homeTeam.color }} /></span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-700">
              <div className="h-full transition-all duration-700" style={{ width: `${awayPct}%`, backgroundColor: awayTeam.color }} />
              <div className="h-full transition-all duration-700" style={{ width: `${homePct}%`, backgroundColor: homeTeam.color }} />
            </div>
          </div>
        )
      })()}

      {/* Pick'em results (pregame and final) */}
      {picks?.total > 0 && (isPregame || isFinal) && (() => {
        const homePct = Math.round(picks.home / picks.total * 100)
        const awayPct = 100 - homePct
        const winner = isFinal ? (game.home_score > game.away_score ? 'home' : game.away_score > game.home_score ? 'away' : null) : null
        const right = winner ? Math.round(picks[winner] / picks.total * 100) : null
        return (
          <div className="w-full mt-3 rounded-lg bg-slate-800/90 px-3 py-2 text-white">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>{awayTeam.abbreviation} {awayPct}%</span>
              <span className="text-[10px] tracking-[0.2em] text-amber-400">FAN PICKS · {picks.total}</span>
              <span>{homePct}% {homeTeam.abbreviation}</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
              <div className="h-full" style={{ width: `${awayPct}%`, backgroundColor: awayTeam.color }} />
              <div className="h-full" style={{ width: `${homePct}%`, backgroundColor: homeTeam.color }} />
            </div>
            {right !== null && <p className="text-center text-xs text-slate-300 mt-1">{right}% of fans picked the winner</p>}
          </div>
        )
      })()}

      {/* Last meeting between these teams */}
      {lastMeeting && (() => {
        const winnerHome = lastMeeting.home_score >= lastMeeting.away_score
        const w = winnerHome ? lastMeeting.home_team : lastMeeting.away_team
        const l = winnerHome ? lastMeeting.away_team : lastMeeting.home_team
        const ws = winnerHome ? lastMeeting.home_score : lastMeeting.away_score
        const ls = winnerHome ? lastMeeting.away_score : lastMeeting.home_score
        const when = lastMeeting.scheduled_at ? new Date(lastMeeting.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''
        return (
          <div className="w-full mt-3 rounded-lg bg-slate-800/90 px-3 py-2 text-white flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
            <span className="text-[10px] font-black tracking-[0.2em] text-amber-400">LAST MEETING</span>
            {when && <span className="text-xs text-slate-400">{when}</span>}
            <span className="font-bold">{w?.abbreviation} {ws}, {l?.abbreviation} {ls}</span>
          </div>
        )
      })()}

      {/* Team stat comparison */}
      {sbx.showStatComparison && quickStats?.home && quickStats?.away && (() => {
        const pct = (c, a) => (a ? Math.round(c / a * 100) : 0)
        const fmtTop = (sec = 0) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
        const rows = [
          { label: 'First Downs', a: quickStats.away.firstDowns || 0, h: quickStats.home.firstDowns || 0 },
          { label: '3rd Down %', a: pct(quickStats.away.thirdDownConv, quickStats.away.thirdDownAtt), h: pct(quickStats.home.thirdDownConv, quickStats.home.thirdDownAtt), suffix: '%' },
          { label: 'Turnovers', a: quickStats.away.turnovers || 0, h: quickStats.home.turnovers || 0 },
          { label: 'Penalty Yards', a: quickStats.away.penaltyYards || 0, h: quickStats.home.penaltyYards || 0 },
          { label: 'Time of Poss.', a: timeOfPossession?.away || 0, h: timeOfPossession?.home || 0, fmt: fmtTop },
        ]
        return (
          <div className="w-full mt-3 rounded-xl p-3 bg-slate-800/90 text-white space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span><span className="inline-block h-2 w-2 rounded-full mr-1 align-middle ring-1 ring-white/30" style={{ backgroundColor: awayTeam.color }} />{awayTeam.abbreviation}</span>
              <span className="tracking-[0.2em] text-amber-400 text-[10px]">TEAM STATS</span>
              <span>{homeTeam.abbreviation}<span className="inline-block h-2 w-2 rounded-full ml-1 align-middle ring-1 ring-white/30" style={{ backgroundColor: homeTeam.color }} /></span>
            </div>
            {rows.map(r => {
              const total = r.a + r.h
              const aShare = total ? r.a / total * 100 : 50
              const show = (v) => r.fmt ? r.fmt(v) : `${v}${r.suffix || ''}`
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold tabular-nums">{show(r.a)}</span>
                    <span className="text-xs text-slate-300">{r.label}</span>
                    <span className="font-bold tabular-nums">{show(r.h)}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-700 mt-0.5">
                    <div className="h-full" style={{ width: `${aShare}%`, backgroundColor: awayTeam.color }} />
                    <div className="h-full" style={{ width: `${100 - aShare}%`, backgroundColor: homeTeam.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Scoring run */}
      {sbx.showScoringRuns && ex.scoringRun?.points >= 10 && (() => {
        const team = ex.scoringRun.team === 'home' ? homeTeam : awayTeam
        return (
          <div className="flex justify-center mt-3">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-white ring-1 ring-white/20 animate-slide-up" style={{ backgroundColor: team.color }}>
              🔥 {team.abbreviation} · {ex.scoringRun.points} straight points
            </span>
          </div>
        )
      })()}

      {/* Scoring summary - every scoring play with the running score */}
      {sbx.showScoringSummary && scoringPlays.length > 0 && (() => {
        let home = 0, away = 0
        const rows = scoringPlays.map(e => {
          if (e.team === 'home') home += e.points; else if (e.team === 'away') away += e.points
          return { ...e, home, away }
        })
        return (
          <div className="w-full mt-3 rounded-xl p-3 bg-slate-800/90 text-white animate-slide-up">
            <p className="text-center text-xs font-black tracking-[0.2em] text-amber-400 mb-2">SCORING SUMMARY</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {rows.map(r => {
                const team = r.team === 'home' ? homeTeam : awayTeam
                return (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="w-8 shrink-0 text-xs text-slate-400">{r.quarter}</span>
                    <span className="w-14 shrink-0 flex items-center gap-1.5 font-bold text-white">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-white/30" style={{ backgroundColor: team.color }} />
                      {team.abbreviation}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-slate-200">{r.description}</span>
                    <span className="shrink-0 font-mono text-xs text-slate-300 tabular-nums">{awayTeam.abbreviation} {r.away} - {homeTeam.abbreviation} {r.home}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Overtime Rules - bottom panel, below the scores so it never covers them */}
      {showOTRules && (() => {
        const rules = getOvertimeRules(game.ot_format, game.overtime_length)
        return (
          <div className="w-full mt-3 rounded-xl p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 ring-1 ring-indigo-400/40 shadow-[0_0_30px_rgba(99,102,241,0.25)] animate-slide-up">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs font-black tracking-[0.2em] text-amber-400">OVERTIME RULES</span>
              <span className="text-slate-500">·</span>
              <span className="text-sm font-bold text-white uppercase tracking-wide">{rules.title}</span>
            </div>
            <ul className="space-y-1.5 max-w-xl mx-auto">
              {rules.lines.map(line => (
                <li key={line} className="flex items-start gap-2 text-sm text-slate-200 leading-snug">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      {/* Stats Bottom Bar - integrated display */}
      {displayStats?.show && (displayStats.quarterScores || showTeamStats) && (
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
          {showTeamStats && (
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
              {displayStats.thirdDowns && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl font-bold w-16 text-left" style={{ color: awayTeam.color }}>{conversions('away', 'thirdDown')}</span>
                  <span className="text-sm font-medium text-slate-300 flex-1 text-center">3rd Down Conv.</span>
                  <span className="text-xl font-bold w-16 text-right" style={{ color: homeTeam.color }}>{conversions('home', 'thirdDown')}</span>
                </div>
              )}
              {displayStats.fourthDowns && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl font-bold w-16 text-left" style={{ color: awayTeam.color }}>{conversions('away', 'fourthDown')}</span>
                  <span className="text-sm font-medium text-slate-300 flex-1 text-center">4th Down Conv.</span>
                  <span className="text-xl font-bold w-16 text-right" style={{ color: homeTeam.color }}>{conversions('home', 'fourthDown')}</span>
                </div>
              )}
              {displayStats.timeOfPossession && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xl font-bold w-16 text-left tabular-nums" style={{ color: awayTeam.color }}>{formatTOP(timeOfPossession.away)}</span>
                  <span className="text-sm font-medium text-slate-300 flex-1 text-center">Time of Poss.</span>
                  <span className="text-xl font-bold w-16 text-right tabular-nums" style={{ color: homeTeam.color }}>{formatTOP(timeOfPossession.home)}</span>
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

      {/* Sponsors - rotating */}
      {sbx.sponsors?.show && sponsorItems.length > 0 && (() => {
        const item = sponsorItems[sponsorIndex % sponsorItems.length]
        return (
          <div key={`sponsor-${sponsorIndex % sponsorItems.length}`} className="w-full mt-3 rounded-lg px-4 py-2 bg-slate-800/90 ring-1 ring-white/10 flex items-center justify-center gap-3 animate-fade-in">
            {item.imageUrl?.trim() && <img src={item.imageUrl} alt="" className="h-8 w-auto max-w-[8rem] object-contain" />}
            {item.text?.trim() && <span className="text-sm font-semibold text-slate-200 text-center">{item.text}</span>}
          </div>
        )
      })()}

      {/* Other scores this week */}
      {sbx.showOtherScores && otherGames.length > 0 && (() => {
        const label = (g) => {
          const a = g.away_team?.abbreviation || 'TBD', h = g.home_team?.abbreviation || 'TBD'
          if (g.status === 'final' || g.quarter?.startsWith('Final')) return `${a} ${g.away_score}  ${h} ${g.home_score}  FINAL`
          if (g.status === 'live') return `${a} ${g.away_score}  ${h} ${g.home_score}  ${g.quarter || ''} ${g.game_time || ''}`.trim()
          const when = g.scheduled_at ? new Date(g.scheduled_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'TBD'
          return `${a} @ ${h}  ${when}`
        }
        const items = otherGames.map(label)
        return (
          <div className="w-full mt-3 rounded-lg bg-slate-800/90 ring-1 ring-white/10 overflow-hidden flex items-center">
            <span className="shrink-0 px-3 py-1.5 text-[10px] font-black tracking-[0.15em] text-amber-400 bg-slate-900/80">SCORES</span>
            <div className="relative flex-1 overflow-hidden">
              <div className="flex w-max animate-ticker whitespace-nowrap py-1.5" style={{ animationDuration: `${Math.max(20, items.length * 6)}s` }}>
                {[...items, ...items].map((t, i) => (
                  <span key={i} className="px-5 text-sm font-semibold text-slate-200">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

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
