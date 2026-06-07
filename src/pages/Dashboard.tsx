import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  ShoppingCart,
  FileText,
  Wallet,
  Receipt,
} from 'lucide-react';

const modules = [
  { title: 'Clientes',       icon: Users,        description: 'Gestión de clientes',        color: 'text-periwinkle', href: '/clientes' },
  { title: 'Ventas',         icon: TrendingUp,   description: 'Control de ventas',           color: 'text-magenta',    href: '/ventas' },
  { title: 'Compras',        icon: ShoppingCart, description: 'Registro de compras',         color: 'text-indigo',     href: '/compras' },
  { title: 'Honorarios',     icon: FileText,     description: 'Honorarios profesionales',    color: 'text-navy',       href: '/honorarios' },
  { title: 'Remuneraciones', icon: Wallet,       description: 'Sueldos y pagos',             color: 'text-periwinkle', href: '/remuneraciones' },
  { title: 'Rendiciones',    icon: Receipt,      description: 'Rendiciones de gastos',       color: 'text-magenta',    href: '/rendiciones' },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Módulos</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((mod) => (
          <Link
            key={mod.title}
            to={mod.href}
            className="bg-card rounded-[10px] shadow-card p-6 flex items-start gap-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150"
          >
            <div className={`p-3 rounded-lg bg-gray-light ${mod.color}`}>
              <mod.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-navy">{mod.title}</h3>
              <p className="text-sm text-gray-text mt-1">{mod.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
