import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase yapılandırması eksik:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length
  })
  throw new Error('Supabase yapılandırması eksik. Lütfen .env dosyasını kontrol edin.')
}

// Supabase istemci konfigürasyonu
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'isim-listem-auth',
    storage: window.localStorage
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'isim-listem'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
}

console.log('Supabase istemcisi oluşturuluyor...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseConfig)

// Sekme arası iletişim için BroadcastChannel
const authChannel = new BroadcastChannel('auth_channel')

// Oturum değişikliklerini diğer sekmelere bildir
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth durumu değişti:', event, session?.user?.id)
  authChannel.postMessage({ event, session })
})

// Diğer sekmelerden gelen oturum değişikliklerini dinle
authChannel.onmessage = (event) => {
  const { event: authEvent, session } = event.data
  console.log('Diğer sekmeden auth değişikliği:', authEvent)
  
  // Oturum kapanmışsa sayfayı yenile
  if (authEvent === 'SIGNED_OUT') {
    window.location.reload()
  }
}

// İstek kuyruğu ve hız sınırlama için değişkenler
let requestQueue = []
const MAX_CONCURRENT_REQUESTS = 3
let activeRequests = 0
const REQUEST_TIMEOUT = 15000
const MIN_REQUEST_INTERVAL = 200
const MAX_RETRIES = 3

// Sayfa görünürlük durumu
let isPageVisible = true
let lastActiveTime = Date.now()
const MAX_INACTIVE_TIME = 300000 // 5 dakika

// Oturum yenileme işlemi devam ediyor mu?
let isRefreshing = false
let refreshPromise = null
const refreshListeners = []

// Oturum yenileme fonksiyonu
const refreshSession = async () => {
  if (!isRefreshing) {
    isRefreshing = true
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session) {
        // Token'ı yenile
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) throw refreshError
        
        console.log('Oturum yenilendi')
        return refreshData.session
      } else {
        throw new Error('Aktif oturum bulunamadı')
      }
    } catch (error) {
      console.error('Oturum yenileme hatası:', error)
      throw error
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }
  return refreshPromise
}

// Sayfa görünürlük değişikliklerini izle
document.addEventListener('visibilitychange', async () => {
  isPageVisible = document.visibilityState === 'visible'
  if (isPageVisible) {
    console.log('Sayfa aktif duruma geçti')
    lastActiveTime = Date.now()
    
    try {
      // Oturumu kontrol et ve gerekirse yenile
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session) {
        await refreshSession()
      }
    } catch (error) {
      console.error('Oturum kontrolü hatası:', error)
    }
    
    // Bağlantıyı yeniden başlat
    reinitializeConnection()
  } else {
    console.log('Sayfa pasif duruma geçti')
  }
})

// Fare ve klavye hareketlerini izle
const updateLastActiveTime = () => {
  lastActiveTime = Date.now()
}

document.addEventListener('mousemove', updateLastActiveTime)
document.addEventListener('keydown', updateLastActiveTime)
document.addEventListener('click', updateLastActiveTime)
document.addEventListener('scroll', updateLastActiveTime)

// Bağlantıyı yeniden başlat
const reinitializeConnection = async () => {
  console.log('Bağlantı yeniden başlatılıyor...')
  
  try {
    // Önce oturumu kontrol et
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('Aktif oturum bulunamadı')
      return
    }

    // Mevcut kuyruğu temizle
    requestQueue = []
    activeRequests = 0

    // Bağlantıyı test et
    const { ok, error } = await testConnection()
    if (ok) {
      console.log('Bağlantı başarıyla yeniden kuruldu')
      startConnectionCheck()
    } else {
      console.error('Bağlantı yeniden kurulurken hata:', error)
    }
  } catch (error) {
    console.error('Bağlantı yeniden başlatma hatası:', error)
  }
}

