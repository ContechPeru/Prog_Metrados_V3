import React, { useState } from 'react';
import { X, TrendingUp, Calendar, BarChart3, ChevronRight } from 'lucide-react';
import { useStatusGerencial } from '../hooks/useStatusGerencial';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'
];

interface StatusGerencialProps {
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const fmtM = (n: number) => {
  if (Math.abs(n) >= 1e6) return `S/ ${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `S/ ${(n / 1e3).toFixed(1)}K`;
  return fmt(n);
};

const avanceColor = (p: number) => {
  if (p >= 80) return { text: '#3fb950', bg: '#3fb950' };
  if (p >= 50) return { text: '#d29922', bg: '#d29922' };
  return { text: '#f85149', bg: '#f85149' };
};

export const StatusGerencial: React.FC<StatusGerencialProps> = ({ onClose }) => {
  const now = new Date();
  const [mesNum, setMesNum] = useState(now.getMonth() + 1); // Mes actual por defecto
  const anio = now.getFullYear();

  // Construir rango ISO del mes seleccionado (sin usar new Date para el filtro → evita TZ bug)
  const mm = String(mesNum).padStart(2, '0');
  const lastDay = new Date(anio, mesNum, 0).getDate(); // día final del mes
  const dateFrom = `${anio}-${mm}-01`;
  const dateTo   = `${anio}-${mm}-${String(lastDay).padStart(2, '0')}`;

  const stats = useStatusGerencial(dateFrom, dateTo);

  const totalColor = avanceColor(stats.totalAvancePct);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#0d1117] text-white overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1f6feb] via-[#388bfd] to-[#bc8cff] px-8 py-5 flex items-center justify-between shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">
              Status Gerencial
            </h1>
            <p className="text-white/70 text-xs mt-1 font-medium">
              Cuadro Comparativo por Especialidad · COMPONENTE 1 Y 2
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="text-right">
            <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Corte</div>
            <div className="text-white font-black text-sm">{MESES[mesNum - 1]} {anio}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* ═══ FILTRO DE MESES ═══ */}
      <div className="flex-shrink-0 bg-[#161b22] border-b border-[#30363d] px-8 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-[#8b949e]">
          <Calendar size={13} />
          <span className="text-[11px] font-bold uppercase tracking-widest">Mes de Corte:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MESES.map((m, i) => {
            const num = i + 1;
            const isActual = num === (now.getMonth() + 1);
            const isSelected = num === mesNum;
            return (
              <button
                key={m}
                onClick={() => setMesNum(num)}
                className={`relative px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#388bfd] text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:border-[#58a6ff] hover:text-[#58a6ff]'
                }`}
              >
                {m}
                {isActual && (
                  <span className={`ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#3fb950]/20 text-[#3fb950]'
                  }`}>
                    HOY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="flex-shrink-0 px-8 py-4 grid grid-cols-4 gap-4 bg-[#0d1117] border-b border-[#30363d]">
        {[
          { label: 'Presupuesto Contractual', val: fmtM(stats.totalPpto),      color: '#58a6ff', accent: '#1f6feb' },
          { label: 'Anterior (Acum. Previo)', val: fmtM(stats.totalAnterior),  color: '#d29922', accent: '#7d4e00' },
          { label: `Actual Ejecutado (${MESES[mesNum-1]}) · ${dateFrom} → ${dateTo}`, val: fmtM(stats.totalActual), color: '#3fb950', accent: '#196c2e' },
          { label: '% Avance General',        val: `${stats.totalAvancePct.toFixed(2)}%`, color: totalColor.text, accent: '#30363d' },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="bg-[#161b22] border border-[#30363d] rounded-xl px-5 py-4 relative overflow-hidden group hover:border-[#58a6ff]/40 transition-colors"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: kpi.color }} />
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e] mb-2">{kpi.label}</div>
            <div className="text-xl font-black tabular-nums" style={{ color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* ═══ TABLA PRINCIPAL ═══ */}
      <div className="flex-1 overflow-auto px-8 py-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-[#58a6ff]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#58a6ff]">
            Cuadro Comparativo por Especialidad – {MESES[mesNum - 1]} {anio}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#30363d] to-transparent ml-2" />
        </div>

        <div className="rounded-xl border border-[#30363d] overflow-hidden shadow-2xl">
          <table className="w-full border-collapse text-sm min-w-[900px]">
            <thead>
              <tr className="bg-[#1c2333]">
                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-[#8b949e] w-10">N°</th>
                <th className="px-5 py-3 text-left   text-[10px] font-black uppercase tracking-wider text-[#8b949e]">Especialidad</th>
                <th className="px-5 py-3 text-right  text-[10px] font-black uppercase tracking-wider text-[#8b949e]">Ppto. Contractual</th>
                <th className="px-5 py-3 text-right  text-[10px] font-black uppercase tracking-wider text-[#8b949e]">Anterior</th>
                <th className="px-5 py-3 text-right  text-[10px] font-black uppercase tracking-wider text-[#3fb950]">
                  Actual <span className="text-[8px] normal-case font-normal text-[#3fb950]/70">(Ejecutado Real)</span>
                </th>
                <th className="px-5 py-3 text-right  text-[10px] font-black uppercase tracking-wider text-[#58a6ff]">Acumulado</th>
                <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-wider text-[#8b949e] w-40">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {stats.rows.map((row, idx) => {
                const col = avanceColor(row.avancePct);
                return (
                  <tr
                    key={row.n}
                    className="border-b border-[#30363d]/60 transition-colors hover:bg-[#1f2b3e]"
                    style={{ background: idx % 2 === 0 ? '#161b22' : '#1a2130' }}
                  >
                    <td className="px-4 py-3 text-center text-[#8b949e] text-xs">{row.n}</td>
                    <td className="px-5 py-3 font-bold text-[#e6edf3]">{row.label}</td>
                    <td className="px-5 py-3 text-right font-mono text-[#8b949e] text-xs tabular-nums">{fmt(row.ppto)}</td>
                    <td className="px-5 py-3 text-right font-mono text-[#d29922] text-xs tabular-nums">{fmt(row.anterior)}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-[#3fb950] text-xs tabular-nums">
                      {row.actual > 0 ? fmt(row.actual) : <span className="text-[#8b949e] font-normal">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-[#58a6ff] text-xs tabular-nums">{fmt(row.acumulado)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(row.avancePct, 100).toFixed(1)}%`, background: col.bg }}
                          />
                        </div>
                        <span className="w-14 text-right font-bold text-xs tabular-nums" style={{ color: col.text }}>
                          {row.avancePct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ── TOTAL CONSOLIDADO OBRA ── */}
            <tfoot>
              <tr className="border-t-2 border-[#388bfd] bg-[#1f3044]">
                <td className="px-4 py-4 text-center text-[#388bfd]"><ChevronRight size={14} /></td>
                <td className="px-5 py-4 font-black text-white uppercase tracking-wide text-xs">Total Consolidado Obra</td>
                <td className="px-5 py-4 text-right font-mono font-bold text-[#58a6ff] tabular-nums">{fmt(stats.totalPpto)}</td>
                <td className="px-5 py-4 text-right font-mono font-bold text-[#d29922] tabular-nums">{fmt(stats.totalAnterior)}</td>
                <td className="px-5 py-4 text-right font-mono font-bold text-[#3fb950] tabular-nums">{fmt(stats.totalActual)}</td>
                <td className="px-5 py-4 text-right font-mono font-bold text-[#58a6ff] tabular-nums">{fmt(stats.totalAcumulado)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(stats.totalAvancePct, 100).toFixed(1)}%`, background: totalColor.bg }}
                      />
                    </div>
                    <span className="w-14 text-right font-black text-sm tabular-nums" style={{ color: totalColor.text }}>
                      {stats.totalAvancePct.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>

              {/* ── GENERAL ── */}
              <tr className="border-t-2 border-[#e3b341] bg-[#162032]">
                <td className="px-4 py-4 text-center text-[#e3b341] text-sm">★</td>
                <td className="px-5 py-4 font-black text-[#e3b341] uppercase tracking-widest text-xs">General</td>
                <td className="px-5 py-4 text-right font-mono font-black text-[#e3b341] tabular-nums">{fmt(stats.totalPpto)}</td>
                <td className="px-5 py-4 text-right font-mono font-black text-[#e3b341] tabular-nums">{fmt(stats.totalAnterior)}</td>
                <td className="px-5 py-4 text-right font-mono font-black text-[#e3b341] tabular-nums">{fmt(stats.totalActual)}</td>
                <td className="px-5 py-4 text-right font-mono font-black text-[#e3b341] tabular-nums">{fmt(stats.totalAcumulado)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-20 h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(stats.totalAvancePct, 100).toFixed(1)}%`, background: '#e3b341' }}
                      />
                    </div>
                    <span className="w-14 text-right font-black text-sm tabular-nums text-[#e3b341]">
                      {stats.totalAvancePct.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Nota fuente */}
        <div className="mt-4 flex items-center gap-2 text-[10px] text-[#8b949e]">
          <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
          <span>
            <strong className="text-[#58a6ff]">Anterior</strong> = datos estáticos del Excel (Marzo 2026) ·{' '}
            <strong className="text-[#3fb950]">Actual</strong> = ejecutado real calculado desde metrados registrados (mes seleccionado) ·{' '}
            Fuente: <em>presupuestos_Especialidades_master.xlsx</em>
          </span>
        </div>
      </div>
    </div>
  );
};
