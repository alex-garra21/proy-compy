import { Token, CompilerError, SymbolTableEntry } from "../compiler/types";
import { ASTNode } from "../compiler/parser";

export function renderTokens(tokens: Token[]): void {
    const tableBody = document.querySelector("#tokens-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    let index = 1;
    tokens.forEach(token => {
        if (token.type === "EOF" && token.lexeme === "") return;
        
        const row = document.createElement("tr");
        
        const numCell = document.createElement("td");
        numCell.textContent = index.toString();
        
        const lexemeCell = document.createElement("td");
        lexemeCell.textContent = token.lexeme;
        
        const typeCell = document.createElement("td");
        typeCell.textContent = token.type;
        
        const lineCell = document.createElement("td");
        lineCell.textContent = token.line.toString();
        
        const colCell = document.createElement("td");
        colCell.textContent = token.column.toString();
        
        row.appendChild(numCell);
        row.appendChild(lexemeCell);
        row.appendChild(typeCell);
        row.appendChild(lineCell);
        row.appendChild(colCell);
        
        tableBody.appendChild(row);
        index++;
    });
}

export function renderErrors(errors: CompilerError[]): void {
    const problemsContent = document.getElementById("problems-content");
    if (!problemsContent) return;

    problemsContent.innerHTML = "";

    if (errors.length === 0) {
        const successMessage = document.createElement("div");
        successMessage.className = "info-text";
        successMessage.textContent = "ℹ No se encontraron problemas en el código fuente.";
        problemsContent.appendChild(successMessage);
        return;
    }

    errors.forEach(err => {
        const errorDiv = document.createElement("div");
        
        // Pinta según el tipo de error
        if (err.type === "LEXICAL") {
            errorDiv.className = "error-text";
            errorDiv.textContent = `✖ [Línea ${err.line}, Col ${err.column}] Error Léxico: ${err.message}`;
        } else if (err.type === "SYNTAX") {
            errorDiv.className = "error-text";
            errorDiv.textContent = `✖ [Línea ${err.line}, Col ${err.column}] Error Sintáctico: ${err.message}`;
        } else if (err.type === "SEMANTIC") {
            errorDiv.className = "warning-text"; // Usamos amarillo/naranja para semántico para diferenciarlos
            errorDiv.textContent = `⚠ [Línea ${err.line}, Col ${err.column}] Error Semántico: ${err.message}`;
        }
        
        problemsContent.appendChild(errorDiv);
    });
}

export function renderSymbolTable(entries: SymbolTableEntry[]): void {
    const tableBody = document.querySelector("#symbols-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    entries.forEach(entry => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = entry.identifier;

        const typeCell = document.createElement("td");
        typeCell.textContent = entry.dataType;

        const scopeCell = document.createElement("td");
        scopeCell.textContent = entry.scope;

        const memCell = document.createElement("td");
        memCell.textContent = entry.memoryPosition;

        row.appendChild(nameCell);
        row.appendChild(typeCell);
        row.appendChild(scopeCell);
        row.appendChild(memCell);

        tableBody.appendChild(row);
    });
}

export function renderAST(root: ASTNode | null): void {
    const syntaxContent = document.getElementById("syntax-tree-content");
    if (!syntaxContent) return;

    if (!root) {
        syntaxContent.textContent = "No hay un AST disponible (errores de compilación o código vacío).";
        return;
    }

    // Dibujar el árbol sintáctico usando recursión y formato de ramas sutiles
    syntaxContent.textContent = printASTTree(root, "", true);
}

function printASTTree(node: ASTNode, prefix: string, isLast: boolean): string {
    let result = prefix;
    
    // Conectores visuales estilo árbol de archivos
    result += isLast ? "└── " : "├── ";
    
    // Mostrar el tipo y opcionalmente el valor del nodo
    result += node.type + (node.value !== undefined ? `: "${node.value}"` : "") + "\n";
    
    const newPrefix = prefix + (isLast ? "    " : "│   ");
    for (let i = 0; i < node.children.length; i++) {
        result += printASTTree(node.children[i], newPrefix, i === node.children.length - 1);
    }
    
    return result;
}
