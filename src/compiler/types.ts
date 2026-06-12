/**
 * Tipos de Token correspondientes a los autómatas de Mini-C++
 */
export enum TokenType {
    KEYWORD = "KEYWORD",
    IDENTIFIER = "IDENTIFIER",
    NUMERIC_LITERAL = "NUMERIC_LITERAL",
    STRING_LITERAL = "STRING_LITERAL",
    OPERATOR = "OPERATOR",
    DELIMITER = "DELIMITER",
    UNKNOWN = "UNKNOWN",
    EOF = "EOF"
}

/**
 * Estructura de un Token detectado en el análisis léxico
 */
export interface Token {
    type: TokenType;
    lexeme: string;
    line: number;
    column: number;
}

/**
 * Tipos de Errores que puede reportar el compilador
 */
export enum ErrorType {
    LEXICAL = "LEXICAL",
    SYNTAX = "SYNTAX",
    SEMANTIC = "SEMANTIC"
}

/**
 * Estructura de un Error del Compilador
 */
export interface CompilerError {
    type: ErrorType;
    message: string;
    line: number;
    column: number;
}

/**
 * Entrada en la Tabla de Símbolos
 */
export interface SymbolTableEntry {
    identifier: string;
    dataType: string;
    scope: string;
    memoryPosition: string;
    line: number;
    column: number;
}
