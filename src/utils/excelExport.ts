import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


const STARTING_ROW = 8;

const validacionesPesoAcero: Record<string, number> = {
    "1/4": 0.254,
    "3/8": 0.560,
    "1/2": 0.994,
    "5/8": 1.550,
    "3/4": 2.240,
    "1": 3.970,
    "1 3/8": 7.907
};

function obtenerEspecialidad(codigo: string): string { return ''; }

    

function esPartidaAcero(m: any): boolean {
    return !!(m.unidad && m.unidad.toLowerCase() === 'kg' &&
           m.descripcion_partida &&
           m.descripcion_partida.toLowerCase()
               .normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('acero'));
}

export const clientSideExport = async (
    metrados: any[], 
    proyecto: string, 
    mode: 'official' | 'master', 
    especialidadNombre: string, 
    autorNombre: string
) => {
    const isMaster = mode === 'master';

    // Fetch the template from the public folder
    const templateResponse = await fetch('/METRADO_PLANTILLA_5.xlsx');
    if (!templateResponse.ok) {
        throw new Error('No se pudo cargar la plantilla de Excel (METRADO_PLANTILLA_5.xlsx) base. Verifique que exista en la carpeta public.');
    }
    const templateBuffer = await templateResponse.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    let worksheet = workbook.getWorksheet('METRADO')
        || workbook.getWorksheet(proyecto === 'hospital' ? 'Hospital' : 'Contingencia')
        || workbook.getWorksheet('Metrado Estructuras')
        || workbook.worksheets[0];

    if (!worksheet) throw new Error("No se encontró una pestaña válida en la plantilla.");

    const codesWithMetrados = new Set(
        metrados.filter(m => !m.is_template).map(m => m.codigo_partida)
    );

    const partidaTotals: Record<string, number> = {};
    const codigosMap = new Map();

    metrados.forEach(m => {
        if (m.is_template) {
            const info = {
                descripcion: m.descripcion,
                nivel_jerarquia: m.nivel_jerarquia,
                unidad: m.unidad,
                precio_unitario: m.pu_actual || m.precio_unitario || 0,
                metrado_programado: m.metrado_programado || m.cantidad_presupuesto || 0,
                metrado_anterior_acumulado: m.metrado_anterior_acumulado || m.acumulado_anterior_qty || 0,
                se_valoriza: m.se_valoriza !== undefined ? m.se_valoriza : true
            };
            codigosMap.set(m.codigo, info);
            if (m.id) codigosMap.set(m.id, info);
        } else {
            partidaTotals[m.codigo_partida] = (partidaTotals[m.codigo_partida] || 0) + (m.total || 0);
        }
    });

    let currentExcelRow = STARTING_ROW;

    metrados.forEach(m => {
        let rowData: any[] | null = null;

        if (m.is_template && m.es_titulo) return;
        if (m.is_template && m.is_elemento_virtual) return;

        const isSumatoria = m.is_template && !m.es_titulo;
        const codigoActual = isSumatoria ? m.codigo : m.codigo_partida;
        const descActual = isSumatoria ? m.descripcion : (m.descripcion_partida || m.codigo_partida || "");

        const infoPartida = codigosMap.get(codigoActual) || {};
        const unidadActual = m.unidad || infoPartida.unidad || "";

        rowData = new Array(isMaster ? 42 : 27).fill("");

        // Calculamos Grados
        const grados = ["", "", "", ""];
        let ancestors = [];
        for (let [key, val] of codigosMap.entries()) {
            if (codigoActual === key || codigoActual.startsWith(key + '.')) {
                ancestors.push({ codigo: key, descripcion: val.descripcion });
            }
        }
        ancestors.sort((a, b) => a.codigo.length - b.codigo.length);
        for (let i = 0; i < ancestors.length && i < 4; i++) {
            grados[i] = `${ancestors[i].codigo}-${ancestors[i].descripcion}`;
        }

        if (isSumatoria) {
            const hasMetrados = codesWithMetrados.has(codigoActual);
            
            rowData[1] = m.nivel_jerarquia != null ? String(m.nivel_jerarquia) : ""; // B
            rowData[8] = grados[0]; // I: Grado 1
            rowData[9] = grados[1]; // J: Grado 2
            rowData[10] = grados[2]; // K: Grado 3
            rowData[11] = grados[3]; // L: Grado 4
            rowData[12] = `${codigoActual}-${descActual}`; // M
            rowData[22] = hasMetrados ? (partidaTotals[codigoActual] || 0) : ""; // W: Total 2
            rowData[23] = unidadActual; // X: Unidad
            rowData[24] = m.modificacion || "SM"; // Y
            rowData[25] = ""; // Z
            rowData[26] = ""; // AA
        } else if (!m.is_template) {
            const flagAcero = esPartidaAcero(m);
            const elemTrim = (m.elemento || '').trim();
            const detalleTrim = (m.detalle || '').trim();
            const concatDesc = elemTrim && detalleTrim ? `${elemTrim} / ${detalleTrim}` : elemTrim || detalleTrim;

            let parcial = m.parcial;
            if (flagAcero) {
                const normalizedDiam = (m.diametro || "").replace('"', '');
                const peso = validacionesPesoAcero[normalizedDiam] || 0;
                if (peso > 0) {
                    const l = parseFloat(m.longitud_area) || 0;
                    const e = parseFloat(m.ancho_empalme) || 0;
                    const g = parseFloat(m.altura_gancho) || 0;
                    parcial = (parseFloat(m.cantidad) || 0) * (l + e + g) * peso;
                }
            } else if (m.hvac_factor) {
                const c = parseFloat(m.cantidad) || 1;
                const l = (m.hvac_item_type === 'CODO' || m.hvac_item_type === 'DUCTO') ? (parseFloat(m.longitud_area) || 1) : 1;
                const a = parseFloat(m.ancho_empalme) || 1;
                const h = parseFloat(m.altura_gancho) || 1;
                parcial = c * l * a * h * m.hvac_factor;
            }

            const colM = `${codigoActual}-${descActual}`;

            rowData[1] = m.nivelJerarquia != null ? String(m.nivelJerarquia) : ""; // B
            rowData[2] = m.fecha || ""; // C
            rowData[3] = obtenerEspecialidad(codigoActual) || m.especialidad || ""; // D
            rowData[4] = m.frente || ""; // E
            rowData[5] = m.bloque || ""; // F
            rowData[6] = m.nivel || ""; // G
            rowData[7] = m.cuadrilla || ""; // H

            rowData[8] = grados[0]; // I
            rowData[9] = grados[1]; // J
            rowData[10] = grados[2]; // K
            rowData[11] = grados[3]; // L

            rowData[12] = colM; // M
            rowData[13] = concatDesc; // N
            rowData[14] = m.cantidad || ""; // O
            rowData[15] = m.longitud_area || ""; // P
            rowData[16] = m.ancho_empalme || ""; // Q
            rowData[17] = m.altura_gancho || ""; // R
            rowData[18] = parcial || 0; // S
            rowData[19] = m.nro_veces || ""; // T
            rowData[20] = flagAcero ? (m.diametro || "") : ""; // U
            rowData[21] = m.total || 0; // V

            rowData[22] = ""; // W
            rowData[23] = unidadActual; // X
            rowData[24] = m.modificacion || "SM"; // Y
            
            rowData[25] = m.obrero_nombre || ""; // Z
            rowData[26] = m.autor_usuario || ""; // AA
        }

        if (isMaster && rowData) {
            const total2 = partidaTotals[codigoActual] || 0;
            const pu = infoPartida.precio_unitario || 0;
            const meta = infoPartida.metrado_programado || 0;
            const anterior = infoPartida.metrado_anterior_acumulado || 0;
            const acumuladoTotal = total2 + anterior;
            const saldoFisico = meta - acumuladoTotal;
            const porcentajeAvance = meta > 0 ? (acumuladoTotal / meta) : 0;
            const valoAnterior = anterior * pu;
            const valoActual = total2 * pu;
            const valoAcumulada = acumuladoTotal * pu;
            const saldoMonetario = saldoFisico * pu;

            rowData[27] = pu; // AB
            rowData[28] = meta; // AC
            rowData[29] = anterior; // AD
            rowData[30] = total2; // AE
            rowData[31] = acumuladoTotal; // AF
            rowData[32] = saldoFisico; // AG
            rowData[33] = porcentajeAvance; // AH
            rowData[34] = valoAnterior; // AI
            rowData[35] = valoActual; // AJ
            rowData[36] = valoAcumulada; // AK
            rowData[37] = saldoMonetario; // AL
            
            let estado = "EN PROCESO";
            if (saldoFisico < 0) estado = "EXCEDIDO";
            else if (saldoFisico === 0 && meta > 0) estado = "FINALIZADO";
            else if (meta === 0) estado = "DEDUCTIVO/EXTRA";
            rowData[38] = estado; // AM

            rowData[39] = infoPartida.se_valoriza ? "SI" : "NO"; // AN
        }

        if (rowData) {
            const row = worksheet.getRow(currentExcelRow);
            rowData.forEach((val, i) => {
                if (i === 0) return; // Saltamos A
                if (val !== undefined && val !== null) {
                    const cell = row.getCell(i + 1);
                    cell.value = val;

                    if (i === 22 && !isSumatoria) {
                        cell.value = null;
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'none'
                        };
                    }
                }
            });
            currentExcelRow++;
        }
    });

    if (isMaster) {
        const headerRow = worksheet.getRow(STARTING_ROW - 1);
        const headersMaster = [
            'PU', 'META', 'ANT. CANT', 'ACTUAL CANT', 'ACUM. CANT', 'SALDO CANT', '% AVANCE',
            'VALO ANT S/', 'VALO ACT S/', 'VALO ACUM S/', 'SALDO S/', 'ESTADO', 'VALORIZA'
        ];
        
        headersMaster.forEach((h, i) => {
            const cell = headerRow.getCell(28 + i);
            cell.value = h;
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEFEFEF' }
            };
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const prefix = isMaster ? 'MAESTRO' : 'REPORTE';
    
    // As in server, if especialidadNombre isn't provided we guess it
    const fileNameEspecialidad = especialidadNombre && especialidadNombre !== 'TODAS' 
        ? especialidadNombre.replace(/\s+/g, '_') 
        : 'VARIAS';
        
    const filename = `${prefix}_metrados_${fileNameEspecialidad}_${autorNombre}_${dateStr}.xlsx`.toLowerCase();

    saveAs(new Blob([buffer]), filename);
};


