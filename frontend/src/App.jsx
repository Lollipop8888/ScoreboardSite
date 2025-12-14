import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LeaguesPage from './pages/LeaguesPage'
import LeagueDetailPage from './pages/LeagueDetailPage'
import ScoreboardsPage from './pages/ScoreboardsPage'
import ScoreboardDetailPage from './pages/ScoreboardDetailPage'
import LiveGamePage from './pages/LiveGamePage'
import BracketPage from './pages/BracketPage'
import TeamSchedulePage from './pages/TeamSchedulePage'
import SharePage from './pages/SharePage'
import OBSDisplayPage from './pages/OBSDisplayPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* OBS Display - no layout wrapper for clean overlay */}
      <Route path="/obs/:code" element={<OBSDisplayPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="leagues" element={<LeaguesPage />} />
        <Route path="leagues/:leagueId" element={<LeagueDetailPage />} />
        <Route path="leagues/:leagueId/teams/:teamId/schedule" element={<TeamSchedulePage />} />
        <Route path="u/:username" element={<LeaguesPage />} />
        <Route path="scoreboards" element={<ScoreboardsPage />} />
        <Route path="scoreboards/:scoreboardId" element={<ScoreboardDetailPage />} />
        <Route path="games/:gameId" element={<LiveGamePage />} />
        <Route path="standalone/:gameId" element={<LiveGamePage standalone />} />
        <Route path="brackets/:bracketId" element={<BracketPage />} />
        <Route path="share/:type/:code" element={<SharePage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>
    </Routes>
  )
}

export default App
