// ==========================================================================
// 1. CONTROL DE INTERFAZ GENERAL (MENÚ MÓVIL Y ANIMACIONES)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, mirror: false });
    }
});

const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => { mobileMenu.classList.add('hidden'); });
    });
}

// ==========================================================================
// 2. SISTEMA DEL DISEÑADOR DE MARCHA (CONFIGURACIÓN Y ESTADOS)
// ==========================================================================
const ESCUADRAS_CONFIG = {
    'R': { nombre: 'REDOBLANTES', color: '#00ffff', texto: '#000000' },
    'G': { nombre: 'GÜIROS', color: '#ff0000', texto: '#ffffff' },
    'L': { nombre: 'LIRAS', color: '#800080', texto: '#ffffff' },
    'C': { nombre: 'CUEROS', color: '#ffa500', texto: '#000000' },
    'T': { nombre: 'TAROLAS', color: '#008000', texto: '#ffffff' },
    'B': { nombre: 'BOMBOS', color: '#000000', texto: '#ffffff' },
    'P': { nombre: 'PLATILLOS', color: '#ffc0cb', texto: '#000000' }
};

let totalPagesData = [{ id: 1, title: 'FIGURA INICIAL', cells: {} }];
let currentPageIndex = 0;
let isIndividualCleanMode = false;
let isDrawing = false; // Estado para rastrear si el usuario está presionando el click

const ROWS = 24;
const COLS = 30;

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const escuadraSelect = document.getElementById('escuadra-select');
const previewBox = document.getElementById('preview-box');
const previewName = document.getElementById('preview-name');
const canvasStatus = document.getElementById('canvas-status');
const pageIndicator = document.getElementById('page-indicator');
const pageTitleIndicator = document.getElementById('page-title-indicator');
const gridContainer = document.getElementById('grid-container');
const btnCleanIndividual = document.getElementById('btn-clean-individual');
const btnCleanAll = document.getElementById('btn-clean-all');
const btnSavePage = document.getElementById('btn-save-page');
const btnNewPage = document.getElementById('btn-new-page');
const btnDeletePage = document.getElementById('btn-delete-page');
const btnExportPdf = document.getElementById('btn-export-pdf');
const logoutBtn = document.getElementById('logout-btn');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value;
        if ((user === "admin" && pass === "saba2026") || (user === "banda" && pass === "bis2026")) {
            loginScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            initSystem();
        } else {
            loginError.classList.remove('hidden');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        appScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginForm.reset();
        loginError.classList.add('hidden');
    });
}

function initSystem() {
    if (!gridContainer) return;
    updatePalettePreview();
    renderGridCanvas();
    updatePageMetaVisuals();
}

if (escuadraSelect) {
    escuadraSelect.addEventListener('change', () => {
        if (isIndividualCleanMode) toggleIndividualCleanMode(false);
        updatePalettePreview();
    });
}

function updatePalettePreview() {
    if (!escuadraSelect || !previewBox || !previewName) return;
    const val = escuadraSelect.value;
    const conf = ESCUADRAS_CONFIG[val];
    previewBox.textContent = val;
    previewBox.style.backgroundColor = conf.color;
    previewBox.style.color = conf.texto;
    previewName.textContent = conf.nombre;
}

if (btnCleanIndividual) {
    btnCleanIndividual.addEventListener('click', () => { toggleIndividualCleanMode(!isIndividualCleanMode); });
}

function toggleIndividualCleanMode(activate) {
    isIndividualCleanMode = activate;
    if (!canvasStatus || !btnCleanIndividual) return;
    if (isIndividualCleanMode) {
        canvasStatus.textContent = "Modo: Borrar Individual";
        canvasStatus.className = "text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold";
        btnCleanIndividual.innerHTML = `<i class="fa-solid fa-circle-dot text-sm animate-ping"></i> Cancelar Limpieza`;
    } else {
        canvasStatus.textContent = "Modo: Colocar Fichas";
        canvasStatus.className = "text-[11px] bg-blue-50 text-[#0033ff] px-2 py-0.5 rounded-md font-bold";
        btnCleanIndividual.innerHTML = `<i class="fa-solid fa-eraser text-sm"></i> Limpiar Individual (Desactivado)`;
    }
}

