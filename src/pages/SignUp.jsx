import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../stores/authStore'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const SignUp = () => {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
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

    // Rastgele bir e-posta oluştur
    const randomString = Math.random().toString(36).substring(2)
    const email = `${username}_${randomString}@temp.com`

    const { error: signUpError } = await signUp({ email, password, username })

    if (signUpError) {
      console.error('SignUp Error:', signUpError)
      setError(signUpError)
      setLoading(false)
      return
    }

    setLoading(false)
    // Başarılı kayıt sonrası ana sayfaya yönlendir
    navigate('/')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-lg shadow-sm"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Hemen Kayıt Ol
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
            {loading ? 'Kayıt Olunuyor...' : 'Kayıt Ol'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Zaten hesabın var mı?{' '}
            <button
              type="button"
              onClick={() => navigate('/giris')}
              className="text-violet-600 hover:text-violet-700"
            >
              Giriş Yap
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  )
}

export default SignUp 