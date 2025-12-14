import { Link, Outlet, useLocation } from 'react-router-dom'
import { Trophy, LayoutGrid, Home, Target, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/leagues', label: 'Leagues', icon: Trophy },
  { path: '/scoreboards', label: 'Scoreboards', icon: LayoutGrid },
]

export default function Layout() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30 dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-50 border-b border-green-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md">
                <Target className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">GridIron</span>
                <span className="text-[10px] text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider leading-tight">Score Tracker</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
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
                          ? "bg-green-600 text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-slate-800 hover:text-green-700 dark:hover:text-green-400"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="ml-2"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5 text-slate-600" />
                ) : (
                  <Sun className="h-5 w-5 text-yellow-400" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-green-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <p className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-amber-700 dark:text-amber-500" />
            GridIron Score Tracker - Football leagues, games, and scoreboards
          </p>
        </div>
      </footer>
    </div>
  )
}
