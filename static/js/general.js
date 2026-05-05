// --- LÓGICA DE CONTRASEÑAS STOKKA  ---

function togglePassword(inputId, iconId) {
    // Intentamos buscar por ID (compatibilidad) o por proximidad
    const icon = document.getElementById(iconId);
    const container = icon ? icon.closest('.position-relative') : null;
    const input = container ? container.querySelector('input') : document.getElementById(inputId);

    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

function checkInput(inputElementOrId, iconId) {
    const input = (typeof inputElementOrId === 'string')
        ? document.getElementById(inputElementOrId)
        : inputElementOrId;

    const container = input.closest('.position-relative');
    const icon = container ? container.querySelector('.fa-eye, .fa-eye-slash') : document.getElementById(iconId);

    if (input && icon) {
        if (input.value.length > 0) {
            icon.classList.remove('d-none');
        } else {
            icon.classList.add('d-none');
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

// Escuchador global para capturar inputs nuevos (como los de los modales AJAX)
document.addEventListener('input', function (e) {
    if (e.target.type === 'password' || e.target.id.includes('password')) {
        checkInput(e.target, null);
    }
});

function submitFotoForm() {
    document.getElementById('fotoForm').submit();
}

// --- LÓGICA DE AVISO PARA CAMBIO DE CORREO EN EDITAR PERFIL  ---
function confirmarGuardarPerfil() {
    var form = document.getElementById('formEditarPerfil');

    // Validación nativa del navegador (required, email format, etc.)
    if (!form.reportValidity()) return;

    var inputEmail = document.getElementById('inputEmailPerfil');
    var emailActual = inputEmail.dataset.emailOriginal.trim().toLowerCase();
    var emailNuevo = inputEmail.value.trim().toLowerCase();
    var emailCambiado = emailActual !== emailNuevo;

    if (emailCambiado) {
        // Mostramos el nuevo email en el modal de confirmación
        document.getElementById('nuevoEmailPreview').textContent = inputEmail.value.trim();
        var modal = new bootstrap.Modal(document.getElementById('modalConfirmarEmail'));
        modal.show();
    } else {
        form.submit();
    }
}

document.addEventListener("DOMContentLoaded", function () {

    // --- CARGA DINÁMICA DE MODAL EDITAR USUARIO (ADMIN)---
    const modalBody = document.getElementById('bodyEditarUsuario');

    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-cargar-editar')) {
            const btn = e.target.closest('.btn-cargar-editar');
            const url = btn.getAttribute('data-url');

            // Limpiamos y ponemos el spinner mientras carga
            modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';

            fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(response => response.text())
                .then(html => {
                    modalBody.innerHTML = html;
                })
                .catch(err => {
                    modalBody.innerHTML = '<div class="alert alert-danger">Error al cargar el formulario.</div>';
                });
        }
    });

    const errorAdminSignal = document.querySelector('[class*="open_admin_edit_modal_"]');

    if (errorAdminSignal) {
        // Extraemos el ID del nombre de la clase (ej: de 'open_admin_edit_modal_5' sacamos '5')
        const classList = errorAdminSignal.className.split(' ');
        const targetClass = classList.find(c => c.startsWith('open_admin_edit_modal_'));
        const userId = targetClass.split('_').pop();

        // 2. Buscamos el botón de editar de ESE usuario específico en la tabla
        // Usamos el atributo data-url que ya tienes para localizarlo
        const btnEditar = document.querySelector(`.btn-cargar-editar[data-url*="/${userId}/"]`);

        if (btnEditar) {
            setTimeout(() => {
                btnEditar.click(); // Esto dispara tu función fetch automáticamente

                // 3. El "Trim" / Auto-focus: 
                // Esperamos un poco a que el fetch termine de cargar el HTML en el modal
                setTimeout(() => {
                    const passInput = document.getElementById('id_password');
                    if (passInput) {
                        passInput.focus();
                        // Opcional: si quieres limpiar el campo si hubo error
                        passInput.value = '';
                    }
                }, 600); // Un pelín más de tiempo para asegurar que el fetch terminó
            }, 400);
        }
    }

    // --- CARGA DINÁMICA MODAL EDITAR PERFIL ---

    // 1. SELECTORES DE SEÑALES 
    const errorPerfil = document.querySelector('.open_edit_modal');
    const errorNuevoUsuario = document.querySelector('.open_add_modal');

    // 2. LÓGICA: ERROR EN EDITAR MI PERFIL (
    if (errorPerfil) {
        const btnPerfil = document.querySelector('.btn-cargar-editar-perfil');
        if (btnPerfil) {
            setTimeout(() => {
                btnPerfil.click(); // Esto disparará tu lógica de fetch automática
            }, 400);
        }
    }

    // 3. LÓGICA: ERROR EN NUEVO USUARIO (ESTÁTICO)
    if (errorNuevoUsuario) {
        const modalElement = document.getElementById('modalNuevoUsuario');
        if (modalElement) {
            console.log("Reabriendo modal Nuevo Usuario...");
            setTimeout(() => {
                const modalAdd = new bootstrap.Modal(modalElement);
                modalAdd.show();
            }, 400);
        }
    }

    // 4. REVISIÓN DEL FETCH 
    const btnCargarPerfil = document.querySelector('.btn-cargar-editar-perfil');
    const bodyPerfil = document.getElementById('bodyEditarPerfil');

    if (btnCargarPerfil && bodyPerfil) {
        btnCargarPerfil.addEventListener('click', function () {
            const url = this.getAttribute('data-url');
            console.log("Cargando contenido desde:", url);

            // Ponemos el spinner
            bodyPerfil.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';

            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(response => {
                    if (!response.ok) throw new Error('Error en red');
                    return response.text();
                })
                .then(html => {
                    bodyPerfil.innerHTML = html;
                    console.log("Contenido del perfil cargado con éxito.");
                })
                .catch(err => {
                    console.error("Error Fetch:", err);
                    bodyPerfil.innerHTML = '<div class="alert alert-danger m-3">Error al cargar el formulario.</div>';
                });
        });
    }

    // 2. LÓGICA DEL SIDEBAR Y OVERLAY
    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.querySelector(".dashboard-sidebar");

    // Solo ejecutamos si ambos elementos existen en el HTML
    if (toggleBtn && sidebar) {
        // Crear overlay dinámicamente si no existe ya
        let overlay = document.querySelector(".sidebar-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.classList.add("sidebar-overlay");
            document.body.appendChild(overlay);
        }

        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
        });

        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }

    // 3. OCULTAR BARRA INFERIOR AL HACER SCROLL (Mobile)
    let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollThreshold = 15;

    window.addEventListener('scroll', function (e) {
        if (!sidebar) return; // Si no hay sidebar, no hacemos nada

        let currentScrollY = window.pageYOffset || document.documentElement.scrollTop || (e.target.scrollTop > 0 ? e.target.scrollTop : 0);

        // Si estamos arriba del todo, siempre mostrar
        if (currentScrollY <= 10) {
            sidebar.classList.remove('sidebar-hidden');
            lastScrollY = currentScrollY;
            return;
        }

        const delta = currentScrollY - lastScrollY;

        if (Math.abs(delta) > scrollThreshold) {
            // Solo ocultamos si estamos en formato móvil (barra inferior)
            if (window.innerWidth <= 991) {
                if (delta > 0) {
                    sidebar.classList.add('sidebar-hidden');
                } else {
                    sidebar.classList.remove('sidebar-hidden');
                }
            }
            lastScrollY = currentScrollY;
        }
    }, true);

    const successAlerts = document.querySelectorAll('#container-mensajes .alert-success-stokka');
    successAlerts.forEach(function (alert) {
        setTimeout(function () {
            if (alert) {
                alert.classList.remove('show');

                setTimeout(function () {
                    alert.remove();
                }, 600);
            }
        }, 3000);
    });

});

