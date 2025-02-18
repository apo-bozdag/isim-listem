import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import useAuthStore from '../stores/authStore'
import useListStore from '../stores/listStore'
import CreateListModal from '../components/lists/CreateListModal'
import { supabase } from '../utils/supabase'

const Home = () => {
  const { user, username } = useAuthStore()
  const { lists, fetchLists, loading } = useListStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [publicLists, setPublicLists] = useState([])
  const [publicListsLoading, setPublicListsLoading] = useState(true)
  const location = useLocation()
  const [error, setError] = useState(location.state?.error || null)

  useEffect(() => {
    if (user) {
      fetchLists(user.id)
    } else {
      // Herkese açık listeleri getir
      const fetchPublicLists = async () => {
        try {
          setPublicListsLoading(true)
          const { data, error } = await supabase
            .from('lists')
            .select(`
              *,
              users (
                username
              )
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(3)

          if (error) throw error
          setPublicLists(data)
        } catch (error) {
          console.error('Herkese açık listeler yüklenirken hata:', error)
        } finally {
          setPublicListsLoading(false)
        }
      }

      fetchPublicLists()
    }
  }, [user])

  useEffect(() => {
    if (location.state?.error) {
      // 3 saniye sonra hata mesajını kaldır
      const timer = setTimeout(() => {
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  if (user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}
        <div className="flex justify-between items-center mb-8">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-gray-900"
          >
            Hoş geldin, {username}!
          </motion.h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
          </div>
        ) : lists.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {lists.map((list) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <Link to={`/liste/${list.id}`} className="block">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {list.title}
                  </h2>
                  {list.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {list.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>
                      {new Date(list.created_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    {list.is_public && (
                      <span className="bg-violet-100 text-violet-800 px-2 py-1 rounded-full text-xs">
                        Herkese Açık
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              Henüz hiç listen yok
            </h2>
            <p className="text-gray-600">
              Sağ üstteki "Liste Oluştur" butonuna tıklayarak yeni bir liste oluşturabilirsin.
            </p>
          </motion.div>
        )}

        <CreateListModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl"
        >
          <span className="block">İsimlerinizi</span>
          <span className="block text-violet-600">Organize Edin</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
        >
          İsim listeleri oluşturun, düzenleyin ve paylaşın. Beğendiğiniz isimleri notlarla birlikte kaydedin.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0"
        >
          <Link to="/kayit" className="w-full sm:w-[140px]">
            <Button size="md" className="w-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-violet-600 to-violet-700">
              Hemen Başla
            </Button>
          </Link>
          <Link to="/giris" className="w-full sm:w-[140px]">
            <Button variant="outline" size="md" className="w-full shadow-sm hover:shadow-md transition-shadow border-2">
              Giriş Yap
            </Button>
          </Link>
        </motion.div>

        {/* Son Paylaşılan Listeler */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Son Paylaşılan Listeler
            </h2>
            <Link to="/kesfet">
              <Button variant="outline" size="sm">
                Tümünü Gör
              </Button>
            </Link>
          </div>
          
          {publicListsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
            </div>
          ) : publicLists.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {publicLists.map((list) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
                >
                  <Link to={`/s/${list.id}`} className="block">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {list.title}
                    </h3>
                    {list.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span className="text-violet-600">
                        {list.users?.username}
                      </span>
                      <span>
                        {new Date(list.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Henüz paylaşılan liste bulunmuyor.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Özellikler
          </h2>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Liste Oluşturma
              </h3>
              <p className="text-gray-500">
                İstediğiniz kadar liste oluşturun ve düzenleyin.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Not Ekleme
              </h3>
              <p className="text-gray-500">
                Her isim için özel notlar ekleyin.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Kolay Paylaşım
              </h3>
              <p className="text-gray-500">
                Listelerinizi başkalarıyla paylaşın.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Home 