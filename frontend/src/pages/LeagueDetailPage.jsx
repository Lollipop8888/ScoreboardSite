import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Trophy, Users, Calendar, GitBranch, Share2, Trash2, Play, Upload, X, Pencil, Copy, Check, Settings, Send, Eye, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { leagueApi, teamApi, gameApi, bracketApi, seasonApi, recordTypeApi, teamSeasonStatsApi, inviteApi, followApi, notificationApi, createWebSocket } from '@/lib/api'
import { requestNotificationPermission, subscribeToPush, getPushUnsupportedReason } from '@/lib/notifications'

// Notification permission for this device, or null if push can't be used here (e.g. iOS Safari not added to Home Screen)
const getPushPermission = () => (getPushUnsupportedReason() ? null : Notification.permission)
import { Bell, BellOff } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { QRCodeSVG } from 'qrcode.react'
import { HelpButton, FirstTimeTutorial } from '@/components/HelpTips'

// Default preset penalties - comprehensive list
const DEFAULT_PENALTIES = [
  // Offense penalties
  { name: 'Offensive Holding', yards: 10, side: 'offense', custom: false },
  { name: 'False Start', yards: 5, side: 'offense', custom: false },
  { name: 'Offensive Pass Interference', yards: 10, side: 'offense', custom: false },
  { name: 'Illegal Formation', yards: 5, side: 'offense', custom: false },
  { name: 'Delay of Game', yards: 5, side: 'offense', custom: false },
  { name: 'Illegal Motion', yards: 5, side: 'offense', custom: false },
  { name: 'Illegal Shift', yards: 5, side: 'offense', custom: false },
  { name: 'Illegal Block in the Back', yards: 10, side: 'offense', custom: false },
  { name: 'Intentional Grounding', yards: 10, side: 'offense', lossOfDown: true, custom: false },
  { name: 'Ineligible Receiver Downfield', yards: 5, side: 'offense', custom: false },
  { name: 'Illegal Forward Pass', yards: 5, side: 'offense', lossOfDown: true, custom: false },
  { name: 'Illegal Touch', yards: 5, side: 'offense', lossOfDown: true, custom: false },
  { name: 'Illegal Use of Hands', yards: 10, side: 'offense', custom: false },
  { name: 'Tripping', yards: 10, side: 'offense', custom: false },
  { name: 'Chop Block', yards: 15, side: 'offense', custom: false },
  { name: 'Clipping', yards: 15, side: 'offense', custom: false },
  // Defense penalties
  { name: 'Defensive Holding', yards: 5, side: 'defense', custom: false },
  { name: 'Offsides', yards: 5, side: 'defense', custom: false },
  { name: 'Defensive Pass Interference', yards: 15, side: 'defense', custom: false },
  { name: 'Encroachment', yards: 5, side: 'defense', custom: false },
  { name: 'Neutral Zone Infraction', yards: 5, side: 'defense', custom: false },
  { name: 'Roughing the Passer', yards: 15, side: 'defense', custom: false },
  { name: 'Roughing the Kicker', yards: 15, side: 'defense', custom: false },
  { name: 'Running into the Kicker', yards: 5, side: 'defense', custom: false },
  { name: 'Illegal Contact', yards: 5, side: 'defense', custom: false },
  { name: 'Leverage', yards: 15, side: 'defense', custom: false },
  { name: 'Leaping', yards: 15, side: 'defense', custom: false },
  // Either team penalties
  { name: 'Unsportsmanlike Conduct', yards: 15, side: 'either', custom: false, subPenalties: ['Taunting', 'Excessive Celebration', 'Fighting'] },
  { name: 'Facemask', yards: 15, side: 'either', custom: false },
  { name: 'Personal Foul', yards: 15, side: 'either', custom: false, subPenalties: ['Unnecessary Roughness', 'Late Hit', 'Horse Collar Tackle', 'Helmet-to-Helmet', 'Targeting', 'Spearing'] },
  { name: 'Illegal Substitution', yards: 5, side: 'either', custom: false },
  { name: 'Too Many Players on Field', yards: 5, side: 'either', custom: false },
  { name: 'Illegal Participation', yards: 5, side: 'either', custom: false },
  { name: 'Sideline Infraction', yards: 5, side: 'either', custom: false },
  { name: 'Illegal Kick', yards: 10, side: 'either', custom: false },
  { name: 'Illegal Batting', yards: 10, side: 'either', custom: false },
]