/* ICONO INFORMACIÓN */
document.addEventListener('DOMContentLoaded', () => {
    const icons = document.querySelectorAll('.info-icon');

    icons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            // Cerramos otros iconos abiertos
            icons.forEach(i => i !== icon && i.classList.remove('active'));
            // Alternamos el actual
            icon.classList.toggle('active');
        });
    });

    // Cerrar al hacer clic fuera del icono
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('info-icon')) {
            icons.forEach(icon => icon.classList.remove('active'));
        }
    });
});

// =============================================================================
// ACCESIBILIDAD: SISTEMA DINÁMICO DE FILTROS (SVG)
// =============================================================================

/**
 * Aplica el filtro global a toda la aplicación
 */
function aplicarFiltroCSS(tipo) {
    // Limpieza de estados previos
    document.documentElement.style.filter = '';
    document.documentElement.classList.remove('alto-contraste');

    if (!tipo || tipo === 'normal') return;

    if (tipo === 'alto_contraste') {
        document.documentElement.classList.add('alto-contraste');
    } else {
        // Aplicamos el filtro SVG definido en el base.html
        document.documentElement.style.filter = `url(#${tipo}-filter)`;
    }
}

/**
 * Actualiza la vista previa del panel de ajustes sin afectar a toda la web aún
 */
