import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Share2, Trophy, ExternalLink, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GameScoreboardDisplay } from '@/components/GameScoreboardDisplay'
import { gameApi, standaloneGameApi, bracketApi, scoreboardApi, leagueApi, createWebSocket } from '@/lib/api'

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
          // Try league game first, then standalone game
          try {
            result = await gameApi.getByShareCode(code)
          } catch (err) {
            result = await standaloneGameApi.getByShareCode(code)
          }
          break
        case 'bracket':
          result = await bracketApi.getByShareCode(code)
          break
        case 'scoreboard':
          result = await scoreboardApi.getByShareCode(code)
          break
        case 'league':
          result = await leagueApi.getByShareCode(code)
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

    const ws = createWebSocket(type, code.toUpperCase(), (message) => {
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
  }, [data?.id, type, code, loadData])

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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">The shared content could not be found.</p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  // Handle case where data is null but no error
  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">The shared content could not be found.</p>
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

  if (type === 'league') {
    return <SharedLeague league={data} />
  }

  return null
}

function SharedGame({ game }) {
  const [liveGameTime, setLiveGameTime] = useState(null)
  
  // Live clock calculation - update every second when timer is running
  useEffect(() => {
    if (!game?.timer_running || !game?.timer_started_at || game?.timer_started_seconds === null) {
      setLiveGameTime(null)
      return
    }
    
    const calculateLiveTime = () => {
      const startedAt = new Date(game.timer_started_at)
      const now = new Date()
      const elapsedSeconds = Math.floor((now - startedAt) / 1000)
      const currentSeconds = Math.max(0, game.timer_started_seconds - elapsedSeconds)
      const mins = Math.floor(currentSeconds / 60)
      const secs = currentSeconds % 60
      setLiveGameTime(`${mins}:${secs.toString().padStart(2, '0')}`)
    }
    
    // Calculate immediately
    calculateLiveTime()
    
    // Update every second
    const interval = setInterval(calculateLiveTime, 1000)
    
    return () => clearInterval(interval)
  }, [game?.timer_running, game?.timer_started_at, game?.timer_started_seconds])

  // Parse display state from JSON - handle both string and object
  let displayState = {}
  try {
    if (typeof game.display_state === 'string' && game.display_state) {
      displayState = JSON.parse(game.display_state)
    } else if (typeof game.display_state === 'object' && game.display_state) {
      displayState = game.display_state
    }
  } catch (e) {
    console.error('Failed to parse display_state:', e)
  }
  
  // Determine gameStatus - use displayState first, then fall back to quarter-based status
  const gameStatus = displayState.gameStatus || 
    (game.quarter === 'Pregame' ? 'pregame' : 
     game.quarter === 'Final' ? 'final' : 
     game.quarter === 'Halftime' ? 'halftime-show' : null)

  // Create game object with live time
  const gameWithLiveTime = liveGameTime ? { ...game, game_time: liveGameTime } : game

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <GameScoreboardDisplay 
        game={gameWithLiveTime}
        displayState={displayState}
        possession={game.possession}
        down={game.down}
        distance={game.distance}
        playClock={game.play_clock}
        homeTimeouts={game.home_timeouts}
        awayTimeouts={game.away_timeouts}
        gameStatus={gameStatus}
      />
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
      <div className="flex items-start justify-between">
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{scoreboard.name}</h1>
          {scoreboard.description && (
            <p className="text-slate-600 dark:text-slate-400 mt-1">{scoreboard.description}</p>
          )}
        </div>
        {scoreboard.logo_url && (
          <img 
            src={scoreboard.logo_url} 
            alt="Logo" 
            className="h-16 w-auto max-w-32 object-contain ml-4"
          />
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
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 text-center">
                {getRoundName(parseInt(roundNum), numRounds)}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-4">
                {matchesByRound[roundNum]
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((match) => (
                    <div key={match.id} className="w-56">
                      <Card className={match.status === 'completed' ? 'bg-slate-50 dark:bg-slate-800/50' : ''}>
                        <CardContent className="p-3 space-y-2">
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              match.winner?.id === match.team1?.id
                                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                                : 'bg-slate-50 dark:bg-slate-800'
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
                                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                                : 'bg-slate-50 dark:bg-slate-800'
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

function SharedLeague({ league }) {
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeagueData() {
      try {
        const [standingsData, gamesData] = await Promise.all([
          leagueApi.getStandings(league.id),
          leagueApi.getGames(league.id)
        ])
        setStandings(standingsData || [])
        setGames(gamesData || [])
      } catch (e) {
        console.error('Failed to load league data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadLeagueData()
  }, [league.id])

  // Sort games - upcoming first, then by date
  const sortedGames = [...games].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1
    if (b.status === 'live' && a.status !== 'live') return 1
    if (a.status === 'scheduled' && b.status === 'completed') return -1
    if (b.status === 'scheduled' && a.status === 'completed') return 1
    return new Date(a.scheduled_time || 0) - new Date(b.scheduled_time || 0)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{league.name}</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">{league.sport} - {league.season}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Standings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {standings.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No teams yet</p>
              ) : (
                <div className="space-y-2">
                  {standings.map((team, index) => (
                    <div key={team.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="font-bold text-slate-400 w-6">{index + 1}</span>
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-medium flex-1 truncate">{team.name}</span>
                      <span className="text-sm font-semibold text-green-600">{team.wins || 0}W</span>
                      <span className="text-sm font-semibold text-red-600">{team.losses || 0}L</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent/Upcoming Games */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedGames.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No games scheduled</p>
              ) : (
                <div className="space-y-3">
                  {sortedGames.slice(0, 10).map((game) => (
                    <div key={game.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: game.away_team?.color }}
                          />
                          <span className="font-medium text-sm">{game.away_team?.abbreviation || 'TBD'}</span>
                        </div>
                        <span className="font-bold">{game.away_score}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: game.home_team?.color }}
                          />
                          <span className="font-medium text-sm">{game.home_team?.abbreviation || 'TBD'}</span>
                        </div>
                        <span className="font-bold">{game.home_score}</span>
                      </div>
                      <div className="mt-2 text-xs text-center">
                        {game.status === 'live' ? (
                          <span className="text-red-500 font-semibold">● LIVE - {game.quarter}</span>
                        ) : game.status === 'completed' ? (
                          <span className="text-slate-500">Final</span>
                        ) : game.scheduled_time ? (
                          <span className="text-slate-500">
                            {new Date(game.scheduled_time).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">Scheduled</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teams */}
      {league.teams && league.teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {league.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="h-8 w-8 object-contain" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{team.name}</p>
                    {team.abbreviation && (
                      <p className="text-xs text-slate-500">{team.abbreviation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
