import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Share2, Trophy, ExternalLink, Users, Calendar, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GameScoreboardDisplay } from '@/components/GameScoreboardDisplay'
import { gameApi, standaloneGameApi, bracketApi, scoreboardApi, leagueApi, createWebSocket } from '@/lib/api'
import { QRCodeSVG } from 'qrcode.react'

export default function SharePage() {
  const { type, code } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewerCount, setViewerCount] = useState(0)
  // Live chat and reactions (game share pages)
  const [chat, setChat] = useState({ enabled: false, messages: [] })
  const [floatingReactions, setFloatingReactions] = useState([])
  const wsRef = useRef(null)

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
      if (message.type === 'viewer_count') {
        setViewerCount(message.count)
      } else if (type === 'game' && message.type === 'chat_state') {
        setChat({ enabled: !!message.enabled, messages: message.messages || [] })
      } else if (type === 'game' && message.type === 'chat' && message.message) {
        setChat(prev => ({ ...prev, messages: [...prev.messages, message.message].slice(-50) }))
      } else if (type === 'game' && message.type === 'reaction' && message.emoji) {
        const item = { id: `${Date.now()}-${Math.random()}`, emoji: message.emoji, left: 10 + Math.random() * 80 }
        setFloatingReactions(prev => [...prev, item].slice(-30))
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== item.id)), 2600)
      } else if (type === 'game' && message.type === 'game_update') {
        console.log('[SharePage WS] Received game_update:', message.data)
        if (message.data.notification) {
          console.log('[SharePage WS] Notification in update:', message.data.notification)
        }
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

    wsRef.current = ws
    return () => { ws.close(); wsRef.current = null }
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
    return (
      <SharedGame
        game={data}
        viewerCount={viewerCount}
        chat={chat}
        floatingReactions={floatingReactions}
        send={(message) => wsRef.current?.send(message)}
      />
    )
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

// Reusable Share Button with Dialog
function ShareButtonWithDialog({ type, code, name }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const shareUrl = `${window.location.origin}/share/${type}/${code}`
  const typeLabel = type === 'game' ? 'Game' : type === 'league' ? 'League' : type === 'bracket' ? 'Bracket' : 'Scoreboard'
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share {typeLabel}</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Share Code */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Share Code</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 text-center">
                  <span className="text-2xl font-bold font-mono tracking-wider">{code}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(code)}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Share Link */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Share Link</Label>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={shareUrl}
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(shareUrl)}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Embed code for other websites (games) */}
            {type === 'game' && (() => {
              const embed = `<iframe src="${window.location.origin}/embed/${code}" width="100%" height="420" style="border:0" title="Live score"></iframe>`
              return (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">Embed on a website</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={embed} className="text-xs font-mono" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(embed)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* QR Code */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm text-slate-500">QR Code</Label>
              <div className="flex justify-center p-4 bg-white dark:bg-slate-200 rounded-lg">
                <QRCodeSVG 
                  value={shareUrl}
                  size={150}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                Scan to view the live {typeLabel.toLowerCase()}
              </p>
            </div>
            
            {/* OBS URL for games */}
            {type === 'game' && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm text-slate-500">OBS Browser Source URL</Label>
                <Input 
                  readOnly 
                  value={`${window.location.origin}/obs/${code}`}
                  className="text-xs font-mono"
                />
                <p className="text-xs text-slate-400">
                  Add <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">?compact=true</code> for scorebug style
                </p>
              </div>
            )}
            
            {/* Share via Email/SMS */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm text-slate-500">Share via</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const subject = encodeURIComponent(`Watch: ${name}`)
                    const body = encodeURIComponent(`Check out this ${typeLabel.toLowerCase()}!\n\n${name}\nShare Code: ${code}\n\nView here: ${shareUrl}`)
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                  }}
                >
                  📧 Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const message = encodeURIComponent(`Check out this ${typeLabel.toLowerCase()}! ${name}\n\nCode: ${code}\n${shareUrl}`)
                    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                      window.open(`sms:?body=${message}`, '_blank')
                    } else {
                      copyToClipboard(decodeURIComponent(message))
                    }
                  }}
                >
                  💬 Text/SMS
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    const text = encodeURIComponent(`${name} 🏈`)
                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420')
                  }}
                >
                  𝕏
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420')
                  }}
                >
                  📘
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    const text = encodeURIComponent(`${name} 🏈 ${shareUrl}`)
                    window.open(`https://wa.me/?text=${text}`, '_blank')
                  }}
                >
                  💚
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SharedGame({ game, viewerCount, chat, floatingReactions, send }) {
  const [notification, setNotification] = useState(null)
  const [notificationVisible, setNotificationVisible] = useState(false)
  const lastNotificationIdRef = useRef(null)
  
  // Handle incoming notifications
  useEffect(() => {
    console.log('[SharePage] game.notification changed:', game?.notification)
    if (game?.notification && game.notification.id !== lastNotificationIdRef.current) {
      console.log('[SharePage] Showing notification:', game.notification)
      lastNotificationIdRef.current = game.notification.id
      setNotification(game.notification)
      setNotificationVisible(true)
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setNotificationVisible(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [game?.notification])

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

  return (
    <div className="max-w-2xl mx-auto space-y-4 relative">
      {/* Notification Toast */}
      {notificationVisible && notification && (
        <div 
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl animate-bounce-in max-w-md ${
            notification.type === 'score' ? 'bg-gradient-to-r from-green-600 to-green-500 text-white' :
            notification.type === 'touchdown' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
            notification.type === 'turnover' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white' :
            notification.type === 'custom' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' :
            'bg-gradient-to-r from-slate-800 to-slate-700 text-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">
              {notification.type === 'score' ? '🏈' :
               notification.type === 'touchdown' ? '🎉' :
               notification.type === 'turnover' ? '🔄' :
               '🔔'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">{notification.title || 'Notification'}</p>
              {notification.message && (
                <p className="text-sm opacity-90 mt-0.5">{notification.message}</p>
              )}
            </div>
            <button 
              onClick={() => setNotificationVisible(false)}
              className="text-white/70 hover:text-white flex-shrink-0 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <GameScoreboardDisplay 
        game={game}
        displayState={displayState}
        possession={game.possession}
        down={game.down}
        distance={game.distance}
        playClock={game.play_clock}
        homeTimeouts={game.home_timeouts}
        awayTimeouts={game.away_timeouts}
        gameStatus={gameStatus}
        viewerCount={viewerCount}
      />
      <PickEm game={game} />
      <FanZone chat={chat} floatingReactions={floatingReactions} send={send} />
      {(game.status === 'final' || game.quarter?.startsWith('Final')) && game.home_team && game.away_team && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => shareFinalCard(game).catch(() => alert('Could not make the image'))}>📸 Final card</Button>
        </div>
      )}
      <div className="flex items-center justify-center gap-4">
        <p className="text-sm text-slate-500">
          Watching live • Updates automatically
        </p>
        <ShareButtonWithDialog 
          type="game" 
          code={game.share_code} 
          name={`${game.away_team?.name || 'Away'} vs ${game.home_team?.name || 'Home'}`} 
        />
      </div>
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

      <div className="flex items-center justify-center gap-4">
        <p className="text-sm text-slate-500">
          Watching live • Updates automatically
        </p>
        <ShareButtonWithDialog 
          type="scoreboard" 
          code={scoreboard.share_code} 
          name={scoreboard.name} 
        />
      </div>
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

      <div className="flex items-center justify-center gap-4">
        <p className="text-sm text-slate-500">
          Watching live • Updates automatically
        </p>
        <ShareButtonWithDialog 
          type="bracket" 
          code={bracket.share_code} 
          name={bracket.name} 
        />
      </div>
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
        <div className="mt-3">
          <ShareButtonWithDialog 
            type="league" 
            code={league.share_code} 
            name={league.name} 
          />
        </div>
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
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
                      ) : (
                        <div
                          className="h-4 w-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                      )}
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
                          {game.away_team?.logo_url ? (
                            <img src={game.away_team.logo_url} alt="" className="h-4 w-4 object-contain" />
                          ) : (
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: game.away_team?.color }}
                            />
                          )}
                          <span className="font-medium text-sm">{game.away_team?.abbreviation || 'TBD'}</span>
                        </div>
                        <span className="font-bold">{game.away_score}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          {game.home_team?.logo_url ? (
                            <img src={game.home_team.logo_url} alt="" className="h-4 w-4 object-contain" />
                          ) : (
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: game.home_team?.color }}
                            />
                          )}
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

// Pick'em: viewers pick a winner before kickoff. One pick per browser, changeable until the game starts.
function PickEm({ game }) {
  const code = game.share_code?.toUpperCase()
  const open = game.status === 'scheduled' || !game.quarter || game.quarter === 'Pregame'
  const [myPick, setMyPick] = useState(() => {
    try { return localStorage.getItem(`pick_${code}`) } catch { return null }
  })
  const [error, setError] = useState('')
  if (!open || !code || !game.home_team || !game.away_team) return null

  const voterKey = () => {
    try {
      let key = localStorage.getItem('gridiron_voter_key')
      if (!key) {
        key = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
        localStorage.setItem('gridiron_voter_key', key)
      }
      return key
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
  }

  async function pick(team) {
    setError('')
    try {
      const res = await fetch(`/api/picks/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, voter_key: voterKey() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Could not save your pick')
      setMyPick(team)
      try { localStorage.setItem(`pick_${code}`, team) } catch { /* ignore */ }
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-3 text-center space-y-2">
      <p className="text-sm font-semibold">Who wins? Make your pick before kickoff</p>
      <div className="grid grid-cols-2 gap-2">
        {['away', 'home'].map(side => {
          const team = side === 'home' ? game.home_team : game.away_team
          const chosen = myPick === side
          return (
            <Button
              key={side}
              variant={chosen ? 'default' : 'outline'}
              className="gap-2"
              style={chosen ? { backgroundColor: team.color, borderColor: team.color } : undefined}
              onClick={() => pick(side)}
            >
              {team.logo_url && <img src={team.logo_url} alt="" className="h-5 w-auto" />}
              {team.name}{chosen ? ' ✓' : ''}
            </Button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Fan zone: emoji reactions (always on) and live chat (when the game's scorer turns it on)
const REACTION_EMOJI = ['🔥', '👏', '😱', '🏈', '🎉', '😤']
function FanZone({ chat, floatingReactions, send }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('gridiron_chat_name') || '' } catch { return '' } })
  const [text, setText] = useState('')
  const listRef = useRef(null)
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [chat.messages.length])

  const sendChat = () => {
    const t = text.trim()
    if (!t) return
    try { localStorage.setItem('gridiron_chat_name', name.trim()) } catch { /* ignore */ }
    send({ type: 'chat', name: name.trim() || 'Fan', text: t })
    setText('')
  }

  return (
    <>
      {/* Reactions floating up the screen */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floatingReactions.map(r => (
          <span key={r.id} className="absolute bottom-4 text-4xl animate-float-up" style={{ left: `${r.left}%` }}>{r.emoji}</span>
        ))}
      </div>
      <div className="rounded-xl border bg-white dark:bg-slate-900 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {REACTION_EMOJI.map(e => (
            <button key={e} className="text-2xl rounded-full px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition" onClick={() => send({ type: 'reaction', emoji: e })}>
              {e}
            </button>
          ))}
        </div>
        {chat.enabled && (
          <div className="space-y-2 border-t pt-3">
            <div ref={listRef} className="max-h-60 overflow-y-auto space-y-1 text-sm">
              {chat.messages.length === 0 && <p className="text-center text-slate-400 text-xs">No messages yet - say something!</p>}
              {chat.messages.map(m => (
                <p key={m.id} className="break-words"><span className="font-semibold">{m.name}:</span> {m.text}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="Name" className="w-24 shrink-0" />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 200))}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
                placeholder="Message"
              />
              <Button onClick={sendChat} disabled={!text.trim()}>Send</Button>
            </div>
            <p className="text-[11px] text-slate-400">Be nice. Messages aren't saved, and the game's scorer can clear the chat.</p>
          </div>
        )}
      </div>
    </>
  )
}

// Final card: a social-media-sized image of the result, drawn in the browser
async function shareFinalCard(game) {
  const W = 1200, H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const home = game.home_team, away = game.away_team
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, away.color || '#334155')
  bg.addColorStop(0.42, '#020617')
  bg.addColorStop(0.58, '#020617')
  bg.addColorStop(1, home.color || '#334155')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const loadImage = (src) => new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
    setTimeout(() => resolve(null), 4000)
  })
  const [awayLogo, homeLogo] = await Promise.all([loadImage(away.logo_url), loadImage(home.logo_url)])
  const drawLogo = (img, cx, team) => {
    const box = 200
    if (img) {
      const scale = Math.min(box / img.width, box / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, cx - w / 2, 150 + (box - h) / 2, w, h)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 96px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(team.abbreviation || '', cx, 290)
    }
  }
  drawLogo(awayLogo, 230, away)
  drawLogo(homeLogo, W - 230, home)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 34px sans-serif'
  ctx.fillText((game.quarter && game.quarter.startsWith('Final') ? game.quarter : 'FINAL').toUpperCase(), W / 2, 110)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText(away.name, 230, 410)
  ctx.fillText(home.name, W - 230, 410)
  ctx.font = 'bold 150px sans-serif'
  const awayWon = game.away_score > game.home_score, homeWon = game.home_score > game.away_score
  ctx.globalAlpha = homeWon ? 0.6 : 1
  ctx.fillText(String(game.away_score), W / 2 - 130, 330)
  ctx.globalAlpha = awayWon ? 0.6 : 1
  ctx.fillText(String(game.home_score), W / 2 + 130, 330)
  ctx.globalAlpha = 1
  ctx.font = 'bold 60px sans-serif'
  ctx.fillText('-', W / 2, 310)

  // A line of quick stats when the game was scored here
  let state = {}
  try { state = typeof game.display_state === 'string' ? JSON.parse(game.display_state || '{}') : (game.display_state || {}) } catch { /* ignore */ }
  const qs = state.quickStats, top = state.timeOfPossession
  if (qs?.home && qs?.away) {
    const fmt = (sec = 0) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
    const parts = [`First downs ${qs.away.firstDowns || 0}-${qs.home.firstDowns || 0}`, `Turnovers ${qs.away.turnovers || 0}-${qs.home.turnovers || 0}`]
    if (top) parts.push(`Possession ${fmt(top.away)}-${fmt(top.home)}`)
    ctx.font = '28px sans-serif'
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText(parts.join('  ·  '), W / 2, 500)
  }
  ctx.font = '24px sans-serif'
  ctx.fillStyle = '#94a3b8'
  const when = game.scheduled_at ? new Date(game.scheduled_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : ''
  ctx.fillText([when, window.location.host].filter(Boolean).join('  ·  '), W / 2, 580)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], `${away.abbreviation || 'away'}-${home.abbreviation || 'home'}-final.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `${away.name} ${game.away_score}, ${home.name} ${game.home_score}` }).catch(() => {})
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
