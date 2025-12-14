import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, Copy, Check, Trophy, Pencil, Trash2, Settings, Link, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { bracketApi, teamApi, leagueApi, createWebSocket } from '@/lib/api'

// Match Card Component with seed numbers
function MatchCard({ match, onClick, seed1, seed2, showSeeds = false }) {
  // BYE: use bye_slot to determine which slot is BYE
  const isBye = match.bye_slot === 1 || match.bye_slot === 2
  const byeTeam = isBye ? (match.bye_slot === 1 ? match.team2 : match.team1) : null
  const hasLinkedGame = !!match.game_id
  
  return (
    <div className="w-56 cursor-pointer" onClick={onClick}>
      <Card className={`transition-all hover:shadow-md ${match.status === 'completed' ? 'bg-slate-50 dark:bg-slate-800/50' : ''} ${hasLinkedGame ? 'border-blue-300 dark:border-blue-700' : ''}`}>
        <CardContent className="p-3 space-y-2">
          {hasLinkedGame && (
            <div className="flex items-center gap-1 text-xs text-blue-500 mb-1">
              <Link className="h-3 w-3" />
              <span>Game Linked</span>
            </div>
          )}
          {isBye ? (
            <>
              {/* Non-BYE team slot (team or TBD) */}
              <div className={`flex items-center justify-between p-2 rounded ${byeTeam ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <div className="flex items-center gap-2">
                  {showSeeds && (
                    <span className="text-xs font-bold text-slate-400 w-4">#{match.bye_slot === 1 ? seed2 : seed1}</span>
                  )}
                  {byeTeam ? (
                    <>
                      {byeTeam.logo_url ? (
                        <img src={byeTeam.logo_url} alt="" className="h-6 w-auto max-w-8 object-contain" />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: byeTeam.color }}>{byeTeam.abbreviation || byeTeam.name?.charAt(0)}</span>
                      )}
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">{byeTeam.name}</span>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">W</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 italic">TBD</span>
                  )}
                </div>
              </div>
              {/* BYE slot */}
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 italic">— BYE —</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Team 1 row */}
              {(() => {
                const isWinner = match.winner?.id === match.team1?.id
                const isLoser = match.status === 'completed' && match.winner && match.team1 && match.winner.id !== match.team1.id
                return (
                  <div className={`flex items-center justify-between p-2 rounded ${
                    isWinner ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 
                    isLoser ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 opacity-75' : 
                    'bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {showSeeds && seed1 && (
                        <span className="text-xs font-bold text-slate-400 w-4">#{seed1}</span>
                      )}
                      {match.team1 ? (
                        <>
                          {match.team1.logo_url ? (
                            <img src={match.team1.logo_url} alt="" className="h-6 w-auto max-w-8 object-contain" />
                          ) : (
                            <span className="text-xs font-bold" style={{ color: match.team1.color }}>{match.team1.abbreviation || match.team1.name.charAt(0)}</span>
                          )}
                          <span className={`text-sm font-medium ${isWinner ? 'text-green-700 dark:text-green-400' : isLoser ? 'text-red-700 dark:text-red-400 line-through' : ''}`}>
                            {match.team1.name}
                          </span>
                          {isWinner && <span className="text-xs font-bold text-green-600 dark:text-green-400">W</span>}
                          {isLoser && <span className="text-xs font-bold text-red-600 dark:text-red-400">L</span>}
                        </>
                      ) : (
                        <span className="text-sm text-slate-400 italic">TBD</span>
                      )}
                    </div>
                    <span className={`font-bold ${isWinner ? 'text-green-700 dark:text-green-400' : isLoser ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {match.team1_score}
                    </span>
                  </div>
                )
              })()}
              {/* Team 2 row */}
              {(() => {
                const isWinner = match.winner?.id === match.team2?.id
                const isLoser = match.status === 'completed' && match.winner && match.team2 && match.winner.id !== match.team2.id
                return (
                  <div className={`flex items-center justify-between p-2 rounded ${
                    isWinner ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 
                    isLoser ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 opacity-75' : 
                    'bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {showSeeds && seed2 && (
                        <span className="text-xs font-bold text-slate-400 w-4">#{seed2}</span>
                      )}
                      {match.team2 ? (
                        <>
                          {match.team2.logo_url ? (
                            <img src={match.team2.logo_url} alt="" className="h-6 w-auto max-w-8 object-contain" />
                          ) : (
                            <span className="text-xs font-bold" style={{ color: match.team2.color }}>{match.team2.abbreviation || match.team2.name.charAt(0)}</span>
                          )}
                          <span className={`text-sm font-medium ${isWinner ? 'text-green-700 dark:text-green-400' : isLoser ? 'text-red-700 dark:text-red-400 line-through' : ''}`}>
                            {match.team2.name}
                          </span>
                          {isWinner && <span className="text-xs font-bold text-green-600 dark:text-green-400">W</span>}
                          {isLoser && <span className="text-xs font-bold text-red-600 dark:text-red-400">L</span>}
                        </>
                      ) : (
                        <span className="text-sm text-slate-400 italic">TBD</span>
                      )}
                    </div>
                    <span className={`font-bold ${isWinner ? 'text-green-700 dark:text-green-400' : isLoser ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {match.team2_score}
                    </span>
                  </div>
                )
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function BracketPage() {
  const { bracketId } = useParams()
  const navigate = useNavigate()
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchForm, setMatchForm] = useState({ team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, game_id: '' })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [leagueTeams, setLeagueTeams] = useState([])
  const [leagueGames, setLeagueGames] = useState([])
  const [league, setLeague] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', layout: 'one_sided', round_names: {} })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editRoundsDialogOpen, setEditRoundsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('bracket') // 'bracket' or 'playoff-picture'
  const [playoffPicture, setPlayoffPicture] = useState([]) // Array of { team_id, seed, conference, division, record, status }
  const [isDraft, setIsDraft] = useState(false) // Track if there are unsaved changes

  // Parse group options from league
  const groupOptions = (() => {
    if (!league?.groups) return { group1: [], group2: {} }
    try {
      const parsed = typeof league.groups === 'string' ? JSON.parse(league.groups) : league.groups
      return {
        group1: parsed.group1 || [],
        group2: parsed.group2 || {}
      }
    } catch {
      return { group1: [], group2: {} }
    }
  })()

  const loadBracket = useCallback(async () => {
    try {
      const data = await bracketApi.get(bracketId)
      setBracket(data)
      // Load teams, games, and league from the league
      if (data.league_id) {
        const [teams, games, leagueData] = await Promise.all([
          teamApi.getByLeague(data.league_id),
          leagueApi.getGames(data.league_id),
          leagueApi.get(data.league_id)
        ])
        setLeagueTeams(teams)
        setLeagueGames(games)
        setLeague(leagueData)
        
        // Check for draft first
        const draftData = localStorage.getItem(`playoff_picture_draft_${bracketId}`)
        if (draftData) {
          try {
            const draftPicture = JSON.parse(draftData)
            setPlayoffPicture(draftPicture)
            setIsDraft(true)
          } catch (e) {
            localStorage.removeItem(`playoff_picture_draft_${bracketId}`)
          }
        } else if (data.playoff_picture) {
          // Load from saved data - NEVER reset this
          try {
            const savedPicture = typeof data.playoff_picture === 'string' 
              ? JSON.parse(data.playoff_picture) 
              : data.playoff_picture
            setPlayoffPicture(savedPicture)
          } catch (e) {
            // Invalid saved data - keep empty, don't auto-initialize
            console.error('Failed to parse playoff picture:', e)
          }
        }
        // If no saved data, start with empty array - user must click Auto-Rank to populate
      }
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

  // Initialize all teams in playoff picture with default 'in' status (no ranking applied)
  function initializeAllTeams(teams) {
    const picture = teams.map((team, index) => ({
      team_id: team.id,
      seed: index + 1,
      conference: team.group_1 || 'default',
      status: 'in',
    }))
    setPlayoffPicture(picture)
  }

  // Generate playoff picture from teams sorted by record within their conference (group_1)
  // Preserves existing clinched/eliminated statuses, only updates seeds and in/bubble
  function generatePlayoffPicture(teams) {
    const bracketSize = bracket?.num_teams || 8
    
    // Only use group_1 (Level 1 / Conference) for grouping
    // Get unique Level 1 values that actually exist
    const level1Values = [...new Set(teams.map(t => t.group_1).filter(Boolean))]
    
    // If no Level 1 groups defined, treat all teams as one group
    if (level1Values.length === 0) {
      const sorted = [...teams].sort((a, b) => {
        const aWinPct = a.wins / (a.wins + a.losses + a.ties || 1)
        const bWinPct = b.wins / (b.wins + b.losses + b.ties || 1)
        if (bWinPct !== aWinPct) return bWinPct - aWinPct
        if (b.wins !== a.wins) return b.wins - a.wins
        return (b.points_for - b.points_against) - (a.points_for - a.points_against)
      })
      
      const picture = sorted.map((team, index) => {
        const seed = index + 1
        const existingEntry = playoffPicture.find(p => p.team_id === team.id)
        const preserveStatus = existingEntry?.status === 'clinched' || existingEntry?.status === 'eliminated'
        
        return {
          team_id: team.id,
          seed,
          conference: 'default',
          status: preserveStatus ? existingEntry.status : (seed <= bracketSize ? 'in' : 'bubble'),
        }
      })
      setPlayoffPicture(picture)
      return
    }
    
    // Group teams by Level 1 (Conference)
    const conferences = {}
    level1Values.forEach(conf => {
      conferences[conf] = teams.filter(t => t.group_1 === conf)
    })
    
    // Sort each conference by record
    const sortByRecord = (a, b) => {
      const aWinPct = a.wins / (a.wins + a.losses + a.ties || 1)
      const bWinPct = b.wins / (b.wins + b.losses + b.ties || 1)
      if (bWinPct !== aWinPct) return bWinPct - aWinPct
      if (b.wins !== a.wins) return b.wins - a.wins
      return (b.points_for - b.points_against) - (a.points_for - a.points_against)
    }
    
    Object.keys(conferences).forEach(conf => {
      conferences[conf].sort(sortByRecord)
    })
    
    // Calculate seeds per conference
    const confNames = Object.keys(conferences)
    const teamsPerConf = Math.ceil(bracketSize / confNames.length)
    
    const picture = []
    confNames.forEach(conf => {
      conferences[conf].forEach((team, index) => {
        const seed = index + 1
        const existingEntry = playoffPicture.find(p => p.team_id === team.id)
        const preserveStatus = existingEntry?.status === 'clinched' || existingEntry?.status === 'eliminated'
        
        let status
        if (preserveStatus) {
          status = existingEntry.status
        } else if (seed <= teamsPerConf) {
          status = 'in'
        } else {
          status = 'bubble'
        }
        
        picture.push({
          team_id: team.id,
          seed,
          conference: conf,
          status,
        })
      })
    })
    
    setPlayoffPicture(picture)
  }

  // Save draft to localStorage (doesn't commit to backend)
  function saveDraft() {
    localStorage.setItem(`playoff_picture_draft_${bracketId}`, JSON.stringify(playoffPicture))
    setIsDraft(true)
  }

  // Save playoff picture to backend (commits changes)
  async function savePlayoffPicture() {
    try {
      console.log('Saving playoff picture:', playoffPicture)
      const result = await bracketApi.update(bracketId, { playoff_picture: playoffPicture })
      // Clear draft after successful save
      localStorage.removeItem(`playoff_picture_draft_${bracketId}`)
      setIsDraft(false)
      // Update local bracket state with saved data
      setBracket(result)
      alert('Playoff picture saved!')
    } catch (error) {
      console.error('Failed to save playoff picture:', error)
      const errorMsg = error?.response?.data?.detail || error?.message || JSON.stringify(error)
      alert('Failed to save playoff picture: ' + errorMsg)
    }
  }

  // Discard draft and reload from backend
  function discardDraft() {
    localStorage.removeItem(`playoff_picture_draft_${bracketId}`)
    setIsDraft(false)
    loadBracket()
  }

  // Update a team's seed in the playoff picture (within their conference)
  function updatePlayoffSeed(teamId, newSeed) {
    const newPicture = [...playoffPicture]
    const teamIndex = newPicture.findIndex(p => p.team_id === teamId)
    if (teamIndex === -1) return
    
    const teamConf = newPicture[teamIndex].conference || 'default'
    const oldSeed = newPicture[teamIndex].seed
    // Swap seeds within the same conference
    const otherIndex = newPicture.findIndex(p => p.seed === newSeed && (p.conference || 'default') === teamConf)
    if (otherIndex !== -1) {
      newPicture[otherIndex].seed = oldSeed
    }
    newPicture[teamIndex].seed = newSeed
    
    // Sort by seed
    newPicture.sort((a, b) => a.seed - b.seed)
    setPlayoffPicture(newPicture)
  }

  // Update a team's status in the playoff picture
  function updatePlayoffStatus(teamId, status) {
    setPlayoffPicture(prev => prev.map(p => 
      p.team_id === teamId ? { ...p, status } : p
    ))
  }

  // Add team to playoff picture
  function addToPlayoffPicture(teamId) {
    if (playoffPicture.find(p => p.team_id === teamId)) return
    const team = leagueTeams.find(t => t.id === teamId)
    const conf = team?.group_1 || 'default'
    // Get max seed within this conference
    const confEntries = playoffPicture.filter(p => p.conference === conf)
    const maxSeed = Math.max(...confEntries.map(p => p.seed), 0)
    setPlayoffPicture(prev => [...prev, { team_id: teamId, seed: maxSeed + 1, conference: conf, status: 'in' }])
  }

  // Remove team from playoff picture
  function removeFromPlayoffPicture(teamId) {
    setPlayoffPicture(prev => {
      const filtered = prev.filter(p => p.team_id !== teamId)
      // Re-number seeds within each conference
      const conferences = {}
      filtered.forEach(p => {
        const conf = p.conference || 'default'
        if (!conferences[conf]) conferences[conf] = []
        conferences[conf].push(p)
      })
      const result = []
      Object.keys(conferences).forEach(conf => {
        conferences[conf].sort((a, b) => a.seed - b.seed).forEach((p, i) => {
          result.push({ ...p, seed: i + 1 })
        })
      })
      return result
    })
  }

  // Populate bracket first round with clinched teams based on seeds
  // For two-sided brackets, seeds are per-conference
  async function populateBracketFromClinched() {
    // Get clinched teams
    const clinchedTeams = playoffPicture.filter(p => p.status === 'clinched')
    
    if (clinchedTeams.length === 0) {
      alert('No teams have clinched yet!')
      return
    }

    // Get first round matches sorted by match number
    const firstRoundMatches = (bracket.matches || [])
      .filter(m => m.round_number === 1)
      .sort((a, b) => a.match_number - b.match_number)
    
    if (firstRoundMatches.length === 0) {
      alert('No first round matches found!')
      return
    }

    const isTwoSided = bracket.layout === 'two_sided'
    const topConf = bracket.top_bracket_name
    const bottomConf = bracket.bottom_bracket_name
    
    if (isTwoSided && topConf && bottomConf) {
      // Two-sided: split matches and teams by conference
      const half = Math.ceil(firstRoundMatches.length / 2)
      const topMatches = firstRoundMatches.slice(0, half)
      const bottomMatches = firstRoundMatches.slice(half)
      
      const topTeams = clinchedTeams.filter(t => t.conference === topConf).sort((a, b) => a.seed - b.seed)
      const bottomTeams = clinchedTeams.filter(t => t.conference === bottomConf).sort((a, b) => a.seed - b.seed)
      
      // Seed each half separately
      await seedMatchesWithByes(topMatches, topTeams)
      await seedMatchesWithByes(bottomMatches, bottomTeams)
    } else {
      // One-sided: use all teams sorted by seed
      const sortedTeams = clinchedTeams.sort((a, b) => a.seed - b.seed)
      await seedMatchesWithByes(firstRoundMatches, sortedTeams)
    }
    
    // Reload bracket to show changes
    loadBracket()
  }
  
  // Helper to seed matches with auto-BYE for non-power-of-2 team counts
  // BYEs go to top seeds (they face the missing high seeds)
  async function seedMatchesWithByes(matches, teams) {
    const bracketSize = matches.length * 2
    const numTeams = teams.length
    
    // Generate proper bracket seeding order
    // For 8 teams: [1,8], [4,5], [2,7], [3,6] - this ensures top seeds get BYEs
    const generateBracketOrder = (size) => {
      if (size === 2) return [[1, 2]]
      const half = size / 2
      const prevOrder = generateBracketOrder(half)
      const result = []
      for (const [a, b] of prevOrder) {
        result.push([a, size + 1 - a])
        result.push([b, size + 1 - b])
      }
      return result
    }
    
    const seedPairs = generateBracketOrder(bracketSize)
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const [seed1, seed2] = seedPairs[i] || [i * 2 + 1, bracketSize - i * 2]
      
      const team1Entry = teams.find(t => t.seed === seed1)
      const team2Entry = teams.find(t => t.seed === seed2)
      
      // If a seed position has no team (seed > numTeams), it's a BYE
      const team1Id = team1Entry?.team_id || null
      const team2Id = team2Entry?.team_id || null
      
      // Determine if this is a BYE match (one team missing)
      const isBye = (team1Id && !team2Id) || (!team1Id && team2Id)
      
      try {
        if (isBye) {
          // Auto-advance the non-BYE team
          const winnerId = team1Id || team2Id
          await bracketApi.updateMatch(match.id, {
            team1_id: team1Id || '',  // Send empty string for null to ensure it's set
            team2_id: team2Id || '',  // Send empty string for null to ensure it's set
            winner_id: winnerId,
            status: 'completed',
          })
        } else if (team1Id || team2Id) {
          await bracketApi.updateMatch(match.id, {
            team1_id: team1Id || '',
            team2_id: team2Id || '',
          })
        }
      } catch (error) {
        console.error('Failed to update match:', error)
      }
    }
  }

  function openMatchDialog(match) {
    setSelectedMatch(match)
    // If bye_slot is set, mark that slot as BYE
    let team1_id = match.team1?.id || ''
    let team2_id = match.team2?.id || ''
    if (match.bye_slot === 1) team1_id = 'BYE'
    if (match.bye_slot === 2) team2_id = 'BYE'
    setMatchForm({
      team1_id,
      team2_id,
      team1_score: match.team1_score || 0,
      team2_score: match.team2_score || 0,
      game_id: match.game_id || '',
    })
  }

  async function handleUpdateMatch() {
    if (!selectedMatch) return

    try {
      // Handle BYE - treat as null team but auto-set winner
      const team1IsBye = matchForm.team1_id === 'BYE'
      const team2IsBye = matchForm.team2_id === 'BYE'
      const team1Id = (matchForm.team1_id && !team1IsBye) ? matchForm.team1_id : null
      const team2Id = (matchForm.team2_id && !team2IsBye) ? matchForm.team2_id : null
      let winner_id = null
      let status = 'pending'
      
      // BYE logic - the non-BYE team automatically wins
      if (team1IsBye && team2Id) {
        winner_id = team2Id
        status = 'completed'
      } else if (team2IsBye && team1Id) {
        winner_id = team1Id
        status = 'completed'
      } else if (team1Id && team2Id) {
        // Normal match - determine winner based on scores
        if (matchForm.team1_score > matchForm.team2_score) {
          winner_id = team1Id
          status = 'completed'
        } else if (matchForm.team2_score > matchForm.team1_score) {
          winner_id = team2Id
          status = 'completed'
        } else {
          status = 'live'
        }
      }

      // Determine bye_slot: 1 if team1 is BYE, 2 if team2 is BYE, null if no BYE
      const bye_slot = team1IsBye ? 1 : (team2IsBye ? 2 : null)
      
      await bracketApi.updateMatch(selectedMatch.id, {
        team1_id: team1Id,
        team2_id: team2Id,
        team1_score: team1IsBye || team2IsBye ? 0 : matchForm.team1_score,
        team2_score: team1IsBye || team2IsBye ? 0 : matchForm.team2_score,
        status,
        winner_id,
        game_id: matchForm.game_id || null,
        is_bye: team1IsBye || team2IsBye,
        bye_slot,
      })

      setSelectedMatch(null)
      loadBracket()
    } catch (error) {
      console.error('Failed to update match:', error)
    }
  }

  function openEditDialog() {
    // Parse round_names from JSON string if needed
    let roundNames = {}
    if (bracket.round_names) {
      try {
        roundNames = typeof bracket.round_names === 'string' 
          ? JSON.parse(bracket.round_names) 
          : bracket.round_names
      } catch (e) {
        roundNames = {}
      }
    }
    setEditForm({ 
      name: bracket.name, 
      layout: bracket.layout || 'one_sided', 
      round_names: roundNames,
      top_bracket_name: bracket.top_bracket_name || 'Top Bracket',
      bottom_bracket_name: bracket.bottom_bracket_name || 'Bottom Bracket',
      finals_logo_url: bracket.finals_logo_url || ''
    })
    setEditDialogOpen(true)
  }

  function openEditRoundsDialog() {
    // Parse round_names from JSON string if needed
    let roundNames = {}
    if (bracket.round_names) {
      try {
        roundNames = typeof bracket.round_names === 'string' 
          ? JSON.parse(bracket.round_names) 
          : bracket.round_names
      } catch (e) {
        roundNames = {}
      }
    }
    setEditForm({ ...editForm, round_names: roundNames })
    setEditRoundsDialogOpen(true)
  }

  async function handleEditBracket(e) {
    e.preventDefault()
    try {
      // Don't include finals_logo_url - it's managed separately via upload
      const { finals_logo_url, ...formData } = editForm
      await bracketApi.update(bracketId, formData)
      setEditDialogOpen(false)
      loadBracket()
    } catch (error) {
      console.error('Failed to update bracket:', error)
    }
  }

  async function handleSaveRoundNames(e) {
    e.preventDefault()
    try {
      // Filter out empty round names
      const filteredRoundNames = {}
      Object.entries(editForm.round_names || {}).forEach(([key, value]) => {
        if (value && value.trim()) {
          filteredRoundNames[key] = value.trim()
        }
      })
      await bracketApi.update(bracketId, { round_names: filteredRoundNames })
      setEditRoundsDialogOpen(false)
      loadBracket()
    } catch (error) {
      console.error('Failed to update round names:', error)
    }
  }

  function updateRoundName(roundNum, name) {
    setEditForm({
      ...editForm,
      round_names: {
        ...editForm.round_names,
        [roundNum]: name
      }
    })
  }

  async function handleDeleteBracket() {
    try {
      await bracketApi.delete(bracketId)
      navigate(`/leagues/${bracket.league_id}`)
    } catch (error) {
      console.error('Failed to delete bracket:', error)
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
  const isTwoSided = bracket.layout === 'two_sided'

  // Parse custom round names
  const customRoundNames = (() => {
    if (!bracket.round_names) return {}
    try {
      return typeof bracket.round_names === 'string' 
        ? JSON.parse(bracket.round_names) 
        : bracket.round_names
    } catch (e) {
      return {}
    }
  })()

  const getRoundName = (roundNum, total, side = null) => {
    // Check for custom name first
    if (customRoundNames[roundNum]) {
      return customRoundNames[roundNum]
    }
    // Default names
    const remaining = total - roundNum + 1
    if (remaining === 1) return 'Finals'
    if (remaining === 2) return 'Semifinals'
    if (remaining === 3) return 'Quarterfinals'
    if (side) return `Round ${roundNum} (${side})`
    return `Round ${roundNum}`
  }
  
  const getDefaultRoundName = (roundNum, total) => {
    const remaining = total - roundNum + 1
    if (remaining === 1) return 'Finals'
    if (remaining === 2) return 'Semifinals'
    if (remaining === 3) return 'Quarterfinals'
    return `Round ${roundNum}`
  }

  // For two-sided layout, split matches into left and right halves
  const getMatchesBySide = (roundNum) => {
    const matches = matchesByRound[roundNum] || []
    const sorted = matches.sort((a, b) => a.match_number - b.match_number)
    if (!isTwoSided) return { all: sorted }
    
    const half = Math.ceil(sorted.length / 2)
    return {
      left: sorted.slice(0, half),
      right: sorted.slice(half)
    }
  }

  // Generate proper bracket seeding order
  // For 8 teams: [1,8], [4,5], [2,7], [3,6] - this ensures top seeds get BYEs
  const generateBracketOrder = (size) => {
    if (size === 2) return [[1, 2]]
    const half = size / 2
    const prevOrder = generateBracketOrder(half)
    const result = []
    for (const [a, b] of prevOrder) {
      result.push([a, size + 1 - a])
      result.push([b, size + 1 - b])
    }
    return result
  }

  // Calculate seed numbers for first round matches
  // For two-sided brackets, seeds are per-side (per-conference)
  const getSeeds = (matchIndex, totalFirstRoundMatches, side = null) => {
    if (isTwoSided && side) {
      // For two-sided, calculate seeds within each half
      const matchesPerSide = Math.ceil(totalFirstRoundMatches / 2)
      const bracketSize = matchesPerSide * 2
      const seedPairs = generateBracketOrder(bracketSize)
      const [seed1, seed2] = seedPairs[matchIndex] || [1, 2]
      return { seed1, seed2 }
    }
    // One-sided bracket
    const bracketSize = totalFirstRoundMatches * 2
    const seedPairs = generateBracketOrder(bracketSize)
    const [seed1, seed2] = seedPairs[matchIndex] || [1, 2]
    return { seed1, seed2 }
  }

  // Find the champion
  const finalMatch = bracket.matches?.find(m => m.round_number === numRounds)
  const champion = finalMatch?.winner
  
  // Get first round for seed display
  const firstRoundMatches = matchesByRound[1] || []
  const totalFirstRoundMatches = firstRoundMatches.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{bracket.name}</h1>
            {bracket.is_playoff && (
              <span className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                PLAYOFFS
              </span>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {bracket.num_teams} teams - {bracket.bracket_type.replace('_', ' ')} - {bracket.layout === 'two_sided' ? 'Two-Sided' : 'One-Sided'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={openEditDialog} title="Edit bracket">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={openEditRoundsDialog} title="Rename rounds">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDeleteDialogOpen(true)} title="Delete bracket">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          <Button variant="outline" className="gap-2" onClick={copyShareLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
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
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Share Code</p>
              <p className="text-2xl font-bold tracking-wider text-primary dark:text-blue-400">{bracket.share_code}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Tabs for Playoff Brackets */}
      {bracket.is_playoff && (
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'bracket' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('bracket')}
          >
            🏆 Bracket
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'playoff-picture' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('playoff-picture')}
          >
            📊 Playoff Picture
          </button>
        </div>
      )}

      {/* Playoff Picture Tab */}
      {bracket.is_playoff && activeTab === 'playoff-picture' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Playoff Picture</CardTitle>
              {isDraft && (
                <span className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded">
                  DRAFT
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => generatePlayoffPicture(leagueTeams)}>
                🔄 Auto-Rank
              </Button>
              <Button variant="outline" size="sm" onClick={populateBracketFromClinched}>
                🏆 Seed Bracket
              </Button>
              <Button variant="outline" size="sm" onClick={saveDraft}>
                📝 Save Draft
              </Button>
              {isDraft && (
                <Button variant="outline" size="sm" onClick={discardDraft} className="text-red-600 hover:text-red-700">
                  ✗ Discard
                </Button>
              )}
              <Button size="sm" onClick={savePlayoffPicture}>
                💾 Publish
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Group playoff picture by conference */}
            {(() => {
              const conferences = {}
              playoffPicture.forEach(entry => {
                const conf = entry.conference || 'default'
                if (!conferences[conf]) conferences[conf] = []
                conferences[conf].push(entry)
              })
              const confNames = Object.keys(conferences).sort()
              
              return (
                <div className={confNames.length > 1 ? 'grid grid-cols-2 gap-6' : ''}>
                  {confNames.map(conf => (
                    <div key={conf} className="space-y-2">
                      {confNames.length > 1 && (
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300 border-b pb-2 mb-3">
                          {conf === 'default' ? 'All Teams' : conf}
                        </h3>
                      )}
                      {conferences[conf].sort((a, b) => a.seed - b.seed).map((entry) => {
                        const team = leagueTeams.find(t => t.id === entry.team_id)
                        if (!team) return null
                        const confTeams = conferences[conf]
                        return (
                          <div 
                            key={entry.team_id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              entry.status === 'clinched' ? 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700' :
                              entry.status === 'in' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700' :
                              entry.status === 'bubble' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700' :
                              entry.status === 'eliminated' ? 'bg-red-50 border-red-200 opacity-50 dark:bg-red-900/30 dark:border-red-700' :
                              'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(entry.seed)}
                                onValueChange={(val) => updatePlayoffSeed(entry.team_id, parseInt(val))}
                              >
                                <SelectTrigger className="w-20 h-8 text-sm font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: confTeams.length }, (_, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>#{i + 1}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              {team.logo_url ? (
                                <img src={team.logo_url} alt="" className="h-8 w-8 object-contain" />
                              ) : (
                                <div 
                                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: team.color }}
                                >
                                  {team.abbreviation?.charAt(0) || team.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{team.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}
                                </p>
                              </div>
                            </div>
                            <Select
                              value={entry.status}
                              onValueChange={(val) => updatePlayoffStatus(entry.team_id, val)}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="clinched">✓ Clinched</SelectItem>
                                <SelectItem value="in">🎯 In the Hunt</SelectItem>
                                <SelectItem value="bubble">⚠️ On the Bubble</SelectItem>
                                <SelectItem value="eliminated">✗ Eliminated</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500"
                              onClick={() => removeFromPlayoffPicture(entry.team_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })()}
            
            {/* Add team to playoff picture */}
            {leagueTeams.filter(t => !playoffPicture.find(p => p.team_id === t.id)).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Label className="text-sm text-slate-500 dark:text-slate-400">Add Team to Playoff Picture</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {leagueTeams
                    .filter(t => !playoffPicture.find(p => p.team_id === t.id))
                    .map(team => (
                      <Button
                        key={team.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addToPlayoffPicture(team.id)}
                      >
                        + {team.name}
                      </Button>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bracket Display */}
      {(!bracket.is_playoff || activeTab === 'bracket') && (
      <Card className="overflow-hidden">
        <div 
          className="overflow-y-auto p-4"
          style={{ maxHeight: '75vh' }}
        >
          {isTwoSided ? (
            // Two-sided bracket layout - TOP and BOTTOM halves (vertical scroll only)
            <div className="space-y-8">
              {/* Top Half */}
              <div className="border-b pb-6">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">{bracket.top_bracket_name || 'Top Bracket'}</h2>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {rounds.slice(0, -1).map((roundNum) => {
                    const matchData = getMatchesBySide(parseInt(roundNum))
                    const matches = matchData.left || []
                    const isFirstRound = parseInt(roundNum) === 1
                    return (
                      <div key={`top-${roundNum}`} className="flex flex-col shrink-0 min-w-[240px]">
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 text-center bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded">
                          {getRoundName(parseInt(roundNum), numRounds)}
                        </h3>
                        <div className="flex flex-col gap-4">
                          {matches?.map((match, idx) => {
                            const seeds = isFirstRound ? getSeeds(idx, totalFirstRoundMatches, 'top') : null
                            return (
                              <MatchCard 
                                key={match.id} 
                                match={match} 
                                onClick={() => openMatchDialog(match)}
                                seed1={seeds?.seed1}
                                seed2={seeds?.seed2}
                                showSeeds={isFirstRound}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Finals in center */}
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 text-center bg-amber-100 dark:bg-amber-900/50 py-1 px-4 rounded">
                      {getRoundName(numRounds, numRounds)}
                    </h3>
                    {matchesByRound[numRounds]?.map((match) => (
                      <MatchCard key={match.id} match={match} onClick={() => openMatchDialog(match)} />
                    ))}
                  </div>
                  {bracket.finals_logo_url && (
                    <img 
                      src={bracket.finals_logo_url} 
                      alt="Finals logo" 
                      className="h-32 w-auto max-w-48 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Bottom Half */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">{bracket.bottom_bracket_name || 'Bottom Bracket'}</h2>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {rounds.slice(0, -1).map((roundNum) => {
                    const matchData = getMatchesBySide(parseInt(roundNum))
                    const matches = matchData.right || []
                    const isFirstRound = parseInt(roundNum) === 1
                    return (
                      <div key={`bottom-${roundNum}`} className="flex flex-col shrink-0 min-w-[240px]">
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 text-center bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded">
                          {getRoundName(parseInt(roundNum), numRounds)}
                        </h3>
                        <div className="flex flex-col gap-4">
                          {matches?.map((match, idx) => {
                            const seeds = isFirstRound ? getSeeds(idx, totalFirstRoundMatches, 'bottom') : null
                            return (
                              <MatchCard 
                                key={match.id} 
                                match={match} 
                                onClick={() => openMatchDialog(match)}
                                seed1={seeds?.seed1}
                                seed2={seeds?.seed2}
                                showSeeds={isFirstRound}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            // One-sided bracket layout (original)
            <div className="flex gap-6 overflow-x-auto pb-2">
            {rounds.map((roundNum) => {
              const isFirstRound = parseInt(roundNum) === 1
              const isFinals = parseInt(roundNum) === numRounds
              return (
                <div key={roundNum} className={`flex shrink-0 ${isFinals ? 'items-center gap-4' : 'flex-col'}`}>
                  <div className="flex flex-col">
                    <h3 className={`text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4 text-center py-1 px-2 rounded ${isFinals ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      {getRoundName(parseInt(roundNum), numRounds)}
                    </h3>
                    <div className="flex flex-col justify-around flex-1 gap-4">
                      {matchesByRound[roundNum]
                        .sort((a, b) => a.match_number - b.match_number)
                        .map((match) => {
                          const seeds = isFirstRound ? getSeeds(match.match_number, totalFirstRoundMatches) : null
                          return (
                            <MatchCard 
                              key={match.id} 
                              match={match} 
                              onClick={() => openMatchDialog(match)}
                              seed1={seeds?.seed1}
                              seed2={seeds?.seed2}
                              showSeeds={isFirstRound}
                            />
                          )
                        })}
                    </div>
                  </div>
                  {isFinals && bracket.finals_logo_url && (
                    <img 
                      src={bracket.finals_logo_url} 
                      alt="Finals logo" 
                      className="h-32 w-auto max-w-48 object-contain"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>
      </Card>
      )}

      {/* Match Edit Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
            <DialogDescription>Change teams and update scores for this match.</DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4 py-4">
              {/* Team 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Team 1</Label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchForm.team1_id === 'BYE'}
                      onChange={(e) => setMatchForm({ 
                        ...matchForm, 
                        team1_id: e.target.checked ? 'BYE' : '' 
                      })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-500">BYE</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={matchForm.team1_id}
                    onValueChange={(value) => setMatchForm({ ...matchForm, team1_id: value === 'none' ? '' : value })}
                    disabled={matchForm.team1_id === 'BYE'}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- No Team (TBD) --</SelectItem>
                      <SelectItem value="BYE">
                        <span className="text-slate-400 italic">— BYE —</span>
                      </SelectItem>
                      {leagueTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={matchForm.team1_score}
                    onChange={(e) =>
                      setMatchForm({ ...matchForm, team1_score: parseInt(e.target.value) || 0 })
                    }
                    className="w-20 text-center"
                    disabled={matchForm.team1_id === 'BYE' || matchForm.team2_id === 'BYE'}
                  />
                </div>
              </div>

              <div className="text-center text-slate-400 text-sm">vs</div>

              {/* Team 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Team 2</Label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchForm.team2_id === 'BYE'}
                      onChange={(e) => setMatchForm({ 
                        ...matchForm, 
                        team2_id: e.target.checked ? 'BYE' : '' 
                      })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-500">BYE</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={matchForm.team2_id}
                    onValueChange={(value) => setMatchForm({ ...matchForm, team2_id: value === 'none' ? '' : value })}
                    disabled={matchForm.team2_id === 'BYE'}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- No Team (TBD) --</SelectItem>
                      <SelectItem value="BYE">
                        <span className="text-slate-400 italic">— BYE —</span>
                      </SelectItem>
                      {leagueTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={matchForm.team2_score}
                    onChange={(e) =>
                      setMatchForm({ ...matchForm, team2_score: parseInt(e.target.value) || 0 })
                    }
                    className="w-20 text-center"
                    disabled={matchForm.team1_id === 'BYE' || matchForm.team2_id === 'BYE'}
                  />
                </div>
              </div>

              {/* BYE Notice */}
              {(matchForm.team1_id === 'BYE' || matchForm.team2_id === 'BYE') && (
                <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  ⚠️ BYE selected - the other team will automatically advance
                </p>
              )}

              {/* Link to Game */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Link to Game (Optional)</Label>
                <Select
                  value={matchForm.game_id}
                  onValueChange={(value) => setMatchForm({ ...matchForm, game_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Game Linked --</SelectItem>
                    {leagueGames.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.home_team?.name || 'TBD'} vs {game.away_team?.name || 'TBD'}
                        {game.scheduled_at && ` - ${new Date(game.scheduled_at).toLocaleDateString()}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {matchForm.game_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const game = leagueGames.find(g => g.id === matchForm.game_id)
                      if (game) {
                        window.open(`/game/${game.id}`, '_blank')
                      }
                    }}
                  >
                    Open Linked Game
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMatch}>
              Save Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bracket Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditBracket}>
            <DialogHeader>
              <DialogTitle>Edit Bracket</DialogTitle>
              <DialogDescription>Update bracket name and layout.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Bracket Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Layout</Label>
                <Select
                  value={editForm.layout}
                  onValueChange={(value) => setEditForm({ ...editForm, layout: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_sided">One-Sided</SelectItem>
                    <SelectItem value="two_sided">Two-Sided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.layout === 'two_sided' && (
                <>
                  <div className="grid gap-2">
                    <Label>Top Bracket ({league?.group_label_1 || 'Conference'})</Label>
                    {groupOptions.group1.length > 0 ? (
                      <Select
                        value={editForm.top_bracket_name || ''}
                        onValueChange={(value) => setEditForm({ ...editForm, top_bracket_name: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {groupOptions.group1.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editForm.top_bracket_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, top_bracket_name: e.target.value })}
                        placeholder="e.g., AFC, Eastern Conference"
                      />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Bottom Bracket ({league?.group_label_1 || 'Conference'})</Label>
                    {groupOptions.group1.length > 0 ? (
                      <Select
                        value={editForm.bottom_bracket_name || ''}
                        onValueChange={(value) => setEditForm({ ...editForm, bottom_bracket_name: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {groupOptions.group1.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editForm.bottom_bracket_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, bottom_bracket_name: e.target.value })}
                        placeholder="e.g., NFC, Western Conference"
                      />
                    )}
                  </div>
                </>
              )}

              {/* Finals Logo */}
              <div className="space-y-2">
                <Label>Finals Logo (optional)</Label>
                {bracket.finals_logo_url ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="flex items-center gap-3">
                      <img 
                        src={bracket.finals_logo_url} 
                        alt="Finals logo" 
                        className="h-12 w-auto max-w-24 object-contain"
                      />
                      <span className="text-sm text-slate-500">Logo uploaded</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={async () => {
                        try {
                          await bracketApi.deleteFinalsLogo(bracketId)
                          loadBracket()
                        } catch (error) {
                          console.error('Failed to delete logo:', error)
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="finals-logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0]
                        if (!file) return
                        try {
                          console.log('Uploading finals logo:', file.name)
                          const result = await bracketApi.uploadFinalsLogo(bracketId, file)
                          console.log('Upload result:', result)
                          // Update bracket state directly with the new logo URL
                          setBracket(prev => ({ ...prev, finals_logo_url: result.finals_logo_url }))
                        } catch (error) {
                          console.error('Failed to upload logo:', error)
                          alert('Failed to upload logo: ' + (error.message || 'Unknown error'))
                        }
                        e.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('finals-logo-upload').click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Bracket Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bracket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{bracket?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBracket}>
              Delete Bracket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Round Names Dialog */}
      <Dialog open={editRoundsDialogOpen} onOpenChange={setEditRoundsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveRoundNames}>
            <DialogHeader>
              <DialogTitle>Rename Rounds</DialogTitle>
              <DialogDescription>
                Customize the names for each round (e.g., "Wild Card", "Divisional", "Conference Championship").
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4 max-h-[400px] overflow-y-auto">
              {rounds.map((roundNum) => (
                <div key={roundNum} className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-sm text-slate-600">
                    {getDefaultRoundName(parseInt(roundNum), numRounds)}
                  </Label>
                  <Input
                    placeholder={getDefaultRoundName(parseInt(roundNum), numRounds)}
                    value={editForm.round_names?.[roundNum] || ''}
                    onChange={(e) => updateRoundName(roundNum, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRoundsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Round Names</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
