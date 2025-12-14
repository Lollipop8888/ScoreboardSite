import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Trophy, Users, Calendar, GitBranch, Share2, Trash2, Play, Upload, X, Pencil, Copy, Check, Settings } from 'lucide-react'
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
import { QRCodeSVG } from 'qrcode.react'

export default function LeagueDetailPage() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const [league, setLeague] = useState(null)
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [brackets, setBrackets] = useState([])
  const [loading, setLoading] = useState(true)
  const [gamesFilter, setGamesFilter] = useState('scheduled') // 'scheduled', 'current', 'completed'
  
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
  const [gameForm, setGameForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '' })
  const [gameEditForm, setGameEditForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '' })
  const [bracketForm, setBracketForm] = useState({ name: '', num_teams: 4, layout: 'one_sided', team_ids: [], is_playoff: false })
  const [bracketSlots, setBracketSlots] = useState([]) // Array of team IDs or 'BYE' for each slot

  useEffect(() => {
    loadData()
  }, [leagueId])

  async function loadData() {
    try {
      // First get the league - this is required
      const leagueData = await leagueApi.get(leagueId)
      setLeague(leagueData)
      
      // Then get the rest - these can fail without breaking the page
      try {
        const [standingsData, gamesData, bracketsData] = await Promise.all([
          leagueApi.getStandings(leagueId),
          leagueApi.getGames(leagueId),
          leagueApi.getBrackets(leagueId),
        ])
        setStandings(standingsData || [])
        setGames(gamesData || [])
        setBrackets(bracketsData || [])
      } catch (err) {
        console.error('Failed to load additional data:', err)
        setStandings([])
        setGames([])
        setBrackets([])
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
      await teamApi.update(editingStatsTeam.id, statsForm)
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
      // datetime-local gives us a string like "2025-12-11T19:00"
      // We need to treat this as Eastern Time and convert to UTC for storage
      let scheduledAtISO = null
      if (gameForm.scheduled_at) {
        // Append seconds and ET timezone offset
        // Note: This assumes Eastern Time. For proper handling, we'd need a timezone library
        const dateStr = gameForm.scheduled_at + ':00'
        scheduledAtISO = dateStr // Send as-is, backend will handle
      }
      
      const gameData = { 
        ...gameForm, 
        league_id: leagueId,
        scheduled_at: scheduledAtISO
      }
      await gameApi.create(gameData)
      setGameDialogOpen(false)
      setGameForm({ home_team_id: '', away_team_id: '', scheduled_at: '' })
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
    // Convert stored date to datetime-local format
    let scheduledAt = ''
    if (game.scheduled_at) {
      // Treat stored time as UTC and format for datetime-local input
      const date = new Date(game.scheduled_at + 'Z')
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      scheduledAt = `${year}-${month}-${day}T${hours}:${minutes}`
    }
    setGameEditForm({
      home_team_id: game.home_team?.id || '',
      away_team_id: game.away_team?.id || '',
      scheduled_at: scheduledAt
    })
    setGameEditDialogOpen(true)
  }

  async function handleUpdateGame(e) {
    e.preventDefault()
    if (!editingGame) return
    try {
      // Send the datetime as-is (it's already in the format the backend expects)
      // The datetime-local input gives us "YYYY-MM-DDTHH:MM" format
      await gameApi.update(editingGame.id, {
        home_team_id: gameEditForm.home_team_id,
        away_team_id: gameEditForm.away_team_id,
        scheduled_at: gameEditForm.scheduled_at ? gameEditForm.scheduled_at + ':00' : null
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
  function openShareDialog(type, code, name) {
    setShareInfo({ type, code, name })
    setCopied(false)
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{league.name}</h1>
            {league.is_finished && (
              <span className="px-3 py-1 text-sm font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-full flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                COMPLETED
              </span>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400">{league.sport} - {league.season}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => openShareDialog('league', league.share_code, league.name)}
        >
          <Share2 className="h-4 w-4" />
          Share League
        </Button>
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
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
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
                        <th className="pb-3 pr-4 text-center">PCT</th>
                        {league?.has_groups && <th className="pb-3 pr-4 text-center">{league.group_label_2 || 'Div'} Rank</th>}
                        <th className="pb-3 pr-4 text-center">PF</th>
                        <th className="pb-3 pr-4 text-center">PA</th>
                        <th className="pb-3 pr-4 text-center">Diff</th>
                        <th className="pb-3 text-center">Edit</th>
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
                          <td className="py-3 pr-4 text-center font-semibold text-blue-600">
                            {(() => {
                              const totalGames = (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
                              if (totalGames === 0) return '—'
                              const winPct = ((team.wins || 0) + (team.ties || 0) * 0.5) / totalGames
                              return (winPct * 100).toFixed(0) + '%'
                            })()}
                          </td>
                          {/* Division Rank */}
                          {league?.has_groups && (
                            <td className="py-3 pr-4 text-center">
                              {team.group_1 && team.group_2 ? (
                                <span className="text-purple-600 font-medium">
                                  {(() => {
                                    const divTeams = standings.filter(t => t.group_1 === team.group_1 && t.group_2 === team.group_2)
                                    const sorted = [...divTeams].sort((a, b) => {
                                      const aTotal = (a.wins || 0) + (a.losses || 0) + (a.ties || 0)
                                      const bTotal = (b.wins || 0) + (b.losses || 0) + (b.ties || 0)
                                      const aWinPct = aTotal > 0 ? ((a.wins || 0) + (a.ties || 0) * 0.5) / aTotal : 0
                                      const bWinPct = bTotal > 0 ? ((b.wins || 0) + (b.ties || 0) * 0.5) / bTotal : 0
                                      if (bWinPct !== aWinPct) return bWinPct - aWinPct
                                      return (b.wins || 0) - (a.wins || 0)
                                    })
                                    const rank = sorted.findIndex(t => t.id === team.id) + 1
                                    return `#${rank} ${team.group_1} ${team.group_2}`
                                  })()}
                                </span>
                              ) : '—'}
                            </td>
                          )}
                          <td className="py-3 pr-4 text-center">{team.points_for}</td>
                          <td className="py-3 pr-4 text-center">{team.points_against}</td>
                          <td className="py-3 pr-4 text-center">
                            <span className={team.points_for - team.points_against >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {team.points_for - team.points_against >= 0 ? '+' : ''}{team.points_for - team.points_against}
                            </span>
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
                <p className="text-center text-slate-500 py-8">No teams yet. Add your first team.</p>
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
                      <div className="grid gap-2">
                        <Label>Scheduled Time (Optional)</Label>
                        <Input
                          type="datetime-local"
                          value={gameForm.scheduled_at}
                          onChange={(e) => setGameForm({ ...gameForm, scheduled_at: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Leave empty for unscheduled games</p>
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
                  Scheduled ({games.filter(g => g.status === 'scheduled').length})
                </button>
                <button
                  onClick={() => setGamesFilter('current')}
                  className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                    gamesFilter === 'current'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Live ({games.filter(g => g.status === 'live').length})
                </button>
                <button
                  onClick={() => setGamesFilter('completed')}
                  className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                    gamesFilter === 'completed'
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Completed ({games.filter(g => g.status === 'final' || g.quarter === 'Final').length})
                </button>
              </div>

              {(() => {
                const filteredGames = games.filter(game => {
                  if (gamesFilter === 'scheduled') return game.status === 'scheduled'
                  if (gamesFilter === 'current') return game.status === 'live'
                  if (gamesFilter === 'completed') return game.status === 'final' || game.quarter === 'Final'
                  return true
                })

                if (games.length === 0) {
                  return (
                    <p className="text-center text-slate-500 py-8">
                      {league.teams?.length < 2 
                        ? 'Add at least 2 teams to create games.' 
                        : 'No games scheduled yet.'}
                    </p>
                  )
                }

                if (filteredGames.length === 0) {
                  return (
                    <p className="text-center text-slate-500 py-8">
                      No {gamesFilter === 'current' ? 'live' : gamesFilter} games.
                    </p>
                  )
                }

                return (
                  <div className="space-y-3">
                    {filteredGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: game.away_team?.color || '#888' }}
                            />
                            <span className="font-medium">{game.away_team?.name || 'TBD'}</span>
                          </div>
                          <span className="text-slate-400">@</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: game.home_team?.color || '#888' }}
                            />
                            <span className="font-medium">{game.home_team?.name || 'TBD'}</span>
                          </div>
                        </div>
                        {game.scheduled_at && (
                          <span className="text-xs text-slate-500">
                            📅 {new Date(game.scheduled_at + 'Z').toLocaleDateString('en-US', { timeZone: 'UTC' })} at {new Date(game.scheduled_at + 'Z').toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
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
                  ))}
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
          {/* League Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>League Information</CardTitle>
              <CardDescription>Basic league details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="league-name">League Name</Label>
                  <Input
                    id="league-name"
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
                  <Label htmlFor="league-sport">Sport</Label>
                  <Input
                    id="league-sport"
                    defaultValue={league.sport}
                    onBlur={async (e) => {
                      if (e.target.value && e.target.value !== league.sport) {
                        try {
                          await leagueApi.update(leagueId, { sport: e.target.value })
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
                          sport: league.sport,
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
                            sport: league.sport,
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
                          loadLeague()
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
                          loadLeague()
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
                value={gameEditForm.home_team_id}
                onValueChange={(value) => setGameEditForm({ ...gameEditForm, home_team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select home team" />
                </SelectTrigger>
                <SelectContent>
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
                value={gameEditForm.away_team_id}
                onValueChange={(value) => setGameEditForm({ ...gameEditForm, away_team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select away team" />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Scheduled Time (Eastern Time)</Label>
              <Input
                type="datetime-local"
                value={gameEditForm.scheduled_at}
                onChange={(e) => setGameEditForm({ ...gameEditForm, scheduled_at: e.target.value })}
              />
              <p className="text-xs text-slate-500">Leave empty for unscheduled games. Times are in ET.</p>
            </div>
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
