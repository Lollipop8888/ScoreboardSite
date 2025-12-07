import { Link } from 'react-router-dom'
import { Trophy, LayoutGrid, GitBranch, Share2, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Trophy,
    title: 'League Standings',
    description: 'Track wins, losses, and rankings for your entire league season.',
  },
  {
    icon: GitBranch,
    title: 'Playoff Brackets',
    description: 'Create and manage single or double elimination tournament brackets.',
  },
  {
    icon: LayoutGrid,
    title: 'Live Scoreboards',
    description: 'Score games in real-time with instant updates for all viewers.',
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description: 'Share any scoreboard, game, or bracket with a simple link.',
  },
  {
    icon: Zap,
    title: 'Real-time Updates',
    description: 'WebSocket-powered live updates so viewers never miss a point.',
  },
  {
    icon: Users,
    title: 'Multi-player Scoreboards',
    description: 'Track scores for any number of players or teams.',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="py-12 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Keep Score of{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Everything
            </span>
          </h1>
          <p className="text-xl text-slate-600">
            Create leagues, manage brackets, and share live scoreboards. 
            Perfect for sports leagues, tournaments, and game nights.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link to="/leagues">
                <Trophy className="h-5 w-5" />
                Create a League
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
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
        <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">
          Everything You Need
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
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

      {/* Quick Start */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-6 text-lg text-white/90">
            Create your first league or scoreboard in seconds. No account required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/leagues">Start a League</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
              <Link to="/scoreboards">Create Scoreboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
