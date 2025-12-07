import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, LayoutGrid, Users, ChevronRight } from 'lucide-react'
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
import { scoreboardApi } from '@/lib/api'

export default function ScoreboardsPage() {
  const [scoreboards, setScoreboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    players: [{ name: '', score: 0, color: '#3B82F6' }],
  })

  useEffect(() => {
    loadScoreboards()
  }, [])

  async function loadScoreboards() {
    try {
      const data = await scoreboardApi.getAll()
      setScoreboards(data)
    } catch (error) {
      console.error('Failed to load scoreboards:', error)
    } finally {
      setLoading(false)
    }
  }

  function addPlayer() {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
    setFormData({
      ...formData,
      players: [
        ...formData.players,
        { name: '', score: 0, color: colors[formData.players.length % colors.length] },
      ],
    })
  }

  function updatePlayer(index, field, value) {
    const newPlayers = [...formData.players]
    newPlayers[index] = { ...newPlayers[index], [field]: value }
    setFormData({ ...formData, players: newPlayers })
  }

  function removePlayer(index) {
    if (formData.players.length <= 1) return
    const newPlayers = formData.players.filter((_, i) => i !== index)
    setFormData({ ...formData, players: newPlayers })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const validPlayers = formData.players.filter(p => p.name.trim())
      await scoreboardApi.create({
        ...formData,
        players: validPlayers,
      })
      setDialogOpen(false)
      setFormData({
        name: '',
        description: '',
        players: [{ name: '', score: 0, color: '#3B82F6' }],
      })
      loadScoreboards()
    } catch (error) {
      console.error('Failed to create scoreboard:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Scoreboards</h1>
          <p className="text-slate-600">Quick scoreboards for any game or activity</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Scoreboard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Scoreboard</DialogTitle>
                <DialogDescription>
                  Create a shareable scoreboard for tracking scores.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="name">Scoreboard Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Game Night Scores"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Friday poker night"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Players</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addPlayer}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Player
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.players.map((player, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          type="color"
                          value={player.color}
                          onChange={(e) => updatePlayer(index, 'color', e.target.value)}
                          className="h-10 w-12 p-1"
                        />
                        <Input
                          placeholder={`Player ${index + 1}`}
                          value={player.name}
                          onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        {formData.players.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlayer(index)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Scoreboard</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {scoreboards.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <LayoutGrid className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No scoreboards yet</h3>
            <p className="mt-2 text-slate-600">Create your first scoreboard to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scoreboards.map((scoreboard) => (
            <Link key={scoreboard.id} to={`/scoreboards/${scoreboard.id}`}>
              <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                  <CardTitle className="mt-4">{scoreboard.name}</CardTitle>
                  {scoreboard.description && (
                    <CardDescription>{scoreboard.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="h-4 w-4" />
                    <span>{scoreboard.players?.length || 0} players</span>
                  </div>
                  {scoreboard.players?.length > 0 && (
                    <div className="mt-3 flex -space-x-2">
                      {scoreboard.players.slice(0, 5).map((player) => (
                        <div
                          key={player.id}
                          className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: player.color }}
                          title={player.name}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {scoreboard.players.length > 5 && (
                        <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                          +{scoreboard.players.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
