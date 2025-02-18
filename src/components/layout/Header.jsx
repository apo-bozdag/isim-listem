import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../stores/authStore'
import Button from '../ui/Button'
import CreateListModal from '../lists/CreateListModal'

const Header = () => {
  const { user, username, signOut } = useAuthStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-violet-600">İsim Listem</span>
            </Link>
            <Link to="/kesfet">
              <Button variant="outline" size="sm">
                Keşfet
              </Button>
            </Link>
          </motion.div>

          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-600">
                  Merhaba, <span className="font-medium text-violet-600">{username}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Liste Oluştur
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Çıkış Yap
                </Button>
              </>
            ) : (
              <>
                <Link to="/giris">
                  <Button variant="outline" size="sm">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/kayit">
                  <Button size="sm">
                    Kayıt Ol
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </header>
  )
}

export default Header 