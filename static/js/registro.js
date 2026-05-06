document.addEventListener('DOMContentLoaded', function () {

    // Formateo automático número tarjeta: grupos de 4
    document.getElementById('inputTarjeta').addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = v.match(/.{1,4}/g)?.join(' ') || v;

        // Icono según tipo de tarjeta
        const icono = document.getElementById('iconoTarjeta');
        if (v.startsWith('4')) {
            icono.innerHTML = '<i class="fa-brands fa-cc-visa" style="color:#1a1f71;"></i>';
        } else if (/^5[1-5]/.test(v) || /^2[2-7]/.test(v)) {
            icono.innerHTML = '<i class="fa-brands fa-cc-mastercard" style="color:#eb001b;"></i>';
        } else if (/^3[47]/.test(v)) {
            icono.innerHTML = '<i class="fa-brands fa-cc-amex" style="color:#007bc1;"></i>';
        } else {
            icono.innerHTML = '<i class="fa-regular fa-credit-card" style="color:#aaa;"></i>';
        }
    });

    // Formateo automático caducidad: MM / AA
    document.getElementById('inputCaducidad').addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '').substring(0, 4);
        if (v.length >= 3) {
            this.value = v.substring(0, 2) + ' / ' + v.substring(2);
        } else {
            this.value = v;
        }
    });

    // Solo números en CVV
    document.getElementById('inputCVV').addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });

    // Solo letras en titular
    document.getElementById('inputTitular').addEventListener('input', function () {
        this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
    });

    // Spinner al enviar
    document.getElementById('formPago').addEventListener('submit', function (e) {
        // Validación básica antes de mostrar el spinner
        const titular   = document.getElementById('inputTitular').value.trim();
        const tarjeta   = document.getElementById('inputTarjeta').value.replace(/\s/g, '');
        const caducidad = document.getElementById('inputCaducidad').value;
        const cvv       = document.getElementById('inputCVV').value;

        if (!titular || tarjeta.length < 13 || caducidad.length < 7 || cvv.length < 3) {
            e.preventDefault();
            // Marcamos los campos vacíos
            [
                { el: document.getElementById('inputTitular'),   val: titular },
                { el: document.getElementById('inputTarjeta'),   val: tarjeta },
                { el: document.getElementById('inputCaducidad'), val: caducidad },
                { el: document.getElementById('inputCVV'),       val: cvv },
            ].forEach(({ el, val }) => {
                el.classList.toggle('is-invalid', !val || val.length < 2);
            });
            return;
        }

        // Todo OK — mostramos spinner y deshabilitamos el botón
        document.getElementById('textoBtnPagar').classList.add('d-none');
        document.getElementById('spinnerPagar').classList.remove('d-none');
        document.getElementById('btnPagar').disabled = true;
    });
});