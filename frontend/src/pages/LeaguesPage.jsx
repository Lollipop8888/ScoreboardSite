import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Trophy, Calendar, ChevronRight, Pencil, Trash2, MoreVertical, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
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
  const { username } = useParams() // For /u/:username route
  const { user } = useAuth()
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingLeague, setEditingLeague] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    season: '',
  })

  // Viewing another user's leagues (read-only)
  const isViewingOtherUser = !!username
  // Can edit if viewing own leagues (not another user's)
  const canEdit = !isViewingOtherUser

  // Reload leagues when user changes (login/logout) or username param changes
  useEffect(() => {
    loadLeagues()
  }, [user, username])

  async function loadLeagues() {
    setLoading(true)
    setError(null)
    try {
      let data
      if (username) {
        // Viewing another user's leagues
        data = await leagueApi.getByUsername(username)
      } else {
        // Viewing own leagues
        data = await leagueApi.getAll()
      }
      setLeagues(data)
    } catch (error) {
      console.error('Failed to load leagues:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await leagueApi.create(formData)
      setDialogOpen(false)
      setFormData({ name: '', season: '' })
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
      setFormData({ name: '', season: '' })
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

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {error === 'User not found' ? 'User Not Found' : 'Error'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {error === 'User not found' 
            ? `The user "${username}" does not exist.`
            : error}
        </p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {isViewingOtherUser ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-5 w-5 text-slate-400" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{username}'s Leagues</h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400">Public leagues shared by {username}</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Leagues</h1>
              <p className="text-slate-600 dark:text-slate-400">Manage your leagues and seasons</p>
            </>
          )}
        </div>
        {canEdit && (
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
        )}
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
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {isViewingOtherUser 
                ? 'No public leagues'
                : user ? 'No leagues yet' : 'Sign in to view your leagues'}
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {isViewingOtherUser
                ? `${username} hasn't created any leagues yet.`
                : user 
                  ? 'Create your first league to get started.' 
                  : 'Create an account or sign in to manage your leagues. Your data is private and only visible to you.'}
            </p>
            {canEdit && user && (
              <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create League
              </Button>
            )}
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
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {league.season}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              {/* Edit/Delete dropdown - only show for own leagues */}
              {canEdit && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background" onClick={(e) => e.preventDefault()}>
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
