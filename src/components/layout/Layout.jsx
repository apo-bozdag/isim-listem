import { motion } from 'framer-motion'
import Header from './Header'

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"
      >
        {children}
      </motion.main>
    </div>
  )
}

export default Layout 