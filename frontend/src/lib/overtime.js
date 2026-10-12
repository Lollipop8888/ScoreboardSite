// Overtime rules shown on the scoreboard, by the league's Overtime Format setting
// (game_defaults.ot_format). Used by the scoring page and every scoreboard view.

const FORMAT_NAMES = {
  nfl: 'NFL',
  college: 'College',
  sudden: 'Sudden Death',
  full: 'Full Period',
}

export function getOvertimeRules(format = 'nfl', overtimeLength = '10:00') {
  const period = `${overtimeLength || '10:00'} period`
  switch (format) {
    case 'college':
      return {
        title: FORMAT_NAMES.college,
        lines: [
          "No game clock: each team gets a possession from the opponent's 25-yard line",
          '1st OT: kick the extra point or go for 2 after a touchdown',
          '2nd OT: teams must go for 2 after a touchdown',
          '3rd OT and later: teams alternate 2-point conversion plays',
          '1 timeout per team each overtime',
        ],
      }
    case 'sudden':
      return {
        title: FORMAT_NAMES.sudden,
        lines: [
          `${period}, coin toss decides the first possession`,
          'The first team to score wins',
          '2 timeouts per team',
        ],
      }
    case 'full':
      return {
        title: FORMAT_NAMES.full,
        lines: [
          `A full ${period} is played`,
          'The team leading at the end of the period wins',
          'If still tied, another overtime period is played',
          '2 timeouts per team',
        ],
      }
    case 'nfl':
    default:
      return {
        title: FORMAT_NAMES.nfl,
        lines: [
          `${period}, coin toss decides the first possession`,
          'Both teams get at least one possession, even if the first team scores a touchdown',
          'If still tied after both possessions, the next score wins',
          '2 timeouts per team',
        ],
      }
  }
}
