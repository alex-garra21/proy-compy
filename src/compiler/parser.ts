import { Token, TokenType, CompilerError, ErrorType } from "./types";
import { SymbolTable } from "./symbolTable";

/**
 * Representación de un nodo del Árbol Sintáctico Abstracto (AST)
 */
export interface ASTNode {
    type: string;        // Program, Declaration, Assignment, WhileStmt, IfStmt, BinaryExpression, etc.
    value?: string;      // Lexema u operador (ej. "+", "x", "10")
    children: ASTNode[];
    line?: number;
    column?: number;
}

export class Parser {
    private tokens: Token[] = [];
    private currentIdx: number = 0;
    private errors: CompilerError[] = [];
    private symbolTable!: SymbolTable;

    /**
     * Punto de entrada principal para el análisis sintáctico LL(1)
     */
    parse(tokensToParse: Token[], symbolTable: SymbolTable): { ast: ASTNode | null, errors: CompilerError[] } {
        this.tokens = tokensToParse;
        this.currentIdx = 0;
        this.errors = [];
        this.symbolTable = symbolTable;

        try {
            const ast = this.parseProgram();
            
            // Si no consumimos todos los tokens (excepto EOF), registrar un error
            if (!this.isAtEnd() && this.peek().type !== TokenType.EOF) {
                this.error(`Tokens adicionales no esperados después del final del programa: "${this.peek().lexeme}"`);
            }
            
            return {
                ast: ast,
                errors: this.errors
            };
        } catch (e) {
            // Captura de pánicos para recuperación de errores
            return {
                ast: null,
                errors: this.errors
            };
        }
    }

    /**
     * Regla Inicial: Program -> FuncDecl* (o declaraciones globales)
     */
    private parseProgram(): ASTNode {
        const children: ASTNode[] = [];
        
        while (!this.isAtEnd() && this.peek().type !== TokenType.EOF) {
            try {
                children.push(this.parseDeclaration());
            } catch (e) {
                // Recuperación de error simple: avanzar hasta un punto y coma para seguir compilando
                this.synchronize();
            }
        }

        return {
            type: "Program",
            children
        };
    }

