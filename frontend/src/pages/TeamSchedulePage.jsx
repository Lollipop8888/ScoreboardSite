import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Trophy, Play, Plus, Link2, Unlink, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { leagueApi, teamApi, gameApi, bracketApi, followApi, leagueExtrasApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { requestNotificationPermission, subscribeToPush, getPushUnsupportedReason } from '@/lib/notifications'

export default function TeamSchedulePage() {
  const { leagueId, teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [league, setLeague] = useState(null)
  const [games, setGames] = useState([])
  const [brackets, setBrackets] = useState([])
  const [linkedBrackets, setLinkedBrackets] = useState([])
  const [seasons, setSeasons] = useState([])
  // Season shown: null follows the current season, 'all' shows every season
  const [scheduleSeasonId, setScheduleSeasonId] = useState(null)
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [teamStats, setTeamStats] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [addGameDialogOpen, setAddGameDialogOpen] = useState(false)
  const [editGameDialogOpen, setEditGameDialogOpen] = useState(false)
  const [linkBracketDialogOpen, setLinkBracketDialogOpen] = useState(false)
  const [gameForm, setGameForm] = useState({ opponent_id: '', scheduled_at: '', is_home: true })
  const [editGameForm, setEditGameForm] = useState({ id: '', scheduled_at: '', home_score: 0, away_score: 0, status: 'scheduled' })
  const [selectedBracket, setSelectedBracket] = useState('')

  useEffect(() => {
    loadData()
  }, [leagueId, teamId])

  const [allTeams, setAllTeams] = useState([])

  // Season stats for this team (from the league stats leaders)
  useEffect(() => {
    if (!leagueId) return
    const season = scheduleSeasonId && scheduleSeasonId !== 'all' ? scheduleSeasonId : null
    leagueExtrasApi.stats(leagueId, season).then(d => setTeamStats((d?.teams || []).find(t => t.team_id === teamId) || null)).catch(() => {})
  }, [leagueId, teamId, scheduleSeasonId])

  // Following this team (notifications for its games)
  useEffect(() => {
    if (!user) { setFollowing(false); return }
    followApi.getAll().then(f => setFollowing((f || []).some(x => x.team_id === teamId))).catch(() => {})
  }, [user, teamId])

  async function toggleFollow() {
    if (following) {
      await followApi.unfollowTeam(teamId).catch(() => {})
      setFollowing(false)
      return
    }
    // Ask for notification permission while still handling the tap (iOS), then follow
    const unsupported = getPushUnsupportedReason()
    const permission = unsupported ? null : requestNotificationPermission()
    await followApi.followTeam(teamId).catch(() => {})
    setFollowing(true)
    if (unsupported) alert('Following! ' + unsupported)
    else if (await permission) subscribeToPush()
  }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [leagueData, teamsData, gamesData, bracketsData, seasonsData] = await Promise.all([
        leagueApi.get(leagueId),
        leagueApi.get(leagueId).then(l => l.teams),
        fetch(`/api/leagues/${leagueId}/games`).then(r => r.json()),
        fetch(`/api/leagues/${leagueId}/brackets`).then(r => r.json()),
        leagueApi.getSeasons(leagueId).catch(() => [])
      ])
      
      setLeague(leagueData)
      setSeasons(seasonsData || [])
      setAllTeams(teamsData)
      const currentTeam = teamsData.find(t => t.id === teamId)
      setTeam(currentTeam)
      
      // Filter games that involve this team
      const teamGames = gamesData.filter(g => 
        g.home_team?.id === teamId || g.away_team?.id === teamId
      )
      setGames(teamGames)
      setBrackets(bracketsData)
      
      // Load linked brackets from localStorage (or could be stored in backend)
      const stored = localStorage.getItem(`team_${teamId}_linked_brackets`)
      if (stored) {
        setLinkedBrackets(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddGame(e) {
    e.preventDefault()
    try {
      const gameData = {
        league_id: leagueId,
        home_team_id: gameForm.is_home ? teamId : gameForm.opponent_id,
        away_team_id: gameForm.is_home ? gameForm.opponent_id : teamId,
        scheduled_at: gameForm.scheduled_at ? gameForm.scheduled_at + ':00' : null
      }
      await gameApi.create(gameData)
      setAddGameDialogOpen(false)
      setGameForm({ opponent_id: '', scheduled_at: '', is_home: true })
      loadData()
    } catch (error) {
      console.error('Failed to create game:', error)
    }
  }

  function handleLinkBracket() {
    if (!selectedBracket) return
    const newLinked = [...linkedBrackets, selectedBracket]
    setLinkedBrackets(newLinked)
    localStorage.setItem(`team_${teamId}_linked_brackets`, JSON.stringify(newLinked))
    setLinkBracketDialogOpen(false)
    setSelectedBracket('')
  }

  function handleUnlinkBracket(bracketId) {
    const newLinked = linkedBrackets.filter(id => id !== bracketId)
    setLinkedBrackets(newLinked)
    localStorage.setItem(`team_${teamId}_linked_brackets`, JSON.stringify(newLinked))
  }

  function openEditGameDialog(game) {
    // Format the scheduled_at for datetime-local input (YYYY-MM-DDTHH:MM)
    const scheduledAt = game.scheduled_at 
      ? game.scheduled_at.slice(0, 16)
      : ''
    setEditGameForm({
      id: game.id,
      scheduled_at: scheduledAt,
      home_score: game.home_score || 0,
      away_score: game.away_score || 0,
      status: game.status || 'scheduled',
      home_team: game.home_team,
      away_team: game.away_team
    })
    setEditGameDialogOpen(true)
  }

  async function handleEditGame(e) {
    e.preventDefault()
    try {
      const updateData = {
        scheduled_at: editGameForm.scheduled_at ? editGameForm.scheduled_at + ':00' : null,
        home_score: parseInt(editGameForm.home_score) || 0,
        away_score: parseInt(editGameForm.away_score) || 0,
        status: editGameForm.status
      }
      await gameApi.update(editGameForm.id, updateData)
      setEditGameDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Failed to update game:', error)
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

  // Get all games including from linked brackets
  function getAllScheduledGames() {
    const allGames = [...games]
    
    // Add games from linked brackets
    linkedBrackets.forEach(bracketId => {
      const bracket = brackets.find(b => b.id === bracketId)
      if (bracket?.games) {
        bracket.games.forEach(game => {
          if ((game.home_team?.id === teamId || game.away_team?.id === teamId) &&
              !allGames.find(g => g.id === game.id)) {
            allGames.push({ ...game, fromBracket: bracket.name })
          }
        })
      }
    })
    
    // Sort by scheduled time
    return allGames.sort((a, b) => {
      if (!a.scheduled_at) return 1
      if (!b.scheduled_at) return -1
      return new Date(a.scheduled_at) - new Date(b.scheduled_at)
    })
  }

  const currentSeason = seasons.find(s => s.is_current)
  const effectiveSeasonId = scheduleSeasonId ?? currentSeason?.id ?? 'all'
  const scheduledGames = getAllScheduledGames().filter(g => effectiveSeasonId === 'all' || g.season_id === effectiveSeasonId)

  // Record for the selected season from its final games. Preseason games aren't part of the record.
  const record = scheduledGames.reduce((r, g) => {
    if (g.status !== 'final' || g.game_unit_type === 3) return r
    const isHome = g.home_team?.id === teamId
    const scored = isHome ? g.home_score : g.away_score
    const allowed = isHome ? g.away_score : g.home_score
    if (scored > allowed) r.wins += 1
    else if (scored < allowed) r.losses += 1
    else r.ties += 1
    return r
  }, { wins: 0, losses: 0, ties: 0 })
  const viewingCurrentSeason = currentSeason && effectiveSeasonId === currentSeason.id

  // Next game, recent form (last 5 finals, no preseason), and season stats
  const nextGame = scheduledGames.find(g => g.status === 'live') ||
    scheduledGames.find(g => g.status === 'scheduled' && g.scheduled_at && new Date(g.scheduled_at) > new Date(now - 4 * 3600 * 1000))
  const recentForm = scheduledGames.filter(g => g.status === 'final' && g.game_unit_type !== 3).slice(-5).map(g => {
    const isHome = g.home_team?.id === teamId
    const us = isHome ? g.home_score : g.away_score
    const them = isHome ? g.away_score : g.home_score
    return { id: g.id, result: us > them ? 'W' : us < them ? 'L' : 'T', score: `${us}-${them}` }
  })
  const otherTeams = league?.teams?.filter(t => t.id !== teamId) || []
  const unlinkedBrackets = brackets.filter(b => !linkedBrackets.includes(b.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Team not found</p>
        <Button asChild className="mt-4">
          <Link to={`/leagues/${leagueId}`}>Back to League</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/leagues/${leagueId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {team.logo_url ? (
            <img 
              src={team.logo_url} 
              alt={team.name}
              className="h-12 w-auto max-w-20 object-contain"
            />
          ) : (
            <span
              className="text-lg font-bold"
              style={{ color: team.color }}
            >
              {team.abbreviation || team.name.substring(0, 3).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold">{team.name} Schedule</h1>
            <p className="text-slate-500">{league?.name} • All times in Eastern Time (ET)</p>
          </div>
        </div>
      </div>

      {/* Team Record */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{record.wins}</p>
                <p className="text-xs text-slate-500">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{record.losses}</p>
                <p className="text-xs text-slate-500">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{record.ties}</p>
                <p className="text-xs text-slate-500">Ties</p>
              </div>
              <div className="text-center border-l pl-6 ml-2">
                <p className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const totalGames = record.wins + record.losses + record.ties
                    if (totalGames === 0) return '—'
                    const winPct = (record.wins + record.ties * 0.5) / totalGames
                    return (winPct * 100).toFixed(0) + '%'
                  })()}
                </p>
                <p className="text-xs text-slate-500">Win %</p>
              </div>
              {/* Division/Group 2 Ranking */}
              {team.group_1 && team.group_2 && (viewingCurrentSeason || seasons.length === 0) && (
                <div className="text-center border-l pl-6 ml-2">
                  <p className="text-2xl font-bold text-purple-600">
                    {(() => {
                      // Get teams in same division (group_1 + group_2)
                      const divTeams = allTeams.filter(t => t.group_1 === team.group_1 && t.group_2 === team.group_2)
                      // Sort by win percentage, then wins
                      const sorted = [...divTeams].sort((a, b) => {
                        const aTotal = (a.wins || 0) + (a.losses || 0) + (a.ties || 0)
                        const bTotal = (b.wins || 0) + (b.losses || 0) + (b.ties || 0)
                        const aWinPct = aTotal > 0 ? ((a.wins || 0) + (a.ties || 0) * 0.5) / aTotal : 0
                        const bWinPct = bTotal > 0 ? ((b.wins || 0) + (b.ties || 0) * 0.5) / bTotal : 0
                        if (bWinPct !== aWinPct) return bWinPct - aWinPct
                        return (b.wins || 0) - (a.wins || 0)
                      })
                      const rank = sorted.findIndex(t => t.id === team.id) + 1
                      const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'
                      return `${rank}${suffix}`
                    })()}
                  </p>
                  <p className="text-xs text-slate-500">in {team.group_1} {team.group_2}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {user && (
                <Button variant={following ? 'default' : 'outline'} className={following ? 'bg-amber-500 hover:bg-amber-600' : ''} onClick={toggleFollow}>
                  {following ? '🔔 Following' : '🔕 Follow team'}
                </Button>
              )}
              <Button variant="outline" onClick={() => {
                const url = `${window.location.origin.replace(/^http/, 'webcal')}/api/calendar/team/${teamId}.ics`
                navigator.clipboard?.writeText(url).then(() => alert('Calendar link copied. Add it in your calendar app as a subscription (from URL).'), () => prompt('Calendar subscription link:', url))
              }}>📅 Calendar</Button>
              <Button onClick={() => setAddGameDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Game
              </Button>
              <Button variant="outline" onClick={() => setLinkBracketDialogOpen(true)} className="gap-2">
                <Link2 className="h-4 w-4" />
                Link Bracket
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next game, recent form, season stats */}
      {(nextGame || recentForm.length > 0 || teamStats?.games > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nextGame && (() => {
            const isHome = nextGame.home_team?.id === teamId
            const opp = isHome ? nextGame.away_team : nextGame.home_team
            const diff = nextGame.scheduled_at ? new Date(nextGame.scheduled_at) - now : 0
            const live = nextGame.status === 'live'
            return (
              <Card>
                <CardContent className="py-4 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">{live ? 'Playing now' : 'Next game'}</p>
                  <p className="font-bold">{isHome ? 'vs' : '@'} {opp?.name || 'TBD'}</p>
                  {live ? (
                    <p className="text-red-600 font-bold">● {nextGame.away_score}-{nextGame.home_score} · {nextGame.quarter} {nextGame.game_time}</p>
                  ) : diff > 0 ? (
                    <p className="font-mono text-lg">{Math.floor(diff / 86400000) > 0 ? `${Math.floor(diff / 86400000)}d ` : ''}{String(Math.floor(diff / 3600000) % 24).padStart(2, '0')}:{String(Math.floor(diff / 60000) % 60).padStart(2, '0')}:{String(Math.floor(diff / 1000) % 60).padStart(2, '0')}</p>
                  ) : <p className="text-sm text-slate-500">Starting soon</p>}
                  <Link to={`/share/game/${nextGame.share_code}`} className="text-sm text-blue-600 hover:underline">{live ? 'Watch live' : 'Game page'} →</Link>
                </CardContent>
              </Card>
            )
          })()}
          {recentForm.length > 0 && (
            <Card>
              <CardContent className="py-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Last {recentForm.length}</p>
                <div className="flex gap-1.5">
                  {recentForm.map(r => (
                    <span key={r.id} title={r.score} className={`h-8 w-8 rounded flex items-center justify-center text-sm font-black text-white ${r.result === 'W' ? 'bg-green-600' : r.result === 'L' ? 'bg-red-600' : 'bg-slate-500'}`}>{r.result}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {teamStats?.games > 0 && (
            <Card>
              <CardContent className="py-4 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <p className="col-span-2 text-xs font-semibold text-slate-500 uppercase">Season stats</p>
                <span className="text-slate-500">Points / game</span><span className="font-bold text-right">{teamStats.points_per_game}</span>
                <span className="text-slate-500">Allowed / game</span><span className="font-bold text-right">{teamStats.points_allowed_per_game}</span>
                {teamStats.third_down_pct != null && <><span className="text-slate-500">3rd down</span><span className="font-bold text-right">{teamStats.third_down_pct}%</span></>}
                {teamStats.turnovers_per_game != null && <><span className="text-slate-500">Turnovers / game</span><span className="font-bold text-right">{teamStats.turnovers_per_game}</span></>}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Linked Brackets */}
      {linkedBrackets.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-slate-500">Linked Brackets</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {linkedBrackets.map(bracketId => {
                const bracket = brackets.find(b => b.id === bracketId)
                if (!bracket) return null
                return (
                  <div key={bracketId} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    <Trophy className="h-3 w-3" />
                    {bracket.name}
                    <button 
                      onClick={() => handleUnlinkBracket(bracketId)}
                      className="hover:text-red-600"
                    >
                      <Unlink className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>
            {scheduledGames.length} game{scheduledGames.length !== 1 ? 's' : ''} scheduled
          </CardDescription>
          {seasons.length > 0 && (
            <div className="pt-2">
              <Select value={effectiveSeasonId} onValueChange={setScheduleSeasonId}>
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
        </CardHeader>
        <CardContent>
          {scheduledGames.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No games scheduled yet</p>
          ) : (
            <div className="space-y-3">
              {scheduledGames.map((game) => {
                const isHome = game.home_team?.id === teamId
                const opponent = isHome ? game.away_team : game.home_team
                const teamScore = isHome ? game.home_score : game.away_score
                const opponentScore = isHome ? game.away_score : game.home_score
                const isWin = game.status === 'final' && teamScore > opponentScore
                const isLoss = game.status === 'final' && teamScore < opponentScore
                const isTie = game.status === 'final' && teamScore === opponentScore

                return (
                  <div
                    key={game.id}
                    className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 ${
                      isWin ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 
                      isLoss ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 
                      isTie ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="text-center w-16 shrink-0">
                        {game.scheduled_at ? (
                          <>
                            <p className="text-xs text-slate-500">
                              {new Date(game.scheduled_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm font-medium">
                              {new Date(game.scheduled_at).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">TBD</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-8">{isHome ? 'vs' : '@'}</span>
                        {opponent?.logo_url ? (
                          <img 
                            src={opponent.logo_url} 
                            alt={opponent.name}
                            className="h-8 w-auto max-w-12 object-contain"
                          />
                        ) : (
                          <span
                            className="text-xs font-bold"
                            style={{ color: opponent?.color || '#888' }}
                          >
                            {opponent?.abbreviation || opponent?.name?.substring(0, 3).toUpperCase() || '???'}
                          </span>
                        )}
                        <span className="font-medium">{opponent?.name || 'TBD'}</span>
                      </div>
                      {game.fromBracket && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                          {game.fromBracket}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      {game.status === 'final' ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold whitespace-nowrap ${isWin ? 'text-green-600' : isLoss ? 'text-red-600' : ''}`}>
                            {teamScore} - {opponentScore}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isWin ? 'bg-green-200 text-green-700' : 
                            isLoss ? 'bg-red-200 text-red-700' : 
                            'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {isWin ? 'W' : isLoss ? 'L' : 'T'}
                          </span>
                        </div>
                      ) : game.status === 'live' ? (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                          <span className="text-lg font-bold">{teamScore} - {opponentScore}</span>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">LIVE</span>
                        </div>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Scheduled</span>
                      )}
                      <div className="flex items-center gap-1">
                        {!game.fromBracket && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditGameDialog(game)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteGame(game.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/games/${game.id}`}>
                            <Play className="h-3 w-3 mr-1" />
                            {game.status === 'scheduled' ? 'Start' : 'View'}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Game Dialog */}
      <Dialog open={addGameDialogOpen} onOpenChange={setAddGameDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddGame}>
            <DialogHeader>
              <DialogTitle>Add Game to Schedule</DialogTitle>
              <DialogDescription>Schedule a new game for {team.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Home/Away</Label>
                <Select
                  value={gameForm.is_home ? 'home' : 'away'}
                  onValueChange={(value) => setGameForm({ ...gameForm, is_home: value === 'home' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home (vs)</SelectItem>
                    <SelectItem value="away">Away (@)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Opponent</Label>
                <Select
                  value={gameForm.opponent_id}
                  onValueChange={(value) => setGameForm({ ...gameForm, opponent_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select opponent" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Time (Eastern Time)</Label>
                <Input
                  type="datetime-local"
                  value={gameForm.scheduled_at}
                  onChange={(e) => setGameForm({ ...gameForm, scheduled_at: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddGameDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!gameForm.opponent_id}>
                Add Game
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Bracket Dialog */}
      <Dialog open={linkBracketDialogOpen} onOpenChange={setLinkBracketDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Bracket</DialogTitle>
            <DialogDescription>
              Link a bracket to automatically include games from that bracket in {team.name}'s schedule
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {unlinkedBrackets.length === 0 ? (
              <p className="text-center text-slate-500">No brackets available to link</p>
            ) : (
              <Select value={selectedBracket} onValueChange={setSelectedBracket}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bracket" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedBrackets.map((bracket) => (
                    <SelectItem key={bracket.id} value={bracket.id}>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        {bracket.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkBracketDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkBracket} disabled={!selectedBracket}>
              Link Bracket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Game Dialog */}
      <Dialog open={editGameDialogOpen} onOpenChange={setEditGameDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditGame}>
            <DialogHeader>
              <DialogTitle>Edit Game</DialogTitle>
              <DialogDescription>
                {editGameForm.away_team?.name || 'Away'} @ {editGameForm.home_team?.name || 'Home'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scheduled Time (Eastern Time)</Label>
                <Input
                  type="datetime-local"
                  value={editGameForm.scheduled_at}
                  onChange={(e) => setEditGameForm({ ...editGameForm, scheduled_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editGameForm.status}
                  onValueChange={(value) => setEditGameForm({ ...editGameForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{editGameForm.away_team?.abbreviation || 'Away'} Score</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editGameForm.away_score}
                    onChange={(e) => setEditGameForm({ ...editGameForm, away_score: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{editGameForm.home_team?.abbreviation || 'Home'} Score</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editGameForm.home_score}
                    onChange={(e) => setEditGameForm({ ...editGameForm, home_score: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditGameDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
