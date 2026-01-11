import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Trophy, LayoutGrid, Home, Target, Moon, Sun, LogIn, LogOut, User, Share2, Copy, Check, Settings, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/leagues', label: 'Leagues', icon: Trophy },
  { path: '/scoreboards', label: 'Scoreboards', icon: LayoutGrid },
  { path: '/keybinds', label: 'Keybinds', icon: Keyboard },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, logout, loading } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyProfileLink = () => {
    if (user) {
      const profileUrl = `${window.location.origin}/u/${user.username}`
      navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-green-50/30 dark:from-slate-950 dark:to-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-green-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-1">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <img 
                src="/logo.png" 
                alt="GridIron" 
                className="h-10 sm:h-12 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">GridIron</span>
                <span className="text-[9px] sm:text-[10px] text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider leading-tight hidden xs:block">Score Tracker</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <nav className="flex items-center gap-0.5 sm:gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/' && location.pathname.startsWith(item.path))
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition-colors",
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

              {/* Auth Buttons */}
              {!loading && (
                <>
                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-2 gap-1">
                          <User className="h-4 w-4" />
                          <span className="hidden sm:inline">{user.username}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/u/${user.username}`} className="cursor-pointer">
                            <User className="h-4 w-4 mr-2" />
                            My Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={copyProfileLink}>
                          {copied ? (
                            <Check className="h-4 w-4 mr-2 text-green-600" />
                          ) : (
                            <Share2 className="h-4 w-4 mr-2" />
                          )}
                          {copied ? 'Copied!' : 'Share Profile Link'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            logout()
                            navigate('/')
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link to="/login">
                      <Button variant="default" size="sm" className="ml-2 gap-1">
                        <LogIn className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign In</span>
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <Outlet />
      </main>

      <footer className="border-t border-green-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-2 sm:px-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <p className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-amber-700 dark:text-amber-500" />
            GridIron Score Tracker - Football leagues, games, and scoreboards
          </p>
        </div>
      </footer>
    </div>
  )
}
