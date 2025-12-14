import { Link } from 'react-router-dom'
import { Trophy, LayoutGrid, GitBranch, Share2, Zap, Users, Timer, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Trophy,
    title: 'League Standings',
    description: 'Track wins, losses, and rankings for your entire football season with automatic standings updates.',
  },
  {
    icon: GitBranch,
    title: 'Playoff Brackets',
    description: 'Create single-elimination tournament brackets. Perfect for playoff season.',
  },
  {
    icon: LayoutGrid,
    title: 'Live Game Scoring',
    description: 'Score games in real-time with TD, FG, Safety, and PAT quick buttons.',
  },
  {
    icon: Timer,
    title: 'Quarter Tracking',
    description: 'Track game progress with quarters, halftime, and overtime support.',
  },
  {
    icon: Share2,
    title: 'Share Anywhere',
    description: 'Share any scoreboard with a simple link. Perfect for streaming to OBS.',
  },
  {
    icon: Zap,
    title: 'Real-time Updates',
    description: 'WebSocket-powered live updates so fans never miss a touchdown.',
  },
]

const scoringOptions = [
  { label: 'Touchdown', points: 6, color: 'bg-green-600' },
  { label: 'PAT', points: 1, color: 'bg-blue-600' },
  { label: '2-PT Conv', points: 2, color: 'bg-purple-600' },
  { label: 'Field Goal', points: 3, color: 'bg-yellow-600' },
  { label: 'Safety', points: 2, color: 'bg-red-600' },
]

export default function HomePage() {
  return (
    <div className="space-y-16">
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
            <div className="bg-gradient-to-br from-amber-700 to-amber-900 p-4 rounded-full shadow-lg">
              <Target className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            Your{' '}
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Football
            </span>{' '}
            Scoreboard
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            The ultimate scorekeeping platform for football leagues, games, and tournaments.
            Real-time updates, easy sharing, and professional-grade tracking.
          </p>
          
          {/* Scoring preview */}
          <div className="flex flex-wrap justify-center gap-2 py-4">
            {scoringOptions.map((opt) => (
              <div
                key={opt.label}
                className={`${opt.color} text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md`}
              >
                {opt.label} +{opt.points}
              </div>
            ))}
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button asChild size="lg" className="gap-2 bg-green-600 hover:bg-green-700">
              <Link to="/leagues">
                <Trophy className="h-5 w-5" />
                Start a League
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950">
              <Link to="/scoreboards">
                <LayoutGrid className="h-5 w-5" />
                Quick Scoreboard
              </Link>
            </Button>
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

      {/* Demo Scoreboard */}
      <section>
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 dark:text-white">
          Professional Scoreboard Display
        </h2>
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-400">LIVE</span>
                <span className="text-slate-400 text-sm ml-2">Q3 • 8:42</span>
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold mb-2">
                    KC
                  </div>
                  <p className="font-semibold">Chiefs</p>
                  <p className="text-5xl font-bold mt-2">24</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-lg">VS</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-red-600 flex items-center justify-center text-2xl font-bold mb-2">
                    SF
                  </div>
                  <p className="font-semibold">49ers</p>
                  <p className="text-5xl font-bold mt-2">21</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Quick Start CTA */}
      <section className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 p-8 text-white relative overflow-hidden">
        {/* Field lines decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 80px, white 80px, white 82px)',
          }} />
        </div>
        
        <div className="mx-auto max-w-2xl text-center relative">
          <h2 className="mb-4 text-3xl font-bold">Ready for Kickoff?</h2>
          <p className="mb-6 text-lg text-white/90">
            Create your league or start scoring a game in under 60 seconds. No account required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="bg-white text-green-700 hover:bg-slate-100">
              <Link to="/leagues">Create League</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
              <Link to="/scoreboards">Quick Scoreboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
