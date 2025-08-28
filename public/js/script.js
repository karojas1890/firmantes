document.addEventListener('DOMContentLoaded', function() {
    const firmasBody = document.getElementById('firmas-body');
    const totalFirmasElement = document.getElementById('total-firmas');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const updateDateElement = document.getElementById('update-date');

    let allFirmas = [];
    let filteredFirmas = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let currentSort = { column: 'timestamp', direction: 'desc' };

    // Formatear fecha
    function formatDate(dateString) {
        if (!dateString || dateString === 'N/A') return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    // Cargar datos
    async function loadFirmas() {
        try {
            const response = await fetch('/api/firmas');
            if (!response.ok) throw new Error('Error al cargar los datos');
            
            const data = await response.json();
            allFirmas = data.map(item => ({
                timestamp: item.timestamp,
                nombre: item.nombre
            }));
            
            filteredFirmas = [...allFirmas];
            updateTotalFirmas();
            sortFirmas(currentSort.column, currentSort.direction);
            renderFirmas();
            updateDateElement.textContent = new Date().toLocaleDateString('es-ES');
        } catch (error) {
            console.error('Error:', error);
            firmasBody.innerHTML = `<tr><td colspan="2" class="error">Error al cargar los datos: ${error.message}</td></tr>`;
        }
    }

    // Renderizar firmas en la tabla
    function renderFirmas() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedFirmas = filteredFirmas.slice(startIndex, startIndex + itemsPerPage);
        
        if (paginatedFirmas.length === 0) {
            firmasBody.innerHTML = `<tr><td colspan="2" class="no-data">No se encontraron firmas</td></tr>`;
            return;
        }
        
        firmasBody.innerHTML = paginatedFirmas.map(firma => `
            <tr>
                <td>${formatDate(firma.timestamp)}</td>
                <td>${firma.nombre}</td>
            </tr>
        `).join('');
        
        updatePagination();
    }

    // Actualizar el total de firmas
    function updateTotalFirmas() {
        totalFirmasElement.textContent = filteredFirmas.length.toLocaleString();
    }

    // Ordenar firmas
    function sortFirmas(column, direction) {
        filteredFirmas.sort((a, b) => {
            let valueA = a[column] || '';
            let valueB = b[column] || '';
            
            if (column === 'timestamp') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
            }
            
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        currentSort = { column, direction };
        currentPage = 1;
        renderFirmas();
    }

    // Actualizar paginación
    function updatePagination() {
        const totalPages = Math.ceil(filteredFirmas.length / itemsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Filtrar firmas por búsqueda
    function filterFirmas() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredFirmas = [...allFirmas];
        } else {
            filteredFirmas = allFirmas.filter(firma => 
                firma.nombre.toLowerCase().includes(searchTerm)
            );
        }
        
        currentPage = 1;
        updateTotalFirmas();
        sortFirmas(currentSort.column, currentSort.direction);
    }

    // Event listeners
    searchInput.addEventListener('input', filterFirmas);
    searchBtn.addEventListener('click', filterFirmas);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            if (this.dataset.filter === 'recent') {
                sortFirmas('timestamp', 'desc');
            } else {
                sortFirmas('timestamp', 'asc');
            }
        });
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderFirmas();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredFirmas.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderFirmas();
        }
    });
    
    // Inicializar
    loadFirmas();
});