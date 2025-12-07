import { Link, Outlet, useLocation } from 'react-router-dom'
import { Trophy, LayoutGrid, Users, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/leagues', label: 'Leagues', icon: Trophy },
  { path: '/scoreboards', label: 'Scoreboards', icon: LayoutGrid },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-slate-900">ScoreKeeper</span>
            </Link>
            
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>ScoreKeeper - Track scores, leagues, and brackets</p>
        </div>
      </footer>
    </div>
  )
}
