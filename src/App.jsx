import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import ListDetail from './pages/ListDetail'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import Discover from './pages/Discover'
import useAuthStore from './stores/authStore'
import { supabase } from './utils/supabase'

// Korumalı route bileşeni
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/giris" replace />
  }
  
  return children
}

function App() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    console.log('App başlatılıyor...')
    
    // Supabase bağlantı testi
    const testSupabase = async () => {
      try {
        console.log('Supabase bağlantısı test ediliyor...')
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
        console.log('Supabase Key uzunluğu:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length)
        
        const { data, error } = await supabase
          .from('lists')
          .select('count')
          .limit(1)
        
        console.log('Supabase test sonucu:', { data, error })
        
        if (error) throw error
      } catch (error) {
        console.error('Supabase bağlantı hatası:', error)
      }
    }
    
    testSupabase()
    initializeAuth()
  }, [])

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Genel Rotalar */}
          <Route path="/" element={<Home />} />
          <Route path="/giris" element={<SignIn />} />
          <Route path="/kayit" element={<SignUp />} />
          <Route path="/kesfet" element={<Discover />} />
          
          {/* Korumalı Rotalar */}
          <Route path="/liste/:listId" element={
            <ProtectedRoute>
              <ListDetail />
            </ProtectedRoute>
          } />
          
          {/* Paylaşılan Liste Rotası */}
          <Route path="/s/:listId" element={<ListDetail />} />
          
          {/* 404 Sayfası */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-8">Aradığınız sayfa bulunamadı.</p>
              <button 
                onClick={() => window.history.back()}
                className="text-violet-600 hover:text-violet-700"
              >
                Geri Dön
              </button>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
