import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Minus, Play, Square, Share2, Copy, Check, Trophy, RotateCcw, Flag, Pause, Volume2, Bell, Search, X, Eye, EyeOff, Video, Upload, Trash2, Zap, Send, Settings, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnimatedScore } from '@/components/ui/animated-score'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { gameApi, standaloneGameApi, teamApi, bracketApi, createWebSocket, inviteApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { GameScoreboardDisplay } from '@/components/GameScoreboardDisplay'
import { HelpButton, FirstTimeTutorial } from '@/components/HelpTips'
import { getKeybinds, getKeybindsEnabled, setKeybindsEnabled as saveKeybindsEnabled } from '@/pages/KeybindsPage'

const QUARTERS = ['Pregame', 'Q1', 'Q2', 'Halftime', 'Q3', 'Q4', 'OT', 'Final']

// Football scoring plays
const SCORING_PLAYS = [
  { label: 'TD', points: 6, color: 'bg-green-600 hover:bg-green-700', description: 'Touchdown' },
  { label: 'PAT', points: 1, color: 'bg-blue-600 hover:bg-blue-700', description: 'Point After' },
  { label: '2PT', points: 2, color: 'bg-purple-600 hover:bg-purple-700', description: '2-Point Conv' },
  { label: 'FG', points: 3, color: 'bg-yellow-600 hover:bg-yellow-700', description: 'Field Goal' },
  { label: 'Safety', points: 2, color: 'bg-red-600 hover:bg-red-700', description: 'Safety' },
]

// Common NFL penalties
const NFL_PENALTIES = [
  { name: 'False Start', yards: 5, category: 'Pre-Snap' },
  { name: 'Offside', yards: 5, category: 'Pre-Snap' },
  { name: 'Encroachment', yards: 5, category: 'Pre-Snap' },
  { name: 'Neutral Zone Infraction', yards: 5, category: 'Pre-Snap' },
  { name: 'Delay of Game', yards: 5, category: 'Pre-Snap' },
  { name: 'Illegal Formation', yards: 5, category: 'Pre-Snap' },
  { name: 'Illegal Shift', yards: 5, category: 'Pre-Snap' },
  { name: 'Illegal Motion', yards: 5, category: 'Pre-Snap' },
  { name: 'Holding (Offense)', yards: 10, category: 'Offense' },
  { name: 'Holding (Defense)', yards: 5, category: 'Defense', autoFirst: true },
  { name: 'Pass Interference (Offense)', yards: 10, category: 'Offense' },
  { name: 'Pass Interference (Defense)', yards: 0, category: 'Defense', spotFoul: true, autoFirst: true },
  { name: 'Illegal Contact', yards: 5, category: 'Defense', autoFirst: true },
  { name: 'Roughing the Passer', yards: 15, category: 'Defense', autoFirst: true },
  { name: 'Roughing the Kicker', yards: 15, category: 'Defense', autoFirst: true },
  { name: 'Running into the Kicker', yards: 5, category: 'Defense' },
  { name: 'Unnecessary Roughness', yards: 15, category: 'Personal Foul' },
  { name: 'Personal Foul', yards: 15, category: 'Personal Foul' },
  { name: 'Facemask', yards: 15, category: 'Personal Foul' },
  { name: 'Horse Collar Tackle', yards: 15, category: 'Personal Foul' },
  { name: 'Unsportsmanlike Conduct', yards: 15, category: 'Personal Foul' },
  { name: 'Taunting', yards: 15, category: 'Personal Foul' },
  { name: 'Illegal Block in the Back', yards: 10, category: 'Special Teams' },
  { name: 'Illegal Use of Hands', yards: 10, category: 'Offense' },
  { name: 'Intentional Grounding', yards: 10, category: 'Offense', lossOfDown: true },
  { name: 'Ineligible Receiver Downfield', yards: 5, category: 'Offense' },
  { name: 'Ineligible Man Downfield', yards: 5, category: 'Offense' },
  { name: 'Illegal Forward Pass', yards: 5, category: 'Offense', lossOfDown: true },
  { name: 'Too Many Men on Field', yards: 5, category: 'Pre-Snap' },
  { name: 'Illegal Substitution', yards: 5, category: 'Pre-Snap' },
  { name: 'Clipping', yards: 15, category: 'Personal Foul' },
  { name: 'Chop Block', yards: 15, category: 'Personal Foul' },
  { name: 'Tripping', yards: 10, category: 'Personal Foul' },
  { name: 'Kick Catch Interference', yards: 15, category: 'Special Teams' },
  { name: 'Illegal Kick', yards: 10, category: 'Special Teams' },
  { name: 'Offside on Kickoff', yards: 5, category: 'Special Teams' },
  { name: 'Illegal Touch (Kickoff)', yards: 5, category: 'Special Teams' },
  { name: 'Illegal Formation (Kickoff)', yards: 5, category: 'Special Teams' },
  { name: 'Short Free Kick', yards: 5, category: 'Special Teams' },
  { name: 'Kickoff Out of Bounds', yards: 0, category: 'Special Teams' },
  { name: 'Illegal Wedge', yards: 15, category: 'Special Teams' },
  { name: 'Fair Catch Interference', yards: 15, category: 'Special Teams' },
  { name: 'Invalid Fair Catch Signal', yards: 5, category: 'Special Teams' },
  { name: 'Leaping', yards: 15, category: 'Defense' },
  { name: 'Leverage', yards: 15, category: 'Defense' },
  { name: 'Other', yards: 0, category: 'Other' },
]

export default function LiveGamePage({ standalone = false }) {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  // Use appropriate API based on standalone prop
  const api = standalone ? standaloneGameApi : gameApi
  
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRunningRef = useRef(false) // Ref to track if timer is running (for sync)
  const gameRef = useRef(null) // Ref to track current game state for timer
  const gameTimeRef = useRef(null) // Ref to track current game time (source of truth for controller)
  const ignoreWsTimeUntilRef = useRef(0) // Timestamp until which to ignore WebSocket game_time updates
  
  // Play clock state
  const [playClock, setPlayClock] = useState(40)
  const [playClockRunning, setPlayClockRunning] = useState(false)
  const [showPlayClock, setShowPlayClock] = useState(true)
  const playClockRunningRef = useRef(false)
  const playClockRef = useRef(40) // Ref to track current play clock (source of truth for controller)
  const timeoutClockRunningRef = useRef(false)
  const simpleTimerRunningRef = useRef(false)
  
  // Down & Distance state
  const [down, setDown] = useState(1)
  const [distance, setDistance] = useState(10)
  const [specialDistance, setSpecialDistance] = useState(null) // null, 'goal', or 'inches'
  const [ballOn, setBallOn] = useState(25)
  const [possession, setPossession] = useState('home') // 'home', 'away', or null (no possession)
  const [hidePossession, setHidePossession] = useState(false) // Hide possession indicator without clearing it
  
  // Timeout state - 3 per half for each team
  const [homeTimeouts, setHomeTimeouts] = useState(3)
  const [awayTimeouts, setAwayTimeouts] = useState(3)
  
  // Game status/situation state
  const [gameStatus, setGameStatus] = useState(null) // null, 'pregame', 'kickoff', 'ad-break', 'injury', 'measurement', 'two-minute', 'end-quarter', 'halftime-show', 'final', 'custom'
  const [showLiveIndicator, setShowLiveIndicator] = useState(true)
  const [showDownOnly, setShowDownOnly] = useState(false) // Show only "2nd DOWN" instead of "2nd & 5"
  const [hideDownDistance, setHideDownDistance] = useState(false) // Hide D&D bar completely
  const [hideTimeouts, setHideTimeouts] = useState(false) // Hide timeout indicators
  const [hideScore, setHideScore] = useState(false) // Hide score display
  const [hideClock, setHideClock] = useState(false) // Hide game clock display
  const [showRecords, setShowRecords] = useState(false) // Show team W-L(-T) records
  const [displayTitle, setDisplayTitle] = useState('') // Title shown at top of display
  const [showDisplayTitle, setShowDisplayTitle] = useState(false) // Whether to show the title
  const [customMessage, setCustomMessage] = useState('') // Custom message text
  const [customMessageColor, setCustomMessageColor] = useState('#6366f1') // Custom message background color
  const [showCustomMessage, setShowCustomMessage] = useState(false) // Whether to display custom message
  const [customPanelOpen, setCustomPanelOpen] = useState(false) // Whether custom panel is open
  const [kickoffReceiver, setKickoffReceiver] = useState(null) // 'home' or 'away' - who receives kickoff
  const [showKickoffChoice, setShowKickoffChoice] = useState(false) // Show kickoff receiver selection
  const [teamRecords, setTeamRecords] = useState({ home: null, away: null }) // Team records from league
  const [originalRecords, setOriginalRecords] = useState({ home: null, away: null }) // Original records before final display
  const [recordsUpdatedForFinal, setRecordsUpdatedForFinal] = useState(false) // Track if display records were updated
  const [injuryTeam, setInjuryTeam] = useState(null) // 'home' or 'away' - team with injured player
  
  // Extra info box state - supports multiple lines with individual sizes and colors
  const [extraInfo, setExtraInfo] = useState({
    show: false,
    side: 'away', // 'home' or 'away' - which side to show on
    lines: [{ text: '', fontSize: 'md', textColor: '#ffffff' }], // Array of lines with individual sizes and colors
    bgColor: '#3b82f6',
    textColor: '#ffffff', // Default text color for new lines
  })
  const [extraInfoPanelOpen, setExtraInfoPanelOpen] = useState(false)
  
  // Bracket link state
  const [linkedBracketMatch, setLinkedBracketMatch] = useState(null)
  const [bracketSynced, setBracketSynced] = useState(false)
  
  // Countdown timer state
  const [countdown, setCountdown] = useState(null) // { days, hours, minutes, seconds }
  
  // Big play/turnover overlay state
  const [bigPlay, setBigPlay] = useState(null) // null, 'fumble', 'interception', 'sack', 'safety', 'blocked-kick', 'pick-six', 'scoop-score'
  
  // Flag/Penalty state - two-stage display (supports multiple flags)
  const [showFlagPanel, setShowFlagPanel] = useState(false)
  const [penaltySearch, setPenaltySearch] = useState('')
  const [selectedPenalties, setSelectedPenalties] = useState([]) // Array of { penalty, team }
  const [flagDisplayStage, setFlagDisplayStage] = useState(0) // 0=hidden, 1=FLAG text only, 2=full details, 3=applied/enforced
  const [displayedPenalties, setDisplayedPenalties] = useState([]) // Array of penalty records
  const [penalties, setPenalties] = useState([])
  const [noTeamFlagText, setNoTeamFlagText] = useState('') // Custom text for no-team flag (e.g. "Flag Picked Up")
  const [flagResult, setFlagResult] = useState(null) // 'picked-up', 'offsetting', 'declined', or null
  const [declinedPenaltyIndex, setDeclinedPenaltyIndex] = useState(null) // Index of declined penalty when multiple
  
  // Review state - similar to flag but red
  const [reviewDisplayStage, setReviewDisplayStage] = useState(0) // 0=hidden, 1=REVIEW text only, 2=with details
  const [reviewReason, setReviewReason] = useState('')
  const [reviewCallOnField, setReviewCallOnField] = useState('') // The original call being reviewed
  const [reviewResult, setReviewResult] = useState(null) // null, 'upheld', 'reversed'
  
  // Challenge state
  const [challengeActive, setChallengeActive] = useState(false)
  const [challengeTeam, setChallengeTeam] = useState(null) // 'home' or 'away'
  const [challengeStage, setChallengeStage] = useState(0) // 0=hidden, 1=showing challenge, 2=awaiting result
  
  // Timeout display state
  const [showTimeoutDisplay, setShowTimeoutDisplay] = useState(false)
  const [timeoutTeam, setTimeoutTeam] = useState(null)
  const [usedTimeoutIndex, setUsedTimeoutIndex] = useState(null) // Which timeout was just used (1, 2, or 3)
  const [pendingTimeoutDuration, setPendingTimeoutDuration] = useState(null) // 'home' or 'away' - waiting for duration choice
  const [timeoutClock, setTimeoutClock] = useState(null) // Countdown seconds for timeout
  
  // Score celebration overlay state
  const [scoreCelebration, setScoreCelebration] = useState(null) // { type: 'touchdown'|'fieldgoal', team: 'home'|'away', points: number }
  
  // TD input panel state
  const [showTDPanel, setShowTDPanel] = useState(null) // 'home' or 'away' - which team is scoring TD
  const [tdYards, setTdYards] = useState('')
  const [tdType, setTdType] = useState('rush') // 'rush' or 'pass'
  const [pendingPAT, setPendingPAT] = useState(null) // 'home' or 'away' - team that just scored TD and needs PAT/2PT
  
  // Ad break prompt state
  const [showAdBreakPrompt, setShowAdBreakPrompt] = useState(false)
  
  // Two-minute warning prompt state
  const [show2MinWarningPrompt, setShow2MinWarningPrompt] = useState(false)
  
  // OT score end game prompt state
  const [showOTEndPrompt, setShowOTEndPrompt] = useState(false)
  
  // Go for it on 4th down - hides the 4th down options
  const [goingForIt, setGoingForIt] = useState(false)
  
  // Touchback display state
  const [showTouchback, setShowTouchback] = useState(false)
  
  // Onside kick display state
  const [showOnsideKick, setShowOnsideKick] = useState(null) // null, 'attempt', 'offense', 'defense'
  
  // First down display state
  const [showFirstDown, setShowFirstDown] = useState(false)
  
  // Incomplete pass display state
  const [showIncomplete, setShowIncomplete] = useState(false)
  
  // Out of bounds display state
  const [showOutOfBounds, setShowOutOfBounds] = useState(false)
  
  // Turnover display state
  const [showTurnover, setShowTurnover] = useState(null) // null, 'downs', 'interception', 'fumble', 'punt', 'safety'
  const [showTurnoverOnDowns, setShowTurnoverOnDowns] = useState(false) // Keep for backwards compat
  const [showTurnoverOnDownsConfirm, setShowTurnoverOnDownsConfirm] = useState(false) // Confirmation dialog
  const [pendingFumble, setPendingFumble] = useState(false) // Show fumble recovery options in Immediate Actions
  const [pendingTurnoverReview, setPendingTurnoverReview] = useState(null) // 'downs', 'interception' - show review option
  
  // Fumble recovery display state
  const [showFumbleRecovery, setShowFumbleRecovery] = useState(null) // 'offense', 'defense', 'oob'
  
  // Red zone display state
  const [showRedZone, setShowRedZone] = useState(false)
  
  // Injury display state
  const [showInjury, setShowInjury] = useState(false)
  
  // FG Attempt display state
  const [showFGAttempt, setShowFGAttempt] = useState(false)
  const [fgDistance, setFgDistance] = useState(30)
  const [fgResult, setFgResult] = useState(null) // null, 'good', 'no-good', 'blocked'
  const [showFGDistanceDialog, setShowFGDistanceDialog] = useState(false) // For keybind FG setup
  
  // PAT/2PT Attempt display state
  const [showPATAttempt, setShowPATAttempt] = useState(null) // null, 'pat', '2pt'
  const [patResult, setPatResult] = useState(null) // null, 'good', 'no-good'
  
  // Kickoff pending state (shows kickoff button after scores)
  const [kickoffPending, setKickoffPending] = useState(false)
  const [kickingTeam, setKickingTeam] = useState(null) // 'home' or 'away' - who is kicking off
  
  // Audio refs for whistle and buzzer
  const whistleAudio = useRef(null)
  const buzzerAudio = useRef(null)
  const whistleAudioCtx = useRef(null)
  const whistleSource = useRef(null)
  const whistleGain = useRef(null)
  const whistleBuffer = useRef(null)
  const [whistleLoaded, setWhistleLoaded] = useState(false)
  
  // Logo upload refs
  const homeLogoInputRef = useRef(null)
  const awayLogoInputRef = useRef(null)
  
  // Simple mode timer state
  const [simpleTimerSeconds, setSimpleTimerSeconds] = useState(0)
  const [simpleTimerRunning, setSimpleTimerRunning] = useState(false)
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  
  // Keybinds enabled state (synced with localStorage, default: disabled)
  const [keybindsEnabled, setKeybindsEnabled] = useState(() => getKeybindsEnabled())
  
  // Quick stats panel state
  const [showQuickStats, setShowQuickStats] = useState(false)
  const [quickStats, setQuickStats] = useState({
    home: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 },
    away: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 },
    // Custom stats - array of { id, label, shortLabel, home, away, color }
    custom: []
  })
  const [showCustomStatDialog, setShowCustomStatDialog] = useState(false)
  const [editingCustomStat, setEditingCustomStat] = useState(null) // null for new, or stat object for edit
  const [customStatForm, setCustomStatForm] = useState({ label: '', shortLabel: '', color: '#3b82f6' })
  // Display stats on scoreboard - which stats to show
  const [displayStats, setDisplayStats] = useState({
    show: false,
    quarterScores: false,
    turnovers: false,
    firstDowns: false,
    penalties: false,
    all: false,
    customStats: [] // array of custom stat IDs to display
  })
  
  // Throttle ref for game time sync (to avoid flooding API)
  const lastTimeSyncRef = useRef(0)

  const loadGame = useCallback(async () => {
    try {
      const data = await api.get(gameId)
      
      // If game clock timer was running, calculate elapsed time and resume
      if (data.timer_running && data.timer_started_at && data.timer_started_seconds !== null) {
        const startedAt = new Date(data.timer_started_at)
        const now = new Date()
        const elapsedSeconds = Math.floor((now - startedAt) / 1000)
        
        // Sanity check: elapsed time should be positive and reasonable (< 24 hours)
        if (elapsedSeconds >= 0 && elapsedSeconds < 86400) {
          const currentSeconds = Math.max(0, data.timer_started_seconds - elapsedSeconds)
          // Format time inline since formatTime isn't defined yet
          const mins = Math.floor(currentSeconds / 60)
          const secs = currentSeconds % 60
          const currentTime = `${mins}:${secs.toString().padStart(2, '0')}`
          
          // Update game time based on elapsed time
          data.game_time = currentTime
          
          // Resume the timer if there's still time left
          if (currentSeconds > 0) {
            // Mark that timer should resume - will be handled after component mounts
            data._shouldResumeTimer = true
          } else {
            // Timer ran out while away, stop it
            api.update(gameId, { game_time: '0:00', timer_running: false }).catch(() => {})
          }
        } else {
          // Invalid elapsed time, stop the timer
          api.update(gameId, { timer_running: false }).catch(() => {})
        }
      }
      
      setGame(data)
      
      // Restore state from display_state
      if (data.display_state) {
        try {
          const savedState = JSON.parse(data.display_state)
          // Restore quick stats
          if (savedState.quickStats) setQuickStats(savedState.quickStats)
          // Restore display stats
          if (savedState.displayStats) setDisplayStats(savedState.displayStats)
          // Restore game status
          if (savedState.gameStatus) setGameStatus(savedState.gameStatus)
          // Restore visibility settings
          if (savedState.hideDownDistance !== undefined) setHideDownDistance(savedState.hideDownDistance)
          if (savedState.hideTimeouts !== undefined) setHideTimeouts(savedState.hideTimeouts)
          if (savedState.showPlayClock !== undefined) setShowPlayClock(savedState.showPlayClock)
          if (savedState.showLiveIndicator !== undefined) setShowLiveIndicator(savedState.showLiveIndicator)
          if (savedState.showRecords !== undefined) setShowRecords(savedState.showRecords)
          if (savedState.teamRecords) setTeamRecords(savedState.teamRecords)
        } catch (e) {
          console.error('Failed to parse display_state:', e)
        }
      }
      
      // Restore down, distance, possession, timeouts from game data
      if (data.down !== undefined) setDown(data.down)
      if (data.distance !== undefined) setDistance(data.distance)
      if (data.ball_on !== undefined) setBallOn(data.ball_on)
      if (data.possession !== undefined) setPossession(data.possession)
      if (data.home_timeouts !== undefined) setHomeTimeouts(data.home_timeouts)
      if (data.away_timeouts !== undefined) setAwayTimeouts(data.away_timeouts)
      if (data.play_clock !== undefined) setPlayClock(data.play_clock)
      
      // Sync simple timer state from game data
      if (data.timer_seconds !== undefined) {
        setSimpleTimerSeconds(data.timer_seconds)
      }
      if (data.timer_running !== undefined) {
        setSimpleTimerRunning(data.timer_running)
      }
      // Check if this game is linked to a bracket match (only for league games)
      if (!standalone) {
        try {
          const bracketMatch = await gameApi.getBracketMatch(gameId)
          setLinkedBracketMatch(bracketMatch)
        } catch (e) {
          setLinkedBracketMatch(null)
        }
      } else {
        setLinkedBracketMatch(null)
      }
    } catch (error) {
      console.error('Failed to load game:', error)
    } finally {
      setLoading(false)
    }
  }, [gameId, api, standalone])

  useEffect(() => {
    loadGame()
  }, [loadGame])

  // Keep gameRef in sync with game state for timer access
  useEffect(() => {
    gameRef.current = game
    // Also track game time separately as source of truth
    if (game?.game_time) {
      gameTimeRef.current = game.game_time
    }
  }, [game])

  // Resume timer if it was running when page loaded
  useEffect(() => {
    if (game?._shouldResumeTimer && !timerRunningRef.current) {
      // Clear the flag and start timer
      setGame(prev => prev ? { ...prev, _shouldResumeTimer: false } : prev)
      startTimer()
    }
  }, [game?._shouldResumeTimer])

  // Set initial state based on game status (pregame defaults)
  useEffect(() => {
    if (!game) return
    // If game is scheduled/pregame, hide D&D and set no possession
    if (game.status === 'scheduled') {
      setHideDownDistance(true)
      setPossession(null)
    }
  }, [game?.id]) // Only run when game ID changes (initial load)

  // Fetch team records from league (only for league games)
  useEffect(() => {
    if (!game || standalone) return
    
    async function fetchTeamRecords() {
      try {
        // Get teams from the league to get their records
        const teams = await teamApi.getByLeague(game.league_id)
        const homeTeamData = teams.find(t => t.id === game.home_team?.id)
        const awayTeamData = teams.find(t => t.id === game.away_team?.id)
        
        setTeamRecords({
          home: homeTeamData ? { wins: homeTeamData.wins, losses: homeTeamData.losses, ties: homeTeamData.ties, points_for: homeTeamData.points_for || 0, points_against: homeTeamData.points_against || 0 } : null,
          away: awayTeamData ? { wins: awayTeamData.wins, losses: awayTeamData.losses, ties: awayTeamData.ties, points_for: awayTeamData.points_for || 0, points_against: awayTeamData.points_against || 0 } : null,
        })
      } catch (err) {
        console.error('Failed to fetch team records:', err)
      }
    }
    
    fetchTeamRecords()
  }, [game?.id, game?.league_id, standalone])

  // Update display records when gameStatus changes to/from 'final'
  useEffect(() => {
    if (!game || standalone || !teamRecords.home || !teamRecords.away) return
    
    if (gameStatus === 'final' && !recordsUpdatedForFinal) {
      // Save original records and update display records
      setOriginalRecords({ ...teamRecords })
      
      // Calculate new display records based on game result
      const homeWon = game.home_score > game.away_score
      const awayWon = game.away_score > game.home_score
      const tied = game.home_score === game.away_score
      
      setTeamRecords(prev => ({
        home: {
          wins: prev.home.wins + (homeWon ? 1 : 0),
          losses: prev.home.losses + (awayWon ? 1 : 0),
          ties: (prev.home.ties || 0) + (tied ? 1 : 0),
        },
        away: {
          wins: prev.away.wins + (awayWon ? 1 : 0),
          losses: prev.away.losses + (homeWon ? 1 : 0),
          ties: (prev.away.ties || 0) + (tied ? 1 : 0),
        },
      }))
      setRecordsUpdatedForFinal(true)
    } else if (gameStatus !== 'final' && recordsUpdatedForFinal) {
      // Revert to original records
      setTeamRecords({ ...originalRecords })
      setRecordsUpdatedForFinal(false)
    }
  }, [gameStatus, game?.home_score, game?.away_score, standalone])

  useEffect(() => {
    if (!game?.share_code) return

    const ws = createWebSocket('game', game.share_code, (message) => {
      // Controller is the source of truth for game_time and play_clock - ALWAYS ignore from WebSocket
      // This prevents the clocks from jumping around due to stale updates
      if (message.type === 'game_update') {
        setGame((prev) => {
          // Always ignore game_time and play_clock from WebSocket on the controller
          // The controller manages these locally and syncs to backend
          const { game_time, timer_running, timer_started_at, timer_started_seconds, play_clock, ...rest } = message.data
          // Preserve the current game time from our ref (source of truth)
          const preservedTime = gameTimeRef.current || prev?.game_time
          return { ...prev, ...rest, game_time: preservedTime }
        })
      }
    })

    return () => ws.close()
  }, [game?.share_code])

  // Countdown timer for scheduled games and pregame state
  useEffect(() => {
    // Show countdown for scheduled games OR live games in Pregame quarter
    const showCountdown = game?.scheduled_at && (
      game.status === 'scheduled' || 
      (game.status === 'live' && game.quarter === 'Pregame')
    )
    
    if (!showCountdown) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      // Parse the scheduled time (stored as local time string)
      const scheduled = new Date(game.scheduled_at)
      const diff = scheduled - now

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds, passed: false })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [game?.scheduled_at, game?.status, game?.quarter])
  
  // Reset goingForIt when down changes from 4
  useEffect(() => {
    if (down !== 4) {
      setGoingForIt(false)
    }
  }, [down])

  // Keybind handler
  useEffect(() => {
    if (!game) return
    
    const keybinds = getKeybinds()
    
    const handleKeyDown = (e) => {
      // Don't trigger if keybinds are disabled
      if (!keybindsEnabled) return
      
      // Don't trigger if typing in an input, textarea, or select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return
      }
      
      // Don't trigger if a dialog is open
      if (document.querySelector('[role="dialog"]')) {
        return
      }
      
      const key = e.key.toLowerCase()
      
      // Find matching keybind action
      const action = Object.entries(keybinds).find(([_, bind]) => bind.key === key)?.[0]
      if (!action) return
      
      e.preventDefault()
      
      // Execute action based on keybind
      switch (action) {
        // Scoring - show TD panel for team with possession, or home if none
        case 'touchdown':
          stopTimer()
          setShowTDPanel(possession || 'home')
          break
        case 'safety':
          // Safety scores for the OTHER team (defense) - use scoreSafety for proper celebration/kickoff
          stopTimer()
          scoreSafety(possession === 'home' ? 'away' : 'home')
          break
        case 'attemptPat':
          stopTimer()
          setShowPATAttempt('pat')
          break
        case 'attemptFg':
          // FG dialog will stop timer when attempt is shown
          setShowFGDistanceDialog(true)
          break
        case 'attempt2pt':
          stopTimer()
          setShowPATAttempt('2pt')
          break
        case 'attemptGood':
          // Universal good - works for PAT, FG, 2PT
          if (showPATAttempt === 'pat') {
            updateScore(possession || 'home', 1)
            setBigPlay('pat-good')
            setShowPATAttempt(null)
          } else if (showPATAttempt === '2pt') {
            updateScore(possession || 'home', 2)
            setBigPlay('2pt-good')
            setShowPATAttempt(null)
          } else if (showFGAttempt) {
            updateScore(possession || 'home', 3)
            setBigPlay('fg-good')
            setShowFGAttempt(false)
          }
          break
        case 'attemptNoGood':
          // Universal no good - works for PAT, FG, 2PT
          if (showPATAttempt === 'pat') {
            setBigPlay('pat-no-good')
            setShowPATAttempt(null)
          } else if (showPATAttempt === '2pt') {
            setBigPlay('2pt-no-good')
            setShowPATAttempt(null)
          } else if (showFGAttempt) {
            setBigPlay('fg-no-good')
            setShowFGAttempt(false)
          }
          break
          
        // Clock
        case 'toggleClock':
          if (timerRunning) {
            stopTimer()
          } else {
            startTimer()
          }
          break
        case 'togglePlayClock':
          if (playClockRunning) {
            stopPlayClock()
          } else {
            startPlayClock(playClock)
          }
          break
        case 'togglePlayClockVisible':
          setShowPlayClock(prev => !prev)
          break
        case 'playClock40':
          setPlayClock(40)
          break
        case 'playClock25':
          setPlayClock(25)
          break
        case 'nextQuarter':
          nextQuarter()
          break
        case 'prevQuarter':
          prevQuarter()
          break
          
        // Down & Distance
        case 'nextDown':
          // Same as the "⏱️ Down" quick action button
          if (!playClockRunning) {
            setPlayClock(40)
            startPlayClock(40)
          }
          setShowDownOnly(true)
          nextDown()
          break
        case 'firstDown':
          // Show first down overlay and reset downs
          stopTimer()
          setShowFirstDown(true)
          setTimeout(() => setShowFirstDown(false), 3000)
          setDown(1)
          setDistance(10)
          setShowDownOnly(false)
          resetPlayClock(40)
          startPlayClock(40)
          break
        case 'yardsPlus5':
          setDistance(prev => Math.min(99, prev + 5))
          break
        case 'yardsMinus5':
          setDistance(prev => Math.max(1, prev - 5))
          break
        case 'toggleDDVisible':
          setHideDownDistance(prev => !prev)
          break
        case 'toggleDownOnly':
          setShowDownOnly(prev => !prev)
          break
          
        // Play Results
        case 'incomplete':
          stopTimer()
          setShowIncomplete(true)
          setTimeout(() => setShowIncomplete(false), 2000)
          setDown(prev => prev < 4 ? prev + 1 : 1)
          resetPlayClock(40)
          startPlayClock(40)
          break
        case 'outOfBounds':
          stopTimer()
          setShowOutOfBounds(true)
          setTimeout(() => setShowOutOfBounds(false), 2000)
          break
        case 'redZone':
          setShowRedZone(true)
          setTimeout(() => setShowRedZone(false), 5000)
          break
        case 'turnover':
          stopTimer()
          setShowTurnover(possession === 'home' ? 'away' : 'home')
          setTimeout(() => setShowTurnover(null), 3000)
          setPossession(prev => prev === 'home' ? 'away' : 'home')
          setDown(1)
          setDistance(10)
          break
        case 'fumble':
          // Same as D&D turnover quick action - shows turnover overlay with pending review
          stopTimer()
          setShowTurnover('fumble')
          setPendingTurnoverReview('fumble')
          break
        case 'interception':
          // Same as D&D turnover quick action - shows turnover overlay with pending review
          stopTimer()
          setShowTurnover('interception')
          setPendingTurnoverReview('interception')
          break
        case 'sack':
          // Big play overlay - doesn't stop clock, auto-clears after 5 seconds
          setBigPlay('sack')
          setTimeout(() => setBigPlay(null), 5000)
          break
          
        // Penalties & Flags
        case 'flag':
          showFlagStage1()
          break
          
        // Possession
        case 'possessionAway':
          setPossession('away')
          break
        case 'possessionHome':
          setPossession('home')
          break
        case 'possessionNone':
          setPossession(null)
          break
        case 'togglePossessionVisible':
          setHidePossession(prev => !prev)
          break
          
        // Timeouts
        case 'timeoutAway':
          stopTimer()
          useTimeout('away')
          break
        case 'timeoutHome':
          stopTimer()
          useTimeout('home')
          break
        case 'toggleTimeoutsVisible':
          setHideTimeouts(prev => !prev)
          break
          
        // Overlays
        case 'injury':
          setShowInjury(prev => !prev)
          if (!showInjury) stopTimer()
          break
        case 'commercial':
          // Toggle ad-break game status
          stopTimer()
          setGameStatus(prev => prev === 'ad-break' ? null : 'ad-break')
          break
          
        // Quick Actions
        case 'kickoff':
          setGameStatus('kickoff')
          setHideDownDistance(true)
          setPossession(null)
          setShowKickoffChoice(true)
          break
        case 'punt':
          stopTimer()
          // Toggle possession for punt
          setPossession(prev => prev === 'home' ? 'away' : 'home')
          setDown(1)
          setDistance(10)
          break
        case 'undoLast':
          // Clear any active overlays
          setBigPlay(null)
          setShowIncomplete(false)
          setShowTurnover(null)
          setShowFirstDown(false)
          setFlagDisplayStage(0)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [game, timerRunning, awayTimeouts, homeTimeouts, possession, playClockRunning, playClock, down, showPATAttempt, showFGAttempt, showInjury, keybindsEnabled])

  // Sync game state to backend when key values change
  useEffect(() => {
    if (!game?.id) return
    
    const displayState = JSON.stringify({
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
      showTimeoutDisplay,
      timeoutTeam,
      usedTimeoutIndex,
      timeoutClock,
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
      specialDistance,
      gameStatus,
      showLiveIndicator,
      challengeActive,
      challengeTeam,
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
      extraInfo,
      hidePossession,
      hideClock,
      displayStats,
      quickStats,
    })
    
    // Debounce the sync - shorter delay for more responsive updates
    const timeout = setTimeout(() => {
      api.update(gameId, {
        down,
        distance,
        ball_on: ballOn,
        possession,
        home_timeouts: homeTimeouts,
        away_timeouts: awayTimeouts,
        play_clock: playClock,
        display_state: displayState,
      }).catch(err => console.error('Failed to sync game state:', err))
    }, 100)
    
    return () => clearTimeout(timeout)
  }, [game?.id, api, down, distance, ballOn, possession, homeTimeouts, awayTimeouts, playClock, bigPlay, flagDisplayStage, displayedPenalties, noTeamFlagText, flagResult, declinedPenaltyIndex, reviewDisplayStage, reviewReason, reviewCallOnField, reviewResult, showTimeoutDisplay, timeoutTeam, usedTimeoutIndex, timeoutClock, scoreCelebration, showTouchback, showOnsideKick, showFirstDown, showIncomplete, showOutOfBounds, showTurnoverOnDowns, showTurnover, showFumbleRecovery, showRedZone, specialDistance, gameStatus, showLiveIndicator, challengeActive, challengeTeam, showFGAttempt, fgDistance, fgResult, showPATAttempt, patResult, showDownOnly, hideDownDistance, hideTimeouts, hideScore, showRecords, teamRecords, displayTitle, showDisplayTitle, showPlayClock, showCustomMessage, customMessage, customMessageColor, kickoffReceiver, showKickoffChoice, injuryTeam, showInjury, extraInfo, hidePossession, hideClock, displayStats, quickStats])

  // Heartbeat - DISABLED to prevent resource exhaustion
  // useEffect(() => {
  //   if (!game?.id || game?.status !== 'live') return
  //   const heartbeatInterval = setInterval(() => {
  //     api.sendHeartbeat(game.id).catch(() => {})
  //   }, 30000)
  //   return () => clearInterval(heartbeatInterval)
  // }, [game?.id, game?.status, api])

  async function updateGame(updates) {
    // Update local state immediately for responsive UI
    // But don't update game_time if timer is running (it manages its own time)
    setGame(prev => {
      if (timerRunningRef.current && updates.game_time) {
        const { game_time, ...rest } = updates
        return { ...prev, ...rest }
      }
      return { ...prev, ...updates }
    })
    // Sync to backend
    try {
      await api.update(gameId, updates)
    } catch (error) {
      console.error('Failed to update game:', error)
    }
  }

  // Sync game state (D&D, possession, timeouts, display state) to backend
  async function syncGameState(overrides = {}) {
    const displayState = JSON.stringify({
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
      showTimeoutDisplay,
      timeoutTeam,
      usedTimeoutIndex,
      timeoutClock,
      scoreCelebration,
      showTouchback,
      showOnsideKick,
      showFirstDown,
      showIncomplete,
      showOutOfBounds,
      showTurnoverOnDowns,
      showFumbleRecovery,
      showRedZone,
      specialDistance,
    })
    
    await updateGame({
      down,
      distance,
      ball_on: ballOn,
      possession,
      home_timeouts: homeTimeouts,
      away_timeouts: awayTimeouts,
      play_clock: playClock,
      display_state: displayState,
      ...overrides,
    })
  }

  // Sync final score to linked bracket match
  async function syncToBracket() {
    if (!linkedBracketMatch || !game) return
    
    try {
      // Determine winner based on scores
      let winner_id = null
      if (game.home_score > game.away_score) {
        winner_id = game.home_team?.id
      } else if (game.away_score > game.home_score) {
        winner_id = game.away_team?.id
      }

      await bracketApi.updateMatch(linkedBracketMatch.id, {
        team1_score: game.home_score,
        team2_score: game.away_score,
        status: 'completed',
        winner_id,
      })
      
      setBracketSynced(true)
    } catch (error) {
      console.error('Failed to sync to bracket:', error)
    }
  }

  async function updateScore(team, delta, celebrationData = {}) {
    console.log('updateScore called:', { team, delta, celebrationData })
    const field = team === 'home' ? 'home_score' : 'away_score'
    const currentScore = team === 'home' ? game.home_score : game.away_score
    const newScore = Math.max(0, currentScore + delta)
    console.log('Updating score:', { field, currentScore, newScore })
    
    // Track points by quarter in quick stats
    if (delta > 0) {
      const qtr = game.quarter || 'Q1'
      const qKey = qtr.startsWith('OT') ? 'ot' : qtr.toLowerCase()
      if (['q1', 'q2', 'q3', 'q4', 'ot'].includes(qKey)) {
        setQuickStats(s => ({
          ...s,
          [team]: {...s[team], [qKey]: s[team][qKey] + delta}
        }))
      }
    }
    
    // Trigger celebration overlay for TDs, FGs, Safeties, and conversions
    if (delta === 6 || delta === 7 || delta === 8) {
      // Touchdown - show celebration first, then update score after animation
      setScoreCelebration({ type: 'touchdown', team, points: delta, ...celebrationData })
      setTimeout(async () => {
        await updateGame({ [field]: newScore })
        setScoreCelebration(null)
      }, 5000)
    } else if (delta === 3) {
      // Field Goal - show celebration first, then update score after animation
      setScoreCelebration({ type: 'fieldgoal', team, points: delta, ...celebrationData })
      setTimeout(async () => {
        await updateGame({ [field]: newScore })
        setScoreCelebration(null)
      }, 5000)
    } else {
      // Other scores (PAT, etc.) - update immediately
      await updateGame({ [field]: newScore })
    }
  }
  
  // Separate function for Safety scoring (defensive score)
  async function scoreSafety(team) {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const currentScore = team === 'home' ? game.home_score : game.away_score
    const newScore = currentScore + 2
    
    // Track points by quarter in quick stats
    const qtr = game.quarter || 'Q1'
    const qKey = qtr.startsWith('OT') ? 'ot' : qtr.toLowerCase()
    if (['q1', 'q2', 'q3', 'q4', 'ot'].includes(qKey)) {
      setQuickStats(s => ({
        ...s,
        [team]: {...s[team], [qKey]: s[team][qKey] + 2}
      }))
    }
    
    await updateGame({ [field]: newScore })
    setScoreCelebration({ type: 'safety', team, points: 2 })
    setTimeout(() => {
      setScoreCelebration(null)
      // Check if in OT - show end game prompt
      if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
        setShowOTEndPrompt(true)
      } else {
        setKickoffPending(true) // Safety results in a kickoff (free kick)
        setShowAdBreakPrompt(true)
        setPossession(null)
        setShowPlayClock(false)
        setHideDownDistance(true)
      }
    }, 3000)
  }
  
  // Separate function for 2PT conversion
  async function score2PT(team) {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const currentScore = team === 'home' ? game.home_score : game.away_score
    const newScore = currentScore + 2
    await updateGame({ [field]: newScore })
    setScoreCelebration({ type: '2pt', team, points: 2 })
    setTimeout(() => setScoreCelebration(null), 2000)
  }

  function triggerBigPlay(type) {
    // Toggle off if same type is clicked again
    if (bigPlay === type) {
      setBigPlay(null)
    } else {
      setBigPlay(type)
      // Auto-clear after a few seconds, except fumble which needs recovery selection
      if (type !== 'fumble') {
        setTimeout(() => setBigPlay(null), 4000)
      }
    }
  }
  
  function clearBigPlay() {
    setBigPlay(null)
  }

  async function startGame() {
    await updateGame({ status: 'live', quarter: 'Pregame', game_time: '0:00' })
    setGameStatus('pregame')
  }

  async function endGame() {
    await finalizeGame()
  }

  async function resetGame() {
    if (!confirm('Reset the game? This will set both scores to 0 and return to Pregame.')) return
    await updateGame({ 
      home_score: 0, 
      away_score: 0, 
      quarter: 'Pregame', 
      game_time: '0:00',
      status: 'live'
    })
    setGameStatus('pregame')
    setPenalties([])
    setDisplayedPenalties([])
    stopTimer()
  }

  // Helper to finalize game and sync bracket
  async function finalizeGame() {
    await updateGame({ quarter: 'Final', status: 'final' })
    setGameStatus('final')
    setPossession(null)
    setHideDownDistance(true)
    stopTimer()
    
    // Auto-sync to linked bracket match
    if (linkedBracketMatch) {
      try {
        let winner_id = null
        if (game.home_score > game.away_score) {
          winner_id = game.home_team?.id
        } else if (game.away_score > game.home_score) {
          winner_id = game.away_team?.id
        }

        await bracketApi.updateMatch(linkedBracketMatch.id, {
          team1_score: game.home_score,
          team2_score: game.away_score,
          status: 'completed',
          winner_id,
        })
        
        setBracketSynced(true)
        console.log('Bracket match auto-synced')
      } catch (error) {
        console.error('Failed to auto-sync to bracket:', error)
      }
    }
    
    // Update team records (only for league games)
    if (!standalone && game.home_team?.id && game.away_team?.id && originalRecords.home && originalRecords.away) {
      try {
        const homeWon = game.home_score > game.away_score
        const awayWon = game.away_score > game.home_score
        const tied = game.home_score === game.away_score
        
        await teamApi.update(game.home_team.id, {
          wins: originalRecords.home.wins + (homeWon ? 1 : 0),
          losses: originalRecords.home.losses + (awayWon ? 1 : 0),
          ties: (originalRecords.home.ties || 0) + (tied ? 1 : 0),
          points_for: (originalRecords.home.points_for || 0) + game.home_score,
          points_against: (originalRecords.home.points_against || 0) + game.away_score,
        })
        
        await teamApi.update(game.away_team.id, {
          wins: originalRecords.away.wins + (awayWon ? 1 : 0),
          losses: originalRecords.away.losses + (homeWon ? 1 : 0),
          ties: (originalRecords.away.ties || 0) + (tied ? 1 : 0),
          points_for: (originalRecords.away.points_for || 0) + game.away_score,
          points_against: (originalRecords.away.points_against || 0) + game.home_score,
        })
        
        console.log('Team records updated in database')
      } catch (err) {
        console.error('Failed to update team records:', err)
      }
    }
  }

  // Quarter change functions
  async function nextQuarter() {
    console.log('nextQuarter called, current quarter:', game.quarter)
    
    // Handle extended OT periods (OT2, OT3, etc.)
    if (game.quarter?.startsWith('OT') && game.quarter !== 'OT') {
      // In extended OT, next is Final
      await finalizeGame()
      return
    }
    
    const currentIndex = QUARTERS.indexOf(game.quarter)
    console.log('currentIndex:', currentIndex)
    if (currentIndex === -1 || currentIndex >= QUARTERS.length - 1) return
    
    const nextQ = QUARTERS[currentIndex + 1]
    
    // Handle special transitions
    if (nextQ === 'Q1') {
      // Starting the game from Pregame
      await updateGame({ quarter: nextQ, game_time: '15:00' })
      setGameStatus(null)
    } else if (nextQ === 'Halftime') {
      // Going to halftime - set 13 min timer and show halftime status
      await updateGame({ quarter: nextQ, game_time: '13:00' })
      setGameStatus('halftime-show')
      stopTimer()
      setPossession(null)
      setHideDownDistance(true)
    } else if (nextQ === 'Q3') {
      // Coming out of halftime - go to Q3
      await updateGame({ quarter: nextQ, game_time: '15:00' })
      setGameStatus(null)
      resetTimeoutsForHalf()
    } else if (nextQ === 'OT') {
      // Check if game is tied - if not, go straight to Final
      if (game.home_score !== game.away_score) {
        // Game not tied, skip OT and go to Final
        await finalizeGame()
        return
      }
      // Overtime - typically shorter time
      await updateGame({ quarter: nextQ, game_time: '10:00' })
      setGameStatus(null)
    } else if (nextQ === 'Final') {
      // Game over
      await finalizeGame()
    } else {
      // Regular quarter change (Q1->Q2, Q3->Q4)
      await updateGame({ quarter: nextQ, game_time: '15:00' })
      setGameStatus(null)
    }
  }

  async function prevQuarter() {
    // Handle extended OT periods (OT2, OT3, etc.)
    if (game.quarter?.startsWith('OT') && game.quarter !== 'OT') {
      // Go back to previous OT or OT1
      const otNum = parseInt(game.quarter.replace('OT', '')) || 2
      if (otNum > 2) {
        await updateGame({ quarter: `OT${otNum - 1}`, game_time: '10:00' })
      } else {
        await updateGame({ quarter: 'OT', game_time: '10:00' })
      }
      setGameStatus(null)
      return
    }
    
    const currentIndex = QUARTERS.indexOf(game.quarter)
    if (currentIndex <= 0) return // Can't go before Pregame
    
    const prevQ = QUARTERS[currentIndex - 1]
    
    // Handle special transitions
    if (prevQ === 'Pregame') {
      await updateGame({ quarter: prevQ, game_time: '0:00' })
      setGameStatus('pregame')
    } else if (prevQ === 'Halftime') {
      await updateGame({ quarter: prevQ, game_time: '13:00' })
      setGameStatus('halftime-show')
      setPossession(null)
      setHideDownDistance(true)
    } else if (game.quarter === 'Halftime') {
      // Going back from halftime to Q2
      await updateGame({ quarter: prevQ, game_time: '0:00' })
      setGameStatus(null)
    } else if (game.quarter === 'Final') {
      // Going back from Final
      await updateGame({ quarter: prevQ })
      setGameStatus(null)
    } else {
      await updateGame({ quarter: prevQ, game_time: '15:00' })
      setGameStatus(null)
    }
  }

  // Timer functions
  function parseTime(timeStr) {
    if (!timeStr) return 0
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function startTimer() {
    if (timerRunningRef.current) return
    timerRunningRef.current = true
    setTimerRunning(true)
    
    // Save timer state to backend for persistence
    const currentSeconds = parseTime(game?.game_time || '15:00')
    api.update(gameId, { 
      timer_running: true, 
      timer_started_at: new Date().toISOString(),
      timer_started_seconds: currentSeconds
    }).catch(() => {})
    
    // Tick immediately, then schedule next
    doGameTick()
  }
  
  function doGameTick() {
    if (!timerRunningRef.current) return
    
    // Get current game state from ref (always up-to-date)
    const currentGame = gameRef.current
    if (!currentGame) return
    
    const currentSeconds = parseTime(currentGame.game_time)
    const newSeconds = Math.max(0, currentSeconds - 1)
    const newTime = formatTime(newSeconds)
    
    // Update local state only (backend calculates from timer_started_at)
    setGame(prev => prev ? { ...prev, game_time: newTime } : prev)
    
    // Handle end of clock
    if (newSeconds <= 0) {
      timerRunningRef.current = false
      setTimerRunning(false)
      api.update(gameId, { game_time: '0:00', timer_running: false }).catch(() => {})
      if (['Q1', 'Q2', 'Q3'].includes(currentGame.quarter)) {
        setGameStatus('end-quarter')
      } else if (currentGame.quarter === 'Q4') {
        if (currentGame.home_score === currentGame.away_score) {
          setGameStatus('end-quarter')
        } else {
          api.update(gameId, { quarter: 'Final' }).catch(() => {})
          setGameStatus('final')
          setPossession(null)
          setHideDownDistance(true)
        }
      } else if (currentGame.quarter === 'OT' || currentGame.quarter?.startsWith('OT')) {
        setGameStatus('end-quarter')
      }
      return
    }
    
    // Handle 2-minute warning
    if (newSeconds === 120 && ['Q2', 'Q4'].includes(currentGame.quarter)) {
      timerRunningRef.current = false
      setTimerRunning(false)
      setShow2MinWarningPrompt(true)
      api.update(gameId, { game_time: newTime, timer_running: false }).catch(() => {})
      return
    }
    
    // Sync to server periodically (every 5 seconds) to trigger WebSocket broadcasts
    // Backend calculates live time from timer_started_at, so we don't send game_time
    if (newSeconds % 5 === 0) {
      api.update(gameId, { quarter: currentGame.quarter }).catch(() => {})
    }
    
    // Schedule next tick
    if (timerRunningRef.current) {
      setTimeout(doGameTick, 1000)
    }
  }

  function stopTimer() {
    timerRunningRef.current = false
    setTimerRunning(false)
    // Ignore WebSocket game_time updates for 2 seconds to prevent race conditions
    ignoreWsTimeUntilRef.current = Date.now() + 2000
    // Save stopped state AND current time to backend
    const currentTime = gameRef.current?.game_time || game?.game_time
    if (currentTime) {
      api.update(gameId, { timer_running: false, game_time: currentTime }).catch(() => {})
    } else {
      api.update(gameId, { timer_running: false }).catch(() => {})
    }
    return currentTime
  }

  function toggleTimer() {
    if (timerRunning) {
      stopTimer() // stopTimer now syncs time to backend
    } else {
      startTimer()
    }
  }

  // Timer adjustment functions - immediately updates time
  function adjustGameTime(seconds) {
    const currentSeconds = parseTime(game.game_time)
    const newSeconds = Math.max(0, Math.min(900, currentSeconds + seconds)) // Max 15:00
    const newTime = formatTime(newSeconds)
    setGame(prev => ({ ...prev, game_time: newTime }))
    updateGame({ game_time: newTime })
  }

  // Play clock functions
  function startPlayClock(forceSeconds = null) {
    if (playClockRunningRef.current) return
    playClockRunningRef.current = true
    setPlayClockRunning(true)
    if (forceSeconds !== null) {
      setPlayClock(forceSeconds)
      playClockRef.current = forceSeconds
    }
    // Tick immediately
    doPlayClockTick()
  }
  
  function doPlayClockTick() {
    if (!playClockRunningRef.current) return
    
    setPlayClock(prev => {
      const newSeconds = Math.max(0, prev - 1)
      playClockRef.current = newSeconds // Keep ref in sync
      if (newSeconds <= 0) {
        playClockRunningRef.current = false
        setPlayClockRunning(false)
        return 0
      }
      return newSeconds
    })
    
    // Schedule next tick outside state update
    if (playClockRunningRef.current) {
      setTimeout(doPlayClockTick, 1000)
    }
  }

  function stopPlayClock() {
    playClockRunningRef.current = false
    setPlayClockRunning(false)
  }

  function resetPlayClock(seconds = 40) {
    stopPlayClock()
    setPlayClock(seconds)
    playClockRef.current = seconds
  }

  function adjustPlayClock(seconds) {
    const newSeconds = Math.max(0, Math.min(99, playClock + seconds))
    setPlayClock(newSeconds)
    playClockRef.current = newSeconds
  }

  function togglePlayClock() {
    if (playClockRunning) {
      stopPlayClock()
    } else {
      startPlayClock()
    }
  }

  // Down & Distance functions
  function nextDown() {
    if (down < 4) {
      setDown(down + 1)
    } else {
      // 4th down - show turnover on downs confirmation, don't auto-toggle
      stopTimer()
      setShowTurnover('downs')
      setPendingTurnoverReview('downs')
    }
  }

  function resetDowns() {
    setDown(1)
    setDistance(10)
    setSpecialDistance(null)
  }

  function togglePossession() {
    setPossession(prev => prev === 'home' ? 'away' : 'home')
    resetDowns()
  }

  function cyclePossession() {
    // Cycle through: home -> away -> null -> home
    setPossession(prev => {
      if (prev === 'home') return 'away'
      if (prev === 'away') return null
      return 'home'
    })
  }

  function getDownText() {
    const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1]
    
    // If showDownOnly is enabled, just show "2nd DOWN" format
    if (showDownOnly) {
      return `${ordinal} DOWN`
    }
    
    let distText
    if (specialDistance === 'goal') {
      distText = 'Goal'
    } else if (specialDistance === 'inches') {
      distText = 'Inches'
    } else {
      distText = distance
    }
    return `${ordinal} & ${distText}`
  }

  function getDistanceDisplay() {
    if (specialDistance === 'goal') return 'Goal'
    if (specialDistance === 'inches') return 'Inches'
    return distance
  }

  // Timeout functions
  function useTimeout(team) {
    if (team === 'home' && homeTimeouts > 0) {
      const usedIndex = homeTimeouts // The timeout being used (before decrement)
      setUsedTimeoutIndex(usedIndex)
      setHomeTimeouts(prev => prev - 1)
      stopTimer() // Stop game clock on timeout
      stopPlayClock()
      // Show timeout animation and duration choice immediately
      setTimeoutTeam('home')
      setShowTimeoutDisplay(true)
      setPendingTimeoutDuration('home')
      // Auto-hide timeout overlay after 5-10 seconds (min 5, max 10)
      setTimeout(() => {
        setShowTimeoutDisplay(false)
      }, 5000) // Min 5 seconds
      setTimeout(() => {
        setShowTimeoutDisplay(false)
        setTimeoutTeam(null)
      }, 10000) // Max 10 seconds - force hide
    } else if (team === 'away' && awayTimeouts > 0) {
      const usedIndex = awayTimeouts // The timeout being used (before decrement)
      setUsedTimeoutIndex(usedIndex)
      setAwayTimeouts(prev => prev - 1)
      stopTimer()
      stopPlayClock()
      // Show timeout animation and duration choice immediately
      setTimeoutTeam('away')
      setShowTimeoutDisplay(true)
      setPendingTimeoutDuration('away')
      // Auto-hide timeout overlay after 5-10 seconds (min 5, max 10)
      setTimeout(() => {
        setShowTimeoutDisplay(false)
      }, 5000) // Min 5 seconds
      setTimeout(() => {
        setShowTimeoutDisplay(false)
        setTimeoutTeam(null)
      }, 10000) // Max 10 seconds - force hide
    }
  }

  function startTimeoutClock(seconds) {
    setTimeoutClock(seconds)
    setPendingTimeoutDuration(null) // Hide duration options once clock starts
    timeoutClockRunningRef.current = true
    // Schedule first tick after 1 second (don't tick immediately for timeout - it shows the full duration first)
    setTimeout(doTimeoutTick, 1000)
  }
  
  function doTimeoutTick() {
    if (!timeoutClockRunningRef.current) return
    
    setTimeoutClock(prev => {
      if (prev === null || prev <= 1) {
        timeoutClockRunningRef.current = false
        // Auto-end timeout when timer hits 0
        setTimeout(() => {
          endTimeout()
        }, 500) // Small delay so user sees 0:00
        return 0
      }
      return prev - 1
    })
    
    // Schedule next tick outside state update
    if (timeoutClockRunningRef.current) {
      setTimeout(doTimeoutTick, 1000)
    }
  }

  function endTimeout() {
    timeoutClockRunningRef.current = false
    setShowTimeoutDisplay(false)
    setTimeoutTeam(null)
    setUsedTimeoutIndex(null)
    setPendingTimeoutDuration(null)
    setTimeoutClock(null)
    
    // Force immediate sync to clear timeout on display
    api.update(gameId, { 
      display_state: JSON.stringify({ showTimeoutDisplay: false, timeoutTeam: null, timeoutClock: null })
    }).catch(() => {})
  }

  function hideTimeoutDisplay() {
    endTimeout()
  }

  // Subtract timeout without animation (silent)
  function subtractTimeout(team) {
    if (team === 'home' && homeTimeouts > 0) {
      setHomeTimeouts(prev => prev - 1)
    } else if (team === 'away' && awayTimeouts > 0) {
      setAwayTimeouts(prev => prev - 1)
    }
  }

  function restoreTimeout(team) {
    if (team === 'home' && homeTimeouts < 3) {
      setHomeTimeouts(prev => prev + 1)
    } else if (team === 'away' && awayTimeouts < 3) {
      setAwayTimeouts(prev => prev + 1)
    }
  }

  function resetTimeoutsForHalf(forOT = false) {
    const count = forOT ? 2 : 3
    setHomeTimeouts(count)
    setAwayTimeouts(count)
    updateGame({ home_timeouts: count, away_timeouts: count })
  }

  // Whistle sound URL - real referee whistle sound
  const WHISTLE_URL = 'https://cdn.freesound.org/previews/536/536782_10502997-lq.mp3'
  
  // Track if holding whistle
  const whistleHoldTimer = useRef(null)
  const whistleIsHolding = useRef(false)
  
  // Load whistle sound on mount
  useEffect(() => {
    const loadWhistle = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        whistleAudioCtx.current = ctx
        
        const response = await fetch(WHISTLE_URL)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        whistleBuffer.current = audioBuffer
        setWhistleLoaded(true)
      } catch (error) {
        console.error('Failed to load whistle sound:', error)
      }
    }
    loadWhistle()
    
    return () => {
      if (whistleAudioCtx.current) {
        whistleAudioCtx.current.close()
      }
    }
  }, [])
  
  // Start whistle on press - plays short burst, but if held continues
  function startWhistle() {
    if (!whistleBuffer.current || !whistleAudioCtx.current) return
    
    // Resume context if suspended
    if (whistleAudioCtx.current.state === 'suspended') {
      whistleAudioCtx.current.resume()
    }
    
    // Stop any existing whistle
    stopWhistleImmediate()
    
    whistleIsHolding.current = true
    
    // Create new source and gain
    const source = whistleAudioCtx.current.createBufferSource()
    const gain = whistleAudioCtx.current.createGain()
    
    source.buffer = whistleBuffer.current
    source.loop = true // Loop for held whistle
    source.connect(gain)
    gain.connect(whistleAudioCtx.current.destination)
    gain.gain.value = 0.8
    
    whistleSource.current = source
    whistleGain.current = gain
    
    source.start(0)
  }
  
  // Stop whistle with fade out
  function stopWhistle() {
    whistleIsHolding.current = false
    
    if (whistleSource.current && whistleGain.current && whistleAudioCtx.current) {
      try {
        // Quick fade out
        const now = whistleAudioCtx.current.currentTime
        whistleGain.current.gain.setValueAtTime(whistleGain.current.gain.value, now)
        whistleGain.current.gain.linearRampToValueAtTime(0, now + 0.08)
        
        const sourceToStop = whistleSource.current
        setTimeout(() => {
          try {
            sourceToStop?.stop()
          } catch (e) {}
        }, 100)
        
        whistleSource.current = null
        whistleGain.current = null
      } catch (e) {}
    }
  }
  
  // Stop whistle immediately (no fade)
  function stopWhistleImmediate() {
    whistleIsHolding.current = false
    if (whistleSource.current) {
      try {
        whistleSource.current.stop()
      } catch (e) {}
      whistleSource.current = null
      whistleGain.current = null
    }
  }
  
  // Simple click handler for quick whistle
  function playWhistleClick() {
    if (!whistleBuffer.current || !whistleAudioCtx.current) return
    
    if (whistleAudioCtx.current.state === 'suspended') {
      whistleAudioCtx.current.resume()
    }
    
    const source = whistleAudioCtx.current.createBufferSource()
    const gain = whistleAudioCtx.current.createGain()
    
    source.buffer = whistleBuffer.current
    source.connect(gain)
    gain.connect(whistleAudioCtx.current.destination)
    gain.gain.value = 0.8
    
    // Play for ~0.5 seconds then fade
    const now = whistleAudioCtx.current.currentTime
    gain.gain.setValueAtTime(0.8, now)
    gain.gain.setValueAtTime(0.8, now + 0.4)
    gain.gain.linearRampToValueAtTime(0, now + 0.5)
    
    source.start(0)
    source.stop(now + 0.55)
  }

  function playBuzzer() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const now = audioCtx.currentTime
    
    // Stadium horn/buzzer - multiple frequencies for richness
    const frequencies = [110, 138.59, 164.81] // A2, C#3, E3 - A major chord low
    
    frequencies.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      const distortion = audioCtx.createWaveShaper()
      
      // Sawtooth for harsh buzzer sound
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)
      
      // Add slight detuning for thickness
      osc.detune.value = (i - 1) * 10
      
      // Distortion curve for that harsh stadium sound
      const curve = new Float32Array(256)
      for (let j = 0; j < 256; j++) {
        const x = (j / 128) - 1
        curve[j] = Math.tanh(x * 2)
      }
      distortion.curve = curve
      
      osc.connect(distortion)
      distortion.connect(gain)
      gain.connect(audioCtx.destination)
      
      // Envelope - quick attack, sustain, quick release
      const volume = 0.15
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(volume, now + 0.05)
      gain.gain.setValueAtTime(volume, now + 1.4)
      gain.gain.linearRampToValueAtTime(0, now + 1.5)
      
      osc.start(now)
      osc.stop(now + 1.5)
    })
    
    // Add a low sub-bass rumble
    const subOsc = audioCtx.createOscillator()
    const subGain = audioCtx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.value = 55 // A1
    subOsc.connect(subGain)
    subGain.connect(audioCtx.destination)
    subGain.gain.setValueAtTime(0, now)
    subGain.gain.linearRampToValueAtTime(0.2, now + 0.05)
    subGain.gain.setValueAtTime(0.2, now + 1.4)
    subGain.gain.linearRampToValueAtTime(0, now + 1.5)
    subOsc.start(now)
    subOsc.stop(now + 1.5)
  }

  // Flag/Penalty functions
  const filteredPenalties = NFL_PENALTIES.filter(p => 
    p.name.toLowerCase().includes(penaltySearch.toLowerCase())
  )

  // Add a penalty to the selection (supports multiple)
  function addPenaltyToSelection(penalty, team) {
    // Check if this exact penalty+team combo already exists
    const exists = selectedPenalties.some(p => p.penalty.name === penalty.name && p.team === team)
    if (!exists) {
      setSelectedPenalties([...selectedPenalties, { penalty, team }])
    }
  }

  // Remove a penalty from selection
  function removePenaltyFromSelection(index) {
    setSelectedPenalties(selectedPenalties.filter((_, i) => i !== index))
  }

  // Stage 1: Show just "FLAG" text on display
  function showFlagStage1() {
    setFlagDisplayStage(1)
    // Stop game clock and play clock when flag is thrown
    stopTimer()
    setShowPlayClock(false)
  }

  // Stage 2: Show full penalty details with team highlight (no D&D update yet)
  function showFlagStage2() {
    if (selectedPenalties.length === 0) return
    
    const penaltyRecords = selectedPenalties.map((sp, idx) => ({
      id: Date.now() + idx,
      team: sp.team,
      teamName: sp.team === 'home' ? game.home_team.name : game.away_team.name,
      teamAbbreviation: sp.team === 'home' ? game.home_team.abbreviation : game.away_team.abbreviation,
      teamColor: sp.team === 'home' ? game.home_team.color : game.away_team.color,
      teamLogo: sp.team === 'home' ? game.home_team.logo_url : game.away_team.logo_url,
      name: sp.penalty.name,
      yards: sp.penalty.yards,
      quarter: game.quarter,
      time: game.game_time,
    }))
    
    setDisplayedPenalties(penaltyRecords)
    setFlagDisplayStage(2)
    setPenalties([...penaltyRecords, ...penalties])
  }

  // Apply penalty - update D&D based on penalty and hide flag
  function applyPenalty() {
    // Track penalties in quick stats
    selectedPenalties.forEach(sp => {
      setQuickStats(s => ({
        ...s,
        [sp.team]: {
          ...s[sp.team],
          penalties: s[sp.team].penalties + 1,
          penaltyYards: s[sp.team].penaltyYards + (sp.penalty.yards || 0)
        }
      }))
    })
    
    // Update D&D based on penalty only when Apply is clicked
    // Don't change anything if it's "&Goal" - half the distance to goal is handled manually
    if (specialDistance !== 'goal' && selectedPenalties.length > 0) {
      // For simplicity, use the first penalty if multiple
      const sp = selectedPenalties[0]
      const penalty = sp.penalty
      const penaltyOnOffense = (sp.team === 'home' && possession === 'home') || 
                               (sp.team === 'away' && possession === 'away')
      
      if (penalty.autoFirst && !penaltyOnOffense) {
        // Defensive penalty with auto first down
        setDown(1)
        setDistance(10)
        setSpecialDistance(null)
      } else if (penalty.lossOfDown && penaltyOnOffense) {
        // Offensive penalty with loss of down
        if (down < 4) {
          setDown(down + 1)
          // Distance increases by penalty yards
          const newDist = distance + penalty.yards
          setDistance(Math.min(newDist, 99))
        }
      } else if (penaltyOnOffense && penalty.yards > 0) {
        // Offensive penalty - add yards to distance (replay down)
        const newDist = distance + penalty.yards
        setDistance(Math.min(newDist, 99))
        setSpecialDistance(null)
      } else if (!penaltyOnOffense && penalty.yards > 0) {
        // Defensive penalty - subtract yards from distance
        const newDist = distance - penalty.yards
        if (newDist <= 0) {
          // Automatic first down
          setDown(1)
          setDistance(10)
          setSpecialDistance(null)
        } else {
          setDistance(newDist)
        }
      }
    }
    
    // If we're on 4th down after penalty, reset goingForIt to show options again
    // (penalty on 4th down play means they get another chance to decide)
    if (down === 4) {
      setGoingForIt(false)
    }
    
    // Hide flag from display
    hideFlagFromDisplay()
  }

  // Stage 3: Hide flag and reset panel (penalty applied)
  function showFlagStage3() {
    hideFlagFromDisplay()
  }

  function hideFlagFromDisplay() {
    // Set all flag-related state to cleared values
    setFlagDisplayStage(0)
    setDisplayedPenalties([])
    setSelectedPenalties([])
    setPenaltySearch('')
    setNoTeamFlagText('')
    setFlagResult(null)
    setDeclinedPenaltyIndex(null)
    
    // Force immediate sync with cleared flag state for separate viewer pages
    const clearedDisplayState = JSON.stringify({
      bigPlay,
      flagDisplayStage: 0,
      displayedPenalties: [],
      noTeamFlagText: '',
      flagResult: null,
      declinedPenaltyIndex: null,
      reviewDisplayStage,
      reviewReason,
      reviewCallOnField,
      reviewResult,
      showTimeoutDisplay,
      timeoutTeam,
      usedTimeoutIndex,
      timeoutClock,
      scoreCelebration,
      showTouchback,
      showOnsideKick,
      showFirstDown,
      showIncomplete,
      showOutOfBounds,
      showTurnoverOnDowns,
      showFumbleRecovery,
      showRedZone,
      specialDistance,
      gameStatus,
      showLiveIndicator,
      hideDownDistance,
      hideTimeouts,
      kickoffReceiver,
    })
    api.update(gameId, { display_state: clearedDisplayState }).catch(() => {})
  }

  // Show flag with no team (just "FLAG" display with optional custom text)
  function showNoFlagPenalty(text = '') {
    setFlagDisplayStage(1)
    setDisplayedPenalties([])
    setSelectedPenalties([])
    setNoTeamFlagText(text)
    setFlagResult(null)
    setDeclinedPenaltyIndex(null)
    // Stop game clock and play clock when flag is thrown
    stopTimer()
    setShowPlayClock(false)
  }

  // Flag result functions
  function setFlagPickedUp() {
    setFlagResult('picked-up')
    setNoTeamFlagText('FLAG PICKED UP')
    setDeclinedPenaltyIndex(null)
    // Keep flag display showing for a moment then auto-hide
    setTimeout(() => {
      hideFlagFromDisplay()
    }, 3000)
  }

  function setFlagOffsetting() {
    setFlagResult('offsetting')
    setNoTeamFlagText('OFFSETTING PENALTIES - REPLAY DOWN')
    setDeclinedPenaltyIndex(null)
    // Offsetting penalties = replay the down (don't change down number)
    // Keep flag display showing for a moment then auto-hide
    setTimeout(() => {
      hideFlagFromDisplay()
    }, 3000)
  }

  function setFlagDeclined(penaltyIndex = null) {
    setFlagResult('declined')
    setDeclinedPenaltyIndex(penaltyIndex)
    if (penaltyIndex !== null && displayedPenalties[penaltyIndex]) {
      setNoTeamFlagText(`PENALTY DECLINED: ${displayedPenalties[penaltyIndex].name}`)
    } else {
      setNoTeamFlagText('PENALTY DECLINED')
    }
    // Keep flag display showing for a moment then auto-hide
    setTimeout(() => {
      hideFlagFromDisplay()
    }, 3000)
  }

  function clearFlagResult() {
    setFlagResult(null)
    setDeclinedPenaltyIndex(null)
    setNoTeamFlagText('')
  }

  // Review functions
  function showReviewStage1() {
    setReviewDisplayStage(1)
    setReviewResult(null)
    // Hide flag if showing
    setFlagDisplayStage(0)
  }

  function showReviewStage2() {
    setReviewDisplayStage(2)
  }

  function hideReview() {
    setReviewDisplayStage(0)
    setReviewReason('')
    setReviewResult(null)
  }

  function setReviewUpheld() {
    setReviewDisplayStage(2) // Ensure we're at stage 2 to show result
    setReviewResult('upheld')
    // Auto-hide after 4 seconds
    setTimeout(() => {
      hideReview()
    }, 4000)
  }

  function setReviewReversed() {
    setReviewDisplayStage(2) // Ensure we're at stage 2 to show result
    setReviewResult('reversed')
    // Auto-hide after 4 seconds
    setTimeout(() => {
      hideReview()
    }, 4000)
  }

  // Challenge functions
  function startChallenge(team) {
    // Check if team has timeouts remaining
    const timeouts = team === 'home' ? homeTimeouts : awayTimeouts
    if (timeouts === 0) {
      alert(`${team === 'home' ? game.home_team.name : game.away_team.name} has no timeouts remaining for a challenge.`)
      return
    }
    
    setChallengeTeam(team)
    setChallengeStage(1)
    setChallengeActive(true)
    // Hide review if showing
    setReviewDisplayStage(0)
    setFlagDisplayStage(0)
  }

  function challengeUpheld() {
    // Call stands - team loses timeout
    if (challengeTeam === 'home') {
      setHomeTimeouts(prev => Math.max(0, prev - 1))
    } else {
      setAwayTimeouts(prev => Math.max(0, prev - 1))
    }
    // Reset challenge state
    setChallengeStage(0)
    setChallengeActive(false)
    setChallengeTeam(null)
    setReviewReason('')
    setReviewCallOnField('')
  }

  function challengeReversed() {
    // Call overturned - team keeps timeout
    // Reset challenge state
    setChallengeStage(0)
    setChallengeActive(false)
    setChallengeTeam(null)
    setReviewReason('')
    setReviewCallOnField('')
  }

  function cancelChallenge() {
    setChallengeStage(0)
    setChallengeActive(false)
    setChallengeTeam(null)
    setReviewReason('')
    setReviewCallOnField('')
  }

  function copyShareLink() {
    const url = `https://gridiron.kropp.cloud/share/game/${game.share_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Logo upload functions
  async function handleLogoUpload(team, file) {
    if (!file) return
    
    const teamId = team === 'home' ? game.home_team.id : game.away_team.id
    try {
      const result = await teamApi.uploadLogo(teamId, file)
      // Update local game state with new logo
      setGame(prev => ({
        ...prev,
        [team === 'home' ? 'home_team' : 'away_team']: {
          ...prev[team === 'home' ? 'home_team' : 'away_team'],
          logo_url: result.logo_url
        }
      }))
    } catch (error) {
      console.error('Failed to upload logo:', error)
      alert('Failed to upload logo: ' + error.message)
    }
  }

  async function handleLogoDelete(team) {
    const teamId = team === 'home' ? game.home_team.id : game.away_team.id
    try {
      await teamApi.deleteLogo(teamId)
      setGame(prev => ({
        ...prev,
        [team === 'home' ? 'home_team' : 'away_team']: {
          ...prev[team === 'home' ? 'home_team' : 'away_team'],
          logo_url: null
        }
      }))
    } catch (error) {
      console.error('Failed to delete logo:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (!game) {
    return <div className="text-center py-12">Game not found</div>
  }

  // Simple mode timer functions
  const formatSimpleTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const doSimpleTimerTick = () => {
    if (!simpleTimerRunningRef.current) return
    setSimpleTimerSeconds(prev => prev + 1)
    
    // Schedule next tick outside state update
    if (simpleTimerRunningRef.current) {
      setTimeout(doSimpleTimerTick, 1000)
    }
  }

  const toggleSimpleTimer = () => {
    if (simpleTimerRunning) {
      simpleTimerRunningRef.current = false
      setSimpleTimerRunning(false)
      api.update(gameId, { timer_running: false, timer_seconds: simpleTimerSeconds })
    } else {
      simpleTimerRunningRef.current = true
      setSimpleTimerRunning(true)
      api.update(gameId, { timer_running: true })
      // Tick immediately
      doSimpleTimerTick()
    }
  }

  const resetSimpleTimer = () => {
    simpleTimerRunningRef.current = false
    setSimpleTimerRunning(false)
    setSimpleTimerSeconds(0)
    api.update(gameId, { timer_running: false, timer_seconds: 0 })
  }

  // SIMPLE MODE UI
  if (game.simple_mode) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto px-4">
        {/* Floating help button */}
        <div className="fixed bottom-6 right-6 z-50">
          <HelpButton context="scoreboard" className="shadow-lg" />
        </div>

        {/* Simple Mode Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Simple Scoreboard</h1>
          <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* FG Distance Dialog (for keybind) */}
        <Dialog open={showFGDistanceDialog} onOpenChange={setShowFGDistanceDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>🥅 Field Goal Attempt</DialogTitle>
              <DialogDescription>
                Set the distance for the field goal attempt
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Distance adjuster */}
              <div className="flex items-center justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 w-10 p-0 text-lg"
                  onClick={() => setFgDistance(Math.max(18, fgDistance - 5))}
                >-5</Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 w-10 p-0 text-lg"
                  onClick={() => setFgDistance(Math.max(18, fgDistance - 1))}
                >-</Button>
                <span className="text-4xl font-bold text-blue-600 w-20 text-center">{fgDistance}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 w-10 p-0 text-lg"
                  onClick={() => setFgDistance(Math.min(70, fgDistance + 1))}
                >+</Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 w-10 p-0 text-lg"
                  onClick={() => setFgDistance(Math.min(70, fgDistance + 5))}
                >+5</Button>
              </div>
              <p className="text-center text-slate-500">yards</p>
              
              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[20, 25, 30, 35, 40, 45, 50, 55, 60].map(d => (
                  <Button
                    key={d}
                    variant={fgDistance === d ? "default" : "outline"}
                    size="sm"
                    className={fgDistance === d ? "bg-blue-600 hover:bg-blue-700" : ""}
                    onClick={() => setFgDistance(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowFGDistanceDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setShowFGDistanceDialog(false)
                  setShowFGAttempt(true)
                  stopTimer()
                }}
              >
                🥅 Attempt {fgDistance} yd FG
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share This Game</DialogTitle>
              <DialogDescription>
                Share this scoreboard with others using the code or URL below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Share Code */}
              <div className="space-y-2">
                <Label>Share Code</Label>
                <div className="flex gap-2">
                  <Input 
                    value={game.share_code} 
                    readOnly 
                    className="font-mono text-lg tracking-wider"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(game.share_code)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Share URL */}
              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/share/game/${game.share_code}`} 
                    readOnly 
                    className="text-sm"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/game/${game.share_code}`)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Simple Scoreboard Display */}
        <Card className="bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden">
          <CardContent className="p-8">
            {/* Quarter and Timer (if enabled) */}
            {game.timer_enabled && (
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <span className="text-lg font-bold text-slate-400">{game.quarter || 'Q1'}</span>
                </div>
                <div className="text-5xl font-mono font-bold tracking-wider">
                  {formatSimpleTimer(simpleTimerSeconds)}
                </div>
              </div>
            )}
            
            {/* Teams and Scores */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Away Team */}
              <div className="text-center">
                <div 
                  className="h-16 w-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2"
                  style={{ backgroundColor: game.away_team.color }}
                >
                  {game.away_team.logo_url ? (
                    <img src={game.away_team.logo_url} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    game.away_team.abbreviation
                  )}
                </div>
                <p className="font-semibold">{game.away_team.name}</p>
                <p className="text-5xl font-bold mt-2">{game.away_score}</p>
              </div>
              
              {/* VS */}
              <div className="text-center text-slate-500">VS</div>
              
              {/* Home Team */}
              <div className="text-center">
                <div 
                  className="h-16 w-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2"
                  style={{ backgroundColor: game.home_team.color }}
                >
                  {game.home_team.logo_url ? (
                    <img src={game.home_team.logo_url} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    game.home_team.abbreviation
                  )}
                </div>
                <p className="font-semibold">{game.home_team.name}</p>
                <p className="text-5xl font-bold mt-2">{game.home_score}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timer Controls */}
        {game.timer_enabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Timer & Quarter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quarter Selector */}
              <div className="flex items-center justify-center gap-2">
                {[
                  { value: 'Pregame', label: 'Pre', time: '0:00' },
                  { value: 'Q1', label: 'Q1', time: '15:00' },
                  { value: 'Q2', label: 'Q2', time: '15:00' },
                  { value: 'Halftime', label: 'Half', time: '13:00' },
                  { value: 'Q3', label: 'Q3', time: '15:00' },
                  { value: 'Q4', label: 'Q4', time: '15:00' },
                  { value: 'OT', label: 'OT', time: '10:00' },
                  { value: 'Final', label: 'Final', time: '0:00' },
                ].map(q => (
                  <Button
                    key={q.value}
                    size="sm"
                    variant={game.quarter === q.value ? 'default' : 'outline'}
                    onClick={() => {
                      // Stop timer if running
                      stopTimer()
                      // Reset time to quarter default if current time is less
                      const currentSeconds = parseTime(game.game_time)
                      const quarterSeconds = parseTime(q.time)
                      const newTime = currentSeconds < quarterSeconds ? q.time : game.game_time
                      // Update quarter and time
                      api.update(gameId, { quarter: q.value, game_time: newTime })
                      setGame(prev => ({ ...prev, quarter: q.value, game_time: newTime }))
                      // Handle special quarter states
                      if (q.value === 'Halftime') {
                        setGameStatus('halftime-show')
                        setPossession(null)
                        setHideDownDistance(true)
                      } else if (q.value === 'Final') {
                        setGameStatus('final')
                        setPossession(null)
                        setHideDownDistance(true)
                      } else if (q.value === 'Pregame') {
                        setGameStatus('pregame')
                      } else {
                        setGameStatus(null)
                        setHideDownDistance(false)
                      }
                    }}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
              
              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant={simpleTimerRunning ? "destructive" : "default"}
                  onClick={toggleSimpleTimer}
                  className="gap-2"
                >
                  {simpleTimerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {simpleTimerRunning ? 'Pause' : 'Start'}
                </Button>
                <Button size="lg" variant="outline" onClick={resetSimpleTimer}>
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simple Score Controls */}
        <div className="grid grid-cols-2 gap-4">
          {/* Away Team */}
          <Card>
            <CardHeader className="pb-2" style={{ borderLeftWidth: '4px', borderLeftColor: game.away_team.color }}>
              <CardTitle>{game.away_team.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => updateScore('away', Math.max(0, game.away_score - 1))}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-4xl font-bold w-20 text-center">{game.away_score}</span>
                <Button
                  size="lg"
                  onClick={() => updateScore('away', game.away_score + 1)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2, 3, 6, 7].map(pts => (
                  <Button
                    key={pts}
                    size="sm"
                    variant="outline"
                    onClick={() => updateScore('away', game.away_score + pts)}
                  >
                    +{pts}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Home Team */}
          <Card>
            <CardHeader className="pb-2" style={{ borderLeftWidth: '4px', borderLeftColor: game.home_team.color }}>
              <CardTitle>{game.home_team.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => updateScore('home', -1)}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-4xl font-bold w-20 text-center">{game.home_score}</span>
                <Button
                  size="lg"
                  onClick={() => updateScore('home', 1)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2, 3, 6, 7].map(pts => (
                  <Button
                    key={pts}
                    size="sm"
                    variant="outline"
                    onClick={() => updateScore('home', pts)}
                  >
                    +{pts}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reset Scores */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="text-red-500"
            onClick={() => {
              if (confirm('Reset both scores to 0?')) {
                api.update(gameId, { home_score: 0, away_score: 0 })
                setGame(prev => ({ ...prev, home_score: 0, away_score: 0 }))
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Scores
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* First-time tutorial - only shows when game is live */}
      <FirstTimeTutorial context="game" storageKey="tutorial_seen_game" when={game.status === 'live'} />
      
      {/* Floating help button */}
      <div className="fixed bottom-6 right-6 z-50">
        <HelpButton context="game" className="shadow-lg" />
      </div>

      {/* FG Distance Dialog (for keybind) */}
      <Dialog open={showFGDistanceDialog} onOpenChange={setShowFGDistanceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🥅 Field Goal Attempt</DialogTitle>
            <DialogDescription>
              Set the distance for the field goal attempt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Distance adjuster */}
            <div className="flex items-center justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 w-10 p-0 text-lg"
                onClick={() => setFgDistance(Math.max(18, fgDistance - 5))}
              >-5</Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 w-10 p-0 text-lg"
                onClick={() => setFgDistance(Math.max(18, fgDistance - 1))}
              >-</Button>
              <span className="text-4xl font-bold text-blue-600 w-20 text-center">{fgDistance}</span>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 w-10 p-0 text-lg"
                onClick={() => setFgDistance(Math.min(70, fgDistance + 1))}
              >+</Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 w-10 p-0 text-lg"
                onClick={() => setFgDistance(Math.min(70, fgDistance + 5))}
              >+5</Button>
            </div>
            <p className="text-center text-slate-500">yards</p>
            
            {/* Quick select buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[20, 25, 30, 35, 40, 45, 50, 55, 60].map(d => (
                <Button
                  key={d}
                  variant={fgDistance === d ? "default" : "outline"}
                  size="sm"
                  className={fgDistance === d ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => setFgDistance(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowFGDistanceDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowFGDistanceDialog(false)
                setShowFGAttempt(true)
                stopTimer()
              }}
            >
              🥅 Attempt {fgDistance} yd FG
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scoreboard Preview - NOW AT TOP */}
      {game.status === 'live' && (
        <Card className="border-2 border-slate-300 overflow-visible" data-tutorial="display-preview">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Display Preview
            </CardTitle>
            <CardDescription>This is exactly what viewers see on the scoreboard</CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            <GameScoreboardDisplay
              game={game}
              possession={possession}
              down={down}
              distance={distance}
              playClock={playClock}
              homeTimeouts={homeTimeouts}
              awayTimeouts={awayTimeouts}
              gameStatus={gameStatus}
              showLiveIndicator={showLiveIndicator}
              bigPlay={bigPlay}
              flagDisplayStage={flagDisplayStage}
              displayedPenalties={displayedPenalties}
              noTeamFlagText={noTeamFlagText}
              flagResult={flagResult}
              declinedPenaltyIndex={declinedPenaltyIndex}
              reviewDisplayStage={reviewDisplayStage}
              reviewReason={reviewReason}
              reviewCallOnField={reviewCallOnField}
              reviewResult={reviewResult}
              scoreCelebration={scoreCelebration}
              showTouchback={showTouchback}
              showOnsideKick={showOnsideKick}
              showFirstDown={showFirstDown}
              showIncomplete={showIncomplete}
              showOutOfBounds={showOutOfBounds}
              showTurnoverOnDowns={showTurnoverOnDowns}
              showTurnover={showTurnover}
              showFumbleRecovery={showFumbleRecovery}
              showRedZone={showRedZone}
              showTimeoutDisplay={showTimeoutDisplay}
              timeoutTeam={timeoutTeam}
              timeoutClock={timeoutClock}
              specialDistance={specialDistance}
              challengeActive={challengeActive}
              challengeTeam={challengeTeam}
              countdown={countdown}
              showFGAttempt={showFGAttempt}
              fgDistance={fgDistance}
              fgResult={fgResult}
              showPATAttempt={showPATAttempt}
              patResult={patResult}
              showDownOnly={showDownOnly}
              hideDownDistance={hideDownDistance}
              hideTimeouts={hideTimeouts}
              hideScore={hideScore}
              showRecords={showRecords}
              teamRecords={teamRecords}
              displayTitle={displayTitle}
              showDisplayTitle={showDisplayTitle}
              showPlayClock={showPlayClock}
              showCustomMessage={showCustomMessage}
              customMessage={customMessage}
              customMessageColor={customMessageColor}
              kickoffReceiver={kickoffReceiver}
              showKickoffChoice={showKickoffChoice}
              injuryTeam={injuryTeam}
              showInjury={showInjury}
              extraInfo={extraInfo}
              hidePossession={hidePossession}
              hideClock={hideClock}
              displayStats={displayStats}
              quickStats={quickStats}
            />
          </CardContent>
        </Card>
      )}

      {/* Old preview content removed - now using shared GameScoreboardDisplay component */}

      {/* Scoring Controls - Right below preview */}
      {game.status === 'live' && (
        <div className="grid md:grid-cols-2 gap-4" data-tutorial="scoring-panel">
          {/* Away Team Scoring */}
          <Card>
            <CardHeader className="pb-2" style={{ borderLeftWidth: '4px', borderLeftColor: game.away_team.color }}>
              <CardTitle className="flex items-center gap-2">
                {game.away_team.logo_url ? (
                  <img src={game.away_team.logo_url} alt="" className="h-8 w-auto max-w-12 object-contain" />
                ) : (
                  <span 
                    className="text-sm font-bold"
                    style={{ color: game.away_team.color }}
                  >
                    {game.away_team.abbreviation}
                  </span>
                )}
                {game.away_team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Football scoring buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  className={`${showTDPanel === 'away' ? 'bg-green-700 ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold`} 
                  onClick={() => setShowTDPanel(showTDPanel === 'away' ? null : 'away')}
                >
                  +6 TD
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => updateScore('away', 1)}>
                  +1 PAT
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold" onClick={() => score2PT('away')}>
                  +2 2PT
                </Button>
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold" onClick={() => updateScore('away', 3)}>
                  +3 FG
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={() => scoreSafety('away')}>
                  +2 Safety
                </Button>
              </div>
              {/* TD Details Panel */}
              {showTDPanel === 'away' && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-3">
                  {/* Quick TD - no details needed */}
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      updateScore('away', 6)
                      setShowTDPanel(null)
                      setTdYards('')
                      setPendingPAT('away')
                      setHideDownDistance(true)
                    }}
                  >
                    Quick TD (+6)
                  </Button>
                  <div className="text-xs text-center text-slate-500">— or add details —</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Yards"
                      value={tdYards}
                      onChange={(e) => setTdYards(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">yard</span>
                    <div className="flex gap-1 ml-auto">
                      <Button 
                        size="sm"
                        className={`${tdType === 'rush' ? 'bg-amber-600' : 'bg-slate-400'}`}
                        onClick={() => setTdType('rush')}
                      >
                        🏃 Rush
                      </Button>
                      <Button 
                        size="sm"
                        className={`${tdType === 'pass' ? 'bg-blue-600' : 'bg-slate-400'}`}
                        onClick={() => setTdType('pass')}
                      >
                        🏈 Pass
                      </Button>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full border-green-600 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      const yards = tdYards
                      const type = tdType
                      updateScore('away', 6, { yards: yards || null, playType: yards ? type : null })
                      setShowTDPanel(null)
                      setTdYards('')
                      setPendingPAT('away')
                      setHideDownDistance(true)
                    }}
                  >
                    TD with Details {tdYards ? `(${tdYards} yd ${tdType})` : ''}
                  </Button>
                </div>
              )}
              {/* Basic controls */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => updateScore('away', -1)}>
                  <Minus className="h-4 w-4 mr-1" /> 1
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateScore('away', 1)}>
                  <Plus className="h-4 w-4 mr-1" /> 1
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateScore('away', -game.away_score)} className="text-orange-600">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              {/* Timeouts */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Timeouts</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((t) => (
                        <div 
                          key={t}
                          className={`h-3 w-6 rounded-full transition-colors ${t <= awayTimeouts ? 'bg-yellow-400' : 'bg-slate-300'}`}
                        />
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => useTimeout('away')}
                      disabled={awayTimeouts === 0}
                    >
                      Use
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => subtractTimeout('away')}
                      disabled={awayTimeouts === 0}
                      title="Subtract without animation"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => restoreTimeout('away')}
                      disabled={awayTimeouts === 3}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Home Team Scoring */}
          <Card>
            <CardHeader className="pb-2" style={{ borderLeftWidth: '4px', borderLeftColor: game.home_team.color }}>
              <CardTitle className="flex items-center gap-2">
                {game.home_team.logo_url ? (
                  <img src={game.home_team.logo_url} alt="" className="h-8 w-auto max-w-12 object-contain" />
                ) : (
                  <span 
                    className="text-sm font-bold"
                    style={{ color: game.home_team.color }}
                  >
                    {game.home_team.abbreviation}
                  </span>
                )}
                {game.home_team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Football scoring buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  className={`${showTDPanel === 'home' ? 'bg-green-700 ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold`} 
                  onClick={() => setShowTDPanel(showTDPanel === 'home' ? null : 'home')}
                >
                  +6 TD
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => updateScore('home', 1)}>
                  +1 PAT
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold" onClick={() => score2PT('home')}>
                  +2 2PT
                </Button>
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold" onClick={() => updateScore('home', 3)}>
                  +3 FG
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={() => scoreSafety('home')}>
                  +2 Safety
                </Button>
              </div>
              {/* TD Details Panel */}
              {showTDPanel === 'home' && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-3">
                  {/* Quick TD - no details needed */}
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      updateScore('home', 6)
                      setShowTDPanel(null)
                      setTdYards('')
                      setPendingPAT('home')
                      setHideDownDistance(true)
                    }}
                  >
                    Quick TD (+6)
                  </Button>
                  <div className="text-xs text-center text-slate-500">— or add details —</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Yards"
                      value={tdYards}
                      onChange={(e) => setTdYards(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">yard</span>
                    <div className="flex gap-1 ml-auto">
                      <Button 
                        size="sm"
                        className={`${tdType === 'rush' ? 'bg-amber-600' : 'bg-slate-400'}`}
                        onClick={() => setTdType('rush')}
                      >
                        🏃 Rush
                      </Button>
                      <Button 
                        size="sm"
                        className={`${tdType === 'pass' ? 'bg-blue-600' : 'bg-slate-400'}`}
                        onClick={() => setTdType('pass')}
                      >
                        🏈 Pass
                      </Button>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full border-green-600 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      const yards = tdYards
                      const type = tdType
                      updateScore('home', 6, { yards: yards || null, playType: yards ? type : null })
                      setShowTDPanel(null)
                      setTdYards('')
                      setPendingPAT('home')
                      setHideDownDistance(true)
                    }}
                  >
                    TD with Details {tdYards ? `(${tdYards} yd ${tdType})` : ''}
                  </Button>
                </div>
              )}
              {/* Basic controls */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => updateScore('home', -1)}>
                  <Minus className="h-4 w-4 mr-1" /> 1
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateScore('home', 1)}>
                  <Plus className="h-4 w-4 mr-1" /> 1
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateScore('home', -game.home_score)} className="text-orange-600">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              {/* Timeouts */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Timeouts</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((t) => (
                        <div 
                          key={t}
                          className={`h-3 w-6 rounded-full transition-colors ${t <= homeTimeouts ? 'bg-yellow-400' : 'bg-slate-300'}`}
                        />
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => useTimeout('home')}
                      disabled={homeTimeouts === 0}
                    >
                      Use
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => subtractTimeout('home')}
                      disabled={homeTimeouts === 0}
                      title="Subtract without animation"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => restoreTimeout('home')}
                      disabled={homeTimeouts === 3}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clock & Down Controls Row */}
      {game.status === 'live' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Game Clock & Play Clock Controls */}
          <Card data-tutorial="game-clock">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Clock Controls</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Game Clock */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                {/* Timeout Indicator */}
                {showTimeoutDisplay && timeoutClock !== null && (
                  <div className="mb-3 p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        ⏱️ {timeoutTeam === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation} Timeout
                      </span>
                      <span className="text-xl font-mono font-bold text-amber-800 dark:text-amber-300">
                        {Math.floor(timeoutClock / 60)}:{(timeoutClock % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => endTimeout()}
                    >
                      ✕ Cancel Timeout
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Game Clock</span>
                  <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{game.game_time}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    size="lg"
                    className={`flex-1 gap-2 ${timerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={toggleTimer}
                  >
                    {timerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    {timerRunning ? 'Stop' : 'Start'}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => adjustGameTime(-60)}>-60</Button>
                  <Button variant="outline" size="sm" onClick={() => adjustGameTime(-1)}>-1</Button>
                  <Button variant="outline" size="sm" onClick={() => adjustGameTime(1)}>+1</Button>
                  <Button variant="outline" size="sm" onClick={() => adjustGameTime(60)}>+60</Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={hideClock ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                    onClick={() => setHideClock(!hideClock)}
                  >
                    {hideClock ? '👁️' : '🙈'}
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={prevQuarter}
                    disabled={game.quarter === 'Pregame'}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{game.quarter}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={nextQuarter}
                    disabled={game.quarter === 'Final'}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Start Quarter Button - clears end-quarter/halftime status and starts clock */}
                {/* Don't show if game is Final, Q4/OT ended (those have their own UI), or halftime (use kickoff receiver section) */}
                {gameStatus === 'end-quarter' && 
                 game.quarter !== 'Final' && 
                 game.quarter !== 'Q4' &&
                 game.quarter !== 'OT' && !game.quarter?.startsWith('OT') && (
                  <Button 
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      // Advance to next quarter and set appropriate time
                      const currentIndex = QUARTERS.indexOf(game.quarter)
                      const nextQ = QUARTERS[currentIndex + 1]
                      
                      if (nextQ === 'Halftime') {
                        // Update time and quarter together
                        setGame(prev => ({ ...prev, game_time: '13:00', quarter: 'Halftime' }))
                        await updateGame({ game_time: '13:00', quarter: 'Halftime' })
                        setGameStatus('halftime-show')
                        setPossession(null)
                        setHideDownDistance(true)
                      } else if (nextQ) {
                        // Update time and quarter together
                        setGame(prev => ({ ...prev, game_time: '15:00', quarter: nextQ }))
                        await updateGame({ game_time: '15:00', quarter: nextQ })
                        setGameStatus(null)
                      }
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {game.quarter === 'Q2' ? 'Start Halftime' :
                     game.quarter === 'Q1' ? 'Start Q2' :
                     game.quarter === 'Q3' ? 'Start Q4' :
                     'Start Next'}
                  </Button>
                )}
                
              </div>
              
              {/* Play Clock */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Play Clock</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => adjustPlayClock(-1)}
                    >
                      -1
                    </Button>
                    <span className={`text-3xl font-mono font-bold min-w-[3ch] text-center ${playClock <= 5 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                      {playClock}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => adjustPlayClock(1)}
                    >
                      +1
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    size="lg"
                    className={`flex-1 gap-2 ${playClockRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={togglePlayClock}
                  >
                    {playClockRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    {playClockRunning ? 'Stop' : 'Start'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => resetPlayClock(40)}>
                    Reset 40
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => resetPlayClock(25)}>
                    Reset 25
                  </Button>
                  <Button 
                    variant={showPlayClock ? "outline" : "default"}
                    size="sm" 
                    className={`flex-1 ${!showPlayClock ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    onClick={() => setShowPlayClock(!showPlayClock)}
                  >
                    {showPlayClock ? 'Hide' : 'Show'}
                  </Button>
                </div>
                
                {/* Delay of Game and Timeout options - appears when play clock is 0 */}
                {playClock === 0 && (
                  <div className="mt-2 space-y-2">
                    <Button 
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
                      onClick={() => {
                        const delayPenalty = NFL_PENALTIES.find(p => p.name === 'Delay of Game')
                        const offenseTeam = possession || 'home'
                        if (delayPenalty) {
                          const penaltyRecord = {
                            team: offenseTeam,
                            teamName: offenseTeam === 'home' ? game.home_team.name : game.away_team.name,
                            teamAbbreviation: offenseTeam === 'home' ? game.home_team.abbreviation : game.away_team.abbreviation,
                            teamColor: offenseTeam === 'home' ? game.home_team.color : game.away_team.color,
                            teamLogo: offenseTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url,
                            name: delayPenalty.name,
                            yards: delayPenalty.yards,
                            quarter: game.quarter,
                            time: game.game_time,
                          }
                          setSelectedPenalties([{ penalty: delayPenalty, team: offenseTeam }])
                          setDisplayedPenalties([penaltyRecord])
                          setFlagDisplayStage(2)
                          resetPlayClock(40)
                        }
                      }}
                    >
                      🚩 Delay of Game
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Away Team Timeout */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-center" style={{ color: game.away_team?.color }}>
                          {game.away_team?.abbreviation || 'AWY'} TO ({awayTimeouts})
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-xs px-1"
                            style={{ borderColor: game.away_team?.color, color: game.away_team?.color }}
                            onClick={() => {
                              useTimeout('away')
                              startTimeoutClock(30)
                              setPendingTimeoutDuration(null)
                            }}
                            disabled={awayTimeouts === 0}
                          >
                            30s
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-xs px-1"
                            style={{ borderColor: game.away_team?.color, color: game.away_team?.color }}
                            onClick={() => {
                              useTimeout('away')
                              startTimeoutClock(120)
                              setPendingTimeoutDuration(null)
                              setShowAdBreakPrompt(true)
                            }}
                            disabled={awayTimeouts === 0}
                          >
                            2m
                          </Button>
                        </div>
                      </div>
                      {/* Home Team Timeout */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-center" style={{ color: game.home_team?.color }}>
                          {game.home_team?.abbreviation || 'HME'} TO ({homeTimeouts})
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-xs px-1"
                            style={{ borderColor: game.home_team?.color, color: game.home_team?.color }}
                            onClick={() => {
                              useTimeout('home')
                              startTimeoutClock(30)
                              setPendingTimeoutDuration(null)
                            }}
                            disabled={homeTimeouts === 0}
                          >
                            30s
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-xs px-1"
                            style={{ borderColor: game.home_team?.color, color: game.home_team?.color }}
                            onClick={() => {
                              useTimeout('home')
                              startTimeoutClock(120)
                              setPendingTimeoutDuration(null)
                              setShowAdBreakPrompt(true)
                            }}
                            disabled={homeTimeouts === 0}
                          >
                            2m
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Reset Timeouts */}
            <div className="flex items-center justify-center gap-3 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => resetTimeoutsForHalf(game.quarter === 'OT' || game.quarter?.startsWith('OT'))} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Timeouts ({game.quarter === 'OT' || game.quarter?.startsWith('OT') ? '2' : '3'})
              </Button>
              <Button 
                variant={hideTimeouts ? "default" : "outline"} 
                size="sm" 
                className={hideTimeouts ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setHideTimeouts(!hideTimeouts)}
              >
                {hideTimeouts ? "TOs Hidden ✓" : "Hide TOs"}
              </Button>
              <Button 
                variant={hideScore ? "default" : "outline"} 
                size="sm" 
                className={hideScore ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setHideScore(!hideScore)}
              >
                {hideScore ? "Score Hidden ✓" : "Hide Score"}
              </Button>
              {!standalone && teamRecords.home && teamRecords.away && (
                <Button 
                  variant={showRecords ? "default" : "outline"} 
                  size="sm" 
                  className={showRecords ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => setShowRecords(!showRecords)}
                >
                  {showRecords ? "Records Shown ✓" : "Show Records"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

          {/* Down & Distance Controls */}
          <Card data-tutorial="down-distance">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Down & Distance</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Down */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 uppercase mb-1">Down</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{down}</p>
                <div className="flex gap-1 mt-2">
                  <Button variant="outline" size="sm" className="flex-1 px-1" onClick={() => {
                    setDown(Math.max(1, down - 1))
                  }}>-</Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex-1 px-1 ${down === 4 ? 'bg-red-100 border-red-400 text-red-700' : ''}`}
                    onClick={() => {
                      if (down === 4) {
                        // Show turnover on downs confirmation
                        setShowTurnoverOnDownsConfirm(true)
                      } else {
                        setDown(Math.min(4, down + 1))
                      }
                    }}
                  >
                    {down === 4 ? 'TOD' : '+'}
                  </Button>
                </div>
              </div>
              
              {/* Distance */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 uppercase mb-1">Distance</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{getDistanceDisplay()}</p>
                <div className="flex gap-1 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 px-1" 
                    onClick={() => {
                      if (specialDistance) {
                        setSpecialDistance(null)
                      } else {
                        setDistance(Math.max(1, distance - 1))
                      }
                    }}
                  >-</Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 px-1" 
                    onClick={() => {
                      if (specialDistance) {
                        setSpecialDistance(null)
                      } else {
                        setDistance(Math.min(99, distance + 1))
                      }
                    }}
                  >+</Button>
                </div>
                {/* Special Distance Dropdown */}
                <Select 
                  value={specialDistance || 'number'} 
                  onValueChange={(val) => setSpecialDistance(val === 'number' ? null : val)}
                >
                  <SelectTrigger className="mt-2 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Yards</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="inches">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Possession */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase mb-2 text-center">Possession</p>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border-2 transition-all ${
                      possession === 'away' 
                        ? 'ring-2 ring-green-400 shadow-md' 
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: possession === 'away' ? game.away_team.color : `${game.away_team.color}30`,
                      borderColor: game.away_team.color,
                      color: possession === 'away' ? '#fff' : game.away_team.color
                    }}
                    onClick={() => { setPossession('away'); resetDowns(); }}
                  >
                    <span className="text-xs font-bold truncate">{game.away_team.abbreviation}</span>
                    {possession === 'away' && <span className="text-xs">🏈</span>}
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border-2 transition-all ${
                      possession === 'home' 
                        ? 'ring-2 ring-green-400 shadow-md' 
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: possession === 'home' ? game.home_team.color : `${game.home_team.color}30`,
                      borderColor: game.home_team.color,
                      color: possession === 'home' ? '#fff' : game.home_team.color
                    }}
                    onClick={() => { setPossession('home'); resetDowns(); }}
                  >
                    <span className="text-xs font-bold truncate">{game.home_team.abbreviation}</span>
                    {possession === 'home' && <span className="text-xs">🏈</span>}
                  </button>
                </div>
                <button
                  className={`w-full mt-2 py-1.5 px-2 rounded-lg border-2 transition-all text-xs font-bold ${
                    possession === null 
                      ? 'bg-slate-600 border-slate-600 text-white ring-2 ring-slate-400' 
                      : 'bg-transparent border-slate-400 text-slate-600 dark:text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => setPossession(null)}
                >
                  {possession === null ? "No Possession ✓" : "No Possession"}
                </button>
                <button
                  className={`w-full mt-2 py-1.5 px-2 rounded-lg border-2 transition-all text-xs font-bold ${
                    hidePossession 
                      ? 'bg-purple-600 border-purple-600 text-white ring-2 ring-purple-400' 
                      : 'bg-transparent border-purple-400 text-purple-600 dark:text-purple-400 opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => setHidePossession(!hidePossession)}
                >
                  {hidePossession ? "Show Possession 🏈" : "Hide Possession 🏈"}
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="pt-2 border-t space-y-2">
              {/* First Down - Full Width */}
              <Button 
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
                size="sm" 
                onClick={() => {
                  resetDowns()
                  if (!playClockRunning) {
                    setPlayClock(40)
                    startPlayClock(40)
                  }
                  setShowDownOnly(false)
                  setShowFirstDown(true)
                  setTimeout(() => setShowFirstDown(false), 3000)
                  // Track first down in quick stats
                  setQuickStats(s => ({
                    ...s,
                    [possession]: {...s[possession], firstDowns: s[possession].firstDowns + 1}
                  }))
                }}
              >
                ⬇️ First Down!
              </Button>
              
              {/* Other Actions - Grid */}
              <div className="grid grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-400 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    if (!playClockRunning) {
                      setPlayClock(40)
                      startPlayClock(40)
                    }
                    setShowDownOnly(true)
                    nextDown()
                  }}
                >
                  ⏱️ Down
                </Button>
                <Button variant="outline" size="sm" onClick={nextDown}>
                  Next Down
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-400 text-red-700 hover:bg-red-50"
                  onClick={() => setShowTurnover('selecting')}
                >
                  🔄 Turnover
                </Button>
                <Button variant="outline" size="sm" onClick={togglePossession}>
                  Swap Poss.
                </Button>
              </div>
              
              {/* Turnover Type Selection */}
              {showTurnover === 'selecting' && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                    stopTimer()
                    setShowTurnover('downs')
                    setPendingTurnoverReview('downs')
                  }}>Turnover on Downs</Button>
                  <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                    stopTimer()
                    setShowTurnover('interception')
                    setPendingTurnoverReview('interception')
                  }}>Interception</Button>
                  <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                    stopTimer()
                    setShowTurnover('fumble')
                    setPendingTurnoverReview('fumble')
                  }}>Fumble</Button>
                  <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
                    setShowTurnover(null)
                    setGameStatus('punt')
                  }}>Punt</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowTurnover(null)}>✕</Button>
                </div>
              )}
              
              {/* Turnover Active Indicator */}
              {showTurnover && showTurnover !== 'selecting' && (
                <div className="mt-2 text-center text-sm font-bold text-green-600">
                  ✓ {showTurnover.toUpperCase()} shown on display
                </div>
              )}
              
              {/* Toggle Options */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={showDownOnly ? "default" : "outline"} 
                  size="sm" 
                  className={showDownOnly ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                  onClick={() => setShowDownOnly(!showDownOnly)}
                >
                  {showDownOnly ? "Down Only ✓" : "Down Only"}
                </Button>
                <Button 
                  variant={hideDownDistance ? "default" : "outline"} 
                  size="sm" 
                  className={hideDownDistance ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => setHideDownDistance(!hideDownDistance)}
                >
                  {hideDownDistance ? "D&D Hidden ✓" : "Hide D&D"}
                </Button>
              </div>
              
              {/* Quick Play Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-400 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    // Incomplete: stops game clock, resets and starts play clock if not running, advances down
                    stopTimer()
                    if (!playClockRunning) {
                      setPlayClock(40)
                      startPlayClock(40)
                    }
                    nextDown()
                    setShowIncomplete(true)
                    setTimeout(() => setShowIncomplete(false), 2000)
                  }}
                >
                  <span className="mr-2">❌</span>
                  Incomplete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-400 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    // Out of Bounds: stops game clock, resets and starts play clock, advances down, shows down only
                    stopTimer()
                    setPlayClock(40)
                    startPlayClock(40)
                    nextDown()
                    setShowDownOnly(true)
                    setShowOutOfBounds(true)
                    setTimeout(() => setShowOutOfBounds(false), 2000)
                  }}
                >
                  <span className="mr-2">📍</span>
                  Out of Bounds
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Immediate Actions Panel */}
      {game.status === 'live' && (
        <Card className="border-green-400 bg-green-50 dark:bg-slate-900 dark:border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
              <Zap className="h-5 w-5" />
              Immediate Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Start Game - Pregame only */}
            {(game.quarter === 'Pregame' || gameStatus === 'pregame') && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Ready to start?</p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // Set to Q1, kickoff, and update game
                    updateGame({ quarter: 'Q1', game_time: '15:00' })
                    setGameStatus('kickoff')
                    setDown(1)
                    setDistance(10)
                  }}
                >
                  🏈 Start Game (Kickoff Q1)
                </Button>
              </div>
            )}

            {/* Clear Active Status */}
            {gameStatus && !['kickoff', 'punt', 'fg-setup', 'end-quarter', 'halftime-show', 'pregame', 'final'].includes(gameStatus) && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Active: {gameStatus === 'ad-break' ? '📺 Ad Break' : 
                             gameStatus === 'injury' ? '🏥 Injury' :
                             gameStatus === 'injury-timeout' ? '🏥 Injury Timeout' :
                             gameStatus === 'measurement' ? '📏 Measurement' :
                             gameStatus === 'weather' ? '⛈️ Weather Delay' :
                             gameStatus === 'technical' ? '⚠️ Technical' :
                             gameStatus.toUpperCase()}
                  </p>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => setGameStatus(null)}
                  >
                    ✕ Clear
                  </Button>
                </div>
              </div>
            )}
            
            {/* Ad Break Prompt */}
            {showAdBreakPrompt && (
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Commercial Break?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      setShowAdBreakPrompt(false)
                      setGameStatus('ad-break')
                    }}
                  >
                    📺 Ad Break
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-purple-400 text-purple-700 dark:text-purple-400"
                    onClick={() => setShowAdBreakPrompt(false)}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            )}
            
            {/* Timeout Duration Choice */}
            {pendingTimeoutDuration && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  ⏱️ {pendingTimeoutDuration === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation} Timeout - Duration?
                </p>
                {timeoutClock !== null ? (
                  <div className="text-center">
                    <p className="text-3xl font-mono font-bold text-amber-800 dark:text-amber-300">
                      {Math.floor(timeoutClock / 60)}:{(timeoutClock % 60).toString().padStart(2, '0')}
                    </p>
                    <div className="flex gap-2 mt-2 justify-center">
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => endTimeout()}
                      >
                        End Timeout
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => endTimeout()}
                      >
                        ✕ Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          startTimeoutClock(120) // 2 minutes
                          setShowAdBreakPrompt(true)
                          setPendingTimeoutDuration(null)
                        }}
                      >
                        📺 2 Minutes (Ad Break)
                      </Button>
                      <Button 
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={() => {
                          startTimeoutClock(30) // 30 seconds
                          setPendingTimeoutDuration(null)
                        }}
                      >
                        ⚡ 30 Seconds
                      </Button>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => endTimeout()}
                    >
                      Cancel Timeout
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* PAT/2PT after TD */}
            {pendingPAT && (
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  After TD - {pendingPAT === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setKickingTeam(pendingPAT) // Track who is kicking off
                      setShowPATAttempt('pat')
                      setPendingPAT(null)
                    }}
                  >
                    🏈 PAT
                  </Button>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      setKickingTeam(pendingPAT) // Track who is kicking off
                      setShowPATAttempt('2pt')
                      setPendingPAT(null)
                    }}
                  >
                    🏃 2PT
                  </Button>
                  <Button 
                    className="bg-slate-600 hover:bg-slate-700"
                    onClick={() => {
                      setKickingTeam(pendingPAT) // Track who is kicking off
                      setPendingPAT(null)
                      // Skip PAT - go straight to kickoff
                      if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                        setShowOTEndPrompt(true)
                      } else {
                        setKickoffPending(true)
                        setShowAdBreakPrompt(true)
                        setPossession(null)
                        setShowPlayClock(false)
                        setHideDownDistance(true)
                      }
                    }}
                  >
                    ⏭️ Skip
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setReviewReason('Touchdown')
                      showReviewStage1()
                      setReviewDisplayStage(2) // Go straight to stage 2 with details
                    }}
                  >
                    🔍 Review
                  </Button>
                </div>
              </div>
            )}
            
            {/* Flag Result Options - shows when flag is displayed */}
            {flagDisplayStage > 0 && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">🚩 Flag Result</p>
                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    size="sm"
                    className={`text-xs ${flagResult === 'picked-up' ? 'bg-green-700 ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={setFlagPickedUp}
                  >
                    ✓ Picked Up
                  </Button>
                  <Button 
                    size="sm"
                    className={`text-xs ${flagResult === 'offsetting' ? 'bg-orange-600 ring-2 ring-orange-400' : 'bg-orange-500 hover:bg-orange-600'}`}
                    onClick={setFlagOffsetting}
                  >
                    ⚖️ Offsetting
                  </Button>
                  <Button 
                    size="sm"
                    className={`text-xs ${flagResult === 'declined' ? 'bg-slate-600 ring-2 ring-slate-400' : 'bg-slate-500 hover:bg-slate-600'}`}
                    onClick={() => setFlagDeclined(null)}
                  >
                    ✕ Declined
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="border-yellow-500 text-yellow-700 dark:text-yellow-400 text-xs"
                    onClick={hideFlagFromDisplay}
                  >
                    Hide Flag
                  </Button>
                </div>
                {/* Show decline options for specific penalties when multiple are displayed */}
                {displayedPenalties.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Decline specific penalty:</p>
                    <div className="flex flex-wrap gap-1">
                      {displayedPenalties.map((penalty, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="outline"
                          className={`text-xs ${declinedPenaltyIndex === index ? 'bg-slate-200 dark:bg-slate-700 ring-2 ring-slate-400' : ''}`}
                          onClick={() => setFlagDeclined(index)}
                        >
                          ✕ {penalty.name} ({penalty.team === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Injury Options - shows when injury status is active */}
            {gameStatus === 'injury' && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">🏥 Injury</p>
                <div className="flex gap-2 mb-2">
                  <Button 
                    size="sm"
                    variant={injuryTeam === 'away' ? 'default' : 'outline'}
                    className={injuryTeam === 'away' ? '' : 'border-slate-400'}
                    style={injuryTeam === 'away' ? { backgroundColor: game.away_team?.color } : {}}
                    onClick={() => setInjuryTeam(injuryTeam === 'away' ? null : 'away')}
                  >
                    {game.away_team?.abbreviation || 'AWY'}
                  </Button>
                  <Button 
                    size="sm"
                    variant={injuryTeam === 'home' ? 'default' : 'outline'}
                    className={injuryTeam === 'home' ? '' : 'border-slate-400'}
                    style={injuryTeam === 'home' ? { backgroundColor: game.home_team?.color } : {}}
                    onClick={() => setInjuryTeam(injuryTeam === 'home' ? null : 'home')}
                  >
                    {game.home_team?.abbreviation || 'HME'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setGameStatus(null)
                      setInjuryTeam(null)
                    }}
                  >
                    ✓ Clear
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => setGameStatus('injury-timeout')}
                  >
                    🏥 Injury TO
                  </Button>
                </div>
              </div>
            )}
            
            {/* Injury Timeout Options - shows when injury-timeout status is active */}
            {gameStatus === 'injury-timeout' && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">🏥 Injury Timeout Active</p>
                <div className="flex gap-2 mb-2">
                  <Button 
                    size="sm"
                    variant={injuryTeam === 'away' ? 'default' : 'outline'}
                    className={injuryTeam === 'away' ? '' : 'border-slate-400'}
                    style={injuryTeam === 'away' ? { backgroundColor: game.away_team?.color } : {}}
                    onClick={() => setInjuryTeam(injuryTeam === 'away' ? null : 'away')}
                  >
                    {game.away_team?.abbreviation || 'AWY'}
                  </Button>
                  <Button 
                    size="sm"
                    variant={injuryTeam === 'home' ? 'default' : 'outline'}
                    className={injuryTeam === 'home' ? '' : 'border-slate-400'}
                    style={injuryTeam === 'home' ? { backgroundColor: game.home_team?.color } : {}}
                    onClick={() => setInjuryTeam(injuryTeam === 'home' ? null : 'home')}
                  >
                    {game.home_team?.abbreviation || 'HME'}
                  </Button>
                </div>
                <Button 
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setGameStatus(null)
                    setInjuryTeam(null)
                  }}
                >
                  ✓ Clear Injury TO
                </Button>
              </div>
            )}
            
            {/* Two-Minute Warning Prompt */}
            {show2MinWarningPrompt && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">⏱️ Two-Minute Warning?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => {
                      setShow2MinWarningPrompt(false)
                      setGameStatus('two-minute')
                    }}
                  >
                    ⏱️ 2-Min Warning
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-yellow-400 text-yellow-700 dark:text-yellow-400"
                    onClick={() => {
                      setShow2MinWarningPrompt(false)
                      startTimer()
                    }}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            )}
            
            {/* OT Score - End Game Prompt */}
            {showOTEndPrompt && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">🏈 Score in OT - End Game?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowOTEndPrompt(false)
                      updateGame({ quarter: 'Final' })
                      setGameStatus('final')
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    🏁 End Game
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-green-400 text-green-700 dark:text-green-400"
                    onClick={() => {
                      setShowOTEndPrompt(false)
                      // Continue playing - show kickoff/ad break as normal
                      setKickoffPending(true)
                      setShowAdBreakPrompt(true)
                      setPossession(null)
                      setShowPlayClock(false)
                      setHideDownDistance(true)
                    }}
                  >
                    Continue Playing
                  </Button>
                </div>
              </div>
            )}
            
            {/* PAT/2PT Result */}
            {showPATAttempt && !patResult && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {showPATAttempt === 'pat' ? 'PAT Attempt' : '2PT Conversion'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPatResult('good')
                      if (showPATAttempt === 'pat') {
                        updateScore(possession || 'home', 1)
                      } else {
                        score2PT(possession || 'home')
                      }
                      setTimeout(() => {
                        setShowPATAttempt(null)
                        setPatResult(null)
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setKickoffPending(true)
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                        }
                      }, 2000)
                    }}
                  >
                    ✓ Good
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setPatResult('no-good')
                      setTimeout(() => {
                        setShowPATAttempt(null)
                        setPatResult(null)
                        // Check if in OT - show end game prompt (TD still scored even if PAT missed)
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setKickoffPending(true)
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                        }
                      }, 2000)
                    }}
                  >
                    ✗ No Good
                  </Button>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      // Faked - close PAT attempt and resume play
                      setShowPATAttempt(null)
                      setPatResult(null)
                      setHideDownDistance(false)
                      setShowPlayClock(true)
                    }}
                  >
                    🎭 Faked
                  </Button>
                </div>
              </div>
            )}
            
            {/* Field Goal Result */}
            {showFGAttempt && !fgResult && (
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Field Goal Attempt ({fgDistance} yards)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setFgResult('good')
                      const scoringTeam = possession || 'home'
                      const distance = fgDistance
                      updateScore(scoringTeam, 3, { distance })
                      setTimeout(() => {
                        setShowFGAttempt(false)
                        setFgResult(null)
                        setScoreCelebration(null)
                        togglePossession()
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setKickoffPending(true)
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                          setHideDownDistance(true)
                        }
                      }, 5000)
                    }}
                  >
                    ✓ Good
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setFgResult('no-good')
                      setTimeout(() => {
                        setShowFGAttempt(false)
                        setFgResult(null)
                        togglePossession()
                      }, 3000)
                    }}
                  >
                    ✗ No Good
                  </Button>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      // Faked - close FG attempt and resume play
                      setShowFGAttempt(false)
                      setFgResult(null)
                      setHideDownDistance(false)
                      setShowPlayClock(true)
                    }}
                  >
                    🎭 Faked
                  </Button>
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => {
                      setShowFGAttempt(false)
                      setFgResult(null)
                      showFlagStage1()
                    }}
                  >
                    🚩 Penalty
                  </Button>
                </div>
              </div>
            )}
            
            {/* Turnover on Downs Confirmation */}
            {showTurnoverOnDownsConfirm && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Turnover on Downs - Confirm?
                </p>
                <p className="text-xs text-red-700 dark:text-red-400">
                  Possession will switch to {possession === 'home' ? game.away_team?.name : game.home_team?.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="border-red-400 text-red-700"
                    onClick={() => setShowTurnoverOnDownsConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setShowTurnoverOnDownsConfirm(false)
                      stopTimer()
                      setShowTurnover('downs')
                      setBigPlay('turnover-on-downs')
                      setTimeout(() => setBigPlay(null), 4000)
                      togglePossession()
                      setTimeout(() => {
                        setShowTurnover(null)
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    ✓ Confirm Turnover
                  </Button>
                </div>
              </div>
            )}
            
            {/* Turnover Review Option */}
            {pendingTurnoverReview && pendingTurnoverReview !== 'fumble' && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  {pendingTurnoverReview === 'downs' ? 'Turnover on Downs' : 'Interception'} - Review?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Confirm turnover - no review
                      // Track turnover in quick stats (offense loses ball)
                      const offenseTeam = possession
                      setQuickStats(s => ({
                        ...s,
                        [offenseTeam]: {...s[offenseTeam], turnovers: s[offenseTeam].turnovers + 1}
                      }))
                      togglePossession()
                      setPendingTurnoverReview(null)
                      setTimeout(() => { 
                        setShowTurnover(null)
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    ✓ Confirm
                  </Button>
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      // Reversed - show reversed animation then clear
                      setPendingTurnoverReview(null)
                      setShowTurnover('reversed')
                      setTimeout(() => setShowTurnover(null), 3000)
                    }}
                  >
                    ↩️ Reversed
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      // Start review
                      setReviewDisplayStage(1)
                      setReviewReason(pendingTurnoverReview === 'downs' ? 'Turnover on Downs' : 'Interception')
                      setPendingTurnoverReview(null)
                    }}
                  >
                    🔍 Review
                  </Button>
                </div>
                {/* Touchback option for interceptions */}
                {pendingTurnoverReview === 'interception' && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
                    onClick={() => {
                      togglePossession()
                      setPendingTurnoverReview(null)
                      setShowTurnover(null)
                      setShowTouchback(true)
                      setTimeout(() => { 
                        setShowTouchback(false)
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    🏈 Touchback
                  </Button>
                )}
              </div>
            )}
            
            {/* Fumble Review/Recovery Options */}
            {pendingTurnoverReview === 'fumble' && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Fumble - Review or Recovery?</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // No review - show recovery options
                      setPendingTurnoverReview(null)
                      setPendingFumble(true)
                    }}
                  >
                    ✓ Confirm
                  </Button>
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      // Reversed - show reversed animation then clear
                      setPendingTurnoverReview(null)
                      setShowTurnover('reversed')
                      setTimeout(() => setShowTurnover(null), 3000)
                    }}
                  >
                    ↩️ Reversed
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      // Start review
                      setReviewDisplayStage(1)
                      setReviewReason('Fumble')
                      setPendingTurnoverReview(null)
                    }}
                  >
                    🔍 Review
                  </Button>
                </div>
              </div>
            )}
            
            {/* Fumble Recovery Options */}
            {pendingFumble && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Fumble - Who Recovers?</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setPendingFumble(false)
                      setShowFumbleRecovery('offense')
                      setTimeout(() => {
                        setShowTurnover(null)
                        setShowFumbleRecovery(null)
                        // Show ad break prompt after fumble recovery
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    Offense
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      // Track fumble turnover in quick stats (offense loses ball)
                      const offenseTeam = possession
                      setQuickStats(s => ({
                        ...s,
                        [offenseTeam]: {...s[offenseTeam], turnovers: s[offenseTeam].turnovers + 1}
                      }))
                      setPendingFumble(false)
                      togglePossession()
                      setShowFumbleRecovery('defense')
                      setTimeout(() => {
                        setShowTurnover(null)
                        setShowFumbleRecovery(null)
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    Defense
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-red-400 text-red-700 dark:text-red-400"
                    onClick={() => {
                      setPendingFumble(false)
                      setShowFumbleRecovery('oob')
                      setTimeout(() => {
                        setShowTurnover(null)
                        setShowFumbleRecovery(null)
                        // Show ad break prompt after fumble out of bounds
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    Out of Bounds
                  </Button>
                </div>
              </div>
            )}
            
            {/* Kickoff Type Choice - show in Q4 when kicking team is losing or tied */}
            {kickoffPending && game.quarter === 'Q4' && kickingTeam && (
              (kickingTeam === 'home' && game.home_score <= game.away_score) ||
              (kickingTeam === 'away' && game.away_score <= game.home_score)
            ) && !gameStatus && (
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  {kickingTeam === 'home' ? game.home_team.abbreviation : game.away_team.abbreviation} is kicking - What type?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setGameStatus('kickoff-choice')
                    }}
                  >
                    🏈 Regular Kickoff
                  </Button>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      setKickoffPending(false)
                      setScoreCelebration(null)
                      setGameStatus('onside-kick')
                      // Kicking team is the scoring team, receiving team is opponent
                      setKickoffReceiver(kickingTeam === 'home' ? 'away' : 'home')
                      setShowAdBreakPrompt(false)
                      setKickingTeam(null)
                    }}
                  >
                    🎯 Onside Kick
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-400 text-orange-700 dark:text-orange-400"
                  onClick={() => {
                    setKickoffPending(false)
                    setShowAdBreakPrompt(false)
                    setKickingTeam(null)
                  }}
                >
                  Skip Kickoff
                </Button>
              </div>
            )}
            
            {/* Kickoff button after score - normal flow or after choosing regular kickoff */}
            {kickoffPending && (gameStatus === 'kickoff-choice' || !(game.quarter === 'Q4' && kickingTeam && (
              (kickingTeam === 'home' && game.home_score <= game.away_score) ||
              (kickingTeam === 'away' && game.away_score <= game.home_score)
            ))) && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Who receives the kickoff?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="text-white"
                    style={{ backgroundColor: game.away_team.color }}
                    onClick={() => {
                      setKickoffPending(false)
                      setScoreCelebration(null)
                      setGameStatus('kickoff')
                      setKickoffReceiver('away')
                      setShowAdBreakPrompt(false)
                      setKickingTeam(null)
                    }}
                  >
                    {game.away_team.abbreviation}
                  </Button>
                  <Button 
                    className="text-white"
                    style={{ backgroundColor: game.home_team.color }}
                    onClick={() => {
                      setKickoffPending(false)
                      setScoreCelebration(null)
                      setGameStatus('kickoff')
                      setKickoffReceiver('home')
                      setShowAdBreakPrompt(false)
                      setKickingTeam(null)
                    }}
                  >
                    {game.home_team.abbreviation}
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full border-green-400 text-green-700 dark:text-green-400"
                  onClick={() => {
                    setKickoffPending(false)
                    setGameStatus(null)
                    setShowAdBreakPrompt(false)
                    setKickingTeam(null)
                  }}
                >
                  Skip Kickoff
                </Button>
              </div>
            )}
            
            {/* End of Quarter Actions */}
            {gameStatus === 'end-quarter' && game.quarter !== 'Q4' && game.quarter !== 'OT' && !game.quarter?.startsWith('OT') && game.game_time === '0:00' && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">End of {game.quarter}</p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    const currentIndex = QUARTERS.indexOf(game.quarter)
                    const nextQ = QUARTERS[currentIndex + 1]
                    
                    if (nextQ === 'Halftime') {
                      // Update time and quarter together
                      setGame(prev => ({ ...prev, game_time: '13:00', quarter: 'Halftime' }))
                      await updateGame({ game_time: '13:00', quarter: 'Halftime' })
                      setGameStatus('halftime-show')
                      setPossession(null)
                      setHideDownDistance(true)
                      setHideTimeouts(true)
                    } else if (nextQ) {
                      // Update time and quarter together
                      setGame(prev => ({ ...prev, game_time: '15:00', quarter: nextQ }))
                      await updateGame({ game_time: '15:00', quarter: nextQ })
                      setGameStatus(null)
                    }
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {game.quarter === 'Q2' ? 'Start Halftime' :
                   game.quarter === 'Q1' ? 'Start Q2' :
                   game.quarter === 'Q3' ? 'Start Q4' :
                   'Start Next'}
                </Button>
              </div>
            )}
            
            {/* End of Q4 - Not Tied */}
            {gameStatus === 'end-quarter' && game.quarter === 'Q4' && game.home_score !== game.away_score && game.game_time === '0:00' && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">End of Q4</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      updateGame({ quarter: 'Final' })
                      setGameStatus('final')
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    🏁 End Game
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      // Continue to OT even if not tied
                      updateGame({ quarter: 'OT', game_time: '10:00' })
                      setGameStatus('kickoff')
                      resetTimeoutsForHalf(true) // 2 timeouts for OT
                    }}
                  >
                    ⏱️ Continue to OT
                  </Button>
                </div>
              </div>
            )}
            
            {/* End of OT */}
            {gameStatus === 'end-quarter' && (game.quarter === 'OT' || game.quarter?.startsWith('OT')) && game.game_time === '0:00' && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  End of {game.quarter} {game.home_score === game.away_score ? '- Still Tied' : ''}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      updateGame({ quarter: 'Final' })
                      setGameStatus('final')
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    🏁 End Game
                  </Button>
                  {game.home_score === game.away_score && (
                    <Button 
                      className="bg-slate-600 hover:bg-slate-700"
                      onClick={() => {
                        updateGame({ quarter: 'Final/T' })
                        setGameStatus('final')
                        setPossession(null)
                        setHideDownDistance(true)
                      }}
                    >
                      🤝 End as Tie
                    </Button>
                  )}
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      // Continue to next OT period
                      const currentOT = game.quarter === 'OT' ? 1 : parseInt(game.quarter.replace('OT', '')) || 1
                      const nextOT = currentOT + 1
                      updateGame({ quarter: `OT${nextOT}`, game_time: '10:00' })
                      setGameStatus('kickoff')
                      resetTimeoutsForHalf(true) // 2 timeouts for OT
                    }}
                  >
                    ⏱️ Next OT
                  </Button>
                </div>
              </div>
            )}
            
            {/* End of Q4 Tied - OT or End */}
            {gameStatus === 'end-quarter' && game.quarter === 'Q4' && game.home_score === game.away_score && game.game_time === '0:00' && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">End of Regulation - Tied Game</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button 
                    className="bg-slate-600 hover:bg-slate-700"
                    onClick={() => {
                      updateGame({ quarter: 'Final/T' })
                      setGameStatus('final')
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    🤝 End as Tie
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      // Will show kickoff receiver selection
                    }}
                    disabled
                  >
                    ⏱️ Go to OT ↓
                  </Button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">Or select who receives the OT kickoff below</p>
              </div>
            )}
            
            {/* Pregame Countdown Timer */}
            {game.quarter === 'Pregame' && countdown && (
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  {countdown.passed ? '⏰ Scheduled kickoff time passed!' : '⏱️ Time until kickoff:'}
                </p>
                {!countdown.passed && (
                  <div className="flex items-center justify-center gap-1 text-lg font-mono font-bold text-blue-700 dark:text-blue-300">
                    {countdown.days > 0 && (
                      <>
                        <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">{countdown.days}d</span>
                        <span className="text-blue-400">:</span>
                      </>
                    )}
                    <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-blue-400">:</span>
                    <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="text-blue-400">:</span>
                    <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">{String(countdown.seconds).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Kickoff Receiver Selection - shows at start of game, Q3, and OT */}
            {(game.quarter === 'Pregame' || gameStatus === 'halftime-show' || (game.quarter === 'Q4' && game.home_score === game.away_score && gameStatus === 'end-quarter')) && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Who receives the kickoff?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm"
                    className={`${kickoffReceiver === 'home' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-500 hover:bg-slate-600'}`}
                    onClick={() => {
                      setKickoffReceiver('home')
                      setShowKickoffChoice(true)
                    }}
                  >
                    {game.home_team?.abbreviation || 'HOME'}
                  </Button>
                  <Button 
                    size="sm"
                    className={`${kickoffReceiver === 'away' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-500 hover:bg-slate-600'}`}
                    onClick={() => {
                      setKickoffReceiver('away')
                      setShowKickoffChoice(true)
                    }}
                  >
                    {game.away_team?.abbreviation || 'AWAY'}
                  </Button>
                </div>
                {kickoffReceiver && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 text-center">
                    {kickoffReceiver === 'home' ? game.home_team?.name : game.away_team?.name} will receive
                  </p>
                )}
                {/* Start Q1 Kickoff button - during pregame after receiver selected */}
                {game.quarter === 'Pregame' && kickoffReceiver && (
                  <Button 
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      // Update time FIRST, then quarter
                      setGame(prev => ({ ...prev, game_time: '15:00' }))
                      await updateGame({ game_time: '15:00', quarter: 'Q1' })
                      setGameStatus('kickoff')
                      setHideDownDistance(false)
                      setHideTimeouts(false)
                    }}
                  >
                    🏈 Start Q1 Kickoff
                  </Button>
                )}
                {/* Start Q3 Kickoff button - only during halftime after receiver selected */}
                {gameStatus === 'halftime-show' && kickoffReceiver && (
                  <Button 
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      // Update time FIRST, then quarter
                      setGame(prev => ({ ...prev, game_time: '15:00' }))
                      await updateGame({ game_time: '15:00', quarter: 'Q3' })
                      setGameStatus('kickoff')
                      resetTimeoutsForHalf()
                      setHideDownDistance(false)
                      setHideTimeouts(false)
                    }}
                  >
                    🏈 Start Q3 Kickoff
                  </Button>
                )}
              </div>
            )}
            
            {/* Kickoff options - Touchback, Return, OOB, Penalty, Short Free Kick */}
            {gameStatus === 'kickoff' && (
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Kickoff Result</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setPossession(kickoffReceiver)
                      resetDowns()
                      setShowTouchback(true)
                      setShowKickoffChoice(false)
                      setKickoffReceiver(null)
                      setTimeout(() => setShowTouchback(false), 5000)
                    }}
                  >
                    🏈 Touchback
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setGameStatus(null)
                      setShowKickoffChoice(false)
                      stopTimer()
                      setPossession(kickoffReceiver)
                      resetDowns()
                      setKickoffReceiver(null)
                    }}
                  >
                    🏃 Return
                  </Button>
                  <Button 
                    className="bg-slate-600 hover:bg-slate-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setPossession(kickoffReceiver)
                      resetDowns()
                      setShowKickoffChoice(false)
                      setKickoffReceiver(null)
                      setShowOutOfBounds(true)
                      setTimeout(() => setShowOutOfBounds(false), 3000)
                    }}
                  >
                    📍 Out of Bounds
                  </Button>
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setShowKickoffChoice(false)
                      setKickoffReceiver(null)
                      showFlagStage1()
                    }}
                  >
                    🚩 Penalty
                  </Button>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setShowKickoffChoice(false)
                      setKickoffReceiver(null)
                      // Open penalty panel with "Short Free Kick" pre-filled
                      setPenaltySearch('Short Free Kick')
                      showFlagStage1()
                    }}
                  >
                    🚩 Short Free Kick
                  </Button>
                  <Button 
                    className="bg-gray-600 hover:bg-gray-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setShowKickoffChoice(false)
                      setKickoffReceiver(null)
                    }}
                  >
                    ⚫ Dead Ball
                  </Button>
                </div>
              </div>
            )}
            
            {/* Onside Kick options - Recovered by kicking team or receiving team */}
            {gameStatus === 'onside-kick' && (
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">Onside Kick Result</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Kicking team recovers - they keep possession (offense recovers)
                      setGameStatus(null)
                      stopTimer()
                      // Kicking team is opposite of kickoffReceiver
                      const kicking = kickoffReceiver === 'home' ? 'away' : 'home'
                      setPossession(kicking)
                      resetDowns()
                      setShowOnsideKick('offense')
                      setKickoffReceiver(null)
                      setTimeout(() => setShowOnsideKick(null), 4000)
                    }}
                  >
                    ✓ Kicking Team Recovers
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      // Receiving team recovers - normal possession (defense recovers)
                      setGameStatus(null)
                      stopTimer()
                      setPossession(kickoffReceiver)
                      resetDowns()
                      setShowOnsideKick('defense')
                      setKickoffReceiver(null)
                      setTimeout(() => setShowOnsideKick(null), 4000)
                    }}
                  >
                    ✗ Receiving Team Recovers
                  </Button>
                </div>
                <Button 
                  className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => {
                    setGameStatus(null)
                    stopTimer()
                    setShowOnsideKick(null)
                    setKickoffReceiver(null)
                    showFlagStage1()
                  }}
                >
                  🚩 Penalty
                </Button>
              </div>
            )}
            
            {/* Punt options - Touchback, Fair Catch, Return, OOB, Penalty */}
            {gameStatus === 'punt' && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Punt Result</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      togglePossession()
                      setShowTouchback(true)
                      setTimeout(() => { 
                        setShowTouchback(false)
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 5000)
                    }}
                  >
                    🏈 Touchback
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      stopPlayClock()
                      togglePossession()
                      // Check if in OT - show end game prompt
                      if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                        setShowOTEndPrompt(true)
                      } else {
                        setShowAdBreakPrompt(true)
                      }
                    }}
                  >
                    ✋ Fair Catch
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      togglePossession()
                      // Check if in OT - show end game prompt
                      if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                        setShowOTEndPrompt(true)
                      } else {
                        setShowAdBreakPrompt(true)
                      }
                    }}
                  >
                    🏃 Return
                  </Button>
                  <Button 
                    className="bg-slate-600 hover:bg-slate-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      togglePossession()
                      setShowOutOfBounds(true)
                      setTimeout(() => { 
                        setShowOutOfBounds(false)
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setShowAdBreakPrompt(true)
                        }
                      }, 3000)
                    }}
                  >
                    📍 Out of Bounds
                  </Button>
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      showFlagStage1()
                    }}
                  >
                    🚩 Penalty
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setPendingFumble(true)
                    }}
                  >
                    🏈💨 Fumble
                  </Button>
                  <Button 
                    className="bg-gray-600 hover:bg-gray-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      togglePossession()
                      // Check if in OT - show end game prompt
                      if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                        setShowOTEndPrompt(true)
                      } else {
                        setShowAdBreakPrompt(true)
                      }
                    }}
                  >
                    ⚫ Dead Ball
                  </Button>
                </div>
              </div>
            )}
            
            {/* Quick Special Teams / Go For It - only on 4th down */}
            {!kickoffPending && gameStatus !== 'kickoff' && gameStatus !== 'punt' && game.quarter !== 'Pregame' && gameStatus !== 'halftime-show' && !(game.quarter === 'Q4' && game.home_score === game.away_score && gameStatus === 'end-quarter') && !showFGAttempt && down === 4 && !goingForIt && (
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => setGameStatus('punt')}
                >
                  🦶 Punt
                </Button>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => setGameStatus('fg-setup')}
                >
                  🥅 Field Goal
                </Button>
                <Button 
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => setGoingForIt(true)}
                >
                  💪 Go For It
                </Button>
              </div>
            )}
            
            {/* FG Distance Setup */}
            {gameStatus === 'fg-setup' && (
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Field Goal Distance</p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setFgDistance(Math.max(18, fgDistance - 5))}
                  >-5</Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setFgDistance(Math.max(18, fgDistance - 1))}
                  >-</Button>
                  <span className="text-2xl font-bold text-blue-800 dark:text-blue-300 w-12 text-center">{fgDistance}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setFgDistance(Math.min(70, fgDistance + 1))}
                  >+</Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setFgDistance(Math.min(70, fgDistance + 5))}
                  >+5</Button>
                  <span className="text-sm text-blue-700 dark:text-blue-400">yards</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[20, 25, 30, 35, 40, 45, 50, 55].map(d => (
                    <Button
                      key={d}
                      variant={fgDistance === d ? "default" : "outline"}
                      size="sm"
                      className={fgDistance === d ? "bg-blue-600 hover:bg-blue-700" : "border-blue-400 text-blue-700 dark:text-blue-400"}
                      onClick={() => setFgDistance(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="border-slate-400"
                    onClick={() => setGameStatus(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setShowFGAttempt(true)
                      setFgResult(null)
                      setGameStatus(null)
                      stopTimer()
                    }}
                  >
                    🥅 Attempt {fgDistance} yd FG
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Penalty Flag Panel */}
      {game.status === 'live' && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-slate-900 dark:border-yellow-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                <Flag className="h-5 w-5" />
                Penalty Flag
              </CardTitle>
              {/* Stage indicator */}
              {flagDisplayStage > 0 && (
                <span className="text-sm bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded font-medium">
                  Stage {flagDisplayStage}/3
                </span>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
              {/* Three-Stage Flag Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="lg"
                  className={`gap-2 ${flagDisplayStage >= 1 ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-black font-bold`}
                  onClick={showFlagStage1}
                  disabled={flagDisplayStage >= 1}
                >
                  <Flag className="h-5 w-5" />
                  {flagDisplayStage >= 1 ? '✓ FLAG' : 'FLAG'}
                </Button>
                <Button
                  size="lg"
                  className={`gap-2 ${flagDisplayStage >= 2 ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-black font-bold`}
                  onClick={showFlagStage2}
                  disabled={flagDisplayStage >= 2 || selectedPenalties.length === 0}
                >
                  <Eye className="h-5 w-5" />
                  {flagDisplayStage >= 2 ? '✓ Details' : `Details${selectedPenalties.length > 0 ? ` (${selectedPenalties.length})` : ''}`}
                </Button>
                <Button
                  size="lg"
                  className="gap-2 bg-green-500 hover:bg-green-600 text-white font-bold"
                  onClick={applyPenalty}
                  disabled={flagDisplayStage < 2}
                >
                  <Check className="h-5 w-5" />
                  Apply
                </Button>
              </div>
              
              {/* No Team Flag Options */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-yellow-500 text-yellow-700 dark:text-yellow-400 text-xs"
                  onClick={() => showNoFlagPenalty('')}
                >
                  🚩 Flag
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs ${flagResult === 'picked-up' ? 'bg-green-100 dark:bg-green-900 border-green-500' : 'border-green-500 text-green-700 dark:text-green-400'}`}
                  onClick={setFlagPickedUp}
                >
                  ✓ Picked Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs ${flagResult === 'offsetting' ? 'bg-orange-100 dark:bg-orange-900 border-orange-500' : 'border-orange-500 text-orange-700 dark:text-orange-400'}`}
                  onClick={setFlagOffsetting}
                >
                  ⚖️ Offsetting
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs ${flagResult === 'declined' && declinedPenaltyIndex === null ? 'bg-slate-100 dark:bg-slate-800 border-slate-500' : 'border-slate-500 text-slate-700 dark:text-slate-400'}`}
                  onClick={() => setFlagDeclined(null)}
                >
                  ✕ Decline All
                </Button>
              </div>
              
              {/* Individual Decline Options - show when penalties are displayed */}
              {displayedPenalties.length > 0 && flagDisplayStage >= 2 && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Decline individual penalty:</p>
                  <div className="flex flex-wrap gap-1">
                    {displayedPenalties.map((penalty, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        className={`text-xs ${declinedPenaltyIndex === index ? 'bg-slate-300 dark:bg-slate-600 ring-2 ring-slate-400' : 'border-slate-400'}`}
                        onClick={() => setFlagDeclined(index)}
                      >
                        ✕ {penalty.name} ({penalty.team === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation})
                      </Button>
                    ))}
                    {declinedPenaltyIndex !== null && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-green-500 text-green-700 dark:text-green-400"
                        onClick={() => {
                          setFlagResult(null)
                          setDeclinedPenaltyIndex(null)
                        }}
                      >
                        ↩ Undo Decline
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Hide Flag Button */}
              {flagDisplayStage > 0 && (
                <Button
                  variant="outline"
                  className="w-full border-yellow-400 text-yellow-800 dark:text-yellow-400"
                  onClick={hideFlagFromDisplay}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Flag from Display
                </Button>
              )}
              
              {/* Selected Penalties List with Enforcement Options */}
              {selectedPenalties.length > 0 && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                    Selected ({selectedPenalties.length}):
                  </p>
                  <div className="space-y-2">
                    {selectedPenalties.map((sp, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 rounded px-2 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {sp.penalty.name} on <span className="font-bold" style={{ color: sp.team === 'home' ? game.home_team.color : game.away_team.color }}>
                              {sp.team === 'home' ? game.home_team.abbreviation : game.away_team.abbreviation}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">({sp.penalty.yards} yds)</span>
                          </span>
                          <button 
                            onClick={() => removePenaltyFromSelection(idx)}
                            className="text-red-500 hover:text-red-700 font-bold ml-2"
                          >
                            ✕
                          </button>
                        </div>
                        {/* Enforcement options for each penalty */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <input 
                              type="checkbox" 
                              checked={sp.enforce !== false}
                              onChange={(e) => {
                                const updated = [...selectedPenalties]
                                updated[idx] = { ...sp, enforce: e.target.checked }
                                setSelectedPenalties(updated)
                              }}
                              className="w-3 h-3"
                            />
                            Enforce
                          </label>
                          <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <input 
                              type="checkbox" 
                              checked={sp.halfDistance === true}
                              onChange={(e) => {
                                const updated = [...selectedPenalties]
                                updated[idx] = { ...sp, halfDistance: e.target.checked }
                                setSelectedPenalties(updated)
                              }}
                              className="w-3 h-3"
                            />
                            Half the Distance
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Quick actions for multiple penalties */}
                  {selectedPenalties.length > 1 && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        onClick={() => {
                          setSelectedPenalties(selectedPenalties.map(sp => ({ ...sp, enforce: true })))
                        }}
                      >
                        ✓ Enforce All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        onClick={() => {
                          setSelectedPenalties(selectedPenalties.map(sp => ({ ...sp, enforce: false })))
                        }}
                      >
                        ✕ Decline All
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Add Penalty</p>
                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search penalties..."
                    value={penaltySearch}
                    onChange={(e) => setPenaltySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Penalty List with Team Buttons */}
                <div className="max-h-48 overflow-y-auto border rounded-lg bg-background">
                  {filteredPenalties.map((penalty) => (
                    <div
                      key={penalty.name}
                      className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate">{penalty.name}</span>
                        <span className="text-xs text-slate-500 ml-1">
                          {penalty.yards > 0 ? `(${penalty.yards}y)` : ''}
                        </span>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          style={{ borderColor: game.away_team.color, color: game.away_team.color }}
                          onClick={() => addPenaltyToSelection(penalty, 'away')}
                        >
                          {game.away_team.abbreviation}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          style={{ borderColor: game.home_team.color, color: game.home_team.color }}
                          onClick={() => addPenaltyToSelection(penalty, 'home')}
                        >
                          {game.home_team.abbreviation}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
            </CardContent>
        </Card>
      )}

      {/* FG Attempt / PAT / 2PT Section */}
      {game.status === 'live' && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-slate-900 dark:border-amber-600">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              🥅 Field Goal / PAT / 2PT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showFGAttempt ? (
              <div className="grid grid-cols-3 gap-4">
                {/* FG Attempt - Left side */}
                <div className="col-span-2 space-y-3">
                  {/* Distance selector */}
                  <div className="flex items-center gap-3">
                    <Label className="text-amber-800 font-medium">Distance:</Label>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setFgDistance(Math.max(18, fgDistance - 1))}
                      >-</Button>
                      <span className="text-2xl font-bold text-amber-800 w-16 text-center">{fgDistance}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setFgDistance(Math.min(70, fgDistance + 1))}
                      >+</Button>
                      <span className="text-amber-700">yards</span>
                    </div>
                  </div>
                  
                  {/* Quick distance buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[20, 25, 30, 35, 40, 45, 50, 55, 60].map(d => (
                      <Button
                        key={d}
                        variant={fgDistance === d ? "default" : "outline"}
                        size="sm"
                        className={fgDistance === d ? "bg-amber-600 hover:bg-amber-700" : "border-amber-400 text-amber-700"}
                        onClick={() => setFgDistance(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Start FG Attempt */}
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    onClick={() => {
                      setShowFGAttempt(true)
                      setFgResult(null)
                      stopTimer()
                    }}
                  >
                    🥅 Show FG Attempt ({fgDistance} yards)
                  </Button>
                </div>
                
                {/* PAT / 2PT - Right side */}
                <div className="space-y-2 border-l pl-4 border-amber-300">
                  <p className="text-xs text-amber-700 font-semibold uppercase">After TD</p>
                  {!showPATAttempt ? (
                    <>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        onClick={() => {
                          setShowPATAttempt('pat')
                          setPatResult(null)
                        }}
                      >
                        PAT Attempt
                      </Button>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        onClick={() => {
                          setShowPATAttempt('2pt')
                          setPatResult(null)
                        }}
                      >
                        2PT Attempt
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-center text-sm font-bold text-amber-800 mb-1">
                        {showPATAttempt === 'pat' ? 'PAT' : '2PT'} Try
                      </div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm"
                        onClick={() => {
                          setPatResult('good')
                          if (showPATAttempt === 'pat') {
                            updateScore(possession || 'home', 1)
                          } else {
                            score2PT(possession || 'home')
                          }
                          setTimeout(() => {
                            setShowPATAttempt(null)
                            setPatResult(null)
                            setKickoffPending(true)
                            setShowAdBreakPrompt(true)
                            setPossession(null)
                            setShowPlayClock(false)
                            setHideDownDistance(true)
                          }, 2000)
                        }}
                      >
                        ✓ Good
                      </Button>
                      <Button 
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
                        onClick={() => {
                          setPatResult('no-good')
                          setTimeout(() => {
                            setShowPATAttempt(null)
                            setPatResult(null)
                            setKickoffPending(true)
                            setShowAdBreakPrompt(true)
                            setPossession(null)
                            setShowPlayClock(false)
                            setHideDownDistance(true)
                          }, 2000)
                        }}
                      >
                        ✗ No Good
                      </Button>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm"
                        onClick={() => {
                          // Faked - close PAT attempt and resume play (TD still counts)
                          setShowPATAttempt(null)
                          setPatResult(null)
                          setHideDownDistance(false)
                          setShowPlayClock(true)
                        }}
                      >
                        🎭 Faked
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-400 text-amber-800 text-xs"
                        onClick={() => {
                          setShowPATAttempt(null)
                          setPatResult(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* FG Attempt Active */}
                <div className="bg-amber-100 rounded-lg p-4 text-center">
                  <p className="text-3xl font-black text-amber-800">{fgDistance} YARD</p>
                  <p className="text-xl font-bold text-amber-700">FIELD GOAL ATTEMPT</p>
                  {fgResult && (
                    <p className={`text-2xl font-black mt-2 ${
                      fgResult === 'good' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {fgResult === 'good' ? '✓ GOOD!' : fgResult === 'blocked' ? '✗ BLOCKED!' : '✗ NO GOOD!'}
                    </p>
                  )}
                </div>
                
                {/* Result buttons */}
                {!fgResult && (
                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={() => {
                        setFgResult('good')
                        const scoringTeam = possession || 'home'
                        const distance = fgDistance
                        updateScore(scoringTeam, 3, { distance })
                        // Close the FG attempt panel after celebration
                        setTimeout(() => {
                          setShowFGAttempt(false)
                          setFgResult(null)
                          setScoreCelebration(null)
                          togglePossession()
                          setKickoffPending(true)
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                          setHideDownDistance(true)
                        }, 5000)
                      }}
                    >
                      ✓ Good!
                    </Button>
                    <Button 
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={() => setFgResult('no-good')}
                    >
                      ✗ No Good
                    </Button>
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                      onClick={() => setFgResult('blocked')}
                    >
                      🚫 Blocked
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      onClick={() => {
                        // Faked - just close the FG attempt and resume play
                        setShowFGAttempt(false)
                        setFgResult(null)
                        setHideDownDistance(false)
                        setShowPlayClock(true)
                      }}
                    >
                      🎭 Faked
                    </Button>
                  </div>
                )}
                
                {/* After FG Miss - options for what happens next */}
                {(fgResult === 'no-good' || fgResult === 'blocked') && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-semibold text-center text-slate-600">What happens next?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                        onClick={() => {
                          setShowFGAttempt(false)
                          setFgResult(null)
                          togglePossession()
                          setHideDownDistance(false)
                          setShowPlayClock(true)
                          // Set to 1st & 10 for receiving team
                          setDown(1)
                          setDistance(10)
                        }}
                      >
                        ▶️ Continue Play
                      </Button>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        onClick={() => {
                          setShowFGAttempt(false)
                          setFgResult(null)
                          togglePossession()
                          setGameStatus('ad-break')
                          setHideDownDistance(true)
                          setShowPlayClock(false)
                          // Set to 1st & 10 for receiving team
                          setDown(1)
                          setDistance(10)
                        }}
                      >
                        📺 Ad Break
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Close button */}
                <Button 
                  variant="outline"
                  className="w-full border-amber-400 text-amber-800"
                  onClick={() => {
                    setShowFGAttempt(false)
                    setFgResult(null)
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close FG Attempt
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Game Status Controls */}
      {game.status === 'live' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Game Status</CardTitle>
              {gameStatus && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-300"
                  onClick={() => setGameStatus(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant={gameStatus === 'kickoff' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'kickoff' ? 'bg-green-600 hover:bg-green-700' : 'border-green-400 text-green-700 hover:bg-green-50'}`}
                onClick={() => setGameStatus(gameStatus === 'kickoff' ? null : 'kickoff')}
              >
                <span className="text-lg">🏈</span>
                <span className="text-xs">Kickoff</span>
              </Button>
              <Button
                variant={gameStatus === 'onside-kick' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'onside-kick' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-400 text-orange-700 hover:bg-orange-50'}`}
                onClick={() => setGameStatus(gameStatus === 'onside-kick' ? null : 'onside-kick')}
              >
                <span className="text-lg">🎯</span>
                <span className="text-xs">Onside</span>
              </Button>
              <Button
                variant={gameStatus === 'punt' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'punt' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-400 text-amber-700 hover:bg-amber-50'}`}
                onClick={() => setGameStatus(gameStatus === 'punt' ? null : 'punt')}
              >
                <span className="text-lg">🦶</span>
                <span className="text-xs">Punt</span>
              </Button>
              <Button
                variant={gameStatus === 'ad-break' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'ad-break' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-400 text-purple-700 hover:bg-purple-50'}`}
                onClick={() => setGameStatus(gameStatus === 'ad-break' ? null : 'ad-break')}
              >
                <span className="text-lg">📺</span>
                <span className="text-xs">Ad Break</span>
              </Button>
              <Button
                variant={gameStatus === 'injury' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'injury' ? 'bg-red-700 hover:bg-red-800' : 'border-red-400 text-red-700 hover:bg-red-50'}`}
                onClick={() => setGameStatus(gameStatus === 'injury' ? null : 'injury')}
              >
                <span className="text-lg">🤕</span>
                <span className="text-xs">Injury</span>
              </Button>
              <Button
                variant={gameStatus === 'injury-timeout' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'injury-timeout' ? 'bg-red-700 hover:bg-red-800' : 'border-red-400 text-red-700 hover:bg-red-50'}`}
                onClick={() => setGameStatus(gameStatus === 'injury-timeout' ? null : 'injury-timeout')}
              >
                <span className="text-lg">🏥</span>
                <span className="text-xs">Inj. T/O</span>
              </Button>
              <Button
                variant={gameStatus === 'measurement' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'measurement' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-400 text-blue-700 hover:bg-blue-50'}`}
                onClick={() => setGameStatus(gameStatus === 'measurement' ? null : 'measurement')}
              >
                <span className="text-lg">📏</span>
                <span className="text-xs">Measure</span>
              </Button>
              <Button
                variant={gameStatus === 'two-minute' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'two-minute' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-yellow-400 text-yellow-700 hover:bg-yellow-50'}`}
                onClick={() => setGameStatus(gameStatus === 'two-minute' ? null : 'two-minute')}
              >
                <span className="text-lg">⏱️</span>
                <span className="text-xs">2-Min Warn</span>
              </Button>
              <Button
                variant={gameStatus === 'weather' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'weather' ? 'bg-sky-600 hover:bg-sky-700' : 'border-sky-400 text-sky-700 hover:bg-sky-50'}`}
                onClick={() => setGameStatus(gameStatus === 'weather' ? null : 'weather')}
              >
                <span className="text-lg">⛈️</span>
                <span className="text-xs">Weather</span>
              </Button>
              <Button
                variant={gameStatus === 'technical' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'technical' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onClick={() => setGameStatus(gameStatus === 'technical' ? null : 'technical')}
              >
                <span className="text-lg">⚠️</span>
                <span className="text-xs">Tech Diff</span>
              </Button>
              <Button
                variant={gameStatus === 'end-quarter' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'end-quarter' ? 'bg-slate-600 hover:bg-slate-700' : 'border-slate-400 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                onClick={() => {
                  if (gameStatus === 'end-quarter') {
                    setGameStatus(null)
                  } else {
                    setGameStatus('end-quarter')
                    stopTimer()
                  }
                }}
              >
                <span className="text-lg">🏁</span>
                <span className="text-xs">End Qtr</span>
              </Button>
              <Button
                variant={gameStatus === 'halftime-show' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'halftime-show' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-indigo-400 text-indigo-700 hover:bg-indigo-50'}`}
                onClick={() => {
                  if (gameStatus === 'halftime-show') {
                    setGameStatus(null)
                    setHideDownDistance(false)
                  } else {
                    setGameStatus('halftime-show')
                    stopTimer()
                    setPossession(null)
                    setHideDownDistance(true)
                  }
                }}
              >
                <span className="text-lg">🎭</span>
                <span className="text-xs">Halftime</span>
              </Button>
              <Button
                variant={customPanelOpen ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${customPanelOpen ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-indigo-400 text-indigo-700 hover:bg-indigo-50'}`}
                onClick={() => setCustomPanelOpen(!customPanelOpen)}
              >
                <span className="text-lg">✏️</span>
                <span className="text-xs">Custom</span>
              </Button>
            </div>
            
            {/* Custom Panel - Custom Message */}
            {customPanelOpen && (
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-3">
                {/* Custom Message */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Custom Banner</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter custom message..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={customMessageColor}
                      onChange={(e) => setCustomMessageColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                      title="Choose color"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#ef4444')}>🔴</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#f97316')}>🟠</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#eab308')}>🟡</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#22c55e')}>🟢</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#3b82f6')}>🔵</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#8b5cf6')}>🟣</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomMessageColor('#6b7280')}>⚫</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className={`flex-1 ${showCustomMessage ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      onClick={() => setShowCustomMessage(!showCustomMessage)}
                      disabled={!customMessage.trim()}
                    >
                      {showCustomMessage ? '✓ Displayed' : 'Display'}
                    </Button>
                    {showCustomMessage && (
                      <Button 
                        variant="outline"
                        className="border-red-400 text-red-600"
                        onClick={() => setShowCustomMessage(false)}
                      >
                        Hide
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Big Plays / Turnovers Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Turnovers & Big Plays</p>
                {bigPlay && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-300 h-6 px-2"
                    onClick={clearBigPlay}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                <Button
                  variant={showRedZone ? 'default' : 'outline'}
                  className={`flex-col h-auto py-2 ${showRedZone ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-400 text-red-700 hover:bg-red-50'}`}
                  onClick={() => {
                    setShowRedZone(true)
                    setTimeout(() => setShowRedZone(false), 5000)
                  }}
                >
                  <span className="text-lg">🔴</span>
                  <span className="text-xs">Red Zone</span>
                </Button>
                <Button
                  variant={bigPlay === 'fumble' ? 'default' : 'outline'}
                  className={`flex-col h-auto py-2 ${bigPlay === 'fumble' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-orange-400 text-orange-700 hover:bg-orange-50'}`}
                  onClick={() => triggerBigPlay('fumble')}
                >
                  <span className="text-lg">🏈</span>
                  <span className="text-xs">Fumble</span>
                </Button>
                <Button
                  variant={bigPlay === 'interception' ? 'default' : 'outline'}
                  className={`flex-col h-auto py-2 ${bigPlay === 'interception' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-400 text-blue-700 hover:bg-blue-50'}`}
                  onClick={() => triggerBigPlay('interception')}
                >
                  <span className="text-lg">🙌</span>
                  <span className="text-xs">INT</span>
                </Button>
                <Button
                  variant={bigPlay === 'sack' ? 'default' : 'outline'}
                  className={`flex-col h-auto py-2 ${bigPlay === 'sack' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-400 text-purple-700 hover:bg-purple-50'}`}
                  onClick={() => triggerBigPlay('sack')}
                >
                  <span className="text-lg">💥</span>
                  <span className="text-xs">Sack</span>
                </Button>
                <Button
                  variant={bigPlay === 'blocked-kick' ? 'default' : 'outline'}
                  className={`flex-col h-auto py-2 ${bigPlay === 'blocked-kick' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-cyan-400 text-cyan-700 hover:bg-cyan-50'}`}
                  onClick={() => triggerBigPlay('blocked-kick')}
                >
                  <span className="text-lg">✋</span>
                  <span className="text-xs">Blocked</span>
                </Button>
              </div>
              
              {/* Fumble Recovery Options - shown when fumble is active */}
              {bigPlay === 'fumble' && (
                <div className="mt-3 p-3 bg-orange-100 rounded-lg border border-orange-300">
                  <p className="text-xs font-semibold text-orange-800 mb-2">Fumble Recovery:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      onClick={() => {
                        clearBigPlay()
                        setShowFumbleRecovery('offense')
                        setTimeout(() => setShowFumbleRecovery(null), 3000)
                      }}
                    >
                      🏈 Offense
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs"
                      onClick={() => {
                        clearBigPlay()
                        togglePossession()
                        setShowFumbleRecovery('defense')
                        setTimeout(() => setShowFumbleRecovery(null), 3000)
                      }}
                    >
                      🔄 Defense
                    </Button>
                    <Button
                      size="sm"
                      className="bg-slate-600 hover:bg-slate-700 text-white text-xs"
                      onClick={() => {
                        clearBigPlay()
                        setShowFumbleRecovery('oob')
                        setTimeout(() => setShowFumbleRecovery(null), 3000)
                      }}
                    >
                      📍 Out of Bounds
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Final & Live Indicator */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <Button
                variant={gameStatus === 'final' ? 'default' : 'outline'}
                className={`w-full ${gameStatus === 'final' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-400 text-amber-700 hover:bg-amber-50'}`}
                onClick={() => {
                  if (gameStatus === 'final') {
                    setGameStatus(null)
                  } else {
                    setGameStatus('final')
                    setPossession(null)
                    setHideDownDistance(true)
                  }
                }}
              >
                <span className="mr-2">🏆</span>
                {gameStatus === 'final' ? 'FINAL - Game Over' : 'Mark as FINAL'}
              </Button>
              
              {/* Sync to Bracket button - only show when game is final and linked to bracket */}
              {gameStatus === 'final' && linkedBracketMatch && (
                <Button
                  variant={bracketSynced ? 'default' : 'outline'}
                  className={`w-full ${bracketSynced ? 'bg-green-600 hover:bg-green-700' : 'border-blue-400 text-blue-700 hover:bg-blue-50'}`}
                  onClick={syncToBracket}
                  disabled={bracketSynced}
                >
                  <span className="mr-2">{bracketSynced ? '✓' : '🔗'}</span>
                  {bracketSynced ? 'Bracket Updated!' : `Update Bracket: ${linkedBracketMatch.bracket_name || 'Bracket'}`}
                </Button>
              )}
              
              <Button
                variant={showLiveIndicator ? 'default' : 'outline'}
                className={`w-full ${showLiveIndicator ? 'bg-red-600 hover:bg-red-700' : 'border-red-400 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950'}`}
                onClick={() => setShowLiveIndicator(!showLiveIndicator)}
              >
                <span className={`h-2 w-2 rounded-full mr-2 ${showLiveIndicator ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
                {showLiveIndicator ? 'LIVE Indicator ON' : 'LIVE Indicator OFF'}
              </Button>
              
              {/* Game State Editor (live/scheduled/completed) */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Display Status</label>
                    <select
                      value={gameStatus || ''}
                      onChange={(e) => setGameStatus(e.target.value || null)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">None (Normal Play)</option>
                      <option value="pregame">Pregame</option>
                      <option value="kickoff">Kickoff</option>
                      <option value="ad-break">Ad Break</option>
                      <option value="injury">Injury Timeout</option>
                      <option value="measurement">Measurement</option>
                      <option value="two-minute">2-Minute Warning</option>
                      <option value="end-quarter">End of Quarter</option>
                      <option value="halftime-show">Halftime</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Game State</label>
                    <select
                      value={game.status || 'scheduled'}
                      onChange={(e) => updateGame({ status: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extra Info Box Card */}
      {game.status === 'live' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📋</span> Extra Info Box
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Lines with individual size controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Lines (each with its own size)</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => setExtraInfo(prev => ({
                    ...prev,
                    lines: [...prev.lines, { text: '', fontSize: 'md', textColor: prev.textColor }]
                  }))}
                >
                  + Add Line
                </Button>
              </div>
              {extraInfo.lines.map((line, index) => (
                <div key={index} className="flex gap-1 items-center">
                  <Input
                    placeholder={`Line ${index + 1}...`}
                    value={line.text}
                    onChange={(e) => setExtraInfo(prev => ({
                      ...prev,
                      lines: prev.lines.map((l, i) => i === index ? { ...l, text: e.target.value } : l)
                    }))}
                    className="flex-1"
                  />
                  <input
                    type="color"
                    value={line.textColor || extraInfo.textColor}
                    onChange={(e) => setExtraInfo(prev => ({
                      ...prev,
                      lines: prev.lines.map((l, i) => i === index ? { ...l, textColor: e.target.value } : l)
                    }))}
                    className="w-7 h-8 rounded cursor-pointer border-0"
                    title="Text color"
                  />
                  <div className="flex gap-0.5">
                    {['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map(size => (
                      <Button
                        key={size}
                        size="sm"
                        variant={line.fontSize === size ? 'default' : 'outline'}
                        className="h-8 w-7 p-0 text-[10px]"
                        onClick={() => setExtraInfo(prev => ({
                          ...prev,
                          lines: prev.lines.map((l, i) => i === index ? { ...l, fontSize: size } : l)
                        }))}
                      >
                        {size.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                  {extraInfo.lines.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-red-500 border-red-300"
                      onClick={() => setExtraInfo(prev => ({
                        ...prev,
                        lines: prev.lines.filter((_, i) => i !== index)
                      }))}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Position</p>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant={extraInfo.side === 'away' ? 'default' : 'outline'}
                    className="flex-1"
                    style={extraInfo.side === 'away' ? { backgroundColor: game.away_team?.color } : {}}
                    onClick={() => setExtraInfo(prev => ({ ...prev, side: 'away' }))}
                  >
                    {game.away_team?.abbreviation || 'AWY'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant={extraInfo.side === 'home' ? 'default' : 'outline'}
                    className="flex-1"
                    style={extraInfo.side === 'home' ? { backgroundColor: game.home_team?.color } : {}}
                    onClick={() => setExtraInfo(prev => ({ ...prev, side: 'home' }))}
                  >
                    {game.home_team?.abbreviation || 'HME'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant={extraInfo.side === 'bottom' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setExtraInfo(prev => ({ ...prev, side: 'bottom' }))}
                  >
                    Bottom
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Colors</p>
                <div className="flex gap-1 items-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400">BG</span>
                    <input
                      type="color"
                      value={extraInfo.bgColor}
                      onChange={(e) => setExtraInfo(prev => ({ ...prev, bgColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400">TXT</span>
                    <input
                      type="color"
                      value={extraInfo.textColor}
                      onChange={(e) => setExtraInfo(prev => ({ ...prev, textColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    <button className="w-4 h-4 rounded bg-blue-500" onClick={() => setExtraInfo(prev => ({ ...prev, bgColor: '#3b82f6' }))} />
                    <button className="w-4 h-4 rounded bg-green-500" onClick={() => setExtraInfo(prev => ({ ...prev, bgColor: '#22c55e' }))} />
                    <button className="w-4 h-4 rounded bg-red-500" onClick={() => setExtraInfo(prev => ({ ...prev, bgColor: '#ef4444' }))} />
                    <button className="w-4 h-4 rounded bg-yellow-500" onClick={() => setExtraInfo(prev => ({ ...prev, bgColor: '#eab308' }))} />
                    <button className="w-4 h-4 rounded bg-purple-500" onClick={() => setExtraInfo(prev => ({ ...prev, bgColor: '#8b5cf6' }))} />
                    <button className="w-4 h-4 rounded bg-slate-700" onClick={() => setExtraInfo(prev => ({ ...prev, bgColor: '#334155' }))} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Preview */}
            {extraInfo.lines.some(l => l.text.trim()) && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-slate-500 mb-2">Preview</p>
                <div 
                  className="rounded-lg p-3 text-center"
                  style={{ backgroundColor: extraInfo.bgColor }}
                >
                  {extraInfo.lines.map((line, index) => (
                    line.text && (
                      <p 
                        key={index} 
                        className={`font-bold ${
                          line.fontSize === 'xs' ? 'text-[10px]' :
                          line.fontSize === 'sm' ? 'text-xs' :
                          line.fontSize === 'md' ? 'text-sm' :
                          line.fontSize === 'lg' ? 'text-base' :
                          line.fontSize === 'xl' ? 'text-lg' :
                          'text-xl'
                        }`}
                        style={{ color: line.textColor || extraInfo.textColor }}
                      >
                        {line.text}
                      </p>
                    )
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                className={`flex-1 ${extraInfo.show ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                onClick={() => setExtraInfo(prev => ({ ...prev, show: !prev.show }))}
                disabled={!extraInfo.lines.some(l => l.text.trim())}
              >
                {extraInfo.show ? '✓ Displayed' : 'Display'}
              </Button>
              {extraInfo.show && (
                <Button 
                  variant="outline"
                  className="border-red-400 text-red-600"
                  onClick={() => setExtraInfo(prev => ({ ...prev, show: false }))}
                >
                  Hide
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kickoff button for scheduled games */}
      {game.status === 'scheduled' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-6 text-center">
            <Button size="lg" className="gap-2 bg-green-600 hover:bg-green-700" onClick={startGame}>
              <Play className="h-5 w-5" />
              Kickoff - Start Game
            </Button>
            {countdown && !countdown.passed && (
              <div className="mt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Time until scheduled kickoff:</p>
                <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold text-green-700">
                  {countdown.days > 0 && (
                    <>
                      <span className="bg-green-100 px-3 py-1 rounded">{countdown.days}d</span>
                      <span className="text-green-400">:</span>
                    </>
                  )}
                  <span className="bg-green-100 px-3 py-1 rounded">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="text-green-400">:</span>
                  <span className="bg-green-100 px-3 py-1 rounded">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="text-green-400">:</span>
                  <span className="bg-green-100 px-3 py-1 rounded">{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            )}
            {countdown?.passed && (
              <p className="mt-3 text-sm font-semibold text-amber-600">⏰ Scheduled kickoff time has passed!</p>
            )}
            {!countdown && game.scheduled_at && (
              <p className="mt-3 text-sm text-slate-500">
                📅 Scheduled: {new Date(game.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(game.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final Score Display */}
      {game.status === 'final' && (
        <Card className="bg-slate-100 dark:bg-slate-800">
          <CardContent className="py-6 text-center">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {game.away_score > game.home_score
                ? `${game.away_team.name} wins!`
                : game.home_score > game.away_score
                ? `${game.home_team.name} wins!`
                : 'Tie game!'}
            </p>
            <p className="text-lg text-slate-600 mt-1">
              {game.away_team.name} {game.away_score} - {game.home_score} {game.home_team.name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review & Game Controls Row */}
      {game.status === 'live' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Review Control Panel */}
          <Card className="border-red-300 bg-red-50 dark:bg-slate-900 dark:border-red-700 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-400">
                <Video className="h-5 w-5" />
                Replay Review
              </CardTitle>
              <div className="flex gap-2">
                {/* Stage indicator */}
                {reviewDisplayStage > 0 && (
                  <span className="text-sm bg-red-200 dark:bg-red-900 px-2 py-1 rounded font-medium text-red-800 dark:text-red-300">
                    Under Review
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Two-Stage Review Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className={`gap-2 ${reviewDisplayStage >= 1 ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold`}
                onClick={showReviewStage1}
                disabled={reviewDisplayStage >= 1}
              >
                <Video className="h-5 w-5" />
                {reviewDisplayStage >= 1 ? '✓ REVIEW Shown' : 'Show REVIEW'}
              </Button>
              <Button
                size="lg"
                className={`gap-2 ${reviewDisplayStage === 2 ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold`}
                onClick={showReviewStage2}
                disabled={reviewDisplayStage === 2}
              >
                <Eye className="h-5 w-5" />
                {reviewDisplayStage === 2 ? '✓ Details Shown' : 'Show Details'}
              </Button>
            </div>
            
            {/* Review Details - Only show when review is active */}
            {reviewDisplayStage > 0 && (
              <>
                {/* Review Reason Input */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">What's Being Reviewed</Label>
                    <Input
                      placeholder="e.g., Touchdown, Catch/No Catch..."
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Call on the Field</Label>
                    <Input
                      placeholder="e.g., Touchdown, Incomplete..."
                      value={reviewCallOnField}
                      onChange={(e) => setReviewCallOnField(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                {/* Common Review Reasons */}
                <div className="flex flex-wrap gap-2">
                  {['Touchdown', 'Catch/No Catch', 'Fumble', 'Targeting', 'Pass Interference', 'Spot of Ball', 'Clock'].map((reason) => (
                    <Button
                      key={reason}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                      onClick={() => setReviewReason(reason)}
                    >
                      {reason}
                    </Button>
                  ))}
                </div>
                
                {/* Common Calls on Field */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-slate-500 w-full">Call on Field:</span>
                  {['Touchdown', 'No Touchdown', 'Complete', 'Incomplete', 'Fumble', 'No Fumble', 'First Down', 'Short'].map((call) => (
                    <Button
                      key={call}
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => setReviewCallOnField(call)}
                    >
                      {call}
                    </Button>
                  ))}
                </div>
              </>
            )}
            
            {/* Review Result Buttons */}
            {reviewDisplayStage > 0 && !reviewResult && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={setReviewUpheld}
                >
                  <span>✅</span>
                  Call Stands
                </Button>
                <Button
                  size="lg"
                  className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  onClick={setReviewReversed}
                >
                  <span>🔄</span>
                  Call Reversed
                </Button>
              </div>
            )}
            
            {/* Hide Review Button */}
            {reviewDisplayStage > 0 && (
              <Button
                variant="outline"
                className="w-full border-red-400 text-red-800"
                onClick={hideReview}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                End Review
              </Button>
            )}
            
            {/* Coach's Challenge Section */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Coach's Challenge
              </p>
              
              {!challengeActive ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-orange-400 text-orange-800 hover:bg-orange-100"
                    onClick={() => startChallenge('away')}
                    disabled={awayTimeouts === 0}
                  >
                    <div 
                      className="h-5 w-5 rounded-full mr-2"
                      style={{ backgroundColor: game.away_team.color }}
                    />
                    {game.away_team.name}
                    {awayTimeouts === 0 && <span className="ml-1 text-xs">(No TO)</span>}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-orange-400 text-orange-800 hover:bg-orange-100"
                    onClick={() => startChallenge('home')}
                    disabled={homeTimeouts === 0}
                  >
                    <div 
                      className="h-5 w-5 rounded-full mr-2"
                      style={{ backgroundColor: game.home_team.color }}
                    />
                    {game.home_team.name}
                    {homeTimeouts === 0 && <span className="ml-1 text-xs">(No TO)</span>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Challenge Active - Show team and result buttons */}
                  <div className="bg-orange-100 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: challengeTeam === 'home' ? game.home_team.color : game.away_team.color }}
                      >
                        {challengeTeam === 'home' 
                          ? (game.home_team.abbreviation)
                          : (game.away_team.abbreviation)
                        }
                      </div>
                      <span className="font-semibold text-orange-900">
                        {challengeTeam === 'home' ? game.home_team.name : game.away_team.name} Challenge
                      </span>
                    </div>
                    <span className="text-sm text-orange-700 bg-orange-200 px-2 py-1 rounded">
                      Timeout at risk
                    </span>
                  </div>
                  
                  {/* Quick Buttons for Common Challenges */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { reason: 'Catch/No Catch', call: 'Incomplete' },
                      { reason: 'Catch/No Catch', call: 'Complete' },
                      { reason: 'Fumble', call: 'Fumble' },
                      { reason: 'Fumble', call: 'Down by Contact' },
                      { reason: 'Spot of Ball', call: 'Short' },
                      { reason: 'TD/No TD', call: 'Touchdown' },
                      { reason: 'TD/No TD', call: 'No TD' },
                      { reason: 'Pass Interference', call: 'No Flag' },
                    ].map((item, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={() => {
                          setReviewReason(item.reason)
                          setReviewCallOnField(item.call)
                        }}
                      >
                        {item.reason}: {item.call}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Review Reason & Call on Field */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-orange-700 font-medium">Reviewing</label>
                      <Input
                        placeholder="e.g. Catch/No Catch"
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-orange-700 font-medium">Call on Field</label>
                      <Input
                        placeholder="e.g. Incomplete"
                        value={reviewCallOnField}
                        onChange={(e) => setReviewCallOnField(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Result Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={challengeUpheld}
                    >
                      Call Upheld
                      <span className="text-xs ml-1">(Lose TO)</span>
                    </Button>
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={challengeReversed}
                    >
                      Call Reversed
                      <span className="text-xs ml-1">(Keep TO)</span>
                    </Button>
                  </div>
                  
                  {/* Cancel Button */}
                  <Button
                    variant="outline"
                    className="w-full border-orange-400 text-orange-800"
                    onClick={cancelChallenge}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Challenge
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          {/* Game Controls */}
          <Card className="bg-slate-50 dark:bg-slate-800 flex flex-col justify-center">
            <CardContent className="py-4 space-y-4">
              {/* Display Title */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Display Title</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Championship Game..."
                    value={displayTitle}
                    onChange={(e) => setDisplayTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm"
                    className={showDisplayTitle ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}
                    onClick={() => setShowDisplayTitle(!showDisplayTitle)}
                    disabled={!displayTitle.trim()}
                  >
                    {showDisplayTitle ? '✓ On' : 'Show'}
                  </Button>
                </div>
              </div>
              
              <div className="border-t border-slate-300 dark:border-slate-600 pt-3">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 text-center">Game Controls</p>
                
                {/* Keybinds Toggle */}
                <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Keybinds</span>
                  </div>
                  <Button
                    size="sm"
                    variant={keybindsEnabled ? 'default' : 'outline'}
                    className={`h-7 px-3 text-xs ${keybindsEnabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    onClick={() => {
                      const newEnabled = !keybindsEnabled
                      setKeybindsEnabled(newEnabled)
                      saveKeybindsEnabled(newEnabled)
                    }}
                  >
                    {keybindsEnabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 w-full"
                    onClick={resetGame}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Game
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2 w-full"
                    onClick={endGame}
                  >
                    <Square className="h-4 w-4" />
                    End Game
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats Panel - Full Width */}
      {game.status === 'live' && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowQuickStats(!showQuickStats)}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  📊 Quick Stats
                </span>
                <Button variant="ghost" size="sm">
                  {showQuickStats ? '▲ Hide' : '▼ Show'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showQuickStats && (
              <CardContent className="space-y-4">
              {/* Points by Quarter - Editable */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Points by Quarter</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="text-left py-1 pr-2">Team</th>
                        <th className="text-center px-1 w-14">Q1</th>
                        <th className="text-center px-1 w-14">Q2</th>
                        <th className="text-center px-1 w-14">Q3</th>
                        <th className="text-center px-1 w-14">Q4</th>
                        <th className="text-center px-1 w-14">OT</th>
                        <th className="text-center px-2 w-12 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-1 pr-2 font-medium">{game.away_team?.abbreviation || 'Away'}</td>
                        {['q1', 'q2', 'q3', 'q4', 'ot'].map(qKey => (
                          <td key={qKey} className="text-center px-1">
                            <div className="flex items-center justify-center gap-0">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, [qKey]: Math.max(0, s.away[qKey] - 1)}}))}>-</Button>
                              <span className="w-5 text-center">{quickStats.away[qKey]}</span>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, [qKey]: s.away[qKey] + 1}}))}>+</Button>
                            </div>
                          </td>
                        ))}
                        <td className="text-center px-2 font-bold">{game.away_score}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 font-medium">{game.home_team?.abbreviation || 'Home'}</td>
                        {['q1', 'q2', 'q3', 'q4', 'ot'].map(qKey => (
                          <td key={qKey} className="text-center px-1">
                            <div className="flex items-center justify-center gap-0">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, [qKey]: Math.max(0, s.home[qKey] - 1)}}))}>-</Button>
                              <span className="w-5 text-center">{quickStats.home[qKey]}</span>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, [qKey]: s.home[qKey] + 1}}))}>+</Button>
                            </div>
                          </td>
                        ))}
                        <td className="text-center px-2 font-bold">{game.home_score}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Away Team Stats */}
              <div className="border-t pt-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  {game.away_team?.logo_url ? (
                    <img src={game.away_team.logo_url} alt="" className="h-5 w-5 object-contain" />
                  ) : (
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: game.away_team?.color || '#6b7280' }} />
                  )}
                  {game.away_team?.name || 'Away Team'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Turnovers */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, away: {...s.away, turnovers: Math.max(0, s.away.turnovers - 1)}}))}>-</Button>
                      <p className="text-lg font-bold text-red-600 w-6">{quickStats.away.turnovers}</p>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, away: {...s.away, turnovers: s.away.turnovers + 1}}))}>+</Button>
                    </div>
                    <p className="text-xs text-slate-500">Turnovers</p>
                  </div>
                  {/* First Downs */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, away: {...s.away, firstDowns: Math.max(0, s.away.firstDowns - 1)}}))}>-</Button>
                      <p className="text-lg font-bold text-green-600 w-6">{quickStats.away.firstDowns}</p>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, away: {...s.away, firstDowns: s.away.firstDowns + 1}}))}>+</Button>
                    </div>
                    <p className="text-xs text-slate-500">1st Downs</p>
                  </div>
                  {/* Penalties */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, away: {...s.away, penalties: Math.max(0, s.away.penalties - 1)}}))}>-</Button>
                      <p className="text-lg font-bold text-yellow-600 w-6">{quickStats.away.penalties}</p>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, away: {...s.away, penalties: s.away.penalties + 1}}))}>+</Button>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, penaltyYards: Math.max(0, s.away.penaltyYards - 5)}}))}>-5</Button>
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, penaltyYards: Math.max(0, s.away.penaltyYards - 1)}}))}>-1</Button>
                      <p className="text-xs font-bold text-yellow-600 w-7">{quickStats.away.penaltyYards}y</p>
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, penaltyYards: s.away.penaltyYards + 1}}))}>+1</Button>
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, penaltyYards: s.away.penaltyYards + 5}}))}>+5</Button>
                    </div>
                    <p className="text-xs text-slate-500">Penalties</p>
                  </div>
                </div>
              </div>

              {/* Home Team Stats */}
              <div className="border-t pt-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  {game.home_team?.logo_url ? (
                    <img src={game.home_team.logo_url} alt="" className="h-5 w-5 object-contain" />
                  ) : (
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: game.home_team?.color || '#6b7280' }} />
                  )}
                  {game.home_team?.name || 'Home Team'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Turnovers */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, home: {...s.home, turnovers: Math.max(0, s.home.turnovers - 1)}}))}>-</Button>
                      <p className="text-lg font-bold text-red-600 w-6">{quickStats.home.turnovers}</p>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, home: {...s.home, turnovers: s.home.turnovers + 1}}))}>+</Button>
                    </div>
                    <p className="text-xs text-slate-500">Turnovers</p>
                  </div>
                  {/* First Downs */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, home: {...s.home, firstDowns: Math.max(0, s.home.firstDowns - 1)}}))}>-</Button>
                      <p className="text-lg font-bold text-green-600 w-6">{quickStats.home.firstDowns}</p>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, home: {...s.home, firstDowns: s.home.firstDowns + 1}}))}>+</Button>
                    </div>
                    <p className="text-xs text-slate-500">1st Downs</p>
                  </div>
                  {/* Penalties */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, home: {...s.home, penalties: Math.max(0, s.home.penalties - 1)}}))}>-</Button>
                      <p className="text-lg font-bold text-yellow-600 w-6">{quickStats.home.penalties}</p>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs" onClick={() => setQuickStats(s => ({...s, home: {...s.home, penalties: s.home.penalties + 1}}))}>+</Button>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, penaltyYards: Math.max(0, s.home.penaltyYards - 5)}}))}>-5</Button>
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, penaltyYards: Math.max(0, s.home.penaltyYards - 1)}}))}>-1</Button>
                      <p className="text-xs font-bold text-yellow-600 w-7">{quickStats.home.penaltyYards}y</p>
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, penaltyYards: s.home.penaltyYards + 1}}))}>+1</Button>
                      <Button size="sm" variant="ghost" className="h-4 px-1 p-0 text-[9px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, penaltyYards: s.home.penaltyYards + 5}}))}>+5</Button>
                    </div>
                    <p className="text-xs text-slate-500">Penalties</p>
                  </div>
                </div>
              </div>

              {/* Display Stats on Scoreboard */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Display on Scoreboard</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button 
                    size="sm" 
                    variant={displayStats.all ? "default" : "outline"}
                    className={displayStats.all ? "bg-blue-600" : ""}
                    onClick={() => setDisplayStats(prev => ({ 
                      ...prev, 
                      show: !prev.all,
                      all: !prev.all,
                      quarterScores: !prev.all,
                      turnovers: !prev.all,
                      firstDowns: !prev.all,
                      penalties: !prev.all
                    }))}
                  >
                    {displayStats.all ? '📺 Hide All' : '📺 Show All'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant={displayStats.quarterScores ? "default" : "outline"}
                    className={displayStats.quarterScores ? "bg-purple-600" : ""}
                    onClick={() => setDisplayStats(prev => ({ 
                      ...prev, 
                      show: !prev.quarterScores || prev.turnovers || prev.firstDowns || prev.penalties,
                      quarterScores: !prev.quarterScores,
                      all: false
                    }))}
                  >
                    Qtr Scores
                  </Button>
                  <Button 
                    size="sm" 
                    variant={displayStats.turnovers ? "default" : "outline"}
                    className={displayStats.turnovers ? "bg-red-600" : ""}
                    onClick={() => setDisplayStats(prev => ({ 
                      ...prev, 
                      show: prev.quarterScores || !prev.turnovers || prev.firstDowns || prev.penalties,
                      turnovers: !prev.turnovers,
                      all: false
                    }))}
                  >
                    Turnovers
                  </Button>
                  <Button 
                    size="sm" 
                    variant={displayStats.firstDowns ? "default" : "outline"}
                    className={displayStats.firstDowns ? "bg-green-600" : ""}
                    onClick={() => setDisplayStats(prev => ({ 
                      ...prev, 
                      show: prev.quarterScores || prev.turnovers || !prev.firstDowns || prev.penalties,
                      firstDowns: !prev.firstDowns,
                      all: false
                    }))}
                  >
                    1st Downs
                  </Button>
                  <Button 
                    size="sm" 
                    variant={displayStats.penalties ? "default" : "outline"}
                    className={displayStats.penalties ? "bg-yellow-600" : ""}
                    onClick={() => setDisplayStats(prev => ({ 
                      ...prev, 
                      show: prev.quarterScores || prev.turnovers || prev.firstDowns || !prev.penalties,
                      penalties: !prev.penalties,
                      all: false
                    }))}
                  >
                    Penalties
                  </Button>
                  {/* Custom stat display buttons */}
                  {quickStats.custom?.map(stat => (
                    <Button 
                      key={stat.id}
                      size="sm" 
                      variant={displayStats.customStats?.includes(stat.id) ? "default" : "outline"}
                      style={displayStats.customStats?.includes(stat.id) ? { backgroundColor: stat.color } : {}}
                      onClick={() => setDisplayStats(prev => {
                        const isShowing = prev.customStats?.includes(stat.id)
                        const newCustomStats = isShowing 
                          ? prev.customStats.filter(id => id !== stat.id)
                          : [...(prev.customStats || []), stat.id]
                        return { 
                          ...prev, 
                          show: prev.quarterScores || prev.turnovers || prev.firstDowns || prev.penalties || newCustomStats.length > 0,
                          customStats: newCustomStats,
                          all: false
                        }
                      })}
                    >
                      {stat.shortLabel || stat.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Stats Section */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Custom Stats</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => {
                      setEditingCustomStat(null)
                      setCustomStatForm({ label: '', shortLabel: '', color: '#3b82f6' })
                      setShowCustomStatDialog(true)
                    }}
                  >
                    + Add Stat
                  </Button>
                </div>
                
                {quickStats.custom?.length > 0 ? (
                  <div className="space-y-2">
                    {quickStats.custom.map(stat => (
                      <div key={stat.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-sm font-medium flex-1">{stat.label}</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            custom: s.custom.map(cs => cs.id === stat.id ? { ...cs, away: Math.max(0, cs.away - 1) } : cs)
                          }))}>-</Button>
                          <span className="text-sm font-bold w-6 text-center">{stat.away}</span>
                          <span className="text-xs text-slate-400">A</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            custom: s.custom.map(cs => cs.id === stat.id ? { ...cs, away: cs.away + 1 } : cs)
                          }))}>+</Button>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            custom: s.custom.map(cs => cs.id === stat.id ? { ...cs, home: Math.max(0, cs.home - 1) } : cs)
                          }))}>-</Button>
                          <span className="text-sm font-bold w-6 text-center">{stat.home}</span>
                          <span className="text-xs text-slate-400">H</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            custom: s.custom.map(cs => cs.id === stat.id ? { ...cs, home: cs.home + 1 } : cs)
                          }))}>+</Button>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                          onClick={() => {
                            setEditingCustomStat(stat)
                            setCustomStatForm({ label: stat.label, shortLabel: stat.shortLabel || '', color: stat.color })
                            setShowCustomStatDialog(true)
                          }}
                        >
                          ✏️
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => setQuickStats(s => ({
                            ...s,
                            custom: s.custom.filter(cs => cs.id !== stat.id)
                          }))}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No custom stats yet. Add one to track anything!</p>
                )}
              </div>
              </CardContent>
            )}
          </Card>
      )}

      {/* Custom Stat Dialog */}
      <Dialog open={showCustomStatDialog} onOpenChange={setShowCustomStatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCustomStat ? 'Edit Custom Stat' : 'Add Custom Stat'}</DialogTitle>
            <DialogDescription>
              Create a custom stat to track anything you want
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stat Name</Label>
              <Input 
                placeholder="e.g., Sacks, Rushing Yards, Catches"
                value={customStatForm.label}
                onChange={e => setCustomStatForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Short Label (for display button)</Label>
              <Input 
                placeholder="e.g., SCK, RUSH, REC"
                value={customStatForm.shortLabel}
                onChange={e => setCustomStatForm(f => ({ ...f, shortLabel: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={customStatForm.color}
                  onChange={e => setCustomStatForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <div className="flex flex-wrap gap-1">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'].map(c => (
                    <button
                      key={c}
                      className={`w-6 h-6 rounded ${customStatForm.color === c ? 'ring-2 ring-offset-1 ring-slate-900' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setCustomStatForm(f => ({ ...f, color: c }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowCustomStatDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              disabled={!customStatForm.label.trim()}
              onClick={() => {
                if (editingCustomStat) {
                  // Update existing
                  setQuickStats(s => ({
                    ...s,
                    custom: s.custom.map(cs => cs.id === editingCustomStat.id 
                      ? { ...cs, label: customStatForm.label, shortLabel: customStatForm.shortLabel, color: customStatForm.color }
                      : cs
                    )
                  }))
                } else {
                  // Add new
                  const newStat = {
                    id: `custom_${Date.now()}`,
                    label: customStatForm.label,
                    shortLabel: customStatForm.shortLabel,
                    color: customStatForm.color,
                    home: 0,
                    away: 0
                  }
                  setQuickStats(s => ({
                    ...s,
                    custom: [...(s.custom || []), newStat]
                  }))
                }
                setShowCustomStatDialog(false)
              }}
            >
              {editingCustomStat ? 'Save Changes' : 'Add Stat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Code Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 border-green-200 dark:border-green-700">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
              <Share2 className="h-5 w-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Share this game</p>
              <p className="text-2xl font-bold tracking-wider text-green-700 dark:text-green-400">{game.share_code}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyShareLink} 
            className={copied 
              ? "bg-green-600 text-white border-green-600" 
              : "border-green-600 text-green-700 dark:border-green-500 dark:text-green-400"
            }
          >
            {copied ? '✓ Link Copied!' : 'Copy Link'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
