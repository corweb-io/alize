'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  
  // Lazy initialize Supabase client to avoid build-time errors
  const [supabase] = useState(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!supabase) return
    
    const handleCallback = async () => {
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (error) {
        setStatus('error')
        window.location.href = `/login?error=${error}${errorDescription ? `&description=${encodeURIComponent(errorDescription)}` : ''}`
        return
      }

      // For magic links, Supabase should automatically establish the session via cookies
      // Wait a moment for cookies to be set, then check for session
      const checkSession = async (retries = 3): Promise<boolean> => {
        for (let i = 0; i < retries; i++) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (session?.user && !sessionError) {
            // Session established, create profile and redirect
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email,
                updated_at: new Date().toISOString(),
              })

            if (profileError) {
              console.error('Error creating profile:', profileError)
            }

            window.location.href = '/b'
            return true
          }

          // Wait before retrying (cookies might need a moment to be set)
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        return false
      }

      // Try to exchange code if available (only works if code verifier is in storage)
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (!exchangeError) {
            const {
              data: { user },
            } = await supabase.auth.getUser()

            if (user) {
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  email: user.email,
                  updated_at: new Date().toISOString(),
                })

              if (profileError) {
                console.error('Error creating profile:', profileError)
              }
            }

            window.location.href = '/b'
            return
          }
          // If exchange fails (no code verifier), fall through to session check
        } catch {
          // Code verifier not available, fall through to session check
          console.log('Code exchange not available, checking session...')
        }
      }

      // Try token_hash verification (for older magic link format)
      if (tokenHash && type === 'email') {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: 'email',
          token_hash: tokenHash,
        })

        if (!verifyError) {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                email: user.email,
                updated_at: new Date().toISOString(),
              })

            if (profileError) {
              console.error('Error creating profile:', profileError)
            }
          }

          window.location.href = '/b'
          return
        }
      }

      // Check for session (magic links should auto-establish via cookies)
      const sessionEstablished = await checkSession()
      
      if (!sessionEstablished) {
        setStatus('error')
        window.location.href = '/login?error=auth_failed'
      }
    }

    handleCallback()
  }, [searchParams, supabase])

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-stone-500 dark:text-stone-400">
          {status === 'loading'
            ? 'Connexion en cours…'
            : 'Échec de l\'authentification. Redirection…'}
        </p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="app-shell-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 dark:text-stone-400">Chargement…</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

