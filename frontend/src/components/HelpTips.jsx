import { useState, useEffect, useCallback } from 'react'
import { HelpCircle, X, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Tips organized by page/context - comprehensive guides
const TIPS = {
  home: [
    {
      title: 'Welcome to GridIron!',
      content: 'GridIron is your all-in-one football scorekeeping platform. Create leagues, track games in real-time, manage playoff brackets, and share live scoreboards with fans!',
      icon: '🏈'
    },
    {
      title: 'Getting Started',
      content: 'Sign in to create and manage your own leagues and scoreboards. Without signing in, you can still view shared games using a share code.',
      icon: '🔐'
    },
    {
      title: 'Share Codes',
      content: 'Every game, bracket, and scoreboard has a unique share code. Enter a code in the box to instantly view that content. Share your codes with fans so they can follow along live!',
      icon: '🔗'
    },
    {
      title: 'Leagues',
      content: 'Leagues let you organize multiple teams, schedule games, track standings, and run playoff brackets. Click "Start a League" or go to the Leagues page to create one.',
      icon: '🏆'
    },
    {
      title: 'Quick Scoreboards',
      content: 'Need a simple scoreboard without a full league? Use "Quick Scoreboard" for standalone games. Perfect for pickup games, single events, or streaming overlays.',
      icon: '📊'
    },
    {
      title: 'Real-Time Updates',
      content: 'All scores update in real-time! When you make changes, everyone viewing your game sees them instantly. Great for live streaming and remote fans.',
      icon: '⚡'
    },
    {
      title: 'OBS Integration',
      content: 'GridIron works great with OBS! Each game has browser source URLs you can add to your stream for professional-looking score overlays.',
      icon: '📺'
    },
  ],
  league: [
    {
      title: 'League Dashboard',
      content: 'This is your league hub! Use the tabs at the top to switch between Standings, Teams, Games, Brackets, and Settings.',
      icon: '📋'
    },
    {
      title: 'Standings Tab',
      content: 'View team rankings based on wins, losses, and points. Standings update automatically as you record game results.',
      icon: '📊'
    },
    {
      title: 'Managing Teams',
      content: 'In the Teams tab, add teams with custom names, colors, and logos. You can edit or remove teams anytime. Team colors appear on scoreboards!',
      icon: '👥'
    },
    {
      title: 'Scheduling Games',
      content: 'The Games tab shows all scheduled and completed games. Click "Add Game" to create a matchup. Set the date, time, and location.',
      icon: '📅'
    },
    {
      title: 'Live Game Control',
      content: 'Click on any game to open the live scoring page. From there you can control scores, clocks, down & distance, and more in real-time.',
      icon: '🎮'
    },
    {
      title: 'Playoff Brackets',
      content: 'Create single or double elimination brackets in the Brackets tab. Seed teams manually or auto-seed by standings. Winners advance automatically!',
      icon: '🏅'
    },
    {
      title: 'League Settings',
      content: 'Configure your league in Settings: set the sport type, number of periods, clock settings, and more. You can also delete the league here.',
      icon: '⚙️'
    },
    {
      title: 'Sharing & Invites',
      content: 'Use the Share button to get a link or invite other users. You can give them view-only access or full control over the league.',
      icon: '🔗'
    },
  ],
  game: [
    {
      title: 'Live Game Control',
      content: 'Welcome to the live scoring page! Everything you change here updates in real-time for all viewers. Let\'s walk through the controls.',
      icon: '🏈'
    },
    {
      title: 'Display Preview',
      content: 'This preview shows exactly what viewers see. Share the game link to let fans follow along live!',
      icon: '📺',
      spotlight: '[data-tutorial="display-preview"]',
      position: 'bottom'
    },
    {
      title: 'Scoring Controls',
      content: 'Use these buttons to add points. TD (+6), PAT (+1), FG (+3), Safety (+2). The scores update instantly for all viewers!',
      icon: '🎯',
      spotlight: '[data-tutorial="scoring-panel"]',
      position: 'top'
    },
    {
      title: 'Game Clock',
      content: 'Control the game clock with Start/Stop. Set the period (Q1-Q4, OT) and adjust time manually.',
      icon: '⏱️',
      spotlight: '[data-tutorial="game-clock"]',
      position: 'top'
    },
    {
      title: 'Down & Distance',
      content: 'Track the current down (1st-4th) and yards to go. Use quick buttons or enter custom values.',
      icon: '📏',
      spotlight: '[data-tutorial="down-distance"]',
      position: 'top'
    },
    {
      title: 'All Done!',
      content: 'You\'re ready to run the game! Use the ? button anytime to review these tips. Good luck!',
      icon: '🎉'
    },
  ],
  scoreboard: [
    {
      title: 'Quick Scoreboard',
      content: 'This is a standalone scoreboard - perfect for single games without needing a full league. All the same great features!',
      icon: '📊'
    },
    {
      title: 'Team Setup',
      content: 'Click on team names to edit them. You can also set custom colors that appear on the scoreboard display.',
      icon: '✏️'
    },
    {
      title: 'Scoring',
      content: 'Tap a team card to select it, then use the scoring buttons. TD (6), PAT (1), FG (3), Safety (2), or use +/- for custom amounts.',
      icon: '🎯'
    },
    {
      title: 'Clock Controls',
      content: 'Start/stop the game clock, change periods, and control the play clock. Everything syncs live to viewers!',
      icon: '⏱️'
    },
    {
      title: 'Share Your Scoreboard',
      content: 'Copy the share code to let others view your scoreboard. They\'ll see real-time updates as you make changes.',
      icon: '🔗'
    },
    {
      title: 'Invite Collaborators',
      content: 'Invite other users by username to help control the scoreboard. Give them view-only or full control access.',
      icon: '👥'
    },
    {
      title: 'OBS Integration',
      content: 'Scroll down to find Browser Source URLs for OBS. Add these to your streaming software for professional overlays!',
      icon: '📺'
    },
  ],
  bracket: [
    {
      title: 'Playoff Bracket',
      content: 'This bracket tracks your playoff tournament! Teams advance automatically as you record match results.',
      icon: '🏅'
    },
    {
      title: 'Bracket Types',
      content: 'Single elimination: lose once and you\'re out. Double elimination: teams get a second chance through the losers bracket.',
      icon: '🔀'
    },
    {
      title: 'Seeding Teams',
      content: 'Teams are seeded 1 through N. Higher seeds face lower seeds in early rounds. You can manually adjust seeding if needed.',
      icon: '🌱'
    },
    {
      title: 'Recording Scores',
      content: 'Click on any match to open the scoring dialog. Enter the final scores for both teams, then confirm the winner.',
      icon: '✏️'
    },
    {
      title: 'Advancing Winners',
      content: 'After entering scores, the winner automatically advances to the next round. The bracket updates in real-time for all viewers.',
      icon: '⬆️'
    },
    {
      title: 'Championship Match',
      content: 'The final match determines the champion! In double elimination, the team from the losers bracket may need to win twice.',
      icon: '🏆'
    },
    {
      title: 'Sharing the Bracket',
      content: 'Share the bracket link or code so fans can follow the tournament. They\'ll see live updates as matches are completed.',
      icon: '🔗'
    },
  ],
}

// Floating help button component
export function HelpButton({ context = 'home', className = '' }) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const tips = TIPS[context] || TIPS.home
  const currentTip = tips[currentStep]

  const nextStep = () => {
    if (currentStep < tips.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setOpen(false)
      setCurrentStep(0)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setCurrentStep(0)
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full ${className}`}
        onClick={() => setOpen(true)}
        title="Help & Tips"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-3xl mb-4">
                {currentTip.icon}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {currentTip.title}
              </h2>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
              {currentTip.content}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {tips.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-green-600'
                      : index < currentStep
                      ? 'bg-green-300'
                      : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 ? (
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Close
                </Button>
              )}
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={nextStep}
              >
                {currentStep < tips.length - 1 ? 'Next' : 'Done!'}
                {currentStep < tips.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// First-time tutorial popup with spotlight support
// when: optional condition that must be true to show (e.g., game.status === 'live')
export function FirstTimeTutorial({ context = 'home', storageKey, when = true }) {
  const [show, setShow] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const tips = TIPS[context] || TIPS.home
  const key = storageKey || `tutorial_seen_${context}`
  const currentTip = tips[currentStep]
  const hasSpotlight = currentTip?.spotlight

  // Calculate spotlight position
  const updateSpotlight = useCallback(() => {
    if (!hasSpotlight) {
      setSpotlightRect(null)
      return
    }
    const element = document.querySelector(currentTip.spotlight)
    if (element) {
      const rect = element.getBoundingClientRect()
      const padding = 12
      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      })
    } else {
      setSpotlightRect(null)
    }
  }, [currentTip, hasSpotlight])

  useEffect(() => {
    if (!when) return
    const seen = localStorage.getItem(key)
    if (!seen) {
      setTimeout(() => setShow(true), 800)
    }
  }, [key, when])

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden'
      updateSpotlight()
      window.addEventListener('resize', updateSpotlight)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('resize', updateSpotlight)
      }
    }
  }, [show, currentStep, updateSpotlight])

  const handleClose = () => {
    localStorage.setItem(key, 'true')
    setShow(false)
  }

  const nextStep = () => {
    if (currentStep < tips.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!show || !when) return null

  // Calculate tooltip position based on spotlight
  const getTooltipStyle = () => {
    if (!spotlightRect) return {}
    const pos = currentTip.position || 'bottom'
    const tooltipWidth = 320
    const tooltipHeight = 200
    let top = 0, left = 0

    switch (pos) {
      case 'top':
        top = spotlightRect.top - tooltipHeight - 20
        left = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2
        break
      case 'bottom':
        top = spotlightRect.top + spotlightRect.height + 20
        left = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2
        left = spotlightRect.left - tooltipWidth - 20
        break
      case 'right':
        top = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2
        left = spotlightRect.left + spotlightRect.width + 20
        break
      default:
        break
    }
    // Keep in viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))
    return { top, left, width: tooltipWidth }
  }

  // Spotlight mode
  if (hasSpotlight && spotlightRect) {
    const tooltipStyle = getTooltipStyle()
    return (
      <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
        {/* X button */}
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 z-[102] bg-white dark:bg-slate-800 shadow-lg"
          style={{ pointerEvents: 'auto' }}
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Dark overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.7)"
            mask="url(#spotlight-mask)"
            onClick={handleClose}
          />
        </svg>

        {/* Spotlight glow */}
        <div
          className="absolute rounded-xl ring-4 ring-green-500 ring-opacity-75 animate-pulse"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            pointerEvents: 'none',
          }}
        />

        {/* Tooltip */}
        <div
          className="absolute bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5"
          style={{ ...tooltipStyle, pointerEvents: 'auto' }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xl">
              {currentTip.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{currentTip.title}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{currentTip.content}</p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {tips.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentStep ? 'bg-green-600' : index < currentStep ? 'bg-green-300' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={prevStep} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={nextStep}>
              {currentStep < tips.length - 1 ? 'Next' : 'Done!'}
              {currentStep < tips.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          <button className="w-full text-xs text-slate-400 hover:text-slate-600 mt-2" onClick={handleClose}>
            Skip tutorial
          </button>
        </div>
      </div>
    )
  }

  // Standard popup mode (no spotlight)
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-3xl mb-4">
            {currentTip.icon}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {currentTip.title}
          </h2>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
          {currentTip.content}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {tips.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-green-600'
                  : index < currentStep
                  ? 'bg-green-300'
                  : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {currentStep > 0 ? (
            <Button variant="outline" className="flex-1" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Skip Tutorial
            </Button>
          )}
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={nextStep}
          >
            {currentStep < tips.length - 1 ? 'Next' : 'Get Started!'}
            {currentStep < tips.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Inline tip component for contextual help
export function InlineTip({ children, className = '' }) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-blue-800 dark:text-blue-300">{children}</p>
    </div>
  )
}

export default HelpButton