function actualizarPreviewDaltonismo(tipo) {
    const contenedorPreview = document.getElementById('preview-daltonismo'); 
    if (!contenedorPreview) return;

    // Limpiamos filtros en la zona de preview
    contenedorPreview.style.filter = '';
    contenedorPreview.classList.remove('alto-contraste');

    if (tipo === 'normal') return;

    if (tipo === 'alto_contraste') {
        contenedorPreview.classList.add('alto-contraste');
        // Pequeño ajuste manual para la preview de alto contraste
        contenedorPreview.style.filter = 'contrast(150%) brightness(110%)';
    } else {
        contenedorPreview.style.filter = `url(#${tipo}-filter)`;
    }
}

// PERSISTENCIA: Enviar a Django
async function guardarEnBaseDeDatos(tipo) {
    if (!window.STOKKA_PREFS) return;
    try {
        const response = await fetch(window.STOKKA_PREFS.urls.pref_daltonismo, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.STOKKA_PREFS.csrfToken
            },
            body: JSON.stringify({ tipo: tipo })
        });
        return await response.json();
    } catch (error) {
        console.error("Error guardando preferencia:", error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 1. Cargar preferencia inicial desde el servidor
    const preferenciaInicial = window.STOKKA_PREFS ? window.STOKKA_PREFS.daltonismo : 'normal';
    aplicarFiltroCSS(preferenciaInicial);

    // 2. Lógica del Panel de Ajustes
    const panel = document.getElementById('panelDaltonismo');
    if (!panel) return;

    let tipoSeleccionado = preferenciaInicial;

    function marcarActivo(tipo) {
        document.querySelectorAll('.btn-daltonismo').forEach(btn => {
            const esActivo = btn.dataset.tipo === tipo;
            btn.classList.toggle('activo', esActivo);
            // Si es activo usamos el verde principal, si no un gris suave
            btn.style.borderColor = esActivo ? 'var(--verde-stokka)' : '#dee2e6';
            btn.style.borderWidth = esActivo ? '2px' : '1px';
        });
    }

    // Estado inicial del panel
    marcarActivo(tipoSeleccionado);
    actualizarPreviewDaltonismo(tipoSeleccionado);

    // Eventos de selección
    document.querySelectorAll('.btn-daltonismo').forEach(btn => {
        btn.addEventListener('click', function () {
            tipoSeleccionado = this.dataset.tipo;
            marcarActivo(tipoSeleccionado);
            actualizarPreviewDaltonismo(tipoSeleccionado);
            // OPCIONAL: aplicar en vivo mientras eligen. 
            // Si prefieres que solo cambie al dar a "Aplicar", comenta la línea de abajo.
            aplicarFiltroCSS(tipoSeleccionado); 
        });
    });

    // Botón Aplicar
    document.getElementById('btnAplicarDaltonismo')?.addEventListener('click', async function () {
        this.disabled = true;
        const textoOriginal = this.innerHTML;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Guardando...';

        await guardarEnBaseDeDatos(tipoSeleccionado);
        window.STOKKA_PREFS.daltonismo = tipoSeleccionado;
        
        // Recarga para asentar todos los cambios de color del servidor
        location.reload(); 
    });

    // Botón Restablecer
    document.getElementById('btnRestablecerDaltonismo')?.addEventListener('click', async function () {
        tipoSeleccionado = 'normal';
        await guardarEnBaseDeDatos('normal');
        location.reload();
    });
});

