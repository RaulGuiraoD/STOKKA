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
    const selectTipo = document.getElementById('filtro-tipo');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');

    if (!inputSearch || !inputDate || !selectTipo) return;

    /* ── CERRAR TODOS LOS ACORDEONES AL ENTRAR ── */
    document.querySelectorAll('#accordionHistorial .accordion-collapse.show').forEach(c => c.classList.remove('show'));
    document.querySelectorAll('#accordionHistorial .accordion-button').forEach(b => b.classList.add('collapsed'));

    /* ── VISIBILIDAD DEL BOTÓN LIMPIAR ── */
    function actualizarBtnLimpiar() {
        const hayFiltros = inputSearch.value !== '' || inputDate.value !== '' || selectTipo.value !== '';
        btnLimpiar?.classList.toggle('visible', hayFiltros);
    }

    /* ── FILTRADO (función única) ── */
    function aplicarFiltros() {
        const term = inputSearch.value.toLowerCase().trim();
        const dateVal = inputDate.value;
        const tipoVal = selectTipo.value.toUpperCase();
        const noResultadosDiv = document.getElementById('sin-resultados');
        let hayResultados = false;

        // Color dinámico del selector
        selectTipo.classList.remove('border-creacion', 'border-edicion', 'border-eliminacion', 'border-ajuste');
        if (tipoVal === 'CREACION') selectTipo.classList.add('border-creacion');
        else if (tipoVal === 'MODAL_EDITAR') selectTipo.classList.add('border-edicion');
        else if (tipoVal === 'ELIMINACION') selectTipo.classList.add('border-eliminacion');
        else if (tipoVal === 'AJUSTE_RAPIDO') selectTipo.classList.add('border-ajuste');

        document.querySelectorAll('.accordion-item').forEach(item => {
            const rows = item.querySelectorAll('.fila-movimiento');
            let hayFilasVisibles = false;

            rows.forEach(row => {
                const detailRow = row.nextElementSibling;
                const esDetalle = detailRow?.classList.contains('fila-detalle');

                const matchText = term === '' || row.textContent.toLowerCase().includes(term);
                const matchDate = !dateVal || row.dataset.fecha === dateVal;
                const matchTipo = tipoVal === '' || row.className.toUpperCase().includes(tipoVal);
                const visible = matchText && matchDate && matchTipo;

                row.style.setProperty('display', visible ? '' : 'none', 'important');

                if (esDetalle) {
                    detailRow.style.setProperty('display', visible ? '' : 'none', 'important');
                    if (!visible) {
                        const collapseEl = detailRow.querySelector('.collapse.show');
                        if (collapseEl) bootstrap.Collapse.getInstance(collapseEl)?.hide();
                    }
                }

                if (visible) { hayFilasVisibles = true; hayResultados = true; }
            });

            item.style.display = hayFilasVisibles ? '' : 'none';

            // Solo abrir acordeón de día con búsqueda de texto o fecha, NUNCA con el selector
            if (hayFilasVisibles && (term || dateVal)) {
                const collapse = item.querySelector('.accordion-collapse');
                if (collapse && !collapse.classList.contains('show')) {
                    new bootstrap.Collapse(collapse, { show: true });
                }
            }
        });

        noResultadosDiv?.classList.toggle('d-none', hayResultados);
        actualizarBtnLimpiar();
    }

    inputSearch.addEventListener('input', aplicarFiltros);
    inputDate.addEventListener('change', aplicarFiltros);
    selectTipo.addEventListener('change', aplicarFiltros);
    inputSearch.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

    /* ── LIMPIAR FILTROS ── */
    btnLimpiar?.addEventListener('click', function () {
        inputSearch.value = '';
        inputDate.value = '';
        selectTipo.value = '';
        aplicarFiltros();

        document.querySelectorAll('#accordionHistorial .accordion-collapse.show').forEach(c => {
            bootstrap.Collapse.getInstance(c)?.hide();
        });

        this.style.transform = 'scale(0.88)';
        setTimeout(() => this.style.transform = '', 150);
    });

    // Estado inicial del botón limpiar
    actualizarBtnLimpiar();

    /* ── INYECCIÓN: CHEVRON + PANEL MÓVIL ── */
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

        const nextRow = row.nextElementSibling;
        const listaCambios = nextRow?.classList.contains('fila-detalle')
            ? nextRow.querySelector('.lista-cambios')
            : null;

        const detallesHtml = listaCambios
            ? `<div class="mobile-detail-row mobile-detail-detalles">
                   <span class="mobile-detail-label">Cambios</span>
                   <ul class="lista-cambios mobile">${listaCambios.innerHTML}</ul>
               </div>`
            : '';

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
                ${detallesHtml}
            </div>`;
        row.appendChild(panel);
    });

    /* ── TOGGLE DESKTOP Y MÓVIL ── */
    const tableBody = document.querySelector('#tabla-historial tbody');
    if (!tableBody) return;

    tableBody.addEventListener('click', function (e) {
        e.stopPropagation();

        const row = e.target.closest('.fila-movimiento');
        if (!row) return;

        // MÓVIL
        if (window.innerWidth <= 992) {
            const isOpen = row.classList.contains('is-open');
            document.querySelectorAll('#tabla-historial .fila-movimiento.is-open')
                .forEach(r => r.classList.remove('is-open'));
            if (!isOpen) row.classList.add('is-open');
            return;
        }

        // DESKTOP: collapse de detalle gestionado por JS
        const targetSelector = row.dataset.collapseTarget;
        if (!targetSelector) return;

        const collapseEl = document.querySelector(targetSelector);
        if (!collapseEl) return;

        const isShown = collapseEl.classList.contains('show');

        document.querySelectorAll('#tabla-historial .collapse.show').forEach(c => {
            if (c !== collapseEl) bootstrap.Collapse.getInstance(c)?.hide();
        });

        let instance = bootstrap.Collapse.getInstance(collapseEl);
        if (!instance) instance = new bootstrap.Collapse(collapseEl, { toggle: false });
        isShown ? instance.hide() : instance.show();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            document.querySelectorAll('#tabla-historial .fila-movimiento.is-open')
                .forEach(r => r.classList.remove('is-open'));
        }
    });
});