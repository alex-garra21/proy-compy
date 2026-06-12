import { Token, TokenType, CompilerError, ErrorType } from "./types";

export class Scanner {
    private source: string = "";
    private tokens: Token[] = [];
    private errors: CompilerError[] = [];
    private currentIdx: number = 0;
    private line: number = 1;
    private column: number = 1;

    private static readonly KEYWORDS = new Set([
        "int", "float", "while", "if", "else", "return", "using", "namespace", "char", "double", "void", "bool"
    ]);

    tokenize(sourceCode: string): Token[] {
        this.source = sourceCode;
        this.tokens = [];
        this.errors = [];
        this.currentIdx = 0;
        this.line = 1;
        this.column = 1;

        while (!this.isAtEnd()) {
            const startLine = this.line;
            const startCol = this.column;
            const char = this.peek();

            // Ignorar espacios en blanco y manejar saltos de línea
            if (char === '\n') {
                this.advance();
                this.line++;
                this.column = 1;
                continue;
            }
            if (this.isWhitespace(char)) {
                this.advance();
                continue;
            }

            // Comentarios (Mini-C++ permite //)
            if (char === '/' && this.peekNext() === '/') {
                // Avanzar los dos slashes
                this.advance();
                this.advance();
                while (!this.isAtEnd() && this.peek() !== '\n') {
                    this.advance();
                }
                continue;
            }

            // Identificadores y Palabras Clave
            if (this.isAlpha(char) || char === '_') {
                this.scanIdentifier(startLine, startCol);
                continue;
            }

            // Números (Enteros y Flotantes simples)
            if (this.isDigit(char)) {
                this.scanNumber(startLine, startCol);
                continue;
            }

            // Cadenas de caracteres (Strings)
            if (char === '"') {
                this.scanString(startLine, startCol);
                continue;
            }

            // Operadores con prefijos comunes
            if (this.isOperatorOrDelimiterStart(char)) {
                this.scanOperatorsAndDelimiters(startLine, startCol);
                continue;
            }

            // Si llegamos aquí, el carácter es inválido/desconocido
            this.errors.push({
                type: ErrorType.LEXICAL,
                message: `Carácter no reconocido '${char}'`,
                line: startLine,
                column: startCol
            });
            this.tokens.push({
                type: TokenType.UNKNOWN,
                lexeme: char,
                line: startLine,
                column: startCol
            });
            this.advance();
        }

        // Token de fin de archivo
        this.tokens.push({
            type: TokenType.EOF,
            lexeme: "",
            line: this.line,
            column: this.column
        });

        return this.tokens;
    }

    getErrors(): CompilerError[] {
        return this.errors;
    }

    private scanIdentifier(startLine: number, startCol: number) {
        let lexeme = "";
        while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
            lexeme += this.advance();
        }

        const type = Scanner.KEYWORDS.has(lexeme) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        this.tokens.push({ type, lexeme, line: startLine, column: startCol });
    }

    private scanNumber(startLine: number, startCol: number) {
        let lexeme = "";
        while (!this.isAtEnd() && this.isDigit(this.peek())) {
            lexeme += this.advance();
        }

        // Manejar punto decimal para flotantes
        if (!this.isAtEnd() && this.peek() === '.' && this.isDigit(this.peekNext())) {
            lexeme += this.advance(); // consume '.'
            while (!this.isAtEnd() && this.isDigit(this.peek())) {
                lexeme += this.advance();
            }
        }

        this.tokens.push({
            type: TokenType.NUMERIC_LITERAL,
            lexeme,
            line: startLine,
            column: startCol
        });
    }

    private scanString(startLine: number, startCol: number) {
        this.advance(); // Consumir comilla de apertura '"'
        let lexeme = "\"";

        while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== '\n') {
            lexeme += this.advance();
        }

        if (this.isAtEnd() || this.peek() === '\n') {
            this.errors.push({
                type: ErrorType.LEXICAL,
                message: "Cadena de caracteres no cerrada",
                line: startLine,
                column: startCol
            });
            this.tokens.push({
                type: TokenType.UNKNOWN,
                lexeme: lexeme,
                line: startLine,
                column: startCol
            });
            return;
        }

        lexeme += this.advance(); // Consumir comilla de cierre '"'
        this.tokens.push({
            type: TokenType.STRING_LITERAL,
            lexeme,
            line: startLine,
            column: startCol
        });
    }

    private scanOperatorsAndDelimiters(startLine: number, startCol: number) {
        const char = this.advance();
        let lexeme = char;

        // Lógica de prefijo común (operadores compuestos)
        if (char === '=') {
            if (this.match('=')) lexeme = "==";
        } else if (char === '<') {
            if (this.match('=')) lexeme = "<=";
            else if (this.match('<')) lexeme = "<<";
        } else if (char === '>') {
            if (this.match('=')) lexeme = ">=";
            else if (this.match('>')) lexeme = ">>";
        } else if (char === '!') {
            if (this.match('=')) lexeme = "!=";
        } else if (char === '&') {
            if (this.match('&')) lexeme = "&&";
        } else if (char === '|') {
            if (this.match('|')) lexeme = "||";
        } else if (char === '+') {
            if (this.match('+')) lexeme = "++";
        } else if (char === '-') {
            if (this.match('-')) lexeme = "--";
        }

        const isOperator = ["+", "-", "*", "/", "%", "=", "==", "<", "<=", "<<", ">", ">=", ">>", "!", "!=", "&&", "||", "++", "--"].includes(lexeme);
        const type = isOperator ? TokenType.OPERATOR : TokenType.DELIMITER;

        this.tokens.push({
            type,
            lexeme,
            line: startLine,
            column: startCol
        });
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) return false;
        if (this.source[this.currentIdx] !== expected) return false;
        this.advance();
        return true;
    }

    private peek(): string {
        if (this.isAtEnd()) return '\0';
        return this.source[this.currentIdx];
    }

    private peekNext(): string {
        if (this.currentIdx + 1 >= this.source.length) return '\0';
        return this.source[this.currentIdx + 1];
    }

    private advance(): string {
        const char = this.source[this.currentIdx++];
        this.column++;
        return char;
    }

    private isAtEnd(): boolean {
        return this.currentIdx >= this.source.length;
    }

    private isWhitespace(char: string): boolean {
        return char === ' ' || char === '\r' || char === '\t';
    }

    private isAlpha(char: string): boolean {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private isOperatorOrDelimiterStart(char: string): boolean {
        const opsAndDelims = "+-*/%!=<>&|{}()[];,.:";
        return opsAndDelims.includes(char);
    }
}
