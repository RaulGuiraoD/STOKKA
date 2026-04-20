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

    /* ── FILTRADO ── */
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

                const matchText = term === "" || rowText.includes(term);
                const matchDate = !dateVal || rowDate === dateVal;

                if (matchText && matchDate) {
                    row.style.setProperty("display", "", "important");
                    hasVisibleRows = true;
                } else {
                    row.style.setProperty("display", "none", "important");
                }
            });

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
    inputSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter") this.blur();
    });

    /* ── INYECCIÓN DEL PANEL Y CHEVRON ── */
    document.querySelectorAll('#tabla-historial tbody tr.fila-movimiento').forEach(row => {

        const tdProducto = row.querySelector('td[data-label="PRODUCTO"]');
        if (tdProducto) {
            const chevron = document.createElement('i');
            chevron.className = 'fa-solid fa-angle-down chevron-mobile';
            tdProducto.appendChild(chevron);
        }

        const tdUsuario = row.querySelector('td[data-label="USUARIO"]');
        const tdMov = row.querySelector('td[data-label="MOVIMIENTO"]');
        if (!tdUsuario || !tdMov) return;

        const panel = document.createElement('td');
        panel.classList.add('mobile-detail-panel');
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
            </div>`;
        row.appendChild(panel);
    });

    /* ── TOGGLE DESPLEGABLE MÓVIL ── */
    const tableBody = document.querySelector('#tabla-historial tbody');
    if (!tableBody) return;

    tableBody.addEventListener('click', function (e) {
        if (window.innerWidth > 992) return;

        const row = e.target.closest('.fila-movimiento');
        if (!row) return;

        const isOpen = row.classList.contains('is-open');

        document.querySelectorAll('#tabla-historial .fila-movimiento.is-open')
            .forEach(r => r.classList.remove('is-open'));

        if (!isOpen) row.classList.add('is-open');
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 992) {
            document.querySelectorAll('#tabla-historial .fila-movimiento.is-open')
                .forEach(r => r.classList.remove('is-open'));
        }
    });
});