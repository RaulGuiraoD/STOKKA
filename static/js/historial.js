document.addEventListener("DOMContentLoaded", function () {
    const inputSearch   = document.getElementById('filtro-historial');
    const inputDate     = document.getElementById('busqueda-fecha');
    const selectTipo    = document.getElementById('filtro-tipo');
    const btnLimpiar    = document.getElementById('btn-limpiar-filtros');
    const mainAccordion = document.getElementById('accordionHistorial');
    const sinResultados = document.getElementById('sin-resultados');

    if (!mainAccordion) return;

    // ── HELPERS ───────────────────────────────────────────────────────────────

    function getFiltros() {
        return {
            tipo: selectTipo?.value  || '',
            q:    inputSearch?.value.trim() || '',
        };
    }

    function actualizarBtnLimpiar() {
        const hayFiltros = (inputSearch?.value || '') !== ''
                        || (inputDate?.value   || '') !== ''
                        || (selectTipo?.value  || '') !== '';
        btnLimpiar?.classList.toggle('visible', hayFiltros);
    }

    // ── FILTRO DE FECHA — oculta días que no coincidan ────────────────────────
    // Esto opera sobre el DOM del acordeón, no via AJAX.
    // Muestra solo el día seleccionado; si no existe, muestra "sin resultados".

    function aplicarFiltroDia() {
        const fechaSeleccionada = inputDate?.value || ''; // YYYY-MM-DD

        if (!fechaSeleccionada) {
            // Sin filtro de fecha: mostramos todo
            mainAccordion.querySelectorAll('.level-year, .level-month, .level-day').forEach(el => {
                el.style.display = '';
            });
            return null; // indica que no hay filtro activo
        }

        let encontrado = false;

        // Recorremos todos los días del acordeón
        mainAccordion.querySelectorAll('.level-day').forEach(diaEl => {
            const btnDia  = diaEl.querySelector('.btn-abrir-dia');
            const fechaDia = btnDia?.dataset.fecha || '';

            if (fechaDia === fechaSeleccionada) {
                diaEl.style.display = '';
                encontrado = true;

                // Abrimos automáticamente ese día y sus padres
                const collapseDay = diaEl.querySelector('.accordion-collapse[data-fecha]');
                if (collapseDay && !collapseDay.classList.contains('show')) {
                    // Abrir nivel año
                    const collapseAnio = diaEl.closest('.level-year')?.querySelector(':scope > .accordion-collapse');
                    if (collapseAnio && !collapseAnio.classList.contains('show')) {
                        collapseAnio.classList.add('show');
                        const btnAnio = mainAccordion.querySelector(`[data-bs-target="#${collapseAnio.id}"]`);
                        if (btnAnio) { btnAnio.classList.remove('collapsed'); btnAnio.setAttribute('aria-expanded', 'true'); }
                    }
                    // Abrir nivel mes
                    const collapseMes = diaEl.closest('.level-month')?.querySelector(':scope > .accordion-collapse');
                    if (collapseMes && !collapseMes.classList.contains('show')) {
                        collapseMes.classList.add('show');
                        const btnMes = mainAccordion.querySelector(`[data-bs-target="#${collapseMes.id}"]`);
                        if (btnMes) { btnMes.classList.remove('collapsed'); btnMes.setAttribute('aria-expanded', 'true'); }
                    }
                    // Abrir nivel día — esto dispara show.bs.collapse que carga AJAX
                    collapseDay.classList.add('show');
                    const btnDiaEl = mainAccordion.querySelector(`[data-bs-target="#${collapseDay.id}"]`);
                    if (btnDiaEl) { btnDiaEl.classList.remove('collapsed'); btnDiaEl.setAttribute('aria-expanded', 'true'); }

                    const contenedor = collapseDay.querySelector('.contenedor-movimientos-dia');
                    if (contenedor) cargarDia(fechaDia, contenedor, 1, false);
                }
            } else {
                // Ocultamos días que no coincidan
                diaEl.style.display = 'none';
            }
        });

        // Ocultar meses y años que no tengan días visibles
        mainAccordion.querySelectorAll('.level-month').forEach(mesEl => {
            const tieneDiasVisibles = Array.from(mesEl.querySelectorAll('.level-day'))
                .some(d => d.style.display !== 'none');
            mesEl.style.display = tieneDiasVisibles ? '' : 'none';
        });

        mainAccordion.querySelectorAll('.level-year').forEach(anioEl => {
            const tieneMesesVisibles = Array.from(anioEl.querySelectorAll('.level-month'))
                .some(m => m.style.display !== 'none');
            anioEl.style.display = tieneMesesVisibles ? '' : 'none';
        });

        return encontrado;
    }

    // ── MOSTRAR / OCULTAR "SIN RESULTADOS" ───────────────────────────────────

    function actualizarSinResultados(hayResultados) {
        if (!sinResultados) return;
        if (hayResultados === false) {
            sinResultados.classList.remove('d-none');
        } else {
            sinResultados.classList.add('d-none');
        }
    }

    // ── CARGA AJAX DE UN DÍA ──────────────────────────────────────────────────

    function cargarDia(fecha, contenedor, page = 1, forzar = false) {
        const filtros     = getFiltros();
        const claveActual = `${fecha}_${page}_${filtros.tipo}_${filtros.q}`;

        if (!forzar && contenedor.dataset.claveCargada === claveActual) return;

        contenedor.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border spinner-border-sm"
                     style="color: var(--verde-stokka);" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </div>`;

        const params = new URLSearchParams({
            fecha: fecha,
            page:  page,
            tipo:  filtros.tipo,
            q:     filtros.q,
        });

        fetch(`/historial/dia/?${params.toString()}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(html => {
            contenedor.innerHTML = html;
            contenedor.dataset.claveCargada = claveActual;

            // Si el buscador tiene texto y el día cargado no tiene resultados
            // comprobamos si hay algún día abierto con resultados
            comprobarResultadosGlobales();

            vincularPaginacion(contenedor, fecha);
            inyectarChevronYPanelMovil(contenedor);
            vincularFilasDetalle(contenedor);
        })
        .catch(err => {
            contenedor.innerHTML = `
                <div class="text-center py-3 text-danger small">
                    <i class="fa-solid fa-triangle-exclamation me-1"></i>
                    Error al cargar los movimientos. Inténtalo de nuevo.
                </div>`;
            console.error('Error cargando día:', err);
        });
    }

    // Comprueba si algún día abierto tiene resultados (para el mensaje "sin coincidencias")
    function comprobarResultadosGlobales() {
        const filtros = getFiltros();
        if (!filtros.q && !filtros.tipo) {
            actualizarSinResultados(true);
            return;
        }
        // Miramos si algún contenedor cargado tiene filas visibles
        const hayFilas = mainAccordion.querySelectorAll(
            '.contenedor-movimientos-dia .fila-movimiento'
        ).length > 0;
        actualizarSinResultados(hayFilas);
    }

    // ── PAGINACIÓN POR DÍA ────────────────────────────────────────────────────

    function vincularPaginacion(contenedor, fecha) {
        contenedor.querySelectorAll('.btn-pagina-dia').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const page = parseInt(this.dataset.page, 10);
                cargarDia(fecha, contenedor, page, true);
            });
        });
    }

    // ── CHEVRON + PANEL MÓVIL (idéntico al JS original) ──────────────────────

    function inyectarChevronYPanelMovil(scope) {
        scope.querySelectorAll('.tabla-historial-clase tbody tr.fila-movimiento').forEach(row => {
            if (!row.querySelector('.chevron-mobile')) {
                const tdProducto = row.querySelector('td[data-label="PRODUCTO"]');
                if (tdProducto) {
                    const chevron = document.createElement('i');
                    chevron.className = 'fa-solid fa-angle-down chevron-mobile';
                    tdProducto.appendChild(chevron);
                }
            }

            const tdUsuario    = row.querySelector('td[data-label="USUARIO"]');
            const tdMov        = row.querySelector('td[data-label="MOVIMIENTO"]');
            const nextRow      = row.nextElementSibling;
            const listaCambios = nextRow?.querySelector('.lista-cambios');

            if (tdUsuario && tdMov && !row.querySelector('.mobile-detail-panel')) {
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
            }
        });
    }

    // ── TOGGLE FILA DETALLE ───────────────────────────────────────────────────

    function vincularFilasDetalle(scope) {
        scope.querySelectorAll('.tabla-historial-clase tbody').forEach(tbody => {
            tbody.addEventListener('click', function (e) {
                const row = e.target.closest('.fila-movimiento');
                if (!row) return;
                e.stopPropagation();

                if (window.innerWidth <= 992) {
                    document.querySelectorAll('.fila-movimiento.is-open').forEach(r => {
                        if (r !== row) r.classList.remove('is-open');
                    });
                    row.classList.toggle('is-open');
                } else {
                    const targetId   = row.getAttribute('data-bs-target');
                    const collapseEl = document.querySelector(targetId);
                    if (!collapseEl) return;

                    const table = row.closest('table');
                    table?.querySelectorAll('.collapse.show').forEach(c => {
                        if (c !== collapseEl) bootstrap.Collapse.getInstance(c)?.hide();
                    });
                    bootstrap.Collapse.getOrCreateInstance(collapseEl).toggle();
                }
            });
        });
    }

    // ── APERTURA DEL ACORDEÓN DE DÍAS (Bootstrap show.bs.collapse) ───────────

    mainAccordion.addEventListener('show.bs.collapse', function (e) {
        const collapseEl = e.target;
        const fecha = collapseEl.dataset.fecha;
        if (!fecha) return;

        const contenedor = collapseEl.querySelector('.contenedor-movimientos-dia');
        if (!contenedor) return;

        cargarDia(fecha, contenedor, 1, false);
    });

    // ── FILTROS TEXTO Y TIPO: debounce + recarga días abiertos ───────────────

    let debounceTimer;

    function recargarDiasAbiertos() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Estilos dinámicos del select
            if (selectTipo) {
                const tipoVal = selectTipo.value;
                selectTipo.className = 'form-select stokka-input shadow-focus-stokka';
                if      (tipoVal === 'CREACION')      selectTipo.classList.add('border-creacion');
                else if (tipoVal === 'MODAL_EDITAR')  selectTipo.classList.add('border-edicion');
                else if (tipoVal === 'ELIMINACION')   selectTipo.classList.add('border-eliminacion');
                else if (tipoVal === 'AJUSTE_RAPIDO') selectTipo.classList.add('border-ajuste');
            }

            // Recargamos cada día abierto con los nuevos filtros
            mainAccordion.querySelectorAll('.accordion-collapse.show[data-fecha]').forEach(collapseEl => {
                const fecha      = collapseEl.dataset.fecha;
                const contenedor = collapseEl.querySelector('.contenedor-movimientos-dia');
                if (fecha && contenedor) cargarDia(fecha, contenedor, 1, true);
            });

            actualizarBtnLimpiar();
        }, 350);
    }

    // ── FILTRO FECHA: opera sobre DOM del acordeón ────────────────────────────

    function manejarFiltroDia() {
        const encontrado = aplicarFiltroDia();
        // Si hay fecha seleccionada y no se encontró ese día → sin resultados
        if (inputDate?.value && encontrado === false) {
            actualizarSinResultados(false);
        } else {
            actualizarSinResultados(true);
        }
        actualizarBtnLimpiar();
    }

    inputSearch?.addEventListener('input',  recargarDiasAbiertos);
    selectTipo?.addEventListener('change',  recargarDiasAbiertos);
    inputDate?.addEventListener('change',   manejarFiltroDia);

    // ── LIMPIAR FILTROS — instantáneo, recarga la página sin parámetros ───────

    btnLimpiar?.addEventListener('click', function () {
        // Recarga la misma URL sin ningún parámetro GET → limpia todo instantáneamente
        window.location.href = window.location.pathname;
    });

    // ── APERTURA AUTOMÁTICA DEL DÍA DE HOY ───────────────────────────────────

    function abrirDiaHoy() {
        const hoy      = new Date();
        const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        const collapseHoy = mainAccordion.querySelector(`.accordion-collapse[data-fecha="${fechaHoy}"]`);
        if (!collapseHoy) return; // hoy no tiene movimientos

        // Abrir año padre
        const collapseAnio = collapseHoy.closest('.level-year')?.querySelector(':scope > .accordion-collapse');
        if (collapseAnio && !collapseAnio.classList.contains('show')) {
            collapseAnio.classList.add('show');
            const btnAnio = mainAccordion.querySelector(`[data-bs-target="#${collapseAnio.id}"]`);
            if (btnAnio) { btnAnio.classList.remove('collapsed'); btnAnio.setAttribute('aria-expanded', 'true'); }
        }

        // Abrir mes padre
        const collapseMes = collapseHoy.closest('.level-month')?.querySelector(':scope > .accordion-collapse');
        if (collapseMes && !collapseMes.classList.contains('show')) {
            collapseMes.classList.add('show');
            const btnMes = mainAccordion.querySelector(`[data-bs-target="#${collapseMes.id}"]`);
            if (btnMes) { btnMes.classList.remove('collapsed'); btnMes.setAttribute('aria-expanded', 'true'); }
        }

        // Abrir día de hoy
        if (!collapseHoy.classList.contains('show')) {
            collapseHoy.classList.add('show');
            const btnDia = mainAccordion.querySelector(`[data-bs-target="#${collapseHoy.id}"]`);
            if (btnDia) { btnDia.classList.remove('collapsed'); btnDia.setAttribute('aria-expanded', 'true'); }

            // Cargar AJAX manualmente (classList.add no dispara el evento Bootstrap)
            const contenedor = collapseHoy.querySelector('.contenedor-movimientos-dia');
            if (contenedor) cargarDia(fechaHoy, contenedor, 1, false);
        }
    }

    abrirDiaHoy();

});