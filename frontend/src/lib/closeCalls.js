// Close calls: a play result that's being decided on the field (not a replay review).
// While undecided the scoreboard shows the question; once decided it briefly shows the ruling.

export const CLOSE_CALLS = {
  firstDown: { question: '1st Down?', yes: 'First Down', no: 'Short' },
  touchdown: { question: 'Touchdown?', yes: 'Touchdown', no: 'Short of the Goal Line' },
  catch: { question: 'Catch?', yes: 'Catch', no: 'Incomplete' },
  fumble: { question: 'Fumble?', yes: 'Fumble', no: 'Down by Contact' },
}

export const CLOSE_CALL_TYPES = Object.keys(CLOSE_CALLS)
