// BOTON CONFIRMAR ELIMINACIÓN DE LA EMPRESA + MODALES
document.addEventListener('DOMContentLoaded', function () {
    const inputNombre = document.getElementById('inputConfirmacionEmpresa');
    const btnSiguiente = document.getElementById('btnSiguienteEliminar');
    const btnIrAlUltimo = document.getElementById('btnIrAlUltimoPaso');
    const inputHidden = document.getElementById('inputHiddenNombre');

    // Instancias de los modales
    const m1 = new bootstrap.Modal(document.getElementById('modalEliminarEmpresa'));
    const m2 = new bootstrap.Modal(document.getElementById('modalConfirmacionFinal'));
    const m3 = new bootstrap.Modal(document.getElementById('modalUltimoAviso'));

    // 1. Validar nombre en Modal 1
    inputNombre.addEventListener('input', function () {
        const nombreReal = this.getAttribute('data-nombre').trim();
        const match = this.value.trim() === nombreReal;
        btnSiguiente.disabled = !match;
        btnSiguiente.style.opacity = match ? '1' : '0.5';
    });

    // 2. De Modal 1 a Modal 2
    btnSiguiente.addEventListener('click', function() {
        inputHidden.value = inputNombre.value; // Guardamos el nombre para el form final
        m1.hide();
        setTimeout(() => m2.show(), 400); // Pequeño delay para suavidad
    });

    // 3. De Modal 2 a Modal 3
    btnIrAlUltimo.addEventListener('click', function() {
        m2.hide();
        setTimeout(() => m3.show(), 400);
    });
});

// Sincroniza el color picker con el input de texto y el preview
function sincronizarColor(pickId, hexId, prevId, varCSS) {
    const pick = document.getElementById(pickId);
    const hex  = document.getElementById(hexId);
    const prev = document.getElementById(prevId);

    // Picker → texto y preview
    pick.addEventListener('input', function () {
        hex.value = this.value;
        prev.style.background = this.value;
        document.documentElement.style.setProperty(varCSS, this.value);
    });

    // Texto → picker y preview (cuando sea un hex válido)
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

// Colores aleatorios
function aplicarAleatorios() {
    const aleatorio = () => '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    const pares = [
        ['pick-verde',      'hex-verde',      'prev-verde',      '--verde-stokka'],
        ['pick-secundario', 'hex-secundario', 'prev-secundario', '--verde-secundario'],
        ['pick-rojo',       'hex-rojo',       'prev-rojo',       '--rojo-alerta'],
        ['pick-amarillo',   'hex-amarillo',   'prev-amarillo',   '--amarillo-alerta'],
    ];
    pares.forEach(([pickId, hexId, prevId, varCSS]) => {
        const color = aleatorio();
        document.getElementById(pickId).value = color;
        document.getElementById(hexId).value  = color;
        document.getElementById(prevId).style.background = color;
        document.documentElement.style.setProperty(varCSS, color);
    });
}

// Confirmación de nombre de empresa para eliminar (lógica de los 3 modales)
const inputConf  = document.getElementById('inputConfirmacionEmpresa');
const btnSiguiente = document.getElementById('btnSiguienteEliminar');
const nombreEmpresa = inputConf ? inputConf.dataset.nombre : '';

if (inputConf && btnSiguiente) {
    inputConf.addEventListener('input', function () {
        const match = this.value === nombreEmpresa;
        btnSiguiente.disabled = !match;
        btnSiguiente.style.opacity = match ? '1' : '0.5';
    });

    btnSiguiente.addEventListener('click', function () {
        // Pasamos el nombre al modal final
        document.getElementById('inputHiddenNombre').value = inputConf.value;
        // Cerramos modal 1 y abrimos modal 2
        bootstrap.Modal.getInstance(document.getElementById('modalEliminarEmpresa')).hide();
        new bootstrap.Modal(document.getElementById('modalConfirmacionFinal')).show();
    });
}

document.getElementById('btnIrAlUltimoPaso')?.addEventListener('click', function () {
    bootstrap.Modal.getInstance(document.getElementById('modalConfirmacionFinal')).hide();
    new bootstrap.Modal(document.getElementById('modalUltimoAviso')).show();
});

