import {
  LayoutDashboard,
  Users,
  TrendingUp,
  ShoppingCart,
  FileText,
  Wallet,
  Receipt,
  Settings,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Módulos', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Ventas', url: '/ventas', icon: TrendingUp },
  { title: 'Compras', url: '/compras', icon: ShoppingCart },
  { title: 'Honorarios', url: '/honorarios', icon: FileText },
  { title: 'Remuneraciones', url: '/remuneraciones', icon: Wallet },
  { title: 'Rendiciones', url: '/rendiciones', icon: Receipt },
  { title: 'Configuración', url: '/configuracion', icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { tenant } = useTenantInfo();

  const logoUrl = tenant?.logo_url ?? null;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center h-16 px-6">
        {collapsed ? (
          logoUrl ? (
            <img src={logoUrl} alt={tenant?.nombre ?? 'Logo'} className="h-8 w-8 object-contain" />
          ) : (
            <img src="/logo-sistema-pymes.svg" alt="Sistema Pymes" className="h-8 w-8 object-contain brightness-0 invert" />
          )
        ) : logoUrl ? (
          <img src={logoUrl} alt={tenant?.nombre ?? 'Logo'} className="h-8 max-w-[140px] object-contain" />
        ) : (
          <img src="/logo-sistema-pymes.svg" alt="Sistema Pymes" className="h-8 object-contain brightness-0 invert" />
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={
                        isActive
                          ? 'bg-periwinkle text-sidebar-foreground rounded-lg hover:bg-periwinkle/90'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground rounded-lg'
                      }
                    >
                      <NavLink to={item.url} end onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon className="h-4 w-4 mr-3 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