// Bağlantı durumunu kontrol et
const testConnection = async () => {
  try {
    // Sayfa pasif durumdaysa veya uzun süredir aktif değilse
    if (!isPageVisible || (Date.now() - lastActiveTime > MAX_INACTIVE_TIME)) {
      console.log('Sayfa pasif durumda veya uzun süredir aktif değil. Bağlantı testi atlanıyor.')
      return { ok: false, error: new Error('Sayfa pasif durumda') }
    }

    // Önce oturumu kontrol et
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('Aktif oturum bulunamadı')
      return { ok: false, error: new Error('Oturum bulunamadı') }
    }

    // Basit bir kontrol isteği gönder
    const start = Date.now()
    const { data, error } = await supabase
      .from('lists')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    const responseTime = Date.now() - start
    
    // Token hatası varsa oturumu yenilemeyi dene
    if (error?.message?.includes('JWT')) {
      try {
        await refreshSession()
        return { ok: true, error: null }
      } catch (refreshError) {
        console.error('Token yenileme hatası:', refreshError)
        return { ok: false, error: refreshError }
      }
    }
    
    console.log('Bağlantı durumu:', !error ? 'Aktif' : 'Hata', `(${responseTime}ms)`)
    return { ok: !error, error }
  } catch (error) {
    console.error('Bağlantı testi hatası:', error)
    return { ok: false, error }
  }
}

// İstek kuyruğunu işle
const processQueue = async () => {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return
  }

  const request = requestQueue.shift()
  if (!request) return

  try {
    activeRequests++
    const startTime = Date.now()

    let lastError = null
    let retryCount = 0

    while (retryCount < MAX_RETRIES) {
      try {
        const result = await Promise.race([
          request.operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('İstek zaman aşımına uğradı')), REQUEST_TIMEOUT)
          )
        ])

        const endTime = Date.now()
        console.debug('İstek tamamlandı:', {
          duration: endTime - startTime,
          retryCount,
          queueLength: requestQueue.length,
          activeRequests
        })

        request.resolve(result)
        return
      } catch (error) {
        // Token hatası varsa ve oturum varsa yenilemeyi dene
        if (error.message?.includes('JWT')) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            try {
              await refreshSession()
              continue // Yeniden dene
            } catch (refreshError) {
              console.error('Token yenileme hatası:', refreshError)
            }
          } else {
            // Oturum yoksa ve hata JWT ile ilgiliyse, normal devam et
            console.log('JWT hatası alındı ama oturum yok, devam ediliyor...')
            continue
          }
        }

        lastError = error
        retryCount++
        
        if (retryCount < MAX_RETRIES) {
          console.warn(`İstek başarısız oldu (${retryCount}/${MAX_RETRIES}). Yeniden deneniyor...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }
    }

    console.error('Maksimum deneme sayısına ulaşıldı:', lastError)
    request.reject(lastError)
  } catch (error) {
    console.error('İstek işleme hatası:', error)
    request.reject(error)
  } finally {
    activeRequests--
    setTimeout(processQueue, MIN_REQUEST_INTERVAL)
  }
}

// İsteği kuyruğa ekle ve işle
export const queueRequest = (operation) => {
  // Son aktif zamanı güncelle
  lastActiveTime = Date.now()
  
  return new Promise((resolve, reject) => {
    requestQueue.push({ operation, resolve, reject })
    processQueue()
  })
}

// Periyodik bağlantı kontrolü
let isChecking = false
const checkInterval = 120000 // 2 dakika

const startConnectionCheck = () => {
  if (!isChecking) {
    isChecking = true
    
    setInterval(async () => {
      // Sayfa pasif durumdaysa kontrol etme
      if (!isPageVisible || (Date.now() - lastActiveTime > MAX_INACTIVE_TIME)) {
        return
      }

      try {
        // Oturumu kontrol et
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.warn('Periyodik kontrol: Oturum bulunamadı')
          return
        }

        const { ok, error } = await testConnection()
        if (!ok) {
          console.warn('Periyodik bağlantı kontrolü başarısız:', error)
          
          // Token hatası varsa oturumu yenilemeyi dene
          if (error.message?.includes('JWT')) {
            try {
              await refreshSession()
            } catch (refreshError) {
              console.error('Token yenileme hatası:', refreshError)
            }
          }
        }
      } catch (error) {
        console.error('Periyodik kontrol hatası:', error)
      }
    }, checkInterval)
  }
}

// İlk bağlantı kontrolü ve periyodik kontrolleri başlat
testConnection().then(({ ok }) => {
  if (ok) {
    console.log('İlk bağlantı kontrolü başarılı')
    startConnectionCheck()
  } else {
    console.error('İlk bağlantı kontrolü başarısız')
  }
}) 