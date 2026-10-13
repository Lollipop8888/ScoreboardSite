import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GameScoreboardDisplay } from '@/components/GameScoreboardDisplay'
import { gameApi, standaloneGameApi, coScorerApi, createWebSocket } from '@/lib/api'
import { NFL_PENALTIES } from '@/lib/penalties'

// Co-scorer page: a helper with a private link runs some panels (clock, penalties, stats) from their
// own device. Actions go to the game's scoring page, which applies them, so it stays the source of truth.
export default function CoScorerPage() {
  const { code, token } = useParams()
  const shareCode = code?.toUpperCase()
  const [access, setAccess] = useState(null)
  const [error, setError] = useState('')
  const [game, setGame] = useState(null)
  const [sent, setSent] = useState('')
  const [penaltySearch, setPenaltySearch] = useState('')
  const [selection, setSelection] = useState([]) // { name, team }
  const [leaguePenalties, setLeaguePenalties] = useState([])

  useEffect(() => {
    coScorerApi.access(shareCode, token).then(setAccess).catch(e => setError(e.message))
  }, [shareCode, token])

  // Game and live updates (same as viewers)
  useEffect(() => {
    if (!access) return
    let ws
    const load = async () => {
      const g = await gameApi.getByShareCode(shareCode).catch(() => standaloneGameApi.getByShareCode(shareCode))
      setGame(g)
      if (g?.league_id) {
        fetch(`/api/leagues/${g.league_id}`).then(r => r.json()).then(league => {
          let list = league?.penalties
          try { list = typeof list === 'string' ? JSON.parse(list) : list } catch { list = [] }
          setLeaguePenalties((Array.isArray(list) ? list : []).filter(p => p && typeof p === 'object' && p.custom && p.name)
            .map(p => ({ name: p.name, yards: Number(p.yards) || 0, category: 'Custom' })))
        }).catch(() => {})
      }
    }
    load().catch(() => setError('Could not load the game'))
    ws = createWebSocket('game', shareCode, (message) => {
      if (message.type === 'game_update' && message.data) setGame(prev => prev ? { ...prev, ...message.data } : prev)
    })
    return () => ws?.close()
  }, [access, shareCode])

  async function send(action, payload = {}, note = '') {
    try {
      await coScorerApi.action(shareCode, token, action, payload)
      setSent(note || action.replace('_', ' '))
      setTimeout(() => setSent(''), 2000)
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) return <div className="max-w-md mx-auto mt-12 text-center text-red-600">{error}</div>
  if (!access || !game) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  const has = (panel) => access.panels.includes(panel)
  const home = game.home_team || {}
  const away = game.away_team || {}
  let displayState = {}
  try { displayState = typeof game.display_state === 'string' ? JSON.parse(game.display_state || '{}') : (game.display_state || {}) } catch { /* ignore */ }
  const quickStats = displayState.quickStats
  const penalties = [...NFL_PENALTIES, ...leaguePenalties.filter(lp => !NFL_PENALTIES.some(p => p.name === lp.name))]
    .filter(p => p.name.toLowerCase().includes(penaltySearch.toLowerCase()))

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">🎧 Co-scoring as {access.label}</h1>
        <span className="text-xs text-slate-500">Actions are applied on the main scoring page, which must be open.</span>
      </div>
      {sent && <div className="fixed top-20 right-4 z-50 rounded-lg bg-sky-600 text-white text-sm font-semibold px-3 py-2 shadow-lg">Sent: {sent}</div>}

      <GameScoreboardDisplay
        game={game}
        displayState={displayState}
        possession={game.possession}
        down={game.down}
        distance={game.distance}
        playClock={game.play_clock}
        homeTimeouts={game.home_timeouts}
        awayTimeouts={game.away_timeouts}
      />

      {has('clock') && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Clock</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full h-14 text-lg" onClick={() => send('clock_toggle', {}, 'start/stop clock')}>▶ / ⏸ Start or Stop Clock</Button>
            <div className="grid grid-cols-4 gap-2">
              {[-10, -1, 1, 10].map(n => (
                <Button key={n} variant="outline" className="h-11" onClick={() => send('clock_adjust', { seconds: n }, `${n > 0 ? '+' : ''}${n}s`)}>{n > 0 ? `+${n}` : n}s</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {has('penalties') && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">🚩 Penalties</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selection.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selection.map((p, i) => (
                  <button key={i} className="rounded-full bg-yellow-100 text-yellow-900 px-3 py-1 text-sm" onClick={() => setSelection(sel => sel.filter((_, j) => j !== i))}>
                    ✕ {p.name} ({p.team === 'home' ? home.abbreviation : away.abbreviation})
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button className="h-12 bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={!selection.length} onClick={() => send('flag', { penalties: selection }, 'flag thrown')}>🚩 Throw Flag</Button>
              <Button variant="outline" className="h-12" onClick={() => send('flag_details', {}, 'details shown')}>Show Details</Button>
              <Button className="h-12 bg-green-600 hover:bg-green-700" onClick={() => { send('flag_apply', {}, 'penalty applied'); setSelection([]) }}>✓ Apply</Button>
              <Button variant="outline" className="h-10" onClick={() => send('flag_replay', { replay: true }, 'replay the down')}>↩️ Replay down</Button>
              <Button variant="outline" className="h-10" onClick={() => send('flag_replay', { replay: false }, 'play stands')}>Play stands</Button>
              <Button variant="outline" className="h-10" onClick={() => { send('flag_decline', {}, 'declined'); setSelection([]) }}>Declined</Button>
              <Button variant="outline" className="h-10" onClick={() => { send('flag_pickup', {}, 'picked up'); setSelection([]) }}>Picked up</Button>
              <Button variant="outline" className="h-10" onClick={() => { send('flag_offsetting', {}, 'offsetting'); setSelection([]) }}>Offsetting</Button>
              <Button variant="outline" className="h-10 text-red-600" onClick={() => { send('flag_cancel', {}, 'flag cancelled'); setSelection([]) }}>Cancel flag</Button>
            </div>
            <Input placeholder="Search penalties..." value={penaltySearch} onChange={(e) => setPenaltySearch(e.target.value)} />
            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
              {penalties.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm min-w-0 truncate">{p.name} <span className="text-slate-400">({p.yards}y)</span></span>
                  <div className="flex gap-1 shrink-0">
                    {[['away', away], ['home', home]].map(([side, team]) => (
                      <Button key={side} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setSelection(sel => [...sel, { name: p.name, team: side }])}>
                        {team.abbreviation}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {has('stats') && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">📊 Stats & Timeouts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[['away', away, game.away_timeouts], ['home', home, game.home_timeouts]].map(([side, team, left]) => (
                <Button key={side} variant="outline" className="h-12" onClick={() => send('timeout', { team: side }, `timeout ${team.abbreviation}`)}>⏱ Timeout {team.abbreviation} ({left ?? '-'})</Button>
              ))}
            </div>
            {[['firstDowns', 'First downs'], ['turnovers', 'Turnovers'], ['thirdDownAtt', '3rd down att'], ['thirdDownConv', '3rd down conv'], ['fourthDownAtt', '4th down att'], ['fourthDownConv', '4th down conv'], ['penalties', 'Penalties'], ['penaltyYards', 'Penalty yards']].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                {[['away', away], ['home', home]].map(([side, team], i) => (
                  <div key={side} className={`flex items-center gap-1 ${i === 1 ? 'order-3' : ''}`}>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => send('stat', { team: side, key, delta: -1 }, `${team.abbreviation} ${label} -1`)}>-</Button>
                    <span className="w-8 text-center font-bold">{quickStats?.[side]?.[key] ?? 0}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => send('stat', { team: side, key, delta: 1 }, `${team.abbreviation} ${label} +1`)}>+</Button>
                  </div>
                ))}
                <span className="order-2 text-sm text-slate-600 dark:text-slate-300 text-center flex-1">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
