import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

const variants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
}

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props 
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = useCallback(async (e) => {
    if (disabled || isLoading || !onClick) return

    try {
      setIsLoading(true)

      // Loading durumu için timeout başlat
      const timeoutId = setTimeout(() => {
        console.error('İşlem zaman aşımına uğradı')
        setIsLoading(false)
      }, 10000) // 10 saniye sonra otomatik olarak loading'i kaldır

      // onClick fonksiyonunu çalıştır
      const result = onClick(e)

      // Eğer Promise ise bekle
      if (result instanceof Promise) {
        await result
      }

      // İşlem başarılı olduysa timeout'u temizle
      clearTimeout(timeoutId)
    } catch (error) {
      console.error('Button işlemi sırasında hata:', error)
    } finally {
      // İşlem bitince loading'i kaldır
      setIsLoading(false)
    }
  }, [onClick, disabled, isLoading])

  // Component unmount olduğunda state'i temizle
  useEffect(() => {
    return () => setIsLoading(false)
  }, [])

  const baseClasses = 'font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center relative'
  
  const variants = {
    primary: 'bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 disabled:bg-violet-300',
    secondary: 'bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500 disabled:bg-pink-300',
    outline: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50 focus:ring-violet-500 disabled:border-violet-300 disabled:text-violet-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base h-10',
    lg: 'px-6 py-3 text-lg'
  }
  
  const isDisabled = disabled || isLoading
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
  }`

  return (
    <motion.button
      whileHover={!isDisabled ? "hover" : undefined}
      whileTap={!isDisabled ? "tap" : undefined}
      variants={variants}
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={isDisabled}
      {...props}
    >
      <span className={isLoading ? 'invisible' : ''}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </motion.button>
  )
}

export default Button 