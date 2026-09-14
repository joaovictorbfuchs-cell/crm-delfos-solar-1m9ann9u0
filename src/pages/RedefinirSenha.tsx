import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DelfosLogo } from '@/components/DelfosLogo'
import { Sun, CheckCircle2, AlertCircle, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react'

export function RedefinirSenha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const t = searchParams.get('token') || ''
    setToken(t)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!token.trim()) {
      setErrorMessage(
        'Token de redefinição não encontrado ou inválido na URL. Por favor, solicite um novo link.',
      )
      return
    }

    if (!password || password.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('A confirmação de senha não confere com a nova senha.')
      return
    }

    setLoading(true)
    try {
      await pb.collection('users').confirmPasswordReset(token.trim(), password, passwordConfirm)
      setSuccess(true)
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err)
      const detail =
        err?.data?.message ||
        err?.message ||
        'Não foi possível redefinir a senha. O link pode ter expirado ou já ter sido utilizado.'
      setErrorMessage(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <DelfosLogo height={56} />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium tracking-wide uppercase">
            <Sun className="h-3.5 w-3.5" />
            CRM & Gestão Operacional Solar
          </div>
        </div>

        <Card className="border-border shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Redefinir Senha</CardTitle>
                <CardDescription>
                  {success
                    ? 'Sua senha foi redefinida com sucesso!'
                    : 'Crie uma nova senha de acesso para sua conta'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <Alert className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription>
                    Senha atualizada com sucesso! Agora você já pode entrar no sistema com a sua
                    nova senha.
                  </AlertDescription>
                </Alert>

                <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
                  Ir para a tela de Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {!token.trim() && (
                  <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-xs">
                      Nenhum token detectado na URL. Se você recebeu o código por e-mail, pode
                      colá-lo abaixo:
                    </AlertDescription>
                  </Alert>
                )}

                {!token.trim() && (
                  <div className="space-y-2">
                    <Label htmlFor="token">Código / Token de Redefinição</Label>
                    <Input
                      id="token"
                      type="text"
                      placeholder="Cole aqui o token recebido no link"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmar Nova Senha</Label>
                  <Input
                    id="passwordConfirm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Voltar para o Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default RedefinirSenha
