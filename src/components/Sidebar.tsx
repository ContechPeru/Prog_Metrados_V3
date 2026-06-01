import { useState } from 'react';
import { Building2, LayoutDashboard, Users, ClipboardList, FileBarChart, ShieldCheck, LogOut,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  AlertTriangle,
  BarChart3,
  User as UserIcon,
  Megaphone,
  ListChecks,
  UserCog,
} from 'lucide-react';
import { useComunicadosStore } from '../store/useComunicadosStore';
import { useAuthStore } from '../store/useAuthStore';


interface SidebarProps {
  userName: string;
  userCargo: string;
  userInitials: string;
  proyecto: 'hospital' | 'contingencia';
  onProyectoChange: (p: 'hospital' | 'contingencia') => void;
  showPersonalDashboard: boolean;
  showGestionPC: boolean;
  showStatusGerencial: boolean;
  showExecutiveDashboard: boolean;
  showAdminPresupuesto: boolean;
  isFormVisible: boolean;
  isReadOnly: boolean;
  onPersonal: () => void;
  onGestionPC: () => void;
  onStatusGerencial: () => void;
  onDashboard: () => void;
  onAdminMaestro: () => void;
  onToggleForm: () => void;
  onLogout: () => void;
  isAdminPresupuesto: boolean;
  showGerencia: boolean;
  onUsuarios: () => void;
  showUsuarios: boolean;
  onAprobarPartidas: () => void;
  showAprobarPartidas: boolean;
}

