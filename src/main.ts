import "./styles.css";
import { Scanner } from "./compiler/scanner";
import { Parser } from "./compiler/parser";
import { SymbolTable } from "./compiler/symbolTable";
import { renderTokens, renderErrors, renderSymbolTable, renderAST } from "./ui/domManager";
import { CompilerError } from "./compiler/types";

// Inicializar componentes del compilador
const scanner = new Scanner();
const parser = new Parser();
const symbolTable = new SymbolTable();

// Referencias a elementos del DOM
const codeEditor = document.getElementById("code-editor") as HTMLTextAreaElement | null;
const lineNumbers = document.getElementById("line-numbers") as HTMLDivElement | null;
const panelTabs = document.querySelectorAll(".panel-tab");

// Referencias a los botones de la barra de herramientas
const btnEjemplo1 = document.getElementById("btn-ejemplo1");
const btnEjemplo2 = document.getElementById("btn-ejemplo2");
const btnLimpiar = document.getElementById("btn-limpiar");

// Configurar pestañas inferiores del panel
panelTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute("data-target");
        if (!target) return;

        // Ocultar todos los paneles
        document.querySelectorAll('.panel-content').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Quitar clase activa de todas las pestañas
        panelTabs.forEach(t => t.classList.remove('active'));

        // Mostrar panel seleccionado y activar pestaña
        const panelToShow = document.getElementById(`${target}-panel`);
        if (panelToShow) {
            panelToShow.classList.remove('hidden');
        }
        (e.currentTarget as HTMLElement).classList.add('active');
    });
});

// Función para sincronizar números de línea
function updateLineNumbers() {
    if (!codeEditor || !lineNumbers) return;
    const lines = codeEditor.value.split('\n').length;
    let numbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        numbersHtml += i + '<br>';
    }
    lineNumbers.innerHTML = numbersHtml;
}

// Sincronizar scroll de números de línea
if (codeEditor && lineNumbers) {
    codeEditor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = codeEditor.scrollTop;
    });
}

// Lógica de Compilación y Análisis reactivo con Debounce
let debounceTimer: number | undefined;

function runCompilerPipeline() {
    if (!codeEditor) return;
    const code = codeEditor.value;

    // 1. Limpiar Tabla de Símbolos en cada ejecución reactiva
    symbolTable.clear();

    // 2. Análisis Léxico (Scanner)
    const tokens = scanner.tokenize(code);
    const lexicalErrors = scanner.getErrors();

    // 3. Análisis Sintáctico y Semántico (Parser)
    const { ast, errors: parserAndSemanticErrors } = parser.parse(tokens, symbolTable);

    // 4. Agrupar todos los errores
    const allErrors: CompilerError[] = [...lexicalErrors, ...parserAndSemanticErrors];

    // 5. Renderizar resultados en las pestañas del DOM en tiempo real
    renderTokens(tokens);
    renderErrors(allErrors);
    renderSymbolTable(symbolTable.getAllEntries());
    renderAST(ast);
}

function handleEditorInput() {
    updateLineNumbers();

    // Debounce
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
        runCompilerPipeline();
    }, 300);
}

// Vincular eventos del editor
if (codeEditor) {
    codeEditor.addEventListener("input", handleEditorInput);
}

// --- Lógica de Carga y Limpieza (Toolbar) ---

async function cargarTextoPlano(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error al cargar el archivo en ${url}`);
    }
    return await response.text();
}

btnEjemplo1?.addEventListener("click", async () => {
    try {
        const texto = await cargarTextoPlano("/ejemplo1.txt");
        if (codeEditor) {
            codeEditor.value = texto;
            updateLineNumbers();
            runCompilerPipeline();
        }
    } catch (e) {
        console.error(e);
    }
});

btnEjemplo2?.addEventListener("click", async () => {
    try {
        const texto = await cargarTextoPlano("/ejemplo2.txt");
        if (codeEditor) {
            codeEditor.value = texto;
            updateLineNumbers();
            runCompilerPipeline();
        }
    } catch (e) {
        console.error(e);
    }
});

btnLimpiar?.addEventListener("click", () => {
    if (codeEditor) {
        codeEditor.value = "";
        updateLineNumbers();
    }
    symbolTable.clear();
    renderTokens([]);
    renderErrors([]);
    renderSymbolTable([]);
    renderAST(null);
});

// Inicialización de la UI
updateLineNumbers();
runCompilerPipeline();
