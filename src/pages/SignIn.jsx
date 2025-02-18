import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../utils/supabase'
import useAuthStore from '../stores/authStore'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const SignIn = () => {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (username.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır.')
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      // Kullanıcı adına göre kullanıcıyı bul
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('username', username)
        .single()

      if (userError || !userData) {
        setError('Kullanıcı adı veya şifre hatalı.')
        setLoading(false)
        return
      }

      // Giriş yap
      const { error: signInError } = await signIn({ 
        email: userData.email, 
        password 
      })

      if (signInError) {
        console.error('Giriş hatası:', signInError)
        setError('Kullanıcı adı veya şifre hatalı.')
        setLoading(false)
        return
      }

      // Başarılı giriş sonrası ana sayfaya yönlendir
      navigate('/')
    } catch (error) {
      console.error('Giriş hatası:', error)
      setError('Giriş yapılamadı. Lütfen tekrar deneyin.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-lg shadow-sm"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Giriş Yap
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              required
              autoFocus
            />
          </div>

          <div>
            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Hesabın yok mu?{' '}
            <button
              type="button"
              onClick={() => navigate('/kayit')}
              className="text-violet-600 hover:text-violet-700"
            >
              Kayıt Ol
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  )
}

export default SignIn 