export function Sidebar({
  userName,
  userCargo,
  userInitials,
  proyecto,
  onProyectoChange,
  showPersonalDashboard,
  showGestionPC,
  showStatusGerencial,
  showExecutiveDashboard,
  showAdminPresupuesto,
  isFormVisible,
  isReadOnly,
  onPersonal,
  onGestionPC,
  onStatusGerencial,
  onDashboard,
  onAdminMaestro,
  onToggleForm,
  onLogout,
  isAdminPresupuesto,
  showGerencia,
  onUsuarios,
  showUsuarios,
  onAprobarPartidas,
  showAprobarPartidas
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true);

  const { isAdmin, isGerencia } = useAuthStore();
  const puedeVerAdmin = isAdmin() || isGerencia();

  // â”€â”€ Comunicados â”€â”€
  const { comunicados, setOpen, isOpen } = useComunicadosStore();
  const { user } = useAuthStore();
  const isAdminComunicados = user?.roles_apps?.comunicados === 'admin';
  const pendientes = comunicados.filter(c =>
    !(c.vistos || []).some(v => v.usuario_id === user?.id)
  ).length;

  const btnBase =
    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative';
  const btnActive =
    'bg-blue-600 text-black shadow-md shadow-blue-500/30';
  const btnInactive =
    'text-slate-500 hover:bg-blue-50 hover:text-blue-700';

  const Tooltip = ({ label }: { label: string }) =>
    collapsed ? (
      <span className="fixed ml-3 top-1/2 -translate-y-1/2 bg-gray-50 text-black text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[999] shadow-lg border border-slate-700">
        {label}
      </span>
    ) : null;

  return (
    <aside
      className={`
        flex flex-col h-screen sticky top-0 overflow-hidden
        bg-white
        border-r border-slate-200
        shadow-[2px_0_8px_rgba(0,0,0,0.06)]
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[230px]'}
        z-20 shrink-0 overflow-x-hidden
      `}
    >
      {/* â”€â”€ Logo / TÃ­tulo â”€â”€ */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-700/60">
        <div className="bg-blue-600 text-black p-2 rounded-xl shadow-lg shadow-blue-600/30 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-slate-800 font-bold text-sm leading-tight truncate">Metrados</p>
            <p className="text-blue-400 text-xs font-semibold truncate">Belempampa</p>
          </div>
        )}
      </div>

      {/* â”€â”€ Selector Proyecto â”€â”€ */}
      <div className="px-2 py-3 border-b border-slate-700/60 flex flex-col gap-1">
        <button
          onClick={() => onProyectoChange('hospital')}
          className={`${btnBase} ${proyecto === 'hospital' ? 'bg-blue-600/80 text-black' : btnInactive}`}
          title="Hospital"
        >
          <Stethoscope className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Hospital</span>}
          <Tooltip label="Hospital" />
        </button>
        <button
          onClick={() => onProyectoChange('contingencia')}
          className={`${btnBase} ${proyecto === 'contingencia' ? 'bg-amber-500/80 text-black' : btnInactive}`}
          title="Contingencia"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Contingencia</span>}
          <Tooltip label="Contingencia" />
        </button>
      </div>

      {/* â”€â”€ MenÃº Principal â”€â”€ */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">

        <button
          onClick={onPersonal}
          className={`${btnBase} ${showPersonalDashboard ? btnActive : btnInactive}`}
          title="Personal"
        >
          <Users className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Personal</span>}
          <Tooltip label="Personal" />
        </button>


        {puedeVerAdmin && (
          <button
            onClick={onUsuarios}
            className={`${btnBase} ${showUsuarios ? btnActive : btnInactive}`}
            title="Usuarios"
          >
            <UserCog className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Usuarios</span>}
            <Tooltip label="Usuarios" />
          </button>
        )}

        <button
          onClick={onGestionPC}
          className={`${btnBase} ${showGestionPC ? btnActive : btnInactive}`}
          title="Partidas PC"
        >
          <ClipboardList className="w-4 h-4 shrink-0 text-pink-400" />
          {!collapsed && <span>Partidas PC</span>}
          <Tooltip label="Partidas PC" />
        </button>


        {puedeVerAdmin && (
          <button
            onClick={onStatusGerencial}
            className={`${btnBase} ${showStatusGerencial ? btnActive : btnInactive}`}
            title="Status Gerencial"
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Status Gerencial</span>}
            <Tooltip label="Status Gerencial" />
          </button>
        )}

        {puedeVerAdmin && (
          <button
            onClick={onDashboard}
            className={`${btnBase} ${showExecutiveDashboard ? btnActive : btnInactive}`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
            <Tooltip label="Dashboard" />
          </button>
        )}

        {puedeVerAdmin && (
          <button
            onClick={onAdminMaestro}
            className={`${btnBase} ${showAdminPresupuesto ? btnActive : btnInactive}`}
            title="Admin Maestro"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            {!collapsed && <span>Admin Maestro</span>}
            <Tooltip label="Admin Maestro" />
          </button>
        )}

        {(puedeVerAdmin || user?.roles_apps?.aprobar_partidas === 'SI') && (
          <button
            onClick={onAprobarPartidas}
            className={`${btnBase} ${showAprobarPartidas ? btnActive : btnInactive}`}
            title="Aprobar Partidas"
          >
            <ListChecks className="w-4 h-4 shrink-0 text-orange-400" />
            {!collapsed && <span>Aprobar Partidas</span>}
            <Tooltip label="Aprobar Partidas" />
          </button>
        )}

      </nav>

      {/* â”€â”€ BotÃ³n Comunicados â”€â”€ */}
      <div className="px-2 pb-2 border-t border-slate-200 pt-3">
        {puedeVerAdmin && (
          <button
            onClick={() => setOpen(!isOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold transition-all shadow-sm relative"
            title="Comunicados"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Comunicados</span>}
            {pendientes > 0 && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendientes}
              </span>
            )}
          </button>
        )}
      </div>

      {/* â”€â”€ Usuario + Logout â”€â”€ */}
      <div className="border-t border-slate-700/60 px-2 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-2.5 px-1">
          <div className="bg-blue-500 text-black rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0 shadow">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-slate-700 text-xs font-semibold truncate leading-tight"></p>
              <p className="text-slate-600 text-[10px] truncate">{userCargo}</p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className={`${btnBase} text-red-500 font-semibold hover:bg-red-500/20 hover:text-red-300`}
          title="Cerrar SesiÃ³n"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar SesiÃ³n</span>}
          <Tooltip label="Cerrar SesiÃ³n" />
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all overflow-hidden"
          title={collapsed ? 'Expandir menÃº' : 'Colapsar menÃº'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>
    </aside>
  );
}

