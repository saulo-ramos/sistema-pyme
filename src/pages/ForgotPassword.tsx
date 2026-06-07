import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-light p-8">
      <div className="w-full max-w-md bg-card rounded-[10px] shadow-card p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-navy">Recuperar contraseña</h2>
          <p className="mt-2 text-sm text-gray-text">
            {sent ? 'Si el email está registrado, recibirás un enlace en tu correo.' : 'Ingresa tu email y te enviaremos un enlace.'}
          </p>
        </div>

        {!sent && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 rounded-lg"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-magenta hover:bg-magenta/90 text-primary-foreground rounded-lg font-semibold"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-indigo hover:text-indigo/80 text-sm">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
