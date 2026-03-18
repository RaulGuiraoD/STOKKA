// Esta función debe estar fuera o ser accesible globalmente
function toggleFiltros() {
    const sidebar = document.getElementById('sidebar-filtros');
    const main = document.getElementById('main-content');
    sidebar?.classList.toggle('active');
    main?.classList.toggle('sidebar-active');
}

// Función auxiliar para obtener el CSRF Token (necesario para fetch POST en Django)
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
    const stockSlider = document.getElementById("stockRange");
    const valueLabel = document.getElementById("stockValue");
    const rows = document.querySelectorAll("#tabla-inventario tbody tr:not(.empty-row)");

    // --- FILTROS UNIFICADOS ---
    function aplicarFiltros() {
        const term = searchInput.value.toLowerCase();
        const limit = parseInt(stockSlider.value);
        if (valueLabel) valueLabel.innerText = limit;

        rows.forEach(row => {
            // Buscamos en la celda 1 (Ref) y 2 (Nombre). Verificamos existencia de celdas.
            const ref = row.cells[1] ? row.cells[1].innerText.toLowerCase() : "";
            const nombre = row.cells[2] ? row.cells[2].innerText.toLowerCase() : "";
            const stockElement = row.querySelector(".stock-number");
            const stock = stockElement ? parseInt(stockElement.innerText) : 0;

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

    // --- CONTROL DE STOCK CONTINUO (CLICK & HOLD) ---
    const stockButtons = document.querySelectorAll('.btn-adjust-stock');

    // Función interna para realizar la petición
    function realizarAjuste(url, productId) {
        // 1. Obtenemos el token CSRF de las cookies. Esta es la parte CRÍTICA.
        const csrftoken = getCookie('csrftoken');

        // 2. Verificamos que el token exista. Si no, la petición POST fallará.
        if (!csrftoken) {
            console.error("Error de CSRF: No se encontró el token. Asegúrate de que las cookies están habilitadas en el navegador.");
            return; // Detenemos la función si no hay token.
        }
        
        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest'
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.stock_actual !== undefined) {
                // 3. Actualizar el número en la UI
                const valSpan = document.getElementById('stock-val-' + productId);
                if(valSpan) valSpan.innerText = data.stock_actual;
                
                // 4. Actualizar el color de la fila (semáforo)
                const row = document.getElementById('producto-row-' + productId);
                if(row) {
                    row.classList.remove('stokka-critico', 'stokka-aviso', 'stokka-ok');
                    if (data.semaforo === 'critico') row.classList.add('stokka-critico');
                    else if (data.semaforo === 'aviso') row.classList.add('stokka-aviso');
                    else row.classList.add('stokka-ok');
                }
            }
        })
        .catch(error => {
            console.error('Error al actualizar stock:', error);
            console.error('La petición a la URL', url, 'ha fallado. Revisa la respuesta del servidor en la pestaña "Red" de las herramientas de desarrollador del navegador.');
        });
    }

    stockButtons.forEach(btn => {
        let timer;
        let interval;
        const url = btn.dataset.url;
        const pk = btn.dataset.pk;

        const start = (e) => {
            e.preventDefault();
            realizarAjuste(url, pk); // Ejecutar inmediatamente al pulsar
            // Si se mantiene presionado 500ms, repetir cada 150ms
            timer = setTimeout(() => {
                interval = setInterval(() => realizarAjuste(url, pk), 150);
            }, 500);
        };

        const stop = () => { clearTimeout(timer); clearInterval(interval); };

        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
        // Soporte táctil
        btn.addEventListener('touchstart', start);
        btn.addEventListener('touchend', stop);
    });
});