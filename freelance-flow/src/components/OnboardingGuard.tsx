import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setChecked(true)
      return
    }

    const publicPaths = ['/onboarding', '/login', '/signup', '/forgot-password', '/check-email', '/', '/pricing']
    if (publicPaths.includes(location.pathname)) {
      setChecked(true)
      return
    }

    const check = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        if (data && !data.onboarding_completed) {
          navigate('/onboarding', { replace: true })
        }
      } finally {
        setChecked(true)
      }
    }
    check()
  }, [user, loading, location.pathname, navigate])

  if (!checked) return null

  return <>{children}</>
}