import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/mocks/data';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_SUPABASE_URL;

const Login = () => {
  const [email, setEmail] = useState(IS_DEMO ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(IS_DEMO ? DEMO_PASSWORD : '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[Login Error]', error.message);
      }
      toast({
        title: 'Error al iniciar sesión',
        description: 'Email o contraseña incorrectos.',
        variant: 'destructive',
      });
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-sm sm:max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo-sistema-pymes.svg" alt="Sistema Pymes" className="h-12 sm:h-14 object-contain mx-auto" />
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">Inicia sesión en tu cuenta</p>
        </div>

        {IS_DEMO && (
          <div className="rounded-lg border border-periwinkle/40 bg-periwinkle/5 px-4 py-3 text-xs text-gray-text space-y-0.5">
            <p className="font-semibold text-navy">Modo Demo — sin backend</p>
            <p>Usuario: <span className="font-mono text-periwinkle">{DEMO_EMAIL}</span></p>
            <p>Contraseña: <span className="font-mono text-periwinkle">{DEMO_PASSWORD}</span></p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.form?.requestSubmit(); }}
              autoComplete="email"
              className="pl-10 rounded-lg border-input focus-visible:ring-ring"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.form?.requestSubmit(); }}
              autoComplete="current-password"
              className="pl-10 rounded-lg border-input focus-visible:ring-ring"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-magenta hover:bg-magenta/90 text-primary-foreground rounded-lg font-semibold"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </Button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-indigo hover:text-indigo/80 text-sm">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
