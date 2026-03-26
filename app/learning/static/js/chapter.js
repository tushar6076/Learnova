$(document).ready(function() {
    // Cache elements for better performance
    const $videoFrame = $("#ch-video");
    const $titleDisplay = $("#active-lecture-title");
    const $breadcrumb = $("#breadcrumb-chapter");

    // 1. Initial Setup: Center the active lecture in the playlist on load
    const activeItem = document.querySelector('.lecture-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'center' 
        });
    }

    // 2. Click Handler for the Video Playlist
    $(document).on("click", ".lecture-item", function() {
        const $this = $(this);
        const videoUrl = $this.data("video");
        const videoTitle = $this.data("title");

        // Prevent redundant clicks
        if ($this.hasClass("active")) return;

        // UI: Update active state
        $(".lecture-item").removeClass("active");
        $this.addClass("active");

        // --- Video Player Transition ---
        $videoFrame.fadeOut(250, function() {
            // Force autoplay on selection
            const separator = videoUrl.includes('?') ? '&' : '?';
            const autoplayUrl = videoUrl + separator + "autoplay=1";
            
            $(this).attr("src", autoplayUrl)
                   .attr("title", videoTitle) 
                   .fadeIn(250);
        });
        
        // --- Title Display Transition ---
        $titleDisplay.fadeOut(150, function() {
            $(this).text(videoTitle).fadeIn(150);
        });

        // --- Breadcrumb Update ---
        // Clean title: "Lecture 1: Limits" becomes "Limits"
        const cleanTitle = videoTitle.includes(':') 
            ? videoTitle.split(':').pop().trim() 
            : videoTitle;
        
        $breadcrumb.fadeOut(150, function() {
            $(this).text(cleanTitle).fadeIn(150);
        });
        
        // --- Mobile UX: Scroll to player ---
        if ($(window).width() < 992) {
            $('html, body').animate({
                scrollTop: $videoFrame.offset().top - 100
            }, 600);
        }
    });

    // 3. AI PDF Generation Handler
    $('#btn-gen-pdf').on('click', function() {
        const chapterId = $(this).data('chapter-id');
        fetchPDF(chapterId);
    });
});

/**
 * Fetches generated PDF path from the server
 * @param {string|number} chapterId 
 */
async function fetchPDF(chapterId) {
    const btn = document.getElementById('btn-gen-pdf');
    const container = document.getElementById('pdf-container');
    
    if (!btn || !container) return;

    // UI Feedback: Loading State
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>AI is writing notes...`;

    try {
        const response = await fetch(`/learn/chapter/${chapterId}/get_pdf`);
        const data = await response.json();

        if (data.file_path) {
            // Smooth transition to Success/Download state
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = `
                    <a href="${data.file_path}" class="btn btn-success w-100 shadow-sm animate__animated animate__bounceIn" download>
                        <i class="bi bi-download me-2"></i>Download Ready
                    </a>`;
                container.style.opacity = '1';
            }, 200);
        } else {
            alert("Generation failed. Please try again.");
            resetPdfButton(btn);
        }
    } catch (err) {
        console.error("PDF Fetch Error:", err);
        resetPdfButton(btn, true);
    }
}

function resetPdfButton(btn, isError = false) {
    btn.disabled = false;
    btn.innerHTML = isError 
        ? `<i class="bi bi-exclamation-triangle me-2"></i>Error. Try Again.` 
        : `<i class="bi bi-magic me-2"></i>Generate AI Notes`;
}