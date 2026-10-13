// Live win probability: a simple, standard model (no training data needed).
// The home team's margin, plus the expected points of the drive in progress, is treated as
// normally distributed with a spread that shrinks with the time left (about 13.5 points for a
// full game, as in published NFL win-probability models).

const QUARTER_INDEX = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 }

const parseClock = (t) => {
  const [m, s] = (t || '0:00').split(':').map(n => parseInt(n) || 0)
  return m * 60 + s
}

// Standard normal CDF (Abramowitz-Stegun erf approximation)
function normalCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2)
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2
}

// Expected points for the team with the ball, from yards to the goal (null if the spot isn't tracked)
const expectedPoints = (yardsToGoal) => (yardsToGoal == null ? 1.5 : Math.max(-1, 6 - 0.075 * yardsToGoal))

/**
 * Home team's chance to win, 0..1.
 * game: { home_score, away_score, quarter, game_time, status }
 * possession: 'home' | 'away' | null; yardsToGoal: number | null (when the ball spot is tracked)
 */
export function homeWinProbability(game, possession, yardsToGoal = null) {
  const margin = (game.home_score || 0) - (game.away_score || 0)
  if (game.status === 'final' || game.quarter?.startsWith('Final')) return margin > 0 ? 1 : margin < 0 ? 0 : 0.5
  const q = game.quarter
  const clock = parseClock(game.game_time)
  let secondsLeft
  if (q === 'Pregame' || !q) secondsLeft = 3600
  else if (q === 'Halftime') secondsLeft = 1800
  else if (q in QUARTER_INDEX) secondsLeft = (3 - QUARTER_INDEX[q]) * 900 + clock
  else secondsLeft = clock // overtime: whatever is left of the period
  const ball = possession === 'home' ? expectedPoints(yardsToGoal) : possession === 'away' ? -expectedPoints(yardsToGoal) : 0
  const spread = 13.5 * Math.sqrt(Math.max(secondsLeft, 1) / 3600) + 1.5
  return normalCdf((margin + ball) / spread)
}
