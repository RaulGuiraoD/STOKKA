document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('filtro-historial');
    const tableRows = document.querySelectorAll('#tabla-historial tbody tr');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();

            tableRows.forEach(row => {
                // Buscamos en toda la fila para que sea flexible (producto o usuario)
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
});