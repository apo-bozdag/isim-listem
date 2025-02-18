import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { supabase } from '../utils/supabase'

const ITEMS_PER_PAGE = 12

const Discover = () => {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'popular', 'alpha'

  useEffect(() => {
    const fetchLists = async () => {
      try {
        setLoading(true)
        
        let query = supabase
          .from('lists')
          .select(`
            *,
            users (
              username
            )
          `)
          .eq('is_public', true)

        // Arama sorgusu varsa, başlık ve açıklamada ara
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        }

        // Sıralama seçeneğine göre sırala
        switch (sortBy) {
          case 'popular':
            query = query.order('views', { ascending: false })
            break
          case 'alpha':
            query = query.order('title', { ascending: true })
            break
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false })
        }

        // Toplam liste sayısını al
        const { count } = await supabase
          .from('lists')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true)
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)

        setTotalCount(count)

        // Listeleri getir
        const { data, error } = await query
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

        if (error) throw error

        setLists(data)
        setHasMore(data.length === ITEMS_PER_PAGE && page * ITEMS_PER_PAGE < count)
      } catch (error) {
        console.error('Listeler yüklenirken hata:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLists()
  }, [page, searchQuery, sortBy])

  // Arama işlemini gerçekleştir
  const performSearch = (value) => {
    setPage(1)
    setSearchQuery(value.trim())
  }

  // Input değiştiğinde
  const handleInputChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    
    // Debounce uygula
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      performSearch(value)
    }, 1000) // 1 saniye bekle
    setSearchTimeout(timeout)
  }

  // Input'tan çıkıldığında
  const handleBlur = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    performSearch(inputValue)
  }

  // Tuşa basıldığında
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchTimeout) clearTimeout(searchTimeout)
      performSearch(inputValue)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Keşfet
            </h1>
            <p className="text-gray-600">
              Toplam {totalCount} herkese açık liste
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full max-w-md">
            <Input
              placeholder="Liste ara... (Enter'a bas veya inputtan çık)"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={sortBy === 'newest' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortBy('newest')}
            >
              En Yeni
            </Button>
            <Button
              variant={sortBy === 'popular' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortBy('popular')}
            >
              En Popüler
            </Button>
            <Button
              variant={sortBy === 'alpha' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortBy('alpha')}
            >
              Alfabetik
            </Button>
          </div>
        </div>
      </div>

      {loading && page === 1 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
        </div>
      ) : lists.length > 0 ? (
        <>
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
                <Link to={`/s/${list.id}`} className="block">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {list.title}
                  </h2>
                  {list.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {list.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="text-violet-600">
                        {list.users?.username}
                      </span>
                      <span className="flex items-center text-gray-500">
                        <svg 
                          className="w-3 h-3 mr-1" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                          />
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                          />
                        </svg>
                        {list.views || 0}
                      </span>
                    </div>
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
          </motion.div>

          {/* Sayfalama */}
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1 || loading}
            >
              Önceki
            </Button>
            <span className="inline-flex items-center px-4 py-2 text-sm text-gray-700">
              Sayfa {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
            >
              Sonraki
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-900 mb-4">
            {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz paylaşılan liste bulunmuyor'}
          </h2>
          <p className="text-gray-600">
            {searchQuery ? 'Farklı anahtar kelimelerle tekrar deneyin' : 'İlk paylaşılan listeyi oluşturmak için hemen üye ol!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default Discover 