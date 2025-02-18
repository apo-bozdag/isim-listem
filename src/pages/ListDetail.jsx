import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useListStore from '../stores/listStore'
import useAuthStore from '../stores/authStore'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Toast from '../components/ui/Toast'
import { supabase, queueRequest } from '../utils/supabase'
import { Switch } from '@headlessui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MDEditor from '@uiw/react-md-editor'

const ListDetail = () => {
  const { listId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentList, setCurrentList, loading, error, updateList, deleteList, setLoading, setError } = useListStore()
  const [names, setNames] = useState([])
  const [sortOrder, setSortOrder] = useState('date') // 'date' veya 'alpha'
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const itemsPerPage = 20
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    isPublic: false
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)
  const [isAddNameModalOpen, setIsAddNameModalOpen] = useState(false)
  const [newName, setNewName] = useState({
    name: '',
    note: ''
  })
  const [addNameLoading, setAddNameLoading] = useState(false)
  const [addNameError, setAddNameError] = useState(null)
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false)
  const [isDeleteNameModalOpen, setIsDeleteNameModalOpen] = useState(false)
  const [selectedName, setSelectedName] = useState(null)
  const [editNameForm, setEditNameForm] = useState({
    name: '',
    note: ''
  })
  const [editNameLoading, setEditNameLoading] = useState(false)
  const [editNameError, setEditNameError] = useState(null)
  const [deleteNameLoading, setDeleteNameLoading] = useState(false)
  const [isSharedList, setIsSharedList] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Paylaşılan liste kontrolü
        const isSharedList = window.location.pathname.startsWith('/s/')
        setIsSharedList(isSharedList)
        
        // Liste detaylarını getir
        const { data: listData, error: listError } = await queueRequest(() =>
          supabase
            .from('lists')
            .select(`
              *,
              users (
                username
              )
            `)
            .eq('id', listId)
            .maybeSingle()
        )

        if (listError) {
          console.error('Liste yüklenirken hata:', listError)
          throw new Error('Liste yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.')
        }

        if (!listData) {
          navigate('/', { 
            replace: true,
            state: { error: 'Bu liste silinmiş veya artık mevcut değil.' }
          })
          return
        }

        // Eğer paylaşılan liste değilse ve liste gizli ve kullanıcı sahibi değilse erişimi engelle
        if (!isSharedList && !listData.is_public && (!user || user.id !== listData.user_id)) {
          navigate('/', { 
            replace: true,
            state: { error: 'Bu liste gizli. Sadece liste sahibi görüntüleyebilir.' }
          })
          return
        }

        setCurrentList(listData)
        setEditForm({
          title: listData.title,
          description: listData.description || '',
          isPublic: listData.is_public
        })

        // Görüntüleme sayısını artır
        try {
          let viewParams = {}
          
          if (user) {
            viewParams = {
              list_id_param: listId,
              user_id_param: user.id,
              ip_address_param: null
            }
          } else {
            const ipResponse = await fetch('https://api.ipify.org?format=json')
            const ipData = await ipResponse.json()
            
            viewParams = {
              list_id_param: listId,
              user_id_param: null,
              ip_address_param: ipData.ip
            }
          }

          await queueRequest(() =>
            supabase.rpc('increment_list_view', viewParams)
          )
        } catch (viewError) {
          console.error('Görüntülenme işlemi sırasında hata:', viewError)
        }

        // İsimleri getir
        await fetchNames(1, '')
      } catch (error) {
        console.error('Liste yüklenirken hata:', error)
        setError(error.message || 'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }

    if (listId) {
      fetchList()
    }
  }, [listId, user, navigate])

  const handleSort = () => {
    setSortOrder(prev => prev === 'date' ? 'alpha' : 'date')
  }

  const cleanText = (text) => {
    if (!text) return ''
    return text
      .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
      .trim() // Baş ve sondaki boşlukları temizle
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.title.trim()) {
      setEditError('Liste adı boş olamaz.')
      return
    }

    setEditLoading(true)
    setEditError(null)

    try {
      const { data, error } = await updateList({
        id: listId,
        title: cleanText(editForm.title),
        description: cleanText(editForm.description),
        isPublic: editForm.isPublic
      })

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('Güncelleme hatası:', error)
        throw new Error('Liste güncellenirken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      if (!data) {
        throw new Error('Liste güncellenemedi. Lütfen tekrar deneyin.')
      }

      setCurrentList(data)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Liste güncelleme hatası:', error)
      setEditError(error.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleteNameLoading(true)
      
      // Önce listedeki tüm isimleri sil
      const { error: namesError } = await queueRequest(() =>
        supabase
          .from('names')
          .delete()
          .eq('list_id', listId)
      )

      if (namesError) {
        if (namesError.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('İsimler silinirken hata:', namesError)
        throw new Error('Liste silinirken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      // Sonra listeyi sil
      const { error: listError } = await queueRequest(() =>
        supabase
          .from('lists')
          .delete()
          .eq('id', listId)
      )

      if (listError) {
        if (listError.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('Liste silinirken hata:', listError)
        throw new Error('Liste silinirken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      // Başarılı silme sonrası ana sayfaya yönlendir
      navigate('/', { 
        replace: true,
        state: { message: 'Liste başarıyla silindi.' }
      })
    } catch (error) {
      console.error('Liste silme hatası:', error)
      setError(error.message || 'Liste silinirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setDeleteNameLoading(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleAddName = async (e) => {
    e.preventDefault()
    
    try {
      if (!currentList || !currentList.id) {
        setAddNameError('Liste bilgileri yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.')
        return
      }

      const cleanedName = cleanText(newName.name)
      const cleanedNote = cleanText(newName.note)

      if (!cleanedName) {
        setAddNameError('İsim boş olamaz.')
        return
      }

      if (cleanedName.length > 100) {
        setAddNameError('İsim çok uzun. En fazla 100 karakter olabilir.')
        return
      }

      setAddNameLoading(true)
      setAddNameError(null)

      const insertData = {
        name: cleanedName,
        note: cleanedNote || '',
        list_id: currentList.id,
        created_at: new Date().toISOString()
      }

      const { data: insertedData, error: insertError } = await queueRequest(() =>
        supabase
          .from('names')
          .insert([insertData])
          .select()
          .single()
      )

      if (insertError) {
        if (insertError.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('Ekleme hatası:', insertError)
        throw new Error('İsim eklenirken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      if (!insertedData) {
        throw new Error('İsim eklenemedi. Lütfen tekrar deneyin.')
      }

      // State'i güncelle
      setNames(prev => [insertedData, ...prev])
      setNewName({ name: '', note: '' })
      setIsAddNameModalOpen(false)
    } catch (error) {
      console.error('İsim ekleme hatası:', error)
      setAddNameError(error.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setAddNameLoading(false)
    }
  }

  const handleEditName = async (e) => {
    e.preventDefault()
    if (!editNameForm.name.trim()) {
      setEditNameError('İsim boş olamaz.')
      return
    }

    setEditNameLoading(true)
    setEditNameError(null)

    try {
      const { data, error } = await supabase
        .from('names')
        .update({
          name: cleanText(editNameForm.name),
          note: cleanText(editNameForm.note)
        })
        .eq('id', selectedName.id)
        .select()

      if (error) throw error

      setNames(prev => prev.map(name => 
        name.id === selectedName.id ? data[0] : name
      ))
      setIsEditNameModalOpen(false)
    } catch (error) {
      console.error('İsim güncellenirken hata:', error)
      setEditNameError('İsim güncellenirken bir hata oluştu.')
    } finally {
      setEditNameLoading(false)
    }
  }

  const handleDeleteName = async () => {
    setDeleteNameLoading(true)

    try {
      const { error } = await supabase
        .from('names')
        .delete()
        .eq('id', selectedName.id)

      if (error) throw error

      setNames(prev => prev.filter(name => name.id !== selectedName.id))
      setIsDeleteNameModalOpen(false)
    } catch (error) {
      console.error('İsim silinirken hata:', error)
    } finally {
      setDeleteNameLoading(false)
    }
  }

  // Arama ve sayfalama ile isimleri getir
  const fetchNames = async (page = 1, query = '') => {
    try {
      setIsLoadingMore(true)
      
      // Toplam kayıt sayısını al
      const countQuery = supabase
        .from('names')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', listId)
        
      if (query) {
        countQuery.ilike('name', `%${query}%`)
      }
      
      const { count, error: countError } = await queueRequest(() => countQuery)
      
      if (countError) {
        console.error('Kayıt sayısı alınırken hata:', countError)
        throw new Error('İsimler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.')
      }
      
      setTotalCount(count || 0)
      
      // İsimleri getir
      const namesQuery = supabase
        .from('names')
        .select('*')
        .eq('list_id', listId)
        .order(sortOrder === 'date' ? 'created_at' : 'name', { ascending: sortOrder === 'alpha' })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)
      
      if (query) {
        namesQuery.ilike('name', `%${query}%`)
      }
      
      const { data: namesData, error: namesError } = await queueRequest(() => namesQuery)
      
      if (namesError) {
        console.error('İsimler yüklenirken hata:', namesError)
        throw new Error('İsimler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.')
      }
      
      if (page === 1) {
        setNames(namesData || [])
      } else {
        setNames(prev => [...prev, ...(namesData || [])])
      }
    } catch (error) {
      console.error('İsimler yüklenirken hata:', error)
      setError(error.message || 'İsimler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Debounce işlemi için useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500) // 500ms bekle

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Arama işlemi için useEffect
  useEffect(() => {
    if (listId) {
      setCurrentPage(1)
      fetchNames(1, debouncedSearchQuery)
    }
  }, [listId, debouncedSearchQuery, sortOrder])

  // Arama input değişikliği
  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
  }

  // Daha fazla yükle
  const handleLoadMore = () => {
    if (!isLoadingMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchNames(nextPage, debouncedSearchQuery)
    }
  }

  // Liste ID'si değiştiğinde
  useEffect(() => {
    if (listId) {
      setCurrentPage(1)
      setSearchQuery('')
      setDebouncedSearchQuery('')
    }
  }, [listId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-lg shadow-sm"
          >
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Bir Hata Oluştu
            </h2>
            <p className="text-gray-600 mb-8">
              {error}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Geri Dön
              </Button>
              <Link to="/">
                <Button>
                  Ana Sayfaya Git
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const isOwner = user && currentList && user.id === currentList.user_id

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {currentList && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentList.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {!isSharedList && currentList.is_public && (
                <button
                  onClick={() => {
                    const shareLink = `${window.location.origin}/s/${currentList.id}`
                    const shareText = `${currentList.title}\n${shareLink}`
                    navigator.clipboard.writeText(shareText)
                    setShowToast(true)
                    setTimeout(() => setShowToast(false), 3000)
                  }}
                  className="inline-flex items-center px-3 py-1.5 gap-1.5 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors group"
                >
                  <svg 
                    className="w-4 h-4 transition-transform group-hover:scale-110" 
                    fill="none"
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
                    />
                  </svg>
                  <span>Paylaş</span>
                </button>
              )}

              <div className="inline-flex items-center px-3 py-1.5 gap-1.5 rounded-full bg-gray-50 text-gray-700">
                <svg 
                  className="w-4 h-4" 
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
                <span>{currentList.views || 0} görüntülenme</span>
              </div>

              {isOwner ? (
                <button
                  onClick={async () => {
                    try {
                      setEditLoading(true)
                      const { data, error } = await updateList({
                        id: listId,
                        title: currentList.title,
                        description: currentList.description,
                        isPublic: !currentList.is_public
                      })
                      if (error) throw error
                      setCurrentList(data)
                    } catch (error) {
                      console.error('Gizlilik durumu güncellenirken hata:', error)
                    } finally {
                      setEditLoading(false)
                    }
                  }}
                  disabled={editLoading}
                  className={`inline-flex items-center px-3 py-1.5 gap-1.5 rounded-full transition-all duration-200 ${
                    currentList.is_public 
                      ? 'bg-violet-50 text-violet-700 hover:bg-violet-100' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  } ${editLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${editLoading ? 'animate-pulse' : ''}`} 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    {currentList.is_public ? (
                      <>
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </>
                    ) : (
                      <>
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 00-2.79.588l.77.771A5.944 5.944 0 018 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
                        <path d="M11.297 9.176a3.5 3.5 0 00-4.474-4.474l.823.823a2.5 2.5 0 012.829 2.829l.822.822zm-2.943 1.299l.822.822a3.5 3.5 0 01-4.474-4.474l.823.823a2.5 2.5 0 002.829 2.829z" />
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 001.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 018 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709z" />
                        <path fillRule="evenodd" d="M13.646 14.354l-12-12 .708-.708 12 12-.708.708z" clipRule="evenodd" />
                      </>
                    )}
                  </svg>
                  <span>{currentList.is_public ? 'Herkese Açık' : 'Gizli'}</span>
                </button>
              ) : currentList.is_public && (
                <div className="inline-flex items-center px-3 py-1.5 gap-1.5 rounded-full bg-violet-50 text-violet-700">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>Herkese Açık</span>
                </div>
              )}
            </div>

            {currentList.description && (
              <div className="prose prose-sm max-w-none text-gray-600 mt-4">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a 
                        {...props} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-700 hover:underline"
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p {...props} className="!my-0" />
                    )
                  }}
                >
                  {currentList.description}
                </ReactMarkdown>
              </div>
            )}

            <div className="mt-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="İsimlerde ara..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {isOwner && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddNameModalOpen(true)}
                      className="group flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <svg 
                        className="w-4 h-4 transition-transform group-hover:scale-110" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                        />
                      </svg>
                      İsim Ekle
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSort}
                    className="group flex items-center gap-2 hover:bg-violet-50 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <svg 
                      className="w-4 h-4 transition-transform group-hover:rotate-180" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      {sortOrder === 'date' ? (
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" 
                        />
                      ) : (
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" 
                        />
                      )}
                    </svg>
                    {sortOrder === 'date' ? 'Alfabetik Sırala' : 'Tarihe Göre Sırala'}
                  </Button>

                  {isOwner && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                        className="group flex items-center gap-2 hover:bg-violet-50 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <svg 
                          className="w-4 h-4 transition-transform group-hover:scale-110" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                          />
                        </svg>
                        Düzenle
                      </Button>
                      
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="group flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <svg 
                          className="w-4 h-4 transition-transform group-hover:scale-110" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
                        Sil
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4"
              >
                {names.length > 0 ? (
                  <>
                    {names.map((name) => (
                      <motion.div
                        key={name.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {name.name}
                            </h3>
                            {name.note && (
                              <div className="prose prose-sm max-w-none mt-1 text-gray-600">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ node, ...props }) => (
                                      <a 
                                        {...props} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-violet-600 hover:text-violet-700 hover:underline"
                                      />
                                    ),
                                    p: ({ node, ...props }) => (
                                      <p {...props} className="!my-0" />
                                    )
                                  }}
                                >
                                  {name.note}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                          {isOwner && (
                            <div className="flex gap-2">
                              <button
                                className="text-gray-400 hover:text-violet-600 transition-colors"
                                onClick={() => {
                                  setSelectedName(name)
                                  setEditNameForm({
                                    name: name.name,
                                    note: name.note || ''
                                  })
                                  setIsEditNameModalOpen(true)
                                }}
                              >
                                <svg 
                                  className="w-5 h-5" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                                  />
                                </svg>
                              </button>
                              <button
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                onClick={() => {
                                  setSelectedName(name)
                                  setIsDeleteNameModalOpen(true)
                                }}
                              >
                                <svg 
                                  className="w-5 h-5" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {names.length < totalCount && (
                      <div className="text-center mt-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="w-full sm:w-auto"
                        >
                          {isLoadingMore ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                              Yükleniyor...
                            </div>
                          ) : (
                            'Daha Fazla Göster'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery ? 'Aramanızla eşleşen isim bulunamadı' : 'Henüz isim eklenmemiş'}
                    </h3>
                    {isOwner && !searchQuery && (
                      <p className="text-gray-600">
                        Sağ üstteki "İsim Ekle" butonuna tıklayarak listeye isim ekleyebilirsin.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          <Modal
            isOpen={isAddNameModalOpen}
            onClose={() => {
              setIsAddNameModalOpen(false)
              setNewName({ name: '', note: '' })
              setAddNameError(null)
            }}
            title="İsim Ekle"
          >
            {addNameError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {addNameError}
              </div>
            )}

            <form onSubmit={handleAddName} className="space-y-4">
              <Input
                label="İsim"
                value={newName.name}
                onChange={(e) => setNewName(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Eklemek istediğiniz ismi yazın"
                required
                autoFocus
                disabled={addNameLoading}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Not
                </label>
                <textarea
                  value={newName.note}
                  onChange={(e) => setNewName(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Not ekleyin"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm min-h-[100px]"
                  disabled={addNameLoading}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Markdown yazım rehberi:
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">**kalın**</code> → <strong>kalın</strong>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">*italik*</code> → <em>italik</em>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">[bağlantı](https://ornek.com)</code> → bağlantı
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">~~üstü çizili~~</code> → <del>üstü çizili</del>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded"># Başlık</code> → başlık
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">- liste öğesi</code> → liste
                </p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddNameModalOpen(false)
                    setNewName({ name: '', note: '' })
                    setAddNameError(null)
                  }}
                  disabled={addNameLoading}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={addNameLoading}
                >
                  {addNameLoading ? 'Ekleniyor...' : 'Ekle'}
                </Button>
              </div>
            </form>
          </Modal>

          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Listeyi Düzenle"
          >
            {editError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Liste Adı"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Liste adı"
                required
                disabled={editLoading}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Liste açıklaması. Markdown formatında yazabilirsiniz."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm min-h-[100px]"
                  disabled={editLoading}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Markdown yazım rehberi:
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">**kalın**</code> → <strong>kalın</strong>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">*italik*</code> → <em>italik</em>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">[bağlantı](https://ornek.com)</code> → bağlantı
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">~~üstü çizili~~</code> → <del>üstü çizili</del>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  checked={editForm.isPublic}
                  onChange={(checked) => setEditForm(prev => ({ ...prev, isPublic: checked }))}
                  className={`${
                    editForm.isPublic ? 'bg-violet-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2`}
                  disabled={editLoading}
                >
                  <span className="sr-only">Herkese açık</span>
                  <span
                    className={`${
                      editForm.isPublic ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className="text-sm text-gray-700">Herkese açık</span>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading}
                >
                  {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Liste Silme Modalı */}
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Listeyi Sil"
          >
            <div className="mb-6">
              <p className="text-gray-700">
                Bu listeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                İptal
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
              >
                Sil
              </Button>
            </div>
          </Modal>

          {/* İsim Düzenleme Modalı */}
          <Modal
            isOpen={isEditNameModalOpen}
            onClose={() => {
              setIsEditNameModalOpen(false)
              setEditNameError(null)
              setSelectedName(null)
            }}
            title="İsmi Düzenle"
          >
            {editNameError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {editNameError}
              </div>
            )}

            <form onSubmit={handleEditName} className="space-y-4">
              <Input
                label="İsim"
                value={editNameForm.name}
                onChange={(e) => setEditNameForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="İsmi düzenleyin"
                required
                autoFocus
                disabled={editNameLoading}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Not
                </label>
                <MDEditor
                  value={editNameForm.note}
                  onChange={(value) => setEditNameForm(prev => ({ ...prev, note: value || '' }))}
                  preview="edit"
                  height={200}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Markdown yazım rehberi:
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">**kalın**</code> → <strong>kalın</strong>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">*italik*</code> → <em>italik</em>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">[bağlantı](https://ornek.com)</code> → bağlantı
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">~~üstü çizili~~</code> → <del>üstü çizili</del>
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded"># Başlık</code> → başlık
                  <br />• <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">- liste öğesi</code> → liste
                </p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditNameModalOpen(false)
                    setEditNameError(null)
                    setSelectedName(null)
                  }}
                  disabled={editNameLoading}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={editNameLoading}
                >
                  {editNameLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* İsim Silme Modalı */}
          <Modal
            isOpen={isDeleteNameModalOpen}
            onClose={() => {
              setIsDeleteNameModalOpen(false)
              setSelectedName(null)
            }}
            title="İsmi Sil"
          >
            <div className="mb-6">
              <p className="text-gray-700">
                <span className="font-medium">{selectedName?.name}</span> isimli kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteNameModalOpen(false)
                  setSelectedName(null)
                }}
                disabled={deleteNameLoading}
              >
                İptal
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteName}
                disabled={deleteNameLoading}
              >
                {deleteNameLoading ? 'Siliniyor...' : 'Sil'}
              </Button>
            </div>
          </Modal>

          <Toast 
            message="Liste bağlantısı kopyalandı!" 
            isVisible={showToast}
            onClose={() => setShowToast(false)}
          />
        </>
      )}
    </div>
  )
}

export default ListDetail 