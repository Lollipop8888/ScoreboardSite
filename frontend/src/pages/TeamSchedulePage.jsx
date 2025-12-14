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
import { leagueApi, teamApi, gameApi, bracketApi } from '@/lib/api'

export default function TeamSchedulePage() {
  const { leagueId, teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [league, setLeague] = useState(null)
  const [games, setGames] = useState([])
  const [brackets, setBrackets] = useState([])
  const [linkedBrackets, setLinkedBrackets] = useState([])
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

  async function loadData() {
    try {
      setLoading(true)
      const [leagueData, teamsData, gamesData, bracketsData] = await Promise.all([
        leagueApi.get(leagueId),
        leagueApi.get(leagueId).then(l => l.teams),
        fetch(`/api/leagues/${leagueId}/games`).then(r => r.json()),
        fetch(`/api/leagues/${leagueId}/brackets`).then(r => r.json())
      ])
      
      setLeague(leagueData)
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

  const scheduledGames = getAllScheduledGames()
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{team.wins}</p>
                <p className="text-xs text-slate-500">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{team.losses}</p>
                <p className="text-xs text-slate-500">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{team.ties}</p>
                <p className="text-xs text-slate-500">Ties</p>
              </div>
              <div className="text-center border-l pl-6 ml-2">
                <p className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const totalGames = (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
                    if (totalGames === 0) return '—'
                    const winPct = ((team.wins || 0) + (team.ties || 0) * 0.5) / totalGames
                    return (winPct * 100).toFixed(0) + '%'
                  })()}
                </p>
                <p className="text-xs text-slate-500">Win %</p>
              </div>
              {/* Division/Group 2 Ranking */}
              {team.group_1 && team.group_2 && (
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
            <div className="flex gap-2">
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
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      isWin ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 
                      isLoss ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 
                      isTie ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center w-16">
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
                    <div className="flex items-center gap-4">
                      {game.status === 'final' ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${isWin ? 'text-green-600' : isLoss ? 'text-red-600' : ''}`}>
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
