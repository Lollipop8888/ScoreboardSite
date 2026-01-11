import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trophy, LayoutGrid, GitBranch, Share2, Zap, Users, Timer, Target, Search, ArrowRight, Play, Monitor, Smartphone, CheckCircle2, Mail, X, Check, Eye, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { gameApi, bracketApi, scoreboardApi, leagueApi, inviteApi, standaloneGameApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { HelpButton, FirstTimeTutorial } from '@/components/HelpTips'
import { useLanguage } from '@/lib/i18n'

const features = [
  {
    icon: Trophy,
    title: 'League Management',
    description: 'Full season tracking with standings, conferences, divisions, and automatic win/loss records.',
  },
  {
    icon: GitBranch,
    title: 'Playoff Brackets',
    description: 'Single or double-sided tournament brackets with BYE support and playoff picture tracking.',
  },
  {
    icon: LayoutGrid,
    title: 'Live Scoring',
    description: 'One-tap scoring with TD, FG, Safety, PAT, and 2PT buttons. Perfect for game day.',
  },
  {
    icon: Monitor,
    title: 'Stream Friendly',
    description: 'Clean display pages perfect for broadcasts and presentations.',
  },
  {
    icon: Share2,
    title: 'Instant Sharing',
    description: 'Every game, bracket, and scoreboard gets a unique code. Share with anyone, anywhere.',
  },
  {
    icon: Zap,
    title: 'Real-time Sync',
    description: 'WebSocket-powered updates. Scores update live across all connected devices.',
  },
]

const howItWorks = [
  { step: '1', title: 'Create', description: 'Set up your league with teams, or start a quick game' },
  { step: '2', title: 'Score', description: 'Use quick-tap buttons to track every play' },
  { step: '3', title: 'Share', description: 'Send the code to fans or add to your stream' },
]


export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [shareCode, setShareCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [stats, setStats] = useState({ leagues: 0, games: 0 })
  const [demoScore, setDemoScore] = useState({ home: 24, away: 21 })
  const [demoQuarter, setDemoQuarter] = useState('Q3')
  const [pendingInvites, setPendingInvites] = useState([])

  // Animate demo scoreboard - reset when scores get too high
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoScore(prev => {
        // Reset if scores get too high
        if (prev.home > 50 || prev.away > 50) {
          return { home: 24, away: 21 }
        }
        const rand = Math.random()
        if (rand < 0.25) return { ...prev, home: prev.home + (Math.random() < 0.5 ? 7 : 3) }
        if (rand < 0.5) return { ...prev, away: prev.away + (Math.random() < 0.5 ? 7 : 3) }
        return prev
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load real stats
  useEffect(() => {
    async function loadStats() {
      try {
        const leagues = await leagueApi.getAll()
        setStats({ leagues: leagues?.length || 0, games: leagues?.reduce((acc, l) => acc + (l.games?.length || 0), 0) || 0 })
      } catch (e) {
        // Ignore - just show 0
      }
    }
    loadStats()
  }, [])

  // Load pending invites for logged-in users
  useEffect(() => {
    async function loadInvites() {
      if (!user) {
        setPendingInvites([])
        return
      }
      try {
        const invites = await inviteApi.getPending()
        setPendingInvites(invites || [])
      } catch (e) {
        console.error('Failed to load invites:', e)
      }
    }
    loadInvites()
  }, [user])

  async function handleAcceptInvite(invite) {
    try {
      await inviteApi.respond(invite.id, 'accepted')
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id))
      // Navigate to the resource
      const routes = {
        league: `/leagues/${invite.resource_id}`,
        game: `/games/${invite.resource_id}`,
        bracket: `/brackets/${invite.resource_id}`,
        scoreboard: `/scoreboards/${invite.resource_id}`,
      }
      navigate(routes[invite.resource_type] || '/')
    } catch (e) {
      console.error('Failed to accept invite:', e)
    }
  }

  async function handleDeclineInvite(invite) {
    try {
      await inviteApi.respond(invite.id, 'declined')
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id))
    } catch (e) {
      console.error('Failed to decline invite:', e)
    }
  }

  async function handleJoinDisplay(e) {
    e.preventDefault()
    if (!shareCode.trim()) return
    
    setIsJoining(true)
    setJoinError('')
    
    const code = shareCode.trim().toUpperCase()
    
    // Try each type and navigate to share page if found
    // Try league games first
    try {
      const game = await gameApi.getByShareCode(code)
      if (game) {
        navigate(`/share/game/${code}`)
        return
      }
    } catch (e) {
      // Game not found, try next
    }
    
    // Try standalone games
    try {
      const standaloneGame = await standaloneGameApi.getByShareCode(code)
      if (standaloneGame) {
        navigate(`/standalone/${standaloneGame.id}`)
        return
      }
    } catch (e) {
      // Standalone game not found, try next
    }
    
    // Try brackets
    try {
      const bracket = await bracketApi.getByShareCode(code)
      if (bracket) {
        navigate(`/share/bracket/${code}`)
        return
      }
    } catch (e) {
      // Bracket not found, try next
    }
    
    // Try scoreboards
    try {
      const scoreboard = await scoreboardApi.getByShareCode(code)
      if (scoreboard) {
        navigate(`/share/scoreboard/${code}`)
        return
      }
    } catch (e) {
      // Scoreboard not found, try next
    }
    
    // Try leagues
    try {
      const league = await leagueApi.getByShareCode(code)
      if (league) {
        navigate(`/share/league/${code}`)
        return
      }
    } catch (e) {
      // League not found
    }
    
    setJoinError('No display found with that code')
    setIsJoining(false)
  }

  return (
    <div className="space-y-16">
      {/* First-time tutorial */}
      <FirstTimeTutorial context="home" />
      
      {/* Floating help button */}
      <div className="fixed bottom-6 right-6 z-50">
        <HelpButton context="home" className="shadow-lg" />
      </div>

      {/* Pending Invites Banner */}
      {pendingInvites.length > 0 && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Mail className="h-5 w-5" />
                <span className="font-medium">
                  {pendingInvites.length} {pendingInvites.length > 1 ? t('pending_invites_plural') : t('pending_invites')}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => document.getElementById('invites-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('view_invites')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <section id="invites-section" className={pendingInvites.length > 0 ? 'pt-12' : ''}>
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Mail className="h-5 w-5" />
                Pending Invites
              </CardTitle>
              <CardDescription>You've been invited to view or control these resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      invite.resource_type === 'league' ? 'bg-amber-100 text-amber-700' :
                      invite.resource_type === 'game' ? 'bg-green-100 text-green-700' :
                      invite.resource_type === 'bracket' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {invite.resource_type === 'league' && <Trophy className="h-5 w-5" />}
                      {invite.resource_type === 'game' && <Play className="h-5 w-5" />}
                      {invite.resource_type === 'bracket' && <GitBranch className="h-5 w-5" />}
                      {invite.resource_type === 'scoreboard' && <LayoutGrid className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        {invite.resource_name || `${invite.resource_type.charAt(0).toUpperCase() + invite.resource_type.slice(1)}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        From <span className="font-medium text-slate-700 dark:text-slate-300">@{invite.from_username}</span>
                        {' • '}
                        <span className={`inline-flex items-center gap-1 ${
                          invite.permission === 'control' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {invite.permission === 'control' ? (
                            <><Settings className="h-3 w-3" /> Control access</>
                          ) : (
                            <><Eye className="h-3 w-3" /> View only</>
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeclineInvite(invite)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAcceptInvite(invite)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Hero Section */}
      <section className="py-12 text-center relative overflow-hidden">
        {/* Football field background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, #22c55e 50px, #22c55e 52px)',
          }} />
        </div>
        
        <div className="mx-auto max-w-3xl space-y-6 relative">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="GridIron" 
              className="h-24 sm:h-32 w-auto object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('hero_title_1')}{' '}
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {t('hero_title_2')}
            </span>{' '}
            {t('hero_title_3')}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            {t('hero_subtitle')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <Button asChild size="lg" className="gap-2 bg-green-600 hover:bg-green-700" data-tutorial="start-league">
              <Link to="/leagues">
                <Trophy className="h-5 w-5" />
                {t('start_league')}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950" data-tutorial="quick-scoreboard">
              <Link to="/scoreboards">
                <LayoutGrid className="h-5 w-5" />
                {t('quick_scoreboard')}
              </Link>
            </Button>
          </div>

          {/* Join Display Section */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('have_code')}</p>
            <form onSubmit={handleJoinDisplay} className="flex items-center justify-center gap-2 max-w-sm mx-auto">
              <div className="relative flex-1" data-tutorial="share-code-input">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('enter_code')}
                  value={shareCode}
                  onChange={(e) => {
                    setShareCode(e.target.value.toUpperCase())
                    setJoinError('')
                  }}
                  className="pl-9 uppercase font-mono tracking-wider"
                  maxLength={8}
                />
              </div>
              <Button type="submit" disabled={!shareCode.trim() || isJoining} className="gap-1">
                {isJoining ? t('joining') : t('join')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            {joinError && (
              <p className="text-sm text-red-500 mt-2">{joinError}</p>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 dark:text-white">
          Everything You Need for Game Day
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 border-l-green-600">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                    <Icon className="h-6 w-6 text-green-700 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 dark:text-white">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {howItWorks.map((item, index) => (
            <div key={item.step} className="text-center relative">
              {index < howItWorks.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-green-500 to-transparent" />
              )}
              <div className="h-16 w-16 mx-auto rounded-full bg-green-600 text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">
                {item.step}
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Scoreboard */}
      <section>
        <h2 className="mb-4 text-center text-3xl font-bold text-slate-900 dark:text-white">
          Live Scoreboard Preview
        </h2>
        <p className="text-center text-slate-500 mb-8">Watch the scores update in real-time</p>
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-400">LIVE</span>
                <span className="text-slate-400 text-sm ml-2">{demoQuarter} • 8:42</span>
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-2xl font-bold mb-3 shadow-lg">
                    KC
                  </div>
                  <p className="font-semibold text-lg">Chiefs</p>
                  <p className="text-6xl font-bold mt-2 transition-all duration-300">{demoScore.home}</p>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 text-sm mb-2">VS</div>
                  <div className="h-px w-12 mx-auto bg-slate-700" />
                </div>
                <div className="text-center">
                  <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-2xl font-bold mb-3 shadow-lg">
                    SF
                  </div>
                  <p className="font-semibold text-lg">49ers</p>
                  <p className="text-6xl font-bold mt-2 transition-all duration-300">{demoScore.away}</p>
                </div>
              </div>
            </div>
          </Card>
          <p className="text-center text-sm text-slate-500 mt-4">
            <Smartphone className="inline h-4 w-4 mr-1" />
            Works on any device • No app required
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 dark:text-white">
          Perfect For
        </h2>
        <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { icon: '🏈', title: 'Fantasy Leagues', desc: 'Track your season' },
            { icon: '📺', title: 'Streamers', desc: 'Perfect for broadcasts' },
            { icon: '🏟️', title: 'Local Leagues', desc: 'Youth & adult leagues' },
            { icon: '🎮', title: 'Madden Tourneys', desc: 'Esports brackets' },
          ].map(item => (
            <Card key={item.title} className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-bold">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Start CTA */}
      <section className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 p-12 text-white relative overflow-hidden">
        {/* Field lines decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 80px, white 80px, white 82px)',
          }} />
        </div>
        
        <div className="mx-auto max-w-2xl text-center relative">
          <h2 className="mb-4 text-4xl font-bold">Ready for Kickoff? 🏈</h2>
          <p className="mb-8 text-xl text-white/90">
            Create your league or start scoring a game in under 60 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button asChild size="lg" variant="secondary" className="bg-white dark:bg-slate-800 text-green-700 dark:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-lg px-8">
              <Link to="/leagues">
                <Trophy className="h-5 w-5 mr-2" />
                Create League
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white/20 text-lg px-8">
              <Link to="/scoreboards">
                <Play className="h-5 w-5 mr-2" />
                Quick Game
              </Link>
            </Button>
          </div>
          <div className="flex justify-center gap-8 text-white/80 text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Free forever
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              No account needed
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Works on mobile
            </span>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div className="text-center text-sm text-slate-400 py-4">
        Built for football fans, by football fans 🏈
      </div>
    </div>
  )
}
