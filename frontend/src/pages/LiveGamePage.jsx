import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Minus, Play, Square, Share2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { gameApi, createWebSocket } from '@/lib/api'

const QUARTERS = ['Q1', 'Q2', 'Halftime', 'Q3', 'Q4', 'OT', 'Final']

export default function LiveGamePage() {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const loadGame = useCallback(async () => {
    try {
      const data = await gameApi.get(gameId)
      setGame(data)
    } catch (error) {
      console.error('Failed to load game:', error)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    loadGame()
  }, [loadGame])

  useEffect(() => {
    if (!game?.share_code) return

    const ws = createWebSocket('game', game.share_code, (message) => {
      if (message.type === 'game_update') {
        setGame((prev) => ({ ...prev, ...message.data }))
      }
    })

    return () => ws.close()
  }, [game?.share_code])

  async function updateGame(updates) {
    try {
      await gameApi.update(gameId, updates)
    } catch (error) {
      console.error('Failed to update game:', error)
    }
  }

  async function updateScore(team, delta) {
    const field = team === 'home' ? 'home_score' : 'away_score'
    const currentScore = team === 'home' ? game.home_score : game.away_score
    const newScore = Math.max(0, currentScore + delta)
    await updateGame({ [field]: newScore })
  }

  async function startGame() {
    await updateGame({ status: 'live', quarter: 'Q1', game_time: '15:00' })
  }

  async function endGame() {
    await updateGame({ status: 'final', quarter: 'Final' })
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/game/${game.share_code}`
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

  if (!game) {
    return <div className="text-center py-12">Game not found</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {game.status === 'live' && (
            <>
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="font-bold text-red-600">LIVE</span>
            </>
          )}
          {game.status === 'final' && (
            <span className="font-bold text-slate-600">FINAL</span>
          )}
          {game.status === 'scheduled' && (
            <span className="text-slate-500">Scheduled</span>
          )}
          {game.quarter && game.status !== 'scheduled' && (
            <span className="text-slate-600">• {game.quarter}</span>
          )}
          {game.game_time && game.status === 'live' && game.quarter !== 'Halftime' && (
            <span className="text-slate-600">• {game.game_time}</span>
          )}
        </div>
        <Button variant="outline" className="gap-2" onClick={copyShareLink}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </div>

      {/* Main Scoreboard */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-3">
          {/* Away Team */}
          <div className="p-6 text-center" style={{ backgroundColor: `${game.away_team.color}15` }}>
            <div
              className="mx-auto mb-4 h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: game.away_team.color }}
            >
              {game.away_team.abbreviation || game.away_team.name.substring(0, 2).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{game.away_team.name}</h2>
            <p className="text-sm text-slate-500">Away</p>
            <div className="mt-4 text-6xl font-bold" style={{ color: game.away_team.color }}>
              {game.away_score}
            </div>
            {game.status !== 'final' && (
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => updateScore('away', -1)}
                  disabled={game.status === 'scheduled'}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => updateScore('away', 1)}
                  disabled={game.status === 'scheduled'}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Center - VS / Controls */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50">
            <div className="text-4xl font-bold text-slate-300 mb-6">VS</div>
            
            {game.status === 'scheduled' && (
              <Button size="lg" className="gap-2" onClick={startGame}>
                <Play className="h-5 w-5" />
                Start Game
              </Button>
            )}

            {game.status === 'live' && (
              <div className="space-y-4 w-full max-w-[200px]">
                <div className="grid gap-2">
                  <Label>Quarter/Period</Label>
                  <Select
                    value={game.quarter}
                    onValueChange={(value) => updateGame({ quarter: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Time</Label>
                  <Input
                    value={game.game_time || ''}
                    onChange={(e) => updateGame({ game_time: e.target.value })}
                    placeholder="15:00"
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={endGame}
                >
                  <Square className="h-4 w-4" />
                  End Game
                </Button>
              </div>
            )}

            {game.status === 'final' && (
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-600">Game Over</p>
                <p className="text-sm text-slate-500">
                  {game.away_score > game.home_score
                    ? `${game.away_team.name} wins!`
                    : game.home_score > game.away_score
                    ? `${game.home_team.name} wins!`
                    : 'Tie game!'}
                </p>
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="p-6 text-center" style={{ backgroundColor: `${game.home_team.color}15` }}>
            <div
              className="mx-auto mb-4 h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: game.home_team.color }}
            >
              {game.home_team.abbreviation || game.home_team.name.substring(0, 2).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{game.home_team.name}</h2>
            <p className="text-sm text-slate-500">Home</p>
            <div className="mt-4 text-6xl font-bold" style={{ color: game.home_team.color }}>
              {game.home_score}
            </div>
            {game.status !== 'final' && (
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => updateScore('home', -1)}
                  disabled={game.status === 'scheduled'}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => updateScore('home', 1)}
                  disabled={game.status === 'scheduled'}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Share Code */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-slate-700">Share Code</p>
              <p className="text-2xl font-bold tracking-wider text-primary">{game.share_code}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Quick Score Buttons */}
      {game.status === 'live' && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Quick Score</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">{game.away_team.name}</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 6, 7].map((points) => (
                    <Button
                      key={points}
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore('away', points)}
                    >
                      +{points}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">{game.home_team.name}</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 6, 7].map((points) => (
                    <Button
                      key={points}
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore('home', points)}
                    >
                      +{points}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
