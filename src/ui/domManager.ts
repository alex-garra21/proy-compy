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
        
        if (err.type === "LEXICAL") {
            errorDiv.className = "error-text";
            errorDiv.textContent = `✖ [Línea ${err.line}, Col ${err.column}] Error Léxico: ${err.message}`;
        } else if (err.type === "SYNTAX") {
            errorDiv.className = "error-text";
            errorDiv.textContent = `✖ [Línea ${err.line}, Col ${err.column}] Error Sintáctico: ${err.message}`;
        } else if (err.type === "SEMANTIC") {
            errorDiv.className = "warning-text";
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

/**
 * Renderiza el Árbol Sintáctico Abstracto (AST) de forma gráfica interactiva en el DOM
 */
export function renderAST(root: ASTNode | null): void {
    const container = document.getElementById("syntax-tree-content");
    if (!container) return;

    container.innerHTML = "";

    if (!root) {
        container.textContent = "No hay un AST disponible (errores de compilación o código vacío).";
        return;
    }

    const treeRoot = document.createElement("ul");
    treeRoot.appendChild(createNodeElement(root));
    container.appendChild(treeRoot);
}

function createNodeElement(node: ASTNode): HTMLLIElement {
    const li = document.createElement("li");
    const card = document.createElement("div");
    card.className = "ast-node";
    
    // Determinar clase de color según el tipo de nodo
    let typeClass = "node-general";
    const type = node.type.toLowerCase();
    
    if (type.includes("program")) {
        typeClass = "node-program";
    } else if (type.includes("function")) {
        typeClass = "node-function";
    } else if (type.includes("declaration") || type.includes("variable")) {
        typeClass = "node-variable";
    } else if (type.includes("stmt") || type.includes("statement") || type.includes("block") || type.includes("if") || type.includes("while") || type.includes("return")) {
        typeClass = "node-statement";
    } else if (type.includes("expression") || type.includes("binary") || type.includes("initializer")) {
        typeClass = "node-expression";
    } else if (type.includes("literal")) {
        typeClass = "node-literal";
    } else if (type.includes("identifier")) {
        typeClass = "node-identifier";
    }
    card.classList.add(typeClass);

    // Tipo de nodo
    const typeSpan = document.createElement("span");
    typeSpan.className = "node-type";
    typeSpan.textContent = node.type;
    card.appendChild(typeSpan);

    // Valor secundario del lexema si existe
    if (node.value !== undefined) {
        const valSpan = document.createElement("span");
        valSpan.className = "node-value";
        valSpan.textContent = `"${node.value}"`;
        card.appendChild(valSpan);
    }

    li.appendChild(card);

    // Renderizar hijos recursivamente
    if (node.children && node.children.length > 0) {
        const ul = document.createElement("ul");
        node.children.forEach(child => {
            ul.appendChild(createNodeElement(child));
        });
        li.appendChild(ul);
    }

    return li;
}
