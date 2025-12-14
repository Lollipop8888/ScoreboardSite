import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Minus, Play, Square, Share2, Copy, Check, Trophy, RotateCcw, Flag, Pause, Volume2, Bell, Search, X, Eye, EyeOff, Video, Upload, Trash2 } from 'lucide-react'
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
import { gameApi, teamApi, createWebSocket } from '@/lib/api'

const QUARTERS = ['Q1', 'Q2', 'Halftime', 'Q3', 'Q4', 'OT', 'Final']

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
  { name: 'Illegal Forward Pass', yards: 5, category: 'Offense', lossOfDown: true },
  { name: 'Too Many Men on Field', yards: 5, category: 'Pre-Snap' },
  { name: 'Illegal Substitution', yards: 5, category: 'Pre-Snap' },
  { name: 'Clipping', yards: 15, category: 'Personal Foul' },
  { name: 'Chop Block', yards: 15, category: 'Personal Foul' },
  { name: 'Tripping', yards: 10, category: 'Personal Foul' },
  { name: 'Kick Catch Interference', yards: 15, category: 'Special Teams' },
  { name: 'Illegal Kick', yards: 10, category: 'Special Teams' },
  { name: 'Leaping', yards: 15, category: 'Defense' },
  { name: 'Leverage', yards: 15, category: 'Defense' },
  { name: 'Other', yards: 0, category: 'Other' },
]

