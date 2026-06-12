import { SymbolTableEntry } from "./types";

export class SymbolTable {
    private table: Map<string, SymbolTableEntry> = new Map();
    private nextMemoryOffset: number = 0;

    /**
     * Inserta una variable en la tabla de símbolos.
     * Retorna false si la variable ya existe en el ámbito actual (Error de Redeclaración).
     */
    insert(name: string, type: string, scope: string = "local"): boolean {
        if (this.table.has(name)) {
            return false;
        }

        // Generar una dirección de memoria simulada secuencial
        const memoryPosition = `0x${(0x1000 + this.nextMemoryOffset).toString(16).toUpperCase()}`;
        this.nextMemoryOffset += 4; // Asumimos 4 bytes por variable estándar

        const entry: SymbolTableEntry = {
            identifier: name,
            dataType: type,
            scope,
            memoryPosition
        };

        this.table.set(name, entry);
        return true;
    }

    /**
     * Busca una variable por su identificador.
     */
    lookup(name: string): SymbolTableEntry | undefined {
        return this.table.get(name);
    }

    /**
     * Limpia la tabla de símbolos para un nuevo ciclo de compilación.
     */
    clear(): void {
        this.table.clear();
        this.nextMemoryOffset = 0;
    }

    /**
     * Devuelve todas las entradas de la tabla para su visualización.
     */
    getAllEntries(): SymbolTableEntry[] {
        return Array.from(this.table.values());
    }
}
