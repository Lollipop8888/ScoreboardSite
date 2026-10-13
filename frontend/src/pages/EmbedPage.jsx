import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { GameScoreboardDisplay } from '@/components/GameScoreboardDisplay'
import { gameApi, standaloneGameApi, createWebSocket } from '@/lib/api'

// Embeddable live scoreboard for other websites: <iframe src="https://gridironscore.com/embed/CODE">
export default function EmbedPage() {
  const { code } = useParams()
  const shareCode = code?.toUpperCase()
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    gameApi.getByShareCode(shareCode).catch(() => standaloneGameApi.getByShareCode(shareCode))
      .then(setGame).catch(() => setError('Game not found'))
    const ws = createWebSocket('game', shareCode, (message) => {
      if (message.type === 'game_update' && message.data) setGame(prev => prev ? { ...prev, ...message.data } : prev)
    })
    return () => ws.close()
  }, [shareCode])

  if (error) return <p className="p-4 text-center text-sm text-slate-500">{error}</p>
  if (!game) return null
  let displayState = {}
  try { displayState = typeof game.display_state === 'string' ? JSON.parse(game.display_state || '{}') : (game.display_state || {}) } catch { /* ignore */ }

  return (
    <div className="min-h-screen bg-transparent p-2">
      <GameScoreboardDisplay
        game={game}
        displayState={displayState}
        possession={game.possession}
        down={game.down}
        distance={game.distance}
        playClock={game.play_clock}
        homeTimeouts={game.home_timeouts}
        awayTimeouts={game.away_timeouts}
        gameStatus={displayState.gameStatus || (game.quarter === 'Pregame' ? 'pregame' : game.quarter === 'Final' ? 'final' : null)}
      />
      <a href={`${window.location.origin}/share/game/${shareCode}`} target="_blank" rel="noopener noreferrer"
         className="block text-center text-xs text-slate-400 hover:text-slate-600 mt-1">
        View on GridIron
      </a>
    </div>
  )
}
