import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ownYardLineToSpot, yardsToGoal, advanceSpot, spotLabel } from '@/lib/fieldPosition'
import { CLOSE_CALLS, CLOSE_CALL_TYPES } from '@/lib/closeCalls'
import { getOvertimeRules } from '@/lib/overtime'
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
  { name: 'False Start', yards: 5, category: 'Pre-Snap', deadBall: true },
  { name: 'Offside', yards: 5, category: 'Pre-Snap' },
  { name: 'Encroachment', yards: 5, category: 'Pre-Snap', deadBall: true },
  { name: 'Neutral Zone Infraction', yards: 5, category: 'Pre-Snap', deadBall: true },
  { name: 'Delay of Game', yards: 5, category: 'Pre-Snap', deadBall: true },
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
  { name: 'Illegal Substitution', yards: 5, category: 'Pre-Snap', deadBall: true },
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

// Small X in the top-left corner of an Immediate Actions box that has no other way out
function BoxClose({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      title="Close"
      className="absolute top-2.5 left-2 h-5 w-5 flex items-center justify-center rounded-full text-xs text-slate-500 hover:text-slate-900 hover:bg-black/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
    >
      ✕
    </button>
  )
}

// Stats that can be shown on the scoreboard, each with its own toggle
const DISPLAY_STAT_BUTTONS = [
  { key: 'quarterScores', label: 'Qtr Scores', activeClass: 'bg-purple-600' },
  { key: 'turnovers', label: 'Turnovers', activeClass: 'bg-red-600' },
  { key: 'firstDowns', label: '1st Downs', activeClass: 'bg-green-600' },
  { key: 'penalties', label: 'Penalties', activeClass: 'bg-yellow-600' },
  { key: 'thirdDowns', label: '3rd Down', activeClass: 'bg-teal-600' },
  { key: 'fourthDowns', label: '4th Down', activeClass: 'bg-orange-600' },
  { key: 'timeOfPossession', label: 'Time of Poss.', activeClass: 'bg-indigo-600' },
]

// The stats bar shows whenever at least one stat is turned on
function withDisplayShow(displayStats) {
  const anyOn = DISPLAY_STAT_BUTTONS.some(b => displayStats[b.key]) || displayStats.customStats?.length > 0
  return { ...displayStats, show: anyOn }
}

