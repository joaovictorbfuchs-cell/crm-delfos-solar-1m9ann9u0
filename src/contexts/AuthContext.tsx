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

    // Se houver token, validar sessão no backend e checar se continua ativo
    if (pb.authStore.isValid && record) {
      pb.collection('users')
        .authRefresh()
        .then((authData) => {
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
        .catch(() => {
          // Token expirado ou inválido
          pb.authStore.clear()
          setUser(null)
          setUserProfile(null)
          setToken(null)
        })
        .finally(() => {
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
      const authData = await pb.collection('users').authRefresh()
      setUser(authData.record as any)
      setUserProfile(extractUserProfile(authData.record))
      setToken(authData.token)
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
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
