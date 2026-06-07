import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

function UserAvatar({ fotoUrl, nombre, email }: { fotoUrl: string | null; nombre: string | null; email: string | null }) {
  const initials = nombre
    ? nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : (email?.[0] ?? '?').toUpperCase();

  return fotoUrl ? (
    <img
      src={fotoUrl}
      alt={nombre ?? 'Avatar'}
      className="h-8 w-8 rounded-full object-cover border border-periwinkle/30"
    />
  ) : (
    <div className="h-8 w-8 rounded-full bg-periwinkle/20 flex items-center justify-center text-xs font-semibold text-periwinkle border border-periwinkle/30">
      {initials}
    </div>
  );
}

const AppHeader = () => {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();

  return (
    <header className="h-14 bg-card border-b flex items-center justify-between px-4 shrink-0">
      <SidebarTrigger className="text-gray-text">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-text hidden sm:inline">
          {profile?.nombre ?? user?.email}
        </span>
        <UserAvatar
          fotoUrl={profile?.foto_url ?? null}
          nombre={profile?.nombre ?? null}
          email={user?.email ?? null}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-gray-text hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
