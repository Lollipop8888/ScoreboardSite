import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LeaguesPage from './pages/LeaguesPage'
import LeagueDetailPage from './pages/LeagueDetailPage'
import ScoreboardsPage from './pages/ScoreboardsPage'
import ScoreboardDetailPage from './pages/ScoreboardDetailPage'
import LiveGamePage from './pages/LiveGamePage'
import BracketPage from './pages/BracketPage'
import SharePage from './pages/SharePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="leagues" element={<LeaguesPage />} />
        <Route path="leagues/:leagueId" element={<LeagueDetailPage />} />
        <Route path="scoreboards" element={<ScoreboardsPage />} />
        <Route path="scoreboards/:scoreboardId" element={<ScoreboardDetailPage />} />
        <Route path="games/:gameId" element={<LiveGamePage />} />
        <Route path="brackets/:bracketId" element={<BracketPage />} />
        <Route path="share/:type/:code" element={<SharePage />} />
      </Route>
    </Routes>
  )
}

export default App