export default function LiveGamePage() {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef(null)
  
  // Play clock state
  const [playClock, setPlayClock] = useState(40)
  const [playClockRunning, setPlayClockRunning] = useState(false)
  const playClockRef = useRef(null)
  
  // Down & Distance state
  const [down, setDown] = useState(1)
  const [distance, setDistance] = useState(10)
  const [specialDistance, setSpecialDistance] = useState(null) // null, 'goal', or 'inches'
  const [ballOn, setBallOn] = useState(25)
  const [possession, setPossession] = useState('home') // 'home', 'away', or null (no possession)
  
  // Timeout state - 3 per half for each team
  const [homeTimeouts, setHomeTimeouts] = useState(3)
  const [awayTimeouts, setAwayTimeouts] = useState(3)
  
  // Game status/situation state
  const [gameStatus, setGameStatus] = useState(null) // null, 'kickoff', 'ad-break', 'injury', 'measurement', 'two-minute', 'end-quarter', 'halftime-show', 'final'
  const [showLiveIndicator, setShowLiveIndicator] = useState(true)
  const [showDownOnly, setShowDownOnly] = useState(false) // Show only "2nd DOWN" instead of "2nd & 5"
  
  // Big play/turnover overlay state
  const [bigPlay, setBigPlay] = useState(null) // null, 'fumble', 'interception', 'sack', 'safety', 'blocked-kick', 'pick-six', 'scoop-score'
  
  // Flag/Penalty state - two-stage display
  const [showFlagPanel, setShowFlagPanel] = useState(false)
  const [penaltySearch, setPenaltySearch] = useState('')
  const [selectedPenalty, setSelectedPenalty] = useState(null)
  const [selectedPenaltyTeam, setSelectedPenaltyTeam] = useState(null)
  const [flagDisplayStage, setFlagDisplayStage] = useState(0) // 0=hidden, 1=FLAG text only, 2=full details
  const [displayedPenalty, setDisplayedPenalty] = useState(null)
  const [penalties, setPenalties] = useState([])
  
  // Review state - similar to flag but red
  const [reviewDisplayStage, setReviewDisplayStage] = useState(0) // 0=hidden, 1=REVIEW text only, 2=with details
  const [reviewReason, setReviewReason] = useState('')
  const [reviewResult, setReviewResult] = useState(null) // null, 'upheld', 'reversed'
  
  // Challenge state
  const [challengeActive, setChallengeActive] = useState(false)
  const [challengeTeam, setChallengeTeam] = useState(null) // 'home' or 'away'
  const [challengeStage, setChallengeStage] = useState(0) // 0=hidden, 1=showing challenge, 2=awaiting result
  
  // Timeout display state
  const [showTimeoutDisplay, setShowTimeoutDisplay] = useState(false)
  const [timeoutTeam, setTimeoutTeam] = useState(null)
  const [usedTimeoutIndex, setUsedTimeoutIndex] = useState(null) // Which timeout was just used (1, 2, or 3)
  
  // Score celebration overlay state
  const [scoreCelebration, setScoreCelebration] = useState(null) // { type: 'touchdown'|'fieldgoal', team: 'home'|'away', points: number }
  
  // Touchback display state
  const [showTouchback, setShowTouchback] = useState(false)
  
  // First down display state
  const [showFirstDown, setShowFirstDown] = useState(false)
  
  // Incomplete pass display state
  const [showIncomplete, setShowIncomplete] = useState(false)
  
  // Out of bounds display state
  const [showOutOfBounds, setShowOutOfBounds] = useState(false)
  
  // Turnover on downs display state
  const [showTurnoverOnDowns, setShowTurnoverOnDowns] = useState(false)
  
  // Fumble recovery display state
  const [showFumbleRecovery, setShowFumbleRecovery] = useState(null) // 'offense', 'defense', 'oob'
  
  // Red zone display state
  const [showRedZone, setShowRedZone] = useState(false)
  
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

  const loadGame = useCallback(async () => {
    try {
      const data = await gameApi.get(gameId)
      setGame(data)
    } catch (error) {
      console.error('Failed to load game:', error)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    loadGame()
  }, [loadGame])

  useEffect(() => {
    if (!game?.share_code) return

    const ws = createWebSocket('game', game.share_code, (message) => {
      if (message.type === 'game_update') {
        setGame((prev) => ({ ...prev, ...message.data }))
      }
    })

    return () => ws.close()
  }, [game?.share_code])

  async function updateGame(updates) {
    try {
      await gameApi.update(gameId, updates)
    } catch (error) {
      console.error('Failed to update game:', error)
    }
  }

  async function updateScore(team, delta) {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const currentScore = team === 'home' ? game.home_score : game.away_score
    const newScore = Math.max(0, currentScore + delta)
    await updateGame({ [field]: newScore })
    
    // Trigger celebration overlay for TDs, FGs, Safeties, and conversions
    if (delta === 6 || delta === 7 || delta === 8) {
      // Touchdown (6, 7 with PAT, or 8 with 2PT)
      setScoreCelebration({ type: 'touchdown', team, points: delta })
      setTimeout(() => setScoreCelebration(null), 5000)
    } else if (delta === 3) {
      // Field Goal
      setScoreCelebration({ type: 'fieldgoal', team, points: delta })
      setTimeout(() => setScoreCelebration(null), 5000)
    }
  }
  
  // Separate function for Safety scoring (defensive score)
  async function scoreSafety(team) {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const currentScore = team === 'home' ? game.home_score : game.away_score
    const newScore = currentScore + 2
    await updateGame({ [field]: newScore })
    setScoreCelebration({ type: 'safety', team, points: 2 })
    setTimeout(() => setScoreCelebration(null), 3000)
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
    }
  }
  
  function clearBigPlay() {
    setBigPlay(null)
  }

  async function startGame() {
    await updateGame({ status: 'live', quarter: 'Q1', game_time: '15:00' })
  }

  async function endGame() {
    await updateGame({ status: 'final', quarter: 'Final' })
    stopTimer()
  }

  async function resetGame() {
    if (!confirm('Reset the game? This will set both scores to 0 and return to Q1.')) return
    await updateGame({ 
      home_score: 0, 
      away_score: 0, 
      quarter: 'Q1', 
      game_time: '15:00',
      status: 'live'
    })
    setPenalties([])
    setShowFlagOnDisplay(false)
    setDisplayedPenalty(null)
    stopTimer()
  }

  // Quarter change functions
  async function nextQuarter() {
    const currentIndex = QUARTERS.indexOf(game.quarter)
    if (currentIndex < QUARTERS.length - 1) {
      const nextQ = QUARTERS[currentIndex + 1]
      
      // Handle special transitions
      if (nextQ === 'Halftime') {
        // Going to halftime - set 13 min timer and show halftime status
        await updateGame({ quarter: nextQ, game_time: '13:00' })
        setGameStatus('halftime-show')
        stopTimer()
      } else if (nextQ === 'Q3') {
        // Coming out of halftime - reset to 15:00, keep halftime status so Start Q3 button shows
        await updateGame({ quarter: nextQ, game_time: '15:00' })
        // Keep halftime-show status - it will be cleared when Start Q3 button is pressed
        resetTimeoutsForHalf()
      } else if (nextQ === 'OT') {
        // Check if game is tied - if not, go straight to Final
        if (game.home_score !== game.away_score) {
          // Game not tied, skip OT and go to Final
          await updateGame({ quarter: 'Final' })
          setGameStatus('final')
          stopTimer()
          return
        }
        // Overtime - typically shorter time
        await updateGame({ quarter: nextQ, game_time: '10:00' })
        setGameStatus(null)
      } else if (nextQ === 'Final') {
        // Game over
        await updateGame({ quarter: nextQ })
        setGameStatus('final')
        stopTimer()
      } else {
        // Regular quarter change (Q1->Q2, Q3->Q4)
        await updateGame({ quarter: nextQ, game_time: '15:00' })
        setGameStatus(null)
      }
    }
  }

  async function prevQuarter() {
    const currentIndex = QUARTERS.indexOf(game.quarter)
    if (currentIndex > 0) {
      const prevQ = QUARTERS[currentIndex - 1]
      
      // Handle special transitions
      if (prevQ === 'Halftime') {
        await updateGame({ quarter: prevQ, game_time: '13:00' })
        setGameStatus('halftime-show')
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
    if (timerRunning) return
    setTimerRunning(true)
    
    // Helper function to tick the timer
    const tick = () => {
      setGame(prev => {
        if (!prev) return prev
        const currentSeconds = parseTime(prev.game_time)
        if (currentSeconds <= 0) {
          stopTimer()
          // Handle end of quarter - increment quarter and show end-quarter status
          if (['Q1', 'Q2', 'Q3', 'Q4'].includes(prev.quarter)) {
            const currentIndex = QUARTERS.indexOf(prev.quarter)
            const nextQ = QUARTERS[currentIndex + 1]
            
            // Update to next quarter with appropriate time
            if (nextQ === 'Halftime') {
              updateGame({ quarter: nextQ, game_time: '13:00' })
              setGameStatus('halftime-show')
            } else if (nextQ === 'OT') {
              // Check if tied - if not, go to Final
              if (prev.home_score !== prev.away_score) {
                updateGame({ quarter: 'Final' })
                setGameStatus('final')
              } else {
                updateGame({ quarter: nextQ, game_time: '10:00' })
                setGameStatus('end-quarter')
              }
            } else {
              // Q2, Q4 or other
              updateGame({ quarter: nextQ, game_time: '15:00' })
              setGameStatus('end-quarter')
            }
          }
          return prev
        }
        return { ...prev, game_time: formatTime(currentSeconds - 1) }
      })
    }
    
    // Tick immediately on start
    tick()
    
    // Then continue ticking every second
    timerRef.current = setInterval(tick, 1000)
  }

  function stopTimer() {
    setTimerRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function toggleTimer() {
    if (timerRunning) {
      stopTimer()
      // Save current time to backend
      updateGame({ game_time: game.game_time })
    } else {
      startTimer()
    }
  }

  // Timer adjustment functions
  function adjustGameTime(seconds) {
    const currentSeconds = parseTime(game.game_time)
    const newSeconds = Math.max(0, Math.min(900, currentSeconds + seconds)) // Max 15:00
    const newTime = formatTime(newSeconds)
    setGame(prev => ({ ...prev, game_time: newTime }))
    updateGame({ game_time: newTime })
  }

  // Play clock functions
  function startPlayClock() {
    if (playClockRunning) return
    setPlayClockRunning(true)
    playClockRef.current = setInterval(() => {
      setPlayClock(prev => {
        if (prev <= 0) {
          stopPlayClock()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopPlayClock() {
    setPlayClockRunning(false)
    if (playClockRef.current) {
      clearInterval(playClockRef.current)
      playClockRef.current = null
    }
  }

  function resetPlayClock(seconds = 40) {
    stopPlayClock()
    setPlayClock(seconds)
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
      // 4th down - turnover on downs
      togglePossession() // This already resets downs
      setBigPlay('turnover-on-downs')
      setTimeout(() => setBigPlay(null), 4000)
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
      // Show timeout animation
      setTimeoutTeam('home')
      setShowTimeoutDisplay(true)
      setTimeout(() => {
        setShowTimeoutDisplay(false)
        setUsedTimeoutIndex(null)
      }, 4000)
    } else if (team === 'away' && awayTimeouts > 0) {
      const usedIndex = awayTimeouts // The timeout being used (before decrement)
      setUsedTimeoutIndex(usedIndex)
      setAwayTimeouts(prev => prev - 1)
      stopTimer()
      stopPlayClock()
      // Show timeout animation
      setTimeoutTeam('away')
      setShowTimeoutDisplay(true)
      setTimeout(() => {
        setShowTimeoutDisplay(false)
        setUsedTimeoutIndex(null)
      }, 4000)
    }
  }

  function hideTimeoutDisplay() {
    setShowTimeoutDisplay(false)
    setTimeoutTeam(null)
    setUsedTimeoutIndex(null)
  }

  function restoreTimeout(team) {
    if (team === 'home' && homeTimeouts < 3) {
      setHomeTimeouts(prev => prev + 1)
    } else if (team === 'away' && awayTimeouts < 3) {
      setAwayTimeouts(prev => prev + 1)
    }
  }

  function resetTimeoutsForHalf() {
    setHomeTimeouts(3)
    setAwayTimeouts(3)
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

  function selectPenalty(penalty) {
    setSelectedPenalty(penalty)
    setSelectedPenaltyTeam(null) // Reset team selection
  }

  function selectTeamForPenalty(team) {
    setSelectedPenaltyTeam(team)
  }

  // Stage 1: Show just "FLAG" text on display
  function showFlagStage1() {
    setFlagDisplayStage(1)
  }

  // Stage 2: Show full penalty details with team highlight
  function showFlagStage2() {
    if (!selectedPenalty || !selectedPenaltyTeam) return
    
    const penaltyRecord = {
      id: Date.now(),
      team: selectedPenaltyTeam,
      teamName: selectedPenaltyTeam === 'home' ? game.home_team.name : game.away_team.name,
      teamColor: selectedPenaltyTeam === 'home' ? game.home_team.color : game.away_team.color,
      teamLogo: selectedPenaltyTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url,
      name: selectedPenalty.name,
      yards: selectedPenalty.yards,
      quarter: game.quarter,
      time: game.game_time,
    }
    
    setDisplayedPenalty(penaltyRecord)
    setFlagDisplayStage(2)
    setPenalties([penaltyRecord, ...penalties])
  }

  function hideFlagFromDisplay() {
    setFlagDisplayStage(0)
    setDisplayedPenalty(null)
    // Reset the flag panel
    setSelectedPenalty(null)
    setSelectedPenaltyTeam(null)
    setPenaltySearch('')
    setShowFlagPanel(false)
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
    setReviewResult('upheld')
    // Auto-hide after 4 seconds
    setTimeout(() => {
      hideReview()
    }, 4000)
  }

  function setReviewReversed() {
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
  }

  function challengeReversed() {
    // Call overturned - team keeps timeout
    // Reset challenge state
    setChallengeStage(0)
    setChallengeActive(false)
    setChallengeTeam(null)
  }

  function cancelChallenge() {
    setChallengeStage(0)
    setChallengeActive(false)
    setChallengeTeam(null)
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/game/${game.share_code}`
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* Scoreboard Preview - NOW AT TOP */}
      {game.status === 'live' && (
        <Card className="border-2 border-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Display Preview
            </CardTitle>
            <CardDescription>This is exactly what viewers see on the scoreboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl p-6 text-white relative overflow-hidden shadow-2xl border border-slate-800/50">
              {/* Ambient background glow */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
              </div>
              
              {/* TOUCHDOWN Celebration Overlay - Full Screen with Team Colors */}
              {scoreCelebration?.type === 'touchdown' && (
                <div 
                  className="absolute inset-0 flex items-center justify-center rounded-lg z-20 animate-bounce-in"
                  style={{
                    background: `linear-gradient(135deg, ${
                      scoreCelebration.team === 'home' ? game.home_team.color : game.away_team.color
                    } 0%, ${
                      scoreCelebration.team === 'home' ? (game.home_team.color2 || game.home_team.color) : (game.away_team.color2 || game.away_team.color)
                    } 50%, ${
                      scoreCelebration.team === 'home' ? (game.home_team.color3 || game.home_team.color) : (game.away_team.color3 || game.away_team.color)
                    } 100%)`
                  }}
                >
                  <div className="text-center">
                    <div className="text-8xl mb-4 animate-bounce">🏈</div>
                    <p className="text-6xl font-black text-white tracking-wider mb-4 animate-pulse drop-shadow-lg">TOUCHDOWN!</p>
                    <div className="flex items-center justify-center gap-4">
                      {scoreCelebration.team === 'home' ? (
                        game.home_team.logo_url ? (
                          <img src={game.home_team.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg" />
                        ) : (
                          <div 
                            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white" 
                            style={{ 
                              backgroundColor: game.home_team.color,
                              color: game.home_team.color2 || '#ffffff'
                            }}
                          >
                            {game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      ) : (
                        game.away_team.logo_url ? (
                          <img src={game.away_team.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg" />
                        ) : (
                          <div 
                            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white" 
                            style={{ 
                              backgroundColor: game.away_team.color,
                              color: game.away_team.color2 || '#ffffff'
                            }}
                          >
                            {game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      )}
                      <span className="text-3xl font-bold text-white drop-shadow-lg">
                        {scoreCelebration.team === 'home' ? game.home_team.name : game.away_team.name}
                      </span>
                    </div>
                    <p className="text-2xl text-white/90 mt-4 font-semibold drop-shadow">+{scoreCelebration.points} points</p>
                  </div>
                  {/* Confetti-like decorations */}
                  <div className="absolute top-6 left-10 text-5xl animate-bounce">🎉</div>
                  <div className="absolute top-10 right-16 text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</div>
                  <div className="absolute bottom-10 left-20 text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
                  <div className="absolute bottom-6 right-10 text-5xl animate-bounce" style={{ animationDelay: '0.15s' }}>🏆</div>
                  <div className="absolute top-1/4 left-6 text-3xl animate-pulse" style={{ animationDelay: '0.3s' }}>⭐</div>
                  <div className="absolute top-1/4 right-6 text-3xl animate-pulse" style={{ animationDelay: '0.25s' }}>⭐</div>
                  <div className="absolute bottom-1/4 left-8 text-3xl animate-bounce" style={{ animationDelay: '0.35s' }}>🎆</div>
                  <div className="absolute bottom-1/4 right-8 text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎆</div>
                </div>
              )}
              
              {/* FIELD GOAL Celebration Overlay - Full Screen with Team Colors */}
              {scoreCelebration?.type === 'fieldgoal' && (
                <div 
                  className="absolute inset-0 flex items-center justify-center rounded-lg z-20 animate-bounce-in"
                  style={{
                    background: `linear-gradient(135deg, ${
                      scoreCelebration.team === 'home' ? game.home_team.color : game.away_team.color
                    } 0%, ${
                      scoreCelebration.team === 'home' ? (game.home_team.color2 || game.home_team.color) : (game.away_team.color2 || game.away_team.color)
                    } 50%, ${
                      scoreCelebration.team === 'home' ? (game.home_team.color3 || game.home_team.color) : (game.away_team.color3 || game.away_team.color)
                    } 100%)`
                  }}
                >
                  <div className="text-center">
                    <div className="text-8xl mb-4 animate-pulse">🥅</div>
                    <p className="text-6xl font-black text-white tracking-wider mb-4 drop-shadow-lg">FIELD GOAL!</p>
                    <div className="flex items-center justify-center gap-4">
                      {scoreCelebration.team === 'home' ? (
                        game.home_team.logo_url ? (
                          <img src={game.home_team.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg" />
                        ) : (
                          <div 
                            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white" 
                            style={{ 
                              backgroundColor: game.home_team.color,
                              color: game.home_team.color2 || '#ffffff'
                            }}
                          >
                            {game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      ) : (
                        game.away_team.logo_url ? (
                          <img src={game.away_team.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg" />
                        ) : (
                          <div 
                            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-white" 
                            style={{ 
                              backgroundColor: game.away_team.color,
                              color: game.away_team.color2 || '#ffffff'
                            }}
                          >
                            {game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      )}
                      <span className="text-3xl font-bold text-white drop-shadow-lg">
                        {scoreCelebration.team === 'home' ? game.home_team.name : game.away_team.name}
                      </span>
                    </div>
                    <p className="text-2xl text-white/90 mt-4 font-semibold drop-shadow">+3 points</p>
                  </div>
                  {/* Goal post decorations */}
                  <div className="absolute top-8 left-12 text-5xl animate-bounce">⬆️</div>
                  <div className="absolute top-8 right-12 text-5xl animate-bounce" style={{ animationDelay: '0.1s' }}>⬆️</div>
                  <div className="absolute bottom-8 left-16 text-4xl animate-pulse" style={{ animationDelay: '0.2s' }}>✨</div>
                  <div className="absolute bottom-8 right-16 text-4xl animate-pulse" style={{ animationDelay: '0.15s' }}>✨</div>
                  <div className="absolute top-1/3 left-6 text-3xl animate-bounce" style={{ animationDelay: '0.25s' }}>🏈</div>
                  <div className="absolute top-1/3 right-6 text-3xl animate-bounce" style={{ animationDelay: '0.3s' }}>🏈</div>
                </div>
              )}
              
              {/* SAFETY Celebration Overlay - Full overlay style */}
              {scoreCelebration?.type === 'safety' && (
                <div className="absolute inset-x-0 top-0 h-1/2 flex items-center justify-center bg-gradient-to-b from-red-600/95 to-red-700/90 rounded-t-lg z-20 animate-bounce-in">
                  <div className="text-center">
                    <div className="text-6xl mb-2 animate-pulse">🛡️</div>
                    <p className="text-4xl font-black text-white tracking-wider mb-2">SAFETY!</p>
                    <div className="flex items-center justify-center gap-3">
                      {scoreCelebration.team === 'home' ? (
                        game.home_team.logo_url ? (
                          <img src={game.home_team.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white" />
                        ) : (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white" style={{ backgroundColor: game.home_team.color }}>
                            {game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      ) : (
                        game.away_team.logo_url ? (
                          <img src={game.away_team.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white" />
                        ) : (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white" style={{ backgroundColor: game.away_team.color }}>
                            {game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )
                      )}
                      <span className="text-xl font-bold text-white">
                        {scoreCelebration.team === 'home' ? game.home_team.name : game.away_team.name}
                      </span>
                    </div>
                    <p className="text-lg text-red-200 mt-2">+2 Points - Defensive Score</p>
                  </div>
                  {/* Shield decorations */}
                  <div className="absolute top-4 left-8 text-3xl animate-bounce">⚡</div>
                  <div className="absolute top-4 right-8 text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>⚡</div>
                  <div className="absolute bottom-4 left-12 text-2xl animate-pulse">💥</div>
                  <div className="absolute bottom-4 right-12 text-2xl animate-pulse" style={{ animationDelay: '0.2s' }}>💥</div>
                </div>
              )}
              
              {/* 2PT Conversion Celebration - Simple bar style like PAT */}
              {scoreCelebration?.type === '2pt' && (
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✌️</span>
                    <span className="text-2xl font-black text-white tracking-wider">2-POINT CONVERSION!</span>
                    <span className="text-2xl">✌️</span>
                  </div>
                </div>
              )}
              
              {/* Red Zone Bar */}
              {showRedZone && (
                <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">🔴</span>
                    <span className="text-2xl font-black text-white tracking-wider">IN THE RED ZONE!</span>
                    <span className="text-2xl">🔴</span>
                  </div>
                </div>
              )}
              
              {/* Stage 1: Just "FLAG" text - Bar style with slide-in */}
              {flagDisplayStage === 1 && (
                <div className="bg-yellow-500 rounded-lg px-4 py-3 mb-4 animate-slide-in-left overflow-hidden">
                  <div className="flex items-center justify-center gap-3">
                    <Flag className="h-6 w-6 text-black" />
                    <span className="text-2xl font-black text-black tracking-wider">FLAG ON THE PLAY</span>
                    <Flag className="h-6 w-6 text-black" />
                  </div>
                </div>
              )}
              
              {/* Stage 2: Penalty with team - Bar style */}
              {flagDisplayStage === 2 && displayedPenalty && (
                <div className="bg-yellow-500 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Flag className="h-5 w-5 text-black" />
                    <span className="text-xl font-black text-black tracking-wider">{displayedPenalty.name?.toUpperCase() || 'FLAG'}</span>
                    <span className="text-black">—</span>
                    {displayedPenalty.teamLogo ? (
                      <img 
                        src={displayedPenalty.teamLogo} 
                        alt="" 
                        className="h-8 w-8 rounded-full object-cover border-2 border-black"
                      />
                    ) : (
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-black"
                        style={{ backgroundColor: displayedPenalty.teamColor }}
                      >
                        {displayedPenalty.teamName?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold text-black">{displayedPenalty.teamName}</span>
                  </div>
                </div>
              )}
              
              {/* Review Bar - Above timer, not full screen */}
              {reviewDisplayStage > 0 && !reviewResult && (
                <div className="bg-red-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <Video className="h-6 w-6 text-white animate-pulse" />
                    <span className="text-2xl font-bold text-white tracking-wider">UNDER REVIEW</span>
                    {reviewDisplayStage === 2 && reviewReason && (
                      <>
                        <span className="text-white">—</span>
                        <span className="text-xl font-semibold text-white">{reviewReason}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Review Result - Call Upheld */}
              {reviewResult === 'upheld' && (
                <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-lg px-4 py-4 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl animate-bounce">✅</span>
                    <div className="text-center">
                      <span className="text-2xl font-black text-white tracking-wider">CALL STANDS</span>
                      <p className="text-sm text-green-100">Ruling on the field is confirmed</p>
                    </div>
                    <span className="text-3xl animate-bounce">✅</span>
                  </div>
                </div>
              )}
              
              {/* Review Result - Call Reversed */}
              {reviewResult === 'reversed' && (
                <div className="bg-gradient-to-r from-orange-600 to-red-500 rounded-lg px-4 py-4 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl animate-bounce">🔄</span>
                    <div className="text-center">
                      <span className="text-2xl font-black text-white tracking-wider">CALL REVERSED</span>
                      <p className="text-sm text-orange-100">Ruling on the field is overturned</p>
                    </div>
                    <span className="text-3xl animate-bounce">🔄</span>
                  </div>
                </div>
              )}
              
              {/* Challenge Bar - Similar to review but shows team */}
              {challengeActive && challengeStage >= 1 && (
                <div className="bg-orange-600 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <Flag className="h-6 w-6 text-white" />
                    <span className="text-2xl font-bold text-white tracking-wider">CHALLENGE</span>
                    <span className="text-white">—</span>
                    {(challengeTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url) ? (
                      <img 
                        src={challengeTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-white"
                        style={{ backgroundColor: challengeTeam === 'home' ? game.home_team.color : game.away_team.color }}
                      >
                        {challengeTeam === 'home' 
                          ? (game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase())
                          : (game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase())
                        }
                      </div>
                    )}
                    <span className="text-xl font-semibold text-white">
                      {challengeTeam === 'home' ? game.home_team.name : game.away_team.name}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Timeout Display */}
              {showTimeoutDisplay && timeoutTeam && (
                <div 
                  className="rounded-lg px-4 py-4 mb-4 animate-bounce-in relative overflow-hidden"
                  style={{ backgroundColor: timeoutTeam === 'home' ? game.home_team.color : game.away_team.color }}
                >
                  {/* Animated stripes background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
                  </div>
                  <div className="relative flex items-center justify-center gap-4">
                    <div className="flex items-center gap-3">
                      {/* Team logo or abbreviation */}
                      {(timeoutTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url) ? (
                        <img 
                          src={timeoutTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover border-2 border-white"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold text-white border-2 border-white">
                          {timeoutTeam === 'home' 
                            ? (game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase())
                            : (game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase())
                          }
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white tracking-wider">TIMEOUT</p>
                        <p className="text-lg font-semibold text-white/90">
                          {timeoutTeam === 'home' ? game.home_team.name : game.away_team.name}
                        </p>
                      </div>
                    </div>
                    {/* Remaining timeouts indicator */}
                    <div className="flex gap-2 ml-4 relative">
                      {[1, 2, 3].map((t) => {
                        const remaining = timeoutTeam === 'home' ? homeTimeouts : awayTimeouts
                        const isUsedTimeout = t === usedTimeoutIndex
                        return (
                          <div key={t} className="relative">
                            {/* The used timeout that animates out */}
                            {isUsedTimeout && (
                              <div 
                                className="absolute inset-0 h-4 w-8 rounded-full bg-white animate-timeout-used"
                              />
                            )}
                            {/* The actual timeout indicator */}
                            <div 
                              className={`h-4 w-8 rounded-full border-2 border-white transition-all duration-300 ${
                                t <= remaining ? 'bg-white' : 'bg-transparent'
                              }`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Big Play / Turnover Overlay - Bar style */}
              {bigPlay && (
                <div className={`rounded-lg px-4 py-3 mb-4 animate-bounce-in ${
                  bigPlay === 'fumble' ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
                  bigPlay === 'interception' ? 'bg-gradient-to-r from-blue-600 to-blue-500' :
                  bigPlay === 'sack' ? 'bg-gradient-to-r from-purple-600 to-purple-500' :
                  bigPlay === 'blocked-kick' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500' :
                  bigPlay === 'turnover-on-downs' ? 'bg-gradient-to-r from-red-700 to-red-600' :
                  'bg-slate-600'
                }`}>
                  <div className="flex items-center justify-center gap-3">
                    <span className={`text-3xl ${bigPlay === 'fumble' ? 'animate-bounce' : 'animate-pulse'}`}>
                      {bigPlay === 'fumble' && '🏈'}
                      {bigPlay === 'interception' && '🙌'}
                      {bigPlay === 'sack' && '💥'}
                      {bigPlay === 'blocked-kick' && '✋'}
                      {bigPlay === 'turnover-on-downs' && '🔄'}
                    </span>
                    <p className="text-2xl font-black text-white tracking-wider">
                      {bigPlay === 'fumble' && 'FUMBLE!'}
                      {bigPlay === 'interception' && 'INTERCEPTED!'}
                      {bigPlay === 'sack' && 'SACK!'}
                      {bigPlay === 'blocked-kick' && 'BLOCKED!'}
                      {bigPlay === 'turnover-on-downs' && 'TURNOVER ON DOWNS!'}
                    </p>
                    <span className={`text-3xl ${bigPlay === 'fumble' ? 'animate-bounce' : 'animate-pulse'}`}>
                      {bigPlay === 'fumble' && '🏈'}
                      {bigPlay === 'interception' && '🙌'}
                      {bigPlay === 'sack' && '💥'}
                      {bigPlay === 'blocked-kick' && '✋'}
                      {bigPlay === 'turnover-on-downs' && '🔄'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Game Status Bar - excludes end-quarter, halftime-show, final (shown in clock area) */}
              {gameStatus && !['end-quarter', 'halftime-show', 'final'].includes(gameStatus) && (
                <div className={`rounded-lg px-4 py-3 mb-4 animate-bounce-in ${
                  gameStatus === 'kickoff' ? 'bg-green-600' :
                  gameStatus === 'ad-break' ? 'bg-purple-600' :
                  gameStatus === 'injury' ? 'bg-red-700' :
                  gameStatus === 'measurement' ? 'bg-blue-600' :
                  gameStatus === 'two-minute' ? 'bg-yellow-600' :
                  gameStatus === 'weather' ? 'bg-sky-600' :
                  gameStatus === 'technical' ? 'bg-gray-700' :
                  'bg-slate-600'
                }`}>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-bold text-white tracking-wider uppercase">
                      {gameStatus === 'kickoff' && '🏈 KICKOFF'}
                      {gameStatus === 'ad-break' && '📺 COMMERCIAL BREAK'}
                      {gameStatus === 'injury' && '🏥 INJURY TIMEOUT'}
                      {gameStatus === 'measurement' && '📏 MEASUREMENT'}
                      {gameStatus === 'two-minute' && '⏱️ TWO-MINUTE WARNING'}
                      {gameStatus === 'weather' && '⛈️ WEATHER DELAY'}
                      {gameStatus === 'technical' && '⚠️ TECHNICAL DIFFICULTIES'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Touchback Bar */}
              {showTouchback && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg px-4 py-3 mb-4 animate-bounce-in">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">🏈</span>
                    <span className="text-2xl font-bold text-white tracking-wider">TOUCHBACK</span>
                    <span className="text-2xl">🏈</span>
                  </div>
                </div>
              )}
              
              {/* Live indicator - top left */}
              {showLiveIndicator && (
                <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-400">LIVE</span>
                </div>
              )}
              
              {/* Down & Distance Bar - with subtle first down/incomplete/out of bounds/turnover/fumble highlight */}
              <div className={`flex items-center justify-center gap-2 mb-4 rounded-xl py-2.5 px-5 transition-all duration-500 backdrop-blur-sm ${
                showFirstDown 
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
                        color: possession === 'home' ? game.home_team.color : game.away_team.color,
                        textShadow: `0 0 10px ${possession === 'home' ? game.home_team.color : game.away_team.color}60`
                      }}
                    >
                      {possession === 'home' 
                        ? (game.home_team.abbreviation || game.home_team.name.substring(0, 2).toUpperCase())
                        : (game.away_team.abbreviation || game.away_team.name.substring(0, 2).toUpperCase())
                      }
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
              
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  {game.away_team.logo_url ? (
                    <img 
                      src={game.away_team.logo_url}
                      alt={game.away_team.name}
                      className={`h-16 w-16 mx-auto rounded-full object-cover mb-2 transition-all ${
                        flagDisplayStage === 2 && displayedPenalty?.team === 'away' 
                          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' 
                          : possession === 'away' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50' : ''
                      }`}
                    />
                  ) : (
                    <div 
                      className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2 transition-all ${
                        flagDisplayStage === 2 && displayedPenalty?.team === 'away' 
                          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' 
                          : possession === 'away' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50' : ''
                      }`}
                      style={{ 
                        backgroundColor: game.away_team.color,
                        color: game.away_team.color2 || '#ffffff'
                      }}
                    >
                      {game.away_team.abbreviation || game.away_team.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-medium">{game.away_team.name}</p>
                  {/* Possession indicator */}
                  {possession === 'away' && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className="text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <AnimatedScore score={game.away_score} color={game.away_team.color} size="lg" />
                  </div>
                  {/* Away Timeouts - highlight last one red if challenging */}
                  <div className="flex justify-center gap-1.5 mt-2">
                    {[1, 2, 3].map((t) => {
                      const isActive = t <= awayTimeouts
                      const isChallenged = challengeActive && challengeTeam === 'away' && t === awayTimeouts
                      return (
                        <div 
                          key={t}
                          className={`h-2 w-6 rounded-full transition-all duration-300 ${
                            isChallenged 
                              ? 'animate-pulse' 
                              : !isActive 
                                ? 'bg-slate-700/60' 
                                : ''
                          }`}
                          style={
                            isChallenged 
                              ? { backgroundColor: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }
                              : isActive 
                                ? { backgroundColor: game.away_team.color2 || '#fbbf24', boxShadow: `0 0 6px ${game.away_team.color2 || '#fbbf24'}40` }
                                : {}
                          }
                        />
                      )
                    })}
                  </div>
                </div>
                {/* Center - Game Clock and Play Clock (or status overlays) */}
                <div className="text-center relative">
                  {gameStatus === 'final' ? (
                    <div className="py-2">
                      <span className="text-slate-500 text-sm font-semibold block mb-1 uppercase tracking-wider">{game.quarter}</span>
                      <span className="text-4xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent tracking-wider drop-shadow-lg">
                        FINAL
                      </span>
                    </div>
                  ) : gameStatus === 'end-quarter' ? (
                    <div className="py-2">
                      <span className="text-slate-500 text-sm font-semibold block mb-1 uppercase tracking-wider">{game.quarter}</span>
                      <span className="text-3xl font-bold text-slate-400 tracking-wider">
                        END OF QUARTER
                      </span>
                    </div>
                  ) : gameStatus === 'halftime-show' ? (
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
                      <div className="mt-1.5">
                        <span className={`text-xl font-mono font-bold ${playClock <= 5 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`}>
                          {playClock}
                        </span>
                        <span className="text-slate-600 text-xs ml-1.5 uppercase tracking-wider">Play</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-center">
                  {game.home_team.logo_url ? (
                    <img 
                      src={game.home_team.logo_url}
                      alt={game.home_team.name}
                      className={`h-16 w-16 mx-auto rounded-full object-cover mb-2 transition-all ${
                        flagDisplayStage === 2 && displayedPenalty?.team === 'home' 
                          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' 
                          : possession === 'home' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50' : ''
                      }`}
                    />
                  ) : (
                    <div 
                      className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2 transition-all ${
                        flagDisplayStage === 2 && displayedPenalty?.team === 'home' 
                          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' 
                          : possession === 'home' ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-green-400/50' : ''
                      }`}
                      style={{ 
                        backgroundColor: game.home_team.color,
                        color: game.home_team.color2 || '#ffffff'
                      }}
                    >
                      {game.home_team.abbreviation || game.home_team.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-medium">{game.home_team.name}</p>
                  {/* Possession indicator */}
                  {possession === 'home' && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className="text-xs font-bold text-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">🏈 POSSESSION</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <AnimatedScore score={game.home_score} color={game.home_team.color} size="lg" />
                  </div>
                  {/* Home Timeouts - highlight last one red if challenging */}
                  <div className="flex justify-center gap-1.5 mt-2">
                    {[1, 2, 3].map((t) => {
                      const isActive = t <= homeTimeouts
                      const isChallenged = challengeActive && challengeTeam === 'home' && t === homeTimeouts
                      return (
                        <div 
                          key={t}
                          className={`h-2 w-6 rounded-full transition-all duration-300 ${
                            isChallenged 
                              ? 'animate-pulse' 
                              : !isActive 
                                ? 'bg-slate-700/60' 
                                : ''
                          }`}
                          style={
                            isChallenged 
                              ? { backgroundColor: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }
                              : isActive 
                                ? { backgroundColor: game.home_team.color2 || '#fbbf24', boxShadow: `0 0 6px ${game.home_team.color2 || '#fbbf24'}40` }
                                : {}
                          }
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring Controls - Right below preview */}
      {game.status === 'live' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Away Team Scoring */}
          <Card>
            <CardHeader className="pb-2" style={{ borderLeftWidth: '4px', borderLeftColor: game.away_team.color }}>
              <CardTitle className="flex items-center gap-2">
                {game.away_team.logo_url ? (
                  <img src={game.away_team.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: game.away_team.color }}
                  >
                    {game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {game.away_team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Football scoring buttons */}
              <div className="flex flex-wrap gap-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => updateScore('away', 6)}>
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
                  <span className="text-sm font-medium text-slate-600">Timeouts</span>
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
                  <img src={game.home_team.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: game.home_team.color }}
                  >
                    {game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {game.home_team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Football scoring buttons */}
              <div className="flex flex-wrap gap-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => updateScore('home', 6)}>
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
                  <span className="text-sm font-medium text-slate-600">Timeouts</span>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Clock Controls</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Game Clock */}
              <div className="bg-slate-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700">Game Clock</span>
                  <span className="text-2xl font-mono font-bold text-slate-900">{game.game_time}</span>
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
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={prevQuarter}
                    disabled={QUARTERS.indexOf(game.quarter) === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-slate-900">{game.quarter}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={nextQuarter}
                    disabled={QUARTERS.indexOf(game.quarter) === QUARTERS.length - 1}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Start Quarter Button - clears end-quarter/halftime status and starts clock */}
                {(gameStatus === 'end-quarter' || gameStatus === 'halftime-show') && (
                  <Button 
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // If starting Q3 (coming out of halftime), show kickoff
                      if (game.quarter === 'Q3') {
                        setGameStatus('kickoff')
                      } else {
                        setGameStatus(null)
                      }
                      startTimer()
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start {game.quarter}
                  </Button>
                )}
                {/* Touchback Button - appears during kickoff */}
                {gameStatus === 'kickoff' && (
                  <Button 
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setGameStatus(null)
                      setShowTouchback(true)
                      setTimeout(() => setShowTouchback(false), 5000)
                    }}
                  >
                    <span className="mr-2">🏈</span>
                    Touchback
                  </Button>
                )}
              </div>
              
              {/* Play Clock */}
              <div className="bg-slate-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700">Play Clock</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setPlayClock(prev => Math.max(0, prev - 1))}
                    >
                      -1
                    </Button>
                    <span className={`text-3xl font-mono font-bold min-w-[3ch] text-center ${playClock <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                      {playClock}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setPlayClock(prev => Math.min(99, prev + 1))}
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
                </div>
                
                {/* Delay of Game button - appears when play clock is 0 */}
                {playClock === 0 && (
                  <Button 
                    className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
                    onClick={() => {
                      const delayPenalty = NFL_PENALTIES.find(p => p.name === 'Delay of Game')
                      const offenseTeam = possession || 'home'
                      if (delayPenalty) {
                        const penaltyRecord = {
                          team: offenseTeam,
                          teamName: offenseTeam === 'home' ? game.home_team.name : game.away_team.name,
                          teamColor: offenseTeam === 'home' ? game.home_team.color : game.away_team.color,
                          teamLogo: offenseTeam === 'home' ? game.home_team.logo_url : game.away_team.logo_url,
                          name: delayPenalty.name,
                          yards: delayPenalty.yards,
                          quarter: game.quarter,
                          time: game.game_time,
                        }
                        setSelectedPenalty(delayPenalty)
                        setSelectedPenaltyTeam(offenseTeam)
                        setDisplayedPenalty(penaltyRecord)
                        setFlagDisplayStage(2)
                        resetPlayClock(40)
                      }
                    }}
                  >
                    🚩 Delay of Game
                  </Button>
                )}
              </div>
            </div>
            
            {/* Reset Timeouts */}
            <div className="flex items-center justify-center gap-3 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={resetTimeoutsForHalf} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Timeouts
              </Button>
            </div>
          </CardContent>
        </Card>

          {/* Down & Distance Controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Down & Distance</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Down */}
              <div className="bg-slate-100 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 uppercase mb-1">Down</p>
                <p className="text-3xl font-bold text-slate-900">{down}</p>
                <div className="flex gap-1 mt-2">
                  <Button variant="outline" size="sm" className="flex-1 px-1" onClick={() => setDown(Math.max(1, down - 1))}>-</Button>
                  <Button variant="outline" size="sm" className="flex-1 px-1" onClick={() => setDown(Math.min(4, down + 1))}>+</Button>
                </div>
              </div>
              
              {/* Distance */}
              <div className="bg-slate-100 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 uppercase mb-1">Distance</p>
                <p className="text-3xl font-bold text-slate-900">{getDistanceDisplay()}</p>
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
              <div className="bg-slate-100 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 uppercase mb-1">Possession</p>
                <div 
                  className="h-10 w-10 mx-auto rounded-full border-2 cursor-pointer"
                  style={{ 
                    backgroundColor: possession === 'home' ? game.home_team.color : game.away_team.color,
                    borderColor: possession === 'home' ? game.home_team.color : game.away_team.color
                  }}
                  onClick={togglePossession}
                />
                <p className="text-xs mt-1 font-medium">
                  {possession === 'home' ? game.home_team.name : game.away_team.name}
                </p>
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
                  setShowFirstDown(true)
                  setTimeout(() => setShowFirstDown(false), 3000)
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
                    setPlayClock(40)
                    startPlayClock()
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
                  onClick={() => {
                    stopTimer()
                    togglePossession()
                    setShowTurnoverOnDowns(true)
                    setTimeout(() => setShowTurnoverOnDowns(false), 3000)
                  }}
                >
                  🔄 Turnover
                </Button>
                <Button variant="outline" size="sm" onClick={togglePossession}>
                  Swap Poss.
                </Button>
              </div>
              
              {/* Toggle Options */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={possession === null ? "default" : "outline"} 
                  size="sm" 
                  className={possession === null ? "bg-slate-600 hover:bg-slate-700" : ""}
                  onClick={() => setPossession(null)}
                >
                  {possession === null ? "No Poss. ✓" : "No Poss."}
                </Button>
                <Button 
                  variant={showDownOnly ? "default" : "outline"} 
                  size="sm" 
                  className={showDownOnly ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                  onClick={() => setShowDownOnly(!showDownOnly)}
                >
                  {showDownOnly ? "Down Only ✓" : "Down Only"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Penalty Flag Panel */}
      {game.status === 'live' && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Flag className="h-5 w-5" />
                Penalty Flag
              </CardTitle>
              <div className="flex gap-2">
                {/* Stage indicator */}
                {flagDisplayStage > 0 && (
                  <span className="text-sm bg-yellow-200 px-2 py-1 rounded font-medium">
                    Stage {flagDisplayStage}/2
                  </span>
                )}
                <Button
                  variant={showFlagPanel ? "default" : "outline"}
                  className={showFlagPanel ? "bg-yellow-600 hover:bg-yellow-700" : "border-yellow-400 text-yellow-800"}
                  onClick={() => {
                    if (showFlagPanel) {
                      hideFlagFromDisplay()
                    } else {
                      setShowFlagPanel(true)
                    }
                  }}
                >
                  {showFlagPanel ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </>
                  ) : (
                    <>
                      <Flag className="h-4 w-4 mr-2" />
                      Open Flag Panel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showFlagPanel && (
            <CardContent className="space-y-4">
              {/* Two-Stage Flag Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className={`gap-2 ${flagDisplayStage >= 1 ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-black font-bold`}
                  onClick={showFlagStage1}
                  disabled={flagDisplayStage >= 1}
                >
                  <Flag className="h-5 w-5" />
                  {flagDisplayStage >= 1 ? '✓ FLAG Shown' : 'Show FLAG'}
                </Button>
                <Button
                  size="lg"
                  className={`gap-2 ${flagDisplayStage === 2 ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-black font-bold`}
                  onClick={showFlagStage2}
                  disabled={flagDisplayStage === 2 || !selectedPenalty || !selectedPenaltyTeam}
                >
                  <Eye className="h-5 w-5" />
                  {flagDisplayStage === 2 ? '✓ Details Shown' : 'Show Penalty Details'}
                </Button>
              </div>
              
              {/* Hide Flag Button */}
              {flagDisplayStage > 0 && (
                <Button
                  variant="outline"
                  className="w-full border-yellow-400 text-yellow-800"
                  onClick={hideFlagFromDisplay}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Flag from Display
                </Button>
              )}
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Select Penalty Type</p>
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
                
                {/* Penalty Dropdown */}
                <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                  {filteredPenalties.map((penalty) => (
                    <button
                      key={penalty.name}
                      className={`w-full text-left px-4 py-2 hover:bg-yellow-50 border-b last:border-b-0 flex justify-between items-center ${
                        selectedPenalty?.name === penalty.name ? 'bg-yellow-100' : ''
                      }`}
                      onClick={() => selectPenalty(penalty)}
                    >
                      <span>{penalty.name}</span>
                      <span className="text-sm text-slate-500">
                        {penalty.yards > 0 ? `${penalty.yards} yds` : penalty.spotFoul ? 'Spot' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Team Selection - Only show after penalty is selected */}
              {selectedPenalty && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Penalty on which team?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={selectedPenaltyTeam === 'away' ? 'default' : 'outline'}
                      className={selectedPenaltyTeam === 'away' ? '' : 'border-slate-300'}
                      style={selectedPenaltyTeam === 'away' ? { backgroundColor: game.away_team.color } : {}}
                      onClick={() => selectTeamForPenalty('away')}
                    >
                      {game.away_team.name}
                    </Button>
                    <Button
                      variant={selectedPenaltyTeam === 'home' ? 'default' : 'outline'}
                      className={selectedPenaltyTeam === 'home' ? '' : 'border-slate-300'}
                      style={selectedPenaltyTeam === 'home' ? { backgroundColor: game.home_team.color } : {}}
                      onClick={() => selectTeamForPenalty('home')}
                    >
                      {game.home_team.name}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Current Selection Summary */}
              {(selectedPenalty || selectedPenaltyTeam) && (
                <div className="bg-yellow-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-yellow-800">Ready to display:</p>
                  <p className="text-yellow-700">
                    {selectedPenalty?.name || '(select penalty)'} on {selectedPenaltyTeam ? (selectedPenaltyTeam === 'home' ? game.home_team.name : game.away_team.name) : '(select team)'}
                  </p>
                </div>
              )}
              
            </CardContent>
          )}
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
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant={gameStatus === 'kickoff' ? 'default' : 'outline'}
                className={`flex-col h-auto py-3 ${gameStatus === 'kickoff' ? 'bg-green-600 hover:bg-green-700' : 'border-green-400 text-green-700 hover:bg-green-50'}`}
                onClick={() => setGameStatus(gameStatus === 'kickoff' ? null : 'kickoff')}
              >
                <span className="text-lg">🏈</span>
                <span className="text-xs">Kickoff</span>
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
                <span className="text-lg">🏥</span>
                <span className="text-xs">Injury</span>
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
                className={`flex-col h-auto py-3 ${gameStatus === 'technical' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-400 text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setGameStatus(gameStatus === 'technical' ? null : 'technical')}
              >
                <span className="text-lg">⚠️</span>
                <span className="text-xs">Tech Diff</span>
              </Button>
            </div>
            
            {/* Big Plays / Turnovers Section */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-600">Turnovers & Big Plays</p>
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
            
            {/* Quick Play Actions */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold text-slate-600 mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-slate-400 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    stopTimer()
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
                  className="border-slate-400 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    stopTimer()
                    setShowOutOfBounds(true)
                    setTimeout(() => setShowOutOfBounds(false), 2000)
                  }}
                >
                  <span className="mr-2">📍</span>
                  Out of Bounds
                </Button>
              </div>
            </div>
            
            {/* Final & Live Indicator */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <Button
                variant={gameStatus === 'final' ? 'default' : 'outline'}
                className={`w-full ${gameStatus === 'final' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-400 text-amber-700 hover:bg-amber-50'}`}
                onClick={() => setGameStatus(gameStatus === 'final' ? null : 'final')}
              >
                <span className="mr-2">🏆</span>
                {gameStatus === 'final' ? 'FINAL - Game Over' : 'Mark as FINAL'}
              </Button>
              <Button
                variant={showLiveIndicator ? 'default' : 'outline'}
                className={`w-full ${showLiveIndicator ? 'bg-red-600 hover:bg-red-700' : 'border-red-400 text-red-700 hover:bg-red-50'}`}
                onClick={() => setShowLiveIndicator(!showLiveIndicator)}
              >
                <span className={`h-2 w-2 rounded-full mr-2 ${showLiveIndicator ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
                {showLiveIndicator ? 'LIVE Indicator ON' : 'LIVE Indicator OFF'}
              </Button>
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
          </CardContent>
        </Card>
      )}

      {/* Final Score Display */}
      {game.status === 'final' && (
        <Card className="bg-slate-100">
          <CardContent className="py-6 text-center">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
            <p className="text-xl font-bold text-slate-900">
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

      {/* Share Code Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Share2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Share this game</p>
              <p className="text-2xl font-bold tracking-wider text-green-700">{game.share_code}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyShareLink} className="border-green-600 text-green-700">
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Review & Game Controls Row */}
      {game.status === 'live' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Review Control Panel */}
          <Card className="border-red-300 bg-red-50 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Video className="h-5 w-5" />
                Replay Review
              </CardTitle>
              <div className="flex gap-2">
                {/* Stage indicator */}
                {reviewDisplayStage > 0 && (
                  <span className="text-sm bg-red-200 px-2 py-1 rounded font-medium text-red-800">
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
            
            {/* Review Reason Input */}
            <div>
              <Label className="text-sm font-medium text-slate-700">Review Reason (optional)</Label>
              <Input
                placeholder="e.g., Touchdown, Catch/No Catch, Targeting..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="mt-1"
              />
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
                          ? (game.home_team.abbreviation?.substring(0, 2) || game.home_team.name.substring(0, 2).toUpperCase())
                          : (game.away_team.abbreviation?.substring(0, 2) || game.away_team.name.substring(0, 2).toUpperCase())
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
          <Card className="bg-slate-50 flex flex-col justify-center">
            <CardContent className="py-4">
              <p className="text-sm font-semibold text-slate-600 mb-3 text-center">Game Controls</p>
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
