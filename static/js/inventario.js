// Esta función debe estar fuera o ser accesible globalmente
function toggleFiltros() {
    const sidebar = document.getElementById('sidebar-filtros');
    const main = document.getElementById('main-content');
    if (sidebar) sidebar.classList.toggle('active');
    if (main) main.classList.toggle('sidebar-active');
}

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector("input[name='q']");
    const stockSlider = document.getElementById("stockRange");
    const valueLabel = document.getElementById("stockValue");
    const rows = document.querySelectorAll("#tabla-inventario tbody tr:not(.empty-row)");

    // --- FILTROS UNIFICADOS ---
    function aplicarFiltros() {
        const term = searchInput.value.toLowerCase();
        const limit = parseInt(stockSlider.value);
        if (valueLabel) valueLabel.innerText = limit;

        rows.forEach(row => {
            // Buscamos en la celda 1 (Ref) y 2 (Nombre)
            const ref = row.cells[1].innerText.toLowerCase();
            const nombre = row.cells[2].innerText.toLowerCase();
            const stock = parseInt(row.querySelector(".stock-number").innerText);

            const coincideTexto = nombre.includes(term) || ref.includes(term);
            const coincideStock = (limit === 0) || (stock <= limit);

            if (coincideTexto && coincideStock) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    if (searchInput) searchInput.addEventListener("input", aplicarFiltros);
    if (stockSlider) stockSlider.addEventListener("input", aplicarFiltros);

    // --- ORDENACIÓN VISUAL ---
    document.querySelectorAll(".sortable").forEach((header, index) => {
        header.addEventListener("click", () => {
            const tbody = header.closest("table").querySelector("tbody");
            const rowsArray = Array.from(tbody.querySelectorAll("tr"));
            const isAsc = header.classList.contains("asc");

            // Limpiar clases
            header.parentElement.querySelectorAll('.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            
            header.classList.add(isAsc ? "desc" : "asc");

            rowsArray.sort((a, b) => {
                const A = a.cells[index].innerText.trim();
                const B = b.cells[index].innerText.trim();
                return isAsc ? B.localeCompare(A, undefined, {numeric: true}) : 
                               A.localeCompare(B, undefined, {numeric: true});
            });

            rowsArray.forEach(tr => tbody.appendChild(tr));
        });
    });

    // --- MODAL DE ELIMINACIÓN INTELIGENTE ---
    const modalEliminar = document.getElementById('modalEliminarUnico');
    if (modalEliminar) {
        modalEliminar.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const nombre = button.getAttribute('data-nombre');
            const url = button.getAttribute('data-url');

            document.getElementById('modalProductoNombre').textContent = nombre;
            document.getElementById('formEliminar').setAttribute('action', url);
        });
    }
});