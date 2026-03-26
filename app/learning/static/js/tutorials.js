$(document).ready(function() {
    let dbCurriculum = [];

    // 1. Initial State: Show a subtle loader in the accordion
    $("#curriculumAccordion").html('<div class="p-4 text-center"><div class="spinner-border spinner-border-sm text-primary"></div></div>');

    // 2. Fetch Personalized Data
    $.getJSON('/api/get_user_curriculum', function(data) {
        dbCurriculum = data;
        renderAccordion(data);
    }).fail(function() {
        $("#curriculumAccordion").html('<p class="p-3 text-danger small">Failed to load curriculum. Please refresh.</p>');
    });

    function renderAccordion(data) {
        if (data.length === 0) {
            $("#curriculumAccordion").html(`
                <div class="p-4 text-center">
                    <p class="text-muted mb-3">Your curriculum is empty.</p>
                    <a href="/profile" class="btn btn-sm btn-outline-primary">Customize Subjects</a>
                </div>`);
            return;
        }

        let html = "";
        data.forEach((item, sIndex) => {
            html += `
                <div class="accordion-item border-0 mb-2 shadow-sm">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#sub-${sIndex}">
                            <i class="bi ${item.icon || 'bi-book'} me-2 text-primary"></i> ${item.subject}
                        </button>
                    </h2>
                    <div id="sub-${sIndex}" class="accordion-collapse collapse" data-bs-parent="#curriculumAccordion">
                        <div class="accordion-body p-0">
                            <div class="list-group list-group-flush">
                                ${item.chapters.map((ch, cIndex) => `
                                    <a href="#" class="list-group-item chapter-btn py-3 px-4" 
                                       data-sidx="${sIndex}" data-cidx="${cIndex}">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-play-circle me-3 opacity-50"></i>
                                            <span>${ch.title}</span>
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        $("#curriculumAccordion").hide().html(html).fadeIn(400);
    }

    // 3. Handle Chapter Selection (Preview)
    $(document).on('click', '.chapter-btn', function(e) {
        e.preventDefault();
        const $this = $(this);
        const sIdx = $this.data('sidx');
        const cIdx = $this.data('cidx');
        const chapter = dbCurriculum[sIdx].chapters[cIdx];

        // UI: Manage Active State using your CSS definitions
        $(".chapter-btn").removeClass("active");
        $this.addClass("active");

        // UI: Content Swap
        $("#content-placeholder").fadeOut(200, function() {
            $("#main-chapter-title").text(chapter.title);
            $("#chapter-intro").text(
                (chapter.intro ? chapter.intro.slice(0, 400) + '......' : "Dive into this chapter to explore the core concepts and master the fundamentals.")
            );
            $("#enter-chapter-btn").attr("href", `/learn/chapter/${chapter.chapter_id}`);
            
            $("#chapter-workspace").hide().removeClass('d-none').fadeIn(300);
        });
    });
});