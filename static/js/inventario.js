// Función para el sidebar (debe estar fuera)
function toggleFiltros() {
    const sidebar = document.getElementById('sidebar-filtros');
    const main = document.getElementById('main-content');
    if (sidebar) sidebar.classList.toggle('active');
    if (main) main.classList.toggle('sidebar-active');
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector("input[name='q']");

    // --- ELEMENTOS DEL RANGO DE STOCK ---
    const stockMin = document.getElementById("stockMin");
    const stockMax = document.getElementById("stockMax");
    const numMin = document.getElementById("numMin");
    const numMax = document.getElementById("numMax");
    const rangoTexto = document.getElementById("rangoTexto");
    const btnLimpiar = document.getElementById("btnLimpiar");

    const rows = document.querySelectorAll("#tabla-inventario tbody tr:not(.empty-row)");

    // --- SELECCIÓN MASIVA (Mantenemos tu lógica) ---
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.checkbox-producto');
    const btnMasivo = document.getElementById('btn-eliminar-masivo');
    const countSpan = document.getElementById('count-seleccionados');

    function actualizarBotón() {
        const seleccionados = document.querySelectorAll('.checkbox-producto:checked').length;
        if (seleccionados > 0) {
            btnMasivo.classList.remove('d-none');
            countSpan.textContent = seleccionados;
        } else {
            btnMasivo.classList.add('d-none');
            if (selectAll) selectAll.checked = false;
        }
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            if (cb.checked) row.classList.add('fila-seleccionada');
            else row.classList.remove('fila-seleccionada');
        });
    }

    if (selectAll) {
        selectAll.addEventListener('change', function () {
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
            actualizarBotón();
        });
    }
    checkboxes.forEach(cb => cb.addEventListener('change', actualizarBotón));

    // --- LÓGICA DE SINCRONIZACIÓN Y FILTRADO ---
    function sincronizarYAplicar(origen, destino) {
        destino.value = origen.value;

        let vMin = parseInt(stockMin.value);
        let vMax = parseInt(stockMax.value);

        // Validar que min no supere a max
        if (vMin > vMax) {
            if (origen === stockMin || origen === numMin) {
                stockMax.value = origen.value;
                numMax.value = origen.value;
            } else {
                stockMin.value = origen.value;
                numMin.value = origen.value;
            }
        }

        if (rangoTexto) {
            rangoTexto.innerText = `${stockMin.value} y ${stockMax.value}`;
        }
        aplicarFiltros();
    }

    // Eventos para Sincronizar Sliders con Números
    if (stockMin && numMin) {
        stockMin.addEventListener("input", () => sincronizarYAplicar(stockMin, numMin));
        numMin.addEventListener("input", () => sincronizarYAplicar(numMin, stockMin));
    }
    if (stockMax && numMax) {
        stockMax.addEventListener("input", () => sincronizarYAplicar(stockMax, numMax));
        numMax.addEventListener("input", () => sincronizarYAplicar(numMax, stockMax));
    }

    // Resetear visualmente al hacer clic en limpiar
    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            if (stockMin) stockMin.value = 0;
            if (numMin) numMin.value = 0;
            if (stockMax) stockMax.value = 800;
            if (numMax) numMax.value = 800;
        });
    }

    // --- FUNCIÓN FILTRAR (CORREGIDA) ---
    function aplicarFiltros() {
        const term = searchInput.value.toLowerCase().trim();
        const minLimit = parseInt(stockMin.value) || 0;
        const maxLimit = parseInt(stockMax.value) || 0;

        rows.forEach(row => {
            const contenidoFila = row.textContent.toLowerCase();
            const stockElement = row.querySelector(".stock-number");
            const stock = stockElement ? parseInt(stockElement.innerText) : 0;

            const coincideTexto = term === "" || contenidoFila.includes(term);
            const coincideStock = (stock >= minLimit && stock <= maxLimit);

            row.style.display = (coincideTexto && coincideStock) ? "" : "none";
        });
    }

    if (searchInput) searchInput.addEventListener("input", aplicarFiltros);


    // --- ORDENACIÓN VISUAL MEJORADA ---
    document.querySelectorAll(".sortable").forEach((header) => {
        header.addEventListener("click", () => {
            const tbody = header.closest("table").querySelector("tbody");
            const rowsArray = Array.from(tbody.querySelectorAll("tr:not(.empty-row)"));
            const index = Array.from(header.parentElement.children).indexOf(header);

            const isAsc = header.classList.contains("asc");
            header.parentElement.querySelectorAll('.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            header.classList.add(isAsc ? "desc" : "asc");

            rowsArray.sort((a, b) => {
                let valA, valB;
                const stockA = a.querySelector('.stock-number');
                const stockB = b.querySelector('.stock-number');

                // Si es la columna de Stock
                if ((header.innerText.toLowerCase().includes('stock')) && stockA && stockB) {
                    valA = parseInt(stockA.innerText);
                    valB = parseInt(stockB.innerText);
                }
                // Si es la columna de ID
                else if (header.innerText.includes('#') || header.innerText.toLowerCase().includes('id')) {
                    valA = parseInt(a.cells[index].innerText.replace('#', '').trim());
                    valB = parseInt(b.cells[index].innerText.replace('#', '').trim());
                }
                // Texto (Nombre, Referencia, Registro)
                else {
                    valA = a.cells[index].innerText.trim().toLowerCase();
                    valB = b.cells[index].innerText.trim().toLowerCase();
                    return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return isAsc ? valA - valB : valB - valA;
            });
            rowsArray.forEach(tr => tbody.appendChild(tr));
        });
    });

    // --- MODAL EDITAR ---
    const contenedorFormEditar = document.getElementById('contenedor-form-editar');
    document.querySelectorAll('.btn-editar-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            const url = this.getAttribute('data-url');
            contenedorFormEditar.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-success"></div></div>';
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(response => response.text())
                .then(html => { contenedorFormEditar.innerHTML = html; })
                .catch(() => { contenedorFormEditar.innerHTML = '<div class="alert alert-danger m-3">Error al cargar.</div>'; });
        });
    });

    // --- AJUSTE DE STOCK ---
    const stockButtons = document.querySelectorAll('.btn-adjust-stock');
    function realizarAjuste(url, productId) {
        const csrftoken = getCookie('csrftoken');
        fetch(url, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken, 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then(response => response.json())
            .then(data => {
                if (data.stock_actual !== undefined) {
                    const valSpan = document.getElementById('stock-val-' + productId);
                    if (valSpan) valSpan.innerText = data.stock_actual;
                    const row = document.getElementById('producto-row-' + productId);
                    if (row) {
                        row.classList.remove('stokka-critico', 'stokka-aviso', 'stokka-ok');
                        row.classList.add('stokka-' + data.semaforo);
                    }
                }
            });
    }

    stockButtons.forEach(btn => {
        let timer, interval;
        const url = btn.dataset.url, pk = btn.dataset.pk;
        const start = (e) => {
            e.preventDefault();
            realizarAjuste(url, pk);
            timer = setTimeout(() => { interval = setInterval(() => realizarAjuste(url, pk), 150); }, 500);
        };
        const stop = () => { clearTimeout(timer); clearInterval(interval); };
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
        btn.addEventListener('touchstart', start);
        btn.addEventListener('touchend', stop);
    });

    // --- LÓGICA DE ELIMINACIÓN (CONEXIÓN MODALES) ---

    // 1. Eliminación Única: Asigna la URL correcta al form del modal
    const modalEliminarUnico = document.getElementById('modalEliminarUnico');
    if (modalEliminarUnico) {
        modalEliminarUnico.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const nombre = button.getAttribute('data-nombre');
            const url = button.getAttribute('data-url');
            
            document.getElementById('modalProductoNombre').textContent = nombre;
            document.getElementById('formEliminar').action = url;
        });
    }

    // 2. Eliminación Masiva: Rellena los IDs seleccionados
    const modalEliminarMasivo = document.getElementById('modalEliminarMasivo');
    if (modalEliminarMasivo) {
        modalEliminarMasivo.addEventListener('show.bs.modal', function () {
            const seleccionados = Array.from(document.querySelectorAll('.checkbox-producto:checked')).map(cb => cb.value);
            document.getElementById('input-ids-masivo').value = seleccionados.join(',');
        });
    }
});