// Manejo global del arrastre del mouse para pintar fluido
window.addEventListener('mousedown', () => { isDrawing = true; });
window.addEventListener('mouseup', () => { isDrawing = false; });

function handleCellInteraction(cellElement, cellKey) {
    const activePage = totalPagesData[currentPageIndex];
    if (isIndividualCleanMode) {
        delete activePage.cells[cellKey];
        cellElement.textContent = '';
        cellElement.style.backgroundColor = '#ffffff';
    } else {
        const selectedSquad = escuadraSelect.value;
        activePage.cells[cellKey] = selectedSquad;
        applyCellColor(cellElement, selectedSquad);
    }
}

function renderGridCanvas() {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    const activePageData = totalPagesData[currentPageIndex].cells;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellKey = `${r}-${c}`;
            const cellElement = document.createElement('div');
            cellElement.classList.add('grid-cell', 'border', 'border-slate-200', 'select-none');
            
            if (activePageData[cellKey]) applyCellColor(cellElement, activePageData[cellKey]);

            // Evento Click Clásico
            cellElement.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handleCellInteraction(cellElement, cellKey);
            });

            // Evento Arrastrar (Pintado continuo)
            cellElement.addEventListener('mouseenter', () => {
                if (isDrawing) {
                    handleCellInteraction(cellElement, cellKey);
                }
            });

            // Soporte para pantallas táctiles (Móviles)
            cellElement.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('grid-cell') && target !== cellElement) {
                    // Simula interacción en el elemento tocado bajo el dedo
                    target.click(); 
                }
            });

            gridContainer.appendChild(cellElement);
        }
    }
}

function applyCellColor(element, squadLetter) {
    const conf = ESCUADRAS_CONFIG[squadLetter];
    if (conf) {
        element.textContent = squadLetter;
        element.style.backgroundColor = conf.color;
        element.style.color = conf.texto;
    }
}

function getPageTitleForIndex(index) {
    const ordinals = ["FIGURA INICIAL", "PRIMERA FIGURA", "SEGUNDA FIGURA", "TERCERA FIGURA", "CUARTA FIGURA", "QUINTA FIGURA"];
    return ordinals[index] || `FIGURA REALIZADA ${index + 1}`;
}

function updatePageMetaVisuals() {
    if (pageIndicator) pageIndicator.textContent = currentPageIndex + 1;
    if (pageTitleIndicator) pageTitleIndicator.textContent = totalPagesData[currentPageIndex].title;
}

if (btnPrevPage) { btnPrevPage.addEventListener('click', () => { if (currentPageIndex > 0) { currentPageIndex--; initSystem(); } }); }
if (btnNextPage) { btnNextPage.addEventListener('click', () => { if (currentPageIndex < totalPagesData.length - 1) { currentPageIndex++; initSystem(); } }); }
if (btnSavePage) { btnSavePage.addEventListener('click', () => { alert("¡Cambios guardados con éxito!"); }); }
if (btnCleanAll) { btnCleanAll.addEventListener('click', () => { if (confirm("¿Estás seguro de limpiar por completo esta figura?")) { totalPagesData[currentPageIndex].cells = {}; renderGridCanvas(); } }); }
if (btnNewPage) {
    btnNewPage.addEventListener('click', () => {
        totalPagesData.push({ id: totalPagesData.length + 1, title: getPageTitleForIndex(totalPagesData.length), cells: {} });
        currentPageIndex = totalPagesData.length - 1;
        initSystem();
    });
}
if (btnDeletePage) {
    btnDeletePage.addEventListener('click', () => {
        if (currentPageIndex === 0) return alert("No puedes borrar la Figura Inicial.");
        if (confirm("¿Eliminar por completo esta página?")) {
            totalPagesData.splice(currentPageIndex, 1);
            totalPagesData.forEach((p, idx) => p.title = getPageTitleForIndex(idx));
            currentPageIndex = totalPagesData.length - 1;
            initSystem();
        }
    });
}