export default function LiveGamePage({ standalone = false }) {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  // Use appropriate API based on standalone prop - memoized to prevent unnecessary reloads
  const api = useMemo(() => standalone ? standaloneGameApi : gameApi, [standalone])
  
  // Track if initial load has completed - prevent re-fetching
  const initialLoadDoneRef = useRef(false)
  
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
  const [playClockDelay, setPlayClockDelay] = useState(0) // Delay in seconds before play clock starts
  const playClockRunningRef = useRef(false)
  const playClockRef = useRef(40) // Ref to track current play clock (source of truth for controller)
  const playClockDelayTimeoutRef = useRef(null) // Ref for delay timeout
  const timeoutClockRunningRef = useRef(false)
  const simpleTimerRunningRef = useRef(false)
  
  // Down & Distance state
  const [down, setDown] = useState(1)
  const [distance, setDistance] = useState(10)
  const [specialDistance, setSpecialDistance] = useState(null) // null, 'goal', or 'inches'
  const [ballOn, setBallOn] = useState(25)
  const [possession, setPossession] = useState('home') // 'home', 'away', or null (no possession)
  const [hidePossession, setHidePossession] = useState(false) // Hide possession indicator without clearing it
  const [hidePossessionOutline, setHidePossessionOutline] = useState(false) // Hide just the green outline
  
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
  
  // OT score end game prompt state
  const [showOTEndPrompt, setShowOTEndPrompt] = useState(false)
  // Overtime rules panel on the scoreboard: shown when OT starts, hidden when the clock starts
  const [showOTRules, setShowOTRules] = useState(false)
  // Quarter in which the Overtime Rules box was closed with its X (it comes back next quarter)
  const [otRulesBoxClosedFor, setOtRulesBoxClosedFor] = useState(null)
  // Scoreboard extras (settings in the Scoreboard Extras card)
  const [scoreboardExtras, setScoreboardExtras] = useState({
    showBallSpot: false,        // ball spot line + field strip under down & distance
    showDriveSummaries: true,   // drive summary when possession changes
    showScoringSummary: false,  // scoring plays panel (turned on at halftime and final)
    showScoringRuns: false,     // "PHI - 17 straight points"
    showOtherScores: false,     // other games in the league this week
    venue: { show: false, text: '' },
    sponsors: { show: false, interval: 8, items: [] }, // items: { id, text, imageUrl }
    showWinProb: false,         // win probability bar
    showRedZoneAuto: false,     // red zone / goal line look from the ball spot
    showPreviousMeeting: false, // last meeting between the teams
    showStatComparison: false,  // head-to-head team stats
    showSeasonContext: false,   // "2nd in NFC East" under each team
    showBreakCard: false,       // countdown card during timeouts and commercial breaks
    theme: 'dark',              // 'dark' | 'light' | 'team'
    size: 'normal',             // 'normal' | 'large' | 'xl' (applies on wide screens only)
  })
  const updateExtras = (changes) => setScoreboardExtras(prev => ({ ...prev, ...changes }))
  const [driveSummary, setDriveSummary] = useState(null) // { id, team, plays, yards, seconds, result }
  const [scoringRun, setScoringRun] = useState(null)     // { team, points }: consecutive points by one team
  const [breakStartedAt, setBreakStartedAt] = useState(null) // when the current commercial break started (break card clock)
  // League custom penalties (League Settings > Penalties), shown in the flag panel
  const [leaguePenalties, setLeaguePenalties] = useState([])
  // Close call being decided on the field: { type: 'firstDown' | 'touchdown' | 'catch' | 'fumble', result: null | 'yes' | 'no' }
  const [closeCall, setCloseCall] = useState(null)
  // Coin toss: which toss ('Pregame' or 'OT') is finished and put away, so its boxes don't come back
  const [coinTossDoneFor, setCoinTossDoneFor] = useState(null)
  // The coin toss being decided right now, if any (pregame or the start of overtime)
  const tossPeriod = game?.quarter === 'OT' ? 'OT' : (game?.quarter === 'Pregame' || gameStatus === 'pregame') ? 'Pregame' : null
  const coinTossOpen = !!tossPeriod && coinTossDoneFor !== tossPeriod
  const finishCoinToss = () => { if (tossPeriod) setCoinTossDoneFor(tossPeriod) }
  // Quarter whose clock hit 0:00 while a play may still be running; its end waits for the play
  const [periodEndPending, setPeriodEndPending] = useState(null)
  // Immediate Actions boxes closed with their X; they come back when the situation changes
  const [dismissedBoxes, setDismissedBoxes] = useState([])
  const dismissBox = (id) => setDismissedBoxes(prev => [...prev, id])
  
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
  const [show3AndOut, setShow3AndOut] = useState(false)
  
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
  
  // Quick finish dialog state
  const [showQuickFinish, setShowQuickFinish] = useState(false)
  const [quickFinishScores, setQuickFinishScores] = useState({ home: 0, away: 0 })
  
  // Keybinds enabled state (synced with localStorage, default: disabled)
  const [keybindsEnabled, setKeybindsEnabled] = useState(() => getKeybindsEnabled())
  
  // Quick stats panel state
  const [showQuickStats, setShowQuickStats] = useState(false)
  const [quickStats, setQuickStats] = useState({
    home: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, thirdDownAtt: 0, thirdDownConv: 0, fourthDownAtt: 0, fourthDownConv: 0 },
    away: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, thirdDownAtt: 0, thirdDownConv: 0, fourthDownAtt: 0, fourthDownConv: 0 },
    // Custom stats - array of { id, label, shortLabel, home, away, color }
    custom: [],
    // Awards/trophies - array of { id, label, emoji, home, away }
    awards: []
  })
  
  // Awards panel state
  const [showAwards, setShowAwards] = useState(false)
  const [showAwardDialog, setShowAwardDialog] = useState(false)
  const [editingAward, setEditingAward] = useState(null)
  const [awardForm, setAwardForm] = useState({ label: '', emoji: '🏆' })
  
  // Coin toss state
  const [coinToss, setCoinToss] = useState({
    winner: null, // 'home' or 'away'
    choice: null, // 'receive', 'kick', 'defer'
  })
  const [showCoinToss, setShowCoinToss] = useState(false)
  
  // Time of possession tracking
  const [timeOfPossession, setTimeOfPossession] = useState({ home: 0, away: 0 }) // in seconds
  const lastPossessionChangeRef = useRef(null)
  
  // Game log for play-by-play
  const [gameLog, setGameLog] = useState([]) // array of { timestamp, quarter, time, type, description, team }
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
    thirdDowns: false,
    fourthDowns: false,
    timeOfPossession: false,
    all: false,
    customStats: [] // array of custom stat IDs to display
  })
  
  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState({
    autoScores: true,        // Auto-notify on scores
    autoTouchdowns: true,    // Auto-notify on TDs
    autoTurnovers: false,    // Auto-notify on turnovers
    autoQuarterEnd: true,    // Auto-notify on quarter end
    autoGameEnd: true,       // Auto-notify on game end
    autoHalftime: true,      // Auto-notify at halftime
  })
  const [showNotificationPanel, setShowNotificationPanel] = useState(true)
  const [customNotificationTitle, setCustomNotificationTitle] = useState('')
  const [customNotificationMessage, setCustomNotificationMessage] = useState('')
  const [notificationHistory, setNotificationHistory] = useState([])
  
  // Preset notifications from league settings (or defaults)
  const defaultPresetNotifications = [
    { id: 'big-play', label: 'Big Play', title: '🏈 Big Play!', message: 'What a play!' },
    { id: 'timeout', label: 'Timeout', title: '⏸️ Timeout', message: 'Timeout on the field' },
    { id: 'flag', label: 'Flag', title: '🚩 Flag', message: 'Flag on the play' },
    { id: 'review', label: 'Review', title: '🔄 Under Review', message: 'Play is under review' },
    { id: 'injury', label: 'Injury', title: '🏥 Injury', message: 'Injury timeout' },
  ]
  
  // Throttle ref for game time sync (to avoid flooding API)
  const lastTimeSyncRef = useRef(0)

  const loadGame = useCallback(async () => {
    // Skip if already loaded - prevents state reset on re-renders
    if (initialLoadDoneRef.current) {
      return
    }
    
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
      
      // Initialize gameTimeRef with the loaded game time (source of truth for controller)
      if (data.game_time) {
        gameTimeRef.current = data.game_time
      }
      
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
          // Restore coin toss
          if (savedState.coinToss) setCoinToss(savedState.coinToss)
          if (savedState.coinTossDoneFor) setCoinTossDoneFor(savedState.coinTossDoneFor)
          // Restore time of possession
          if (savedState.timeOfPossession) setTimeOfPossession(savedState.timeOfPossession)
          if (savedState.showOTRules) setShowOTRules(true)
          if (savedState.closeCall && !savedState.closeCall.result) setCloseCall(savedState.closeCall)
          if (savedState.scoreboardExtras) setScoreboardExtras(prev => ({ ...prev, ...savedState.scoreboardExtras }))
          if (savedState.scoringRun) setScoringRun(savedState.scoringRun)
          // & Goal / & Inches (down and distance themselves come from the game row)
          if (savedState.specialDistance) setSpecialDistance(savedState.specialDistance)
          if (savedState.currentDrive) {
            driveRef.current = savedState.currentDrive
            prevPossessionForDriveRef.current = savedState.currentDrive.team
          }
          // Restore game log
          if (savedState.gameLog) setGameLog(savedState.gameLog)
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
      // Mark initial load as complete
      initialLoadDoneRef.current = true
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

  // League custom penalties for the flag panel
  useEffect(() => {
    if (!game?.league_id || standalone) return
    fetch(`/api/leagues/${game.league_id}`).then(r => r.json()).then(league => {
      let list = league?.penalties
      try { list = typeof list === 'string' ? JSON.parse(list) : list } catch { list = [] }
      setLeaguePenalties((Array.isArray(list) ? list : [])
        .filter(p => p && typeof p === 'object' && p.custom && p.name)
        .map(p => ({ name: p.name, yards: Number(p.yards) || 0, category: 'Custom', lossOfDown: !!p.lossOfDown, autoFirst: !!p.autoFirst })))
    }).catch(() => {})
  }, [game?.league_id, standalone])

  // Team records on the scoreboard come from the server, which rebuilds W/L from final scores.
  // Refetch on load and whenever this game becomes final, stops being final, or its final score
  // changes (after a moment, so the server has rebuilt them). Adding the result locally double
  // counted a game that was already final and counted preseason games.
  const finalRecordKey = game?.status === 'final' ? `final:${game.home_score}-${game.away_score}` : 'open'
  const recordsLoadedRef = useRef(false)
  useEffect(() => {
    if (!game || standalone) return
    let cancelled = false
    async function fetchTeamRecords() {
      try {
        const teams = await teamApi.getByLeague(game.league_id)
        if (cancelled) return
        const homeTeamData = teams.find(t => t.id === game.home_team?.id)
        const awayTeamData = teams.find(t => t.id === game.away_team?.id)
        const record = (t) => t ? { wins: t.wins, losses: t.losses, ties: t.ties, points_for: t.points_for || 0, points_against: t.points_against || 0 } : null
        setTeamRecords({ home: record(homeTeamData), away: record(awayTeamData) })
      } catch (err) {
        console.error('Failed to fetch team records:', err)
      }
    }
    const t = setTimeout(fetchTeamRecords, finalRecordKey === 'open' && !recordsLoadedRef.current ? 0 : 1500)
    recordsLoadedRef.current = true
    return () => { cancelled = true; clearTimeout(t) }
  }, [game?.id, game?.league_id, standalone, finalRecordKey])

  useEffect(() => {
    if (!game?.share_code) return

    const ws = createWebSocket('game', game.share_code, (message) => {
      // Controller is the source of truth - ignore most WebSocket updates
      // The controller manages state locally and syncs to backend
      // WebSocket updates are for viewers, not the controller
      if (message.type === 'game_update') {
        // On the controller, we only use WebSocket for viewer count updates
        // All game state is managed locally - ignore WebSocket game data entirely
        // This prevents race conditions where stale server data overwrites local edits
        if (message.data?.viewer_count !== undefined) {
          setGame((prev) => prev ? { ...prev, viewer_count: message.data.viewer_count } : prev)
        }
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
            addGameLogEntry('kick', 'Extra point no good', possession)
            setShowPATAttempt(null)
          } else if (showPATAttempt === '2pt') {
            setBigPlay('2pt-no-good')
            addGameLogEntry('kick', '2-point conversion failed', possession)
            setShowPATAttempt(null)
          } else if (showFGAttempt) {
            setBigPlay('fg-no-good')
            addGameLogEntry('kick', `Field goal no good${fgDistance ? ` - ${fgDistance} yd` : ''}`, possession)
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
            startPlayClock(40, true)
          }
          setShowDownOnly(true)
          nextDown()
          break
        case 'firstDown':
          // Show first down overlay and reset downs (don't stop game clock)
          recordPlayResult('firstDown')
          setShowFirstDown(true)
          setTimeout(() => setShowFirstDown(false), 3000)
          setDown(1)
          setDistance(10)
          setShowDownOnly(false)
          resetPlayClock(40)
          startPlayClock(40, true)
          break
        case 'yardsPlus5':
          setDistance(prev => Math.min(99, prev + 5))
          break
        case 'yardsMinus5':
          setDistance(prev => Math.max(1, prev - 5))
          break
        case 'yardsPlus1':
          setDistance(prev => Math.min(99, prev + 1))
          break
        case 'yardsMinus1':
          setDistance(prev => Math.max(1, prev - 1))
          break
        case 'toggleDDVisible':
          setHideDownDistance(prev => !prev)
          break
        case 'toggleDownOnly':
          setShowDownOnly(prev => !prev)
          break
          
        // Play Results
        case 'incomplete':
          // Same as the Incomplete button: on 4th down this asks to confirm a turnover on downs
          stopTimer()
          setShowIncomplete(true)
          setTimeout(() => setShowIncomplete(false), 2000)
          nextDown()
          resetPlayClock(40)
          startPlayClock(40, true)
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
          recordPlayResult('turnover', 'Turnover')
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
          console.log('Interception keybind triggered, stopping timer')
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
          // Toggle injury status (same as the injury button)
          if (gameStatus === 'injury' || gameStatus === 'injury-timeout') {
            setGameStatus(null)
            setInjuryTeam(null)
          } else {
            setGameStatus('injury')
            stopTimer()
          }
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

  // Closed Immediate Actions boxes reappear on the next down, possession, quarter or status change
  useEffect(() => { setDismissedBoxes([]) }, [down, possession, game?.quarter, gameStatus])

  // End of a quarter, half, or the game once the clock has hit 0:00 and the last play is over
  function endPeriod() {
    const quarter = periodEndPending
    setPeriodEndPending(null)
    if (quarter === 'Q4' && game.home_score !== game.away_score) {
      finalizeGame()
    } else {
      setGameStatus('end-quarter')
    }
  }

  // The last play is over once something about it has been entered (down & distance, possession,
  // score, or a game log entry such as a first down, turnover, penalty or missed kick) and nothing
  // is still in progress (TD/PAT, FG, kick, turnover review, flag).
  const periodEndSnapRef = useRef(null)
  // (Close-call rulings aren't counted: after "Catch" or "Down by Contact" the down's result is still to come.)
  const playSignals = JSON.stringify([down, distance, possession, game?.home_score, game?.away_score, gameLog.filter(e => e.type !== 'close-call').length])
  useEffect(() => {
    if (!periodEndPending) { periodEndSnapRef.current = null; return }
    // Clock put back on, or the quarter changed by hand: nothing to wait for
    if (game?.quarter !== periodEndPending || (game?.game_time && game.game_time !== '0:00')) {
      setPeriodEndPending(null)
      return
    }
    if (periodEndSnapRef.current === null) { periodEndSnapRef.current = playSignals; return }
    const playInProgress = (closeCall && !closeCall.result) || showTDPanel || pendingPAT || showPATAttempt || showFGAttempt || scoreCelebration ||
      pendingTurnoverReview || pendingFumble || showTurnoverOnDownsConfirm || flagDisplayStage > 0 ||
      ['kickoff', 'onside-kick', 'punt', 'fg-setup'].includes(gameStatus)
    if (playSignals !== periodEndSnapRef.current && !playInProgress) endPeriod()
  }, [periodEndPending, playSignals, game?.quarter, game?.game_time, closeCall, showTDPanel, pendingPAT, showPATAttempt, showFGAttempt, scoreCelebration, pendingTurnoverReview, pendingFumble, showTurnoverOnDownsConfirm, flagDisplayStage, gameStatus])

  // Down & distance before the last play's result (first down, or next down / incomplete / out of
  // bounds), so an accepted foul on that play can replay it. See recordPlayResult / applyPenalty.
  const playUndoRef = useRef(null) // { team, down, distance, specialDistance, result, at }
  useEffect(() => { playUndoRef.current = null }, [possession])
  // Flag on the field: the play it may wipe out, and whether to replay it (default: the flag came
  // within a play clock of that result, so it's on that play). Shown as a choice in the flag panel.
  const [flagUndo, setFlagUndo] = useState(null)
  const [replayFlaggedPlay, setReplayFlaggedPlay] = useState(false)
  const REPLAY_DEFAULT_WINDOW_MS = 40000
  function noteFlagThrown() {
    const undo = playUndoRef.current
    const usable = undo && undo.team === possession
    setFlagUndo(usable ? undo : null)
    setReplayFlaggedPlay(!!usable && Date.now() - undo.at <= REPLAY_DEFAULT_WINDOW_MS)
  }
  // Dead-ball fouls (false start, encroachment, ...) stop the next play before the snap, so they
  // never replay the last one. Live-ball pre-snap fouls like offside can still replay it.
  const flaggedPreSnapOnly = selectedPenalties.length > 0 && selectedPenalties.every(p => p.penalty.deadBall)
  // "3rd & 4", "1st & Goal"
  const formatDownDistance = (d, dist, special) =>
    `${['1st', '2nd', '3rd', '4th'][d - 1] || d} & ${special === 'goal' ? 'Goal' : special === 'inches' ? 'Inches' : dist}`

  // The game clock tick runs from a timeout chain, so it reads possession from a ref
  const possessionRef = useRef(possession)
  useEffect(() => { possessionRef.current = possession }, [possession])

  // Game log: missed kicks from the PAT/2PT/FG result buttons (good kicks are logged as scores)
  useEffect(() => {
    if (['no-good', 'doink', 'blocked'].includes(fgResult)) {
      const how = { 'no-good': 'no good', doink: 'no good (doink)', blocked: 'blocked' }[fgResult]
      addGameLogEntry('kick', `Field goal ${how}${fgDistance ? ` - ${fgDistance} yd` : ''}`, possession)
    }
  }, [fgResult])
  useEffect(() => {
    if (patResult === 'no-good') {
      addGameLogEntry('kick', showPATAttempt === '2pt' ? '2-point conversion failed' : 'Extra point no good', possession)
    }
  }, [patResult])

  // Game log: quarter changes
  const lastQuarterRef = useRef(null)
  useEffect(() => {
    if (!game?.quarter) return
    const last = lastQuarterRef.current
    lastQuarterRef.current = { id: game.id, quarter: game.quarter }
    if (!last || last.id !== game.id || last.quarter === game.quarter) return
    if (game.quarter === 'Final') {
      addGameLogEntry('quarter', `Final: ${game.away_team?.abbreviation} ${game.away_score}, ${game.home_team?.abbreviation} ${game.home_score}`)
    } else if (game.quarter === 'Halftime') {
      addGameLogEntry('quarter', `Halftime: ${game.away_team?.abbreviation} ${game.away_score}, ${game.home_team?.abbreviation} ${game.home_score}`)
    } else if (game.quarter !== 'Pregame') {
      addGameLogEntry('quarter', `Start of ${game.quarter}`)
    }
    // Scoring summary: up at halftime and at the end, down when play resumes
    if (game.quarter === 'Halftime' || game.quarter?.startsWith('Final')) updateExtras({ showScoringSummary: true })
    else if (game.quarter !== 'Pregame') updateExtras({ showScoringSummary: false })
    // Going into overtime: put the OT rules up on the scoreboard
    if (game.quarter === 'OT' && !last.quarter?.startsWith('OT')) {
      setShowOTRules(true)
      setCoinToss({ winner: null, choice: null }) // overtime gets its own coin toss
      setShowCoinToss(false)
    }
  }, [game?.id, game?.quarter])

  // Commercial break clock starts when the break does
  useEffect(() => {
    setBreakStartedAt(gameStatus === 'ad-break' ? Date.now() : null)
  }, [gameStatus === 'ad-break'])

  // Drives: start when a team gets the ball, summarize when it loses it
  const driveRef = useRef(null) // { team, startSpot, startTop, plays, punted, logStart }
  const prevPossessionForDriveRef = useRef(null)
  useEffect(() => {
    if (gameStatus === 'punt' && driveRef.current) {
      driveRef.current.punted = true
      driveRef.current.plays += 1
    }
    if (fgResult && driveRef.current) driveRef.current.plays += 1
  }, [gameStatus, fgResult])
  useEffect(() => {
    const prev = prevPossessionForDriveRef.current
    prevPossessionForDriveRef.current = possession
    if (prev === possession) return
    const drive = driveRef.current
    if (drive && drive.team === prev && drive.plays > 0 && scoreboardExtras.showDriveSummaries) {
      // How the drive ended, from the game log since it started
      let result = drive.punted ? 'Punt' : ''
      for (const e of gameLog.slice(drive.logStart)) {
        if (e.team === drive.team && e.type === 'score' && e.description.startsWith('Touchdown')) result = 'Touchdown'
        else if (e.team === drive.team && e.type === 'score' && e.description.startsWith('Field goal')) result = 'Field Goal'
        else if (e.team === drive.team && e.type === 'turnover') result = e.description.split(' - ')[0]
        else if (e.team === drive.team && e.type === 'down' && e.description === 'Turnover on downs') result = 'Turnover on Downs'
        else if (e.team === drive.team && e.type === 'kick' && e.description.startsWith('Field goal')) result = 'Missed FG'
        else if (e.team !== drive.team && e.type === 'score' && e.description === 'Safety') result = 'Safety'
      }
      const yards = !scoreboardExtras.showBallSpot ? null
        : result === 'Touchdown' ? yardsToGoal(drive.startSpot, drive.team)
        : (ballOn - drive.startSpot) * (drive.team === 'home' ? 1 : -1)
      const summary = {
        id: Date.now(),
        team: drive.team,
        plays: drive.plays,
        yards,
        seconds: Math.max(0, (timeOfPossession[drive.team] || 0) - drive.startTop),
        result,
      }
      setDriveSummary(summary)
      setTimeout(() => setDriveSummary(cur => (cur?.id === summary.id ? null : cur)), 8000)
    }
    driveRef.current = (possession === 'home' || possession === 'away')
      ? { team: possession, startSpot: ballOn, startTop: timeOfPossession[possession] || 0, plays: 0, punted: false, logStart: gameLog.length }
      : null
  }, [possession])

  // Undo: a history of the game state each time it settles after a change (score, down & distance,
  // possession, ball spot, timeouts, quick stats, game log, status). Undo steps back one entry, so it
  // works for every button and keybind. The clocks and time of possession aren't part of it.
  const undoHistoryRef = useRef([])
  const [undoCount, setUndoCount] = useState(0)
  const undoSnapshot = game ? {
    home_score: game.home_score, away_score: game.away_score, down, distance, specialDistance, possession,
    ballOn, homeTimeouts, awayTimeouts, quickStats, gameLog, scoringRun, gameStatus, pendingPAT, kickoffPending,
  } : null
  const undoKey = undoSnapshot ? JSON.stringify(undoSnapshot) : null
  useEffect(() => {
    // A score's celebration delays the score itself; wait so the whole score is one undo step
    if (!undoKey || scoreCelebration) return
    const t = setTimeout(() => {
      const history = undoHistoryRef.current
      if (history.length && history[history.length - 1].key === undoKey) return
      history.push({ key: undoKey, state: JSON.parse(undoKey) })
      if (history.length > 40) history.shift()
      setUndoCount(history.length - 1)
    }, 600)
    return () => clearTimeout(t)
  }, [undoKey, !!scoreCelebration])
  function undoLastChange() {
    const history = undoHistoryRef.current
    if (history.length < 2) return
    history.pop()
    const prev = history[history.length - 1].state
    setUndoCount(history.length - 1)
    if (prev.home_score !== game.home_score || prev.away_score !== game.away_score) {
      suppressScoreEffectRef.current = true
      updateGame({ home_score: prev.home_score, away_score: prev.away_score })
    }
    setDown(prev.down); setDistance(prev.distance); setSpecialDistance(prev.specialDistance)
    setPossession(prev.possession); setBallOn(prev.ballOn)
    setHomeTimeouts(prev.homeTimeouts); setAwayTimeouts(prev.awayTimeouts)
    setQuickStats(prev.quickStats); setGameLog(prev.gameLog); setScoringRun(prev.scoringRun)
    setGameStatus(prev.gameStatus)
    setPendingPAT(prev.pendingPAT ?? null); setKickoffPending(!!prev.kickoffPending)
    // Overlays from the undone action shouldn't linger
    setShowFirstDown(false); setShowIncomplete(false); setShowTurnover(null); setPendingTurnoverReview(null)
    setPendingFumble(false); setScoreCelebration(null); setCloseCall(null)
  }

  // Points by quarter follow the score itself, so every way of scoring (TD, PAT, 2PT, FG, safety,
  // manual +/-) is counted, and corrections take points back off.
  const lastScoresRef = useRef(null)
  const suppressScoreEffectRef = useRef(false) // an undo restores quick stats itself
  useEffect(() => {
    if (!game) return
    const scores = { id: game.id, home: game.home_score || 0, away: game.away_score || 0 }
    const last = lastScoresRef.current
    lastScoresRef.current = scores
    // First load (stats were restored from the saved state) or a different game: nothing to add
    if (!last || last.id !== scores.id) return
    if (suppressScoreEffectRef.current) { suppressScoreEffectRef.current = false; return }

    const qtr = game.quarter || 'Q1'
    const qKey = qtr.startsWith('OT') ? 'ot' : qtr.toLowerCase()
    const quarterKeys = ['q1', 'q2', 'q3', 'q4', 'ot']
    for (const team of ['home', 'away']) {
      const delta = scores[team] - last[team]
      if (delta === 0) continue
      // Scoring run: consecutive points by one team (a score reset clears it)
      setScoringRun(run => {
        if (scores.home === 0 && scores.away === 0) return null
        if (delta > 0) return run?.team === team ? { team, points: run.points + delta } : { team, points: delta }
        return run?.team === team ? { team, points: Math.max(0, run.points + delta) } : run
      })
      setQuickStats(s => {
        const t = { ...s[team] }
        if (scores[team] === 0) {
          // Score reset
          quarterKeys.forEach(k => { t[k] = 0 })
        } else if (delta > 0) {
          if (!quarterKeys.includes(qKey)) return s
          t[qKey] = (t[qKey] || 0) + delta
        } else {
          // Take a correction off the current quarter first, then earlier ones
          let remaining = -delta
          const upTo = quarterKeys.includes(qKey) ? quarterKeys.indexOf(qKey) : quarterKeys.length - 1
          for (let i = upTo; i >= 0 && remaining > 0; i--) {
            const take = Math.min(t[quarterKeys[i]] || 0, remaining)
            t[quarterKeys[i]] = (t[quarterKeys[i]] || 0) - take
            remaining -= take
          }
        }
        return { ...s, [team]: t }
      })
    }
  }, [game?.id, game?.home_score, game?.away_score])

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
      show3AndOut,
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
      hidePossessionOutline,
      hideClock,
      displayStats,
      quickStats,
      coinToss,
      showCoinToss,
      coinTossData: coinToss,
      timeOfPossession,
      gameLog,
      showOTRules,
      closeCall,
      scoreboardExtras,
      driveSummary,
      scoringRun,
      ballOn,
      currentDrive: driveRef.current, // so a page reload doesn't restart the drive
      breakStartedAt,
      coinTossDoneFor,
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
  }, [game?.id, api, down, distance, ballOn, possession, homeTimeouts, awayTimeouts, playClock, bigPlay, flagDisplayStage, displayedPenalties, noTeamFlagText, flagResult, declinedPenaltyIndex, reviewDisplayStage, reviewReason, reviewCallOnField, reviewResult, showTimeoutDisplay, timeoutTeam, usedTimeoutIndex, timeoutClock, scoreCelebration, showTouchback, showOnsideKick, showFirstDown, showIncomplete, showOutOfBounds, show3AndOut, showTurnoverOnDowns, showTurnover, showFumbleRecovery, showRedZone, specialDistance, gameStatus, showLiveIndicator, challengeActive, challengeTeam, showFGAttempt, fgDistance, fgResult, showPATAttempt, patResult, showDownOnly, hideDownDistance, hideTimeouts, hideScore, showRecords, teamRecords, displayTitle, showDisplayTitle, showPlayClock, showCustomMessage, customMessage, customMessageColor, kickoffReceiver, showKickoffChoice, injuryTeam, showInjury, extraInfo, hidePossession, hidePossessionOutline, hideClock, displayStats, quickStats, coinToss, showCoinToss, timeOfPossession, gameLog, showOTRules, closeCall, scoreboardExtras, driveSummary, scoringRun, breakStartedAt, coinTossDoneFor])

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
    if (updates.game_time && !timerRunningRef.current) {
      // Update the ref as source of truth when explicitly setting game_time
      gameTimeRef.current = updates.game_time
    }
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
    
    // Points by quarter are tracked from score changes (see the quick stats effect)
    // An offensive TD on 3rd/4th down is a conversion
    if (delta >= 6 && delta <= 8 && team === possession) recordPlayResult('touchdown')
    if (newScore !== currentScore) addGameLogEntry(delta < 0 ? 'correction' : 'score', describeScore(newScore - currentScore, celebrationData), team, { points: newScore - currentScore })
    
    // Trigger celebration overlay for TDs, FGs, Safeties, and conversions
    if (delta === 6 || delta === 7 || delta === 8) {
      // Touchdown - show celebration first, then update score after animation
      setScoreCelebration({ type: 'touchdown', team, points: delta, ...celebrationData })
      setTimeout(async () => {
        await updateGame({ [field]: newScore })
        setScoreCelebration(null)
      }, 5000)
    } else if (delta === 3 || delta === 4) {
      // Field Goal (3 or 4 points) - let the FG bar's "GOOD!" stamp show first, then the
      // celebration (which replaces the bar), then update the score after the animation
      setTimeout(() => setScoreCelebration({ type: 'fieldgoal', team, points: delta, ...celebrationData }), 1200)
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
    
    addGameLogEntry('score', 'Safety', team, { points: 2 })
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
    addGameLogEntry('score', '2-point conversion good', team, { points: 2 })
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
  
  // Add entry to game log
  function addGameLogEntry(type, description, team = null, extra = {}) {
    const entry = {
      ...extra,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      quarter: gameRef.current?.quarter || game?.quarter || 'Pregame',
      time: gameTimeRef.current || gameRef.current?.game_time || game?.game_time || '0:00',
      type,
      description,
      team,
    }
    setGameLog(prev => [...prev, entry])
    return entry
  }

  // Game log text for a score change made through updateScore
  function describeScore(delta, details = {}) {
    if (delta < 0) return `Score correction (${delta})`
    if (delta >= 6 && delta <= 8) {
      const play = details.yards ? ` - ${details.yards} yd${details.playType ? ` ${details.playType}` : ''}` : ''
      return `Touchdown${play}${delta > 6 ? ` (+${delta})` : ''}`
    }
    if (delta === 3) return `Field goal good${details.distance ? ` - ${details.distance} yd` : ''}`
    if (delta === 2) return '2-point conversion good'
    if (delta === 1) return 'Extra point good'
    return `+${delta} points`
  }
  
  // Send notification to all viewers watching this game
  function sendNotification(title, message, type = 'info') {
    if (!game?.share_code) return
    
    const notification = {
      id: Date.now(),
      title,
      message,
      type, // 'score', 'turnover', 'info', 'custom'
      timestamp: new Date().toISOString(),
      quarter: game?.quarter,
      gameTime: game?.game_time,
    }
    
    console.log('[Notification] Sending notification:', notification)
    
    // Add to history
    setNotificationHistory(prev => [...prev.slice(-19), notification])
    
    // Send via the game update mechanism (will be broadcast to viewers)
    updateGame({
      notification: notification
    }).then(() => {
      console.log('[Notification] Notification sent successfully')
    }).catch(err => console.error('[Notification] Failed to send notification:', err))
  }
  
  // Auto-send notification based on settings
  function autoNotify(type, title, message) {
    const shouldSend = {
      'score': notificationSettings.autoScores,
      'touchdown': notificationSettings.autoTouchdowns,
      'turnover': notificationSettings.autoTurnovers,
      'quarter': notificationSettings.autoQuarterEnd,
      'halftime': notificationSettings.autoHalftime,
      'final': notificationSettings.autoGameEnd,
    }[type]
    
    if (shouldSend) {
      sendNotification(title, message, type)
    }
  }
  
  // Format time of possession as MM:SS
  function formatTOP(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Generate halftime stats summary text
  function generateHalftimeSummary() {
    const awayName = game.away_team?.name || 'Away'
    const homeName = game.home_team?.name || 'Home'
    const awayAbbr = game.away_team?.abbreviation || 'AWY'
    const homeAbbr = game.home_team?.abbreviation || 'HME'
    
    let summary = `=== HALFTIME STATS ===\n`
    summary += `${awayName} ${game.away_score} - ${game.home_score} ${homeName}\n\n`
    
    summary += `SCORING BY QUARTER:\n`
    summary += `${awayAbbr}: Q1: ${quickStats.away.q1} | Q2: ${quickStats.away.q2}\n`
    summary += `${homeAbbr}: Q1: ${quickStats.home.q1} | Q2: ${quickStats.home.q2}\n\n`
    
    summary += `TEAM STATS:\n`
    summary += `           ${awayAbbr.padEnd(6)} ${homeAbbr}\n`
    summary += `1st Downs: ${String(quickStats.away.firstDowns).padEnd(6)} ${quickStats.home.firstDowns}\n`
    summary += `Turnovers: ${String(quickStats.away.turnovers).padEnd(6)} ${quickStats.home.turnovers}\n`
    summary += `Penalties: ${String(quickStats.away.penalties).padEnd(6)} ${quickStats.home.penalties}\n`
    summary += `Pen Yards: ${String(quickStats.away.penaltyYards).padEnd(6)} ${quickStats.home.penaltyYards}\n`
    summary += `3rd Down:  ${quickStats.away.thirdDownConv}/${quickStats.away.thirdDownAtt}    ${quickStats.home.thirdDownConv}/${quickStats.home.thirdDownAtt}\n`
    summary += `4th Down:  ${quickStats.away.fourthDownConv}/${quickStats.away.fourthDownAtt}    ${quickStats.home.fourthDownConv}/${quickStats.home.fourthDownAtt}\n`
    summary += `T.O.P.:    ${formatTOP(timeOfPossession.away).padEnd(6)} ${formatTOP(timeOfPossession.home)}\n`
    
    return summary
  }
  
  // Export full game summary
  function exportGameSummary() {
    const awayName = game.away_team?.name || 'Away'
    const homeName = game.home_team?.name || 'Home'
    const awayAbbr = game.away_team?.abbreviation || 'AWY'
    const homeAbbr = game.home_team?.abbreviation || 'HME'
    const gameDate = game.scheduled_time ? new Date(game.scheduled_time).toLocaleDateString() : new Date().toLocaleDateString()
    
    let summary = `========================================\n`
    summary += `GAME SUMMARY\n`
    summary += `${gameDate}\n`
    summary += `========================================\n\n`
    
    summary += `FINAL SCORE:\n`
    summary += `${awayName}: ${game.away_score}\n`
    summary += `${homeName}: ${game.home_score}\n\n`
    
    summary += `SCORING BY QUARTER:\n`
    summary += `        Q1   Q2   Q3   Q4   OT   TOTAL\n`
    summary += `${awayAbbr.padEnd(6)} ${String(quickStats.away.q1).padStart(2)}   ${String(quickStats.away.q2).padStart(2)}   ${String(quickStats.away.q3).padStart(2)}   ${String(quickStats.away.q4).padStart(2)}   ${String(quickStats.away.ot).padStart(2)}   ${String(game.away_score).padStart(3)}\n`
    summary += `${homeAbbr.padEnd(6)} ${String(quickStats.home.q1).padStart(2)}   ${String(quickStats.home.q2).padStart(2)}   ${String(quickStats.home.q3).padStart(2)}   ${String(quickStats.home.q4).padStart(2)}   ${String(quickStats.home.ot).padStart(2)}   ${String(game.home_score).padStart(3)}\n\n`
    
    summary += `TEAM STATISTICS:\n`
    summary += `                    ${awayAbbr.padEnd(8)} ${homeAbbr}\n`
    summary += `First Downs:        ${String(quickStats.away.firstDowns).padEnd(8)} ${quickStats.home.firstDowns}\n`
    summary += `Turnovers:          ${String(quickStats.away.turnovers).padEnd(8)} ${quickStats.home.turnovers}\n`
    summary += `Penalties:          ${String(quickStats.away.penalties).padEnd(8)} ${quickStats.home.penalties}\n`
    summary += `Penalty Yards:      ${String(quickStats.away.penaltyYards).padEnd(8)} ${quickStats.home.penaltyYards}\n`
    summary += `3rd Down Conv:      ${quickStats.away.thirdDownConv}/${quickStats.away.thirdDownAtt}      ${quickStats.home.thirdDownConv}/${quickStats.home.thirdDownAtt}\n`
    summary += `4th Down Conv:      ${quickStats.away.fourthDownConv}/${quickStats.away.fourthDownAtt}      ${quickStats.home.fourthDownConv}/${quickStats.home.fourthDownAtt}\n`
    summary += `Time of Possession: ${formatTOP(timeOfPossession.away).padEnd(8)} ${formatTOP(timeOfPossession.home)}\n\n`
    
    // Custom stats
    if (quickStats.custom?.length > 0) {
      summary += `CUSTOM STATS:\n`
      quickStats.custom.forEach(stat => {
        summary += `${stat.label.padEnd(20)} ${String(stat.away).padEnd(8)} ${stat.home}\n`
      })
      summary += `\n`
    }
    
    // Coin toss
    if (coinToss.winner) {
      const winner = coinToss.winner === 'home' ? homeName : awayName
      summary += `COIN TOSS: ${winner} won, elected to ${coinToss.choice || 'N/A'}\n\n`
    }
    
    // Game log
    if (gameLog.length > 0) {
      summary += `========================================\n`
      summary += `PLAY-BY-PLAY LOG (${gameLog.length} entries)\n`
      summary += `========================================\n`
      gameLog.forEach(entry => {
        const teamLabel = entry.team ? (entry.team === 'home' ? homeAbbr : awayAbbr) : ''
        summary += `[${entry.quarter}] ${entry.time} - ${entry.type.toUpperCase()}${teamLabel ? ` (${teamLabel})` : ''}: ${entry.description}\n`
      })
    }
    
    return summary
  }
  
  // Copy summary to clipboard
  function copyGameSummary() {
    const summary = exportGameSummary()
    navigator.clipboard.writeText(summary).then(() => {
      alert('Game summary copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy:', err)
      // Fallback - show in alert
      alert(summary)
    })
  }
  
  // Download summary as text file
  function downloadGameSummary() {
    const summary = exportGameSummary()
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `game-summary-${game.away_team?.abbreviation || 'away'}-vs-${game.home_team?.abbreviation || 'home'}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
    setCoinToss({ winner: null, choice: null })
    setCoinTossDoneFor(null)
    stopTimer()
  }

  // Helper to finalize game and sync bracket
  // End the game: status final, so it counts in standings. `overrides` can set the final score
  // (Quick Finish) or the quarter label ('Final/T' for a tie).
  async function finalizeGame(overrides = {}) {
    const homeScore = overrides.home_score ?? game.home_score
    const awayScore = overrides.away_score ?? game.away_score
    setPeriodEndPending(null)
    await updateGame({ quarter: 'Final', ...overrides, status: 'final' })
    setGameStatus('final')
    setPossession(null)
    setHideDownDistance(true)
    stopTimer()
    
    // Auto-sync to linked bracket match
    if (linkedBracketMatch) {
      try {
        let winner_id = null
        if (homeScore > awayScore) {
          winner_id = game.home_team?.id
        } else if (awayScore > homeScore) {
          winner_id = game.away_team?.id
        }

        await bracketApi.updateMatch(linkedBracketMatch.id, {
          team1_score: homeScore,
          team2_score: awayScore,
          status: 'completed',
          winner_id,
        })
        
        setBracketSynced(true)
        console.log('Bracket match auto-synced')
      } catch (error) {
        console.error('Failed to auto-sync to bracket:', error)
      }
    }
    
    // Team W/L and standings are rebuilt on the server from final scores when the game goes final
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
    
    // Get game settings with defaults
    const quarterTime = game.quarter_length || '15:00'
    const halftimeTime = game.halftime_length || '20:00'
    const overtimeTime = game.overtime_length || '10:00'
    
    // Handle special transitions
    if (nextQ === 'Q1') {
      // Starting the game from Pregame
      await updateGame({ quarter: nextQ, game_time: quarterTime })
      setGameStatus(null)
    } else if (nextQ === 'Halftime') {
      // Going to halftime - set halftime timer and show halftime status
      await updateGame({ quarter: nextQ, game_time: halftimeTime })
      setGameStatus('halftime-show')
      stopTimer()
      setPossession(null)
      setHideDownDistance(true)
    } else if (nextQ === 'Q3') {
      // Coming out of halftime - go to Q3
      await updateGame({ quarter: nextQ, game_time: quarterTime })
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
      await updateGame({ quarter: nextQ, game_time: overtimeTime })
      setGameStatus(null)
    } else if (nextQ === 'Final') {
      // Game over
      await finalizeGame()
    } else {
      // Regular quarter change (Q1->Q2, Q3->Q4)
      await updateGame({ quarter: nextQ, game_time: quarterTime })
      setGameStatus(null)
    }
  }

  async function prevQuarter() {
    // Get game settings with defaults
    const quarterTime = game.quarter_length || '15:00'
    const halftimeTime = game.halftime_length || '20:00'
    const overtimeTime = game.overtime_length || '10:00'
    
    // Handle extended OT periods (OT2, OT3, etc.)
    if (game.quarter?.startsWith('OT') && game.quarter !== 'OT') {
      // Go back to previous OT or OT1
      const otNum = parseInt(game.quarter.replace('OT', '')) || 2
      if (otNum > 2) {
        await updateGame({ quarter: `OT${otNum - 1}`, game_time: overtimeTime })
      } else {
        await updateGame({ quarter: 'OT', game_time: overtimeTime })
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
      await updateGame({ quarter: prevQ, game_time: halftimeTime })
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
      await updateGame({ quarter: prevQ, game_time: quarterTime })
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
    setShowOTRules(false) // Play is starting; take the OT rules down
    if (coinToss.winner && coinToss.choice) finishCoinToss() // and put the finished coin toss away
    
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
    
    // Time of possession runs with the game clock for the team with the ball
    const team = possessionRef.current
    if (newSeconds < currentSeconds && (team === 'home' || team === 'away')) {
      setTimeOfPossession(prev => ({ ...prev, [team]: (prev[team] || 0) + 1 }))
    }
    
    // Update ref as source of truth
    gameTimeRef.current = newTime
    
    // Update local state only (backend calculates from timer_started_at)
    setGame(prev => prev ? { ...prev, game_time: newTime } : prev)
    
    // Handle end of clock: the play that's running still finishes, so the end of the
    // quarter/half/game waits for it (see periodEndPending)
    if (newSeconds <= 0) {
      timerRunningRef.current = false
      setTimerRunning(false)
      api.update(gameId, { game_time: '0:00', timer_running: false }).catch(() => {})
      setPeriodEndPending(currentGame.quarter)
      return
    }
    
    // Handle 2-minute warning (end of each half, and every overtime period) - auto stop clock and show 2-min warning status
    if (newSeconds === 120 && (['Q2', 'Q4'].includes(currentGame.quarter) || currentGame.quarter?.startsWith('OT'))) {
      timerRunningRef.current = false
      setTimerRunning(false)
      setGameStatus('two-minute') // Automatically show 2-min warning
      api.update(gameId, { game_time: newTime, timer_running: false }).catch(() => {})
      return
    }
    
    // Sync game_time to server every 3 seconds so viewers see updates without overloading
    if (newSeconds % 3 === 0) {
      api.update(gameId, { game_time: newTime }).catch(() => {})
    }
    
    // Schedule next tick
    if (timerRunningRef.current) {
      setTimeout(doGameTick, 1000)
    }
  }

  function stopTimer() {
    timerRunningRef.current = false
    setTimerRunning(false)
    // Save stopped state AND current time to backend
    // Use gameTimeRef as source of truth, fallback to game state
    const currentTime = gameTimeRef.current || gameRef.current?.game_time || game?.game_time
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
    const newSeconds = Math.max(0, currentSeconds + seconds) // No max cap
    const newTime = formatTime(newSeconds)
    gameTimeRef.current = newTime // Update ref as source of truth
    setGame(prev => ({ ...prev, game_time: newTime }))
    updateGame({ game_time: newTime })
  }

  // Play clock timeout ref for cleanup
  const playClockTimeoutRef = useRef(null)
  
  // Play clock functions
  function startPlayClock(forceSeconds = null, useDelay = false) {
    // Clear any existing delay timeout first
    if (playClockDelayTimeoutRef.current) {
      clearTimeout(playClockDelayTimeoutRef.current)
      playClockDelayTimeoutRef.current = null
    }
    
    // Clear any existing play clock timeout
    if (playClockTimeoutRef.current) {
      clearTimeout(playClockTimeoutRef.current)
      playClockTimeoutRef.current = null
    }
    
    if (playClockRunningRef.current) return
    
    // Set the play clock value immediately
    if (forceSeconds !== null) {
      setPlayClock(forceSeconds)
      playClockRef.current = forceSeconds
    }
    
    // If delay is enabled and we should use it, wait before starting
    const delayMs = useDelay && playClockDelay > 0 ? playClockDelay * 1000 : 0
    
    if (delayMs > 0) {
      // Start after delay, then tick immediately
      playClockDelayTimeoutRef.current = setTimeout(() => {
        playClockRunningRef.current = true
        setPlayClockRunning(true)
        doPlayClockTick()
      }, delayMs)
    } else {
      // Start immediately, tick immediately (no 1 sec wait)
      playClockRunningRef.current = true
      setPlayClockRunning(true)
      doPlayClockTick()
    }
  }
  
  function doPlayClockTick() {
    if (!playClockRunningRef.current) return
    
    // Read current value from ref (source of truth)
    const currentSeconds = playClockRef.current
    const newSeconds = Math.max(0, currentSeconds - 1)
    
    // Update both ref and state
    playClockRef.current = newSeconds
    setPlayClock(newSeconds)
    
    if (newSeconds <= 0) {
      playClockRunningRef.current = false
      setPlayClockRunning(false)
      playClockTimeoutRef.current = null
      return
    }
    
    // Schedule next tick only if still running
    playClockTimeoutRef.current = setTimeout(doPlayClockTick, 1000)
  }

  function stopPlayClock() {
    // Clear any pending delay timeout
    if (playClockDelayTimeoutRef.current) {
      clearTimeout(playClockDelayTimeoutRef.current)
      playClockDelayTimeoutRef.current = null
    }
    // Clear any pending play clock timeout
    if (playClockTimeoutRef.current) {
      clearTimeout(playClockTimeoutRef.current)
      playClockTimeoutRef.current = null
    }
    playClockRunningRef.current = false
    setPlayClockRunning(false)
  }

  function resetPlayClock(seconds = 40) {
    stopPlayClock()
    setPlayClock(seconds)
    playClockRef.current = seconds
  }

  function adjustPlayClock(seconds) {
    const newSeconds = Math.max(0, Math.min(99, playClockRef.current + seconds))
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

  // Automatic quick stats for the team with the ball, based on how the current down ended:
  //   'firstDown'        - gained a first down (counts a 3rd/4th down conversion)
  //   'penaltyFirstDown' - first down from a defensive penalty (no down attempt; the play didn't count)
  //   'touchdown'        - offensive TD (counts a 3rd/4th down conversion)
  //   'failed'           - didn't convert: next down, incomplete, turnover on downs
  //   'turnover'         - interception or lost fumble (a turnover and a failed 3rd/4th down)
  // Punts and field goals aren't down attempts, so they aren't recorded here.
  // `detail` (e.g. 'Interception') is written to the game log.
  function recordPlayResult(result, detail = null) {
    const team = possession
    if (team !== 'home' && team !== 'away') return
    const playDown = down
    if (result !== 'penaltyFirstDown' && driveRef.current) driveRef.current.plays += 1
    // Remember the down & distance before this play, in case an accepted foul on it means a replay
    playUndoRef.current = (result === 'firstDown' || result === 'failed')
      ? { team, down: playDown, distance, specialDistance, result, at: Date.now() }
      : null
    // Game log: first downs (noting 3rd/4th down conversions), and anything given a description
    if (result === 'firstDown') {
      addGameLogEntry('down', playDown >= 3 ? `First down (${playDown === 3 ? '3rd' : '4th'} down conversion)` : 'First down', team)
    } else if (detail) {
      addGameLogEntry(result === 'turnover' ? 'turnover' : 'down', detail, team)
    }
    setQuickStats(s => {
      const t = { ...s[team] }
      if (result === 'firstDown' || result === 'penaltyFirstDown') t.firstDowns = (t.firstDowns || 0) + 1
      if (result === 'turnover') t.turnovers = (t.turnovers || 0) + 1
      if ((playDown === 3 || playDown === 4) && result !== 'penaltyFirstDown') {
        const key = playDown === 3 ? 'thirdDown' : 'fourthDown'
        t[`${key}Att`] = (t[`${key}Att`] || 0) + 1
        if (result === 'firstDown' || result === 'touchdown') t[`${key}Conv`] = (t[`${key}Conv`] || 0) + 1
      }
      return { ...s, [team]: t }
    })
  }

  // First Down button: reset the downs, restart the play clock, show the overlay, count it
  function awardFirstDown() {
    resetDowns()
    if (!playClockRunning) {
      setPlayClock(40)
      startPlayClock(40, true)
    }
    setShowDownOnly(false)
    setShowFirstDown(true)
    setTimeout(() => setShowFirstDown(false), 3000)
    // Track first down (and 3rd/4th down conversion) in quick stats
    recordPlayResult('firstDown')
    // Inside the 10 with the ball spot tracked: & Goal
    if (scoreboardExtras.showBallSpot && (possession === 'home' || possession === 'away')) {
      const toGoal = yardsToGoal(ballOn, possession)
      if (toGoal <= 10) {
        setDistance(toGoal)
        setSpecialDistance('goal')
      }
    }
  }

  // Ball spot buttons: move the ball for the offense (negative = loss) and keep the line to gain fixed
  function moveBall(yards) {
    const team = possession
    if (team !== 'home' && team !== 'away') return
    if (!scoreboardExtras.showBallSpot) updateExtras({ showBallSpot: true }) // using the spot means showing it
    const newSpot = advanceSpot(ballOn, team, yards)
    const gained = (newSpot - ballOn) * (team === 'home' ? 1 : -1)
    setBallOn(newSpot)
    if (specialDistance === 'goal') {
      setDistance(Math.max(1, yardsToGoal(newSpot, team)))
    } else {
      setDistance(Math.max(1, distance - gained))
      if (specialDistance === 'inches') setSpecialDistance(null)
    }
  }

  // Close calls: the ball is dead while it's decided, so the clock stops
  const closeCallClockWasRunningRef = useRef(false)
  function startCloseCall(type) {
    closeCallClockWasRunningRef.current = timerRunningRef.current
    stopTimer()
    setCloseCall({ type, result: null })
  }

  function resolveCloseCall(result) {
    const call = closeCall
    if (!call) return
    addGameLogEntry('close-call', `Close call: ${CLOSE_CALLS[call.type].question} ${result === 'yes' ? CLOSE_CALLS[call.type].yes : CLOSE_CALLS[call.type].no}`, possession)
    // Rulings with their own overlay (first down, incomplete, fumble, TD) clear the banner right away
    let ownOverlay = false
    if (call.type === 'firstDown') {
      if (result === 'yes') {
        awardFirstDown()
        ownOverlay = true
      } else {
        // Short of the line: next down, and it's close, so "& inches" (4th down asks about a turnover on downs)
        if (down < 4) {
          nextDown()
          setDistance(1)
          setSpecialDistance('inches')
        } else {
          nextDown() // Shows the turnover on downs prompt
          ownOverlay = true
        }
      }
    } else if (call.type === 'touchdown' && result === 'yes') {
      setShowTDPanel(possession || 'home')
      ownOverlay = true
    } else if (call.type === 'catch' && result === 'no') {
      nextDown()
      setShowIncomplete(true)
      setTimeout(() => setShowIncomplete(false), 2000)
      ownOverlay = true
    } else if (call.type === 'fumble' && result === 'yes') {
      setShowTurnover('fumble')
      setPendingTurnoverReview('fumble')
      ownOverlay = true
    }
    // Ball spotted in bounds: if the clock was running before the call, it starts again on the ruling
    // (incomplete, touchdown, fumble, and a turnover on downs keep it stopped)
    const inBounds = (call.type === 'firstDown' && !(result === 'no' && down === 4)) ||
      (call.type === 'catch' && result === 'yes') || (call.type === 'fumble' && result === 'no') ||
      (call.type === 'touchdown' && result === 'no')
    if (inBounds && closeCallClockWasRunningRef.current) {
      startTimer()
      if (!(call.type === 'firstDown' && result === 'yes')) { resetPlayClock(40); startPlayClock(40, true) } // first downs already do this
    }
    closeCallClockWasRunningRef.current = false
    if (ownOverlay) {
      setCloseCall(null)
    } else {
      setCloseCall({ type: call.type, result })
      setTimeout(() => setCloseCall(prev => (prev && prev.type === call.type && prev.result === result ? null : prev)), 3000)
    }
  }

  // Down & Distance functions
  function nextDown() {
    if (down < 4) {
      recordPlayResult('failed')
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
    if ((team === 'home' && homeTimeouts > 0) || (team === 'away' && awayTimeouts > 0)) {
      const left = (team === 'home' ? homeTimeouts : awayTimeouts) - 1
      addGameLogEntry('timeout', `Timeout (${left} left)`, team)
    }
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
      // Overlay stays visible until endTimeout is called or timeout clock finishes
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
      // Overlay stays visible until endTimeout is called or timeout clock finishes
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

  // Flag/Penalty functions: the built-in list plus the league's custom penalties (League Settings)
  const allPenalties = [...NFL_PENALTIES, ...leaguePenalties.filter(lp => !NFL_PENALTIES.some(p => p.name === lp.name))]
  const filteredPenalties = allPenalties.filter(p => 
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
    if (flagDisplayStage === 0) noteFlagThrown()
    setFlagDisplayStage(1)
    // Hide play clock when flag is thrown (but don't stop game clock)
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
    // Track penalties in quick stats and the game log
    selectedPenalties.forEach(sp => {
      addGameLogEntry('penalty', `${sp.penalty.name}${sp.penalty.yards ? ` - ${sp.penalty.yards} yds` : ''}`, sp.team)
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
    // For simplicity, use the first penalty if multiple
    const sp = selectedPenalties[0]
    const penaltyOnOffense = !!sp && ((sp.team === 'home' && possession === 'home') || 
                                      (sp.team === 'away' && possession === 'away'))

    // Replay the flagged play: back to the down & distance before it, then enforce the foul from there
    let baseDown = down
    let baseDistance = distance
    let baseSpecialDistance = specialDistance
    const undo = flagUndo
    if (sp && undo && replayFlaggedPlay && !flaggedPreSnapOnly && undo.team === possession) {
      baseDown = undo.down
      baseDistance = undo.distance
      baseSpecialDistance = undo.specialDistance
      setDown(baseDown)
      setDistance(baseDistance)
      setSpecialDistance(baseSpecialDistance)
      // Take back what the play counted: a first down, and any 3rd/4th down attempt (and conversion)
      setQuickStats(s => {
        const t = { ...s[undo.team] }
        if (undo.result === 'firstDown') t.firstDowns = Math.max(0, (t.firstDowns || 0) - 1)
        if (undo.down === 3 || undo.down === 4) {
          const key = undo.down === 3 ? 'thirdDown' : 'fourthDown'
          t[`${key}Att`] = Math.max(0, (t[`${key}Att`] || 0) - 1)
          if (undo.result === 'firstDown') t[`${key}Conv`] = Math.max(0, (t[`${key}Conv`] || 0) - 1)
        }
        return { ...s, [undo.team]: t }
      })
      addGameLogEntry('down', `Play wiped out by penalty - replay ${formatDownDistance(undo.down, undo.distance, undo.specialDistance)}`, undo.team)
      playUndoRef.current = null
    }

    // A defensive foul with an automatic first down always gives one, from any of the selected
    // penalties and even at & Goal (then it's 1st & Goal)
    const isOnDefense = (p) => (p.team === 'home' || p.team === 'away') && p.team !== possession && (possession === 'home' || possession === 'away')
    const autoFirstFoul = selectedPenalties.find(p => p.penalty.autoFirst && isOnDefense(p))
    if (autoFirstFoul) {
      recordPlayResult('penaltyFirstDown')
      setDown(1)
      const tracked = scoreboardExtras.showBallSpot && (possession === 'home' || possession === 'away')
      const toGoal = tracked ? yardsToGoal(ballOn, possession) : null
      if (baseSpecialDistance === 'goal') {
        // Still goal to go; keep the distance unless the ball spot says otherwise
        setDistance(toGoal ?? baseDistance)
        setSpecialDistance('goal')
      } else if (toGoal !== null && toGoal <= 10) {
        setDistance(toGoal)
        setSpecialDistance('goal')
      } else {
        setDistance(10)
        setSpecialDistance(null)
      }
    }

    // Other penalties adjust the distance. Don't change anything if it's "&Goal" - half the distance
    // to goal is handled manually
    if (!autoFirstFoul && baseSpecialDistance !== 'goal' && sp) {
      const penalty = sp.penalty
      
      if (penalty.lossOfDown && penaltyOnOffense) {
        // Offensive penalty with loss of down
        if (baseDown < 4) {
          setDown(baseDown + 1)
          // Distance increases by penalty yards
          const newDist = baseDistance + penalty.yards
          setDistance(Math.min(newDist, 99))
        }
      } else if (penaltyOnOffense && penalty.yards > 0) {
        // Offensive penalty - add yards to distance (replay down)
        const newDist = baseDistance + penalty.yards
        setDistance(Math.min(newDist, 99))
        setSpecialDistance(null)
      } else if (!penaltyOnOffense && penalty.yards > 0) {
        // Defensive penalty - subtract yards from distance
        const newDist = baseDistance - penalty.yards
        if (newDist <= 0) {
          // Penalty yards reach the line to gain: first down
          recordPlayResult('penaltyFirstDown')
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
    if (baseDown === 4) {
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
    setFlagUndo(null)
    setReplayFlaggedPlay(false)
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
    if (flagDisplayStage === 0) noteFlagThrown()
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
    // Declining one of several penalties: the others were accepted, so they count
    if (penaltyIndex !== null && displayedPenalties.length > 1) {
      displayedPenalties.forEach((dp, i) => {
        if (i === penaltyIndex || (dp.team !== 'home' && dp.team !== 'away')) return
        addGameLogEntry('penalty', `${dp.name}${dp.yards ? ` - ${dp.yards} yds` : ''}`, dp.team)
        setQuickStats(s => ({ ...s, [dp.team]: { ...s[dp.team], penalties: (s[dp.team].penalties || 0) + 1, penaltyYards: (s[dp.team].penaltyYards || 0) + (dp.yards || 0) } }))
      })
    }
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
              
              {/* Share via Email/SMS */}
              <div className="space-y-2">
                <Label>Share via</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/game/${game.share_code}`
                      const subject = encodeURIComponent(`Watch: ${game.away_team?.name || 'Away'} vs ${game.home_team?.name || 'Home'}`)
                      const body = encodeURIComponent(`Watch the game live!\n\nGame: ${game.away_team?.name || 'Away'} vs ${game.home_team?.name || 'Home'}\nShare Code: ${game.share_code}\n\nWatch here: ${shareUrl}`)
                      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                    }}
                  >
                    📧 Email
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/game/${game.share_code}`
                      const message = encodeURIComponent(`Watch the game live! ${game.away_team?.name || 'Away'} vs ${game.home_team?.name || 'Home'}\n\nCode: ${game.share_code}\n${shareUrl}`)
                      // Try SMS on mobile, fallback to copy
                      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                        window.open(`sms:?body=${message}`, '_blank')
                      } else {
                        navigator.clipboard.writeText(decodeURIComponent(message))
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }
                    }}
                  >
                    💬 Text/SMS
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/game/${game.share_code}`
                      const text = encodeURIComponent(`Watch: ${game.away_team?.name || 'Away'} vs ${game.home_team?.name || 'Home'} 🏈`)
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420')
                    }}
                  >
                    𝕏 Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/game/${game.share_code}`
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420')
                    }}
                  >
                    📘 Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/game/${game.share_code}`
                      const text = encodeURIComponent(`Watch: ${game.away_team?.name || 'Away'} vs ${game.home_team?.name || 'Home'} 🏈 ${shareUrl}`)
                      window.open(`https://wa.me/?text=${text}`, '_blank')
                    }}
                  >
                    💚 WhatsApp
                  </Button>
                </div>
              </div>
              
              {/* QR Code hint */}
              <div className="text-center text-xs text-slate-500 pt-2 border-t">
                <p>Viewers can watch the game live with automatic updates</p>
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
                  { value: 'Q1', label: 'Q1', time: game.quarter_length || '15:00' },
                  { value: 'Q2', label: 'Q2', time: game.quarter_length || '15:00' },
                  { value: 'Halftime', label: 'Half', time: game.halftime_length || '20:00' },
                  { value: 'Q3', label: 'Q3', time: game.quarter_length || '15:00' },
                  { value: 'Q4', label: 'Q4', time: game.quarter_length || '15:00' },
                  { value: 'OT', label: 'OT', time: game.overtime_length || '10:00' },
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
                  onClick={() => updateScore('away', -1)}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-4xl font-bold w-20 text-center">{game.away_score}</span>
                <Button
                  size="lg"
                  onClick={() => updateScore('away', 1)}
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
                    onClick={() => updateScore('away', pts)}
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
          <CardContent className="overflow-visible px-1 sm:px-6">
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
              show3AndOut={show3AndOut}
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
              hidePossessionOutline={hidePossessionOutline}
              hideClock={hideClock}
              displayStats={displayStats}
              quickStats={quickStats}
              timeOfPossession={timeOfPossession}
              showOTRules={showOTRules}
              closeCall={closeCall}
              extras={{ scoreboardExtras, driveSummary, scoringRun, ballOn, gameLog, breakStartedAt }}
              showCoinToss={showCoinToss}
              coinTossData={coinToss}
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
        <div className="grid lg:grid-cols-2 gap-4 [&>*]:min-w-0">
          {/* Game Clock & Play Clock Controls */}
          <Card data-tutorial="game-clock">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Clock Controls</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 [&>*]:min-w-0">
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
                      
                      const quarterTime = game.quarter_length || '15:00'
                      const halftimeTime = game.halftime_length || '20:00'
                      
                      if (nextQ === 'Halftime') {
                        // Update time and quarter together
                        setGame(prev => ({ ...prev, game_time: halftimeTime, quarter: 'Halftime' }))
                        await updateGame({ game_time: halftimeTime, quarter: 'Halftime' })
                        setGameStatus('halftime-show')
                        setPossession(null)
                        setHideDownDistance(true)
                      } else if (nextQ) {
                        // Update time and quarter together
                        setGame(prev => ({ ...prev, game_time: quarterTime, quarter: nextQ }))
                        await updateGame({ game_time: quarterTime, quarter: nextQ })
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
                
                {/* Start Delay Setting */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">Start Delay:</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => setPlayClockDelay(prev => Math.max(0, prev - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-mono">{playClockDelay}s</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => setPlayClockDelay(prev => Math.min(10, prev + 1))}
                    >
                      +
                    </Button>
                  </div>
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
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 border-t">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <div className="col-span-2 sm:col-span-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
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
                <div className="flex gap-1 mt-2">
                  <button
                    className={`flex-1 py-1.5 px-2 rounded-lg border-2 transition-all text-xs font-bold ${
                      hidePossession 
                        ? 'bg-purple-600 border-purple-600 text-white ring-2 ring-purple-400' 
                        : 'bg-transparent border-purple-400 text-purple-600 dark:text-purple-400 opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setHidePossession(!hidePossession)}
                  >
                    {hidePossession ? "Show All" : "Hide All"}
                  </button>
                  <button
                    className={`flex-1 py-1.5 px-2 rounded-lg border-2 transition-all text-xs font-bold ${
                      hidePossessionOutline 
                        ? 'bg-green-600 border-green-600 text-white ring-2 ring-green-400' 
                        : 'bg-transparent border-green-400 text-green-600 dark:text-green-400 opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setHidePossessionOutline(!hidePossessionOutline)}
                  >
                    {hidePossessionOutline ? "Show Ring" : "Hide Ring"}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Ball spot - absolute field position, see lib/fieldPosition.js */}
            {(() => {
              const homeAbbr = game.home_team?.abbreviation || 'HOME'
              const awayAbbr = game.away_team?.abbreviation || 'AWAY'
              const side = ballOn <= 50 ? 'home' : 'away'
              const yardLine = ballOn <= 50 ? ballOn : 100 - ballOn
              const hasOffense = possession === 'home' || possession === 'away'
              return (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 uppercase">Ball on <span className="ml-1 text-sm font-bold text-slate-900 dark:text-white normal-case">{spotLabel(ballOn, homeAbbr, awayAbbr)}</span></p>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={scoreboardExtras.showBallSpot} onChange={(e) => updateExtras({ showBallSpot: e.target.checked })} />
                      Show on scoreboard
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <select
                      value={side}
                      onChange={(e) => { setBallOn(ownYardLineToSpot(e.target.value, yardLine)); updateExtras({ showBallSpot: true }) }}
                      className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 text-sm"
                    >
                      <option value="away">{awayAbbr}</option>
                      <option value="home">{homeAbbr}</option>
                    </select>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={yardLine}
                      onChange={(e) => {
                        const y = Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                        setBallOn(ownYardLineToSpot(side, y))
                        updateExtras({ showBallSpot: true })
                      }}
                      className="h-8 w-16 text-sm"
                    />
                    <span className="text-[11px] text-slate-500 mx-1">Gain:</span>
                    {[-5, -1, 1, 5, 10].map(y => (
                      <Button key={y} size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={!hasOffense} onClick={() => moveBall(y)}>
                        {y > 0 ? `+${y}` : y}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Quick Actions */}
            <div className="pt-2 border-t space-y-2">
              {/* Undo the last change (score, downs, stats, log...) */}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-slate-400"
                disabled={undoCount === 0}
                onClick={undoLastChange}
              >
                ↩️ Undo last change{undoCount > 0 ? ` (${undoCount})` : ''}
              </Button>

              {/* First Down - Full Width */}
              <Button 
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
                size="sm" 
                onClick={awardFirstDown}
              >
                ⬇️ First Down!
              </Button>

              {/* Close calls - put the question on the scoreboard while it's decided (not a replay review) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CLOSE_CALL_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={closeCall?.type === type && !closeCall.result ? "default" : "outline"}
                    size="sm"
                    className={closeCall?.type === type && !closeCall.result ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-cyan-400 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50"}
                    onClick={() => startCloseCall(type)}
                  >
                    🤔 {CLOSE_CALLS[type].question}
                  </Button>
                ))}
              </div>
              
              {/* Other Actions - Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-400 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    if (!playClockRunning) {
                      setPlayClock(40)
                      startPlayClock(40, true)
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
                      startPlayClock(40, true)
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
                    startPlayClock(40, true)
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
            {/* Close call being decided */}
            {closeCall && !closeCall.result && (
              <div className="relative pl-8 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => setCloseCall(null)} />
                <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">🤔 Close Call: {CLOSE_CALLS[closeCall.type].question}</p>
                <div className="flex flex-wrap items-center gap-1 text-xs text-cyan-800 dark:text-cyan-300">
                  <span>Clock ran after the play? Put time back:</span>
                  {[1, 3, 5].map(n => (
                    <Button key={n} size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => adjustGameTime(n)}>+{n}s</Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => resolveCloseCall('yes')}>
                    ✓ {CLOSE_CALLS[closeCall.type].yes}
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => resolveCloseCall('no')}>
                    ✗ {CLOSE_CALLS[closeCall.type].no}
                  </Button>
                </div>
              </div>
            )}
            {/* Clock hit 0:00 - the end of the period waits for the current play */}
            {periodEndPending && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ⏱️ 0:00 - {periodEndPending === 'Q4' ? (game.home_score === game.away_score ? 'end of regulation' : 'game ends') : periodEndPending === 'Q2' ? 'halftime' : `end of ${periodEndPending}`} after this play
                </p>
                <p className="text-xs text-slate-500">Enter the play's result as usual. If no play is running, end it now.</p>
                <Button size="sm" className="w-full bg-slate-700 hover:bg-slate-800 text-white" onClick={endPeriod}>
                  End {periodEndPending} Now
                </Button>
              </div>
            )}
            {/* Overtime Rules - available in Q4 (in case it ends tied) and during OT */}
            {(game.quarter === 'Q4' || game.quarter?.startsWith('OT')) && otRulesBoxClosedFor !== game.quarter && (() => {
              const rules = getOvertimeRules(game.ot_format, game.overtime_length)
              return (
                <div className="relative pl-8 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg space-y-2">
                  <BoxClose onClick={() => { setOtRulesBoxClosedFor(game.quarter); setShowOTRules(false) }} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">⏱️ Overtime Rules ({rules.title})</p>
                    <Button
                      size="sm"
                      variant={showOTRules ? "default" : "outline"}
                      className={showOTRules ? "bg-indigo-600 hover:bg-indigo-700" : "border-indigo-400 text-indigo-700 dark:text-indigo-300"}
                      onClick={() => setShowOTRules(prev => !prev)}
                    >
                      {showOTRules ? '📺 Hide' : '📺 Show on Scoreboard'}
                    </Button>
                  </div>
                  <ul className="text-xs text-indigo-700 dark:text-indigo-300 list-disc pl-4 space-y-0.5">
                    {rules.lines.map(line => <li key={line}>{line}</li>)}
                  </ul>
                  <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70">
                    Shows automatically when overtime starts and hides when the clock starts. Change the format in League Settings.
                  </p>
                </div>
              )
            })()}
            {/* Coin Toss - Pregame or OT */}
            {coinTossOpen && !coinToss.winner && (
              <div className="relative pl-8 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <BoxClose onClick={finishCoinToss} />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">🪙 Coin Toss</p>
                <div className="space-y-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400">Who won the toss?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm"
                      variant={coinToss.winner === 'away' ? "default" : "outline"}
                      className={coinToss.winner === 'away' ? "bg-amber-600" : "border-amber-400 text-amber-700 dark:text-amber-400"}
                      onClick={() => setCoinToss(prev => ({ ...prev, winner: 'away' }))}
                    >
                      {game.away_team?.abbreviation || 'Away'}
                    </Button>
                    <Button 
                      size="sm"
                      variant={coinToss.winner === 'home' ? "default" : "outline"}
                      className={coinToss.winner === 'home' ? "bg-amber-600" : "border-amber-400 text-amber-700 dark:text-amber-400"}
                      onClick={() => setCoinToss(prev => ({ ...prev, winner: 'home' }))}
                    >
                      {game.home_team?.abbreviation || 'Home'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Coin Toss Choice - After winner selected */}
            {coinTossOpen && coinToss.winner && !coinToss.choice && (
              <div className="relative pl-8 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <BoxClose onClick={finishCoinToss} />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  🪙 {coinToss.winner === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation} won - Election?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setCoinToss(prev => ({ ...prev, choice: 'receive' }))
                      setShowCoinToss(true)
                      setTimeout(() => setShowCoinToss(false), 5000)
                    }}
                  >
                    📥 Receive
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setCoinToss(prev => ({ ...prev, choice: 'kick' }))
                      setShowCoinToss(true)
                      setTimeout(() => setShowCoinToss(false), 5000)
                    }}
                  >
                    🦵 Kick
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      setCoinToss(prev => ({ ...prev, choice: 'defer' }))
                      setShowCoinToss(true)
                      setTimeout(() => setShowCoinToss(false), 5000)
                    }}
                  >
                    ⏳ Defer
                  </Button>
                </div>
                <Button 
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs text-amber-600 hover:text-amber-700"
                  onClick={() => setCoinToss({ winner: null, choice: null })}
                >
                  ← Change Winner
                </Button>
              </div>
            )}

            {/* Coin Toss Complete - Show result */}
            {coinTossOpen && coinToss.winner && coinToss.choice && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    🪙 {coinToss.winner === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation} won → {coinToss.choice === 'receive' ? '📥 Receive' : coinToss.choice === 'kick' ? '🦵 Kick' : '⏳ Defer'}
                  </p>
                  <div className="flex gap-1">
                    <Button 
                      size="sm"
                      variant={showCoinToss ? "default" : "outline"}
                      className={`h-7 text-xs ${showCoinToss ? "bg-amber-500 hover:bg-amber-600" : "border-amber-400"}`}
                      onClick={() => setShowCoinToss(!showCoinToss)}
                    >
                      {showCoinToss ? '📺 Hide' : '📺 Show'}
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-slate-400 hover:text-red-500"
                      onClick={() => {
                        // Toss is done: put it away for this period (keeps the result)
                        finishCoinToss()
                        setShowCoinToss(false)
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Start Game - Pregame only */}
            {!dismissedBoxes.includes('startGame') && (game.quarter === 'Pregame' || gameStatus === 'pregame') && (
              <div className="relative pl-8 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => dismissBox('startGame')} />
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Ready to start?</p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // Set to Q1, kickoff, and update game
                    updateGame({ quarter: 'Q1', game_time: game.quarter_length || '15:00' })
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            
            {/* OT Score - End Game Prompt */}
            {showOTEndPrompt && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">🏈 Score in OT - End Game?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowOTEndPrompt(false)
                      finalizeGame()
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
              <div className="relative pl-8 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => { setShowPATAttempt(null); setPatResult(null) }} />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {showPATAttempt === 'pat' ? 'PAT Attempt' : '2PT Conversion'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    className="bg-pink-600 hover:bg-pink-700"
                    onClick={() => {
                      setPatResult('doink')
                      setTimeout(() => {
                        setShowPATAttempt(null)
                        setPatResult(null)
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setKickoffPending(true)
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                        }
                      }, 2500)
                    }}
                  >
                    🎯 Doink!
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
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      setPatResult('blocked')
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
                    🚫 Blocked
                  </Button>
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => {
                      // Blocked and returned for score by defense
                      const defenseTeam = (possession || 'home') === 'home' ? 'away' : 'home'
                      const points = showPATAttempt === 'pat' ? 6 : 2 // Pick 6 for PAT, Pick 2 for 2PT
                      updateScore(defenseTeam, points)
                      setPatResult('blocked-return')
                      setTimeout(() => {
                        setShowPATAttempt(null)
                        setPatResult(null)
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setKickoffPending(true)
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                        }
                      }, 3000)
                    }}
                  >
                    {showPATAttempt === 'pat' ? '🏈 Pick 6' : '🏈 Pick 2'}
                  </Button>
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => {
                      setShowPATAttempt(null)
                      setPatResult(null)
                      showFlagStage1()
                    }}
                  >
                    🚩 Penalty
                  </Button>
                </div>
              </div>
            )}
            
            {/* Field Goal Result */}
            {showFGAttempt && !fgResult && (
              <div className="relative pl-8 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => { setShowFGAttempt(false); setFgResult(null) }} />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Field Goal Attempt ({fgDistance} yards)
                  {game.four_point_fg_enabled && fgDistance >= (game.four_point_fg_distance || 50) && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">4 PT RANGE</span>
                  )}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setFgResult('good')
                      stopTimer() // Stop clock after FG result
                      const scoringTeam = possession || 'home'
                      const distance = fgDistance
                      // Check if 4-point FG is enabled and distance qualifies
                      const points = game.four_point_fg_enabled && fgDistance >= (game.four_point_fg_distance || 50) ? 4 : 3
                      updateScore(scoringTeam, points, { distance })
                      setTimeout(() => {
                        setShowFGAttempt(false)
                        setFgResult(null)
                        setScoreCelebration(null)
                        // Check if in OT - show end game prompt
                        if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                          setShowOTEndPrompt(true)
                        } else {
                          setKickoffPending(true)
                          setKickingTeam(scoringTeam) // Scoring team kicks off
                          setShowAdBreakPrompt(true)
                          setPossession(null)
                          setShowPlayClock(false)
                          setHideDownDistance(true)
                        }
                      }, 5000)
                    }}
                  >
                    ✓ Good {game.four_point_fg_enabled && fgDistance >= (game.four_point_fg_distance || 50) ? '(4 PT)' : ''}
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setFgResult('no-good')
                      stopTimer() // Stop clock after FG result
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
                    className="bg-pink-600 hover:bg-pink-700"
                    onClick={() => {
                      setFgResult('doink')
                      stopTimer() // Stop clock after FG result
                      setTimeout(() => {
                        setShowFGAttempt(false)
                        setFgResult(null)
                        togglePossession()
                      }, 3500)
                    }}
                  >
                    🎯 Doink!
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
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      setFgResult('blocked')
                      stopTimer() // Stop clock after FG result
                      setTimeout(() => {
                        setShowFGAttempt(false)
                        setFgResult(null)
                        togglePossession()
                      }, 3000)
                    }}
                  >
                    🚫 Blocked
                  </Button>
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => {
                      // Blocked and returned for TD by defense
                      const defenseTeam = (possession || 'home') === 'home' ? 'away' : 'home'
                      setShowFGAttempt(false)
                      setFgResult(null)
                      // Show TD panel for the blocking team
                      setShowTDPanel(defenseTeam)
                    }}
                  >
                    🏈 Pick 6
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
                      recordPlayResult('failed', 'Turnover on downs')
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
              <div className="relative pl-8 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => { setPendingTurnoverReview(null); setShowTurnover(null) }} />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  {pendingTurnoverReview === 'downs' ? 'Turnover on Downs' : 'Interception'} - Review?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Confirm turnover - no review
                      // A turnover on downs is a failed 4th down, not a turnover in the stats
                      if (pendingTurnoverReview === 'downs') recordPlayResult('failed', 'Turnover on downs')
                      else recordPlayResult('turnover', 'Interception')
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
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => {
                      setPendingTurnoverReview(null)
                      setShowTurnover(null)
                      setShowFlagPanel(true)
                      showFlagStage1()
                    }}
                  >
                    🚩 Flag
                  </Button>
                </div>
                {/* Touchback and Pick 6 options for interceptions */}
                {pendingTurnoverReview === 'interception' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        recordPlayResult('turnover', 'Interception - touchback')
                        setBallOn(ownYardLineToSpot(possession === 'home' ? 'away' : 'home', 20))
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
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        // Pick 6 - defense scores TD
                        const scoringTeam = possession === 'home' ? 'away' : 'home'
                        setPendingTurnoverReview(null)
                        setShowTurnover(null)
                        // Track turnover
                        recordPlayResult('turnover', 'Interception - returned for TD')
                        // Show TD panel for the intercepting team
                        setShowTDPanel(scoringTeam)
                      }}
                    >
                      🏈 Pick 6
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Fumble Review/Recovery Options */}
            {pendingTurnoverReview === 'fumble' && (
              <div className="relative pl-8 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => { setPendingTurnoverReview(null); setShowTurnover(null) }} />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Fumble - Review or Recovery?</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
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
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => {
                      setPendingTurnoverReview(null)
                      setShowTurnover(null)
                      setShowFlagPanel(true)
                      showFlagStage1()
                    }}
                  >
                    🚩 Flag
                  </Button>
                </div>
                {/* Scoop & Score option */}
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    // Scoop & Score - defense recovers and scores TD
                    const scoringTeam = possession === 'home' ? 'away' : 'home'
                    setPendingTurnoverReview(null)
                    setShowTurnover(null)
                    // Track turnover
                    recordPlayResult('turnover', 'Fumble lost - returned for TD')
                    // Show TD panel for the recovering team
                    setShowTDPanel(scoringTeam)
                  }}
                >
                  🏈 Scoop & Score
                </Button>
              </div>
            )}
            
            {/* Fumble Recovery Options */}
            {pendingFumble && (
              <div className="relative pl-8 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => { setPendingFumble(false); setShowTurnover(null) }} />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Fumble - Who Recovers?</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      recordPlayResult('turnover', 'Fumble lost')
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      setKickoffPending(false)
                      setScoreCelebration(null)
                      setShowAdBreakPrompt(false)
                      // Set 4th & distance from league settings, from own 25
                      const altDistance = game.onside_alt_distance || 15
                      setDown(4)
                      setDistance(altDistance)
                      setBallOn(ownYardLineToSpot(kickingTeam, 25))
                      setPossession(kickingTeam)
                      setGoingForIt(true)
                      setKickingTeam(null)
                      setGameStatus(null)
                    }}
                  >
                    🎲 4th & {game.onside_alt_distance || 15}
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
            
            {/* Kickoff button after score - normal flow (skip if Q4 onside kick choice is showing) */}
            {kickoffPending && (!gameStatus || gameStatus === 'kickoff-choice') && !(
              game.quarter === 'Q4' && kickingTeam && !gameStatus && (
                (kickingTeam === 'home' && game.home_score <= game.away_score) ||
                (kickingTeam === 'away' && game.away_score <= game.home_score)
              )
            ) && (
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
              <div className="relative pl-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <BoxClose onClick={() => { setGameStatus(null) }} />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">End of {game.quarter}</p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    const currentIndex = QUARTERS.indexOf(game.quarter)
                    const nextQ = QUARTERS[currentIndex + 1]
                    
                    const quarterTime = game.quarter_length || '15:00'
                    const halftimeTime = game.halftime_length || '20:00'
                    
                    if (nextQ === 'Halftime') {
                      // Update time and quarter together
                      setGame(prev => ({ ...prev, game_time: halftimeTime, quarter: 'Halftime' }))
                      await updateGame({ game_time: halftimeTime, quarter: 'Halftime' })
                      setGameStatus('halftime-show')
                      setPossession(null)
                      setHideDownDistance(true)
                      setHideTimeouts(true)
                    } else if (nextQ) {
                      // Update time and quarter together
                      setGame(prev => ({ ...prev, game_time: quarterTime, quarter: nextQ }))
                      await updateGame({ game_time: quarterTime, quarter: nextQ })
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
              <div className="relative pl-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <BoxClose onClick={() => { setGameStatus(null) }} />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">End of Q4</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => finalizeGame()}
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
              <div className="relative pl-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <BoxClose onClick={() => { setGameStatus(null) }} />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  End of {game.quarter} {game.home_score === game.away_score ? '- Still Tied' : ''}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => finalizeGame()}
                  >
                    🏁 End Game
                  </Button>
                  {game.home_score === game.away_score && (
                    <Button 
                      className="bg-slate-600 hover:bg-slate-700"
                      onClick={() => finalizeGame({ quarter: 'Final/T' })}
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
              <div className="relative pl-8 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg space-y-2">
                <BoxClose onClick={() => { setGameStatus(null) }} />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">End of Regulation - Tied Game</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button 
                    className="bg-slate-600 hover:bg-slate-700"
                    onClick={() => finalizeGame({ quarter: 'Final/T' })}
                  >
                    🤝 End as Tie
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      // Go to OT - set quarter to OT and show kickoff selection
                      updateGame({ quarter: 'OT', game_time: game.quarter_length || '15:00' })
                      setGameStatus(null)
                      setKickoffPending(true)
                      setShowAdBreakPrompt(true)
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    ⏱️ Go to OT
                  </Button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">Select who receives the OT kickoff:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="text-white"
                    style={{ backgroundColor: game.away_team?.color }}
                    onClick={() => {
                      updateGame({ quarter: 'OT', game_time: game.quarter_length || '15:00' })
                      setGameStatus('kickoff')
                      setKickoffReceiver('away')
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    {game.away_team?.abbreviation} receives
                  </Button>
                  <Button 
                    className="text-white"
                    style={{ backgroundColor: game.home_team?.color }}
                    onClick={() => {
                      updateGame({ quarter: 'OT', game_time: game.quarter_length || '15:00' })
                      setGameStatus('kickoff')
                      setKickoffReceiver('home')
                      setPossession(null)
                      setHideDownDistance(true)
                    }}
                  >
                    {game.home_team?.abbreviation} receives
                  </Button>
                </div>
              </div>
            )}
            
            {/* Pregame Countdown Timer */}
            {!dismissedBoxes.includes('countdown') && game.quarter === 'Pregame' && countdown && (
              <div className="relative pl-8 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BoxClose onClick={() => dismissBox('countdown')} />
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
            {!dismissedBoxes.includes('kickoffReceiver') && (game.quarter === 'Pregame' || gameStatus === 'halftime-show' || (game.quarter === 'Q4' && game.home_score === game.away_score && gameStatus === 'end-quarter')) && (
              <div className="relative pl-8 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BoxClose onClick={() => dismissBox('kickoffReceiver')} />
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
            
            {/* Kickoff options - base results only (penalties go through the FLAG button) */}
            {gameStatus === 'kickoff' && (
              <div className="relative pl-8 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BoxClose onClick={() => { setGameStatus(null); setShowKickoffChoice(false) }} />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Kickoff Result</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setPossession(kickoffReceiver)
                      if (kickoffReceiver) setBallOn(ownYardLineToSpot(kickoffReceiver, game.touchback_yard || 25))
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
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => {
                      // Kickoff return TD
                      setGameStatus(null)
                      setShowKickoffChoice(false)
                      stopTimer()
                      setShowTDPanel(kickoffReceiver)
                      setKickoffReceiver(null)
                    }}
                  >
                    🏈 Return TD
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
                </div>
              </div>
            )}
            
            {/* Onside Kick options - Recovered by kicking team or receiving team */}
            {gameStatus === 'onside-kick' && (
              <div className="relative pl-8 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <BoxClose onClick={() => { setGameStatus(null) }} />
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
            
            {/* Punt options - base results only (penalties go through the FLAG button) */}
            {gameStatus === 'punt' && (
              <div className="relative pl-8 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BoxClose onClick={() => { setGameStatus(null) }} />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Punt Result</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setGameStatus(null)
                      stopTimer()
                      setBallOn(ownYardLineToSpot(possession === 'home' ? 'away' : 'home', 20))
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
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => {
                      // Punt return TD - receiving team scores
                      const receivingTeam = possession === 'home' ? 'away' : 'home'
                      setGameStatus(null)
                      stopTimer()
                      setShowTDPanel(receivingTeam)
                    }}
                  >
                    🏈 Return TD
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
            {!dismissedBoxes.includes('specialTeams') && !kickoffPending && gameStatus !== 'kickoff' && gameStatus !== 'punt' && game.quarter !== 'Pregame' && gameStatus !== 'halftime-show' && !(game.quarter === 'Q4' && game.home_score === game.away_score && gameStatus === 'end-quarter') && !showFGAttempt && down === 4 && !goingForIt && (
              <div className="relative pl-8 grid grid-cols-4 gap-2">
                <BoxClose onClick={() => dismissBox('specialTeams')} />
                <Button 
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => setGameStatus('punt')}
                >
                  🦶 Punt
                </Button>
                <Button 
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    setShow3AndOut(true)
                    setTimeout(() => setShow3AndOut(false), 3000)
                    setGameStatus('punt')
                  }}
                >
                  3 & Out
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
              {/* Flag on a play whose result was already entered: replay it, or let it stand */}
              {flagDisplayStage > 0 && flagUndo && flaggedPreSnapOnly && (
                <p className="text-xs text-slate-500">Dead-ball foul before the snap: enforced from the current down ({formatDownDistance(down, distance, specialDistance)}).</p>
              )}
              {flagDisplayStage > 0 && flagUndo && !flaggedPreSnapOnly && (
                <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 p-2 space-y-1.5">
                  <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">Penalty on the last play?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={replayFlaggedPlay ? 'default' : 'outline'}
                      className={replayFlaggedPlay ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
                      onClick={() => setReplayFlaggedPlay(true)}
                    >
                      ↩️ Replay {formatDownDistance(flagUndo.down, flagUndo.distance, flagUndo.specialDistance)}
                    </Button>
                    <Button
                      size="sm"
                      variant={!replayFlaggedPlay ? 'default' : 'outline'}
                      className={!replayFlaggedPlay ? 'bg-slate-700 hover:bg-slate-800 text-white' : ''}
                      onClick={() => setReplayFlaggedPlay(false)}
                    >
                      Play stands ({formatDownDistance(down, distance, specialDistance)})
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">The penalty is enforced from the down you pick when you press Apply.</p>
                </div>
              )}
              {/* Three-Stage Flag Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* FG Attempt - Left side */}
                <div className="sm:col-span-2 space-y-3">
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
                <div className="space-y-2 border-t pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4 border-amber-300">
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
                      <div className="grid grid-cols-2 gap-1">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-8"
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
                              if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                                setShowOTEndPrompt(true)
                              } else {
                                setKickoffPending(true)
                                setShowAdBreakPrompt(true)
                                setPossession(null)
                                setShowPlayClock(false)
                              }
                              setHideDownDistance(true)
                            }, 2000)
                          }}
                        >
                          ✓ Good
                        </Button>
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8"
                          onClick={() => {
                            setPatResult('no-good')
                            setTimeout(() => {
                              setShowPATAttempt(null)
                              setPatResult(null)
                              if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                                setShowOTEndPrompt(true)
                              } else {
                                setKickoffPending(true)
                                setShowAdBreakPrompt(true)
                                setPossession(null)
                                setShowPlayClock(false)
                              }
                              setHideDownDistance(true)
                            }, 2000)
                          }}
                        >
                          ✗ No Good
                        </Button>
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8"
                          onClick={() => {
                            setShowPATAttempt(null)
                            setPatResult(null)
                            setHideDownDistance(false)
                            setShowPlayClock(true)
                          }}
                        >
                          🎭 Faked
                        </Button>
                        <Button 
                          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8"
                          onClick={() => {
                            setPatResult('blocked')
                            setTimeout(() => {
                              setShowPATAttempt(null)
                              setPatResult(null)
                              if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                                setShowOTEndPrompt(true)
                              } else {
                                setKickoffPending(true)
                                setShowAdBreakPrompt(true)
                                setPossession(null)
                                setShowPlayClock(false)
                              }
                              setHideDownDistance(true)
                            }, 2000)
                          }}
                        >
                          🚫 Blocked
                        </Button>
                        <Button 
                          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs h-8"
                          onClick={() => {
                            const defenseTeam = (possession || 'home') === 'home' ? 'away' : 'home'
                            const points = showPATAttempt === 'pat' ? 6 : 2
                            updateScore(defenseTeam, points)
                            setPatResult('blocked-return')
                            setTimeout(() => {
                              setShowPATAttempt(null)
                              setPatResult(null)
                              if (game.quarter === 'OT' || game.quarter?.startsWith('OT')) {
                                setShowOTEndPrompt(true)
                              } else {
                                setKickoffPending(true)
                                setShowAdBreakPrompt(true)
                                setPossession(null)
                                setShowPlayClock(false)
                              }
                              setHideDownDistance(true)
                            }, 3000)
                          }}
                        >
                          {showPATAttempt === 'pat' ? '🏈 Pick 6' : '🏈 Pick 2'}
                        </Button>
                        <Button 
                          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs h-8"
                          onClick={() => {
                            setShowPATAttempt(null)
                            setPatResult(null)
                            showFlagStage1()
                          }}
                        >
                          🚩 Penalty
                        </Button>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-400 text-amber-800 text-xs mt-1"
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={() => {
                        setFgResult('good')
                        const scoringTeam = possession || 'home'
                        const distance = fgDistance
                        const points = game.four_point_fg_enabled && fgDistance >= (game.four_point_fg_distance || 50) ? 4 : 3
                        updateScore(scoringTeam, points, { distance })
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    // Un-finalize: the game no longer counts in standings
                    setGameStatus(null)
                    updateGame({ status: 'live' })
                  } else {
                    finalizeGame()
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

      {/* Scoreboard Extras */}
      {game.status === 'live' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>✨</span> Scoreboard Extras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Look */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Theme</p>
                <select
                  value={scoreboardExtras.theme}
                  onChange={(e) => updateExtras({ theme: e.target.value })}
                  className="w-full h-9 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="team">Team Colors</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Size (TVs and big screens)</p>
                <select
                  value={scoreboardExtras.size}
                  onChange={(e) => updateExtras({ size: e.target.value })}
                  className="w-full h-9 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
            </div>

            {/* On/off extras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'showBallSpot', label: 'Ball spot and field strip (needs possession and D&D showing)' },
                { key: 'showDriveSummaries', label: 'Drive summaries on change of possession' },
                { key: 'showScoringSummary', label: 'Scoring summary (auto at halftime and final)' },
                { key: 'showScoringRuns', label: 'Scoring runs ("17 straight points")' },
                { key: 'showOtherScores', label: "Other scores this week", disabled: standalone },
                { key: 'showWinProb', label: 'Win probability bar' },
                { key: 'showRedZoneAuto', label: 'Red zone / goal line (needs ball spot)' },
                { key: 'showStatComparison', label: 'Team stat comparison' },
                { key: 'showBreakCard', label: 'Break card during timeouts and commercials' },
                { key: 'showPreviousMeeting', label: 'Last meeting between the teams', disabled: standalone },
                { key: 'showSeasonContext', label: 'Season context ("2nd in NFC East")', disabled: standalone },
              ].map(opt => (
                <label key={opt.key} className={`flex items-center gap-2 ${opt.disabled ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={opt.disabled}
                    checked={!!scoreboardExtras[opt.key]}
                    onChange={(e) => updateExtras({ [opt.key]: e.target.checked })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Venue / weather line */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Venue / weather line</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Lincoln Financial Field · 54°F, clear"
                  value={scoreboardExtras.venue.text}
                  onChange={(e) => updateExtras({ venue: { ...scoreboardExtras.venue, text: e.target.value } })}
                  className="h-9"
                />
                <Button
                  size="sm"
                  variant={scoreboardExtras.venue.show ? 'default' : 'outline'}
                  className="h-9 shrink-0"
                  disabled={!scoreboardExtras.venue.text.trim()}
                  onClick={() => updateExtras({ venue: { ...scoreboardExtras.venue, show: !scoreboardExtras.venue.show } })}
                >
                  {scoreboardExtras.venue.show ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {/* Sponsors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">Sponsors (rotate under the scoreboard)</p>
                <Button
                  size="sm"
                  variant={scoreboardExtras.sponsors.show ? 'default' : 'outline'}
                  className="h-7"
                  disabled={scoreboardExtras.sponsors.items.length === 0}
                  onClick={() => updateExtras({ sponsors: { ...scoreboardExtras.sponsors, show: !scoreboardExtras.sponsors.show } })}
                >
                  {scoreboardExtras.sponsors.show ? 'Hide' : 'Show'}
                </Button>
              </div>
              {scoreboardExtras.sponsors.items.map((item, i) => (
                <div key={item.id} className="flex flex-wrap gap-1 items-center">
                  <Input
                    placeholder="Text, e.g. Brought to you by Joe's Pizza"
                    value={item.text}
                    onChange={(e) => updateExtras({ sponsors: { ...scoreboardExtras.sponsors, items: scoreboardExtras.sponsors.items.map((it, j) => j === i ? { ...it, text: e.target.value } : it) } })}
                    className="h-8 flex-1 min-w-[10rem] text-sm"
                  />
                  <Input
                    placeholder="Logo image URL (optional)"
                    value={item.imageUrl}
                    onChange={(e) => updateExtras({ sponsors: { ...scoreboardExtras.sponsors, items: scoreboardExtras.sponsors.items.map((it, j) => j === i ? { ...it, imageUrl: e.target.value } : it) } })}
                    className="h-8 flex-1 min-w-[10rem] text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-500 border-red-300"
                    onClick={() => updateExtras({ sponsors: { ...scoreboardExtras.sponsors, items: scoreboardExtras.sponsors.items.filter((_, j) => j !== i) } })}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => updateExtras({ sponsors: { ...scoreboardExtras.sponsors, items: [...scoreboardExtras.sponsors.items, { id: `${Date.now()}`, text: '', imageUrl: '' }] } })}
                >
                  + Add Sponsor
                </Button>
                <span className="text-xs text-slate-500">Rotate every</span>
                <Input
                  type="number"
                  min="3"
                  max="60"
                  value={scoreboardExtras.sponsors.interval}
                  onChange={(e) => updateExtras({ sponsors: { ...scoreboardExtras.sponsors, interval: Math.min(60, Math.max(3, parseInt(e.target.value) || 8)) } })}
                  className="h-8 w-16 text-sm"
                />
                <span className="text-xs text-slate-500">seconds</span>
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
                <div key={index} className="flex flex-wrap gap-1 items-center">
                  <Input
                    placeholder={`Line ${index + 1}...`}
                    value={line.text}
                    onChange={(e) => setExtraInfo(prev => ({
                      ...prev,
                      lines: prev.lines.map((l, i) => i === index ? { ...l, text: e.target.value } : l)
                    }))}
                    className="flex-1 min-w-[8rem]"
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="flex items-center justify-center gap-3">
              <Button size="lg" className="gap-2 bg-green-600 hover:bg-green-700" onClick={startGame}>
                <Play className="h-5 w-5" />
                Kickoff - Start Game
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                onClick={() => {
                  setQuickFinishScores({ home: game.home_score, away: game.away_score })
                  setShowQuickFinish(true)
                }}
              >
                <Zap className="h-5 w-5" />
                Quick Finish
              </Button>
            </div>
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
            <Button
              variant="outline"
              className="mt-4"
              onClick={async () => {
                if (!confirm('Reopen this game? It goes back to live (and out of the standings until it is final again).')) return
                // Back to the quarter it ended in (from the game log), otherwise Q4
                const lastQuarter = [...gameLog].reverse().map(e => e.quarter)
                  .find(q => q && !q.startsWith('Final') && q !== 'Halftime' && q !== 'Pregame') || 'Q4'
                await updateGame({ status: 'live', quarter: lastQuarter })
                setGameStatus(null)
                addGameLogEntry('quarter', 'Game reopened')
              }}
            >
              ↩️ Reopen Game
            </Button>
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
              <div className="space-y-3">
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
                {/* Flag/Penalty Option */}
                <Button
                  size="lg"
                  className="w-full gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                  onClick={() => {
                    hideReview()
                    setShowFlagPanel(true)
                    showFlagStage1()
                  }}
                >
                  <Flag className="h-5 w-5" />
                  🚩 Flag on Play
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
                  <Button
                    variant="outline"
                    className="gap-2 w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                    onClick={() => {
                      setQuickFinishScores({ home: game.home_score, away: game.away_score })
                      setShowQuickFinish(true)
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    Quick Finish
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    onClick={() => setDisplayStats(prev => withDisplayShow({
                      ...prev,
                      ...Object.fromEntries(DISPLAY_STAT_BUTTONS.map(b => [b.key, !prev.all])),
                      all: !prev.all
                    }))}
                  >
                    {displayStats.all ? '📺 Hide All' : '📺 Show All'}
                  </Button>
                  {DISPLAY_STAT_BUTTONS.map(b => (
                    <Button 
                      key={b.key}
                      size="sm" 
                      variant={displayStats[b.key] ? "default" : "outline"}
                      className={displayStats[b.key] ? b.activeClass : ""}
                      onClick={() => setDisplayStats(prev => withDisplayShow({ ...prev, [b.key]: !prev[b.key], all: false }))}
                    >
                      {b.label}
                    </Button>
                  ))}
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
                        return withDisplayShow({ ...prev, customStats: newCustomStats, all: false })
                      })}
                    >
                      {stat.shortLabel || stat.label}
                    </Button>
                  ))}
                </div>
              </div>


              {/* Conversion Rates */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Conversion Rates</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Away Team */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {game.away_team?.logo_url ? (
                        <img src={game.away_team.logo_url} alt="" className="h-4 w-4 object-contain" />
                      ) : (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: game.away_team?.color || '#6b7280' }} />
                      )}
                      {game.away_team?.abbreviation || 'Away'}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16">3rd Down:</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, thirdDownConv: Math.max(0, s.away.thirdDownConv - 1)}}))}> -</Button>
                        <span className="font-bold">{quickStats.away.thirdDownConv}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, thirdDownConv: s.away.thirdDownConv + 1}}))}>+</Button>
                      </div>
                      <span>/</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, thirdDownAtt: Math.max(0, s.away.thirdDownAtt - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.away.thirdDownAtt}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, thirdDownAtt: s.away.thirdDownAtt + 1}}))}>+</Button>
                      </div>
                      <span className="text-slate-400">({quickStats.away.thirdDownAtt > 0 ? Math.round(quickStats.away.thirdDownConv / quickStats.away.thirdDownAtt * 100) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16">4th Down:</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, fourthDownConv: Math.max(0, s.away.fourthDownConv - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.away.fourthDownConv}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, fourthDownConv: s.away.fourthDownConv + 1}}))}>+</Button>
                      </div>
                      <span>/</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, fourthDownAtt: Math.max(0, s.away.fourthDownAtt - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.away.fourthDownAtt}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, away: {...s.away, fourthDownAtt: s.away.fourthDownAtt + 1}}))}>+</Button>
                      </div>
                      <span className="text-slate-400">({quickStats.away.fourthDownAtt > 0 ? Math.round(quickStats.away.fourthDownConv / quickStats.away.fourthDownAtt * 100) : 0}%)</span>
                    </div>
                  </div>
                  {/* Home Team */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {game.home_team?.logo_url ? (
                        <img src={game.home_team.logo_url} alt="" className="h-4 w-4 object-contain" />
                      ) : (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: game.home_team?.color || '#6b7280' }} />
                      )}
                      {game.home_team?.abbreviation || 'Home'}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16">3rd Down:</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, thirdDownConv: Math.max(0, s.home.thirdDownConv - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.home.thirdDownConv}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, thirdDownConv: s.home.thirdDownConv + 1}}))}>+</Button>
                      </div>
                      <span>/</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, thirdDownAtt: Math.max(0, s.home.thirdDownAtt - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.home.thirdDownAtt}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, thirdDownAtt: s.home.thirdDownAtt + 1}}))}>+</Button>
                      </div>
                      <span className="text-slate-400">({quickStats.home.thirdDownAtt > 0 ? Math.round(quickStats.home.thirdDownConv / quickStats.home.thirdDownAtt * 100) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-16">4th Down:</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, fourthDownConv: Math.max(0, s.home.fourthDownConv - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.home.fourthDownConv}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, fourthDownConv: s.home.fourthDownConv + 1}}))}>+</Button>
                      </div>
                      <span>/</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, fourthDownAtt: Math.max(0, s.home.fourthDownAtt - 1)}}))}>-</Button>
                        <span className="font-bold">{quickStats.home.fourthDownAtt}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-[10px]" onClick={() => setQuickStats(s => ({...s, home: {...s.home, fourthDownAtt: s.home.fourthDownAtt + 1}}))}>+</Button>
                      </div>
                      <span className="text-slate-400">({quickStats.home.fourthDownAtt > 0 ? Math.round(quickStats.home.fourthDownConv / quickStats.home.fourthDownAtt * 100) : 0}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time of Possession */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Time of Possession</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{game.away_team?.abbreviation || 'Away'}</p>
                    <p className="text-2xl font-bold" style={{ color: game.away_team?.color }}>{formatTOP(timeOfPossession.away)}</p>
                    <div className="flex justify-center gap-1 mt-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, away: Math.max(0, prev.away - 60)}))}>-1m</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, away: Math.max(0, prev.away - 10)}))}>-10s</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, away: prev.away + 10}))}>+10s</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, away: prev.away + 60}))}>+1m</Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{game.home_team?.abbreviation || 'Home'}</p>
                    <p className="text-2xl font-bold" style={{ color: game.home_team?.color }}>{formatTOP(timeOfPossession.home)}</p>
                    <div className="flex justify-center gap-1 mt-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, home: Math.max(0, prev.home - 60)}))}>-1m</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, home: Math.max(0, prev.home - 10)}))}>-10s</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, home: prev.home + 10}))}>+10s</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTimeOfPossession(prev => ({...prev, home: prev.home + 60}))}>+1m</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Log */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Game Log ({gameLog.length} entries)</p>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => {
                        const desc = prompt('Enter log entry description:')
                        if (desc) addGameLogEntry('manual', desc, possession)
                      }}
                    >
                      + Add Entry
                    </Button>
                    {gameLog.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-6 text-xs text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Clear all game log entries?')) setGameLog([])
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Export Buttons */}
                <div className="flex gap-2 mb-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={copyGameSummary}
                  >
                    📋 Copy Summary
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={downloadGameSummary}
                  >
                    💾 Download
                  </Button>
                  {game.quarter === 'Halftime' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-7 text-xs flex-1 border-purple-400 text-purple-600"
                      onClick={() => {
                        const summary = generateHalftimeSummary()
                        navigator.clipboard.writeText(summary).then(() => {
                          alert('Halftime stats copied!')
                        }).catch(() => alert(summary))
                      }}
                    >
                      📊 HT Stats
                    </Button>
                  )}
                </div>
                {gameLog.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {[...gameLog].reverse().slice(0, 20).map(entry => (
                      <div key={entry.id} className="text-xs flex items-start gap-2 py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 w-8">{entry.quarter}</span>
                        <span className="text-slate-400 w-10">{entry.time}</span>
                        <span className={`px-1 rounded text-[10px] uppercase ${
                          entry.type === 'score' ? 'bg-green-100 text-green-700' :
                          entry.type === 'turnover' ? 'bg-red-100 text-red-700' :
                          entry.type === 'penalty' ? 'bg-yellow-100 text-yellow-700' :
                          entry.type === 'down' ? 'bg-blue-100 text-blue-700' :
                          entry.type === 'kick' ? 'bg-orange-100 text-orange-700' :
                          entry.type === 'close-call' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{entry.type}</span>
                        {entry.team && (
                          <span className="font-semibold" style={{ color: entry.team === 'home' ? game.home_team?.color : game.away_team?.color }}>
                            {entry.team === 'home' ? game.home_team?.abbreviation : game.away_team?.abbreviation}
                          </span>
                        )}
                        <span className="flex-1">{entry.description}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-4 w-4 p-0 text-slate-300 hover:text-red-500"
                          onClick={() => setGameLog(prev => prev.filter(e => e.id !== entry.id))}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                    {gameLog.length > 20 && (
                      <p className="text-xs text-slate-400 text-center py-1">...and {gameLog.length - 20} more entries</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No log entries yet</p>
                )}
              </div>

              {/* Reset Stats */}
              <div className="border-t pt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => {
                    if (confirm('Reset all quick stats to zero? This cannot be undone.')) {
                      setQuickStats({
                        home: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, thirdDownAtt: 0, thirdDownConv: 0, fourthDownAtt: 0, fourthDownConv: 0 },
                        away: { turnovers: 0, firstDowns: 0, penalties: 0, penaltyYards: 0, q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, thirdDownAtt: 0, thirdDownConv: 0, fourthDownAtt: 0, fourthDownConv: 0 },
                        custom: quickStats.custom?.map(c => ({ ...c, home: 0, away: 0 })) || [],
                        awards: quickStats.awards?.map(a => ({ ...a, home: 0, away: 0 })) || []
                      })
                      setTimeOfPossession({ home: 0, away: 0 })
                      setCoinToss({ winner: null, choice: null })
                    }
                  }}
                >
                  🔄 Reset All Stats
                </Button>
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

              {/* Awards/Trophies Section */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">🏆 Awards & Trophies</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => {
                      setEditingAward(null)
                      setAwardForm({ label: '', emoji: '🏆' })
                      setShowAwardDialog(true)
                    }}
                  >
                    + Add Award
                  </Button>
                </div>
                
                {quickStats.awards?.length > 0 ? (
                  <div className="space-y-2">
                    {quickStats.awards.map(award => (
                      <div key={award.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                        <span className="text-lg">{award.emoji}</span>
                        <span className="text-sm font-medium flex-1">{award.label}</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            awards: s.awards.map(a => a.id === award.id ? { ...a, away: Math.max(0, a.away - 1) } : a)
                          }))}>-</Button>
                          <span className="text-sm font-bold w-6 text-center">{award.away}</span>
                          <span className="text-xs text-slate-400">A</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            awards: s.awards.map(a => a.id === award.id ? { ...a, away: a.away + 1 } : a)
                          }))}>+</Button>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            awards: s.awards.map(a => a.id === award.id ? { ...a, home: Math.max(0, a.home - 1) } : a)
                          }))}>-</Button>
                          <span className="text-sm font-bold w-6 text-center">{award.home}</span>
                          <span className="text-xs text-slate-400">H</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQuickStats(s => ({
                            ...s,
                            awards: s.awards.map(a => a.id === award.id ? { ...a, home: a.home + 1 } : a)
                          }))}>+</Button>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                          onClick={() => {
                            setEditingAward(award)
                            setAwardForm({ label: award.label, emoji: award.emoji })
                            setShowAwardDialog(true)
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
                            awards: s.awards.filter(a => a.id !== award.id)
                          }))}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No awards yet. Add trophies, MVPs, or any achievements!</p>
                )}
              </div>
              
              </CardContent>
            )}
          </Card>
      )}

      {/* Coin Toss - Compact Section */}
      {game && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">🪙 Coin Toss:</span>
            <Button 
              size="sm" 
              variant={coinToss.winner === 'away' ? "default" : "outline"}
              style={coinToss.winner === 'away' ? { backgroundColor: game.away_team?.color } : {}}
              onClick={() => setCoinToss(prev => ({ ...prev, winner: 'away' }))}
              className="h-7 text-xs"
            >
              {game.away_team?.abbreviation || 'Away'}
            </Button>
            <Button 
              size="sm" 
              variant={coinToss.winner === 'home' ? "default" : "outline"}
              style={coinToss.winner === 'home' ? { backgroundColor: game.home_team?.color } : {}}
              onClick={() => setCoinToss(prev => ({ ...prev, winner: 'home' }))}
              className="h-7 text-xs"
            >
              {game.home_team?.abbreviation || 'Home'}
            </Button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Button 
              size="sm" 
              variant={coinToss.choice === 'receive' ? "default" : "outline"}
              className={`h-7 text-xs ${coinToss.choice === 'receive' ? "bg-green-600" : ""}`}
              onClick={() => setCoinToss(prev => ({ ...prev, choice: 'receive' }))}
            >
              Receive
            </Button>
            <Button 
              size="sm" 
              variant={coinToss.choice === 'kick' ? "default" : "outline"}
              className={`h-7 text-xs ${coinToss.choice === 'kick' ? "bg-blue-600" : ""}`}
              onClick={() => setCoinToss(prev => ({ ...prev, choice: 'kick' }))}
            >
              Kick
            </Button>
            <Button 
              size="sm" 
              variant={coinToss.choice === 'defer' ? "default" : "outline"}
              className={`h-7 text-xs ${coinToss.choice === 'defer' ? "bg-purple-600" : ""}`}
              onClick={() => setCoinToss(prev => ({ ...prev, choice: 'defer' }))}
            >
              Defer
            </Button>
            {coinToss.winner && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <Button 
                  size="sm" 
                  variant={showCoinToss ? "default" : "outline"}
                  className={`h-7 text-xs ${showCoinToss ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                  onClick={() => setShowCoinToss(!showCoinToss)}
                >
                  {showCoinToss ? '📺 Hide' : '📺 Show'}
                </Button>
              </>
            )}
            {(coinToss.winner || coinToss.choice) && (
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 text-xs text-slate-400 hover:text-red-500"
                onClick={() => {
                  setCoinToss({ winner: null, choice: null })
                  setShowCoinToss(false)
                }}
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Viewer Notifications Card */}
      {game && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowNotificationPanel(!showNotificationPanel)}>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                🔔 Viewer Notifications
              </span>
              <Button variant="ghost" size="sm">
                {showNotificationPanel ? '▲ Hide' : '▼ Show'}
              </Button>
            </CardTitle>
          </CardHeader>
          {showNotificationPanel && (
            <CardContent className="space-y-4">
              {/* Auto-notification toggles */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-send notifications:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.autoScores}
                      onChange={e => setNotificationSettings(s => ({ ...s, autoScores: e.target.checked }))}
                      className="rounded"
                    />
                    Scores
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.autoTouchdowns}
                      onChange={e => setNotificationSettings(s => ({ ...s, autoTouchdowns: e.target.checked }))}
                      className="rounded"
                    />
                    Touchdowns
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.autoTurnovers}
                      onChange={e => setNotificationSettings(s => ({ ...s, autoTurnovers: e.target.checked }))}
                      className="rounded"
                    />
                    Turnovers
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.autoQuarterEnd}
                      onChange={e => setNotificationSettings(s => ({ ...s, autoQuarterEnd: e.target.checked }))}
                      className="rounded"
                    />
                    Quarter End
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.autoHalftime}
                      onChange={e => setNotificationSettings(s => ({ ...s, autoHalftime: e.target.checked }))}
                      className="rounded"
                    />
                    Halftime
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.autoGameEnd}
                      onChange={e => setNotificationSettings(s => ({ ...s, autoGameEnd: e.target.checked }))}
                      className="rounded"
                    />
                    Game End
                  </label>
                </div>
              </div>
              
              {/* Preset notification buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Quick notifications:</p>
                <div className="flex flex-wrap gap-2">
                  {(game.league?.game_defaults?.presetNotifications || defaultPresetNotifications).map(preset => (
                    <Button 
                      key={preset.id}
                      size="sm" 
                      variant="outline" 
                      className="h-8"
                      onClick={() => sendNotification(preset.title, preset.message, 'info')}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Custom notification with title and message */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom notification:</p>
                <div className="space-y-2">
                  <Input 
                    placeholder="Title (e.g., 'Breaking News')"
                    value={customNotificationTitle}
                    onChange={e => setCustomNotificationTitle(e.target.value)}
                    className="h-9"
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Message..."
                      value={customNotificationMessage}
                      onChange={e => setCustomNotificationMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customNotificationMessage.trim()) {
                          sendNotification(
                            customNotificationTitle.trim() || 'Notification',
                            customNotificationMessage.trim(),
                            'custom'
                          )
                          setCustomNotificationTitle('')
                          setCustomNotificationMessage('')
                        }
                      }}
                      className="h-9"
                    />
                    <Button 
                      className="h-9"
                      onClick={() => {
                        if (customNotificationMessage.trim()) {
                          sendNotification(
                            customNotificationTitle.trim() || 'Notification',
                            customNotificationMessage.trim(),
                            'custom'
                          )
                          setCustomNotificationTitle('')
                          setCustomNotificationMessage('')
                        }
                      }}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Notification history */}
              {notificationHistory.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Recent ({notificationHistory.length})</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-xs text-slate-400"
                      onClick={() => setNotificationHistory([])}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {[...notificationHistory].reverse().slice(0, 10).map(n => (
                      <div key={n.id} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="text-slate-400 text-xs w-8">{n.quarter}</span>
                        <div className="flex-1">
                          <span className="font-medium">{n.title}</span>
                          {n.message && <span className="text-slate-500"> - {n.message}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Award Dialog */}
      <Dialog open={showAwardDialog} onOpenChange={setShowAwardDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingAward ? 'Edit Award' : 'Add Award'}</DialogTitle>
            <DialogDescription>
              Create an award or trophy to track achievements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Award Name</Label>
              <Input 
                placeholder="e.g., MVP, Best Play, Sportsmanship"
                value={awardForm.label}
                onChange={e => setAwardForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {['🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💪', '🎯', '🔥', '👑', '🎖️', '🏅', '💎', '⚡', '🦅', '🏈'].map(e => (
                  <button
                    key={e}
                    className={`w-10 h-10 rounded text-xl flex items-center justify-center ${awardForm.emoji === e ? 'ring-2 ring-amber-500 bg-amber-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                    onClick={() => setAwardForm(f => ({ ...f, emoji: e }))}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowAwardDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={!awardForm.label.trim()}
              onClick={() => {
                if (editingAward) {
                  // Update existing
                  setQuickStats(s => ({
                    ...s,
                    awards: s.awards.map(a => a.id === editingAward.id 
                      ? { ...a, label: awardForm.label, emoji: awardForm.emoji }
                      : a
                    )
                  }))
                } else {
                  // Add new
                  const newAward = {
                    id: `award_${Date.now()}`,
                    label: awardForm.label,
                    emoji: awardForm.emoji,
                    home: 0,
                    away: 0
                  }
                  setQuickStats(s => ({
                    ...s,
                    awards: [...(s.awards || []), newAward]
                  }))
                }
                setShowAwardDialog(false)
              }}
            >
              {editingAward ? 'Save Changes' : 'Add Award'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Finish Dialog */}
      <Dialog open={showQuickFinish} onOpenChange={setShowQuickFinish}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>⚡ Quick Finish</DialogTitle>
            <DialogDescription>
              Enter the final scores and end the game immediately
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-center block">{game?.away_team?.name || 'Away'}</Label>
                <Input 
                  type="number"
                  min="0"
                  className="text-center text-2xl font-bold h-14"
                  value={quickFinishScores.away}
                  onChange={e => setQuickFinishScores(s => ({ ...s, away: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-center block">{game?.home_team?.name || 'Home'}</Label>
                <Input 
                  type="number"
                  min="0"
                  className="text-center text-2xl font-bold h-14"
                  value={quickFinishScores.home}
                  onChange={e => setQuickFinishScores(s => ({ ...s, home: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowQuickFinish(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={async () => {
                // Same as a normal end of game: status final (counts in standings), bracket sync
                await finalizeGame({ home_score: quickFinishScores.home, away_score: quickFinishScores.away })
                stopTimer()
                stopPlayClock()
                setShowQuickFinish(false)
              }}
            >
              🏁 Finish Game
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
