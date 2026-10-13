// Ball spot as an absolute field position: yards from the home team's goal line
// (0 = home goal line, 100 = away goal line). A change of possession doesn't move it.
// The scoreboard draws the away end zone on the left and the home end zone on the right,
// matching the team columns.

// A team's own yard line (e.g. its own 25) as a spot
export const ownYardLineToSpot = (team, yards) => (team === 'home' ? yards : 100 - yards)

// Yards the offense still needs for a touchdown
export const yardsToGoal = (spot, team) => (team === 'home' ? 100 - spot : spot)

// The spot moved `yards` toward the offense's goal (negative for a loss), kept on the field
export const advanceSpot = (spot, team, yards) => Math.min(99, Math.max(1, spot + (team === 'home' ? yards : -yards)))

// "PHI 35", "JAX 20", or "50"
export function spotLabel(spot, homeAbbr, awayAbbr) {
  if (spot === 50) return '50'
  return spot < 50 ? `${homeAbbr} ${spot}` : `${awayAbbr} ${100 - spot}`
}

// Percent from the left edge of the playing field (between the end zones)
export const spotToFieldPercent = (spot) => 100 - spot
