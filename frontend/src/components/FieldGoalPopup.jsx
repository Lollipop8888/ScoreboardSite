import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

// Common FG distances for quick selection
const COMMON_DISTANCES = [20, 25, 30, 35, 40, 45, 50, 55]

export function FieldGoalPopup({ open, onClose, onConfirm, title = 'Field Goal Attempt' }) {
  const [distance, setDistance] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setDistance('')
      // Focus input after a short delay
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter') {
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, distance, onClose])

  const handleConfirm = () => {
    const yards = distance ? parseInt(distance, 10) : null
    onConfirm(yards)
    onClose()
  }

  const handleSkip = () => {
    onConfirm(null) // null means no distance recorded
    onClose()
  }

  const handleQuickSelect = (yards) => {
    onConfirm(yards)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">
          {title}
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
          Enter distance or select below
        </p>

        {/* Custom distance input */}
        <div className="flex gap-2 mb-4">
          <Input
            ref={inputRef}
            type="number"
            placeholder="Yards..."
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="text-center text-lg font-mono"
            min="1"
            max="70"
          />
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            OK
          </Button>
        </div>

        {/* Quick select buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {COMMON_DISTANCES.map((yards) => (
            <Button
              key={yards}
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(yards)}
              className="font-mono"
            >
              {yards}
            </Button>
          ))}
        </div>

        {/* Skip button */}
        <Button
          variant="ghost"
          className="w-full text-slate-500"
          onClick={handleSkip}
        >
          Skip (no distance)
        </Button>
      </div>
    </div>
  )
}

export default FieldGoalPopup
