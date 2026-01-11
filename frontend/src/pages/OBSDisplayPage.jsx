import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { gameApi, standaloneGameApi, createWebSocket } from '@/lib/api'
import { GameScoreboardDisplay } from '@/components/GameScoreboardDisplay'

export default function OBSDisplayPage() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(true)
  const [prevScores, setPrevScores] = useState({ home: 0, away: 0 })
  const [viewerCount, setViewerCount] = useState(0)

  // URL params for customization
  const layout = searchParams.get('layout') || 'default' // default, centered, slim
  const fade = searchParams.get('fade') === 'true'
  const fadeSpeed = searchParams.get('fadeSpeed') || '300' // ms
  const hideNames = searchParams.get('hideNames') === 'true'
  const hideTimer = searchParams.get('hideTimer') === 'true'
  const hideQuarter = searchParams.get('hideQuarter') === 'true'

  const loadGame = useCallback(async () => {
    try {
      // Try league game first, then standalone game
      let data
      try {
        data = await gameApi.getByShareCode(code)
      } catch (err) {
        // If not found as league game, try standalone game
        data = await standaloneGameApi.getByShareCode(code)
      }
      setGame(data)
    } catch (err) {
      console.error('Failed to load game:', err)
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    loadGame()
  }, [loadGame])

  useEffect(() => {
    if (!code) return

    const ws = createWebSocket('game', code, (message) => {
      if (message.type === 'game_update') {
        setGame((prev) => ({ ...prev, ...message.data }))
      } else if (message.type === 'viewer_count') {
        setViewerCount(message.count)
      }
    })

    return () => ws.close()
  }, [code])

  // Check heartbeat every 5 seconds to detect controller crash
  useEffect(() => {
    if (!game?.id || game?.status !== 'live') return
    
    const checkHeartbeat = async () => {
      try {
        await gameApi.checkHeartbeat(game.id)
        // The server will automatically set tech difficulties if heartbeat timed out
        // and broadcast the update via WebSocket
      } catch (err) {
        console.error('Heartbeat check failed:', err)
      }
    }
    
    // Check immediately and then every 5 seconds
    checkHeartbeat()
    const interval = setInterval(checkHeartbeat, 5000)
    
    return () => clearInterval(interval)
  }, [game?.id, game?.status])

  // Handle fade effect when scores change
  useEffect(() => {
    if (!game || !fade) return
    
    if (game.home_score !== prevScores.home || game.away_score !== prevScores.away) {
      setVisible(true)
      setPrevScores({ home: game.home_score, away: game.away_score })
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [game?.home_score, game?.away_score, fade, prevScores])

  // Live clock calculation - update every second when timer is running
  const [liveGameTime, setLiveGameTime] = useState(null)
  
  useEffect(() => {
    if (!game?.timer_running || !game?.timer_started_at || game?.timer_started_seconds === null) {
      setLiveGameTime(null)
      return
    }
    
    const calculateLiveTime = () => {
      const startedAt = new Date(game.timer_started_at)
      const now = new Date()
      const elapsedSeconds = Math.floor((now - startedAt) / 1000)
      // Sanity check: elapsed time should be positive and reasonable
      if (elapsedSeconds < 0 || elapsedSeconds > 86400) {
        setLiveGameTime(null)
        return
      }
      const currentSeconds = Math.max(0, game.timer_started_seconds - elapsedSeconds)
      const mins = Math.floor(currentSeconds / 60)
      const secs = currentSeconds % 60
      setLiveGameTime(`${mins}:${secs.toString().padStart(2, '0')}`)
    }
    
    // Calculate immediately
    calculateLiveTime()
    
    // Update every second
    const interval = setInterval(calculateLiveTime, 1000)
    
    return () => clearInterval(interval)
  }, [game?.timer_running, game?.timer_started_at, game?.timer_started_seconds])

  if (loading) {
    return <div className="min-h-screen bg-transparent" />
  }

  if (!game) {
    return <div className="min-h-screen bg-transparent" />
  }

  const awayTeam = game.away_team || { name: 'Away', abbreviation: 'AWY', color: '#6B7280' }
  const homeTeam = game.home_team || { name: 'Home', abbreviation: 'HME', color: '#3B82F6' }

  // Parse display state for game info
  const displayState = game.display_state ? (typeof game.display_state === 'string' ? JSON.parse(game.display_state) : game.display_state) : {}
  const possession = displayState.possession || game.possession
  const down = displayState.down || game.down || 1
  const distance = displayState.distance || game.distance || 10

  // Format timer for simple mode
  const formatTimer = (seconds) => {
    if (!seconds && seconds !== 0) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timerDisplay = game.simple_mode ? formatTimer(game.timer_seconds) : (liveGameTime || game.game_time)

  // Fade transition style
  const fadeStyle = fade ? {
    transition: `opacity ${fadeSpeed}ms ease-in-out`,
    opacity: visible ? 1 : 0,
  } : {}

  // COMPACT LAYOUT - ESPN-style horizontal scorebug
  if (layout === 'fox') {
    const showTitle = displayState.showDisplayTitle && displayState.displayTitle
    const possessionTeam = possession === 'home' ? homeTeam : possession === 'away' ? awayTeam : null
    const centerColor = possessionTeam?.color || '#888888'
    
    // Get overlay states from displayState
    const flagDisplayStage = displayState.flagDisplayStage || 0
    const reviewDisplayStage = displayState.reviewDisplayStage || 0
    const reviewReason = displayState.reviewReason || ''
    const reviewResult = displayState.reviewResult
    const scoreCelebration = displayState.scoreCelebration
    const showTouchback = displayState.showTouchback
    const showFirstDown = displayState.showFirstDown
    const showIncomplete = displayState.showIncomplete
    const showTimeoutDisplay = displayState.showTimeoutDisplay
    const timeoutTeam = displayState.timeoutTeam
    const gameStatus = displayState.gameStatus
    const showFGAttempt = displayState.showFGAttempt
    const fgDistance = displayState.fgDistance
    const fgResult = displayState.fgResult
    const showPATAttempt = displayState.showPATAttempt
    const patResult = displayState.patResult
    const showTurnover = displayState.showTurnover
    const customMessage = displayState.customMessage
    const showCustomMessage = displayState.showCustomMessage
    const playClock = displayState.playClock || game.play_clock
    
    // Determine what to show in center
    let centerContent = null
    let centerBgColor = centerColor
    
    // Priority overlays
    if (scoreCelebration?.type === 'touchdown') {
      centerContent = <span className="text-lg font-black">TOUCHDOWN!</span>
      centerBgColor = scoreCelebration.team === 'home' ? homeTeam.color : awayTeam.color
    } else if (flagDisplayStage > 0) {
      centerContent = <span className="text-lg font-black text-yellow-300">🚩 FLAG</span>
      centerBgColor = '#eab308'
    } else if (reviewDisplayStage > 0) {
      centerContent = (
        <span className="text-sm font-black">
          {reviewResult ? (reviewResult === 'confirmed' ? '✓ CONFIRMED' : reviewResult === 'overturned' ? '✗ OVERTURNED' : '— STANDS') : '🔍 REVIEW'}
        </span>
      )
      centerBgColor = '#f59e0b'
    } else if (showTimeoutDisplay && timeoutTeam) {
      centerContent = <span className="text-sm font-black">TIMEOUT</span>
      centerBgColor = timeoutTeam === 'home' ? homeTeam.color : awayTeam.color
    } else if (showTouchback) {
      centerContent = <span className="text-sm font-black">TOUCHBACK</span>
    } else if (showFirstDown) {
      centerContent = <span className="text-sm font-black text-green-300">FIRST DOWN!</span>
      centerBgColor = '#22c55e'
    } else if (showIncomplete) {
      centerContent = <span className="text-sm font-black">INCOMPLETE</span>
    } else if (showTurnover) {
      centerContent = <span className="text-sm font-black text-red-300">TURNOVER</span>
      centerBgColor = '#dc2626'
    } else if (showFGAttempt) {
      centerContent = (
        <span className="text-sm font-black">
          {fgResult ? (fgResult === 'good' ? '✓ FG GOOD!' : '✗ NO GOOD') : `${fgDistance}yd FG`}
        </span>
      )
      centerBgColor = fgResult === 'good' ? '#22c55e' : fgResult ? '#dc2626' : centerColor
    } else if (showPATAttempt) {
      centerContent = (
        <span className="text-sm font-black">
          {patResult ? (patResult === 'good' ? '✓ PAT GOOD' : '✗ NO GOOD') : showPATAttempt === '2pt' ? '2PT CONV' : 'PAT'}
        </span>
      )
      centerBgColor = patResult === 'good' ? '#22c55e' : patResult ? '#dc2626' : centerColor
    } else if (showCustomMessage && customMessage) {
      centerContent = <span className="text-sm font-bold">{customMessage}</span>
    } else if (gameStatus === 'kickoff') {
      centerContent = <span className="text-sm font-black">KICKOFF</span>
    } else if (gameStatus === 'halftime-show') {
      centerContent = <span className="text-sm font-black">HALFTIME</span>
    } else if (gameStatus === 'ad-break') {
      centerContent = <span className="text-sm font-black">📺 BREAK</span>
    } else if (gameStatus === 'injury') {
      centerContent = <span className="text-sm font-black">🏥 INJURY</span>
    }
    
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2" style={fadeStyle}>
        {/* Main scorebug row - CBS style */}
        <div className="flex items-stretch shadow-2xl">
          {/* Away Team - dark bg with team color accent */}
          <div className="bg-[#0a1628] flex items-center">
            {/* Team color accent bar */}
            <div className="w-1 self-stretch" style={{ backgroundColor: awayTeam.color || '#666' }} />
            <div className="flex items-center gap-2 px-3 py-2">
              {awayTeam.logo_url ? (
                <img src={awayTeam.logo_url} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <span className="text-xs font-bold text-gray-400">{awayTeam.abbreviation}</span>
              )}
              <span className="text-2xl font-black text-white tabular-nums">{game.away_score}</span>
            </div>
          </div>
          
          {/* Center - possession team color or overlay color */}
          <div 
            className="flex flex-col items-center justify-center px-4 py-1 min-w-[100px] transition-colors duration-300"
            style={{ backgroundColor: centerBgColor }}
          >
            {centerContent ? (
              <div className="text-white drop-shadow-md font-bold">{centerContent}</div>
            ) : (
              <>
                {/* Down & Distance */}
                <div className="text-xs font-bold text-white tracking-wide uppercase drop-shadow">
                  {game.status === 'live' && possession && game.quarter !== 'Halftime' && game.quarter !== 'Pregame' ? (
                    <>{down === 1 ? '1' : down === 2 ? '2' : down === 3 ? '3' : '4'}<span className="text-[10px]">{down === 1 ? 'ST' : down === 2 ? 'ND' : down === 3 ? 'RD' : 'TH'}</span> & {distance}</>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
                {/* Divider line */}
                <div className="w-full h-px bg-white/40 my-0.5" />
                {/* Quarter & Time */}
                <div className="flex items-center gap-1.5 text-white drop-shadow">
                  {game.status === 'live' && (
                    <>
                      <span className="text-xs font-bold">
                        {game.quarter === 'Halftime' ? 'HALF' : game.quarter === 'Q1' ? '1' : game.quarter === 'Q2' ? '2' : game.quarter === 'Q3' ? '3' : game.quarter === 'Q4' ? '4' : game.quarter}<span className="text-[10px]">{game.quarter?.startsWith('Q') ? (game.quarter === 'Q1' ? 'ST' : game.quarter === 'Q2' ? 'ND' : game.quarter === 'Q3' ? 'RD' : 'TH') : ''}</span>
                      </span>
                      <span className="text-xs text-white/60">|</span>
                      <span className="text-sm font-mono font-bold">{timerDisplay || game.game_time || '15:00'}</span>
                    </>
                  )}
                  {game.status === 'final' && (
                    <span className="text-xs font-bold">FINAL</span>
                  )}
                  {game.status === 'scheduled' && (
                    <span className="text-xs font-bold">PRE</span>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Home Team - dark bg with team color accent */}
          <div className="bg-[#0a1628] flex items-center">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-2xl font-black text-white tabular-nums">{game.home_score}</span>
              {homeTeam.logo_url ? (
                <img src={homeTeam.logo_url} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <span className="text-xs font-bold text-gray-400">{homeTeam.abbreviation}</span>
              )}
            </div>
            {/* Team color accent bar */}
            <div className="w-1 self-stretch" style={{ backgroundColor: homeTeam.color || '#666' }} />
          </div>
        </div>
        
        {/* Play clock (when active) */}
        {playClock && playClock < 40 && game.status === 'live' && !centerContent && (
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 bg-[#0a1628] rounded px-2 py-1">
            <span className={`text-sm font-mono font-bold ${playClock <= 5 ? 'text-red-500' : 'text-white'}`}>
              {playClock}
            </span>
          </div>
        )}
        
        {/* Title bar (only when toggled) */}
        {showTitle && (
          <div className="bg-[#0a1628] text-center py-1 px-4 mt-0.5">
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
              {displayState.displayTitle}
            </span>
          </div>
        )}
      </div>
    )
  }

  // SLIM LAYOUT - Low, horizontal bar for bottom of screen
  if (layout === 'slim') {
    return (
      <div className="fixed bottom-4 left-4 right-4" style={fadeStyle}>
        <div className="bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl border border-white/10">
          <div className="flex items-center justify-between px-4 py-2">
            {/* Away Team */}
            <div className="flex items-center gap-3">
              <div 
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: awayTeam.color }}
              />
              {awayTeam.logo_url ? (
                <img src={awayTeam.logo_url} alt="" className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-sm font-bold text-white">{awayTeam.abbreviation}</span>
              )}
              {!hideNames && (
                <span className="text-sm text-slate-300">{awayTeam.name}</span>
              )}
              <span className="text-2xl font-black text-white">{game.away_score}</span>
            </div>

            {/* Center - Quarter & Time */}
            <div className="flex items-center gap-3 px-6">
              {!hideQuarter && game.quarter && (
                <span className="text-sm font-bold text-slate-400">{game.quarter}</span>
              )}
              {!hideTimer && timerDisplay && (
                <span className="text-lg font-mono font-bold text-yellow-400">{timerDisplay}</span>
              )}
            </div>

            {/* Home Team */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white">{game.home_score}</span>
              {!hideNames && (
                <span className="text-sm text-slate-300">{homeTeam.name}</span>
              )}
              {homeTeam.logo_url ? (
                <img src={homeTeam.logo_url} alt="" className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-sm font-bold text-white">{homeTeam.abbreviation}</span>
              )}
              <div 
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: homeTeam.color }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CENTERED LAYOUT - Larger, centered scorebug
  if (layout === 'centered') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={fadeStyle}>
        <div className="bg-black/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 min-w-[400px]">
          {/* Quarter & Time Header */}
          {(!hideQuarter || !hideTimer) && (
            <div className="bg-black/50 px-6 py-3 text-center border-b border-white/10">
              <div className="flex items-center justify-center gap-3">
                {!hideQuarter && game.quarter && (
                  <span className="text-lg font-bold text-white">{game.quarter}</span>
                )}
                {!hideTimer && timerDisplay && (
                  <span className="text-2xl font-mono font-bold text-yellow-400">{timerDisplay}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Teams and Scores */}
          <div className="p-8">
            <div className="flex items-center justify-center gap-12">
              {/* Away Team */}
              <div className="text-center">
                <div 
                  className="h-20 w-20 mx-auto rounded-full flex items-center justify-center mb-3 shadow-lg"
                  style={{ backgroundColor: awayTeam.color }}
                >
                  {awayTeam.logo_url ? (
                    <img src={awayTeam.logo_url} alt="" className="h-14 w-14 object-contain" />
                  ) : (
                    <span className="text-2xl font-bold text-white">{awayTeam.abbreviation}</span>
                  )}
                </div>
                {!hideNames && (
                  <p className="text-sm font-semibold text-slate-300 mb-2">{awayTeam.name}</p>
                )}
                <p className="text-6xl font-black text-white">{game.away_score}</p>
              </div>

              {/* VS Divider */}
              <div className="text-slate-600 text-2xl font-bold">—</div>

              {/* Home Team */}
              <div className="text-center">
                <div 
                  className="h-20 w-20 mx-auto rounded-full flex items-center justify-center mb-3 shadow-lg"
                  style={{ backgroundColor: homeTeam.color }}
                >
                  {homeTeam.logo_url ? (
                    <img src={homeTeam.logo_url} alt="" className="h-14 w-14 object-contain" />
                  ) : (
                    <span className="text-2xl font-bold text-white">{homeTeam.abbreviation}</span>
                  )}
                </div>
                {!hideNames && (
                  <p className="text-sm font-semibold text-slate-300 mb-2">{homeTeam.name}</p>
                )}
                <p className="text-6xl font-black text-white">{game.home_score}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Determine gameStatus
  const gameStatus = displayState.gameStatus || 
    (game.quarter === 'Pregame' ? 'pregame' : 
     game.quarter === 'Final' ? 'final' : 
     game.quarter === 'Halftime' ? 'halftime-show' : null)

  // DEFAULT LAYOUT - Same as share page display, just no background, wider to reduce height
  // Create game object with live time
  const gameWithLiveTime = liveGameTime ? { ...game, game_time: liveGameTime } : game

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={fadeStyle}>
      <div className="max-w-6xl w-full">
        <GameScoreboardDisplay 
          game={gameWithLiveTime}
          displayState={displayState}
          possession={displayState.possession || game.possession}
          down={displayState.down || game.down}
          distance={displayState.distance || game.distance}
          playClock={displayState.playClock || game.play_clock}
          homeTimeouts={displayState.homeTimeouts || game.home_timeouts}
          awayTimeouts={displayState.awayTimeouts || game.away_timeouts}
          gameStatus={gameStatus}
          showTimeoutDisplay={displayState.showTimeoutDisplay}
          timeoutTeam={displayState.timeoutTeam}
          timeoutClock={displayState.timeoutClock}
          viewerCount={viewerCount}
        />
      </div>
    </div>
  )
}