// =============================================================================
// ICONOS INFORMATIVOS — OCULTADO PERMANENTE
// Los info-icon-2 se pueden ocultar globalmente por usuario.
// Los info-icon (registro) nunca se tocan.
// =============================================================================

function aplicarEstadoIconos() {
    const esMovil = window.innerWidth < 992;
    const sesionInfo = sessionStorage.getItem('stokka_iconos_session');
    let visibles;

    if (sesionInfo !== null) {
        visibles = sesionInfo === 'true';
    } else {
        visibles = window.STOKKA_PREFS ? window.STOKKA_PREFS.iconos_info : true;
    }

    document.querySelectorAll('.info-icon-2').forEach(icon => {
        if (esMovil) {
            icon.style.setProperty('display', 'none', 'important');
        } else {
            icon.style.setProperty('display', visibles ? 'inline-flex' : 'none', 'important');
        }
    });

    const toggle = document.getElementById('toggleIconosInfo');
    if (toggle) {
        toggle.checked = visibles;
        if (esMovil) {
            toggle.disabled = true;
            actualizarLabelToggle(false, true);
        } else {
            toggle.disabled = false;
            actualizarLabelToggle(visibles, false);
        }
    }
}

function actualizarLabelToggle(visibles, esMovil) {
    const label = document.getElementById('labelToggleIconos');
    if (!label) return;

    if (esMovil) {
        label.textContent = 'No disponible en móvil';
        label.style.color = 'var(--rojo-alerta)';
    } else {
        label.textContent = visibles ? 'Iconos de ayuda visibles' : 'Iconos de ayuda ocultos';
        label.style.color = visibles ? 'var(--verde-stokka)' : 'var(--rojo-alerta)';
    }
}

async function guardarPreferenciaIconos(visibles) {
    sessionStorage.setItem('stokka_iconos_session', visibles);

    if (!window.STOKKA_PREFS) return;

    try {
        const response = await fetch(window.STOKKA_PREFS.urls.pref_iconos, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.STOKKA_PREFS.csrfToken
            },
            body: JSON.stringify({ visibles: visibles })
        });

        if (response.ok) {
            window.STOKKA_PREFS.iconos_info = visibles;
        }
    } catch (error) {
        console.error("Error al guardar preferencia de iconos:", error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 1. Aplicar estado inicial
    aplicarEstadoIconos();

    // 2. Escuchar cambios de tamaño de pantalla
    window.addEventListener('resize', aplicarEstadoIconos);

    // 3. Manejar el cambio del switch (solo Desktop)
    const toggle = document.getElementById('toggleIconosInfo');
    if (toggle) {
        toggle.addEventListener('change', async function () {
            const estadoActual = this.checked;

            // Aplicar inmediatamente de forma visual
            document.querySelectorAll('.info-icon-2').forEach(icon => {
                icon.style.setProperty('display', estadoActual ? 'inline-flex' : 'none', 'important');
            });
            actualizarLabelToggle(estadoActual, false);

            // Guardar en Base de Datos
            await guardarPreferenciaIconos(estadoActual);
        });
    }

    // 4. Lógica de click para los iconos (mostrar info)
    document.addEventListener('click', function (e) {
        const icon = e.target.closest('.info-icon-2');
        if (!icon) {
            document.querySelectorAll('.info-icon-2.active').forEach(i => i.classList.remove('active'));
            return;
        }
        const estaActivo = icon.classList.contains('active');
        document.querySelectorAll('.info-icon-2.active').forEach(i => i.classList.remove('active'));
        if (!estaActivo) icon.classList.add('active');
    });
});