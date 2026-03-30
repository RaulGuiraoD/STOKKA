function checkInput(inputElementOrId, iconId) {
    const input = (typeof inputElementOrId === 'string') 
        ? document.getElementById(inputElementOrId) 
        : inputElementOrId;
    const icon = document.getElementById(iconId);
    
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

function togglePassword(inputId, iconId) {
    const icon = document.getElementById(iconId);
    if (!icon) return;

    // Buscamos el input dentro del mismo contenedor relativo
    const container = icon.closest('.position-relative');
    const input = container ? container.querySelector('input') : null;

    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}