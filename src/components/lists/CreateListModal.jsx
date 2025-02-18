import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@headlessui/react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import useListStore from '../../stores/listStore'
import useAuthStore from '../../stores/authStore'

const CreateListModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createList } = useListStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Metni temizleyen yardımcı fonksiyon
  const cleanText = (text) => {
    if (!text) return ''
    // Özel karakterleri ve formatlamaları temizle
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Görünmez karakterleri temizle
      .replace(/\r?\n/g, '\n') // Satır sonlarını normalize et
      .replace(/\t/g, '  ') // Tab karakterlerini boşluğa çevir
      .trim() // Baş ve sondaki boşlukları temizle
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Liste adı boş olamaz.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await createList({
        title: cleanText(title),
        description: cleanText(description),
        userId: user.id,
        isPublic
      })

      if (error) {
        console.error('Liste oluşturma hatası:', error)
        setError('Liste oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.')
        return
      }

      // Başarılı oluşturma sonrası liste detay sayfasına yönlendir
      onClose()
      navigate(`/liste/${data.id}`)
    } catch (error) {
      console.error('Beklenmeyen hata:', error)
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setIsPublic(false)
    setError(null)
    setLoading(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Yeni Liste Oluştur"
    >
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Liste Adı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn: Favori İsimlerim"
          required
          autoFocus
          disabled={loading}
        />

        <Input
          label="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Liste hakkında kısa bir açıklama"
          disabled={loading}
        />

        <div className="flex items-center space-x-3">
          <Switch
            checked={isPublic}
            onChange={setIsPublic}
            className={`${
              isPublic ? 'bg-violet-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2`}
            disabled={loading}
          >
            <span className="sr-only">Herkese açık</span>
            <span
              className={`${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
          <span className="text-sm text-gray-700">Herkese açık</span>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Oluşturuluyor...' : 'Oluştur'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateListModal 