import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trophy, ChevronRight, Trash2, Upload, X } from 'lucide-react'
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
import { standaloneGameApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export default function ScoreboardsPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    home_name: '',
    home_abbreviation: '',
    home_color: '#3B82F6',
    home_color2: '#1E40AF',
    home_color3: '',
    home_logo_url: '',
    home_logo_file: null,
    home_logo_preview: null,
    away_name: '',
    away_abbreviation: '',
    away_color: '#EF4444',
    away_color2: '#991B1B',
    away_color3: '',
    away_logo_url: '',
    away_logo_file: null,
    away_logo_preview: null,
    simple_mode: false,
  })
  const homeLogoRef = useRef(null)
  const awayLogoRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadGames()
  }, [user])

  async function loadGames() {
    try {
      const data = await standaloneGameApi.getAll()
      setGames(data)
    } catch (error) {
      console.error('Failed to load games:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleLogoSelect(team, file) {
    if (!file) return
    const preview = URL.createObjectURL(file)
    if (team === 'home') {
      setFormData(prev => ({ ...prev, home_logo_file: file, home_logo_preview: preview, home_logo_url: '' }))
    } else {
      setFormData(prev => ({ ...prev, away_logo_file: file, away_logo_preview: preview, away_logo_url: '' }))
    }
  }

  function clearLogo(team) {
    if (team === 'home') {
      if (formData.home_logo_preview) URL.revokeObjectURL(formData.home_logo_preview)
      setFormData(prev => ({ ...prev, home_logo_file: null, home_logo_preview: null, home_logo_url: '' }))
      if (homeLogoRef.current) homeLogoRef.current.value = ''
    } else {
      if (formData.away_logo_preview) URL.revokeObjectURL(formData.away_logo_preview)
      setFormData(prev => ({ ...prev, away_logo_file: null, away_logo_preview: null, away_logo_url: '' }))
      if (awayLogoRef.current) awayLogoRef.current.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const game = await standaloneGameApi.create({
        home_name: formData.home_name || 'Home',
        home_abbreviation: formData.home_abbreviation || formData.home_name?.substring(0, 3).toUpperCase() || 'HME',
        home_color: formData.home_color,
        home_color2: formData.home_color2 || null,
        home_color3: formData.home_color3 || null,
        home_logo_url: formData.home_logo_url || null,
        away_name: formData.away_name || 'Away',
        away_abbreviation: formData.away_abbreviation || formData.away_name?.substring(0, 3).toUpperCase() || 'AWY',
        away_color: formData.away_color,
        away_color2: formData.away_color2 || null,
        away_color3: formData.away_color3 || null,
        away_logo_url: formData.away_logo_url || null,
        simple_mode: formData.simple_mode,
      })

      // Upload logos if files were selected
      if (formData.home_logo_file) {
        await standaloneGameApi.uploadLogo(game.id, 'home', formData.home_logo_file)
      }
      if (formData.away_logo_file) {
        await standaloneGameApi.uploadLogo(game.id, 'away', formData.away_logo_file)
      }

      setDialogOpen(false)
      // Clean up preview URLs
      if (formData.home_logo_preview) URL.revokeObjectURL(formData.home_logo_preview)
      if (formData.away_logo_preview) URL.revokeObjectURL(formData.away_logo_preview)
      setFormData({
        home_name: '',
        home_abbreviation: '',
        home_color: '#3B82F6',
        home_color2: '#1E40AF',
        home_color3: '',
        home_logo_url: '',
        home_logo_file: null,
        home_logo_preview: null,
        away_name: '',
        away_abbreviation: '',
        away_color: '#EF4444',
        away_color2: '#991B1B',
        away_color3: '',
        away_logo_url: '',
        away_logo_file: null,
        away_logo_preview: null,
        simple_mode: false,
      })
      // Navigate to the game controller
      navigate(`/standalone/${game.id}`)
    } catch (error) {
      console.error('Failed to create game:', error)
    }
  }

  async function handleDelete(e, gameId) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this game?')) return
    try {
      await standaloneGameApi.delete(gameId)
      loadGames()
    } catch (error) {
      console.error('Failed to delete game:', error)
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quick Games</h1>
          <p className="text-slate-600 dark:text-slate-400">Standalone football games - no league required</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Game
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Quick Game</DialogTitle>
                <DialogDescription>
                  Set up the two teams for your game. You can edit team details later.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Away Team */}
                <div className="space-y-3 p-3 rounded-lg border">
                  <Label className="text-sm font-semibold">Away Team</Label>
                  <div className="flex gap-3">
                    {/* Logo upload */}
                    <div className="flex-shrink-0">
                      <input
                        ref={awayLogoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoSelect('away', e.target.files[0])}
                      />
                      {formData.away_logo_preview ? (
                        <div className="relative">
                          <img 
                            src={formData.away_logo_preview} 
                            alt="Away logo" 
                            className="h-16 w-16 object-contain rounded border bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => clearLogo('away')}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => awayLogoRef.current?.click()}
                          className="h-16 w-16 border-2 border-dashed rounded flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500"
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-[10px]">Logo</span>
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Team Name (e.g., Eagles)"
                        value={formData.away_name}
                        onChange={(e) => setFormData({ ...formData, away_name: e.target.value })}
                      />
                      <Input
                        placeholder="Abbreviation (e.g., PHI)"
                        value={formData.away_abbreviation}
                        onChange={(e) => setFormData({ ...formData, away_abbreviation: e.target.value.toUpperCase() })}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Primary *</Label>
                      <Input
                        type="color"
                        value={formData.away_color}
                        onChange={(e) => setFormData({ ...formData, away_color: e.target.value })}
                        className="h-8 w-full p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Secondary *</Label>
                      <Input
                        type="color"
                        value={formData.away_color2}
                        onChange={(e) => setFormData({ ...formData, away_color2: e.target.value })}
                        className="h-8 w-full p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Accent</Label>
                      <Input
                        type="color"
                        value={formData.away_color3 || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, away_color3: e.target.value })}
                        className="h-8 w-full p-1 opacity-60"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Home Team */}
                <div className="space-y-3 p-3 rounded-lg border">
                  <Label className="text-sm font-semibold">Home Team</Label>
                  <div className="flex gap-3">
                    {/* Logo upload */}
                    <div className="flex-shrink-0">
                      <input
                        ref={homeLogoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoSelect('home', e.target.files[0])}
                      />
                      {formData.home_logo_preview ? (
                        <div className="relative">
                          <img 
                            src={formData.home_logo_preview} 
                            alt="Home logo" 
                            className="h-16 w-16 object-contain rounded border bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => clearLogo('home')}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => homeLogoRef.current?.click()}
                          className="h-16 w-16 border-2 border-dashed rounded flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500"
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-[10px]">Logo</span>
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Team Name (e.g., Cowboys)"
                        value={formData.home_name}
                        onChange={(e) => setFormData({ ...formData, home_name: e.target.value })}
                      />
                      <Input
                        placeholder="Abbreviation (e.g., DAL)"
                        value={formData.home_abbreviation}
                        onChange={(e) => setFormData({ ...formData, home_abbreviation: e.target.value.toUpperCase() })}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Primary *</Label>
                      <Input
                        type="color"
                        value={formData.home_color}
                        onChange={(e) => setFormData({ ...formData, home_color: e.target.value })}
                        className="h-8 w-full p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Secondary *</Label>
                      <Input
                        type="color"
                        value={formData.home_color2}
                        onChange={(e) => setFormData({ ...formData, home_color2: e.target.value })}
                        className="h-8 w-full p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Accent</Label>
                      <Input
                        type="color"
                        value={formData.home_color3 || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, home_color3: e.target.value })}
                        className="h-8 w-full p-1 opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Simple Mode Toggle */}
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800">
                  <input
                    type="checkbox"
                    id="simple-mode"
                    checked={formData.simple_mode}
                    onChange={(e) => setFormData({ ...formData, simple_mode: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <Label htmlFor="simple-mode" className="cursor-pointer font-medium">
                      Simple Mode
                    </Label>
                    <p className="text-xs text-slate-500">
                      Just teams, scores, and a toggleable timer. No quarters, downs, or football-specific features.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Game</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!user && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>Note:</strong> Sign in to save your games and access them later.
            </p>
          </CardContent>
        </Card>
      )}

      {games.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Trophy className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No games yet</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Create your first quick game to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link key={game.id} to={`/standalone/${game.id}`}>
              <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      {game.simple_mode && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                          SIMPLE
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        game.status === 'live' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                        game.status === 'final' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      }`}>
                        {game.status === 'live' ? 'LIVE' : game.status === 'final' ? 'FINAL' : 'SCHEDULED'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        onClick={(e) => handleDelete(e, game.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mt-2">
                    {/* Away Team */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: game.away_team?.color || '#6B7280' }}
                      >
                        {game.away_team?.abbreviation?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{game.away_team?.abbreviation || 'AWY'}</p>
                        <p className="text-xs text-slate-500">{game.away_team?.name || 'Away'}</p>
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {game.away_score} - {game.home_score}
                      </p>
                      {game.quarter && (
                        <p className="text-xs text-slate-500">{game.quarter} {game.game_time}</p>
                      )}
                    </div>
                    
                    {/* Home Team */}
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-sm text-right">{game.home_team?.abbreviation || 'HME'}</p>
                        <p className="text-xs text-slate-500 text-right">{game.home_team?.name || 'Home'}</p>
                      </div>
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: game.home_team?.color || '#3B82F6' }}
                      >
                        {game.home_team?.abbreviation?.charAt(0) || 'H'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
