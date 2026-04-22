document.addEventListener("DOMContentLoaded", function () {
    const inputSearch = document.getElementById('filtro-historial');
    const inputDate = document.getElementById('busqueda-fecha');
    const selectTipo = document.getElementById('filtro-tipo');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    const mainAccordion = document.getElementById('accordionHistorial');

    if (!inputSearch || !inputDate || !selectTipo) return;

    /* ── 1. ESTADO INICIAL: RESETEAR TODO ── */
    // Cerramos todos los colapsables y ponemos todos los botones en estado "collapsed"
    document.querySelectorAll('.accordion-collapse.show').forEach(c => c.classList.remove('show'));
    document.querySelectorAll('.accordion-button').forEach(b => {
        b.classList.add('collapsed');
        b.setAttribute('aria-expanded', 'false');
    });

    /* ── 2. APERTURA AUTOMÁTICA DEL AÑO ACTUAL ── */
    const anioActual = new Date().getFullYear().toString();
    
    // Buscamos el botón del nivel año que contiene el año presente
    const btnAnioActual = Array.from(document.querySelectorAll('.level-year > .accordion-header > .accordion-button'))
        .find(btn => btn.textContent.trim().includes(anioActual));

    if (btnAnioActual) {
        const targetId = btnAnioActual.getAttribute('data-bs-target');
        const collapseAnio = document.querySelector(targetId);
        
        if (collapseAnio) {
            // Abrimos SOLO el nivel del año
            btnAnioActual.classList.remove('collapsed');
            btnAnioActual.setAttribute('aria-expanded', 'true');
            collapseAnio.classList.add('show');
            
            // Nota: Al no tocar los .level-month ni .level-day, 
            // estos permanecerán cerrados por el reset del paso 1.
        }
    }

    /* ── 3. VISIBILIDAD DEL BOTÓN LIMPIAR ── */
    function actualizarBtnLimpiar() {
        const hayFiltros = inputSearch.value !== '' || inputDate.value !== '' || selectTipo.value !== '';
        btnLimpiar?.classList.toggle('visible', hayFiltros);
    }

    /* ── FILTRADO OPTIMIZADO ── */
    function aplicarFiltros() {
        const term = inputSearch.value.toLowerCase().trim();
        const dateVal = inputDate.value;
        const tipoVal = selectTipo.value.toUpperCase();
        let hayResultadosGlobales = false;

        // Estilos dinámicos del select
        selectTipo.className = 'form-select stokka-input shadow-focus-stokka';
        if (tipoVal === 'CREACION') selectTipo.classList.add('border-creacion');
        else if (tipoVal === 'MODAL_EDITAR') selectTipo.classList.add('border-edicion');
        else if (tipoVal === 'ELIMINACION') selectTipo.classList.add('border-eliminacion');
        else if (tipoVal === 'AJUSTE_RAPIDO') selectTipo.classList.add('border-ajuste');

        // Recorremos cada bloque de día
        document.querySelectorAll('.level-day').forEach(diaBlock => {
            const rows = diaBlock.querySelectorAll('.fila-movimiento');
            let filasVisiblesEnDia = 0;

            rows.forEach(row => {
                const detailRow = row.nextElementSibling; // La fila con el colapsable de detalles

                const matchText = term === '' || row.textContent.toLowerCase().includes(term);
                const matchDate = !dateVal || row.dataset.fecha === dateVal;
                const matchTipo = tipoVal === '' || row.className.toUpperCase().includes(tipoVal);

                const visible = matchText && matchDate && matchTipo;

                // Aplicamos visibilidad con display
                row.style.display = visible ? '' : 'none';
                if (detailRow && detailRow.classList.contains('fila-detalle')) {
                    detailRow.style.display = visible ? '' : 'none';
                }

                if (visible) filasVisiblesEnDia++;
            });

            // Mostrar/Ocultar el bloque del día según si tiene filas visibles
            diaBlock.style.display = filasVisiblesEnDia > 0 ? '' : 'none';

            if (filasVisiblesEnDia > 0) {
                hayResultadosGlobales = true;

                // AUTO-APERTURA INTELIGENTE: 
                // Solo abrimos automáticamente si el usuario está BUSCANDO (texto o fecha).
                // Si ya está abierto, no hacemos nada (se mantiene abierto).
                if (term || dateVal) {
                    const colapsablesPadres = [];
                    // Buscamos los contenedores colapsables hacia arriba (Día -> Mes -> Año)
                    let parent = diaBlock.closest('.accordion-collapse');
                    while (parent) {
                        if (!parent.classList.contains('show')) {
                            // Usamos la clase de Bootstrap directamente para evitar conflictos de instancia
                            parent.classList.add('show');
                            const button = document.querySelector(`[data-bs-target="#${parent.id}"]`);
                            if (button) button.classList.remove('collapsed');
                        }
                        parent = parent.parentElement.closest('.accordion-collapse');
                    }
                }
            }
        });

        // Bloque de Meses y Años: Ocultar si no tienen días visibles
        document.querySelectorAll('.level-month, .level-year').forEach(container => {
            const tieneContenidoVisible = container.querySelector('.level-day[style="display: px;"], .level-day:not([style*="display: none"])');
            container.style.display = tieneContenidoVisible ? '' : 'none';
        });

        document.getElementById('sin-resultados')?.classList.toggle('d-none', hayResultadosGlobales);
        actualizarBtnLimpiar();
    }

    /* ── EVENTOS DE FILTRO ── */
    inputSearch.addEventListener('input', aplicarFiltros);
    inputDate.addEventListener('change', aplicarFiltros);
    selectTipo.addEventListener('change', aplicarFiltros);

    /* ── LIMPIAR ── */
    btnLimpiar?.addEventListener('click', function () {
        inputSearch.value = '';
        inputDate.value = '';
        selectTipo.value = '';
        aplicarFiltros();
        // Al limpiar, sí cerramos todo para orden
        document.querySelectorAll('#accordionHistorial .accordion-collapse.show').forEach(c => {
            bootstrap.Collapse.getOrCreateInstance(c).hide();
        });
    });

    /* ── MANEJO DE CLIC EN FILAS (DETALLES) ── */
    if (mainAccordion) {
        mainAccordion.addEventListener('click', function (e) {
            const row = e.target.closest('.fila-movimiento');
            if (!row) return;

            // En tu HTML usas data-bs-target para el ID del detalle
            const targetId = row.getAttribute('data-bs-target');
            const collapseEl = document.querySelector(targetId);

            if (collapseEl) {
                const instance = bootstrap.Collapse.getOrCreateInstance(collapseEl);
                instance.toggle();
            }
        });
    }

    /* ── INYECCIÓN DE CHEVRON Y PANEL MÓVIL (Mantenemos tu lógica) ── */
    document.querySelectorAll('.tabla-historial-clase tbody tr.fila-movimiento').forEach(row => {
        if (!row.querySelector('.chevron-mobile')) {
            const tdProducto = row.querySelector('td[data-label="PRODUCTO"]');
            if (tdProducto) {
                const chevron = document.createElement('i');
                chevron.className = 'fa-solid fa-angle-down chevron-mobile';
                tdProducto.appendChild(chevron);
            }
        }

        // Preparar Panel Móvil
        const tdUsuario = row.querySelector('td[data-label="USUARIO"]');
        const tdMov = row.querySelector('td[data-label="MOVIMIENTO"]');
        const nextRow = row.nextElementSibling;
        const listaCambios = nextRow?.querySelector('.lista-cambios');

        if (tdUsuario && tdMov && !row.querySelector('.mobile-detail-panel')) {
            const detallesHtml = listaCambios ?
                `<div class="mobile-detail-row mobile-detail-detalles">
                    <span class="mobile-detail-label">Cambios</span>
                    <ul class="lista-cambios mobile">${listaCambios.innerHTML}</ul>
                </div>` : '';

            const panel = document.createElement('td');
            panel.classList.add('mobile-detail-panel');
            panel.innerHTML = `
                <div class="mobile-detail-inner">
                    <div class="mobile-detail-row"><span class="mobile-detail-label">Usuario</span><div class="mobile-detail-value">${tdUsuario.innerHTML}</div></div>
                    <div class="mobile-detail-row"><span class="mobile-detail-label">Movimiento</span><div class="mobile-detail-value">${tdMov.innerHTML}</div></div>
                    ${detallesHtml}
                </div>`;
            row.appendChild(panel);
        }
    });

    /* ── TOGGLE DESKTOP Y MÓVIL ── */
    const mainContainer = document.getElementById('accordionHistorial');
    if (mainContainer) {
        mainContainer.addEventListener('click', function (e) {
            const row = e.target.closest('.fila-movimiento');
            if (!row) return;

            e.stopPropagation();

            if (window.innerWidth <= 992) {
                const isOpen = row.classList.contains('is-open');
                document.querySelectorAll('.fila-movimiento.is-open').forEach(r => r.classList.remove('is-open'));
                if (!isOpen) row.classList.add('is-open');
            } else {
                const targetId = row.dataset.collapseTarget;
                const collapseEl = document.querySelector(targetId);
                if (!collapseEl) return;

                // Cerrar otros detalles abiertos en la misma tabla
                const table = row.closest('table');
                table.querySelectorAll('.collapse.show').forEach(c => {
                    if (c !== collapseEl) bootstrap.Collapse.getInstance(c)?.hide();
                });

                let instance = bootstrap.Collapse.getOrCreateInstance(collapseEl);
                instance.toggle();
            }
        });
    }

});