// Esta función debe estar fuera o ser accesible globalmente
function toggleFiltros() {
    const sidebar = document.getElementById('sidebar-filtros');
    const main = document.getElementById('main-content');
    if (sidebar) sidebar.classList.toggle('active');
    if (main) main.classList.toggle('sidebar-active');
}

// Función auxiliar para obtener el CSRF Token
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
            selectAll.checked = false;
        }
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            if (cb.checked) {
                row.classList.add('fila-seleccionada');
            } else {
                row.classList.remove('fila-seleccionada');
            }
        });
    }

    // Seleccionar/Deseleccionar todos
    selectAll.addEventListener('change', function () {
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
        actualizarBotón();
    });

    // Evento para cada checkbox individual
    checkboxes.forEach(cb => {
        cb.addEventListener('change', actualizarBotón);
    });

    // --- FILTROS UNIFICADOS ---
    function aplicarFiltros() {
        const term = searchInput.value.toLowerCase();
        const limit = parseInt(stockSlider.value);
        if (valueLabel) valueLabel.innerText = limit;

        rows.forEach(row => {
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
    document.querySelectorAll(".sortable").forEach((header) => {
        header.addEventListener("click", () => {
            const tbody = header.closest("table").querySelector("tbody");
            const rowsArray = Array.from(tbody.querySelectorAll("tr:not(.empty-row)"));
            const index = Array.from(header.parentElement.children).indexOf(header);

            // Alternar estado
            const isAsc = header.classList.contains("asc");
            header.parentElement.querySelectorAll('.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            header.classList.add(isAsc ? "desc" : "asc");

            rowsArray.sort((a, b) => {
                let valA, valB;

                // --- LÓGICA ESPECIAL PARA STOCK ---
                // Si la columna es la de stock (usualmente la 4 o 5, buscamos por clase mejor)
                const stockA = a.querySelector('.stock-number');
                const stockB = b.querySelector('.stock-number');

                // Si estamos pulsando en la columna que contiene el stock
                if (header.innerText.toLowerCase().includes('stock') && stockA && stockB) {
                    valA = parseInt(stockA.innerText);
                    valB = parseInt(stockB.innerText);
                }
                // --- LÓGICA PARA ID (#) ---
                else if (header.innerText.toLowerCase().includes('id') || header.innerText.includes('#')) {
                    valA = parseInt(a.cells[index].innerText.replace('#', '').trim());
                    valB = parseInt(b.cells[index].innerText.replace('#', '').trim());
                }
                // --- LÓGICA PARA TEXTO (Nombre, Ref) ---
                else {
                    valA = a.cells[index].innerText.trim().toLowerCase();
                    valB = b.cells[index].innerText.trim().toLowerCase();
                    return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }

                // Comparación numérica (para ID y Stock)
                return isAsc ? valA - valB : valB - valA;
            });

            rowsArray.forEach(tr => tbody.appendChild(tr));
        });
    });

    // --- MODAL DE ELIMINACIÓN ---
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

    // --- LÓGICA PARA CARGAR EL MODAL DE EDICIÓN ---
    const contenedorFormEditar = document.getElementById('contenedor-form-editar');
    document.querySelectorAll('.btn-editar-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            const url = this.getAttribute('data-url');

            contenedorFormEditar.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-success"></div></div>';

            fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(response => response.text())
                .then(html => {
                    contenedorFormEditar.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error:', error);
                    contenedorFormEditar.innerHTML = '<div class="alert alert-danger m-3">Error al cargar el formulario.</div>';
                });
        });
    });

    // --- CONTROL DE STOCK CONTINUO ---
    const stockButtons = document.querySelectorAll('.btn-adjust-stock');

    function realizarAjuste(url, productId) {
        const csrftoken = getCookie('csrftoken');
        if (!csrftoken) return;

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
                    const valSpan = document.getElementById('stock-val-' + productId);
                    if (valSpan) valSpan.innerText = data.stock_actual;

                    const row = document.getElementById('producto-row-' + productId);
                    if (row) {
                        row.classList.remove('stokka-critico', 'stokka-aviso', 'stokka-ok');
                        if (data.semaforo === 'critico') row.classList.add('stokka-critico');
                        else if (data.semaforo === 'aviso') row.classList.add('stokka-aviso');
                        else row.classList.add('stokka-ok');
                    }
                }
            })
            .catch(error => console.error('Error al actualizar stock:', error));
    }

    stockButtons.forEach(btn => {
        let timer;
        let interval;
        const url = btn.dataset.url;
        const pk = btn.dataset.pk;

        const start = (e) => {
            e.preventDefault();
            realizarAjuste(url, pk);
            timer = setTimeout(() => {
                interval = setInterval(() => realizarAjuste(url, pk), 150);
            }, 500);
        };

        const stop = () => { clearTimeout(timer); clearInterval(interval); };

        btn.addEventListener('click', (e) => e.preventDefault());
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
        btn.addEventListener('touchstart', start);
        btn.addEventListener('touchend', stop);
    });
});

document.getElementById('formEliminarMasivo').addEventListener('submit', function (e) {
    const seleccionados = Array.from(document.querySelectorAll('.checkbox-producto:checked'))
        .map(cb => cb.value);
    document.getElementById('input-ids-masivo').value = seleccionados.join(',');
});