// ==========================================================================
// RENDERIZADO DEL PDF MEDIANTE COORDENADAS DIRECTAS DE JSPDF (SIN IMAGENES)
// ==========================================================================
if (btnExportPdf) {
    btnExportPdf.addEventListener('click', async () => {
        const originalText = btnExportPdf.innerHTML;
        btnExportPdf.disabled = true;
        btnExportPdf.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> EXPORTANDO...`;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

            for (let i = 0; i < totalPagesData.length; i++) {
                const pageData = totalPagesData[i];
                if (i > 0) pdf.addPage('letter', 'portrait');

                // ---- MARCO Y FONDO BLANCO ----
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, 612, 792, 'F');

                // ---- TEXTOS DEL ENCABEZADO ----
                pdf.setTextColor(0, 0, 0);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(16);
                pdf.text("BANDA INDEPENDIENTE SABÁ", 306, 45, { align: "center" });

                // Subrayado decorativo de la banda (Azul y Amarillo)
                pdf.setFillColor(0, 150, 255);
                pdf.rect(140, 52, 332, 3, 'F');
                pdf.setFillColor(255, 220, 0);
                pdf.rect(140, 55, 332, 2, 'F');

                // Título dinámico de la figura (En Rojo)
                pdf.setTextColor(255, 0, 0);
                pdf.setFontSize(14);
                pdf.text(pageData.title, 306, 85, { align: "center" });

                // ---- MARCADORES DE DIRECCIÓN (INICIO / FINAL) ----
                pdf.setFontSize(10);
                pdf.setTextColor(230, 160, 0);
                pdf.text("O  FINAL  —>", 50, 180);
                pdf.text("<—  INICIO  O", 562, 740, { align: "right" });

                // ---- CUADRO DE SIMBOLOGÍA ----
                pdf.setDrawColor(0, 40, 120);
                pdf.setLineWidth(1.5);
                pdf.rect(35, 360, 95, 150, 'D'); 
                
                pdf.setFontSize(10);
                pdf.setTextColor(0, 40, 120);
                pdf.text("SIMBOLOGÍA", 82, 375, { align: "center" });

                let symY = 392;
                Object.keys(ESCUADRAS_CONFIG).forEach(key => {
                    const c = ESCUADRAS_CONFIG[key];
                    
                    // Asegurar color hexadecimal correcto para jsPDF
                    pdf.setFillColor(c.color);
                    pdf.rect(45, symY - 7, 10, 8, 'F');
                    
                    pdf.setFontSize(8);
                    // Colores de texto asignados dinámicamente según escuadra
                    if(key === 'R') pdf.setTextColor(0, 180, 180);
                    if(key === 'G') pdf.setTextColor(255, 0, 0);
                    if(key === 'L') pdf.setTextColor(128, 0, 128);
                    if(key === 'T') pdf.setTextColor(0, 128, 0);
                    if(key === 'C') pdf.setTextColor(220, 140, 0);
                    if(key === 'B') pdf.setTextColor(0, 0, 0);
                    if(key === 'P') pdf.setTextColor(240, 100, 150);

                    pdf.text(c.nombre, 62, symY);
                    symY += 16;
                });

                // ---- DIBUJAR LAS FICHAS EN LA MATRIZ TÁCTICA ----
                const startX = 155;
                const startY = 150;
                const cellW = 13.5; 
                const cellH = 22.5;

                // Dibujar un marco sutil alrededor del área táctica para dar guía visual en el PDF
                pdf.setDrawColor(220, 225, 230);
                pdf.setLineWidth(0.5);
                pdf.rect(startX, startY, COLS * cellW, ROWS * cellH, 'D');

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(9);

                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        const cellKey = `${r}-${c}`;
                        if (pageData.cells[cellKey]) {
                            const squad = pageData.cells[cellKey];
                            const conf = ESCUADRAS_CONFIG[squad];
                            
                            const posX = startX + (c * cellW);
                            const posY = startY + (r * cellH);

                            // Pintar fondo de la ficha táctica
                            pdf.setFillColor(conf.color);
                            pdf.rect(posX, posY, cellW - 0.5, cellH - 0.5, 'F');

                            // Escribir la letra del instrumento
                            pdf.setTextColor(conf.texto);
                            pdf.text(squad, posX + (cellW / 2), posY + (cellH / 2) + 3, { align: "center" });
                        }
                    }
                }
            }

            pdf.save(`Plan_De_Marcha_BIS_${Date.now()}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Ocurrió un inconveniente generando el reporte.");
        } finally {
            btnExportPdf.disabled = false;
            btnExportPdf.innerHTML = originalText;
        }
    });
}