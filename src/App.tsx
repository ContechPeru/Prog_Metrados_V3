import { useState, useEffect, useMemo, useCallback } from 'react';
import { MetradosForm } from './components/MetradosForm';
import { MetradosTable } from './components/MetradosTable';
import { GestionPartidasPC } from './components/GestionPartidasPC';
import { Sidebar } from './components/Sidebar';
import { useMetradosForm } from './hooks/useMetradosForm';
import type { Metrado, Partida } from './types';
import Login from './components/Login';
import { DashboardPersonal } from './components/DashboardPersonal';
import { AdminPresupuesto } from './admin/AdminPresupuesto';
import { AprobarPartidas } from './admin/AprobarPartidas';
import { ExecutiveDashboard } from './admin/ExecutiveDashboard';
import { StatusGerencial } from './admin/StatusGerencial';
import { calcularParcial, calcularTotal } from './utils/metradosCalculations';
import { useMetradosStore } from './store/useMetradosStore';
import { usePersonalStore } from './store/usePersonalStore';
import { useAuthStore } from './store/useAuthStore';
import { useSystemUsersStore } from './store/useSystemUsersStore';
import { Comunicados } from './components/Comunicados';
import { ComunicadoModal } from './components/ComunicadoModal';
import { useComunicadosStore } from './store/useComunicadosStore';
import { UsuariosModule } from './admin/UsuariosModule';

export type TipoProyecto = 'hospital' | 'contingencia';

