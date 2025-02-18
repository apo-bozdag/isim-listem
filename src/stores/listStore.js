import { create } from 'zustand'
import { supabase, queueRequest } from '../utils/supabase'

const useListStore = create((set, get) => ({
  lists: [],
  currentList: null,
  loading: false,
  error: null,

  setLists: (lists) => set({ lists }),
  setCurrentList: (list) => set({ currentList: list }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchLists: async (userId) => {
    try {
      set({ loading: true })
      const { data, error } = await queueRequest(() =>
        supabase
          .from('lists')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      )

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        throw error
      }
      
      set({ lists: data, error: null })
    } catch (error) {
      console.error('Listeler yüklenirken hata:', error)
      set({ error: error.message || 'Listeler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      set({ loading: false })
    }
  },

  createList: async ({ title, description, userId, isPublic = false }) => {
    try {
      set({ loading: true })
      const { data, error } = await queueRequest(() =>
        supabase
          .from('lists')
          .insert([
            { 
              title, 
              description, 
              user_id: userId, 
              is_public: isPublic,
              created_at: new Date().toISOString()
            }
          ])
          .select()
      )

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('Liste oluşturma hatası:', error)
        throw new Error('Liste oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      if (!data || data.length === 0) {
        throw new Error('Liste oluşturulamadı. Lütfen tekrar deneyin.')
      }

      set({ lists: [...get().lists, data[0]], error: null })
      return { data: data[0], error: null }
    } catch (error) {
      console.error('Liste oluşturma hatası:', error)
      set({ error: error.message })
      return { data: null, error }
    } finally {
      set({ loading: false })
    }
  },

  updateList: async ({ id, title, description, isPublic }) => {
    try {
      set({ loading: true })
      const { data, error } = await queueRequest(() =>
        supabase
          .from('lists')
          .update({ 
            title, 
            description, 
            is_public: isPublic
          })
          .eq('id', id)
          .select()
      )

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('Liste güncelleme hatası:', error)
        throw new Error('Liste güncellenirken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      if (!data || data.length === 0) {
        throw new Error('Liste güncellenemedi. Lütfen tekrar deneyin.')
      }

      const updatedLists = get().lists.map(list => 
        list.id === id ? data[0] : list
      )
      set({ lists: updatedLists, error: null })
      return { data: data[0], error: null }
    } catch (error) {
      console.error('Liste güncelleme hatası:', error)
      set({ error: error.message })
      return { data: null, error }
    } finally {
      set({ loading: false })
    }
  },

  deleteList: async (id) => {
    try {
      set({ loading: true })

      // Önce listedeki tüm isimleri sil
      const { error: namesError } = await queueRequest(() =>
        supabase
          .from('names')
          .delete()
          .eq('list_id', id)
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
          .eq('id', id)
      )

      if (listError) {
        if (listError.code === 'PGRST116') {
          throw new Error('Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
        }
        console.error('Liste silinirken hata:', listError)
        throw new Error('Liste silinirken bir hata oluştu. Lütfen tekrar deneyin.')
      }

      const filteredLists = get().lists.filter(list => list.id !== id)
      set({ lists: filteredLists, error: null })
      return { error: null }
    } catch (error) {
      console.error('Liste silme hatası:', error)
      set({ error: error.message })
      return { error }
    } finally {
      set({ loading: false })
    }
  }
}))

export default useListStore 