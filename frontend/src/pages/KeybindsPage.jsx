import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Keyboard, AlertTriangle } from 'lucide-react'

// Default keybinds for game controls
const DEFAULT_KEYBINDS = {
  // Scoring
  touchdown: { key: 't', label: 'Touchdown (+6)' },
  safety: { key: 's', label: 'Safety (+2)' },
  attemptPat: { key: 'p', label: 'Attempt PAT' },
  attemptFg: { key: 'f', label: 'Attempt FG' },
  attempt2pt: { key: 'x', label: 'Attempt 2PT' },
  attemptGood: { key: 'h', label: 'Attempt Good' },
  attemptNoGood: { key: 'n', label: 'Attempt No Good' },
  
  // Clock
  toggleClock: { key: ' ', label: 'Start/Stop Clock' },
  togglePlayClock: { key: 'v', label: 'Start/Stop Play Clock' },
  togglePlayClockVisible: { key: 'b', label: 'Show/Hide Play Clock' },
  playClock40: { key: 'r', label: 'Play Clock: 40' },
  playClock25: { key: 'y', label: 'Play Clock: 25' },
  nextQuarter: { key: ']', label: 'Next Quarter' },
  prevQuarter: { key: '[', label: 'Prev Quarter' },
  
  // Down & Distance
  nextDown: { key: 'd', label: 'Next Down' },
  firstDown: { key: '1', label: 'First Down ' },
  toggleDownOnly: { key: '2', label: 'Toggle Down Only' },
  yardsPlus5: { key: '=', label: 'Yards +5' },
  yardsMinus5: { key: '-', label: 'Yards -5' },
  toggleDDVisible: { key: '/', label: 'Show/Hide D&D' },
  
  // Play Results
  incomplete: { key: 'i', label: 'Incomplete Pass' },
  outOfBounds: { key: 'l', label: 'Out of Bounds' },
  turnover: { key: 'o', label: 'Turnover' },
  fumble: { key: 'u', label: 'Fumble' },
  interception: { key: 'j', label: 'Interception' },
  sack: { key: 'a', label: 'Sack' },
  redZone: { key: '9', label: 'Red Zone (5s)' },
  
  // Penalties & Flags
  flag: { key: 'g', label: 'Flag/Penalty' },
  
  // Possession
  possessionAway: { key: 'q', label: 'Possession: Away' },
  possessionHome: { key: 'w', label: 'Possession: Home' },
  possessionNone: { key: 'e', label: 'Possession: None' },
  togglePossessionVisible: { key: '3', label: 'Show/Hide Possession' },
  
  // Timeouts
  timeoutAway: { key: '7', label: 'Timeout: Away' },
  timeoutHome: { key: '8', label: 'Timeout: Home' },
  toggleTimeoutsVisible: { key: '0', label: 'Show/Hide Timeouts' },
  
  // Overlays
  injury: { key: '4', label: 'Injury' },
  commercial: { key: '5', label: 'Commercial Break' },
  
  // Quick Actions
  kickoff: { key: 'z', label: 'Kickoff' },
  punt: { key: 'c', label: 'Punt' },
  undoLast: { key: 'm', label: 'Undo Last Action' },
}

