import { SymbolTableEntry } from "./types";

export class SymbolTable {
    private scopes: Map<string, SymbolTableEntry>[] = [new Map()];
    private nextMemoryOffset: number = 0;
    private allSymbols: SymbolTableEntry[] = [];

    constructor() {
        // Constructor limpio, sin símbolos pre-cargados
    }

    /**
     * Entra en un nuevo ámbito local (ej. al abrir una llave '{')
     */
    enterScope(): void {
        this.scopes.push(new Map());
    }

    /**
     * Sale del ámbito local actual (ej. al cerrar una llave '}')
     */
    exitScope(): void {
        if (this.scopes.length > 1) {
            this.scopes.pop();
        }
    }

    /**
     * Inserta una variable en el ámbito local actual.
     * Retorna false si la variable ya existe en el ámbito actual (Error de Redeclaración).
     */
    insert(name: string, type: string, line: number, column: number, scope: string = "local"): boolean {
        const currentScope = this.scopes[this.scopes.length - 1];
        if (currentScope.has(name)) {
            return false;
        }

        // Generar una dirección de memoria simulada secuencial o "System" para console IO
        let memoryPosition = "";
        if (scope === "system") {
            memoryPosition = "System";
        } else {
            memoryPosition = `0x${(0x1000 + this.nextMemoryOffset).toString(16).toUpperCase()}`;
            this.nextMemoryOffset += 4;
        }

        const entry: SymbolTableEntry = {
            identifier: name,
            dataType: type,
            scope: this.scopes.length === 1 ? "global" : scope,
            memoryPosition,
            line,
            column
        };

        currentScope.set(name, entry);
        this.allSymbols.push(entry);
        return true;
    }

    /**
     * Busca una variable subiendo por la pila de ámbitos (de local a global).
     */
    lookup(name: string): SymbolTableEntry | undefined {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const entry = this.scopes[i].get(name);
            if (entry) return entry;
        }
        return undefined;
    }

    /**
     * Limpia la tabla de símbolos.
     */
    clear(): void {
        this.scopes = [new Map()];
        this.nextMemoryOffset = 0;
        this.allSymbols = [];
    }

    /**
     * Devuelve todas las entradas acumuladas históricamente para el renderizado.
     */
    getAllEntries(): SymbolTableEntry[] {
        return this.allSymbols;
    }
}
