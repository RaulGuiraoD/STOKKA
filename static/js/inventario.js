// --- VARIABLES PARA HISTORIAL CON DEBOUNCE ---
let debounceTimers = {};
let cambiosAcumulados = {};

// AUTO-FOCO EN EL BUSCADOR AL ABRIR SIDEBAR
function toggleFiltros() {
    const sidebar = document.getElementById('sidebar-filtros');
    const main = document.getElementById('main-content');

    if (sidebar) {
        const isActive = sidebar.classList.toggle('active');
        if (main) main.classList.toggle('sidebar-active');

        // Buscamos el input específicamente dentro del sidebar
        const sidebarSearch = sidebar.querySelector("input[name='q']");

        if (isActive && sidebarSearch) {
            // El foco ahora irá directo al del sidebar, no al del header
            setTimeout(() => sidebarSearch.focus(), 600);
        }
    }
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
    const sidebar = document.getElementById('sidebar-filtros');
    const searchInput = sidebar ? sidebar.querySelector("input[name='q']") : null;

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

    // 1. MEJORA DE AUTOCERRADO AL CLICAR FUERA (Solo móvil)
    document.addEventListener('click', function (event) {
        const sidebar = document.getElementById('sidebar-filtros');
        const btnFiltros = document.querySelector('button[onclick="toggleFiltros()"]');
        const isMobile = window.innerWidth <= 992;

        if (isMobile && sidebar && sidebar.classList.contains('active')) {
            // Si el clic NO es dentro del sidebar y NO es en el botón de abrir...
            if (!sidebar.contains(event.target) && !btnFiltros.contains(event.target)) {
                toggleFiltros();
            }
        }
    });

    // Eventos para Sincronizar Sliders con Números
    // --- LÓGICA DE STOCK CON FORZADO DE RENDERIZADO ---
    if (stockMin && numMin && stockMax && numMax) {
        const elementosStock = [stockMin, numMin, stockMax, numMax];

        elementosStock.forEach(el => {
            el.addEventListener("input", () => {
                // Sincronizar inputs
                if (el === stockMin || el === numMin) {
                    stockMin.value = el.value;
                    numMin.value = el.value;
                } else {
                    stockMax.value = el.value;
                    numMax.value = el.value;
                }

                // Validar que no se crucen
                if (parseInt(stockMin.value) > parseInt(stockMax.value)) {
                    if (el === stockMin || el === numMin) {
                        stockMax.value = stockMin.value;
                        numMax.value = stockMin.value;
                    } else {
                        stockMin.value = stockMax.value;
                        numMin.value = stockMax.value;
                    }
                }

                if (rangoTexto) rangoTexto.innerText = `${stockMin.value} y ${stockMax.value}`;

                aplicarFiltros();

                // Forzar refresco visual (Fix para emuladores)
                const tbody = document.querySelector("#tabla-inventario tbody");
                if (tbody) {
                    const prevDisplay = tbody.style.display;
                    tbody.style.display = 'none';
                    tbody.offsetHeight;
                    tbody.style.display = prevDisplay;
                }
            });
        });
    }

    // Resetear visualmente al hacer clic en limpiar
    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", (e) => {
            // e.preventDefault(); // Si es un enlace <a> para que no recargue

            // Obtenemos el valor máximo real desde el atributo max del input
            const valorMaximoReal = stockMax.getAttribute('max');

            if (stockMin) stockMin.value = 0;
            if (numMin) numMin.value = 0;
            if (stockMax) stockMax.value = valorMaximoReal;
            if (numMax) numMax.value = valorMaximoReal;

            if (rangoTexto) {
                rangoTexto.innerText = `0 y ${valorMaximoReal}`;
            }

            aplicarFiltros(); // Para que la tabla se limpie también
        });
    }

    // --- FUNCIÓN FILTRAR (Cero dependencias externas) ---
    function aplicarFiltros() {
        if (!searchInput) return;

        const term = searchInput.value.toLowerCase().trim();
        const minLimit = parseInt(stockMin.value) || 0;
        const maxLimit = parseInt(stockMax.value) || 0;

        rows.forEach(row => {
            const stockElement = row.querySelector(".stock-number");
            let stock = 0;

            if (stockElement) {
                stock = parseInt(stockElement.innerText);
            } else {
                const cells = row.getElementsByTagName("td");
                if (cells.length > 0) stock = parseInt(cells[cells.length - 2].innerText) || 0;
            }

            const contenidoFila = row.textContent.toLowerCase();
            const coincideTexto = term === "" || contenidoFila.includes(term);
            const coincideStock = (stock >= minLimit && stock <= maxLimit);

            // Uso de !important para asegurar la visibilidad
            if (coincideTexto && coincideStock) {
                row.style.setProperty("display", "", "important");
            } else {
                row.style.setProperty("display", "none", "important");
            }
        });
    }

    // --- LÓGICA DE BÚSUEDA UNIFICADA (ENTER = LUPA) ---

    if (searchInput) {
        // 1. Filtrado en tiempo real mientras escribes
        searchInput.addEventListener("input", function () {
            aplicarFiltros();
        });

        // 2. Función interna para ejecutar la acción completa
        // Así nos aseguramos de que el Enter y la Lupa hagan exactamente lo mismo
        const ejecutarBusquedaYCierre = () => {
            aplicarFiltros(); // Primero filtramos la tabla

            // Si el sidebar está abierto, lo cerramos
            if (sidebar.classList.contains('active')) {
                toggleFiltros();
            }

            // Quitamos el foco para que el teclado móvil desaparezca
            searchInput.blur();
        };

        // Evento para el ENTER
        searchInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                ejecutarBusquedaYCierre();
            }
        });

        // Evento para la LUPA
        /* const btnLupa = sidebar.querySelector("button.btn-success") ||
             sidebar.querySelector(".input-group button");
 
         if (btnLupa) {
             btnLupa.addEventListener("click", function (e) {
                 e.preventDefault();
                 e.stopPropagation();
                 ejecutarBusquedaYCierre();
             });
         }*/
    }


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
        // --- BLOQUEO EN MODO SELECCIÓN ---
        const haySeleccionados = document.querySelectorAll('.checkbox-producto:checked').length > 0;
        if (haySeleccionados) return; // Si hay algo seleccionado, abortamos la función
        const csrftoken = getCookie('csrftoken');
        // Detectamos si es aumento o disminución por la URL
        const esAumento = url.includes('subir') || url.includes('aumentar');
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
                    // --- NUEVA LÓGICA DE HISTORIAL ---
                    acumularHistorialRapido(productId, esAumento);
                }
            });
    }

    stockButtons.forEach(btn => {
        let timer, interval;
        const url = btn.dataset.url, pk = btn.dataset.pk;

        const start = (e) => {
            const haySeleccionados = document.querySelectorAll('.checkbox-producto:checked').length > 0;
            if (haySeleccionados) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            realizarAjuste(url, pk);
            timer = setTimeout(() => {
                interval = setInterval(() => realizarAjuste(url, pk), 150);
            }, 500);
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

    // --- VALIDACIÓN DE UMBRALES EN TIEMPO REAL ---
    function validarUmbrales(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const inputAmarillo = modal.querySelector('[name="umbrales_amarillo"]');
        const inputRojo = modal.querySelector('[name="umbrales_rojo"]');

        if (inputAmarillo && inputRojo) {
            const validar = () => {
                const valA = parseInt(inputAmarillo.value) || 0;
                const valR = parseInt(inputRojo.value) || 0;

                if (valA <= valR && inputAmarillo.value !== "" && inputRojo.value !== "") {
                    inputAmarillo.setCustomValidity("El aviso debe ser mayor al crítico");
                    inputAmarillo.classList.add('is-invalid');
                } else {
                    inputAmarillo.setCustomValidity("");
                    inputAmarillo.classList.remove('is-invalid');
                }
            };

            inputAmarillo.addEventListener('input', validar);
            inputRojo.addEventListener('input', validar);
        }
    }

    // Solo ejecutamos la lógica de inicialización
    validarUmbrales('modalAñadir');

    const observer = new MutationObserver(() => validarUmbrales('modalEditar'));
    const contenedor = document.getElementById('contenedor-form-editar');
    if (contenedor) observer.observe(contenedor, { childList: true });

    const tableBody = document.querySelector("#tabla-inventario tbody");

    // --- LÓGICA MÓVIL: PULSADO LARGO, SELECCIÓN Y DESPLEGABLE ---
    if (tableBody) {
        let longPressTimer;
        const LONG_PRESS_DURATION = 600;

        const toggleSeleccionManual = (row) => {
            const cb = row.querySelector('.checkbox-producto');
            if (cb) {
                cb.checked = !cb.checked;
                actualizarBotón();
                if (window.navigator.vibrate) window.navigator.vibrate(40);
            }
        };

        // EVENTO CLICK (Para escritorio y móvil)
        tableBody.addEventListener("click", function (e) {
            const row = e.target.closest("tr");
            if (!row) return;

            // Detectamos si hay elementos seleccionados en este momento
            const haySeleccionados = document.querySelectorAll('.checkbox-producto:checked').length > 0;
            const isAction = e.target.closest("button") || e.target.closest("a");
            const isCheckbox = e.target.closest(".form-check-input");

            // 1. Si clicamos directamente en el checkbox, dejamos que funcione normal (actualizarBotón se encarga)
            if (isCheckbox) return;

            // 2. Si clicamos en la fila (pero no en un botón)
            if (!isAction) {
                const isMobile = window.innerWidth <= 992;

                if (haySeleccionados) {
                    // MODO SELECCIÓN ACTIVO: Cualquier clic en la fila selecciona/deselecciona
                    e.preventDefault();
                    toggleSeleccionManual(row);
                } else if (isMobile) {
                    // MODO MÓVIL LECTURA: Si no hay selección, el clic abre el acordeón
                    row.classList.toggle("is-open");
                }
                // En Escritorio, si no hay seleccionados, el clic normal en la fila no hace nada 
                // (así permitimos que el usuario use el checkbox para empezar).
            }
        });

        // LÓGICA MÓVIL (Touchstart para el pulsado largo)
        tableBody.addEventListener("touchstart", function (e) {
            if (window.innerWidth <= 992) {
                const row = e.target.closest("tr");
                const isAction = e.target.closest("button") || e.target.closest("a") || e.target.closest(".form-check-input");

                if (row && !isAction) {
                    longPressTimer = setTimeout(() => {
                        const cb = row.querySelector('.checkbox-producto');
                        // Si mantenemos pulsado y no estaba seleccionado, activamos el modo selección
                        if (cb && !cb.checked) {
                            toggleSeleccionManual(row);
                        }
                    }, LONG_PRESS_DURATION);
                }
            }
        }, { passive: true });

        tableBody.addEventListener("touchend", () => clearTimeout(longPressTimer));
        tableBody.addEventListener("touchmove", () => clearTimeout(longPressTimer));
    }
});

function autoActualizarStocks() {
    fetch('/actualizar-stocks/') 
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(id => {
                if (debounceTimers[id]) return;
                const info = data[id];
                const span = document.getElementById(`stock-val-${id}`);
                const fila = document.getElementById(`producto-row-${id}`);

                // 1. Actualizar el número de stock
                if (span && span.innerText != info.stock) {
                    span.innerText = info.stock;
                }

                // 2. Actualizar el color del semáforo en la fila
                if (fila) {
                    // Eliminamos las clases antiguas
                    fila.classList.remove('stokka-critico', 'stokka-aviso', 'stokka-ok');
                    // Añadimos la nueva clase según el servidor
                    fila.classList.add(`stokka-${info.color}`);
                }
            });
        })
        .catch(error => console.error('Error en actualización visual:', error));
}

