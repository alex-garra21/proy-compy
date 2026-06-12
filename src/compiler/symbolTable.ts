import { SymbolTableEntry } from "./types";

export class SymbolTable {
    private scopes: Map<string, SymbolTableEntry>[] = [new Map()];
    private nextMemoryOffset: number = 0;

    constructor() {
        this.initializeSystemSymbols();
    }

    /**
     * Pre-carga identificadores del sistema de Mini-C++
     */
    private initializeSystemSymbols() {
        this.insertSystemSymbol("std", "namespace");
        this.insertSystemSymbol("cout", "ostream");
        this.insertSystemSymbol("cin", "istream");
        this.insertSystemSymbol("endl", "modifier");
    }

    private insertSystemSymbol(name: string, type: string) {
        const entry: SymbolTableEntry = {
            identifier: name,
            dataType: type,
            scope: "system",
            memoryPosition: "System"
        };
        this.scopes[0].set(name, entry);
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
    insert(name: string, type: string, scope: string = "local"): boolean {
        const currentScope = this.scopes[this.scopes.length - 1];
        if (currentScope.has(name)) {
            return false;
        }

        // Generar una dirección de memoria simulada secuencial
        const memoryPosition = `0x${(0x1000 + this.nextMemoryOffset).toString(16).toUpperCase()}`;
        this.nextMemoryOffset += 4;

        const entry: SymbolTableEntry = {
            identifier: name,
            dataType: type,
            scope: this.scopes.length === 1 ? "global" : scope,
            memoryPosition
        };

        currentScope.set(name, entry);
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
     * Limpia la tabla de símbolos y recarga los objetos del sistema.
     */
    clear(): void {
        this.scopes = [new Map()];
        this.nextMemoryOffset = 0;
        this.initializeSystemSymbols();
    }

    /**
     * Devuelve todas las entradas acumuladas en todos los ámbitos para el renderizado.
     */
    getAllEntries(): SymbolTableEntry[] {
        const all: SymbolTableEntry[] = [];
        this.scopes.forEach(scope => {
            all.push(...scope.values());
        });
        return all;
    }
}
