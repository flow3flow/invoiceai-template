import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode
  } from 'react'
  import { User, Session, AuthError } from '@supabase/supabase-js'
  import { supabase } from '@/lib/supabase'
  
  interface AuthContextValue {
    user: User | null
    session: Session | null
    loading: boolean
    signUp: (email: string, password: string, fullName: string) => Promise<{
      needsEmailConfirmation: boolean
      error: AuthError | null
    }>
    signIn: (email: string, password: string) => Promise<{
      error: AuthError | null
    }>
    signOut: () => Promise<{ error: AuthError | null }>
  }
  
  const AuthContext = createContext<AuthContextValue | null>(null)
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
  
    useEffect(() => {
      // onAuthStateChange émet INITIAL_SESSION au montage —
      // pas besoin de getSession() séparé, pas de race condition,
      // safe sous StrictMode sans guard
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      )
  
      return () => subscription.unsubscribe()
    }, [])
  
    const signUp = async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      return {
        needsEmailConfirmation: !error && !data.session,
        error
      }
    }
  
    const signIn = async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    }
  
    const signOut = async () => {
      const { error } = await supabase.auth.signOut()
      return { error }
    }
  
    return (
      <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
        {children}
      </AuthContext.Provider>
    )
  }
  
  export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
    return context
  }