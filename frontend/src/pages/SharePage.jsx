import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Share2, Trophy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { gameApi, bracketApi, scoreboardApi, createWebSocket } from '@/lib/api'

export default function SharePage() {
  const { type, code } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    try {
      let result
      switch (type) {
        case 'game':
          result = await gameApi.getByShareCode(code)
          break
        case 'bracket':
          result = await bracketApi.getByShareCode(code)
          break
        case 'scoreboard':
          result = await scoreboardApi.getByShareCode(code)
          break
        default:
          throw new Error('Invalid share type')
      }
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [type, code])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!data) return

    const ws = createWebSocket(type, code, (message) => {
      if (type === 'game' && message.type === 'game_update') {
        setData((prev) => ({ ...prev, ...message.data }))
      } else if (type === 'scoreboard') {
        if (message.type === 'player_updated') {
          setData((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === message.data.id ? { ...p, ...message.data } : p
            ),
          }))
        } else if (message.type === 'player_added') {
          setData((prev) => ({
            ...prev,
            players: [...prev.players, message.data],
          }))
        } else if (message.type === 'player_removed') {
          setData((prev) => ({
            ...prev,
            players: prev.players.filter((p) => p.id !== message.data.id),
          }))
        }
      } else if (type === 'bracket' && message.type === 'bracket_update') {
        loadData()
      }
    })

    return () => ws.close()
  }, [data, type, code, loadData])

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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Not Found</h2>
        <p className="text-slate-600 mb-4">The shared content could not be found.</p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  // Render based on type
  if (type === 'game') {
    return <SharedGame game={data} />
  }

  if (type === 'scoreboard') {
    return <SharedScoreboard scoreboard={data} />
  }

  if (type === 'bracket') {
    return <SharedBracket bracket={data} />
  }

  return null
}

function SharedGame({ game }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Status */}
      <div className="flex items-center justify-center gap-3">
        {game.status === 'live' && (
          <>
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="font-bold text-red-600 text-lg">LIVE</span>
          </>
        )}
        {game.status === 'final' && (
          <span className="font-bold text-slate-600 text-lg">FINAL</span>
        )}
        {game.quarter && game.status !== 'scheduled' && (
          <span className="text-slate-600">• {game.quarter}</span>
        )}
        {game.game_time && game.status === 'live' && (
          <span className="text-slate-600">• {game.game_time}</span>
        )}
      </div>

      {/* Scoreboard */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-3">
          {/* Away Team */}
          <div className="p-6 text-center" style={{ backgroundColor: `${game.away_team.color}15` }}>
            <div
              className="mx-auto mb-3 h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: game.away_team.color }}
            >
              {game.away_team.abbreviation || game.away_team.name.substring(0, 2).toUpperCase()}
            </div>
            <h2 className="font-bold text-slate-900">{game.away_team.name}</h2>
            <div className="mt-3 text-5xl font-bold" style={{ color: game.away_team.color }}>
              {game.away_score}
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center bg-slate-50">
            <span className="text-3xl font-bold text-slate-300">VS</span>
          </div>

          {/* Home Team */}
          <div className="p-6 text-center" style={{ backgroundColor: `${game.home_team.color}15` }}>
            <div
              className="mx-auto mb-3 h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: game.home_team.color }}
            >
              {game.home_team.abbreviation || game.home_team.name.substring(0, 2).toUpperCase()}
            </div>
            <h2 className="font-bold text-slate-900">{game.home_team.name}</h2>
            <div className="mt-3 text-5xl font-bold" style={{ color: game.home_team.color }}>
              {game.home_score}
            </div>
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-slate-500">
        Watching live • Updates automatically
      </p>
    </div>
  )
}

function SharedScoreboard({ scoreboard }) {
  const sortedPlayers = [...(scoreboard.players || [])].sort((a, b) => b.score - a.score)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">{scoreboard.name}</h1>
        {scoreboard.description && (
          <p className="text-slate-600 mt-1">{scoreboard.description}</p>
        )}
      </div>

      {sortedPlayers.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-slate-500">No players yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <Card
              key={player.id}
              className="overflow-hidden"
              style={{ borderLeftColor: player.color, borderLeftWidth: '4px' }}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-slate-300 w-8">
                    #{index + 1}
                  </div>
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-lg">{player.name}</span>
                </div>
                <div className="text-4xl font-bold" style={{ color: player.color }}>
                  {player.score}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-slate-500">
        Watching live • Updates automatically
      </p>
    </div>
  )
}

function SharedBracket({ bracket }) {
  const matchesByRound = {}
  bracket.matches?.forEach((match) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = []
    }
    matchesByRound[match.round_number].push(match)
  })

  const rounds = Object.keys(matchesByRound).sort((a, b) => a - b)
  const numRounds = rounds.length

  const getRoundName = (roundNum, total) => {
    const remaining = total - roundNum + 1
    if (remaining === 1) return 'Finals'
    if (remaining === 2) return 'Semifinals'
    if (remaining === 3) return 'Quarterfinals'
    return `Round ${roundNum}`
  }

  const finalMatch = bracket.matches?.find(m => m.round_number === numRounds)
  const champion = finalMatch?.winner

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">{bracket.name}</h1>
        <p className="text-slate-600">
          {bracket.num_teams} teams - {bracket.bracket_type.replace('_', ' ')}
        </p>
      </div>

      {champion && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 max-w-md mx-auto">
          <CardContent className="flex items-center justify-center gap-4 py-6">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-yellow-700">Champion</p>
              <p className="text-xl font-bold text-yellow-900">{champion.name}</p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-500" />
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max justify-center">
          {rounds.map((roundNum) => (
            <div key={roundNum} className="flex flex-col">
              <h3 className="text-sm font-semibold text-slate-600 mb-4 text-center">
                {getRoundName(parseInt(roundNum), numRounds)}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-4">
                {matchesByRound[roundNum]
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((match) => (
                    <div key={match.id} className="w-56">
                      <Card className={match.status === 'completed' ? 'bg-slate-50' : ''}>
                        <CardContent className="p-3 space-y-2">
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              match.winner?.id === match.team1?.id
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-slate-50'
                            }`}
                          >
                            <span className={`text-sm font-medium truncate ${
                              match.winner?.id === match.team1?.id ? 'text-green-700' : ''
                            }`}>
                              {match.team1?.name || 'TBD'}
                            </span>
                            <span className="font-bold">{match.team1_score}</span>
                          </div>
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              match.winner?.id === match.team2?.id
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-slate-50'
                            }`}
                          >
                            <span className={`text-sm font-medium truncate ${
                              match.winner?.id === match.team2?.id ? 'text-green-700' : ''
                            }`}>
                              {match.team2?.name || 'TBD'}
                            </span>
                            <span className="font-bold">{match.team2_score}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Watching live • Updates automatically
      </p>
    </div>
  )
}
