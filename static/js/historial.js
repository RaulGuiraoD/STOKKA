document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById('filtro-historial');
    const tableRows = document.querySelectorAll('#tabla-historial tbody tr');

    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const query = e.target.value.toLowerCase();

            tableRows.forEach(row => {
                // Buscamos en toda la fila para que sea flexible (producto o usuario)
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    /* CALENDARIO */
    const inputSearch = document.getElementById('filtro-historial');
    const inputDate = document.getElementById('busqueda-fecha');

    if (!inputSearch || !inputDate) return;

    /* ── CERRAR TODOS LOS ACORDEONES AL ENTRAR ── */
    document.querySelectorAll('#accordionHistorial .accordion-collapse.show').forEach(collapse => {
        collapse.classList.remove('show');
    });
    document.querySelectorAll('#accordionHistorial .accordion-button').forEach(btn => {
        btn.classList.add('collapsed');
    });

    /* ── FILTRADO (Actualizado para ocultar/mostrar filas de detalle también) ── */
    function aplicarFiltros() {
        const term = inputSearch.value.toLowerCase().trim();
        const dateVal = inputDate.value;
        const accordionItems = document.querySelectorAll('.accordion-item');

        accordionItems.forEach(item => {
            const rows = item.querySelectorAll('.fila-movimiento');
            let hasVisibleRows = false;

            rows.forEach(row => {
                const rowText = row.textContent.toLowerCase();
                const rowDate = row.dataset.fecha;
                const detailRow = row.nextElementSibling; // La fila .fila-detalle

                const matchText = term === "" || rowText.includes(term);
                const matchDate = !dateVal || rowDate === dateVal;

                if (matchText && matchDate) {
                    row.style.setProperty("display", "", "important");
                    if (detailRow && detailRow.classList.contains('fila-detalle')) {
                        detailRow.style.setProperty("display", "", "important");
                    }
                    hasVisibleRows = true;
                } else {
                    row.style.setProperty("display", "none", "important");
                    if (detailRow && detailRow.classList.contains('fila-detalle')) {
                        detailRow.style.setProperty("display", "none", "important");
                    }
                }
            });

            // Lógica de apertura automática del acordeón de fecha si hay búsqueda
            if (hasVisibleRows) {
                item.style.display = "";
                if (term !== "" || dateVal !== "") {
                    const collapse = item.querySelector('.accordion-collapse');
                    if (collapse && !collapse.classList.contains('show')) {
                        new bootstrap.Collapse(collapse, { show: true });
                    }
                }
            } else {
                item.style.display = "none";
            }
        });
    }

    inputSearch.addEventListener("input", aplicarFiltros);
    inputDate.addEventListener("change", aplicarFiltros);

    /* ── INYECCIÓN DEL PANEL, CHEVRON Y DETALLES MÓVILES ── */
    document.querySelectorAll('#tabla-historial tbody tr.fila-movimiento').forEach(row => {
        // 1. Inyectar Chevron
        const tdProducto = row.querySelector('td[data-label="PRODUCTO"]');
        if (tdProducto) {
            const chevron = document.createElement('i');
            chevron.className = 'fa-solid fa-angle-down chevron-mobile';
            tdProducto.appendChild(chevron);
        }

        // 2. Obtener datos para el panel móvil
        const tdUsuario = row.querySelector('td[data-label="USUARIO"]');
        const tdMov = row.querySelector('td[data-label="MOVIMIENTO"]');

        // Buscamos los detalles en la fila siguiente (solo escritorio los usa vía HTML)
        const nextRow = row.nextElementSibling;
        let detallesHtml = "";
        if (nextRow && nextRow.classList.contains('fila-detalle')) {
            const listaCambios = nextRow.querySelector('.lista-cambios');
            detallesHtml = listaCambios ? listaCambios.innerHTML : "";
        }

        if (!tdUsuario || !tdMov) return;

        // 3. Crear panel móvil incluyendo la sección de detalles si existen
        const panel = document.createElement('td');
        panel.classList.add('mobile-detail-panel');

        let extraDetallesSection = detallesHtml
            ? `<div class="mobile-detail-row" style="flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 5px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1);">
                <span class="mobile-detail-label">Cambios realizados:</span>
                <ul class="lista-cambios" style="margin:0; padding:0; width:100%">${detallesHtml}</ul>
               </div>`
            : "";

        panel.innerHTML = `
            <div class="mobile-detail-inner">
                <div class="mobile-detail-row">
                    <span class="mobile-detail-label">Usuario</span>
                    <div class="mobile-detail-value">${tdUsuario.innerHTML}</div>
                </div>
                <div class="mobile-detail-row">
                    <span class="mobile-detail-label">Movimiento</span>
                    <div class="mobile-detail-value">${tdMov.innerHTML}</div>
                </div>
                ${extraDetallesSection}
            </div>`;
        row.appendChild(panel);
    });

    /* ── TOGGLE DESPLEGABLE MÓVIL Y ESCRITORIO ── */
    const tableBody = document.querySelector('#tabla-historial tbody');
    if (!tableBody) return;

    tableBody.addEventListener('click', function (e) {
        const row = e.target.closest('.fila-movimiento');
        if (!row) return;

        // En Móvil: Manejamos nuestra clase 'is-open'
        if (window.innerWidth <= 992) {
            const isOpen = row.classList.contains('is-open');
            document.querySelectorAll('#tabla-historial .fila-movimiento.is-open')
                .forEach(r => r.classList.remove('is-open'));

            if (!isOpen) row.classList.add('is-open');
        }
        // En Escritorio: Bootstrap maneja el collapse vía data-attributes, 
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 992) {
            document.querySelectorAll('#tabla-historial .fila-movimiento.is-open')
                .forEach(r => r.classList.remove('is-open'));
        }
    });
});