function App() {
  const { state, actions } = useMetradosForm();
  const { metrados, context, setContext, addMetrado, updateMetrado, deleteMetrado, updateGroup, fetchCustomPartidas, fetchMetrados, fetchCatalogoMaestro } = useMetradosStore();
  const { fetchPersonal } = usePersonalStore();
  const { isAuthenticated, user, logout, checkAuth, isAdminPresupuesto, isAdmin, isGerencia, isReadOnlyMetrados } = useAuthStore();
  const { fetchSystemUsers } = useSystemUsersStore();
  const { isOpen, fetchComunicados } = useComunicadosStore();
  const [showExecutiveDashboard, setShowExecutiveDashboard] = useState(false);
  const [showStatusGerencial, setShowStatusGerencial] = useState(false);
  const [showPersonalDashboard, setShowPersonalDashboard] = useState(false);
  const [showGestionPC, setShowGestionPC] = useState(false);
  const [showAdminPresupuesto, setShowAdminPresupuesto] = useState(false);
  const [showUsuarios, setShowUsuarios] = useState(false);
  const [showAprobarPartidas, setShowAprobarPartidas] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasShownReadOnlyNotice, setHasShownReadOnlyNotice] = useState(false);
  const isReadOnly = isReadOnlyMetrados();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPersonal();
      fetchCatalogoMaestro();
      fetchCustomPartidas();
      fetchMetrados();
      fetchSystemUsers();
      fetchComunicados('belempampa');
      useMetradosStore.getState().fetchEspecialidades(); 
    }
  }, [isAuthenticated, fetchCustomPartidas, fetchMetrados, fetchPersonal, fetchCatalogoMaestro, fetchSystemUsers]);

  const { canEditMetrado } = useAuthStore();

  const handleGuardar = async () => {
    if (isReadOnly) return;
    try {
      const nuevo = actions.procesarRegistro();
      if (nuevo) {
        const nuevoConMetadata = {
          ...nuevo,
          proyecto: context.proyecto,
          autor_usuario: user?.nombre_completo || 'Usuario Desconocido'
        };
        const result = await addMetrado(nuevoConMetadata);
        if (result.success) {
          setToast(`Metrado guardado: ${nuevo.codigo_partida}`);
          setTimeout(() => setToast(null), 3000);
        } else {
          alert("Error de guardado en la nube (Supabase):\n\n" + result.error);
        }
      }
    } catch (err: any) {
      console.error("Error crÃ­tico al guardar:", err);
      alert("Error crÃ­tico inesperado:\n\n" + (err.message || String(err)));
    }
  };

  const handleDeleteMetrado = useCallback((id: string) => {
    if (isReadOnly) return;
    const metradoToDelete = metrados.find(m => m.id === id);
    if (!metradoToDelete || !canEditMetrado(metradoToDelete.autor_usuario, metradoToDelete.fecha)) {
      setToast('No tienes permiso para eliminar este registro (o periodo cerrado).');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    deleteMetrado(id);
    setToast('Registro eliminado exitosamente');
    setTimeout(() => setToast(null), 3000);
  }, [deleteMetrado, metrados, isReadOnly, canEditMetrado]);

  const handleUpdateMetrado = useCallback((id: string, field: keyof Metrado, value: any) => {
    if (isReadOnly) return;
    const metradoOriginal = metrados.find(m => m.id === id);
    if (!metradoOriginal) return;

    if (!canEditMetrado(metradoOriginal.autor_usuario, metradoOriginal.fecha)) {
      setToast('No tienes permiso para modificar este registro (o periodo cerrado).');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const final = { ...metradoOriginal, [field]: value };
    const calculusFields = ['cantidad', 'longitud_area', 'ancho_empalme', 'altura_gancho', 'nro_veces', 'diametro', 'hvac_factor'];

    if (calculusFields.includes(field as string)) {
      const p = calcularParcial({
        partida: {
          codigo: final.codigo_partida,
          descripcion: final.descripcion_partida,
          unidad: final.unidad,
          tipo_metrado: final.tipo_metrado
        } as Partida,
        cantidad: final.cantidad,
        longitud: final.longitud_area,
        ancho: final.ancho_empalme,
        altura: final.altura_gancho,
        diametro: final.diametro,
        hvacFactor: final.hvac_factor,
        hvacItemType: final.hvac_item_type
      });
      const t = calcularTotal(p, final.nro_veces);
      updateMetrado(id, { [field]: value, parcial: p, total: t });
    } else {
      updateMetrado(id, { [field]: value });
    }
  }, [metrados, updateMetrado]);

  const handleUpdateGroup = useCallback((codigoPartida: string, oldElemento: string, newElemento: string) => {
    if (isReadOnly) return;
    updateGroup(codigoPartida, oldElemento, newElemento);
  }, [updateGroup]);

  useEffect(() => {
    if (isReadOnly) {
      setIsFormVisible(false);
      if (!hasShownReadOnlyNotice) {
        actions.setEspecialidadSeleccionada('TODAS');
        setToast("Modo Lector Activo - Vista Protegida");
        setHasShownReadOnlyNotice(true);
      }
    } else {
      setHasShownReadOnlyNotice(false);
    }
  }, [isReadOnly, actions, hasShownReadOnlyNotice]);

  const metradosFiltrados = useMemo(() => {
    return metrados.filter(m => {
      if (m.proyecto && m.proyecto.trim().toLowerCase() !== context.proyecto.toLowerCase()) return false;
      const isCustomRecord = !!m.custom_partida_id ||
        m.modificacion === 'PC' ||
        m.codigo_partida?.startsWith('PC') ||
        m.codigo_partida?.startsWith('ACT');
      if (context.isModoPC) return isCustomRecord;
      else return !isCustomRecord;
    });
  }, [metrados, context.proyecto, context.isModoPC]);

  // â”€â”€â”€ arriba, junto a los otros hooks â”€â”€â”€

  const userInitials = (user?.nombre_completo || 'L')
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  const puedeVerAdmin = isAdmin() || isGerencia();
  
  // Especialidad bloqueada para metradores
  const especialidadEfectiva = (!isAdmin() && !isGerencia() && user?.especialidad_nombre)
      ? user.especialidad_nombre
      : state.especialidadSeleccionada;

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* â”€â”€ Sidebar â”€â”€ */}
      <Sidebar
        userName={user?.nombre_completo || 'Dev Local'}
        userCargo={user?.cargo || 'LUIS EDISON'}
        userInitials={userInitials}
        proyecto={context.proyecto}
        onProyectoChange={(p) => {
          setContext({ proyecto: p });
          actions.setPartidaSeleccionada(null);
        }}
        onUsuarios={() => setShowUsuarios(true)}
        showUsuarios={showUsuarios}
        showPersonalDashboard={showPersonalDashboard}
        showGestionPC={showGestionPC}
        showStatusGerencial={showStatusGerencial}
        showExecutiveDashboard={showExecutiveDashboard}
        showAdminPresupuesto={showAdminPresupuesto}
        isFormVisible={isFormVisible}
        isReadOnly={isReadOnly}
        onPersonal={() => setShowPersonalDashboard(true)}
        onGestionPC={() => setShowGestionPC(true)}
        onStatusGerencial={() => setShowStatusGerencial(true)}
        onDashboard={() => setShowExecutiveDashboard(true)}
        onAdminMaestro={() => setShowAdminPresupuesto(true)}
        onAprobarPartidas={() => setShowAprobarPartidas(true)}
        showAprobarPartidas={showAprobarPartidas}
        onToggleForm={() => setIsFormVisible(v => !v)}
        onLogout={() => logout()}
        isAdminPresupuesto={isAdminPresupuesto()}
        showGerencia={true}
      />

      {/* â”€â”€ Contenido Principal â”€â”€ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {toast && (
          <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-5 mt-2 bg-green-500 text-white px-4 py-3 rounded-lg shadow-xl font-medium flex items-center gap-2">
            <span className="text-xl">âœ¨</span> {toast}
          </div>
        )}

        <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl border-l border-slate-200 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isFormVisible && !isReadOnly ? 'translate-x-0' : 'translate-x-full'}`}>
          <MetradosForm
            state={state}
            actions={actions}
            onGuardar={handleGuardar}
            proyecto={context.proyecto}
          />
        </div>

        {isFormVisible && !isReadOnly && (
          <div className="fixed inset-0 bg-black/10 z-30" onClick={() => setIsFormVisible(false)} />
        )}

        <main className="flex-1 overflow-auto p-0">
          <MetradosTable
            metrados={metradosFiltrados}
            onUpdate={handleUpdateMetrado}
            onGroupUpdate={handleUpdateGroup}
            onDelete={handleDeleteMetrado}
            proyecto={context.proyecto}
            especialidadSeleccionada={especialidadEfectiva}
            onEspecialidadChange={actions.setEspecialidadSeleccionada}
            isSpecialtyLocked={state.isSpecialtyLocked}
            isReadOnly={isReadOnly}
            onInsertar={() => setIsFormVisible(v => !v)}
          />
        </main>
      </div>

      {/* â”€â”€ Modales â”€â”€ */}
      {showPersonalDashboard && (
        <DashboardPersonal onClose={() => setShowPersonalDashboard(false)} isReadOnly={isReadOnly} />
      )}
      {showGestionPC && (
        <GestionPartidasPC onClose={() => setShowGestionPC(false)} isReadOnly={isReadOnly} />
      )}
      {showAdminPresupuesto && (
        <AdminPresupuesto onClose={() => setShowAdminPresupuesto(false)} />
      )}
      {showAprobarPartidas && (
        <AprobarPartidas onClose={() => setShowAprobarPartidas(false)} />
      )}
      {showStatusGerencial && (
        <StatusGerencial onClose={() => setShowStatusGerencial(false)} />
      )}
      {showExecutiveDashboard && (
        <ExecutiveDashboard onClose={() => setShowExecutiveDashboard(false)} />
      )}
      {showUsuarios && (
        <UsuariosModule onClose={() => setShowUsuarios(false)} />
      )}

      {/* â”€â”€ Comunicados â”€â”€ */}
      <ComunicadoModal />
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget)
              useComunicadosStore.getState().setOpen(false);
          }}
        >
          <div className="w-full max-w-4xl h-[80vh]">
            <Comunicados proyecto="belempampa" />
          </div>
        </div>
      )}

    </div>
  );
}

export default App;



