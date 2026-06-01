import React, { useState } from 'react';
import { 
    X, Download, 
    DollarSign, Activity, Target, Zap, AlertTriangle,
    PieChart, TrendingUp, Filter, ChevronDown,
    Layers, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';

interface ExecutiveDashboardProps {
    onClose: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onClose }) => {
    const [proyecto, setProyecto] = useState<'hospital' | 'contingencia'>('hospital');
    const [activeView, setActiveView] = useState<'overview' | 'specialties'>('overview');
    const stats = useDashboardStats(proyecto);

    const formatSoles = (num: number) => {
        return new Intl.NumberFormat('es-PE', { 
            style: 'currency', 
            currency: 'PEN', 
            minimumFractionDigits: 2 
        }).format(num);
    };

    const formatPercent = (num: number) => {
        return num.toFixed(2) + '%';
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
            {/* Power BI Studio Container */}
            <div className="bg-[#F3F2F1] w-full max-w-[1600px] h-[95vh] rounded shadow-2xl flex border border-slate-300 overflow-hidden font-sans text-slate-800">
                
                {/* 1. SIDE NAVIGATOR (Slicers) */}
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3 text-[#005A9C]">
                            <LayoutDashboard size={24} />
                            <h2 className="text-sm font-black uppercase tracking-tight">Report Studio</h2>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 space-y-8">
                        {/* Slicer: Proyecto */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Filter size={12} /> Proyecto de Obra
                            </label>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setProyecto('hospital')}
                                    className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-bold flex items-center justify-between transition-all ${proyecto === 'hospital' ? 'bg-[#005A9C] text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    Hospital <CheckCircle2 size={14} className={proyecto === 'hospital' ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button 
                                    onClick={() => setProyecto('contingencia')}
                                    className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-bold flex items-center justify-between transition-all ${proyecto === 'contingencia' ? 'bg-[#005A9C] text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    Contingencia <CheckCircle2 size={14} className={proyecto === 'contingencia' ? 'opacity-100' : 'opacity-0'} />
                                </button>
                            </div>
                        </div>

                        {/* Slicer: Vistas */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={12} /> Visualización
                            </label>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setActiveView('overview')}
                                    className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-bold flex items-center gap-3 transition-all ${activeView === 'overview' ? 'bg-slate-100 text-[#005A9C] border-l-4 border-[#005A9C]' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <TrendingUp size={14} /> Resumen General
                                </button>
                                <button 
                                    onClick={() => setActiveView('specialties')}
                                    className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-bold flex items-center gap-3 transition-all ${activeView === 'specialties' ? 'bg-slate-100 text-[#005A9C] border-l-4 border-[#005A9C]' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <PieChart size={14} /> Detalle Especialidad
                                </button>
                            </div>
                        </div>

                        {/* Audit Info */}
                        <div className="pt-8 border-t border-slate-100">
                            <div className="p-4 bg-slate-50 rounded border border-slate-200">
                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">Data Source</span>
                                <span className="text-[10px] font-black text-slate-700">Supabase SQL V25</span>
                                <div className="mt-2 flex items-center gap-2 text-[#107C41]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#107C41] animate-pulse"></div>
                                    <span className="text-[9px] font-black uppercase">Live Connection</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100">
                        <button 
                            onClick={onClose}
                            className="w-full py-2.5 rounded text-[11px] font-black uppercase text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                        >
                            <X size={14} /> Cerrar Sesión
                        </button>
                    </div>
                </aside>

                {/* 2. MAIN REPORT AREA */}
                <main className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Top Ribbon (KPI Scorecards) */}
                    <div className="bg-[#F8F9FA] border-b border-slate-200 px-10 py-6 grid grid-cols-4 gap-8">
                        {[
                            { label: 'Presupuesto Base', val: stats.totalBudget, icon: DollarSign, color: '#005A9C', sub: 'Monto Contractual' },
                            { label: 'Valorizado Ejecutado', val: stats.totalExecuted, icon: Activity, color: '#107C41', sub: 'Avance Real Financiero' },
                            { label: 'Saldo por Ejecutar', val: stats.totalSaldo, icon: Target, color: '#C43E1C', sub: 'Monto Pendiente' },
                            { label: 'Eficiencia Global', val: stats.progressPercentage, icon: Zap, color: '#005A9C', sub: 'Ratio de Avance', suffix: '%' }
                        ].map((kpi) => (
                            <div key={kpi.label} className="bg-white border border-slate-200 p-5 rounded-sm shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: kpi.color }}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                                    <kpi.icon size={16} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="text-2xl font-black tabular-nums tracking-tighter" style={{ color: kpi.suffix === '%' ? '#333' : kpi.color }}>
                                    {kpi.suffix === '%' ? formatPercent(kpi.val as number) : formatSoles(kpi.val as number)}
                                </div>
                                <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    {kpi.sub} <ChevronDown size={10} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Report Content Grid */}
                    <div className="flex-1 p-10 overflow-auto bg-white space-y-10">
                        
                        {/* Fila 1: Tabla de Especialidades (High Density) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Layers size={14} className="text-[#005A9C]" />
                                    Cuadro Comparativo por Especialidad
                                </h3>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#005A9C] rounded-sm"></div> Base</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#107C41] rounded-sm"></div> Ejecutado</span>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-sm overflow-hidden bg-[#FBFBFA]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-800">
                                            <th className="px-6 py-4">Especialidad / Área de Gestión</th>
                                            <th className="px-6 py-4 text-right">Ppto Contractual</th>
                                            <th className="px-6 py-4 text-right">Ejecutado Real</th>
                                            <th className="px-6 py-4 text-right">Meta Programada</th>
                                            <th className="px-6 py-4 text-right">Monto Saldo</th>
                                            <th className="px-6 py-4 text-center">% Avance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[11px]">
                                        {stats.specialtyStats.map((s) => (
                                            <tr key={s.name} className="hover:bg-blue-50/30 border-b border-slate-100 group transition-colors">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-[#005A9C] rotate-45"></div>
                                                        <span className="font-black text-slate-700 uppercase tracking-tight">{s.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-500">{formatSoles(s.contractualBudget)}</td>
                                                <td className="px-6 py-3.5 text-right font-mono font-black text-[#107C41]">{formatSoles(s.totalExecuted)}</td>
                                                <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-400">{formatSoles(s.contractualBudget)}</td>
                                                <td className="px-6 py-3.5 text-right font-mono font-black text-[#C43E1C]">{formatSoles(s.contractualBudget - s.totalExecuted)}</td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-3 bg-slate-100 rounded-sm overflow-hidden border border-slate-200">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-[#0058A3] to-[#0074D9]" 
                                                                style={{ width: `${s.progressPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="w-12 text-right font-black text-slate-900">{formatPercent(s.progressPercentage)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 text-[11px] font-black text-slate-800 border-t border-slate-300">
                                            <td className="px-6 py-5 uppercase italic tracking-widest">Total Consolidado Obra</td>
                                            <td className="px-6 py-5 text-right font-mono text-[#005A9C] text-sm">{formatSoles(stats.totalBudget)}</td>
                                            <td className="px-6 py-5 text-right font-mono text-[#107C41] text-sm">{formatSoles(stats.totalExecuted)}</td>
                                            <td className="px-6 py-5 text-right font-mono text-slate-400 text-sm">{formatSoles(stats.totalBudget)}</td>
                                            <td className="px-6 py-5 text-right font-mono text-[#C43E1C] text-sm">{formatSoles(stats.totalSaldo)}</td>
                                            <td className="px-6 py-5 text-right flex items-center justify-end gap-3">
                                                <span className="text-xl tracking-tighter italic">{formatPercent(stats.progressPercentage)}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Fila 2: Análisis de Tendencia S-Curve (SVG Sólido) */}
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-8 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <TrendingUp size={14} className="text-[#005A9C]" />
                                        Tendencia de Producción Acumulada
                                    </h3>
                                </div>
                                <div className="bg-white border border-slate-200 p-8 h-80 relative group">
                                    {/* Gráfico de Barras Power BI Style */}
                                    <div className="absolute inset-x-8 bottom-8 top-8 flex items-end gap-3">
                                        {stats.monthlyProgress.map((m) => (
                                            <div key={m.month} className="flex-1 flex flex-col items-center gap-2 justify-end group/bar">
                                                <div className="w-full relative flex items-end gap-0.5">
                                                    {/* Proyectado (Barra más clara/ancha) */}
                                                    <div className="absolute inset-0 bg-slate-100 rounded-t-sm border border-slate-200 h-[100%] opacity-50"></div>
                                                    {/* Real (Barra central azul fuerte) */}
                                                    <div 
                                                        className="w-full bg-[#005A9C] rounded-t-sm relative z-10 hover:bg-[#0074D9] transition-all"
                                                        style={{ height: `${(m.cumulativeExecuted / stats.totalBudget) * 100}%` }}
                                                    >
                                                        <div className="absolute -top-6 left-1/2 -track translate-x-1/2 bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap z-20">
                                                            {formatPercent((m.cumulativeExecuted / stats.totalBudget) * 100)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase rotate-45">{m.month.split('-')[1]}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity size={14} className="text-[#005A9C]" />
                                        Control de Campo
                                    </h3>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividades No Valorizables</p>
                                        <div className="space-y-2">
                                            {stats.specialtyStats.filter(s => s.operationalExecutedQty > 0).map(s => (
                                                <div key={s.name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 group">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase italic mb-1">{s.name}</span>
                                                    <span className="text-[12px] font-black font-mono text-slate-900 bg-white px-3 py-1 border border-slate-200 rounded-sm">
                                                        {s.operationalExecutedQty.toFixed(1)} <span className="text-[8px] text-slate-400">UND</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 italic text-[9px] flex gap-3 leading-relaxed">
                                            <AlertTriangle size={14} className="shrink-0" />
                                            Las unidades físicas sin PU no impactan la valorización financiera.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>

                {/* 3. REPORT BAR (Footer) */}
                <div className="fixed bottom-8 right-12 z-[130] flex gap-3">
                    <button className="bg-white border border-slate-300 p-3 rounded-full shadow-lg hover:bg-slate-50 text-slate-600 transition-all active:scale-95 group">
                        <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-slate-900 text-white p-3 rounded-full shadow-xl hover:bg-black transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

            </div>
        </div>
    );
};
