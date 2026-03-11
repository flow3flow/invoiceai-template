import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function CheckEmail() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <div className="text-4xl">📧</div>
      <h1 className="text-2xl font-bold">Vérifie ton email</h1>
      <p className="text-muted-foreground text-center max-w-sm">
        Un lien de confirmation t'a été envoyé.
        Clique dessus pour activer ton compte.
      </p>
      <p className="text-xs text-muted-foreground">
        Pas reçu ? Vérifie tes spams.
      </p>
    </div>
  )
}