import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trophy, Calendar, ChevronRight, Pencil, Trash2, MoreVertical } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { leagueApi } from '@/lib/api'

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingLeague, setEditingLeague] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    season: '',
  })

  useEffect(() => {
    loadLeagues()
  }, [])

  async function loadLeagues() {
    try {
      const data = await leagueApi.getAll()
      setLeagues(data)
    } catch (error) {
      console.error('Failed to load leagues:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await leagueApi.create(formData)
      setDialogOpen(false)
      setFormData({ name: '', sport: '', season: '' })
      loadLeagues()
    } catch (error) {
      console.error('Failed to create league:', error)
    }
  }

  function openEditDialog(league, e) {
    e.preventDefault()
    e.stopPropagation()
    setEditingLeague(league)
    setFormData({
      name: league.name,
      sport: league.sport,
      season: league.season,
    })
    setEditDialogOpen(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    try {
      await leagueApi.update(editingLeague.id, formData)
      setEditDialogOpen(false)
      setEditingLeague(null)
      setFormData({ name: '', sport: '', season: '' })
      loadLeagues()
    } catch (error) {
      console.error('Failed to update league:', error)
    }
  }

  async function handleDelete(league, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${league.name}"? This will also delete all teams, games, and brackets in this league.`)) return
    try {
      await leagueApi.delete(league.id)
      // Remove from local state immediately for better UX
      setLeagues(prev => prev.filter(l => l.id !== league.id))
    } catch (error) {
      console.error('Failed to delete league:', error)
      alert('Failed to delete league: ' + error.message)
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
          <h1 className="text-3xl font-bold text-slate-900">Leagues</h1>
          <p className="text-slate-600">Manage your leagues and seasons</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New League
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New League</DialogTitle>
                <DialogDescription>
                  Set up a new league to track teams, games, and standings.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">League Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., NFL 2024"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Input
                    id="sport"
                    placeholder="e.g., Football"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="season">Season</Label>
                  <Input
                    id="season"
                    placeholder="e.g., 2024-2025"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create League</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit League Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit League</DialogTitle>
              <DialogDescription>
                Update the league details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">League Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., NFL 2024"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sport">Sport</Label>
                <Input
                  id="edit-sport"
                  placeholder="e.g., Football"
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-season">Season</Label>
                <Input
                  id="edit-season"
                  placeholder="e.g., 2024-2025"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {leagues.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Trophy className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No leagues yet</h3>
            <p className="mt-2 text-slate-600">Create your first league to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <div key={league.id} className="relative group">
              <Link to={`/leagues/${league.id}`}>
                <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <CardTitle className="mt-4">{league.name}</CardTitle>
                    <CardDescription>{league.sport}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>{league.season}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {/* Edit/Delete dropdown */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white" onClick={(e) => e.preventDefault()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => openEditDialog(league, e)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(league, e)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
