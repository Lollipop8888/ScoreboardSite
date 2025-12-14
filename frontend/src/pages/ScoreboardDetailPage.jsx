import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Minus, Share2, Trash2, Copy, Check, RotateCcw, Settings, Trophy, ArrowUpDown, Pencil, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnimatedScore } from '@/components/ui/animated-score'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { scoreboardApi, createWebSocket } from '@/lib/api'

// Football scoring options
const SCORING_OPTIONS = [
  { label: 'TD', points: 6, color: 'bg-green-600 hover:bg-green-700' },
  { label: 'PAT', points: 1, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: '2PT', points: 2, color: 'bg-purple-600 hover:bg-purple-700' },
  { label: 'FG', points: 3, color: 'bg-yellow-600 hover:bg-yellow-700' },
  { label: 'Safety', points: 2, color: 'bg-red-600 hover:bg-red-700' },
]

// Preset team colors
const PRESET_COLORS = [
  '#DC2626', // Red
  '#2563EB', // Blue
  '#16A34A', // Green
  '#CA8A04', // Yellow
  '#9333EA', // Purple
  '#EA580C', // Orange
  '#0891B2', // Cyan
  '#DB2777', // Pink
  '#1F2937', // Dark Gray
  '#7C3AED', // Violet
]

export default function ScoreboardDetailPage() {
  const { scoreboardId } = useParams()
  const [scoreboard, setScoreboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editScoreboardOpen, setEditScoreboardOpen] = useState(false)
  const [editPlayerOpen, setEditPlayerOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [copied, setCopied] = useState(false)
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' or 'asc' or 'none'
  const [playerForm, setPlayerForm] = useState({ name: '', score: 0, color: '#DC2626' })
  const [editPlayerForm, setEditPlayerForm] = useState({ name: '', color: '#DC2626' })
  const [scoreboardForm, setScoreboardForm] = useState({ name: '', description: '' })
  const [customIncrement, setCustomIncrement] = useState(1)

  const loadScoreboard = useCallback(async () => {
    try {
      const data = await scoreboardApi.get(scoreboardId)
      setScoreboard(data)
    } catch (error) {
      console.error('Failed to load scoreboard:', error)
    } finally {
      setLoading(false)
    }
  }, [scoreboardId])

  useEffect(() => {
    loadScoreboard()
  }, [loadScoreboard])

  useEffect(() => {
    if (!scoreboard?.share_code) return

    const ws = createWebSocket('scoreboard', scoreboard.share_code, (message) => {
      if (message.type === 'player_updated') {
        setScoreboard((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === message.data.id ? { ...p, ...message.data } : p
          ),
        }))
      } else if (message.type === 'player_added') {
        setScoreboard((prev) => ({
          ...prev,
          players: [...prev.players, message.data],
        }))
      } else if (message.type === 'player_removed') {
        setScoreboard((prev) => ({
          ...prev,
          players: prev.players.filter((p) => p.id !== message.data.id),
        }))
      }
    })

    return () => ws.close()
  }, [scoreboard?.share_code])

  async function handleAddPlayer(e) {
    e.preventDefault()
    try {
      await scoreboardApi.addPlayer(scoreboardId, playerForm)
      setDialogOpen(false)
      // Cycle to next preset color
      const currentIndex = PRESET_COLORS.indexOf(playerForm.color)
      const nextColor = PRESET_COLORS[(currentIndex + 1) % PRESET_COLORS.length]
      setPlayerForm({ name: '', score: 0, color: nextColor })
      loadScoreboard()
    } catch (error) {
      console.error('Failed to add player:', error)
    }
  }

  async function updateScore(playerId, delta) {
    const player = scoreboard.players.find((p) => p.id === playerId)
    if (!player) return

    try {
      await scoreboardApi.updatePlayer(playerId, { score: player.score + delta })
    } catch (error) {
      console.error('Failed to update score:', error)
    }
  }

  async function setScore(playerId, newScore) {
    try {
      await scoreboardApi.updatePlayer(playerId, { score: newScore })
    } catch (error) {
      console.error('Failed to set score:', error)
    }
  }

  async function resetAllScores() {
    if (!confirm('Reset all scores to 0?')) return
    try {
      await Promise.all(
        scoreboard.players.map((p) => scoreboardApi.updatePlayer(p.id, { score: 0 }))
      )
      loadScoreboard()
    } catch (error) {
      console.error('Failed to reset scores:', error)
    }
  }

  async function deletePlayer(playerId) {
    if (!confirm('Remove this team/player?')) return
    try {
      await scoreboardApi.deletePlayer(playerId)
      loadScoreboard()
    } catch (error) {
      console.error('Failed to delete player:', error)
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/scoreboard/${scoreboard.share_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openEditScoreboard() {
    setScoreboardForm({
      name: scoreboard.name,
      description: scoreboard.description || ''
    })
    setEditScoreboardOpen(true)
  }

  async function handleEditScoreboard(e) {
    e.preventDefault()
    try {
      await scoreboardApi.update(scoreboardId, scoreboardForm)
      setEditScoreboardOpen(false)
      loadScoreboard()
    } catch (error) {
      console.error('Failed to update scoreboard:', error)
    }
  }

  function openEditPlayer(player) {
    setEditingPlayer(player)
    setEditPlayerForm({
      name: player.name,
      color: player.color
    })
    setEditPlayerOpen(true)
  }

  async function handleEditPlayer(e) {
    e.preventDefault()
    if (!editingPlayer) return
    try {
      await scoreboardApi.updatePlayer(editingPlayer.id, editPlayerForm)
      setEditPlayerOpen(false)
      setEditingPlayer(null)
      loadScoreboard()
    } catch (error) {
      console.error('Failed to update player:', error)
    }
  }

  function toggleSortOrder() {
    setSortOrder((prev) => {
      if (prev === 'desc') return 'asc'
      if (prev === 'asc') return 'none'
      return 'desc'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (!scoreboard) {
    return <div className="text-center py-12">Scoreboard not found</div>
  }

  // Sort players based on sort order
  let sortedPlayers = [...(scoreboard.players || [])]
  if (sortOrder === 'desc') {
    sortedPlayers.sort((a, b) => b.score - a.score)
  } else if (sortOrder === 'asc') {
    sortedPlayers.sort((a, b) => a.score - b.score)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{scoreboard.name}</h1>
            {scoreboard.description && (
              <p className="text-slate-600 dark:text-slate-400">{scoreboard.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={openEditScoreboard} className="text-slate-400 hover:text-blue-600 h-8 w-8 mt-1">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleSortOrder} className="gap-1">
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'desc' ? 'High→Low' : sortOrder === 'asc' ? 'Low→High' : 'Unsorted'}
          </Button>
          <Button variant="outline" size="sm" onClick={resetAllScores} className="gap-1 text-orange-600 hover:text-orange-700">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={copyShareLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddPlayer}>
                <DialogHeader>
                  <DialogTitle>Add Team/Player</DialogTitle>
                  <DialogDescription>Add a new team or player to the scoreboard.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="player-name">Team/Player Name</Label>
                    <Input
                      id="player-name"
                      placeholder="e.g., Chiefs, Patriots, Team A"
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Team Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPlayerForm({ ...playerForm, color })}
                          className={`h-8 w-8 rounded-full border-2 transition-transform ${
                            playerForm.color === color ? 'border-slate-900 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="color"
                        value={playerForm.color}
                        onChange={(e) => setPlayerForm({ ...playerForm, color: e.target.value })}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={playerForm.color}
                        onChange={(e) => setPlayerForm({ ...playerForm, color: e.target.value })}
                        placeholder="#DC2626"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="starting-score">Starting Score</Label>
                    <Input
                      id="starting-score"
                      type="number"
                      value={playerForm.score}
                      onChange={(e) => setPlayerForm({ ...playerForm, score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">Add Team</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Share Code Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Share2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Share this scoreboard</p>
              <p className="text-2xl font-bold tracking-wider text-green-700">{scoreboard.share_code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyShareLink} className="border-green-600 text-green-700">
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Football Quick Score Buttons */}
      <Card className="bg-slate-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Quick Score (Football)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SCORING_OPTIONS.map((opt) => (
              <div key={opt.label} className={`${opt.color} px-3 py-1.5 rounded-full text-sm font-semibold`}>
                {opt.label} +{opt.points}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-2">Click a team below, then use these buttons to add points</p>
        </CardContent>
      </Card>

      {/* Scoreboard */}
      {sortedPlayers.length === 0 ? (
        <Card className="py-12 text-center border-2 border-dashed">
          <CardContent>
            <Trophy className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">No teams yet</p>
            <p className="text-slate-400 text-sm mt-1">Add teams to start tracking scores</p>
            <Button 
              className="mt-4 bg-green-600 hover:bg-green-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPlayers.map((player, index) => (
            <Card
              key={player.id}
              className="overflow-hidden transition-all hover:shadow-lg"
            >
              <div className="flex flex-col lg:flex-row">
                {/* Team Info & Score */}
                <div 
                  className="flex items-center gap-4 p-4 lg:p-6 flex-1"
                  style={{ borderLeftWidth: '6px', borderLeftColor: player.color }}
                >
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 && sortOrder === 'desc' ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 && sortOrder === 'desc' ? 'bg-slate-300 text-slate-700' :
                    index === 2 && sortOrder === 'desc' ? 'bg-amber-600 text-white' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {sortOrder !== 'none' ? index + 1 : '-'}
                  </div>
                  
                  {/* Team Avatar */}
                  <div
                    className="flex-shrink-0 h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  
                  {/* Team Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{player.name}</h3>
                    {sortOrder !== 'none' && (
                      <p className="text-sm text-slate-500">
                        {index === 0 && sortOrder === 'desc' ? '🏆 Leading' : `Rank #${index + 1}`}
                      </p>
                    )}
                  </div>
                  
                  {/* Score Display */}
                  <AnimatedScore 
                    score={player.score} 
                    color={player.color} 
                    size="lg"
                  />
                </div>
                
                {/* Score Controls */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 flex flex-col gap-3 lg:w-80">
                  {/* Football scoring buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {SCORING_OPTIONS.map((opt) => (
                      <Button
                        key={opt.label}
                        size="sm"
                        className={`${opt.color} text-white font-semibold`}
                        onClick={() => updateScore(player.id, opt.points)}
                      >
                        +{opt.points} {opt.label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Basic +/- controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(player.id, -1)}
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4 mr-1" /> 1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(player.id, 1)}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-1" /> 1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScore(player.id, 0)}
                      className="text-orange-600"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditPlayer(player)}
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlayer(player.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Custom increment */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={customIncrement}
                      onChange={(e) => setCustomIncrement(parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(player.id, -customIncrement)}
                      className="flex-1"
                    >
                      -{customIncrement}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(player.id, customIncrement)}
                      className="flex-1"
                    >
                      +{customIncrement}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Scoreboard Dialog */}
      <Dialog open={editScoreboardOpen} onOpenChange={setEditScoreboardOpen}>
        <DialogContent>
          <form onSubmit={handleEditScoreboard}>
            <DialogHeader>
              <DialogTitle>Edit Scoreboard</DialogTitle>
              <DialogDescription>Update the scoreboard name and description.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="scoreboard-name">Scoreboard Name</Label>
                <Input
                  id="scoreboard-name"
                  placeholder="e.g., Sunday Game"
                  value={scoreboardForm.name}
                  onChange={(e) => setScoreboardForm({ ...scoreboardForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scoreboard-description">Description (optional)</Label>
                <Input
                  id="scoreboard-description"
                  placeholder="e.g., Week 5 matchup"
                  value={scoreboardForm.description}
                  onChange={(e) => setScoreboardForm({ ...scoreboardForm, description: e.target.value })}
                />
              </div>
              
              {/* Logo Upload */}
              <div className="grid gap-2">
                <Label>Display Logo (optional)</Label>
                {scoreboard.logo_url ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="flex items-center gap-3">
                      <img 
                        src={scoreboard.logo_url} 
                        alt="Scoreboard logo" 
                        className="h-12 w-auto max-w-24 object-contain"
                      />
                      <span className="text-sm text-slate-500">Logo uploaded</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={async () => {
                        try {
                          await scoreboardApi.deleteLogo(scoreboardId)
                          loadScoreboard()
                        } catch (error) {
                          console.error('Failed to delete logo:', error)
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="scoreboard-logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0]
                        if (!file) return
                        try {
                          const result = await scoreboardApi.uploadLogo(scoreboardId, file)
                          setScoreboard(prev => ({ ...prev, logo_url: result.logo_url }))
                        } catch (error) {
                          console.error('Failed to upload logo:', error)
                          alert('Failed to upload logo: ' + error.message)
                        }
                        e.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('scoreboard-logo-upload').click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">Logo will appear in the top right of the display</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditScoreboardOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={editPlayerOpen} onOpenChange={setEditPlayerOpen}>
        <DialogContent>
          <form onSubmit={handleEditPlayer}>
            <DialogHeader>
              <DialogTitle>Edit Team/Player</DialogTitle>
              <DialogDescription>Update the team name and color.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-player-name">Team/Player Name</Label>
                <Input
                  id="edit-player-name"
                  placeholder="e.g., Chiefs"
                  value={editPlayerForm.name}
                  onChange={(e) => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Team Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditPlayerForm({ ...editPlayerForm, color })}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        editPlayerForm.color === color ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={editPlayerForm.color}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, color: e.target.value })}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={editPlayerForm.color}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, color: e.target.value })}
                    placeholder="#DC2626"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPlayerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