    /**
     * Sincronización para recuperación de errores
     */
    private synchronize(): void {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type === TokenType.DELIMITER && this.previous().lexeme === ";") return;
            if (this.peek().type === TokenType.KEYWORD && ["int", "float", "if", "while", "return"].includes(this.peek().lexeme)) return;
            this.advance();
        }
    }

    /**
     * Regla: Declaration -> TypeSpecifier ID ...
     */
    private parseDeclaration(): ASTNode {
        const typeToken = this.consume(TokenType.KEYWORD, "Se esperaba un tipo de dato (int, float, etc.)");
        const idToken = this.consume(TokenType.IDENTIFIER, "Se esperaba un identificador");

        const children: ASTNode[] = [
            { type: "Type", value: typeToken.lexeme, children: [], line: typeToken.line, column: typeToken.column },
            { type: "Identifier", value: idToken.lexeme, children: [], line: idToken.line, column: idToken.column }
        ];

        // Lógica de decisión LL(1) para saber si es declaración de función o variable
        if (this.matchDelim('(')) {
            // Es una declaración de función: int main() { ... }
            this.consumeDelim(')', "Se esperaba ')' después de los parámetros");
            const body = this.parseBlock();
            children.push(body);
            return {
                type: "FunctionDeclaration",
                children,
                line: typeToken.line,
                column: typeToken.column
            };
        } else {
            // Es una declaración de variable: int x = 10; o int x;
            
            // ANÁLISIS SEMÁNTICO: Registro de la declaración en la Tabla de Símbolos
            const success = this.symbolTable.insert(idToken.lexeme, typeToken.lexeme);
            if (!success) {
                this.errors.push({
                    type: ErrorType.SEMANTIC,
                    message: `Error Semántico: Redefinición de la variable "${idToken.lexeme}" en la misma línea/ámbito.`,
                    line: idToken.line,
                    column: idToken.column
                });
            }

            let initializer: ASTNode | null = null;
            if (this.matchOp('=')) {
                initializer = this.parseExpression();
                children.push({
                    type: "Initializer",
                    children: [initializer]
                });
            }
            this.consumeDelim(';', "Se esperaba ';' al final de la declaración");
            return {
                type: "VariableDeclaration",
                children,
                line: typeToken.line,
                column: typeToken.column
            };
        }
    }

    /**
     * Regla: Block -> '{' Statement* '}'
     */
    private parseBlock(): ASTNode {
        this.consumeDelim('{', "Se esperaba '{' al inicio del bloque");
        const children: ASTNode[] = [];
        
        while (!this.isAtEnd() && !this.checkDelim('}')) {
            try {
                children.push(this.parseStatement());
            } catch (e) {
                this.synchronize();
            }
        }
        
        this.consumeDelim('}', "Se esperaba '}' al final del bloque");
        return {
            type: "Block",
            children
        };
    }

    /**
     * Regla: Statement -> AssignStmt | IfStmt | WhileStmt | ReturnStmt | Declaration
     */
    private parseStatement(): ASTNode {
        const token = this.peek();
        
        if (token.type === TokenType.KEYWORD) {
            if (token.lexeme === "if") {
                return this.parseIfStatement();
            } else if (token.lexeme === "while") {
                return this.parseWhileStatement();
            } else if (token.lexeme === "return") {
                return this.parseReturnStatement();
            } else if (["int", "float", "char", "double", "bool"].includes(token.lexeme)) {
                return this.parseDeclaration();
            }
        }
        
        if (token.type === TokenType.IDENTIFIER) {
            return this.parseAssignmentStatement();
        }

        this.error(`Sentencia no reconocida o inválida: "${token.lexeme}"`);
        this.advance();
        return { type: "ErrorNode", children: [] };
    }

    private parseIfStatement(): ASTNode {
        const ifToken = this.consumeKeyword("if");
        this.consumeDelim('(', "Se esperaba '(' después de 'if'");
        const condition = this.parseExpression();
        this.consumeDelim(')', "Se esperaba ')' después de la condición");
        
        const thenBranch = this.parseStatement();
        const children = [condition, thenBranch];

        if (this.matchKeyword("else")) {
            const elseBranch = this.parseStatement();
            children.push(elseBranch);
        }

        return {
            type: "IfStatement",
            children,
            line: ifToken.line,
            column: ifToken.column
        };
    }

    private parseWhileStatement(): ASTNode {
        const whileToken = this.consumeKeyword("while");
        this.consumeDelim('(', "Se esperaba '(' después de 'while'");
        const condition = this.parseExpression();
        this.consumeDelim(')', "Se esperaba ')' después de la condición");
        const body = this.parseStatement();

        return {
            type: "WhileStatement",
            children: [condition, body],
            line: whileToken.line,
            column: whileToken.column
        };
    }

    private parseReturnStatement(): ASTNode {
        const returnToken = this.consumeKeyword("return");
        let expr: ASTNode | null = null;
        
        if (!this.checkDelim(';')) {
            expr = this.parseExpression();
        }
        
        this.consumeDelim(';', "Se esperaba ';' después de la expresión de retorno");
        
        return {
            type: "ReturnStatement",
            children: expr ? [expr] : [],
            line: returnToken.line,
            column: returnToken.column
        };
    }

    private parseAssignmentStatement(): ASTNode {
        const idToken = this.consume(TokenType.IDENTIFIER, "Se esperaba un identificador para la asignación");
        
        // ANÁLISIS SEMÁNTICO: Validar que la variable exista en la Tabla de Símbolos
        const entry = this.symbolTable.lookup(idToken.lexeme);
        if (!entry) {
            this.errors.push({
                type: ErrorType.SEMANTIC,
                message: `Error Semántico: La variable "${idToken.lexeme}" no ha sido declarada en este ámbito.`,
                line: idToken.line,
                column: idToken.column
            });
        }

        this.consumeOp('=', "Se esperaba '=' para la asignación");
        const expr = this.parseExpression();
        this.consumeDelim(';', "Se esperaba ';' al final de la asignación");

        return {
            type: "AssignmentStatement",
            value: idToken.lexeme,
            children: [expr],
            line: idToken.line,
            column: idToken.column
        };
    }

    private parseExpression(): ASTNode {
        return this.parseEqualityExpression();
    }

    private parseEqualityExpression(): ASTNode {
        let node = this.parseRelationalExpression();

        while (this.matchOps(["==", "!="])) {
            const op = this.previous().lexeme;
            const right = this.parseRelationalExpression();
            node = {
                type: "BinaryExpression",
                value: op,
                children: [node, right]
            };
        }

        return node;
    }

    private parseRelationalExpression(): ASTNode {
        let node = this.parseAdditiveExpression();

        while (this.matchOps(["<", "<=", ">", ">="])) {
            const op = this.previous().lexeme;
            const right = this.parseAdditiveExpression();
            node = {
                type: "BinaryExpression",
                value: op,
                children: [node, right]
            };
        }

        return node;
    }

    private parseAdditiveExpression(): ASTNode {
        let node = this.parseMultiplicativeExpression();

        while (this.matchOps(["+", "-"])) {
            const op = this.previous().lexeme;
            const right = this.parseMultiplicativeExpression();
            node = {
                type: "BinaryExpression",
                value: op,
                children: [node, right]
            };
        }

        return node;
    }

    private parseMultiplicativeExpression(): ASTNode {
        let node = this.parsePrimaryExpression();

        while (this.matchOps(["*", "/", "%"])) {
            const op = this.previous().lexeme;
            const right = this.parsePrimaryExpression();
            node = {
                type: "BinaryExpression",
                value: op,
                children: [node, right]
            };
        }

        return node;
    }

    private parsePrimaryExpression(): ASTNode {
        const token = this.peek();

        if (token.type === TokenType.NUMERIC_LITERAL || token.type === TokenType.STRING_LITERAL) {
            this.advance();
            return { type: "Literal", value: token.lexeme, children: [], line: token.line, column: token.column };
        }

        if (token.type === TokenType.IDENTIFIER) {
            this.advance();
            
            // ANÁLISIS SEMÁNTICO: Validar que la variable exista en la Tabla de Símbolos
            const entry = this.symbolTable.lookup(token.lexeme);
            if (!entry) {
                this.errors.push({
                    type: ErrorType.SEMANTIC,
                    message: `Error Semántico: La variable "${token.lexeme}" no ha sido declarada en este ámbito.`,
                    line: token.line,
                    column: token.column
                });
            }

            return { type: "Identifier", value: token.lexeme, children: [], line: token.line, column: token.column };
        }

        if (this.matchDelim('(')) {
            const expr = this.parseExpression();
            this.consumeDelim(')', "Se esperaba ')' cerrando la expresión");
            return expr;
        }

        this.error(`Se esperaba un número, identificador o cadena de texto pero se obtuvo: "${token.lexeme}"`);
        throw new Error("ParserError");
    }

    private matchKeyword(lexeme: string): boolean {
        if (this.checkKeyword(lexeme)) {
            this.advance();
            return true;
        }
        return false;
    }

    private checkKeyword(lexeme: string): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        return token.type === TokenType.KEYWORD && token.lexeme === lexeme;
    }

    private consumeKeyword(lexeme: string): Token {
        if (this.checkKeyword(lexeme)) return this.advance();
        this.error(`Se esperaba la palabra clave "${lexeme}"`);
        throw new Error("ParserError");
    }

    private matchOps(lexemes: string[]): boolean {
        for (const lex of lexemes) {
            if (this.checkOp(lex)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private matchOp(lexeme: string): boolean {
        if (this.checkOp(lexeme)) {
            this.advance();
            return true;
        }
        return false;
    }

    private checkOp(lexeme: string): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        return token.type === TokenType.OPERATOR && token.lexeme === lexeme;
    }

    private consumeOp(lexeme: string, message: string): Token {
        if (this.checkOp(lexeme)) return this.advance();
        this.error(message);
        throw new Error("ParserError");
    }

    private matchDelim(lexeme: string): boolean {
        if (this.checkDelim(lexeme)) {
            this.advance();
            return true;
        }
        return false;
    }

    private checkDelim(lexeme: string): boolean {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        return token.type === TokenType.DELIMITER && token.lexeme === lexeme;
    }

    private consumeDelim(lexeme: string, message: string): Token {
        if (this.checkDelim(lexeme)) return this.advance();
        this.error(message);
        throw new Error("ParserError");
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        this.error(message);
        throw new Error("ParserError");
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.currentIdx++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.currentIdx >= this.tokens.length || this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.currentIdx];
    }

    private previous(): Token {
        return this.tokens[this.currentIdx - 1];
    }

    private error(message: string): void {
        const token = this.peek();
        this.errors.push({
            type: ErrorType.SYNTAX,
            message,
            line: token ? token.line : 1,
            column: token ? token.column : 1
        });
    }
}