// Get keybinds from localStorage or use defaults
export function getKeybinds() {
  try {
    const saved = localStorage.getItem('gridiron_keybinds')
    if (saved) {
      return { ...DEFAULT_KEYBINDS, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Failed to load keybinds:', e)
  }
  return DEFAULT_KEYBINDS
}

// Save keybinds to localStorage
function saveKeybinds(keybinds) {
  localStorage.setItem('gridiron_keybinds', JSON.stringify(keybinds))
}

// Get keybinds enabled state from localStorage (default: false)
export function getKeybindsEnabled() {
  try {
    return localStorage.getItem('gridiron_keybinds_enabled') === 'true'
  } catch (e) {
    return false
  }
}

// Save keybinds enabled state to localStorage
export function setKeybindsEnabled(enabled) {
  localStorage.setItem('gridiron_keybinds_enabled', enabled ? 'true' : 'false')
}

export default function KeybindsPage() {
  const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS)
  const [editingKey, setEditingKey] = useState(null)
  const [enabled, setEnabled] = useState(false)

  // Load keybinds on mount
  useEffect(() => {
    setKeybinds(getKeybinds())
    setEnabled(getKeybindsEnabled())
  }, [])
  
  // Toggle keybinds enabled
  const toggleEnabled = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    setKeybindsEnabled(newEnabled)
  }

  // Handle keybind change
  const handleKeyCapture = (action, e) => {
    e.preventDefault()
    e.stopPropagation()
    let key = e.key
    
    // Ignore modifier keys by themselves
    if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
      return
    }
    
    // Save scroll position before state change
    const scrollY = window.scrollY
    
    if (key === 'Escape') {
      setEditingKey(null)
      requestAnimationFrame(() => window.scrollTo(0, scrollY))
      return
    }
    
    // Backspace or Delete clears the keybind
    if (key === 'Backspace' || key === 'Delete') {
      const newKeybinds = {
        ...keybinds,
        [action]: { ...keybinds[action], key: '' }
      }
      setKeybinds(newKeybinds)
      saveKeybinds(newKeybinds)
      setEditingKey(null)
      requestAnimationFrame(() => window.scrollTo(0, scrollY))
      return
    }
    
    // Keep space as is
    if (key === ' ') key = ' '
    // For letters, store as lowercase (shift just types uppercase but we normalize)
    else if (key.length === 1) key = key.toLowerCase()
    
    const newKeybinds = {
      ...keybinds,
      [action]: { ...keybinds[action], key }
    }
    setKeybinds(newKeybinds)
    saveKeybinds(newKeybinds)
    setEditingKey(null)
    requestAnimationFrame(() => window.scrollTo(0, scrollY))
  }

  const resetKeybinds = () => {
    setKeybinds(DEFAULT_KEYBINDS)
    localStorage.removeItem('gridiron_keybinds')
  }

  const formatKey = (key) => {
    if (!key || key === '') return '—'
    if (key === ' ') return 'Space'
    if (key.length === 1) return key.toUpperCase()
    return key
  }

  // Render a keybind row
  const KeybindRow = ({ action }) => {
    const { key, label } = keybinds[action] || {}
    if (!label) return null
    
    // Check for duplicate keys
    const duplicateActions = Object.entries(keybinds)
      .filter(([a, { key: k }]) => a !== action && k === key && k !== '')
      .map(([a]) => keybinds[a].label)
    const hasDuplicate = duplicateActions.length > 0
    
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
          {hasDuplicate && (
            <span title={`Conflicts with: ${duplicateActions.join(', ')}`}>
              <AlertTriangle className="h-3 w-3 text-red-500" />
            </span>
          )}
        </div>
        {editingKey === action ? (
          <Input
            ref={(el) => el?.focus({ preventScroll: true })}
            className="w-16 text-center font-mono text-xs"
            placeholder="..."
            onKeyDown={(e) => handleKeyCapture(action, e)}
            onBlur={() => {
              const scrollY = window.scrollY
              setEditingKey(null)
              requestAnimationFrame(() => window.scrollTo(0, scrollY))
            }}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={`w-16 font-mono text-xs focus:outline-none focus-visible:ring-0 ${hasDuplicate ? 'border-red-300 text-red-600' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.currentTarget.blur() // Remove focus after click
              const scrollY = window.scrollY
              setEditingKey(action)
              requestAnimationFrame(() => window.scrollTo(0, scrollY))
            }}
          >
            {formatKey(key)}
          </Button>
        )}
      </div>
    )
  }

  const keybindKeys = Object.keys(keybinds)
  const midpoint = Math.ceil(keybindKeys.length / 2)
  const leftColumn = keybindKeys.slice(0, midpoint)
  const rightColumn = keybindKeys.slice(midpoint)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h1>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Game Controls
            </CardTitle>
            <Button
              size="sm"
              variant={enabled ? 'default' : 'outline'}
              className={`h-8 px-4 ${enabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={toggleEnabled}
            >
              {enabled ? '✓ Enabled' : 'Disabled'}
            </Button>
          </div>
          <CardDescription>
            Customize keybinds for quick actions during live games. Click a key to change it. Press Backspace to clear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              {leftColumn.map((action) => (
                <KeybindRow key={action} action={action} />
              ))}
            </div>
            <div>
              {rightColumn.map((action) => (
                <KeybindRow key={action} action={action} />
              ))}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={resetKeybinds}>
              Reset to Defaults
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active on Live Game page when not typing in an input field.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
