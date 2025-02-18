import { create } from 'zustand'
import { supabase } from '../utils/supabase'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  username: null,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setUsername: (username) => set({ username }),
  
  initializeAuth: async () => {
    try {
      set({ loading: true })
      
      // Mevcut oturumu kontrol et
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (session) {
        // Kullanıcı adını getir
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', session.user.id)
          .single()
          
        if (!userError && userData) {
          set({ username: userData.username })
        }
        
        set({ 
          user: session.user,
          session
        })
      }
    } catch (error) {
      console.error('Oturum kontrolü sırasında hata:', error)
    } finally {
      set({ loading: false })
    }
    
    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth durumu değişti:', event, session?.user?.id)
      
      if (event === 'SIGNED_IN' && session) {
        try {
          // Kullanıcı adını getir
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username')
            .eq('id', session.user.id)
            .single()
            
          if (!userError && userData) {
            set({ username: userData.username })
          }
          
          set({ 
            user: session.user,
            session,
            loading: false
          })
        } catch (error) {
          console.error('Kullanıcı bilgileri alınırken hata:', error)
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        set({ 
          user: null,
          session: null,
          username: null,
          loading: false
        })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ 
          user: session.user,
          session,
          loading: false
        })
      }
    })

    // Component unmount olduğunda subscription'ı temizle
    return () => {
      subscription.unsubscribe()
    }
  },
  
  signIn: async ({ email, password }) => {
    try {
      set({ loading: true })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // Kullanıcı adını getir
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', data.user.id)
          .single()
          
        if (!userError && userData) {
          set({ username: userData.username })
        }
      }
      
      set({ 
        user: data.user,
        session: data.session,
        loading: false
      })
      
      return { data, error: null }
    } catch (error) {
      console.error('Giriş hatası:', error)
      set({ loading: false })
      return { data: null, error }
    }
  },
  
  signUp: async ({ email, password, username }) => {
    try {
      set({ loading: true })
      
      // Önce kullanıcı adının kullanılıp kullanılmadığını kontrol et
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        return { 
          data: null, 
          error: 'Bu kullanıcı adı zaten kullanılıyor.' 
        }
      }

      // Önce kullanıcı kaydı yap
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      })
      
      if (authError) {
        console.error('Auth hatası:', authError)
        throw authError
      }

      if (!authData?.user?.id) {
        throw new Error('Kullanıcı ID bulunamadı')
      }
      
      // Kullanıcı profilini oluştur
      const { error: profileError } = await supabase
        .from('users')
        .insert([{ 
          id: authData.user.id, 
          username,
          email 
        }])
      
      if (profileError) {
        console.error('Profil oluşturma hatası:', profileError)
        // Hata durumunda auth kullanıcısını da sil
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }

      set({ 
        user: authData.user,
        session: authData.session,
        username,
        loading: false
      })
      
      return { data: authData, error: null }
    } catch (error) {
      console.error('Kayıt işlemi hatası:', error)
      set({ loading: false })
      return { 
        data: null, 
        error: error.message || 'Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.' 
      }
    }
  },
  
  signOut: async () => {
    try {
      set({ loading: true })
      
      // Önce Supabase oturumunu sonlandır
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Çıkış yapılırken hata:', error)
        throw error
      }

      // State'i temizle
      set({ 
        user: null, 
        session: null, 
        username: null,
        loading: false
      })
      
      // Local storage'ı temizle
      window.localStorage.removeItem('isim-listem-auth')
      
      return { error: null }
    } catch (error) {
      console.error('Çıkış yapma hatası:', error)
      // Hata olsa bile state'i temizle
      set({ 
        user: null, 
        session: null, 
        username: null,
        loading: false
      })
      return { error }
    }
  },

  // Oturumu yenile
  refreshSession: async () => {
    try {
      set({ loading: true })
      
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session) {
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) throw refreshError
        
        if (data.session) {
          set({ 
            user: data.session.user,
            session: data.session,
            loading: false
          })
          return { session: data.session, error: null }
        }
      }
      
      throw new Error('Oturum bulunamadı')
    } catch (error) {
      console.error('Oturum yenileme hatası:', error)
      set({ loading: false })
      return { session: null, error }
    }
  }
}))

export default useAuthStore 