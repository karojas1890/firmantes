document.addEventListener('DOMContentLoaded', function() {
    const firmasBody = document.getElementById('firmas-body');
    const totalFirmas = document.getElementById('total-firmas');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const updateDate = document.getElementById('update-date');
    
    let allFirmas = [];
    let filteredFirmas = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let currentSort = { column: 'timestamp', direction: 'desc' };
    
    // Formatear fecha de actualización
    updateDate.textContent = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Cargar datos
    loadFirmas();
    
    async function loadFirmas() {
        try {
            firmasBody.innerHTML = '<tr><td colspan="3" class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando firmas...</td></tr>';
            
            const response = await fetch('/api/firmas');
            if (!response.ok) throw new Error('Error al cargar los datos');
            
            allFirmas = await response.json();
            totalFirmas.textContent = allFirmas.length.toLocaleString();
            
            filteredFirmas = [...allFirmas];
            sortFirmas(currentSort.column, currentSort.direction);
            renderFirmas();
            
        } catch (error) {
            console.error('Error:', error);
            firmasBody.innerHTML = `<tr><td colspan="3" class="error"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
        }
    }
    
    function renderFirmas() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageFirmas = filteredFirmas.slice(startIndex, endIndex);
        
        if (pageFirmas.length === 0) {
            firmasBody.innerHTML = '<tr><td colspan="3" class="loading">No se encontraron firmas</td></tr>';
            return;
        }
        
        let html = '';
        pageFirmas.forEach(firma => {
            html += `
                <tr>
                    <td>${formatDate(firma.timestamp)}</td>
                    <td>${firma.nombre}</td>
                    <td>${firma.codigo}</td>
                </tr>
            `;
        });
        
        firmasBody.innerHTML = html;
        updatePagination();
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES');
        } catch (e) {
            return dateString;
        }
    }
    
    function updatePagination() {
        const totalPages = Math.ceil(filteredFirmas.length / itemsPerPage);
        
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    function sortFirmas(column, direction) {
        filteredFirmas.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            if (column === 'timestamp') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else {
                valueA = valueA ? valueA.toString().toLowerCase() : '';
                valueB = valueB ? valueB.toString().toLowerCase() : '';
            }
            
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // Event listeners
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredFirmas = [...allFirmas];
        } else {
            filteredFirmas = allFirmas.filter(firma => 
                (firma.nombre && firma.nombre.toLowerCase().includes(searchTerm)) ||
                (firma.codigo && firma.codigo.toLowerCase().includes(searchTerm))
            );
        }
        
        currentPage = 1;
        sortFirmas(currentSort.column, currentSort.direction);
        renderFirmas();
    }
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            
            if (filter === 'recent') {
                filteredFirmas = [...allFirmas];
                currentSort = { column: 'timestamp', direction: 'desc' };
                sortFirmas('timestamp', 'desc');
            } else {
                filteredFirmas = [...allFirmas];
                sortFirmas(currentSort.column, currentSort.direction);
            }
            
            currentPage = 1;
            renderFirmas();
        });
    });
    
    // Ordenar por columnas
    document.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.cellIndex === 0 ? 'timestamp' : 
                          this.cellIndex === 1 ? 'nombre' : 'codigo';
            
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = { column, direction: 'asc' };
            }
            
            sortFirmas(currentSort.column, currentSort.direction);
            renderFirmas();
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
});