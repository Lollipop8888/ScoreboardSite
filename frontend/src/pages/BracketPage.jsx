import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Share2, Copy, Check, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bracketApi, createWebSocket } from '@/lib/api'

export default function BracketPage() {
  const { bracketId } = useParams()
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchScores, setMatchScores] = useState({ team1_score: 0, team2_score: 0 })

  const loadBracket = useCallback(async () => {
    try {
      const data = await bracketApi.get(bracketId)
      setBracket(data)
    } catch (error) {
      console.error('Failed to load bracket:', error)
    } finally {
      setLoading(false)
    }
  }, [bracketId])

  useEffect(() => {
    loadBracket()
  }, [loadBracket])

  useEffect(() => {
    if (!bracket?.share_code) return

    const ws = createWebSocket('bracket', bracket.share_code, (message) => {
      if (message.type === 'bracket_update') {
        loadBracket()
      }
    })

    return () => ws.close()
  }, [bracket?.share_code, loadBracket])

  function copyShareLink() {
    const url = `${window.location.origin}/share/bracket/${bracket.share_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openMatchDialog(match) {
    setSelectedMatch(match)
    setMatchScores({
      team1_score: match.team1_score || 0,
      team2_score: match.team2_score || 0,
    })
  }

  async function handleUpdateMatch() {
    if (!selectedMatch) return

    try {
      const winner_id =
        matchScores.team1_score > matchScores.team2_score
          ? selectedMatch.team1?.id
          : matchScores.team2_score > matchScores.team1_score
          ? selectedMatch.team2?.id
          : null

      await bracketApi.updateMatch(selectedMatch.id, {
        team1_score: matchScores.team1_score,
        team2_score: matchScores.team2_score,
        status: winner_id ? 'completed' : 'live',
        winner_id,
      })

      setSelectedMatch(null)
      loadBracket()
    } catch (error) {
      console.error('Failed to update match:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!bracket) {
    return <div className="text-center py-12">Bracket not found</div>
  }

  // Organize matches by round
  const matchesByRound = {}
  bracket.matches?.forEach((match) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = []
    }
    matchesByRound[match.round_number].push(match)
  })

  const rounds = Object.keys(matchesByRound).sort((a, b) => a - b)
  const numRounds = rounds.length

  const getRoundName = (roundNum, total) => {
    const remaining = total - roundNum + 1
    if (remaining === 1) return 'Finals'
    if (remaining === 2) return 'Semifinals'
    if (remaining === 3) return 'Quarterfinals'
    return `Round ${roundNum}`
  }

  // Find the champion
  const finalMatch = bracket.matches?.find(m => m.round_number === numRounds)
  const champion = finalMatch?.winner

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{bracket.name}</h1>
          <p className="text-slate-600">
            {bracket.num_teams} teams - {bracket.bracket_type.replace('_', ' ')}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={copyShareLink}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </div>

      {/* Champion Banner */}
      {champion && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="flex items-center justify-center gap-4 py-6">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-yellow-700">Champion</p>
              <p className="text-2xl font-bold text-yellow-900">{champion.name}</p>
            </div>
            <Trophy className="h-10 w-10 text-yellow-500" />
          </CardContent>
        </Card>
      )}

      {/* Share Code */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-slate-700">Share Code</p>
              <p className="text-2xl font-bold tracking-wider text-primary">{bracket.share_code}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Bracket Display */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {rounds.map((roundNum) => (
            <div key={roundNum} className="flex flex-col">
              <h3 className="text-sm font-semibold text-slate-600 mb-4 text-center">
                {getRoundName(parseInt(roundNum), numRounds)}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-4">
                {matchesByRound[roundNum]
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((match) => (
                    <div
                      key={match.id}
                      className="w-64 cursor-pointer"
                      onClick={() => openMatchDialog(match)}
                    >
                      <Card className={`transition-all hover:shadow-md ${
                        match.status === 'completed' ? 'bg-slate-50' : ''
                      }`}>
                        <CardContent className="p-3 space-y-2">
                          {/* Team 1 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              match.winner?.id === match.team1?.id
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {match.team1 ? (
                                <>
                                  <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                    style={{ backgroundColor: match.team1.color }}
                                  >
                                    {match.team1.name.charAt(0)}
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    match.winner?.id === match.team1?.id ? 'text-green-700' : ''
                                  }`}>
                                    {match.team1.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-slate-400 italic">TBD</span>
                              )}
                            </div>
                            <span className={`font-bold ${
                              match.winner?.id === match.team1?.id ? 'text-green-700' : 'text-slate-600'
                            }`}>
                              {match.team1_score}
                            </span>
                          </div>

                          {/* Team 2 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded ${
                              match.winner?.id === match.team2?.id
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {match.team2 ? (
                                <>
                                  <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                    style={{ backgroundColor: match.team2.color }}
                                  >
                                    {match.team2.name.charAt(0)}
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    match.winner?.id === match.team2?.id ? 'text-green-700' : ''
                                  }`}>
                                    {match.team2.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-slate-400 italic">TBD</span>
                              )}
                            </div>
                            <span className={`font-bold ${
                              match.winner?.id === match.team2?.id ? 'text-green-700' : 'text-slate-600'
                            }`}>
                              {match.team2_score}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match Edit Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Match</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedMatch.team1 ? (
                    <>
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: selectedMatch.team1.color }}
                      >
                        {selectedMatch.team1.name.charAt(0)}
                      </div>
                      <span className="font-medium">{selectedMatch.team1.name}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">TBD</span>
                  )}
                </div>
                <Input
                  type="number"
                  value={matchScores.team1_score}
                  onChange={(e) =>
                    setMatchScores({ ...matchScores, team1_score: parseInt(e.target.value) || 0 })
                  }
                  className="w-20 text-center"
                  disabled={!selectedMatch.team1}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedMatch.team2 ? (
                    <>
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: selectedMatch.team2.color }}
                      >
                        {selectedMatch.team2.name.charAt(0)}
                      </div>
                      <span className="font-medium">{selectedMatch.team2.name}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">TBD</span>
                  )}
                </div>
                <Input
                  type="number"
                  value={matchScores.team2_score}
                  onChange={(e) =>
                    setMatchScores({ ...matchScores, team2_score: parseInt(e.target.value) || 0 })
                  }
                  className="w-20 text-center"
                  disabled={!selectedMatch.team2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMatch}
              disabled={!selectedMatch?.team1 || !selectedMatch?.team2}
            >
              Update Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
