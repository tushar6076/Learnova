document.addEventListener('DOMContentLoaded', () => {
    // Optional: Make the whole row clickable for better UX
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
            // Don't trigger if they clicked a specific button/link inside the row
            if (e.target.tagName !== 'A' && e.target.tagName !== 'I') {
                const link = row.querySelector('td.text-end a');
                if (link) window.location.href = link.href;
            }
        });
    });
});