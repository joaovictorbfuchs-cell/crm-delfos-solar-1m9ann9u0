import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import type { UserRole } from '@/types/crm'

export interface UserAuthData {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  ativo: boolean
}

interface AuthContextType {
  user: (AuthModel & { role?: UserRole; ativo?: boolean }) | null
  userProfile: UserAuthData | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  isInstalador: boolean
  login: (email: string, pass: string) => Promise<UserAuthData>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(AuthModel & { role?: UserRole; ativo?: boolean }) | null>(
    pb.authStore.record as any,
  )
  const [token, setToken] = useState<string | null>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const extractUserProfile = (record: any): UserAuthData | null => {
    if (!record) return null
    return {
      id: record.id,
      name: record.name || 'Usuário',
      email: record.email || '',
      avatar: record.avatar,
      role: (record.role as UserRole) || 'admin',
      ativo: record.ativo !== false, // default true se undefined
    }
  }

  const [userProfile, setUserProfile] = useState<UserAuthData | null>(() =>
    extractUserProfile(pb.authStore.record),
  )

  useEffect(() => {
    const record = pb.authStore.record
    setUser(record as any)
    setToken(pb.authStore.token)
    setUserProfile(extractUserProfile(record))

    // Se houver token, validar sessão no backend e checar se continua ativo com timeout de segurança
    if (pb.authStore.isValid && record) {
      let isDone = false

      // Timeout de segurança de 2,5 segundos: se o backend demorar (ex.: concorrência ou rede lenta),
      // apenas libera a interface (setIsLoading(false)) sem deslogar o usuário.
      const timeoutId = setTimeout(() => {
        if (!isDone) {
          isDone = true
          console.warn(
            'Timeout na validação da sessão (authRefresh). Liberando loading sem deslogar.',
          )
          setIsLoading(false)
        }
      }, 2500)

      pb.collection('users')
        .authRefresh({ requestKey: null })
        .then((authData) => {
          if (isDone) return
          isDone = true
          clearTimeout(timeoutId)
          if (authData.record?.ativo === false) {
            // Se usuário foi desativado enquanto tinha sessão, desconectar
            pb.authStore.clear()
            setUser(null)
            setUserProfile(null)
            setToken(null)
          } else {
            setUser(authData.record as any)
            setUserProfile(extractUserProfile(authData.record))
            setToken(authData.token)
          }
        })
        .catch((err: any) => {
          if (isDone) return
          isDone = true
          clearTimeout(timeoutId)
          console.warn('Erro ao executar authRefresh:', err)

          // Não limpar authStore se for cancelamento de requisição ou erro temporário de rede.
          // Só limpa se o backend explicitamente retornou 401/403 (sessão expirada/revogada)
          // ou se a authStore não for mais válida.
          const isAutocancelled =
            err?.isAbort ||
            err?.name === 'AbortError' ||
            String(err?.message || '')
              .toLowerCase()
              .includes('autocancelled')
          const isNetworkError = err?.status === 0 || !err?.status

          if (isAutocancelled || isNetworkError) {
            console.warn(
              'authRefresh cancelado ou erro de rede temporário. Mantendo sessão ativa se ainda válida localmente.',
            )
            if (!pb.authStore.isValid) {
              pb.authStore.clear()
              setUser(null)
              setUserProfile(null)
              setToken(null)
            }
          } else if (err?.status === 401 || err?.status === 403 || !pb.authStore.isValid) {
            // Token realmente revogado/expirado
            pb.authStore.clear()
            setUser(null)
            setUserProfile(null)
            setToken(null)
          }
        })
        .finally(() => {
          if (!isDone) {
            isDone = true
            clearTimeout(timeoutId)
          }
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }

    // Escutar mudanças no authStore
    const unsubscribe = pb.authStore.onChange((tokenVal, recordVal) => {
      setToken(tokenVal)
      setUser(recordVal as any)
      setUserProfile(extractUserProfile(recordVal))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const refreshAuth = async () => {
    if (pb.authStore.isValid) {
      try {
        const authData = await pb.collection('users').authRefresh({ requestKey: null })
        setUser(authData.record as any)
        setUserProfile(extractUserProfile(authData.record))
        setToken(authData.token)
      } catch (err: any) {
        console.warn('Falha em refreshAuth:', err)
        const isAutocancelled =
          err?.isAbort ||
          err?.name === 'AbortError' ||
          String(err?.message || '')
            .toLowerCase()
            .includes('autocancelled')
        if (!isAutocancelled && (err?.status === 401 || err?.status === 403)) {
          pb.authStore.clear()
          setUser(null)
          setUserProfile(null)
          setToken(null)
        }
      }
    }
  }

  const login = async (email: string, pass: string): Promise<UserAuthData> => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    const record = authData.record

    // Validação estrita: usuário inativo não pode acessar o sistema
    if (record.ativo === false) {
      pb.authStore.clear()
      setUser(null)
      setUserProfile(null)
      setToken(null)
      throw new Error('USUARIO_DESATIVADO')
    }

    const profile = extractUserProfile(record)!
    setUser(record as any)
    setUserProfile(profile)
    setToken(authData.token)
    return profile
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setUserProfile(null)
    setToken(null)
  }

  const role = userProfile?.role || (user as any)?.role || 'admin'
  const isAdmin = role === 'admin'
  const isInstalador = role === 'instalador'

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        token,
        isAuthenticated: !!token && !!userProfile && userProfile.ativo,
        isLoading,
        isAdmin,
        isInstalador,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    // Retorno defensivo para nunca quebrar a árvore caso chamado acidentalmente fora do provider
    console.warn('useAuth chamado fora do AuthProvider. Utilizando estado padrão seguro.')
    return {
      user: null,
      userProfile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      isInstalador: false,
      login: async () => {
        throw new Error('AuthProvider não inicializado')
      },
      logout: () => {},
      refreshAuth: async () => {},
    }
  }
  return context
}