// Ejecutar cada 7 segundos para probar 
setInterval(autoActualizarStocks, 7000);    

function acumularHistorialRapido(productId, esAumento) {
    // 1. Acumular el cambio
    if (!cambiosAcumulados[productId]) cambiosAcumulados[productId] = 0;
    cambiosAcumulados[productId] += esAumento ? 1 : -1;

    // 2. Resetear el temporizador de 5 segundos
    if (debounceTimers[productId]) clearTimeout(debounceTimers[productId]);

    debounceTimers[productId] = setTimeout(() => {
        enviarHistorialAlServidor(productId);
    }, 5000);
}

function enviarHistorialAlServidor(productId) {
    const deltaFinal = cambiosAcumulados[productId];
    if (!deltaFinal) return; 

    const formData = new FormData();
    formData.append('delta', deltaFinal);

    fetch(`/inventario/registrar-historial-rapido/${productId}/`, {
        method: 'POST',
        body: formData,
        keepalive: true, // <--- ESTO permite que la petición termine aunque cierres la pestaña
        headers: { 
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest' 
        }
    });
    
    // Limpiamos inmediatamente para evitar duplicados
    delete cambiosAcumulados[productId];
    if (debounceTimers[productId]) clearTimeout(debounceTimers[productId]);
}


// Detectar cuando el usuario intenta salir de la página
window.addEventListener('beforeunload', function (e) {
    // Revisamos si hay cambios que aún no se han enviado
    const idsPendientes = Object.keys(cambiosAcumulados);
    
    if (idsPendientes.length > 0) {
        idsPendientes.forEach(productId => {
            // Usamos sendBeacon si está disponible (es más fiable para salidas)
            // o forzamos el envío inmediato
            enviarHistorialAlServidor(productId);
        });
    }
});