document.addEventListener('DOMContentLoaded', function () {

    // ── MODALES DE ELIMINACIÓN ────────────────────────────────────────────────
    const elM1 = document.getElementById('modalEliminarEmpresa');
    const elM2 = document.getElementById('modalConfirmacionFinal');
    const elM3 = document.getElementById('modalUltimoAviso');

    if (!elM1 || !elM2 || !elM3) return;

    // Usamos getOrCreateInstance para que Bootstrap nunca tenga dos instancias
    // del mismo modal — es la raíz del backdrop huérfano
    const m1 = bootstrap.Modal.getOrCreateInstance(elM1);
    const m2 = bootstrap.Modal.getOrCreateInstance(elM2);
    const m3 = bootstrap.Modal.getOrCreateInstance(elM3);

    const inputNombre  = document.getElementById('inputConfirmacionEmpresa');
    const btnSiguiente = document.getElementById('btnSiguienteEliminar');
    const btnIrUltimo  = document.getElementById('btnIrAlUltimoPaso');
    const inputHidden  = document.getElementById('inputHiddenNombre');

    // Validar nombre en Modal 1
    inputNombre?.addEventListener('input', function () {
        const match = this.value.trim() === this.getAttribute('data-nombre').trim();
        btnSiguiente.disabled    = !match;
        btnSiguiente.style.opacity = match ? '1' : '0.5';
    });

    // Modal 1 → Modal 2
    btnSiguiente?.addEventListener('click', function () {
        inputHidden.value = inputNombre.value;
        // Esperamos a que el modal anterior termine de cerrarse antes de abrir el siguiente
        elM1.addEventListener('hidden.bs.modal', function abrirM2() {
            elM1.removeEventListener('hidden.bs.modal', abrirM2);
            m2.show();
        });
        m1.hide();
    });

    // Modal 2 → Modal 3
    btnIrUltimo?.addEventListener('click', function () {
        elM2.addEventListener('hidden.bs.modal', function abrirM3() {
            elM2.removeEventListener('hidden.bs.modal', abrirM3);
            m3.show();
        });
        m2.hide();
    });

    // Al cerrar cualquier modal, nos aseguramos de limpiar el backdrop
    [elM1, elM2, elM3].forEach(el => {
        el.addEventListener('hidden.bs.modal', function () {
            // Si no hay ningún modal abierto, forzamos limpieza del backdrop
            const hayModalAbierto = document.querySelector('.modal.show');
            if (!hayModalAbierto) {
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            }
        });
    });

    // ── COLORES ───────────────────────────────────────────────────────────────
    function sincronizarColor(pickId, hexId, prevId, varCSS) {
        const pick = document.getElementById(pickId);
        const hex  = document.getElementById(hexId);
        const prev = document.getElementById(prevId);
        if (!pick || !hex || !prev) return;

        pick.addEventListener('input', function () {
            hex.value = this.value;
            prev.style.background = this.value;
            document.documentElement.style.setProperty(varCSS, this.value);
        });

        hex.addEventListener('input', function () {
            if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                pick.value = this.value;
                prev.style.background = this.value;
                document.documentElement.style.setProperty(varCSS, this.value);
            }
        });
    }

    sincronizarColor('pick-verde',      'hex-verde',      'prev-verde',      '--verde-stokka');
    sincronizarColor('pick-secundario', 'hex-secundario', 'prev-secundario', '--verde-secundario');
    sincronizarColor('pick-rojo',       'hex-rojo',       'prev-rojo',       '--rojo-alerta');
    sincronizarColor('pick-amarillo',   'hex-amarillo',   'prev-amarillo',   '--amarillo-alerta');
});

// Fuera del DOMContentLoaded para que esté disponible como función global (llamada desde onclick)
function aplicarAleatorios() {
    const aleatorio = () => '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    [
        ['pick-verde',      'hex-verde',      'prev-verde',      '--verde-stokka'],
        ['pick-secundario', 'hex-secundario', 'prev-secundario', '--verde-secundario'],
        ['pick-rojo',       'hex-rojo',       'prev-rojo',       '--rojo-alerta'],
        ['pick-amarillo',   'hex-amarillo',   'prev-amarillo',   '--amarillo-alerta'],
    ].forEach(([pickId, hexId, prevId, varCSS]) => {
        const color = aleatorio();
        document.getElementById(pickId).value = color;
        document.getElementById(hexId).value  = color;
        document.getElementById(prevId).style.background = color;
        document.documentElement.style.setProperty(varCSS, color);
    });
}