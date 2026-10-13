import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownYardLineToSpot, yardsToGoal, advanceSpot, spotLabel, spotToFieldPercent } from '../src/lib/fieldPosition.js'

test('own yard lines map to spots from the home goal line', () => {
  assert.equal(ownYardLineToSpot('home', 25), 25)
  assert.equal(ownYardLineToSpot('away', 25), 75)
})

test('yards to goal depend on who has the ball', () => {
  assert.equal(yardsToGoal(65, 'home'), 35)
  assert.equal(yardsToGoal(65, 'away'), 65)
})

test('advancing stays on the field and goes the right way', () => {
  assert.equal(advanceSpot(30, 'home', 10), 40)
  assert.equal(advanceSpot(30, 'away', 10), 20)
  assert.equal(advanceSpot(95, 'home', 20), 99)
  assert.equal(advanceSpot(5, 'home', -20), 1)
})

test('labels and drawing position', () => {
  assert.equal(spotLabel(35, 'JAX', 'PHI'), 'JAX 35')
  assert.equal(spotLabel(65, 'JAX', 'PHI'), 'PHI 35')
  assert.equal(spotLabel(50, 'JAX', 'PHI'), '50')
  assert.equal(spotToFieldPercent(65), 35)
})
