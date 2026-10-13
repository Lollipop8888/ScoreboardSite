import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homeWinProbability } from '../src/lib/winProbability.js'

const game = (o) => ({ home_score: 0, away_score: 0, quarter: 'Q1', game_time: '15:00', status: 'live', ...o })

test('even before kickoff', () => {
  assert.ok(Math.abs(homeWinProbability(game({ quarter: 'Pregame' }), null) - 0.5) < 1e-6)
})

test('final games are decided', () => {
  assert.equal(homeWinProbability(game({ status: 'final', home_score: 10, away_score: 7 }), null), 1)
  assert.equal(homeWinProbability(game({ status: 'final', home_score: 7, away_score: 10 }), null), 0)
  assert.equal(homeWinProbability(game({ status: 'final', home_score: 7, away_score: 7 }), null), 0.5)
})

test('a lead matters more as time runs out', () => {
  const early = homeWinProbability(game({ home_score: 7, quarter: 'Q1', game_time: '15:00' }), null)
  const late = homeWinProbability(game({ home_score: 7, quarter: 'Q4', game_time: '2:00' }), null)
  assert.ok(early > 0.5 && late > early && late < 1)
})

test('having the ball near the goal helps', () => {
  const far = homeWinProbability(game({ quarter: 'Q4', game_time: '5:00' }), 'home', 80)
  const near = homeWinProbability(game({ quarter: 'Q4', game_time: '5:00' }), 'home', 5)
  assert.ok(near > far)
})