export default function LeagueDetailPage() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [league, setLeague] = useState(null)
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [brackets, setBrackets] = useState([])
  const [loading, setLoading] = useState(true)
  const [gamesFilter, setGamesFilter] = useState('scheduled') // 'scheduled', 'current', 'completed'
  // Season shown on the Games tab: null follows the current season, 'all' shows every season
  const [gamesSeasonId, setGamesSeasonId] = useState(null)
  
  // Dialog states
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [teamEditDialogOpen, setTeamEditDialogOpen] = useState(false)
  const [statsEditDialogOpen, setStatsEditDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editingStatsTeam, setEditingStatsTeam] = useState(null)
  const [gameDialogOpen, setGameDialogOpen] = useState(false)
  const [gameEditDialogOpen, setGameEditDialogOpen] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareInfo, setShareInfo] = useState({ type: '', code: '', name: '' })
  const [copied, setCopied] = useState(false)
  const [newGroup1, setNewGroup1] = useState('')
  const [newGroup2, setNewGroup2] = useState('')
  const [gameUnitEnabled, setGameUnitEnabled] = useState(false)
  const [gameUnitLabel, setGameUnitLabel] = useState('')
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [selectedStandingsSeasonId, setSelectedStandingsSeasonId] = useState('all')
  const [newSeasonDialogOpen, setNewSeasonDialogOpen] = useState(false)
  const [newSeasonName, setNewSeasonName] = useState('')
  const [recordTypes, setRecordTypes] = useState([])
  const [selectedRecordType, setSelectedRecordType] = useState(null) // null = main/Overall
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('overall') // 'overall', 'preseason', 'regular', 'playoffs'

  // The phase selector is only shown for all-time standings, so don't keep a hidden phase filter applied to a single season
  useEffect(() => {
    if (selectedStandingsSeasonId !== 'all') setSelectedPhaseFilter('overall')
  }, [selectedStandingsSeasonId])

  const [newRecordTypeName, setNewRecordTypeName] = useState('')
  const [standingsSubTab, setStandingsSubTab] = useState('table')
  const [settingsTab, setSettingsTab] = useState('general')
  const [activeTab, setActiveTab] = useState('standings')
  const [penaltiesDialogOpen, setPenaltiesDialogOpen] = useState(false)
  const [addPenaltyDialogOpen, setAddPenaltyDialogOpen] = useState(false)
  const [addSubPenaltyDialogOpen, setAddSubPenaltyDialogOpen] = useState(false)
  const [editPenaltyDialogOpen, setEditPenaltyDialogOpen] = useState(false)
  const [penaltyForm, setPenaltyForm] = useState({ name: '', yards: 5, lossOfDown: false, scope: 'league', side: 'either' })
  const [editPenaltyForm, setEditPenaltyForm] = useState({ index: null, name: '', yards: 5, lossOfDown: false, side: 'either', parentIndex: null })
  const [subPenaltyForm, setSubPenaltyForm] = useState({ parentIndex: null, name: '' })
  const [inviteUsername, setInviteUsername] = useState('')
  const [invitePermission, setInvitePermission] = useState('view')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [pushPermission, setPushPermission] = useState(getPushPermission)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Form states
  const [teamForm, setTeamForm] = useState({ name: '', location: '', abbreviation: '', group_1: '', group_2: '', color: '#3B82F6', color2: '', color3: '' })
  
  // Parse group options from league.groups JSON
  // Structure: { group1: ["AFC", "NFC"], group2: { "AFC": ["North", "South"], "NFC": ["North", "South"] } }
  const groupOptions = (() => {
    if (!league?.groups) return { group1: [], group2: {} }
    try {
      const parsed = typeof league.groups === 'string' ? JSON.parse(league.groups) : league.groups
      return {
        group1: parsed.group1 || [],
        group2: parsed.group2 || {}  // Now an object keyed by group1 value
      }
    } catch {
      return { group1: [], group2: {} }
    }
  })()
  const [statsForm, setStatsForm] = useState({ wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 })
  const [gameForm, setGameForm] = useState({ home_team_id: '', away_team_id: '', scheduled_date: '', scheduled_time: '', game_unit: '', game_unit_type: '1' })
  const [gameEditForm, setGameEditForm] = useState({ home_team_id: '', away_team_id: '', scheduled_date: '', scheduled_time: '', game_unit: '', game_unit_type: '1' })
  const [bracketForm, setBracketForm] = useState({ name: '', num_teams: 4, layout: 'one_sided', team_ids: [], is_playoff: false })
  const [bracketSlots, setBracketSlots] = useState([]) // Array of team IDs or 'BYE' for each slot

  useEffect(() => {
    loadData()
  }, [leagueId])

  // Check follow status whenever user or league changes (auth may load after initial mount)
  useEffect(() => {
    if (!user || !leagueId) {
      setIsFollowing(false)
      return
    }
    let cancelled = false
    followApi.getAll()
      .then((follows) => {
        if (cancelled) return
        const following = (follows || []).some(f => f.league_id === leagueId)
        setIsFollowing(following)
        // Re-register this device's push subscription (it can expire, or this may be a new install)
        if (following && getPushPermission() === 'granted') subscribeToPush()
      })
      .catch((err) => console.error('Failed to check follow status:', err))
    return () => { cancelled = true }
  }, [user, leagueId])

  useEffect(() => {
    if (!leagueId) return
    // If a specific season is selected, standings come from TeamSeasonStats (season-specific)
    if (selectedStandingsSeasonId && selectedStandingsSeasonId !== 'all') {
      seasonApi.getStandings(selectedStandingsSeasonId).then((stats) => {
        const teamsById = new Map((league?.teams || []).map(t => [t.id, t]))

        // Compute per-season home/away from final games in this season.
        // Preseason games (Preseason Week games, or any game in a preseason-phase season) aren't part of the main record.
        const seasonPhase = seasons.find(s => s.id === selectedStandingsSeasonId)?.phase
        const isPreseasonGame = (g) => g.game_unit_type === 3 || (g.game_unit_type !== 2 && seasonPhase === 'preseason')
        const haByTeam = {}
        const seasonFinals = (games || []).filter(
          (g) => g.season_id === selectedStandingsSeasonId && g.status === 'final' && g.home_team_id && g.away_team_id && !isPreseasonGame(g)
        )
        for (const g of seasonFinals) {
          if (!haByTeam[g.home_team_id]) haByTeam[g.home_team_id] = { home_wins: 0, home_losses: 0, home_ties: 0, away_wins: 0, away_losses: 0, away_ties: 0 }
          if (!haByTeam[g.away_team_id]) haByTeam[g.away_team_id] = { home_wins: 0, home_losses: 0, home_ties: 0, away_wins: 0, away_losses: 0, away_ties: 0 }
          const hs = g.home_score || 0
          const as_ = g.away_score || 0
          if (hs > as_) {
            haByTeam[g.home_team_id].home_wins += 1
            haByTeam[g.away_team_id].away_losses += 1
          } else if (as_ > hs) {
            haByTeam[g.away_team_id].away_wins += 1
            haByTeam[g.home_team_id].home_losses += 1
          } else {
            haByTeam[g.home_team_id].home_ties += 1
            haByTeam[g.away_team_id].away_ties += 1
          }
        }

        const merged = (stats || []).map((s) => {
          const team = teamsById.get(s.team_id) || {}
          const ha = haByTeam[s.team_id] || { home_wins: 0, home_losses: 0, home_ties: 0, away_wins: 0, away_losses: 0, away_ties: 0 }
          return {
            ...team,
            ...s,
            ...ha,
            id: team.id || s.team_id,
            __seasonStatsId: s.id,
          }
        })
        setStandings(merged)
      }).catch((e) => {
        console.error('Failed to load season standings:', e)
      })
      return
    }

    leagueApi.getStandings(leagueId, selectedPhaseFilter).then((data) => {
      setStandings(data || [])
    }).catch((e) => {
      console.error('Failed to load filtered standings:', e)
    })
  }, [leagueId, selectedPhaseFilter, selectedStandingsSeasonId, league?.teams, games, seasons])

  // WebSocket for real-time game updates
  useEffect(() => {
    if (!league?.share_code) return

    const ws = createWebSocket('league', league.share_code, (message) => {
      if (message.type === 'game_update') {
        // Update the game in the games list
        setGames(prevGames => prevGames.map(g => 
          g.id === message.data.id 
            ? { ...g, ...message.data }
            : g
        ))
      }
    })

    return () => ws.close()
  }, [league?.share_code])

  async function loadData() {
    try {
      // First get the league - this is required
      const leagueData = await leagueApi.get(leagueId)
      setLeague(leagueData)
      // Sync game unit state
      setGameUnitEnabled(!!leagueData.game_unit_label)
      setGameUnitLabel(leagueData.game_unit_label || 'Week')
      
      // Then get the rest - these can fail without breaking the page
      try {
        const [standingsData, gamesData, bracketsData, seasonsData, currentSeasonData, recordTypesData] = await Promise.all([
          leagueApi.getStandings(leagueId, selectedPhaseFilter),
          leagueApi.getGames(leagueId),
          leagueApi.getBrackets(leagueId),
          leagueApi.getSeasons(leagueId),
          leagueApi.getCurrentSeason(leagueId),
          recordTypeApi.getByLeague(leagueId),
        ])
        setStandings(standingsData || [])
        setGames(gamesData || [])
        setBrackets(bracketsData || [])
        setSeasons(seasonsData || [])
        setCurrentSeason(currentSeasonData)
        setRecordTypes(recordTypesData || [])

        // Keep default as 'all' so phase filters work immediately.
        // User can switch to a specific season manually.
      } catch (err) {
        console.error('Failed to load additional data:', err)
        setStandings([])
        setGames([])
        setBrackets([])
        setSeasons([])
        setCurrentSeason(null)
        setRecordTypes([])
      }
      
      // Check if user is following this league
      if (user) {
        try {
          const follows = await followApi.getAll()
          const isFollowingLeague = follows.some(f => f.league_id === leagueId)
          setIsFollowing(isFollowingLeague)
        } catch (err) {
          console.error('Failed to check follow status:', err)
        }
      }
    } catch (error) {
      console.error('Failed to load league:', error)
      setLeague(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTeam(e) {
    e.preventDefault()
    try {
      // Filter out empty optional fields
      const teamData = { ...teamForm, league_id: leagueId }
      if (!teamData.location) delete teamData.location
      if (!teamData.group_1) delete teamData.group_1
      if (!teamData.group_2) delete teamData.group_2
      if (!teamData.color2) delete teamData.color2
      if (!teamData.color3) delete teamData.color3
      await teamApi.create(teamData)
      setTeamDialogOpen(false)
      setTeamForm({ name: '', location: '', abbreviation: '', group_1: '', group_2: '', color: '#3B82F6', color2: '', color3: '' })
      loadData()
    } catch (error) {
      console.error('Failed to add team:', error)
    }
  }

  async function handleDeleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This will also delete all games involving this team.')) return
    try {
      await teamApi.delete(teamId)
      loadData()
    } catch (error) {
      console.error('Failed to delete team:', error)
    }
  }

  function openTeamEditDialog(team) {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      location: team.location || '',
      abbreviation: team.abbreviation || '',
      group_1: team.group_1 || '',
      group_2: team.group_2 || '',
      color: team.color || '#3B82F6',
      color2: team.color2 || '',
      color3: team.color3 || '',
    })
    setTeamEditDialogOpen(true)
  }

  function openStatsEditDialog(team) {
    setEditingStatsTeam(team)
    setStatsForm({
      wins: team.wins || 0,
      losses: team.losses || 0,
      ties: team.ties || 0,
      points_for: team.points_for || 0,
      points_against: team.points_against || 0,
    })
    setStatsEditDialogOpen(true)
  }

  async function handleEditStats(e) {
    e.preventDefault()
    if (!editingStatsTeam) return
    try {
      if (selectedStandingsSeasonId && selectedStandingsSeasonId !== 'all') {
        if (!editingStatsTeam.__seasonStatsId) {
          throw new Error('Missing season stats id for this team')
        }
        await teamSeasonStatsApi.update(editingStatsTeam.__seasonStatsId, statsForm)
      } else {
        await teamApi.update(editingStatsTeam.id, statsForm)
      }
      setStatsEditDialogOpen(false)
      setEditingStatsTeam(null)
      setStatsForm({ wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 })
      loadData()
    } catch (error) {
      console.error('Failed to update team stats:', error)
    }
  }

  async function handleEditTeam(e) {
    e.preventDefault()
    try {
      const teamData = { ...teamForm }
      if (!teamData.location) delete teamData.location
      if (!teamData.group_1) delete teamData.group_1
      if (!teamData.group_2) delete teamData.group_2
      if (!teamData.color2) delete teamData.color2
      if (!teamData.color3) delete teamData.color3
      await teamApi.update(editingTeam.id, teamData)
      setTeamEditDialogOpen(false)
      setEditingTeam(null)
      setTeamForm({ name: '', location: '', abbreviation: '', group_1: '', group_2: '', color: '#3B82F6', color2: '', color3: '' })
      loadData()
    } catch (error) {
      console.error('Failed to update team:', error)
    }
  }

  async function handleLogoUpload(teamId, file) {
    if (!file) return
    try {
      await teamApi.uploadLogo(teamId, file)
      loadData()
    } catch (error) {
      console.error('Failed to upload logo:', error)
      alert('Failed to upload logo: ' + error.message)
    }
  }

  // Add a new group option
  async function addGroupOption(level, value, parentGroup = null) {
    if (!value.trim()) return
    const newOptions = { 
      group1: [...groupOptions.group1],
      group2: { ...groupOptions.group2 }
    }
    if (level === 1) {
      if (!newOptions.group1.includes(value.trim())) {
        newOptions.group1 = [...newOptions.group1, value.trim()]
        // Initialize empty array for this group's level 2 options
        newOptions.group2[value.trim()] = []
      }
    } else if (parentGroup) {
      // Add to specific parent group
      if (!newOptions.group2[parentGroup]) {
        newOptions.group2[parentGroup] = []
      }
      if (!newOptions.group2[parentGroup].includes(value.trim())) {
        newOptions.group2[parentGroup] = [...newOptions.group2[parentGroup], value.trim()]
      }
    }
    try {
      await leagueApi.update(leagueId, { groups: newOptions })
      loadData()
      if (level === 1) setNewGroup1('')
      else setNewGroup2('')
    } catch (error) {
      console.error('Failed to add group option:', error)
    }
  }

  // Remove a group option
  async function removeGroupOption(level, value, parentGroup = null) {
    const newOptions = { 
      group1: [...groupOptions.group1],
      group2: { ...groupOptions.group2 }
    }
    if (level === 1) {
      newOptions.group1 = newOptions.group1.filter(g => g !== value)
      // Also remove the level 2 options for this group
      delete newOptions.group2[value]
    } else if (parentGroup) {
      newOptions.group2[parentGroup] = (newOptions.group2[parentGroup] || []).filter(g => g !== value)
    }
    try {
      await leagueApi.update(leagueId, { groups: newOptions })
      loadData()
    } catch (error) {
      console.error('Failed to remove group option:', error)
    }
  }

  async function handleLogoDelete(teamId) {
    try {
      await teamApi.deleteLogo(teamId)
      loadData()
    } catch (error) {
      console.error('Failed to delete logo:', error)
    }
  }

  async function handleAddGame(e) {
    e.preventDefault()
    try {
      // Build scheduled_at from date and time
      let scheduledAtISO = null
      const timeTbd = !gameForm.scheduled_time
      if (gameForm.scheduled_date) {
        if (timeTbd) {
          // Date only, time TBD - store as midnight
          scheduledAtISO = gameForm.scheduled_date + 'T00:00:00'
        } else {
          // Full date and time
          scheduledAtISO = gameForm.scheduled_date + 'T' + gameForm.scheduled_time + ':00'
        }
      }
      
      const gameData = { 
        home_team_id: gameForm.home_team_id || null,  // Empty = TBD
        away_team_id: gameForm.away_team_id || null,  // Empty = TBD
        league_id: leagueId,
        scheduled_at: scheduledAtISO,
        time_tbd: gameForm.scheduled_date ? timeTbd : false,
        game_unit: gameForm.game_unit !== '' ? parseInt(gameForm.game_unit) : null,
        game_unit_type: gameForm.game_unit !== '' ? parseInt(gameForm.game_unit_type) : 1
      }
      await gameApi.create(gameData)
      setGameDialogOpen(false)
      setGameForm({ home_team_id: '', away_team_id: '', scheduled_date: '', scheduled_time: '', game_unit: '', game_unit_type: '1' })
      loadData()
    } catch (error) {
      console.error('Failed to add game:', error)
    }
  }

  async function handleDeleteGame(gameId) {
    if (!confirm('Are you sure you want to delete this game?')) return
    try {
      await gameApi.delete(gameId)
      loadData()
    } catch (error) {
      console.error('Failed to delete game:', error)
    }
  }

  function openEditGame(game) {
    setEditingGame(game)
    // Convert stored date to separate date/time fields
    let scheduledDate = ''
    let scheduledTime = ''
    if (game.scheduled_at) {
      const date = new Date(game.scheduled_at + 'Z')
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      scheduledDate = `${year}-${month}-${day}`
      if (!game.time_tbd) {
        const hours = String(date.getUTCHours()).padStart(2, '0')
        const minutes = String(date.getUTCMinutes()).padStart(2, '0')
        scheduledTime = `${hours}:${minutes}`
      }
    }
    setGameEditForm({
      home_team_id: game.home_team?.id || '',
      away_team_id: game.away_team?.id || '',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      game_unit: game.game_unit?.toString() ?? '',
      game_unit_type: (game.game_unit_type || 1).toString()
    })
    setGameEditDialogOpen(true)
  }

  async function handleUpdateGame(e) {
    e.preventDefault()
    if (!editingGame) return
    try {
      // Build scheduled_at from date and time
      let scheduledAtISO = null
      const timeTbd = !gameEditForm.scheduled_time
      if (gameEditForm.scheduled_date) {
        if (timeTbd) {
          scheduledAtISO = gameEditForm.scheduled_date + 'T00:00:00'
        } else {
          scheduledAtISO = gameEditForm.scheduled_date + 'T' + gameEditForm.scheduled_time + ':00'
        }
      }
      await gameApi.update(editingGame.id, {
        home_team_id: gameEditForm.home_team_id || null,  // Empty string = TBD (null)
        away_team_id: gameEditForm.away_team_id || null,  // Empty string = TBD (null)
        scheduled_at: scheduledAtISO,
        time_tbd: gameEditForm.scheduled_date ? timeTbd : false,
        game_unit: gameEditForm.game_unit !== '' ? parseInt(gameEditForm.game_unit) : null,
        game_unit_type: gameEditForm.game_unit !== '' ? parseInt(gameEditForm.game_unit_type) : 1
      })
      setGameEditDialogOpen(false)
      setEditingGame(null)
      loadData()
    } catch (error) {
      console.error('Failed to update game:', error)
    }
  }

  async function handleCreateBracket(e) {
    e.preventDefault()
    try {
      const numTeams = parseInt(bracketForm.num_teams) || 4
      await bracketApi.create({
        name: bracketForm.name,
        league_id: leagueId,
        num_teams: numTeams,
        layout: bracketForm.layout,
        team_ids: bracketSlots.filter(s => s && s !== 'TBD' && s !== 'BYE'),
        is_playoff: bracketForm.is_playoff,
      })
      setBracketDialogOpen(false)
      setBracketForm({ name: '', num_teams: 4, layout: 'one_sided', team_ids: [], is_playoff: false })
      setBracketSlots([])
      loadData()
    } catch (error) {
      console.error('Failed to create bracket:', error)
    }
  }
  
  // Calculate bracket size (next power of 2)
  function getBracketSize(numTeams) {
    let size = 1
    while (size < numTeams) size *= 2
    return size
  }
  
  // Initialize bracket slots when num_teams changes
  function handleNumTeamsChange(num) {
    const numTeams = parseInt(num) || 0
    setBracketForm({ ...bracketForm, num_teams: numTeams })
    if (numTeams >= 2) {
      const bracketSize = getBracketSize(numTeams)
      // Initialize all slots as TBD by default
      const slots = []
      for (let i = 0; i < bracketSize; i++) {
        slots.push('TBD')
      }
      setBracketSlots(slots)
    } else {
      setBracketSlots([])
    }
  }
  
  // Update a specific slot
  function updateBracketSlot(index, value) {
    const newSlots = [...bracketSlots]
    newSlots[index] = value
    setBracketSlots(newSlots)
  }

  // Open share dialog
  function openShareDialog(type, code, name, resourceId = null) {
    setShareInfo({ type, code, name, resourceId: resourceId || leagueId })
    setCopied(false)
    setInviteUsername('')
    setInvitePermission('view')
    setInviteError('')
    setInviteSuccess('')
    setShareDialogOpen(true)
  }

  function copyShareCode() {
    navigator.clipboard.writeText(shareInfo.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSendInvite() {
    if (!inviteUsername.trim()) {
      setInviteError('Please enter a username')
      return
    }
    setInviteError('')
    setInviteSuccess('')
    try {
      await inviteApi.send({
        to_username: inviteUsername.trim(),
        resource_type: shareInfo.type,
        resource_id: shareInfo.resourceId,
        resource_name: shareInfo.name,
        permission: invitePermission,
      })
      setInviteSuccess(`Invite sent to @${inviteUsername.trim()}!`)
      setInviteUsername('')
    } catch (e) {
      setInviteError(e.message || 'Failed to send invite')
    }
  }

  // Games tab: only the selected season's games (defaults to the current season)
  const effectiveGamesSeasonId = gamesSeasonId ?? currentSeason?.id ?? 'all'
  const seasonGames = effectiveGamesSeasonId === 'all' ? games : games.filter(g => g.season_id === effectiveGamesSeasonId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!league) {
    return <div className="text-center py-12">League not found</div>
  }

  return (
    <div className="space-y-6">
      {/* First-time tutorial */}
      <FirstTimeTutorial context="league" storageKey="tutorial_seen_league" />
      
      {/* Floating help button */}
      <div className="fixed bottom-6 right-6 z-50">
        <HelpButton context="league" className="shadow-lg" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{league.name}</h1>
            {league.is_finished && (
              <span className="px-3 py-1 text-sm font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-full flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                COMPLETED
              </span>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {currentSeason ? (
              <>
                {currentSeason.name} - {
                  currentSeason.phase === 'preseason' ? 'Preseason' :
                  currentSeason.phase === 'playoffs' ? 'Playoffs' :
                  currentSeason.phase === 'offseason' ? 'Offseason' :
                  'Regular Season'
                }
              </>
            ) : (
              league.season || 'No active season'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Button
              variant={isFollowing ? "default" : "outline"}
              className={`gap-2 ${isFollowing ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              onClick={async () => {
                setFollowLoading(true)
                try {
                  if (isFollowing) {
                    await followApi.unfollowLeague(leagueId)
                    setIsFollowing(false)
                  } else {
                    // Ask for notification permission before any await: iOS only shows the
                    // prompt while still handling the tap. Following works even if push can't.
                    const unsupported = getPushUnsupportedReason()
                    const permissionRequest = unsupported ? null : requestNotificationPermission()
                    await followApi.followLeague(leagueId)
                    setIsFollowing(true)

                    if (unsupported) {
                      alert('Followed! ' + unsupported)
                    } else {
                      const hasPermission = await permissionRequest
                      setPushPermission(getPushPermission())
                      if (hasPermission) {
                        const sub = await subscribeToPush()
                        if (!sub) {
                          alert('Followed! But we could not enable push notifications on this device.')
                        }
                      } else if (Notification.permission === 'denied') {
                        alert('Followed! Notifications are blocked for this site. Enable them in your browser settings to receive alerts.')
                      }
                    }
                  }
                } catch (err) {
                  console.error('Failed to toggle follow:', err)
                } finally {
                  setFollowLoading(false)
                }
              }}
              disabled={followLoading}
            >
              {isFollowing ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
          {user && isFollowing && pushPermission === 'default' && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                // Following on another device (or before adding to Home Screen) doesn't turn on alerts here
                const hasPermission = await requestNotificationPermission()
                setPushPermission(getPushPermission())
                if (hasPermission && !(await subscribeToPush())) {
                  alert('Could not enable push notifications on this device.')
                }
              }}
            >
              <Bell className="h-4 w-4" />
              Enable alerts
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => openShareDialog('league', league.share_code, league.name)}
            data-tutorial="share-button"
          >
            <Share2 className="h-4 w-4" />
            Share League
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-tutorial="league-tabs">
          <TabsTrigger value="standings" className="gap-2">
            <Trophy className="h-4 w-4" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2" data-tutorial="teams-tab">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2" data-tutorial="games-tab">
            <Calendar className="h-4 w-4" />
            Games
          </TabsTrigger>
          <TabsTrigger value="brackets" className="gap-2" data-tutorial="brackets-tab">
            <GitBranch className="h-4 w-4" />
            Brackets
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Standings Tab */}
        <TabsContent value="standings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Standings</CardTitle>
                <CardDescription>View standings</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {standingsSubTab === 'table' && (
                <>
                  <div className="flex items-center justify-end gap-2 pb-4">
                    <Select value={selectedStandingsSeasonId} onValueChange={setSelectedStandingsSeasonId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All-time</SelectItem>
                        {(seasons || []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedStandingsSeasonId === 'all' && (
                      <Select value={selectedPhaseFilter} onValueChange={setSelectedPhaseFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Phase" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall">Overall</SelectItem>
                          <SelectItem value="preseason">Preseason</SelectItem>
                          <SelectItem value="regular">Regular Season</SelectItem>
                          <SelectItem value="playoffs">Playoffs</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {standings.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No standings yet</h3>
                      <p className="text-slate-500 mt-1">Add teams to this league to see standings.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left text-sm font-medium text-slate-500">
                            <th className="pb-3 pr-4">Rank</th>
                            <th className="pb-3 pr-4">Team</th>
                            <th className="pb-3 pr-4 text-center">W</th>
                            <th className="pb-3 pr-4 text-center">L</th>
                            <th className="pb-3 pr-4 text-center">T</th>
                            <th className="pb-3 pr-4 text-center">PCT</th>
                            <th className="pb-3 pr-4 text-center">Home</th>
                            <th className="pb-3 pr-4 text-center">Away</th>
                            {league?.has_groups && <th className="pb-3 pr-4 text-center">{league.group_label_2 || 'Div'} Rank</th>}
                            <th className="pb-3 pr-4 text-center">PF</th>
                            <th className="pb-3 pr-4 text-center">PA</th>
                            <th className="pb-3 pr-4 text-center">Diff</th>
                            <th className="pb-3 text-center">Edit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const getTeamRecord = (team) => {
                              let wins, losses, ties
                              if (selectedPhaseFilter === 'preseason') {
                                wins = team.preseason_wins || 0
                                losses = team.preseason_losses || 0
                                ties = team.preseason_ties || 0
                              } else if (selectedPhaseFilter === 'regular') {
                                wins = team.regular_wins || 0
                                losses = team.regular_losses || 0
                                ties = team.regular_ties || 0
                              } else if (selectedPhaseFilter === 'playoffs') {
                                wins = team.playoff_wins || 0
                                losses = team.playoff_losses || 0
                                ties = team.playoff_ties || 0
                              } else {
                                if (!selectedRecordType) {
                                  return { wins: team.wins || 0, losses: team.losses || 0, ties: team.ties || 0, points_for: team.points_for || 0, points_against: team.points_against || 0 }
                                }
                                const record = team.records?.find(r => r.record_type_id === selectedRecordType)
                                if (record) {
                                  return { wins: record.wins || 0, losses: record.losses || 0, ties: record.ties || 0, points_for: record.points_for || 0, points_against: record.points_against || 0 }
                                }
                                return { wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 }
                              }
                              return { wins, losses, ties, points_for: team.points_for || 0, points_against: team.points_against || 0 }
                            }

                            const sortedStandings = [...standings].sort((a, b) => {
                              const aRec = getTeamRecord(a)
                              const bRec = getTeamRecord(b)
                              if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins
                              if (aRec.losses !== bRec.losses) return aRec.losses - bRec.losses
                              return (bRec.points_for - bRec.points_against) - (aRec.points_for - aRec.points_against)
                            })

                            return sortedStandings.map((team, index) => {
                              const rec = getTeamRecord(team)
                              return (
                                <tr key={team.id} className="border-b last:border-0">
                                  <td className="py-3 pr-4 font-medium">{index + 1}</td>
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                      {team.logo_url ? (
                                        <img src={team.logo_url} alt="" className="h-5 w-5 object-contain" />
                                      ) : (
                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: team.color }} />
                                      )}
                                      <span className="font-medium">{team.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-center text-green-600 font-semibold">{rec.wins}</td>
                                  <td className="py-3 pr-4 text-center text-red-600 font-semibold">{rec.losses}</td>
                                  <td className="py-3 pr-4 text-center text-slate-500 font-semibold">{rec.ties}</td>
                                  <td className="py-3 pr-4 text-center font-semibold text-blue-600">
                                    {(() => {
                                      const total = rec.wins + rec.losses + rec.ties
                                      return total > 0 ? ((rec.wins + rec.ties * 0.5) / total).toFixed(3) : '.000'
                                    })()}
                                  </td>
                                  <td className="py-3 pr-4 text-center text-sm">
                                    <span className="text-green-600">{team.home_wins || 0}</span>
                                    <span className="text-slate-400">-</span>
                                    <span className="text-red-600">{team.home_losses || 0}</span>
                                    {(team.home_ties || 0) > 0 && <><span className="text-slate-400">-</span><span className="text-slate-500">{team.home_ties}</span></>}
                                  </td>
                                  <td className="py-3 pr-4 text-center text-sm">
                                    <span className="text-green-600">{team.away_wins || 0}</span>
                                    <span className="text-slate-400">-</span>
                                    <span className="text-red-600">{team.away_losses || 0}</span>
                                    {(team.away_ties || 0) > 0 && <><span className="text-slate-400">-</span><span className="text-slate-500">{team.away_ties}</span></>}
                                  </td>
                                  {league?.has_groups && (
                                    <td className="py-3 pr-4 text-center font-medium">{team.group_rank_2 || '-'}</td>
                                  )}
                                  <td className="py-3 pr-4 text-center">{rec.points_for}</td>
                                  <td className="py-3 pr-4 text-center">{rec.points_against}</td>
                                  <td className="py-3 pr-4 text-center font-semibold">
                                    {rec.points_for - rec.points_against > 0 ? '+' : ''}{rec.points_for - rec.points_against}
                                  </td>
                                  <td className="py-3 text-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openStatsEditDialog(team)}
                                      className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                      disabled={league.is_finished}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Teams</CardTitle>
                <CardDescription>Manage teams in this league</CardDescription>
              </div>
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" disabled={league.is_finished}>
                    <Plus className="h-4 w-4" />
                    Add Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddTeam}>
                    <DialogHeader>
                      <DialogTitle>Add Team</DialogTitle>
                      <DialogDescription>Add a new team to the league.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="team-name">Team Name (displayed)</Label>
                          <Input
                            id="team-name"
                            placeholder="e.g., Chiefs"
                            value={teamForm.name}
                            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            placeholder="e.g., Kansas City"
                            value={teamForm.location}
                            onChange={(e) => setTeamForm({ ...teamForm, location: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="abbreviation">Abbreviation</Label>
                          <Input
                            id="abbreviation"
                            placeholder="e.g., KC"
                            value={teamForm.abbreviation}
                            onChange={(e) => setTeamForm({ ...teamForm, abbreviation: e.target.value })}
                          />
                        </div>
                      </div>
                      {/* Group fields - only show if league has groups */}
                      {league?.has_groups && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label>{league.group_label_1 || 'Conference'}</Label>
                            <Select
                              value={teamForm.group_1}
                              onValueChange={(value) => setTeamForm({ ...teamForm, group_1: value === 'none' ? '' : value, group_2: '' })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${league.group_label_1 || 'Conference'}...`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {groupOptions.group1.map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>{league.group_label_2 || 'Division'}</Label>
                            <Select
                              value={teamForm.group_2}
                              onValueChange={(value) => setTeamForm({ ...teamForm, group_2: value === 'none' ? '' : value })}
                              disabled={!teamForm.group_1}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={teamForm.group_1 ? `Select ${league.group_label_2 || 'Division'}...` : `Select ${league.group_label_1 || 'Conference'} first`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {(groupOptions.group2[teamForm.group_1] || []).map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="color">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={teamForm.color}
                            onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                            className="h-10 w-16 p-1"
                          />
                          <Input
                            value={teamForm.color}
                            onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                            placeholder="#3B82F6"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="color2">Secondary Color <span className="text-red-500">*</span></Label>
                          <div className="flex gap-2">
                            <Input
                              id="color2"
                              type="color"
                              value={teamForm.color2 || '#FFFFFF'}
                              onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                              className="h-10 w-12 p-1"
                              required
                            />
                            <Input
                              value={teamForm.color2}
                              onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                              placeholder="#FFFFFF"
                              className="flex-1"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="color3">Tertiary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="color3"
                              type="color"
                              value={teamForm.color3 || '#000000'}
                              onChange={(e) => setTeamForm({ ...teamForm, color3: e.target.value })}
                              className="h-10 w-12 p-1"
                            />
                            <Input
                              value={teamForm.color3}
                              onChange={(e) => setTeamForm({ ...teamForm, color3: e.target.value })}
                              placeholder="Optional"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Team</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {league.teams?.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No teams yet</h3>
                  <p className="text-slate-500 mt-1">Add your first team to get started.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {league.teams?.map((team) => (
                    <div
                      key={team.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <img 
                              src={team.logo_url} 
                              alt={team.name}
                              className="h-10 w-auto max-w-16 object-contain"
                            />
                          ) : (
                            <span
                              className="text-sm font-bold"
                              style={{ color: team.color }}
                            >
                              {team.abbreviation || team.name.substring(0, 3).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-medium">{team.name}</p>
                            {team.abbreviation && (
                              <p className="text-sm text-slate-500">{team.abbreviation}</p>
                            )}
                            {/* Team colors display */}
                            <div className="flex gap-1 mt-1">
                              <div className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: team.color }} title="Primary" />
                              {team.color2 && <div className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: team.color2 }} title="Secondary" />}
                              {team.color3 && <div className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: team.color3 }} title="Tertiary" />}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-slate-400 hover:text-green-600 h-8 w-8"
                          >
                            <Link to={`/leagues/${leagueId}/teams/${team.id}/schedule`}>
                              <Calendar className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openTeamEditDialog(team)}
                            className="text-slate-400 hover:text-blue-600 h-8 w-8"
                            disabled={league.is_finished}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-slate-400 hover:text-red-600 h-8 w-8"
                            disabled={league.is_finished}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Logo Upload Section */}
                      <div className="border-t pt-3">
                        {team.logo_url ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Logo uploaded</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 h-7 text-xs"
                              onClick={() => handleLogoDelete(team.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              id={`logo-upload-${team.id}`}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleLogoUpload(team.id, e.target.files[0])}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-7 text-xs"
                              onClick={() => document.getElementById(`logo-upload-${team.id}`).click()}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Upload Logo
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Edit Team Dialog */}
          <Dialog open={teamEditDialogOpen} onOpenChange={setTeamEditDialogOpen}>
            <DialogContent>
              <form onSubmit={handleEditTeam}>
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                  <DialogDescription>Update the team details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-team-name">Team Name (displayed)</Label>
                      <Input
                        id="edit-team-name"
                        placeholder="e.g., Chiefs"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-location">Location</Label>
                      <Input
                        id="edit-location"
                        placeholder="e.g., Kansas City"
                        value={teamForm.location}
                        onChange={(e) => setTeamForm({ ...teamForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-abbreviation">Abbreviation</Label>
                      <Input
                        id="edit-abbreviation"
                        placeholder="e.g., KC"
                        value={teamForm.abbreviation}
                        onChange={(e) => setTeamForm({ ...teamForm, abbreviation: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* Group fields - only show if league has groups */}
                  {league?.has_groups && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>{league.group_label_1 || 'Conference'}</Label>
                        <Select
                          value={teamForm.group_1}
                          onValueChange={(value) => setTeamForm({ ...teamForm, group_1: value === 'none' ? '' : value, group_2: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${league.group_label_1 || 'Conference'}...`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None --</SelectItem>
                            {groupOptions.group1.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{league.group_label_2 || 'Division'}</Label>
                        <Select
                          value={teamForm.group_2}
                          onValueChange={(value) => setTeamForm({ ...teamForm, group_2: value === 'none' ? '' : value })}
                          disabled={!teamForm.group_1}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={teamForm.group_1 ? `Select ${league.group_label_2 || 'Division'}...` : `Select ${league.group_label_1 || 'Conference'} first`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None --</SelectItem>
                            {(groupOptions.group2[teamForm.group_1] || []).map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit-color"
                        type="color"
                        value={teamForm.color}
                        onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={teamForm.color}
                        onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-color2">Secondary Color <span className="text-red-500">*</span></Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-color2"
                          type="color"
                          value={teamForm.color2 || '#FFFFFF'}
                          onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                          className="h-10 w-12 p-1"
                          required
                        />
                        <Input
                          value={teamForm.color2}
                          onChange={(e) => setTeamForm({ ...teamForm, color2: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-color3">Tertiary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="edit-color3"
                          type="color"
                          value={teamForm.color3 || '#000000'}
                          onChange={(e) => setTeamForm({ ...teamForm, color3: e.target.value })}
                          className="h-10 w-12 p-1"
                        />
                        <Input
                          value={teamForm.color3}
                          onChange={(e) => setTeamForm({ ...teamForm, color3: e.target.value })}
                          placeholder="Optional"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTeamEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Stats Edit Dialog - shown from Standings tab */}
        <Dialog open={statsEditDialogOpen} onOpenChange={setStatsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleEditStats}>
              <DialogHeader>
                <DialogTitle>Edit Team Stats</DialogTitle>
                <DialogDescription>
                  {editingStatsTeam && `Update stats for ${editingStatsTeam.name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="stats-wins">Wins</Label>
                    <Input
                      id="stats-wins"
                      type="number"
                      min="0"
                      value={statsForm.wins}
                      onChange={(e) => setStatsForm({ ...statsForm, wins: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stats-losses">Losses</Label>
                    <Input
                      id="stats-losses"
                      type="number"
                      min="0"
                      value={statsForm.losses}
                      onChange={(e) => setStatsForm({ ...statsForm, losses: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stats-ties">Ties</Label>
                    <Input
                      id="stats-ties"
                      type="number"
                      min="0"
                      value={statsForm.ties}
                      onChange={(e) => setStatsForm({ ...statsForm, ties: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="stats-pf">Points For</Label>
                    <Input
                      id="stats-pf"
                      type="number"
                      min="0"
                      value={statsForm.points_for}
                      onChange={(e) => setStatsForm({ ...statsForm, points_for: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stats-pa">Points Against</Label>
                    <Input
                      id="stats-pa"
                      type="number"
                      min="0"
                      value={statsForm.points_against}
                      onChange={(e) => setStatsForm({ ...statsForm, points_against: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStatsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Stats</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Games Tab */}
        <TabsContent value="games">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Games</CardTitle>
                <CardDescription>Schedule and track games • All times in Eastern Time (ET)</CardDescription>
              </div>
              <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" disabled={league.teams?.length < 2 || league.is_finished}>
                    <Plus className="h-4 w-4" />
                    New Game
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddGame}>
                    <DialogHeader>
                      <DialogTitle>Create Game</DialogTitle>
                      <DialogDescription>Schedule a new game between two teams.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Home Team</Label>
                        <Select
                          value={gameForm.home_team_id || 'tbd'}
                          onValueChange={(value) => setGameForm({ ...gameForm, home_team_id: value === 'tbd' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select home team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tbd">TBD</SelectItem>
                            {league.teams?.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Away Team</Label>
                        <Select
                          value={gameForm.away_team_id || 'tbd'}
                          onValueChange={(value) => setGameForm({ ...gameForm, away_team_id: value === 'tbd' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select away team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tbd">TBD</SelectItem>
                            {league.teams?.filter(t => t.id !== gameForm.home_team_id).map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Scheduled Date</Label>
                        <Input
                          type="date"
                          value={gameForm.scheduled_date}
                          onChange={(e) => setGameForm({ ...gameForm, scheduled_date: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Leave empty for TBD</p>
                      </div>
                      {gameForm.scheduled_date && (
                        <div className="grid gap-2">
                          <Label>Scheduled Time</Label>
                          <Input
                            type="time"
                            value={gameForm.scheduled_time}
                            onChange={(e) => setGameForm({ ...gameForm, scheduled_time: e.target.value })}
                          />
                          <p className="text-xs text-slate-500">Leave empty for TBD</p>
                        </div>
                      )}
                      {(league.game_unit_label || league.game_unit_label_2 || league.game_unit_label_3) && (
                        <div className="grid gap-2">
                          <Label>Time Unit</Label>
                          <div className="flex gap-2">
                            <Select
                              value={gameForm.game_unit_type}
                              onValueChange={(val) => setGameForm({ ...gameForm, game_unit_type: val })}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {league.game_unit_label && (
                                  <SelectItem value="1">{league.game_unit_label}</SelectItem>
                                )}
                                {league.game_unit_label_2 && (
                                  <SelectItem value="2">{league.game_unit_label_2}</SelectItem>
                                )}
                                {league.game_unit_label_3 && (
                                  <SelectItem value="3">{league.game_unit_label_3}</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Number"
                              className="w-24"
                              value={gameForm.game_unit}
                              onChange={(e) => setGameForm({ ...gameForm, game_unit: e.target.value })}
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                            e.g., {league.game_unit_label || 'Week'} 1, {league.game_unit_label_2 || 'Playoff'} 1
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        Create Game
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Games Filter Tabs */}
              <div className="flex gap-2 mb-4 border-b pb-2">
                <button
                  onClick={() => setGamesFilter('scheduled')}
                  className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                    gamesFilter === 'scheduled'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Scheduled ({seasonGames.filter(g => g.status === 'scheduled').length})
                </button>
                <button
                  onClick={() => setGamesFilter('current')}
                  className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                    gamesFilter === 'current'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Live ({seasonGames.filter(g => g.status === 'live').length})
                </button>
                <button
                  onClick={() => setGamesFilter('completed')}
                  className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                    gamesFilter === 'completed'
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Completed ({seasonGames.filter(g => g.status === 'final' || g.quarter === 'Final').length})
                </button>
                {seasons.length > 0 && (
                  <div className="ml-auto">
                    <Select value={effectiveGamesSeasonId} onValueChange={setGamesSeasonId}>
                      <SelectTrigger className="h-9 w-60">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map(season => (
                          <SelectItem key={season.id} value={season.id}>
                            {season.name}{season.is_current ? ' (current)' : ''}
                          </SelectItem>
                        ))}
                        <SelectItem value="all">All seasons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Current Week Indicator */}
              {(() => {
                // Determine current week from live games or next scheduled game
                const hasUnitLabel = league.game_unit_label || league.game_unit_label_2 || league.game_unit_label_3
                if (!hasUnitLabel) return null
                
                const liveGames = seasonGames.filter(g => g.status === 'live')
                const scheduledGames = seasonGames.filter(g => g.status === 'scheduled').sort((a, b) => {
                  if (!a.scheduled_at) return 1
                  if (!b.scheduled_at) return -1
                  return new Date(a.scheduled_at) - new Date(b.scheduled_at)
                })
                
                // Current week is from live games, or the next scheduled game
                let currentWeek = null
                let currentWeekType = 1
                
                if (liveGames.length > 0 && liveGames[0].game_unit != null) {
                  currentWeek = liveGames[0].game_unit
                  currentWeekType = liveGames[0].game_unit_type || 1
                } else if (scheduledGames.length > 0 && scheduledGames[0].game_unit != null) {
                  currentWeek = scheduledGames[0].game_unit
                  currentWeekType = scheduledGames[0].game_unit_type || 1
                }
                
                if (currentWeek == null) return null
                
                const unitLabel = currentWeekType === 2 && league.game_unit_label_2 
                  ? league.game_unit_label_2 
                  : currentWeekType === 3 && league.game_unit_label_3 
                    ? league.game_unit_label_3 
                    : league.game_unit_label || 'Week'
                
                return (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">📅</span>
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        Current: {unitLabel} {currentWeek}
                      </span>
                      {liveGames.length > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}

              {(() => {
                const filteredGames = seasonGames.filter(game => {
                  if (gamesFilter === 'scheduled') return game.status === 'scheduled'
                  if (gamesFilter === 'current') return game.status === 'live'
                  if (gamesFilter === 'completed') return game.status === 'final' || game.quarter === 'Final'
                  return true
                })

                // Sort games chronologically: by week (game_unit), then by date/time
                // First games come first (ascending order)
                const isCompleted = gamesFilter === 'completed'
                const sortedGames = [...filteredGames].sort((a, b) => {
                  // First sort by game_unit_type (nulls last)
                  const typeA = a.game_unit_type || 1
                  const typeB = b.game_unit_type || 1
                  if (typeA !== typeB) return typeA - typeB
                  
                  // Then by game_unit/week (nulls last)
                  if (a.game_unit !== b.game_unit) {
                    if (a.game_unit === null) return 1
                    if (b.game_unit === null) return -1
                    return a.game_unit - b.game_unit  // Week 1 before Week 2, etc.
                  }
                  
                  // Then by scheduled_at (date and time)
                  if (a.scheduled_at !== b.scheduled_at) {
                    if (!a.scheduled_at) return 1
                    if (!b.scheduled_at) return -1
                    return new Date(a.scheduled_at) - new Date(b.scheduled_at)  // Earlier first
                  }
                  return 0
                })

                // Helper to get unit label based on type
                const getUnitLabel = (type) => {
                  if (type === 2 && league.game_unit_label_2) return league.game_unit_label_2
                  if (type === 3 && league.game_unit_label_3) return league.game_unit_label_3
                  return league.game_unit_label || 'Week'
                }

                // Group games by game_unit_type and game_unit if league has any unit labels
                const hasAnyUnitLabel = league.game_unit_label || league.game_unit_label_2 || league.game_unit_label_3
                const groupedGames = hasAnyUnitLabel
                  ? sortedGames.reduce((acc, game) => {
                      const unitType = game.game_unit_type || 1
                      const unitNum = game.game_unit
                      const key = unitNum != null ? `${unitType}-${unitNum}` : 'Unassigned'
                      if (!acc[key]) acc[key] = { type: unitType, num: unitNum, games: [] }
                      acc[key].games.push(game)
                      return acc
                    }, {})
                  : null

                if (seasonGames.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No games yet</h3>
                      <p className="text-slate-500 mt-1">
                        {league.teams?.length < 2 
                          ? 'Add at least 2 teams to create games.' 
                          : 'Schedule your first game to get started.'}
                      </p>
                    </div>
                  )
                }

                if (filteredGames.length === 0) {
                  return (
                    <p className="text-center text-slate-500 py-8">
                      No {gamesFilter === 'current' ? 'live' : gamesFilter} games.
                    </p>
                  )
                }

                // Render function for a single game
                const renderGame = (game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {game.away_team?.logo_url ? (
                            <img src={game.away_team.logo_url} alt="" className="h-5 w-5 object-contain" />
                          ) : (
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: game.away_team?.color || '#888' }}
                            />
                          )}
                          <span className="font-medium">{game.away_team?.name || 'TBD'}</span>
                        </div>
                        <span className="text-slate-400">@</span>
                        <div className="flex items-center gap-2">
                          {game.home_team?.logo_url ? (
                            <img src={game.home_team.logo_url} alt="" className="h-5 w-5 object-contain" />
                          ) : (
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: game.home_team?.color || '#888' }}
                            />
                          )}
                          <span className="font-medium">{game.home_team?.name || 'TBD'}</span>
                        </div>
                      </div>
                      {game.scheduled_at && (
                        <span className="text-xs text-slate-500">
                          📅 {new Date(game.scheduled_at + 'Z').toLocaleDateString('en-US', { timeZone: 'UTC' })}{game.time_tbd ? ' • Time TBD' : ` at ${new Date(game.scheduled_at + 'Z').toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {game.status === 'final' || game.quarter === 'Final' ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">FINAL</span>
                          <span className="text-lg font-bold">
                            {game.away_score} - {game.home_score}
                          </span>
                          {game.away_score !== game.home_score && (
                            <span className="text-xs font-semibold text-green-600">
                              🏆 {game.away_score > game.home_score ? game.away_team?.name : game.home_team?.name}
                            </span>
                          )}
                          {game.away_score === game.home_score && (
                            <span className="text-xs font-semibold text-slate-500">TIE</span>
                          )}
                        </div>
                      ) : game.status === 'live' ? (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">LIVE</span>
                          <span className="text-lg font-bold">
                            {game.away_score} - {game.home_score}
                          </span>
                          {game.quarter && game.quarter !== 'Pregame' && (
                            <span className="text-xs text-slate-500">{game.quarter}</span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-600">SCHEDULED</span>
                      )}
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link to={`/games/${game.id}`}>
                            <Play className="h-3 w-3" />
                            {game.status === 'scheduled' ? 'Start' : 'View'}
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openShareDialog('game', game.share_code, `${game.home_team?.name || 'Home'} vs ${game.away_team?.name || 'Away'}`)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditGame(game)}
                          disabled={league.is_finished}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteGame(game.id)}
                          disabled={league.is_finished}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )

                // Render grouped or flat list
                if (groupedGames) {
                  const units = Object.keys(groupedGames).sort((a, b) => {
                    if (a === 'Unassigned') return 1
                    if (b === 'Unassigned') return -1
                    const [typeA, numA] = a.split('-').map(Number)
                    const [typeB, numB] = b.split('-').map(Number)
                    // Sort by type first, then by number
                    if (typeA !== typeB) return typeA - typeB
                    return isCompleted ? numB - numA : numA - numB
                  })
                  return (
                    <div className="space-y-6">
                      {units.map(key => {
                        const group = groupedGames[key]
                        const label = key === 'Unassigned' 
                          ? 'Unassigned' 
                          : `${getUnitLabel(group.type)} ${group.num}`
                        // Sort games within each group by date/time
                        const sortedGroupGames = [...group.games].sort((a, b) => {
                          if (!a.scheduled_at && !b.scheduled_at) return 0
                          if (!a.scheduled_at) return 1
                          if (!b.scheduled_at) return -1
                          return new Date(a.scheduled_at) - new Date(b.scheduled_at)
                        })
                        return (
                          <div key={key}>
                            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 border-b pb-1">
                              {label}
                            </h3>
                            <div className="space-y-3">
                              {sortedGroupGames.map(renderGame)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    {sortedGames.map(renderGame)}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brackets Tab */}
        <TabsContent value="brackets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Playoff Brackets</CardTitle>
                <CardDescription>Tournament brackets for playoffs</CardDescription>
              </div>
              <Dialog open={bracketDialogOpen} onOpenChange={setBracketDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" disabled={league.teams?.length < 2 || league.is_finished}>
                    <Plus className="h-4 w-4" />
                    New Bracket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleCreateBracket}>
                    <DialogHeader>
                      <DialogTitle>Create Bracket</DialogTitle>
                      <DialogDescription>Set up a playoff bracket with manual seeding.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bracket-name">Bracket Name</Label>
                        <Input
                          id="bracket-name"
                          placeholder="e.g., 2024 Playoffs"
                          value={bracketForm.name}
                          onChange={(e) => setBracketForm({ ...bracketForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Number of Teams</Label>
                          <Input
                            type="number"
                            min="2"
                            step="2"
                            value={bracketForm.num_teams}
                            onChange={(e) => handleNumTeamsChange(e.target.value)}
                            placeholder="Even number"
                          />
                          {bracketForm.num_teams > 0 && bracketForm.num_teams % 2 !== 0 && (
                            <p className="text-sm text-red-500">Must be even</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label>Layout</Label>
                          <Select
                            value={bracketForm.layout}
                            onValueChange={(value) => setBracketForm({ ...bracketForm, layout: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="one_sided">One-Sided</SelectItem>
                              <SelectItem value="two_sided">Two-Sided</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is-playoff"
                          checked={bracketForm.is_playoff}
                          onChange={(e) => setBracketForm({ ...bracketForm, is_playoff: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="is-playoff" className="cursor-pointer">
                          Playoff Bracket (includes Playoff Picture tab)
                        </Label>
                      </div>
                      {bracketSlots.length > bracketForm.num_teams && (
                        <p className="text-sm text-amber-600">
                          Bracket size: {bracketSlots.length} slots (use BYE for empty spots)
                        </p>
                      )}
                      
                      {bracketSlots.length > 0 && (
                        <div className="grid gap-2">
                          <Label>Seed Teams (drag byes to give top seeds a first-round bye)</Label>
                          <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                            {bracketSlots.map((slot, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="w-8 text-sm font-medium text-slate-500">#{index + 1}</span>
                                <Select
                                  value={slot}
                                  onValueChange={(value) => updateBracketSlot(index, value)}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select team, TBD, or BYE" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TBD">
                                      <span className="text-slate-500">TBD</span>
                                    </SelectItem>
                                    <SelectItem value="BYE">
                                      <span className="text-slate-400 italic">— BYE —</span>
                                    </SelectItem>
                                    {league.teams?.map((team) => (
                                      <SelectItem 
                                        key={team.id} 
                                        value={team.id}
                                        disabled={bracketSlots.includes(team.id) && bracketSlots[index] !== team.id}
                                      >
                                        {team.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">
                            Matchups: #1 vs #{bracketSlots.length}, #2 vs #{bracketSlots.length - 1}, etc.
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={
                          !bracketForm.name || 
                          bracketForm.num_teams < 2 || 
                          bracketForm.num_teams % 2 !== 0 ||
                          bracketSlots.filter(s => s && s !== 'BYE').length < 2
                        }
                      >
                        Create Bracket
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {brackets.length === 0 ? (
                <div className="text-center py-12">
                  <GitBranch className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No brackets yet</h3>
                  <p className="text-slate-500 mt-1">
                    {league.teams?.length < 2 
                      ? 'Add at least 2 teams to create brackets.' 
                      : 'Create a playoff bracket to get started.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {brackets.map((bracket) => (
                    <Link key={bracket.id} to={`/brackets/${bracket.id}`}>
                      <Card className="transition-all hover:shadow-md">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{bracket.name}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={(e) => {
                              e.preventDefault()
                              openShareDialog('bracket', bracket.share_code, bracket.name)
                            }}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardDescription>
                            {bracket.num_teams} teams - {bracket.bracket_type.replace('_', ' ')}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          {/* Settings Sub-tabs */}
          <div className="flex gap-2 mb-6 border-b pb-2">
            <button
              onClick={() => setSettingsTab('general')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                settingsTab === 'general'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setSettingsTab('gameDefaults')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                settingsTab === 'gameDefaults'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Game Defaults
            </button>
            <button
              onClick={() => setSettingsTab('mechanics')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                settingsTab === 'mechanics'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Mechanics
            </button>
          </div>

          {settingsTab === 'general' && (
          <>
          {/* League Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>League Information</CardTitle>
              <CardDescription>Basic league details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="league-name">League Name</Label>
                  <Input
                    id="league-name"
                    key={`name-${league.name}`}
                    defaultValue={league.name}
                    onBlur={async (e) => {
                      if (e.target.value && e.target.value !== league.name) {
                        try {
                          await leagueApi.update(leagueId, { name: e.target.value })
                          loadData()
                        } catch (error) {
                          console.error('Failed to update league:', error)
                        }
                      }
                    }}
                    disabled={league.is_finished}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="league-season">Season</Label>
                  <Input
                    id="league-season"
                    key={`season-${league.season}`}
                    defaultValue={league.season}
                    onBlur={async (e) => {
                      if (e.target.value && e.target.value !== league.season) {
                        try {
                          await leagueApi.update(leagueId, { season: e.target.value })
                          loadData()
                        } catch (error) {
                          console.error('Failed to update league:', error)
                        }
                      }
                    }}
                    disabled={league.is_finished}
                  />
                </div>
              </div>

              {/* Share Code */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Share Code</p>
                  <p className="text-2xl font-bold tracking-wider text-primary">{league.share_code}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/share/league/${league.share_code}`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>

              {/* League Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{league.teams?.length || 0}</p>
                  <p className="text-sm text-blue-600/70">Teams</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{games.length}</p>
                  <p className="text-sm text-green-600/70">Games</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{brackets.length}</p>
                  <p className="text-sm text-purple-600/70">Brackets</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {games.filter(g => g.status === 'final' || g.quarter === 'Final').length}
                  </p>
                  <p className="text-sm text-amber-600/70">Completed</p>
                </div>
              </div>

              {/* Created Date */}
              <div className="text-sm text-slate-500">
                Created: {new Date(league.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </CardContent>
          </Card>

          {/* Season State Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Season State</CardTitle>
              <CardDescription>Track the current phase of your season</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Season Phase */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Current Phase</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(() => {
                    const currentPhase = currentSeason?.phase || 'regular'
                    const phases = [
                      { id: 'preseason', label: 'Preseason', icon: '🏋️', selectedClass: 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-700 dark:text-blue-300' },
                      { id: 'regular', label: 'Regular Season', icon: '🏈', selectedClass: 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-700 dark:text-green-300' },
                      { id: 'playoffs', label: 'Playoffs', icon: '🏆', selectedClass: 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 text-amber-700 dark:text-amber-300' },
                      { id: 'offseason', label: 'Offseason', icon: '🌴', selectedClass: 'bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-700 dark:text-slate-300' },
                    ]
                    return phases.map(phase => (
                      <Button
                        key={phase.id}
                        variant="outline"
                        className={`h-auto py-3 flex-col gap-1 ${currentPhase === phase.id ? phase.selectedClass + ' border-2' : ''}`}
                        onClick={async () => {
                          if (!currentSeason) {
                            alert('No active season. Please create a season first.')
                            return
                          }
                          try {
                            await seasonApi.update(currentSeason.id, { phase: phase.id })
                            loadData()
                          } catch (error) {
                            console.error('Failed to update season phase:', error)
                          }
                        }}
                        disabled={league.is_finished || !currentSeason}
                      >
                        <span className="text-xl">{phase.icon}</span>
                        <span className="text-xs font-medium">{phase.label}</span>
                      </Button>
                    ))
                  })()}
                </div>
              </div>


              {/* Phase Record Tracking Settings */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Track Records By Phase</Label>
                  <p className="text-xs text-slate-500">Choose which phases count towards team records</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(() => {
                    const defaults = league.game_defaults ? (typeof league.game_defaults === 'string' ? JSON.parse(league.game_defaults) : league.game_defaults) : {}
                    const phaseRecords = defaults.phase_records || { preseason: false, regular: true, playoffs: true, offseason: false }
                    const phases = [
                      { id: 'preseason', label: 'Preseason', defaultOn: false },
                      { id: 'regular', label: 'Regular', defaultOn: true },
                      { id: 'playoffs', label: 'Playoffs', defaultOn: true },
                      { id: 'offseason', label: 'Offseason', defaultOn: false },
                    ]
                    return phases.map(phase => {
                      const isOn = phaseRecords[phase.id] ?? phase.defaultOn
                      return (
                        <Button
                          key={phase.id}
                          variant="outline"
                          size="sm"
                          className={`justify-between ${isOn ? 'bg-green-50 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-300' : 'opacity-60'}`}
                          onClick={async () => {
                            const newPhaseRecords = { ...phaseRecords, [phase.id]: !isOn }
                            const newDefaults = { ...defaults, phase_records: newPhaseRecords }
                            try {
                              await leagueApi.update(leagueId, { game_defaults: newDefaults })
                              setLeague(prev => ({ ...prev, game_defaults: newDefaults }))
                            } catch (error) {
                              console.error('Failed to update phase records:', error)
                            }
                          }}
                          disabled={league.is_finished}
                        >
                          <span>{phase.label}</span>
                          <span>{isOn ? '✓' : '✗'}</span>
                        </Button>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Season Status Display */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const phase = currentSeason?.phase || 'regular'
                      const phaseInfo = {
                        preseason: { icon: '🏋️', label: 'Preseason' },
                        regular: { icon: '🏈', label: 'Regular Season' },
                        playoffs: { icon: '🏆', label: 'Playoffs' },
                        offseason: { icon: '🌴', label: 'Offseason' },
                      }[phase] || { icon: '🏈', label: 'Regular Season' }
                      
                      return (
                        <>
                          <span className="text-2xl">{phaseInfo.icon}</span>
                          <div>
                            <p className="font-medium">{currentSeason?.name || 'No Season'} - {phaseInfo.label}</p>
                            <p className="text-xs text-slate-500">Current season state</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${league.is_finished ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'}`}>
                      {league.is_finished ? 'Finished' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Organization Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Game Organization</CardTitle>
              <CardDescription>Group and sort games by a unit like Week, Round, or Game Day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-game-units"
                  checked={gameUnitEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setGameUnitEnabled(checked)
                    const label = checked ? (gameUnitLabel || 'Week') : null
                    if (checked) setGameUnitLabel(label)
                    leagueApi.update(leagueId, { game_unit_label: label })
                      .then(() => setLeague(prev => ({ ...prev, game_unit_label: label })))
                      .catch(err => {
                        console.error('Failed to update:', err)
                        setGameUnitEnabled(!checked)
                      })
                  }}
                  disabled={league.is_finished}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="enable-game-units" className="font-medium">
                  Organize games by unit
                </Label>
              </div>
              
              {gameUnitEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="game-unit-label">Primary Unit</Label>
                      <Input
                        id="game-unit-label"
                        placeholder="e.g., Week"
                        value={gameUnitLabel}
                        onChange={(e) => setGameUnitLabel(e.target.value)}
                        onBlur={async () => {
                          const newValue = gameUnitLabel.trim() || 'Week'
                          setGameUnitLabel(newValue)
                          try {
                            await leagueApi.update(leagueId, { game_unit_label: newValue })
                            setLeague(prev => ({ ...prev, game_unit_label: newValue }))
                          } catch (error) {
                            console.error('Failed to update league:', error)
                          }
                        }}
                        disabled={league.is_finished}
                      />
                      <p className="text-xs text-slate-500">Main unit (e.g., Week)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="game-unit-label-2">Secondary Unit</Label>
                      <Input
                        id="game-unit-label-2"
                        placeholder="e.g., Playoff Week"
                        defaultValue={league.game_unit_label_2 || ''}
                        onBlur={async (e) => {
                          const newValue = e.target.value.trim() || null
                          try {
                            await leagueApi.update(leagueId, { game_unit_label_2: newValue })
                            setLeague(prev => ({ ...prev, game_unit_label_2: newValue }))
                          } catch (error) {
                            console.error('Failed to update league:', error)
                          }
                        }}
                        disabled={league.is_finished}
                      />
                      <p className="text-xs text-slate-500">Optional (e.g., Playoff)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="game-unit-label-3">Extra Unit</Label>
                      <Input
                        id="game-unit-label-3"
                        placeholder="e.g., Preseason"
                        defaultValue={league.game_unit_label_3 || ''}
                        onBlur={async (e) => {
                          const newValue = e.target.value.trim() || null
                          try {
                            await leagueApi.update(leagueId, { game_unit_label_3: newValue })
                            setLeague(prev => ({ ...prev, game_unit_label_3: newValue }))
                          } catch (error) {
                            console.error('Failed to update league:', error)
                          }
                        }}
                        disabled={league.is_finished}
                      />
                      <p className="text-xs text-slate-500">Optional (e.g., Preseason)</p>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ Select a unit type and number when creating or editing games.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common league management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">Reset All Standings</h4>
                  <p className="text-sm text-slate-500">Set all team records to 0-0-0</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={league.is_finished}
                    onClick={async () => {
                      if (confirm('Reset all team standings to 0-0-0? This cannot be undone.')) {
                        try {
                          for (const team of league.teams || []) {
                            await teamApi.update(team.id, { wins: 0, losses: 0, ties: 0 })
                          }
                          loadData()
                        } catch (error) {
                          console.error('Failed to reset standings:', error)
                        }
                      }
                    }}
                  >
                    Reset Standings
                  </Button>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">Clear All Games</h4>
                  <p className="text-sm text-slate-500">Delete all games from this league</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    disabled={league.is_finished}
                    onClick={async () => {
                      if (confirm(`Delete all ${games.length} games? This cannot be undone.`)) {
                        try {
                          for (const game of games) {
                            await gameApi.delete(game.id)
                          }
                          loadData()
                        } catch (error) {
                          console.error('Failed to delete games:', error)
                        }
                      }
                    }}
                  >
                    Clear Games
                  </Button>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">Export League Data</h4>
                  <p className="text-sm text-slate-500">Download standings and results as JSON</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const data = {
                        league: {
                          name: league.name,
                          season: league.season,
                        },
                        teams: standings.map(t => ({
                          name: t.name,
                          wins: t.wins,
                          losses: t.losses,
                          ties: t.ties,
                          conference: t.group_1,
                          division: t.group_2,
                        })),
                        games: games.map(g => ({
                          home: g.home_team?.name,
                          away: g.away_team?.name,
                          homeScore: g.home_score,
                          awayScore: g.away_score,
                          status: g.status,
                          date: g.scheduled_at,
                        })),
                      }
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${league.name.replace(/\s+/g, '_')}_export.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Export JSON
                  </Button>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h4 className="font-medium">Duplicate League</h4>
                  <p className="text-sm text-slate-500">Create a copy with same teams, no games</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const newName = prompt('Enter name for the new league:', `${league.name} (Copy)`)
                      if (newName) {
                        try {
                          const newLeague = await leagueApi.create({
                            name: newName,
                            season: league.season,
                            has_groups: league.has_groups,
                            group_label_1: league.group_label_1,
                            group_label_2: league.group_label_2,
                            groups: league.groups,
                          })
                          // Copy teams
                          for (const team of league.teams || []) {
                            await teamApi.create({
                              league_id: newLeague.id,
                              name: team.name,
                              location: team.location,
                              abbreviation: team.abbreviation,
                              color: team.color,
                              color2: team.color2,
                              color3: team.color3,
                              group_1: team.group_1,
                              group_2: team.group_2,
                            })
                          }
                          alert(`League "${newName}" created! Redirecting...`)
                          navigate(`/leagues/${newLeague.id}`)
                        } catch (error) {
                          console.error('Failed to duplicate league:', error)
                          alert('Failed to duplicate league: ' + error.message)
                        }
                      }
                    }}
                  >
                    Duplicate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Season Management Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Season Management</CardTitle>
              <CardDescription>Manage seasons for this league</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Season */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Current Season</h4>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {currentSeason?.name || 'No active season'}
                    </p>
                  </div>
                  {currentSeason && !currentSeason.is_finished && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 hover:text-amber-700"
                      onClick={async () => {
                        if (confirm(`End the current season "${currentSeason.name}"? This will archive the current standings and games.`)) {
                          try {
                            await seasonApi.end(currentSeason.id)
                            loadData()
                          } catch (error) {
                            console.error('Failed to end season:', error)
                          }
                        }
                      }}
                    >
                      End Season
                    </Button>
                  )}
                </div>
                {/* Season Phase Selector */}
                {currentSeason && !currentSeason.is_finished && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <Label className="text-sm text-slate-600">Phase:</Label>
                    <Select
                      value={currentSeason.phase || 'regular'}
                      onValueChange={async (value) => {
                        try {
                          await seasonApi.update(currentSeason.id, { phase: value })
                          loadData()
                        } catch (error) {
                          console.error('Failed to update phase:', error)
                        }
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preseason">Preseason</SelectItem>
                        <SelectItem value="regular">Regular Season</SelectItem>
                        <SelectItem value="playoffs">Playoffs</SelectItem>
                        <SelectItem value="offseason">Offseason</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* New Season */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">Start New Season</h4>
                <p className="text-sm text-slate-500">Create a new season. Teams will keep their roster but stats will reset.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 2026-27, Spring 2026"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      if (!newSeasonName.trim()) {
                        alert('Please enter a season name')
                        return
                      }
                      if (currentSeason && !currentSeason.is_finished) {
                        if (!confirm(`This will end the current season "${currentSeason.name}" and start a new one. Continue?`)) {
                          return
                        }
                        await seasonApi.end(currentSeason.id)
                      }
                      try {
                        await seasonApi.create({ league_id: leagueId, name: newSeasonName.trim() })
                        setNewSeasonName('')
                        loadData()
                      } catch (error) {
                        console.error('Failed to create season:', error)
                        alert('Failed to create season: ' + error.message)
                      }
                    }}
                  >
                    Create Season
                  </Button>
                </div>
              </div>

              {/* Past Seasons */}
              {seasons.filter(s => s.is_finished).length > 0 && (
                <div className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Past Seasons</h4>
                  <div className="space-y-2">
                    {seasons.filter(s => s.is_finished).map(season => (
                      <div key={season.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{season.name}</span>
                          <span className="text-xs text-slate-500">Ended</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStandingsSeasonId(season.id)
                              setStandingsSubTab('table')
                              setActiveTab('standings')
                            }}
                          >
                            View Standings
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const newName = prompt('Rename season', season.name)
                              if (!newName || newName === season.name) return
                              try {
                                await seasonApi.update(season.id, { name: newName.trim() })
                                await loadData()
                              } catch (e) {
                                console.error('Failed to rename season:', e)
                                alert('Failed to rename: ' + e.message)
                              }
                            }}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (currentSeason && !currentSeason.is_finished) {
                                if (!confirm(`Reopen "${season.name}"? This will end the current season "${currentSeason.name}" and make "${season.name}" the current season again.`)) return
                                try {
                                  await seasonApi.end(currentSeason.id)
                                } catch (e) {
                                  console.error('Failed to end current season:', e)
                                  alert('Failed to end current season: ' + e.message)
                                  return
                                }
                              } else if (!confirm(`Reopen "${season.name}" and make it the current season?`)) {
                                return
                              }
                              try {
                                await seasonApi.update(season.id, { is_finished: false, is_current: true })
                                await loadData()
                              } catch (e) {
                                console.error('Failed to reopen season:', e)
                                alert('Failed to reopen: ' + e.message)
                              }
                            }}
                          >
                            Reopen
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group Structure</CardTitle>
              <CardDescription>Configure conferences and divisions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group Structure */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="has-groups"
                    checked={league.has_groups || false}
                    onChange={async (e) => {
                      try {
                        await leagueApi.update(leagueId, { has_groups: e.target.checked })
                        loadData()
                      } catch (error) {
                        console.error('Failed to update league:', error)
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="has-groups" className="cursor-pointer font-medium">
                    Enable Group Structure (Conferences/Divisions)
                  </Label>
                </div>

                {league.has_groups && (
                  <div className="ml-7 space-y-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Define your group structure. Set the type (e.g., "Conference") and then assign teams to specific names (e.g., "AFC").
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-label-1">Level 1 Type</Label>
                        <Input
                          id="group-label-1"
                          placeholder="e.g., Conference, Section"
                          defaultValue={league.group_label_1 || 'Conference'}
                          onBlur={async (e) => {
                            if (e.target.value !== league.group_label_1) {
                              try {
                                await leagueApi.update(leagueId, { group_label_1: e.target.value })
                                loadData()
                              } catch (error) {
                                console.error('Failed to update league:', error)
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-slate-500">The category type (Conference, Section, etc.)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-label-2">Level 2 Type</Label>
                        <Input
                          id="group-label-2"
                          placeholder="e.g., Division, Section"
                          defaultValue={league.group_label_2 || 'Division'}
                          onBlur={async (e) => {
                            if (e.target.value !== league.group_label_2) {
                              try {
                                await leagueApi.update(leagueId, { group_label_2: e.target.value })
                                loadData()
                              } catch (error) {
                                console.error('Failed to update league:', error)
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-slate-500">The sub-category type (Division, Group, etc.)</p>
                      </div>
                    </div>
                    
                    {/* Fixed 2 Conferences */}
                    <div className="space-y-3">
                      <Label>{league.group_label_1 || 'Conference'} Names</Label>
                      <p className="text-sm text-slate-500">Define the names for your two {(league.group_label_1 || 'Conference').toLowerCase()}s</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">{league.group_label_1 || 'Conference'} 1</Label>
                          <Input
                            placeholder={`e.g., AFC`}
                            defaultValue={groupOptions.group1[0] || ''}
                            onBlur={async (e) => {
                              const newName = e.target.value.trim()
                              const oldName = groupOptions.group1[0]
                              if (newName && newName !== oldName) {
                                // Update conference name
                                const newGroup1 = [newName, groupOptions.group1[1] || ''].filter(Boolean)
                                const newGroup2 = { ...groupOptions.group2 }
                                if (oldName && newGroup2[oldName]) {
                                  newGroup2[newName] = newGroup2[oldName]
                                  delete newGroup2[oldName]
                                }
                                const newGroups = { group1: newGroup1, group2: newGroup2 }
                                try {
                                  await leagueApi.update(leagueId, { groups: JSON.stringify(newGroups) })
                                  loadData()
                                } catch (error) {
                                  console.error('Failed to update groups:', error)
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{league.group_label_1 || 'Conference'} 2</Label>
                          <Input
                            placeholder={`e.g., NFC`}
                            defaultValue={groupOptions.group1[1] || ''}
                            onBlur={async (e) => {
                              const newName = e.target.value.trim()
                              const oldName = groupOptions.group1[1]
                              if (newName && newName !== oldName) {
                                // Update conference name
                                const newGroup1 = [groupOptions.group1[0] || '', newName].filter(Boolean)
                                const newGroup2 = { ...groupOptions.group2 }
                                if (oldName && newGroup2[oldName]) {
                                  newGroup2[newName] = newGroup2[oldName]
                                  delete newGroup2[oldName]
                                }
                                const newGroups = { group1: newGroup1, group2: newGroup2 }
                                try {
                                  await leagueApi.update(leagueId, { groups: JSON.stringify(newGroups) })
                                  loadData()
                                } catch (error) {
                                  console.error('Failed to update groups:', error)
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Each Conference with its Divisions */}
                      {groupOptions.group1.filter(Boolean).map(g1 => (
                        <div key={g1} className="border rounded-lg p-3 space-y-2">
                          <span className="font-medium text-primary">{g1}</span>
                          
                          {/* Division options for this Conference */}
                          <div className="ml-3 space-y-2">
                            <Label className="text-xs text-slate-500">{league.group_label_2 || 'Division'}s in {g1}</Label>
                            <div className="flex flex-wrap gap-2">
                              {(groupOptions.group2[g1] || []).map(g2 => (
                                <span key={g2} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">
                                  {g2}
                                  <button 
                                    onClick={() => removeGroupOption(2, g2, g1)}
                                    className="hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                              {(groupOptions.group2[g1] || []).length === 0 && (
                                <span className="text-xs text-slate-400 italic">None</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Add ${league.group_label_2 || 'Division'} to ${g1}...`}
                                className="flex-1 h-8 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addGroupOption(2, e.target.value, g1)
                                    e.target.value = ''
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show teams grouped */}
                    {league.teams?.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium">Teams by Group</Label>
                        <div className="mt-2 space-y-2">
                          {(() => {
                            // Group teams by group_1, then group_2
                            const grouped = {}
                            league.teams.forEach(team => {
                              const g1 = team.group_1 || 'Unassigned'
                              const g2 = team.group_2 || ''
                              if (!grouped[g1]) grouped[g1] = {}
                              if (!grouped[g1][g2]) grouped[g1][g2] = []
                              grouped[g1][g2].push(team)
                            })
                            
                            return Object.entries(grouped).map(([g1, divisions]) => (
                              <div key={g1} className="border rounded-lg p-3">
                                <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">
                                  {league.group_label_1 || 'Conference'}: {g1}
                                </h4>
                                <div className="grid gap-2 ml-3">
                                  {Object.entries(divisions).map(([g2, teams]) => (
                                    <div key={g2} className="text-sm">
                                      {g2 && (
                                        <span className="text-slate-500 mr-2">
                                          {league.group_label_2 || 'Division'}: {g2}
                                        </span>
                                      )}
                                      <span className="text-slate-600 dark:text-slate-400">
                                        {teams.map(t => t.name).join(', ')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Finish League Section */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">League Status</h3>
                {league?.is_finished ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                      <Trophy className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">League Completed</p>
                        <p className="text-sm text-green-600 dark:text-green-500">This league is finished and locked for editing.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        if (confirm('Are you sure you want to reopen this league for editing?')) {
                          await leagueApi.update(league.id, { is_finished: false })
                          loadData()
                        }
                      }}
                    >
                      🔓 Reopen League
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      When you finish a league, all editing will be locked. You can still view standings, games, and brackets.
                    </p>
                    <Button 
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        if (confirm('Are you sure you want to finish this league? This will lock all editing.')) {
                          await leagueApi.update(league.id, { is_finished: true })
                          loadData()
                        }
                      }}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Finish League
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800 mt-6">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* End League */}
              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">End this league</p>
                  <p className="text-sm text-slate-500">
                    Permanently lock this league. No more games or changes can be made.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                  disabled={league.is_finished}
                  onClick={async () => {
                    if (confirm('Are you sure you want to end this league? This will lock all editing permanently.')) {
                      try {
                        await leagueApi.update(leagueId, { is_finished: true })
                        loadData()
                      } catch (error) {
                        console.error('Failed to end league:', error)
                      }
                    }
                  }}
                >
                  {league.is_finished ? '🔒 League Ended' : 'End League'}
                </Button>
              </div>

              {/* Delete League */}
              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Delete this league</p>
                  <p className="text-sm text-slate-500">
                    Permanently delete this league and all its teams, games, and brackets. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const confirmText = prompt(
                      `This will permanently delete "${league.name}" and all associated data.\n\nType the league name to confirm:`
                    )
                    if (confirmText === league.name) {
                      try {
                        await leagueApi.delete(leagueId)
                        navigate('/leagues')
                      } catch (error) {
                        console.error('Failed to delete league:', error)
                        alert('Failed to delete league: ' + error.message)
                      }
                    } else if (confirmText !== null) {
                      alert('League name did not match. Deletion cancelled.')
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete League
                </Button>
              </div>
            </CardContent>
          </Card>
          </>
          )}

          {settingsTab === 'gameDefaults' && (
          <>
          {/* Game Defaults Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Game Defaults</CardTitle>
              <CardDescription>Default settings applied when creating new games in this league</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const defaults = league.game_defaults ? (typeof league.game_defaults === 'string' ? JSON.parse(league.game_defaults) : league.game_defaults) : {}
                
                const updateDefaults = async (key, value) => {
                  const newDefaults = { ...defaults, [key]: value }
                  try {
                    await leagueApi.update(leagueId, { game_defaults: newDefaults })
                    loadData()
                  } catch (error) {
                    console.error('Failed to update game defaults:', error)
                  }
                }
                
                return (
                  <>
                    {/* Time Settings */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Time Settings</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="num-quarters">Number of Quarters</Label>
                          <Input
                            id="num-quarters"
                            type="number"
                            min="1"
                            max="8"
                            value={defaults.num_quarters ?? 4}
                            onChange={(e) => updateDefaults('num_quarters', parseInt(e.target.value) || 4)}
                            disabled={league.is_finished}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quarter-length">Quarter Length (min)</Label>
                          <Input
                            id="quarter-length"
                            type="number"
                            min="1"
                            max="30"
                            value={defaults.quarter_length ?? 15}
                            onChange={(e) => updateDefaults('quarter_length', parseInt(e.target.value) || 15)}
                            disabled={league.is_finished}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="halftime-length">Halftime Length (min)</Label>
                          <Input
                            id="halftime-length"
                            type="number"
                            min="1"
                            max="30"
                            value={defaults.halftime_length ?? 12}
                            onChange={(e) => updateDefaults('halftime_length', parseInt(e.target.value) || 12)}
                            disabled={league.is_finished}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quarter-break">Quarter Break (sec)</Label>
                          <Input
                            id="quarter-break"
                            type="number"
                            min="0"
                            max="300"
                            value={defaults.quarter_break ?? 120}
                            onChange={(e) => updateDefaults('quarter_break', parseInt(e.target.value) || 120)}
                            disabled={league.is_finished}
                          />
                        </div>
                      </div>
                      
                      {/* Play Clock Settings */}
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Play Clock Settings</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="play-clock" className="text-xs">Standard Play Clock</Label>
                            <Input
                              id="play-clock"
                              type="number"
                              min="10"
                              max="60"
                              value={defaults.play_clock ?? 40}
                              onChange={(e) => updateDefaults('play_clock', parseInt(e.target.value) || 40)}
                              disabled={league.is_finished}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="play-clock-kickoff" className="text-xs">After Kickoff/Score</Label>
                            <Input
                              id="play-clock-kickoff"
                              type="number"
                              min="10"
                              max="60"
                              value={defaults.play_clock_kickoff ?? 25}
                              onChange={(e) => updateDefaults('play_clock_kickoff', parseInt(e.target.value) || 25)}
                              disabled={league.is_finished}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="play-clock-penalty" className="text-xs">After Penalty</Label>
                            <Input
                              id="play-clock-penalty"
                              type="number"
                              min="10"
                              max="60"
                              value={defaults.play_clock_penalty ?? 40}
                              onChange={(e) => updateDefaults('play_clock_penalty', parseInt(e.target.value) || 40)}
                              disabled={league.is_finished}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="play-clock-timeout" className="text-xs">After Timeout</Label>
                            <Input
                              id="play-clock-timeout"
                              type="number"
                              min="10"
                              max="60"
                              value={defaults.play_clock_timeout ?? 25}
                              onChange={(e) => updateDefaults('play_clock_timeout', parseInt(e.target.value) || 25)}
                              disabled={league.is_finished}
                            />
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <Label htmlFor="play-clock-delay" className="text-xs">Start Delay After Play (seconds)</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Delay before play clock starts counting down after a play ends</p>
                          <Input
                            id="play-clock-delay"
                            type="number"
                            min="0"
                            max="10"
                            value={defaults.play_clock_delay ?? 0}
                            onChange={(e) => updateDefaults('play_clock_delay', parseInt(e.target.value) || 0)}
                            disabled={league.is_finished}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timeout Settings */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Timeout Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="timeouts-per-half">Timeouts Per Half</Label>
                          <Input
                            id="timeouts-per-half"
                            type="number"
                            min="0"
                            max="10"
                            value={defaults.timeouts_per_half ?? 3}
                            onChange={(e) => updateDefaults('timeouts_per_half', parseInt(e.target.value) || 3)}
                            disabled={league.is_finished}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timeout-length">Timeout Length (seconds)</Label>
                          <Input
                            id="timeout-length"
                            type="number"
                            min="30"
                            max="180"
                            value={defaults.timeout_length ?? 60}
                            onChange={(e) => updateDefaults('timeout_length', parseInt(e.target.value) || 60)}
                            disabled={league.is_finished}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Overtime Settings */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Overtime Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ot-length">OT Period Length (minutes)</Label>
                          <Input
                            id="ot-length"
                            type="number"
                            min="1"
                            max="15"
                            value={defaults.ot_length ?? 10}
                            onChange={(e) => updateDefaults('ot_length', parseInt(e.target.value) || 10)}
                            disabled={league.is_finished}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ot-timeouts">OT Timeouts Per Team</Label>
                          <Input
                            id="ot-timeouts"
                            type="number"
                            min="0"
                            max="5"
                            value={defaults.ot_timeouts ?? 2}
                            onChange={(e) => updateDefaults('ot_timeouts', parseInt(e.target.value) || 2)}
                            disabled={league.is_finished}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Field Settings */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Field Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="kickoff-yard">Kickoff Yard Line</Label>
                          <Input
                            id="kickoff-yard"
                            type="number"
                            min="20"
                            max="50"
                            value={defaults.kickoff_yard ?? 35}
                            onChange={(e) => updateDefaults('kickoff_yard', parseInt(e.target.value) || 35)}
                            disabled={league.is_finished}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Special Rules */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Special Rules</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="onside-alt-distance">4th & X Alternative Distance</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Distance for the 4th down onside kick alternative (shown in Q4 when trailing)</p>
                          <Input
                            id="onside-alt-distance"
                            type="number"
                            min="1"
                            max="99"
                            value={league.onside_alt_distance ?? 15}
                            onChange={async (e) => {
                              try {
                                await leagueApi.update(leagueId, { onside_alt_distance: parseInt(e.target.value) || 15 })
                                loadData()
                              } catch (error) {
                                console.error('Failed to update onside alt distance:', error)
                              }
                            }}
                            disabled={league.is_finished}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>4-Point Field Goals</Label>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Enable 4-point field goals for long kicks</p>
                            </div>
                            <Button
                              size="sm"
                              variant={league.four_point_fg_enabled ? "default" : "outline"}
                              className={league.four_point_fg_enabled ? "bg-green-600" : ""}
                              onClick={async () => {
                                try {
                                  await leagueApi.update(leagueId, { four_point_fg_enabled: !league.four_point_fg_enabled })
                                  loadData()
                                } catch (error) {
                                  console.error('Failed to update 4-point FG setting:', error)
                                }
                              }}
                              disabled={league.is_finished}
                            >
                              {league.four_point_fg_enabled ? 'ON' : 'OFF'}
                            </Button>
                          </div>
                          {league.four_point_fg_enabled && (
                            <div className="mt-2">
                              <Label htmlFor="four-point-fg-distance">Minimum Distance (yards)</Label>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Field goals from this distance or longer are worth 4 points</p>
                              <Input
                                id="four-point-fg-distance"
                                type="number"
                                min="30"
                                max="70"
                                value={league.four_point_fg_distance ?? 50}
                                onChange={async (e) => {
                                  try {
                                    await leagueApi.update(leagueId, { four_point_fg_distance: parseInt(e.target.value) || 50 })
                                    loadData()
                                  } catch (error) {
                                    console.error('Failed to update 4-point FG distance:', error)
                                  }
                                }}
                                disabled={league.is_finished}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Broadcast Features */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Broadcast Features</h4>
                      <p className="text-sm text-slate-500 mb-3">Toggle features available during game broadcasts</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Ad Breaks</Label>
                            <p className="text-xs text-slate-500">Show ad break prompts after scores</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_ad_breaks !== false ? "default" : "outline"}
                            className={defaults.enable_ad_breaks !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_ad_breaks', defaults.enable_ad_breaks === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_ad_breaks !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Play Clock</Label>
                            <p className="text-xs text-slate-500">Show play clock during games</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_play_clock !== false ? "default" : "outline"}
                            className={defaults.enable_play_clock !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_play_clock', defaults.enable_play_clock === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_play_clock !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Timeout Tracking</Label>
                            <p className="text-xs text-slate-500">Track and display team timeouts</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_timeouts !== false ? "default" : "outline"}
                            className={defaults.enable_timeouts !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_timeouts', defaults.enable_timeouts === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_timeouts !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Quick Stats</Label>
                            <p className="text-xs text-slate-500">Enable quick stats panel during games</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_quick_stats !== false ? "default" : "outline"}
                            className={defaults.enable_quick_stats !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_quick_stats', defaults.enable_quick_stats === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_quick_stats !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Game Log</Label>
                            <p className="text-xs text-slate-500">Enable play-by-play game log</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_game_log !== false ? "default" : "outline"}
                            className={defaults.enable_game_log !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_game_log', defaults.enable_game_log === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_game_log !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Coin Toss Tracking</Label>
                            <p className="text-xs text-slate-500">Track coin toss results</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_coin_toss !== false ? "default" : "outline"}
                            className={defaults.enable_coin_toss !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_coin_toss', defaults.enable_coin_toss === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_coin_toss !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Preset Notifications */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Preset Notifications</h4>
                      <p className="text-sm text-slate-500 mb-3">Customize quick notification buttons for game broadcasts</p>
                      <div className="space-y-3">
                        {(defaults.presetNotifications || [
                          { id: 'big-play', label: 'Big Play', title: '🏈 Big Play!', message: 'What a play!' },
                          { id: 'timeout', label: 'Timeout', title: '⏸️ Timeout', message: 'Timeout on the field' },
                          { id: 'flag', label: 'Flag', title: '🚩 Flag', message: 'Flag on the play' },
                          { id: 'review', label: 'Review', title: '🔄 Under Review', message: 'Play is under review' },
                          { id: 'injury', label: 'Injury', title: '🏥 Injury', message: 'Injury timeout' },
                        ]).map((preset, index) => (
                          <div key={preset.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium w-20">Button {index + 1}</span>
                              <Input
                                placeholder="Button label"
                                value={preset.label}
                                onChange={(e) => {
                                  const presets = defaults.presetNotifications || [
                                    { id: 'big-play', label: 'Big Play', title: '🏈 Big Play!', message: 'What a play!' },
                                    { id: 'timeout', label: 'Timeout', title: '⏸️ Timeout', message: 'Timeout on the field' },
                                    { id: 'flag', label: 'Flag', title: '🚩 Flag', message: 'Flag on the play' },
                                    { id: 'review', label: 'Review', title: '🔄 Under Review', message: 'Play is under review' },
                                    { id: 'injury', label: 'Injury', title: '🏥 Injury', message: 'Injury timeout' },
                                  ]
                                  const updated = [...presets]
                                  updated[index] = { ...updated[index], label: e.target.value }
                                  updateDefaults('presetNotifications', updated)
                                }}
                                disabled={league.is_finished}
                                className="h-8 w-24"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Title"
                                value={preset.title}
                                onChange={(e) => {
                                  const presets = defaults.presetNotifications || [
                                    { id: 'big-play', label: 'Big Play', title: '🏈 Big Play!', message: 'What a play!' },
                                    { id: 'timeout', label: 'Timeout', title: '⏸️ Timeout', message: 'Timeout on the field' },
                                    { id: 'flag', label: 'Flag', title: '🚩 Flag', message: 'Flag on the play' },
                                    { id: 'review', label: 'Review', title: '🔄 Under Review', message: 'Play is under review' },
                                    { id: 'injury', label: 'Injury', title: '🏥 Injury', message: 'Injury timeout' },
                                  ]
                                  const updated = [...presets]
                                  updated[index] = { ...updated[index], title: e.target.value }
                                  updateDefaults('presetNotifications', updated)
                                }}
                                disabled={league.is_finished}
                                className="h-8"
                              />
                              <Input
                                placeholder="Message"
                                value={preset.message}
                                onChange={(e) => {
                                  const presets = defaults.presetNotifications || [
                                    { id: 'big-play', label: 'Big Play', title: '🏈 Big Play!', message: 'What a play!' },
                                    { id: 'timeout', label: 'Timeout', title: '⏸️ Timeout', message: 'Timeout on the field' },
                                    { id: 'flag', label: 'Flag', title: '🚩 Flag', message: 'Flag on the play' },
                                    { id: 'review', label: 'Review', title: '🔄 Under Review', message: 'Play is under review' },
                                    { id: 'injury', label: 'Injury', title: '🏥 Injury', message: 'Injury timeout' },
                                  ]
                                  const updated = [...presets]
                                  updated[index] = { ...updated[index], message: e.target.value }
                                  updateDefaults('presetNotifications', updated)
                                }}
                                disabled={league.is_finished}
                                className="h-8"
                              />
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const presets = defaults.presetNotifications || [
                              { id: 'big-play', label: 'Big Play', title: '🏈 Big Play!', message: 'What a play!' },
                              { id: 'timeout', label: 'Timeout', title: '⏸️ Timeout', message: 'Timeout on the field' },
                              { id: 'flag', label: 'Flag', title: '🚩 Flag', message: 'Flag on the play' },
                              { id: 'review', label: 'Review', title: '🔄 Under Review', message: 'Play is under review' },
                              { id: 'injury', label: 'Injury', title: '🏥 Injury', message: 'Injury timeout' },
                            ]
                            if (presets.length < 10) {
                              updateDefaults('presetNotifications', [
                                ...presets,
                                { id: `custom-${Date.now()}`, label: 'New', title: 'New Notification', message: '' }
                              ])
                            }
                          }}
                          disabled={league.is_finished || (defaults.presetNotifications?.length || 5) >= 10}
                          className="w-full"
                        >
                          + Add Preset Notification
                        </Button>
                      </div>
                    </div>

                    {/* Scoring Rules */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Scoring Rules</h4>
                      <p className="text-sm text-slate-500 mb-3">Configure point values and conversion options</p>
                      
                      {/* Point Values */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Touchdown</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={defaults.td_points ?? 6}
                            onChange={(e) => updateDefaults('td_points', parseInt(e.target.value) || 6)}
                            disabled={league.is_finished}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Field Goal</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={defaults.fg_points ?? 3}
                            onChange={(e) => updateDefaults('fg_points', parseInt(e.target.value) || 3)}
                            disabled={league.is_finished}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Safety</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={defaults.safety_points ?? 2}
                            onChange={(e) => updateDefaults('safety_points', parseInt(e.target.value) || 2)}
                            disabled={league.is_finished}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Extra Point</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={defaults.pat_points ?? 1}
                            onChange={(e) => updateDefaults('pat_points', parseInt(e.target.value) || 1)}
                            disabled={league.is_finished}
                            className="h-8"
                          />
                        </div>
                      </div>

                      {/* PAT/Conversion Options */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">PAT/Conversion Options</Label>
                        <p className="text-xs text-slate-500">Configure up to 3 conversion options after touchdowns</p>
                        
                        {/* PAT Option 1 */}
                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              placeholder="Option name (e.g., Extra Point)"
                              value={defaults.pat_option_1_name ?? 'Extra Point'}
                              onChange={(e) => updateDefaults('pat_option_1_name', e.target.value)}
                              disabled={league.is_finished}
                              className="h-8 flex-1"
                            />
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={defaults.pat_option_1_points ?? 1}
                              onChange={(e) => updateDefaults('pat_option_1_points', parseInt(e.target.value) || 1)}
                              disabled={league.is_finished}
                              className="h-8 w-16"
                            />
                            <span className="text-xs text-slate-500">pts</span>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.pat_option_1_enabled !== false ? "default" : "outline"}
                            className={`h-7 ${defaults.pat_option_1_enabled !== false ? "bg-green-600" : ""}`}
                            onClick={() => updateDefaults('pat_option_1_enabled', defaults.pat_option_1_enabled === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.pat_option_1_enabled !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>

                        {/* PAT Option 2 */}
                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              placeholder="Option name (e.g., 2-Point)"
                              value={defaults.pat_option_2_name ?? '2-Point Conversion'}
                              onChange={(e) => updateDefaults('pat_option_2_name', e.target.value)}
                              disabled={league.is_finished}
                              className="h-8 flex-1"
                            />
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={defaults.pat_option_2_points ?? 2}
                              onChange={(e) => updateDefaults('pat_option_2_points', parseInt(e.target.value) || 2)}
                              disabled={league.is_finished}
                              className="h-8 w-16"
                            />
                            <span className="text-xs text-slate-500">pts</span>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.pat_option_2_enabled !== false ? "default" : "outline"}
                            className={`h-7 ${defaults.pat_option_2_enabled !== false ? "bg-green-600" : ""}`}
                            onClick={() => updateDefaults('pat_option_2_enabled', defaults.pat_option_2_enabled === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.pat_option_2_enabled !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>

                        {/* PAT Option 3 (Custom) */}
                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              placeholder="Custom option (e.g., 3-Point)"
                              value={defaults.pat_option_3_name ?? ''}
                              onChange={(e) => updateDefaults('pat_option_3_name', e.target.value)}
                              disabled={league.is_finished}
                              className="h-8 flex-1"
                            />
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={defaults.pat_option_3_points ?? 3}
                              onChange={(e) => updateDefaults('pat_option_3_points', parseInt(e.target.value) || 3)}
                              disabled={league.is_finished}
                              className="h-8 w-16"
                            />
                            <span className="text-xs text-slate-500">pts</span>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.pat_option_3_enabled === true ? "default" : "outline"}
                            className={`h-7 ${defaults.pat_option_3_enabled === true ? "bg-green-600" : ""}`}
                            onClick={() => updateDefaults('pat_option_3_enabled', !defaults.pat_option_3_enabled)}
                            disabled={league.is_finished}
                          >
                            {defaults.pat_option_3_enabled === true ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Special Teams Options */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Special Teams Options</h4>
                      <p className="text-sm text-slate-500 mb-3">Configure kickoff and special teams rules</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Onside Kicks</Label>
                            <p className="text-xs text-slate-500">Allow traditional onside kicks</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_onside_kicks !== false ? "default" : "outline"}
                            className={defaults.enable_onside_kicks !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_onside_kicks', defaults.enable_onside_kicks === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_onside_kicks !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>4th Down Conversion (Onside Alternative)</Label>
                            <p className="text-xs text-slate-500">Allow 4th & 15 from own 25 instead of onside</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_4th_down_onside === true ? "default" : "outline"}
                            className={defaults.enable_4th_down_onside === true ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_4th_down_onside', !defaults.enable_4th_down_onside)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_4th_down_onside === true ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Kickoff-Free Option</Label>
                            <p className="text-xs text-slate-500">Start drives at set yard line instead of kickoffs</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_kickoff_free === true ? "default" : "outline"}
                            className={defaults.enable_kickoff_free === true ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_kickoff_free', !defaults.enable_kickoff_free)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_kickoff_free === true ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        {defaults.enable_kickoff_free && (
                          <div className="ml-4 space-y-2">
                            <Label className="text-xs">Starting Yard Line (after scores)</Label>
                            <Input
                              type="number"
                              min="15"
                              max="35"
                              value={defaults.kickoff_free_yard ?? 25}
                              onChange={(e) => updateDefaults('kickoff_free_yard', parseInt(e.target.value) || 25)}
                              disabled={league.is_finished}
                              className="h-8 w-24"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Fair Catch Kick</Label>
                            <p className="text-xs text-slate-500">Allow field goal attempt after fair catch</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_fair_catch_kick !== false ? "default" : "outline"}
                            className={defaults.enable_fair_catch_kick !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_fair_catch_kick', defaults.enable_fair_catch_kick === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_fair_catch_kick !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Punt Returns</Label>
                            <p className="text-xs text-slate-500">Allow punt returns (vs fair catch only)</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_punt_returns !== false ? "default" : "outline"}
                            className={defaults.enable_punt_returns !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_punt_returns', defaults.enable_punt_returns === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_punt_returns !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Game Rules */}
                    <div>
                      <h4 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Game Rules</h4>
                      <p className="text-sm text-slate-500 mb-3">Configure gameplay rules and options</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Two-Minute Warning</Label>
                            <p className="text-xs text-slate-500">Stop clock at 2:00 in each half</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_two_minute_warning !== false ? "default" : "outline"}
                            className={defaults.enable_two_minute_warning !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_two_minute_warning', defaults.enable_two_minute_warning === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_two_minute_warning !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Challenges</Label>
                            <p className="text-xs text-slate-500">Allow coach's challenges</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_challenges !== false ? "default" : "outline"}
                            className={defaults.enable_challenges !== false ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_challenges', defaults.enable_challenges === false)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_challenges !== false ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Mercy Rule</Label>
                            <p className="text-xs text-slate-500">End game early if score difference exceeds threshold</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_mercy_rule === true ? "default" : "outline"}
                            className={defaults.enable_mercy_rule === true ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_mercy_rule', !defaults.enable_mercy_rule)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_mercy_rule === true ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        {defaults.enable_mercy_rule && (
                          <div className="ml-4 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Point Difference</Label>
                              <Input
                                type="number"
                                min="14"
                                max="70"
                                value={defaults.mercy_rule_points ?? 35}
                                onChange={(e) => updateDefaults('mercy_rule_points', parseInt(e.target.value) || 35)}
                                disabled={league.is_finished}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">After Quarter</Label>
                              <select
                                value={defaults.mercy_rule_quarter ?? 'Q3'}
                                onChange={(e) => updateDefaults('mercy_rule_quarter', e.target.value)}
                                disabled={league.is_finished}
                                className="h-8 w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm"
                              >
                                <option value="Q2">Halftime</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                              </select>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Running Clock (Mercy)</Label>
                            <p className="text-xs text-slate-500">Clock runs continuously when mercy rule active</p>
                          </div>
                          <Button
                            size="sm"
                            variant={defaults.enable_running_clock === true ? "default" : "outline"}
                            className={defaults.enable_running_clock === true ? "bg-green-600" : ""}
                            onClick={() => updateDefaults('enable_running_clock', !defaults.enable_running_clock)}
                            disabled={league.is_finished}
                          >
                            {defaults.enable_running_clock === true ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Overtime Format</Label>
                            <p className="text-xs text-slate-500">How overtime is played</p>
                          </div>
                          <select
                            value={defaults.ot_format ?? 'nfl'}
                            onChange={(e) => updateDefaults('ot_format', e.target.value)}
                            disabled={league.is_finished}
                            className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm"
                          >
                            <option value="nfl">NFL (Sudden Death after 1st)</option>
                            <option value="college">College (Alternating possessions)</option>
                            <option value="sudden">Sudden Death</option>
                            <option value="full">Full Period</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
          </>
          )}

          {settingsTab === 'mechanics' && (
          <>
          {/* Penalties Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Penalties</CardTitle>
              <CardDescription>Manage the list of penalties available during games</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setPenaltiesDialogOpen(true)} disabled={league.is_finished}>
                Manage Penalties
              </Button>
              <p className="text-sm text-slate-500 mt-2">
                {(() => {
                  const penalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                  return `${penalties.length} penalties configured`
                })()}
              </p>
            </CardContent>
          </Card>

          {/* Manage Penalties Dialog */}
          <Dialog open={penaltiesDialogOpen} onOpenChange={setPenaltiesDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Manage Penalties</DialogTitle>
                <DialogDescription>View, add, or remove penalties for this league</DialogDescription>
              </DialogHeader>
              {/* Penalty list - scrollable, 7 visible at a time */}
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-2">
                {(() => {
                  const penalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                  
                  // Use configured penalties, or show presets if none configured
                  const displayPenalties = penalties.length > 0 ? penalties : DEFAULT_PENALTIES
                  const isUsingPresets = penalties.length === 0
                  
                  return displayPenalties.map((penalty, index) => {
                    // Support both old string format and new object format
                    const isObject = typeof penalty === 'object'
                    const name = isObject ? penalty.name : penalty
                    const isCustom = isObject && penalty.custom
                    const yards = isObject ? penalty.yards : null
                    const lossOfDown = isObject ? penalty.lossOfDown : false
                    const side = isObject ? penalty.side : 'either'
                    const subPenalties = isObject ? (penalty.subPenalties || []) : []
                    
                    return (
                      <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{name}</span>
                              {isCustom && (
                                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                              {yards && <span>{yards} yards</span>}
                              {lossOfDown && <span>+ Loss of Down</span>}
                              {side !== 'either' && <span>({side} only)</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-700 h-8 w-8 p-0"
                              title="Edit penalty"
                              onClick={() => {
                                setEditPenaltyForm({
                                  index,
                                  name,
                                  yards: yards || 5,
                                  lossOfDown,
                                  side,
                                  parentIndex: null, // null means it's a top-level penalty
                                  subPenalties: subPenalties,
                                })
                                setEditPenaltyDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-700 h-8 w-8 p-0"
                              title="Add sub-penalty"
                              onClick={() => {
                                setSubPenaltyForm({ parentIndex: index, name: '' })
                                setAddSubPenaltyDialogOpen(true)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                              onClick={() => {
                                if (isUsingPresets) {
                                  const updated = DEFAULT_PENALTIES.filter((_, i) => i !== index)
                                  leagueApi.update(leagueId, { penalties: updated })
                                    .then(() => setLeague(prev => ({ ...prev, penalties: JSON.stringify(updated) })))
                                    .catch(err => console.error('Failed to remove penalty:', err))
                                } else {
                                  const updated = penalties.filter((_, i) => i !== index)
                                  leagueApi.update(leagueId, { penalties: updated })
                                    .then(() => setLeague(prev => ({ ...prev, penalties: JSON.stringify(updated) })))
                                    .catch(err => console.error('Failed to remove penalty:', err))
                                }
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {/* Sub-penalties */}
                        {subPenalties.length > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                            {subPenalties.map((sub, subIndex) => (
                              <div key={subIndex} className="flex items-center justify-between px-3 py-1.5 pl-6 text-sm">
                                <span className="text-slate-600 dark:text-slate-400">— {sub}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                  onClick={() => {
                                    const currentPenalties = isUsingPresets ? [...DEFAULT_PENALTIES] : [...penalties]
                                    const updatedPenalty = { ...currentPenalties[index] }
                                    updatedPenalty.subPenalties = updatedPenalty.subPenalties.filter((_, i) => i !== subIndex)
                                    currentPenalties[index] = updatedPenalty
                                    leagueApi.update(leagueId, { penalties: currentPenalties })
                                      .then(() => setLeague(prev => ({ ...prev, penalties: JSON.stringify(currentPenalties) })))
                                      .catch(err => console.error('Failed to remove sub-penalty:', err))
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setPenaltiesDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setPenaltyForm({ name: '', yards: 5, lossOfDown: false, scope: 'league', side: 'either' })
                  setAddPenaltyDialogOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom Penalty
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Penalty Dialog */}
          <Dialog open={addPenaltyDialogOpen} onOpenChange={setAddPenaltyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Penalty</DialogTitle>
                <DialogDescription>Create a new penalty for use during games</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Penalty Name</Label>
                  <Input
                    placeholder="e.g., Illegal Block"
                    value={penaltyForm.name}
                    onChange={(e) => setPenaltyForm({ ...penaltyForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yards</Label>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={penaltyForm.yards}
                    onChange={(e) => setPenaltyForm({ ...penaltyForm, yards: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="loss-of-down"
                    checked={penaltyForm.lossOfDown}
                    onChange={(e) => setPenaltyForm({ ...penaltyForm, lossOfDown: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <Label htmlFor="loss-of-down" className="cursor-pointer">Loss of Down</Label>
                </div>
                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <Select
                    value={penaltyForm.side}
                    onValueChange={(value) => setPenaltyForm({ ...penaltyForm, side: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="either">Either Team</SelectItem>
                      <SelectItem value="offense">Offense Only</SelectItem>
                      <SelectItem value="defense">Defense Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={penaltyForm.scope}
                    onValueChange={(value) => setPenaltyForm({ ...penaltyForm, scope: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="league">This League Only</SelectItem>
                      <SelectItem value="account">All My Leagues</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {penaltyForm.scope === 'account' 
                      ? 'This penalty will be available in all your leagues' 
                      : 'This penalty will only be available in this league'}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddPenaltyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  disabled={!penaltyForm.name.trim()}
                  onClick={() => {
                    const currentPenalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                    const newPenalty = {
                      name: penaltyForm.name.trim(),
                      yards: penaltyForm.yards,
                      lossOfDown: penaltyForm.lossOfDown,
                      side: penaltyForm.side,
                      custom: true,
                      scope: penaltyForm.scope,
                    }
                    const updated = [...currentPenalties, newPenalty]
                    leagueApi.update(leagueId, { penalties: updated })
                      .then(() => {
                        setLeague(prev => ({ ...prev, penalties: JSON.stringify(updated) }))
                        setAddPenaltyDialogOpen(false)
                      })
                      .catch(err => console.error('Failed to add penalty:', err))
                  }}
                >
                  Add Penalty
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Sub-Penalty Dialog */}
          <Dialog open={addSubPenaltyDialogOpen} onOpenChange={setAddSubPenaltyDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Sub-Penalty</DialogTitle>
                <DialogDescription>
                  {subPenaltyForm.parentIndex !== null && (() => {
                    const penalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                    const displayPenalties = penalties.length > 0 ? penalties : DEFAULT_PENALTIES
                    const parent = displayPenalties[subPenaltyForm.parentIndex]
                    return `Add a sub-type for "${parent?.name || 'Penalty'}"`
                  })()}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Sub-Penalty Name</Label>
                <Input
                  placeholder="e.g., Taunting"
                  value={subPenaltyForm.name}
                  onChange={(e) => setSubPenaltyForm({ ...subPenaltyForm, name: e.target.value })}
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddSubPenaltyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!subPenaltyForm.name.trim()}
                  onClick={() => {
                    const penalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                    const currentPenalties = penalties.length > 0 ? [...penalties] : [...DEFAULT_PENALTIES]
                    const parentPenalty = { ...currentPenalties[subPenaltyForm.parentIndex] }
                    parentPenalty.subPenalties = [...(parentPenalty.subPenalties || []), subPenaltyForm.name.trim()]
                    currentPenalties[subPenaltyForm.parentIndex] = parentPenalty
                    leagueApi.update(leagueId, { penalties: currentPenalties })
                      .then(() => {
                        setLeague(prev => ({ ...prev, penalties: JSON.stringify(currentPenalties) }))
                        setAddSubPenaltyDialogOpen(false)
                      })
                      .catch(err => console.error('Failed to add sub-penalty:', err))
                  }}
                >
                  Add Sub-Penalty
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Penalty Dialog */}
          <Dialog open={editPenaltyDialogOpen} onOpenChange={setEditPenaltyDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Penalty</DialogTitle>
                <DialogDescription>Configure this penalty's settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Penalty Name</Label>
                  <Input
                    value={editPenaltyForm.name}
                    onChange={(e) => setEditPenaltyForm({ ...editPenaltyForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yards</Label>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={editPenaltyForm.yards}
                    onChange={(e) => setEditPenaltyForm({ ...editPenaltyForm, yards: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-loss-of-down"
                    checked={editPenaltyForm.lossOfDown}
                    onChange={(e) => setEditPenaltyForm({ ...editPenaltyForm, lossOfDown: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <Label htmlFor="edit-loss-of-down" className="cursor-pointer">Loss of Down</Label>
                </div>
                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <Select
                    value={editPenaltyForm.side}
                    onValueChange={(value) => setEditPenaltyForm({ ...editPenaltyForm, side: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="either">Either Team</SelectItem>
                      <SelectItem value="offense">Offense Only</SelectItem>
                      <SelectItem value="defense">Defense Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Make Sub-Penalty Of</Label>
                  <Select
                    value={editPenaltyForm.parentIndex === null ? 'none' : String(editPenaltyForm.parentIndex)}
                    onValueChange={(value) => setEditPenaltyForm({ ...editPenaltyForm, parentIndex: value === 'none' ? null : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Top-Level Penalty —</SelectItem>
                      {(() => {
                        const penalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                        const displayPenalties = penalties.length > 0 ? penalties : DEFAULT_PENALTIES
                        return displayPenalties.map((p, i) => {
                          if (i === editPenaltyForm.index) return null // Can't be parent of itself
                          const pName = typeof p === 'object' ? p.name : p
                          return <SelectItem key={i} value={String(i)}>{pName}</SelectItem>
                        })
                      })()}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Select a parent to make this a sub-penalty (e.g., Taunting under Unsportsmanlike Conduct)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPenaltyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!editPenaltyForm.name.trim()}
                  onClick={() => {
                    const penalties = league.penalties ? (typeof league.penalties === 'string' ? JSON.parse(league.penalties) : league.penalties) : []
                    let currentPenalties = penalties.length > 0 ? [...penalties] : [...DEFAULT_PENALTIES]
                    
                    // If changing to a sub-penalty
                    if (editPenaltyForm.parentIndex !== null) {
                      // Remove from top level
                      const removedPenalty = currentPenalties[editPenaltyForm.index]
                      currentPenalties = currentPenalties.filter((_, i) => i !== editPenaltyForm.index)
                      
                      // Adjust parent index if it was after the removed item
                      let adjustedParentIndex = editPenaltyForm.parentIndex
                      if (editPenaltyForm.parentIndex > editPenaltyForm.index) {
                        adjustedParentIndex--
                      }
                      
                      // Add to parent's subPenalties
                      const parent = { ...currentPenalties[adjustedParentIndex] }
                      parent.subPenalties = [...(parent.subPenalties || []), editPenaltyForm.name.trim()]
                      currentPenalties[adjustedParentIndex] = parent
                    } else {
                      // Update in place
                      currentPenalties[editPenaltyForm.index] = {
                        ...currentPenalties[editPenaltyForm.index],
                        name: editPenaltyForm.name.trim(),
                        yards: editPenaltyForm.yards,
                        lossOfDown: editPenaltyForm.lossOfDown,
                        side: editPenaltyForm.side,
                      }
                    }
                    
                    leagueApi.update(leagueId, { penalties: currentPenalties })
                      .then(() => {
                        setLeague(prev => ({ ...prev, penalties: JSON.stringify(currentPenalties) }))
                        setEditPenaltyDialogOpen(false)
                      })
                      .catch(err => console.error('Failed to update penalty:', err))
                  }}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Game Mechanics Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Game Mechanics</CardTitle>
              <CardDescription>Toggle which features are available during live games</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const mechanics = league.mechanics ? JSON.parse(league.mechanics) : {}
                const toggleMechanic = (key, value) => {
                  const updated = { ...mechanics, [key]: value }
                  leagueApi.update(leagueId, { mechanics: updated })
                    .then(() => setLeague(prev => ({ ...prev, mechanics: JSON.stringify(updated) })))
                    .catch(err => console.error('Failed to update mechanic:', err))
                }
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Downs & Distance</p>
                        <p className="text-sm text-slate-500">Track down, distance, and ball position</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mechanics.downs !== false}
                        onChange={(e) => toggleMechanic('downs', e.target.checked)}
                        disabled={league.is_finished}
                        className="h-5 w-5 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Play Clock</p>
                        <p className="text-sm text-slate-500">Show play clock countdown</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mechanics.play_clock !== false}
                        onChange={(e) => toggleMechanic('play_clock', e.target.checked)}
                        disabled={league.is_finished}
                        className="h-5 w-5 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Timeouts</p>
                        <p className="text-sm text-slate-500">Track team timeouts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mechanics.timeouts !== false}
                        onChange={(e) => toggleMechanic('timeouts', e.target.checked)}
                        disabled={league.is_finished}
                        className="h-5 w-5 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Possession Indicator</p>
                        <p className="text-sm text-slate-500">Show which team has the ball</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mechanics.possession !== false}
                        onChange={(e) => toggleMechanic('possession', e.target.checked)}
                        disabled={league.is_finished}
                        className="h-5 w-5 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Penalties</p>
                        <p className="text-sm text-slate-500">Show penalty buttons during games</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mechanics.penalties !== false}
                        onChange={(e) => toggleMechanic('penalties', e.target.checked)}
                        disabled={league.is_finished}
                        className="h-5 w-5 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Quarter/Period Tracking</p>
                        <p className="text-sm text-slate-500">Show current quarter and game clock</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mechanics.quarters !== false}
                        onChange={(e) => toggleMechanic('quarters', e.target.checked)}
                        disabled={league.is_finished}
                        className="h-5 w-5 rounded"
                      />
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Game Dialog */}
      <Dialog open={gameEditDialogOpen} onOpenChange={setGameEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>Update game details and scheduled time</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateGame} className="space-y-4">
            <div className="space-y-2">
              <Label>Home Team</Label>
              <Select
                value={gameEditForm.home_team_id || 'tbd'}
                onValueChange={(value) => setGameEditForm({ ...gameEditForm, home_team_id: value === 'tbd' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select home team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tbd">TBD</SelectItem>
                  {(league?.teams || []).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Away Team</Label>
              <Select
                value={gameEditForm.away_team_id || 'tbd'}
                onValueChange={(value) => setGameEditForm({ ...gameEditForm, away_team_id: value === 'tbd' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select away team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tbd">TBD</SelectItem>
                  {(league?.teams || []).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={gameEditForm.scheduled_date}
                onChange={(e) => setGameEditForm({ ...gameEditForm, scheduled_date: e.target.value })}
              />
              <p className="text-xs text-slate-500">Leave empty for TBD</p>
            </div>
            {gameEditForm.scheduled_date && (
              <div className="space-y-2">
                <Label>Scheduled Time</Label>
                <Input
                  type="time"
                  value={gameEditForm.scheduled_time}
                  onChange={(e) => setGameEditForm({ ...gameEditForm, scheduled_time: e.target.value })}
                />
                <p className="text-xs text-slate-500">Leave empty for TBD</p>
              </div>
            )}
            {(league.game_unit_label || league.game_unit_label_2 || league.game_unit_label_3) && (
              <div className="space-y-2">
                <Label>Time Unit</Label>
                <div className="flex gap-2">
                  <Select
                    value={gameEditForm.game_unit_type}
                    onValueChange={(val) => setGameEditForm({ ...gameEditForm, game_unit_type: val })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {league.game_unit_label && (
                        <SelectItem value="1">{league.game_unit_label}</SelectItem>
                      )}
                      {league.game_unit_label_2 && (
                        <SelectItem value="2">{league.game_unit_label_2}</SelectItem>
                      )}
                      {league.game_unit_label_3 && (
                        <SelectItem value="3">{league.game_unit_label_3}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Number"
                    className="w-24"
                    value={gameEditForm.game_unit}
                    onChange={(e) => setGameEditForm({ ...gameEditForm, game_unit: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGameEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share {shareInfo.type === 'game' ? 'Game' : shareInfo.type === 'league' ? 'League' : 'Bracket'}</DialogTitle>
            <DialogDescription>{shareInfo.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Share Code</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 text-center">
                  <span className="text-2xl font-bold font-mono tracking-wider">{shareInfo.code}</span>
                </div>
                <Button variant="outline" size="icon" onClick={copyShareCode}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Share Link</Label>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`}
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyShareLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm text-slate-500">QR Code</Label>
              <div className="flex justify-center p-4 bg-white dark:bg-slate-200 rounded-lg">
                <QRCodeSVG 
                  value={`${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`}
                  size={150}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                {shareInfo.type === 'league' ? 'Scan to view the league' : 'Scan to view the live scoreboard'}
              </p>
            </div>
            {shareInfo.type === 'game' && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm text-slate-500">OBS Browser Source URL</Label>
                <Input 
                  readOnly 
                  value={`${window.location.origin}/obs/${shareInfo.code}`}
                  className="text-xs font-mono"
                />
                <p className="text-xs text-slate-400">
                  Add <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">?compact=true</code> for scorebug style, 
                  or <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">?transparent=true</code> for transparent background
                </p>
              </div>
            )}
            
            {/* Share via Email/SMS */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm text-slate-500">Share via</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`
                    const typeLabel = shareInfo.type === 'game' ? 'Game' : shareInfo.type === 'league' ? 'League' : 'Bracket'
                    const subject = encodeURIComponent(`Watch: ${shareInfo.name}`)
                    const body = encodeURIComponent(`Check out this ${typeLabel.toLowerCase()}!\n\n${shareInfo.name}\nShare Code: ${shareInfo.code}\n\nView here: ${shareUrl}`)
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                  }}
                >
                  📧 Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`
                    const typeLabel = shareInfo.type === 'game' ? 'Game' : shareInfo.type === 'league' ? 'League' : 'Bracket'
                    const message = encodeURIComponent(`Check out this ${typeLabel.toLowerCase()}! ${shareInfo.name}\n\nCode: ${shareInfo.code}\n${shareUrl}`)
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
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`
                    const text = encodeURIComponent(`${shareInfo.name} 🏈`)
                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420')
                  }}
                >
                  𝕏
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420')
                  }}
                >
                  📘
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${shareInfo.type}/${shareInfo.code}`
                    const text = encodeURIComponent(`${shareInfo.name} 🏈 ${shareUrl}`)
                    window.open(`https://wa.me/?text=${text}`, '_blank')
                  }}
                >
                  💚
                </Button>
              </div>
            </div>

            {/* Invite by Username */}
            {user && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm text-slate-500 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Invite by Username
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  />
                  <Select value={invitePermission} onValueChange={setInvitePermission}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </span>
                      </SelectItem>
                      <SelectItem value="control">
                        <span className="flex items-center gap-1">
                          <Settings className="h-3 w-3" /> Control
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSendInvite} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-500">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-sm text-green-600">{inviteSuccess}</p>
                )}
                <p className="text-xs text-slate-400">
                  {invitePermission === 'view' 
                    ? 'User will be able to view this resource' 
                    : 'User will be able to control and edit this resource'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
