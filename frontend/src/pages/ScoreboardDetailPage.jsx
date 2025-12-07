import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Minus, Share2, Trash2, Copy, Check } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { scoreboardApi, createWebSocket } from '@/lib/api'

export default function ScoreboardDetailPage() {
  const { scoreboardId } = useParams()
  const [scoreboard, setScoreboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [playerForm, setPlayerForm] = useState({ name: '', score: 0, color: '#3B82F6' })

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
      setPlayerForm({ name: '', score: 0, color: '#3B82F6' })
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

  async function deletePlayer(playerId) {
    if (!confirm('Are you sure you want to remove this player?')) return
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!scoreboard) {
    return <div className="text-center py-12">Scoreboard not found</div>
  }

  // Sort players by score descending
  const sortedPlayers = [...(scoreboard.players || [])].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{scoreboard.name}</h1>
          {scoreboard.description && (
            <p className="text-slate-600">{scoreboard.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={copyShareLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddPlayer}>
                <DialogHeader>
                  <DialogTitle>Add Player</DialogTitle>
                  <DialogDescription>Add a new player to the scoreboard.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="player-name">Player Name</Label>
                    <Input
                      id="player-name"
                      placeholder="Enter player name"
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="player-color">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="player-color"
                        type="color"
                        value={playerForm.color}
                        onChange={(e) => setPlayerForm({ ...playerForm, color: e.target.value })}
                        className="h-10 w-20 p-1"
                      />
                      <Input
                        value={playerForm.color}
                        onChange={(e) => setPlayerForm({ ...playerForm, color: e.target.value })}
                        placeholder="#3B82F6"
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
                  <Button type="submit">Add Player</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Share Code */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-slate-700">Share Code</p>
              <p className="text-2xl font-bold tracking-wider text-primary">{scoreboard.share_code}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Scoreboard */}
      {sortedPlayers.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-slate-500">No players yet. Add players to start tracking scores.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlayers.map((player, index) => (
            <Card
              key={player.id}
              className="relative overflow-hidden"
              style={{ borderLeftColor: player.color, borderLeftWidth: '4px' }}
            >
              {index === 0 && sortedPlayers.length > 1 && (
                <div className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-yellow-900">
                  #1
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{player.name}</CardTitle>
                    <CardDescription>Rank #{index + 1}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-5xl font-bold" style={{ color: player.color }}>
                    {player.score}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateScore(player.id, -1)}
                      className="h-12 w-12"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateScore(player.id, 1)}
                      className="h-12 w-12"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePlayer(player.id)}
                      className="h-12 w-12 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
