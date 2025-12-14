import { createContext, useContext, useState, useEffect } from 'react'

const API_URL = ''  // Use relative URLs to go through Vite proxy

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentToken = localStorage.getItem('token')
    if (currentToken) {
      fetchUser(currentToken)
    } else {
      setLoading(false)
    }
  }, [token])

  async function fetchUser(authToken) {
    // Use passed token or get from localStorage
    const tokenToUse = authToken || localStorage.getItem('token')
    if (!tokenToUse) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        // Make sure token state is in sync
        if (!token && tokenToUse) {
          setToken(tokenToUse)
        }
      } else {
        // Token is invalid
        console.error('Token invalid, status:', response.status)
        logout()
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    // Read response body once as text
    const text = await response.text()
    
    if (!response.ok) {
      // Handle empty or non-JSON error responses
      let errorMessage = `Login failed (${response.status})`
      if (text) {
        try {
          const error = JSON.parse(text)
          errorMessage = error.detail || errorMessage
        } catch {
          errorMessage = text || errorMessage
        }
      }
      throw new Error(errorMessage)
    }

    // Parse successful response
    const data = JSON.parse(text)
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    await fetchUser(data.access_token) // Fetch user data after login with new token
    return data
  }

  async function register(email, username, password) {
    console.log('Starting registration...')
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, password })
    })

    console.log('Registration response status:', response.status)

    if (!response.ok) {
      // Handle empty or non-JSON error responses
      const text = await response.text()
      let errorMessage = 'Registration failed'
      if (text) {
        try {
          const error = JSON.parse(text)
          errorMessage = error.detail || errorMessage
        } catch {
          errorMessage = text || errorMessage
        }
      }
      throw new Error(errorMessage)
    }

    console.log('Registration successful, logging in...')
    // Auto-login after registration
    return login(email, password)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  function getAuthHeader() {
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getAuthHeader,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
