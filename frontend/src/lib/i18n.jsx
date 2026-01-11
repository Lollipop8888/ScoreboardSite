import { createContext, useContext, useState, useEffect } from 'react'

// Translations for the app
const translations = {
  en: {
    // Home page
    hero_title_1: 'GridIron',
    hero_title_2: 'Football',
    hero_title_3: 'Scoreboard',
    hero_subtitle: 'The ultimate scorekeeping platform for football leagues, games, and tournaments. Real-time updates, easy sharing, and professional-grade tracking.',
    start_league: 'Start a League',
    quick_scoreboard: 'Quick Scoreboard',
    have_code: 'Have a display code?',
    enter_code: 'Enter share code...',
    join: 'Join',
    joining: 'Joining...',
    no_display_found: 'No display found with that code',
    
    // Features
    features_title: 'Everything You Need',
    features_subtitle: 'Professional-grade tools for managing your football league',
    feature_league_title: 'League Management',
    feature_league_desc: 'Full season tracking with standings, conferences, divisions, and automatic win/loss records.',
    feature_bracket_title: 'Playoff Brackets',
    feature_bracket_desc: 'Single and double elimination brackets with automatic advancement and seeding.',
    feature_realtime_title: 'Real-Time Updates',
    feature_realtime_desc: 'Live scoring that syncs instantly across all devices. Perfect for streaming.',
    feature_share_title: 'Easy Sharing',
    feature_share_desc: 'Share games with a simple code. Viewers see live updates without signing in.',
    
    // How it works
    how_title: 'How It Works',
    how_subtitle: 'Get started in minutes',
    how_step1_title: 'Create Your League',
    how_step1_desc: 'Set up teams, customize colors, and configure your season settings.',
    how_step2_title: 'Schedule Games',
    how_step2_desc: 'Add matchups to your schedule. Organize by week or custom time periods.',
    how_step3_title: 'Go Live',
    how_step3_desc: 'Start scoring! Share the link and let everyone follow along in real-time.',
    
    // Stats
    stats_title: 'Trusted by Teams Everywhere',
    leagues_created: 'Leagues Created',
    games_played: 'Games Played',
    
    // Invites
    pending_invites: 'pending invite',
    pending_invites_plural: 'pending invites',
    view_invites: 'View Invites',
    invited_you: 'invited you to',
    accept: 'Accept',
    decline: 'Decline',
    view_access: 'View access',
    control_access: 'Control access',
    
    // Common
    language: 'Language',
  },
  es: {
    // Home page
    hero_title_1: 'GridIron',
    hero_title_2: 'Fútbol',
    hero_title_3: 'Marcador',
    hero_subtitle: 'La plataforma definitiva para ligas, partidos y torneos de fútbol americano. Actualizaciones en tiempo real, fácil de compartir y seguimiento profesional.',
    start_league: 'Crear Liga',
    quick_scoreboard: 'Marcador Rápido',
    have_code: '¿Tienes un código?',
    enter_code: 'Ingresa el código...',
    join: 'Unirse',
    joining: 'Uniéndose...',
    no_display_found: 'No se encontró ningún display con ese código',
    
    // Features
    features_title: 'Todo lo que Necesitas',
    features_subtitle: 'Herramientas profesionales para gestionar tu liga de fútbol',
    feature_league_title: 'Gestión de Ligas',
    feature_league_desc: 'Seguimiento completo de temporada con clasificaciones, conferencias, divisiones y registros automáticos.',
    feature_bracket_title: 'Llaves de Playoffs',
    feature_bracket_desc: 'Llaves de eliminación simple y doble con avance automático y sembrado.',
    feature_realtime_title: 'Tiempo Real',
    feature_realtime_desc: 'Marcador en vivo que se sincroniza instantáneamente. Perfecto para streaming.',
    feature_share_title: 'Fácil de Compartir',
    feature_share_desc: 'Comparte partidos con un código simple. Los espectadores ven actualizaciones en vivo.',
    
    // How it works
    how_title: 'Cómo Funciona',
    how_subtitle: 'Comienza en minutos',
    how_step1_title: 'Crea tu Liga',
    how_step1_desc: 'Configura equipos, personaliza colores y ajusta la configuración de tu temporada.',
    how_step2_title: 'Programa Partidos',
    how_step2_desc: 'Añade enfrentamientos a tu calendario. Organiza por semana o períodos personalizados.',
    how_step3_title: 'En Vivo',
    how_step3_desc: '¡Comienza a marcar! Comparte el enlace y deja que todos sigan en tiempo real.',
    
    // Stats
    stats_title: 'Usado por Equipos en Todas Partes',
    leagues_created: 'Ligas Creadas',
    games_played: 'Partidos Jugados',
    
    // Invites
    pending_invites: 'invitación pendiente',
    pending_invites_plural: 'invitaciones pendientes',
    view_invites: 'Ver Invitaciones',
    invited_you: 'te invitó a',
    accept: 'Aceptar',
    decline: 'Rechazar',
    view_access: 'Acceso de vista',
    control_access: 'Acceso de control',
    
    // Common
    language: 'Idioma',
  },
  fr: {
    // Home page
    hero_title_1: 'GridIron',
    hero_title_2: 'Football',
    hero_title_3: 'Tableau de Bord',
    hero_subtitle: 'La plateforme ultime pour les ligues, matchs et tournois de football américain. Mises à jour en temps réel, partage facile et suivi professionnel.',
    start_league: 'Créer une Ligue',
    quick_scoreboard: 'Tableau Rapide',
    have_code: 'Vous avez un code?',
    enter_code: 'Entrez le code...',
    join: 'Rejoindre',
    joining: 'Connexion...',
    no_display_found: 'Aucun affichage trouvé avec ce code',
    
    // Features
    features_title: 'Tout ce dont Vous Avez Besoin',
    features_subtitle: 'Outils professionnels pour gérer votre ligue de football',
    feature_league_title: 'Gestion de Ligue',
    feature_league_desc: 'Suivi complet de saison avec classements, conférences, divisions et records automatiques.',
    feature_bracket_title: 'Tableaux Éliminatoires',
    feature_bracket_desc: 'Tableaux à élimination simple et double avec avancement automatique.',
    feature_realtime_title: 'Temps Réel',
    feature_realtime_desc: 'Score en direct synchronisé instantanément. Parfait pour le streaming.',
    feature_share_title: 'Partage Facile',
    feature_share_desc: 'Partagez les matchs avec un code simple. Les spectateurs voient les mises à jour en direct.',
    
    // How it works
    how_title: 'Comment ça Marche',
    how_subtitle: 'Commencez en quelques minutes',
    how_step1_title: 'Créez Votre Ligue',
    how_step1_desc: 'Configurez les équipes, personnalisez les couleurs et ajustez les paramètres.',
    how_step2_title: 'Planifiez les Matchs',
    how_step2_desc: 'Ajoutez des matchs à votre calendrier. Organisez par semaine ou périodes personnalisées.',
    how_step3_title: 'En Direct',
    how_step3_desc: 'Commencez à marquer! Partagez le lien et laissez tout le monde suivre en temps réel.',
    
    // Stats
    stats_title: 'Utilisé par des Équipes Partout',
    leagues_created: 'Ligues Créées',
    games_played: 'Matchs Joués',
    
    // Invites
    pending_invites: 'invitation en attente',
    pending_invites_plural: 'invitations en attente',
    view_invites: 'Voir les Invitations',
    invited_you: 'vous a invité à',
    accept: 'Accepter',
    decline: 'Refuser',
    view_access: 'Accès en lecture',
    control_access: 'Accès en contrôle',
    
    // Common
    language: 'Langue',
  },
}

// Language names for display
export const languageNames = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
}

// Language flags/icons
export const languageFlags = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
}

// Create context
const LanguageContext = createContext()

// Provider component
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first, then browser language, default to English
    const saved = localStorage.getItem('language')
    if (saved && translations[saved]) return saved
    
    const browserLang = navigator.language.split('-')[0]
    if (translations[browserLang]) return browserLang
    
    return 'en'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  // Translation function
  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook to use translations
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default translations
