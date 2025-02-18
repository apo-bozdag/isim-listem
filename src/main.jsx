import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Environment değişkenlerini kontrol et
console.log('Environment değişkenleri yükleniyor...')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY mevcut:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
