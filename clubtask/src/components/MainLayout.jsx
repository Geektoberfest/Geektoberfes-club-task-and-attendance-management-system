'use client'

import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <Header />
      <div className="flex h-[calc(100vh-88px)]">
        <Sidebar />
        <div className="flex-1 overflow-auto bg-pattern">
          {children}
        </div>
      </div>
    </div>
  )
}