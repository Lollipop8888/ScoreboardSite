import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { leagueApi, createWebSocket } from '@/lib/api'

// One week of a league's games with live scores, shareable as a single link (/leagues/:id/week?w=1-6)
export default function WeekSchedulePage() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(null)
  const [games, setGames] = useState([])
  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState(null)
  const [weekKey, setWeekKey] = useState(() => new URLSearchParams(window.location.search).get('w'))

  useEffect(() => {
    Promise.all([
      leagueApi.get(leagueId),
      fetch(`/api/leagues/${leagueId}/games`).then(r => r.json()),
      leagueApi.getSeasons(leagueId).catch(() => []),
    ]).then(([l, g, s]) => {
      setLeague(l)
      setGames(Array.isArray(g) ? g : [])
      setSeasons(s || [])
      setSeasonId(prev => prev ?? (s || []).find(x => x.is_current)?.id ?? null)
    })
  }, [leagueId])

  // Live scores through the league's room
  useEffect(() => {
    if (!league?.share_code) return
    const ws = createWebSocket('league', league.share_code, (message) => {
      if (message.type === 'game_update' && message.data?.id) {
        setGames(prev => prev.map(g => g.id === message.data.id ? { ...g, ...message.data, home_team: g.home_team, away_team: g.away_team } : g))
      }
    })
    return () => ws.close()
  }, [league?.share_code])

  if (!league) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  const seasonGames = games.filter(g => !seasonId || g.season_id === seasonId)
  const label = (type) => (type === 2 ? league.game_unit_label_2 : type === 3 ? league.game_unit_label_3 : league.game_unit_label) || 'Week'
  // Weeks in order: preseason, regular, playoffs
  const typeOrder = { 3: 0, 1: 1, 2: 2 }
  const weeks = [...new Map(seasonGames.filter(g => g.game_unit != null).map(g => {
    const type = g.game_unit_type || 1
    return [`${type}-${g.game_unit}`, { key: `${type}-${g.game_unit}`, type, unit: g.game_unit }]
  })).values()].sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.unit - b.unit)
  // Default: the week with a live game, else the next scheduled game's week, else the last week
  const byTime = [...seasonGames].sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
  const current = seasonGames.find(g => g.status === 'live') || byTime.find(g => g.status === 'scheduled')
  const defaultKey = current ? `${current.game_unit_type || 1}-${current.game_unit}` : weeks[weeks.length - 1]?.key
  const activeKey = weeks.some(w => w.key === weekKey) ? weekKey : defaultKey
  const activeIndex = weeks.findIndex(w => w.key === activeKey)
  const active = weeks[activeIndex]
  const weekGames = seasonGames.filter(g => `${g.game_unit_type || 1}-${g.game_unit}` === activeKey)
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))

  const go = (key) => {
    setWeekKey(key)
    const url = new URL(window.location.href)
    url.searchParams.set('w', key)
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to={`/leagues/${leagueId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{league.name} schedule</h1>
          <p className="text-sm text-slate-500">All times in Eastern Time (ET) · scores update live</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {seasons.length > 0 && (
          <select value={seasonId || ''} onChange={(e) => { setSeasonId(e.target.value); setWeekKey(null) }}
                  className="h-9 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm">
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" variant="outline" disabled={activeIndex <= 0} onClick={() => go(weeks[activeIndex - 1].key)}>‹</Button>
          <select value={activeKey || ''} onChange={(e) => go(e.target.value)}
                  className="h-9 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm">
            {weeks.map(w => <option key={w.key} value={w.key}>{label(w.type)} {w.unit}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={activeIndex < 0 || activeIndex >= weeks.length - 1} onClick={() => go(weeks[activeIndex + 1].key)}>›</Button>
        </div>
      </div>

      {active && <h2 className="text-lg font-semibold">{label(active.type)} {active.unit}</h2>}
      {weekGames.length === 0 && <p className="text-slate-500 text-center py-8">No games this week.</p>}
      <div className="space-y-2">
        {weekGames.map(g => {
          const final = g.status === 'final' || g.quarter?.startsWith('Final')
          const live = g.status === 'live' && !final
          const when = g.scheduled_at ? new Date(g.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBD'
          const row = (team, score, won) => (
            <div className="flex items-center gap-2 min-w-0">
              {team?.logo_url ? <img src={team.logo_url} alt="" className="h-7 w-7 object-contain shrink-0" /> : <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: team?.color }} />}
              <span className={`truncate ${won ? 'font-bold' : ''}`}>{team?.name || 'TBD'}</span>
              {(final || live) && <span className={`ml-auto tabular-nums text-lg ${won ? 'font-black' : 'font-semibold text-slate-500'}`}>{score}</span>}
            </div>
          )
          return (
            <Link key={g.id} to={`/share/game/${g.share_code}`}>
              <Card className={`hover:shadow-md transition ${live ? 'ring-2 ring-red-400' : ''}`}>
                <CardContent className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    {row(g.away_team, g.away_score, final && g.away_score > g.home_score)}
                    {row(g.home_team, g.home_score, final && g.home_score > g.away_score)}
                  </div>
                  <div className="w-28 shrink-0 text-right text-sm">
                    {live ? <span className="font-bold text-red-600">● {g.quarter} {g.game_time}</span>
                      : final ? <span className="font-bold">{g.quarter || 'Final'}</span>
                      : <span className="text-slate-500">{when}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
