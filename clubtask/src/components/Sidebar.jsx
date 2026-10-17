'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Layout, Calendar, User, Settings, File, Folder } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [role, setRole] = useState('member')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userRole')
      if (stored) setRole(stored)
    } catch (e) {
      console.warn('Could not read userRole from localStorage', e)
    }
  }, [])

  const navItems = [
    { href: '/board', icon: Layout, label: 'PROJECT_BOARD' },
    { href: '/events', icon: Calendar, label: 'EVENTS' },
    { href: '/attendance', icon: File, label: 'ATTENDANCE' },
    { href: '/profile', icon: User, label: 'PROFILE' },
  ]

  const finalNav = [...navItems]
  if (role === 'lead') {
    finalNav.splice(1, 0, { href: '/domains', icon: Folder, label: 'DOMAINS' })
    finalNav.push({ href: '/audit', icon: Settings, label: 'AUDIT_LOG' })
  }

  return (
    <div className="w-27 border-r border-green-900/50 bg-black/50 flex flex-col items-center py-4 gap-5 h-full">
      {finalNav.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`p- rounded-lg transition-all duration-200 ${
              isActive 
                ? 'bg-green-500/20 text-green-400 border-glow' 
                : 'text-green-700 hover:text-green-400 hover:bg-green-500/10'
            }`}
            title={item.label}
          >
            <Icon size={19} />
          </Link>
        )
      })}

      <button className="p-3 text-green-700 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200 rounded-lg mt-auto">
        <Settings size={24} />
      </button>
    </div>
  )
}
