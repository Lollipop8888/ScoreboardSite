import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Trophy, Users, Calendar, GitBranch, Share2, Trash2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
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
import { leagueApi, teamApi, gameApi, bracketApi } from '@/lib/api'

export default function LeagueDetailPage() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(null)
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [brackets, setBrackets] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [gameDialogOpen, setGameDialogOpen] = useState(false)
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false)
  
  // Form states
  const [teamForm, setTeamForm] = useState({ name: '', abbreviation: '', color: '#3B82F6' })
  const [gameForm, setGameForm] = useState({ home_team_id: '', away_team_id: '' })
  const [bracketForm, setBracketForm] = useState({ name: '', num_teams: '4', team_ids: [] })

  useEffect(() => {
    loadData()
  }, [leagueId])

  async function loadData() {
    try {
      const [leagueData, standingsData, gamesData, bracketsData] = await Promise.all([
        leagueApi.get(leagueId),
        leagueApi.getStandings(leagueId),
        leagueApi.getGames(leagueId),
        leagueApi.getBrackets(leagueId),
      ])
      setLeague(leagueData)
      setStandings(standingsData)
      setGames(gamesData)
      setBrackets(bracketsData)
    } catch (error) {
      console.error('Failed to load league data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTeam(e) {
    e.preventDefault()
    try {
      await teamApi.create({ ...teamForm, league_id: leagueId })
      setTeamDialogOpen(false)
      setTeamForm({ name: '', abbreviation: '', color: '#3B82F6' })
      loadData()
    } catch (error) {
      console.error('Failed to add team:', error)
    }
  }

  async function handleDeleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team?')) return
    try {
      await teamApi.delete(teamId)
      loadData()
    } catch (error) {
      console.error('Failed to delete team:', error)
    }
  }

  async function handleAddGame(e) {
    e.preventDefault()
    try {
      await gameApi.create({ ...gameForm, league_id: leagueId })
      setGameDialogOpen(false)
      setGameForm({ home_team_id: '', away_team_id: '' })
      loadData()
    } catch (error) {
      console.error('Failed to add game:', error)
    }
  }

  async function handleCreateBracket(e) {
    e.preventDefault()
    try {
      await bracketApi.create({
        ...bracketForm,
        league_id: leagueId,
        num_teams: parseInt(bracketForm.num_teams),
      })
      setBracketDialogOpen(false)
      setBracketForm({ name: '', num_teams: '4', team_ids: [] })
      loadData()
    } catch (error) {
      console.error('Failed to create bracket:', error)
    }
  }

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{league.name}</h1>
          <p className="text-slate-600">{league.sport} - {league.season}</p>
        </div>
      </div>

      <Tabs defaultValue="standings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="standings" className="gap-2">
            <Trophy className="h-4 w-4" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2">
            <Calendar className="h-4 w-4" />
            Games
          </TabsTrigger>
          <TabsTrigger value="brackets" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Brackets
          </TabsTrigger>
        </TabsList>

        {/* Standings Tab */}
        <TabsContent value="standings">
          <Card>
            <CardHeader>
              <CardTitle>League Standings</CardTitle>
              <CardDescription>Current rankings based on wins and losses</CardDescription>
            </CardHeader>
            <CardContent>
              {standings.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No teams yet. Add teams to see standings.</p>
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
                        <th className="pb-3 pr-4 text-center">PF</th>
                        <th className="pb-3 pr-4 text-center">PA</th>
                        <th className="pb-3 text-center">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, index) => (
                        <tr key={team.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{index + 1}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{ backgroundColor: team.color }}
                              />
                              <span className="font-medium">{team.name}</span>
                              {team.abbreviation && (
                                <span className="text-slate-400">({team.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-center font-semibold text-green-600">{team.wins}</td>
                          <td className="py-3 pr-4 text-center font-semibold text-red-600">{team.losses}</td>
                          <td className="py-3 pr-4 text-center text-slate-500">{team.ties}</td>
                          <td className="py-3 pr-4 text-center">{team.points_for}</td>
                          <td className="py-3 pr-4 text-center">{team.points_against}</td>
                          <td className="py-3 text-center">
                            <span className={team.points_for - team.points_against >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {team.points_for - team.points_against >= 0 ? '+' : ''}{team.points_for - team.points_against}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  <Button size="sm" className="gap-2">
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
                      <div className="grid gap-2">
                        <Label htmlFor="team-name">Team Name</Label>
                        <Input
                          id="team-name"
                          placeholder="e.g., Kansas City Chiefs"
                          value={teamForm.name}
                          onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="abbreviation">Abbreviation</Label>
                        <Input
                          id="abbreviation"
                          placeholder="e.g., KC"
                          value={teamForm.abbreviation}
                          onChange={(e) => setTeamForm({ ...teamForm, abbreviation: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="color">Team Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={teamForm.color}
                            onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                            className="h-10 w-20 p-1"
                          />
                          <Input
                            value={teamForm.color}
                            onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                            placeholder="#3B82F6"
                          />
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
                <p className="text-center text-slate-500 py-8">No teams yet. Add your first team.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {league.teams?.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <div>
                          <p className="font-medium">{team.name}</p>
                          {team.abbreviation && (
                            <p className="text-sm text-slate-500">{team.abbreviation}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Games</CardTitle>
                <CardDescription>Schedule and track games</CardDescription>
              </div>
              <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" disabled={league.teams?.length < 2}>
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
                          value={gameForm.home_team_id}
                          onValueChange={(value) => setGameForm({ ...gameForm, home_team_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select home team" />
                          </SelectTrigger>
                          <SelectContent>
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
                          value={gameForm.away_team_id}
                          onValueChange={(value) => setGameForm({ ...gameForm, away_team_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select away team" />
                          </SelectTrigger>
                          <SelectContent>
                            {league.teams?.filter(t => t.id !== gameForm.home_team_id).map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={!gameForm.home_team_id || !gameForm.away_team_id}>
                        Create Game
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {games.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  {league.teams?.length < 2 
                    ? 'Add at least 2 teams to create games.' 
                    : 'No games scheduled yet.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: game.away_team.color }}
                          />
                          <span className="font-medium">{game.away_team.name}</span>
                        </div>
                        <span className="text-slate-400">@</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: game.home_team.color }}
                          />
                          <span className="font-medium">{game.home_team.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {game.status === 'final' ? (
                          <div className="text-lg font-bold">
                            {game.away_score} - {game.home_score}
                          </div>
                        ) : game.status === 'live' ? (
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                            <span className="font-bold text-red-600">LIVE</span>
                            <span className="text-lg font-bold">
                              {game.away_score} - {game.home_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Scheduled</span>
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
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/share/game/${game.share_code}`
                              )
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <Button size="sm" className="gap-2" disabled={league.teams?.length < 2}>
                    <Plus className="h-4 w-4" />
                    New Bracket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateBracket}>
                    <DialogHeader>
                      <DialogTitle>Create Bracket</DialogTitle>
                      <DialogDescription>Set up a playoff bracket.</DialogDescription>
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
                      <div className="grid gap-2">
                        <Label>Number of Teams</Label>
                        <Select
                          value={bracketForm.num_teams}
                          onValueChange={(value) => setBracketForm({ ...bracketForm, num_teams: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Teams</SelectItem>
                            <SelectItem value="4">4 Teams</SelectItem>
                            <SelectItem value="8">8 Teams</SelectItem>
                            <SelectItem value="16">16 Teams</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Bracket</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {brackets.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  {league.teams?.length < 2 
                    ? 'Add at least 2 teams to create brackets.' 
                    : 'No brackets created yet.'}
                </p>
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
                              navigator.clipboard.writeText(
                                `${window.location.origin}/share/bracket/${bracket.share_code}`
                              )
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
      </Tabs>
    </div>
  )
}
