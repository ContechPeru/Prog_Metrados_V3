import { IFormulaHandler } from './types';
import { EstandarStrategy } from './strategies/EstandarStrategy';
import { AceroStrategy } from './strategies/AceroStrategy';
import { HvacStrategy } from './strategies/HvacStrategy';
import { InstalacionesStrategy } from './strategies/InstalacionesStrategy';

class FormulaRegistry {
    private strategies: Map<string, IFormulaHandler> = new Map();
    private defaultStrategy: IFormulaHandler;

    constructor() {
        this.defaultStrategy = new EstandarStrategy();
        this.register(this.defaultStrategy);
        this.register(new AceroStrategy());
        this.register(new HvacStrategy());
        this.register(new InstalacionesStrategy());
    }

    register(strategy: IFormulaHandler) {
        this.strategies.set(strategy.id, strategy);
    }

    get(tipoMetrado?: string): IFormulaHandler {
        if (!tipoMetrado) return this.defaultStrategy;
        
        let t = tipoMetrado.toUpperCase().trim();

        // Manejo especial para HVAC_DUCTO y HVAC_ACCESORIO (usan la misma estrategia lógica)
        if (t.startsWith('HVAC')) return this.strategies.get('HVAC') || this.defaultStrategy;
        
        // Mapeo intuitivo de ramas a INSTALACION
        if (['INSTALACIONES', 'SANITARIAS', 'ELECTRICAS', 'ELECTROMECANICAS', 'TELECOMUNICACIONES'].includes(t)) {
            return this.strategies.get('INSTALACION') || this.defaultStrategy;
        }
        
        return this.strategies.get(t) || this.defaultStrategy;
    }
}

export const formulaRegistry = new FormulaRegistry();
