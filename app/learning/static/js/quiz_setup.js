$(document).ready(function() {
    let allResults = []; 
    let userCurriculum = [];

    let myChart;

    let isShowingAll = false;

    const $configEl = $("#quiz-form-config");
    let selectedSubject = null;
    let selectedChapter = null;

    if ($configEl.length) {
        const config = $configEl.data();
        selectedSubject = config.subject;
        selectedChapter = config.chapter;
    }

    // --- 1. Combined Initialization ---
    function initialize() {
        $.get('/api/quiz-history', function(data) {
            // FORCE SORT BY DATE IMMEDIATELY (Oldest to Newest)
            allResults = data.map(r => ({
                ...r,
                percentage: parseFloat(r.percentage) || 0,
                // Ensure date is parseable; if using DD-MM-YYYY, adjust parsing here
                timestamp: new Date(r.date).getTime() 
            })).sort((a, b) => a.timestamp - b.timestamp);

            applyFilters(); 
        });

        $.get('/api/get_user_curriculum', function(data) {
            userCurriculum = data;
            let subjectOptions = '<option value="all">All Subjects</option>';
            data.forEach(item => {
                subjectOptions += `<option value="${item.subject}">${item.subject}</option>`;
            });
            
            $('#global-subject-filter, #config-subject').html(subjectOptions);

            if (selectedSubject) {
                $('#config-subject, #global-subject-filter').val(selectedSubject);
                updateChapters(selectedSubject);
                if (selectedChapter) {
                    $('#config-chapter').val(selectedChapter);
                }
            }
        });
    }

    // --- 2. Filter & Render Engine ---
    function applyFilters() {
        const sub = $('#global-subject-filter').val();
        const diff = $('#global-difficulty-filter').val();
        const timeDays = $('#global-time-filter').val();

        const filtered = allResults.filter(r => {
            const matchSub = (sub === 'all' || r.subject === sub);
            const matchDiff = (diff === 'all' || r.difficulty.toLowerCase() === diff);
            
            let matchTime = true;
            if (timeDays !== 'all') {
                const limitDate = new Date();
                limitDate.setDate(limitDate.getDate() - parseInt(timeDays));
                matchTime = new Date(r.date) >= limitDate;
            }

            return matchSub && matchDiff && matchTime;
        });

        renderTable([...filtered].reverse()); // Table shows newest first
        renderChart(filtered);               // Chart shows oldest to newest (left to right)
    }

    function renderTable(data) {
        if (!data || data.length === 0) {
            $('#results-body').html('<tr><td colspan="5" class="text-center py-4 text-muted">No history found.</td></tr>');
            $('#show-all-results').hide();
            return;
        }

        // Determine which data to show
        const displayData = isShowingAll ? data : data.slice(0, 5);

        let tableHtml = displayData.map(r => {
            const dateObj = new Date(r.date);
            const prettyDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

            return `
                <tr>
                    <td>${prettyDate}</td>
                    <td><span class="badge bg-light text-dark border">${r.subject}</span></td>
                    <td><small>${r.chapter}</small></td>
                    <td class="fw-bold ${r.percentage >= 75 ? 'text-success' : 'text-warning'}">${r.percentage}%</td>
                    <td>
                        <span class="badge ${getDifficultyClass(r.difficulty)}">
                            ${r.difficulty}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
        $('#results-body').html(tableHtml);

        // Update visibility and scroll box height
        if (data.length <= 5) {
            $('#show-all-results').hide();
            $('.table-responsive').css('max-height', 'none'); // No need to scroll if it's short
        } else {
            $('#show-all-results').show().text(isShowingAll ? "Show Less" : "See All");
            
            // If showing all, lock the height to enable scrolling
            // If showing less, let it be auto
            $('.table-responsive').css('max-height', isShowingAll ? '400px' : 'none');
        }
    }
    // Helper for color coding difficulty (optional but nice)
    function getDifficultyClass(diff) {
        const d = diff.toLowerCase();
        if (d === 'hard' || d === 'expert') return 'bg-danger-subtle text-danger';
        if (d === 'medium' || d === 'intermediate') return 'bg-warning-subtle text-warning';
        return 'bg-success-subtle text-success';
    }


    function renderChart(data) {
        if (typeof Chart === 'undefined') return;
        const canvas = document.getElementById('globalTrendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (myChart) { myChart.destroy(); }

        const overlay = document.getElementById('chart-overlay');
        const overlayText = document.getElementById('overlay-text');

        if (data.length === 0) {
            overlayText.innerText = "No quiz data for this selection";
            overlay.classList.remove('d-none');
            return;
        } else if (data.length === 1) {
            overlayText.innerText = "Take another test to see progress";
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
        }

        // Color points based on performance
        const borderColors = data.map(r => 
            r.percentage >= 80 ? '#198754' : (r.percentage >= 50 ? '#ffc107' : '#dc3545')
        );

        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(r => r.date),
                datasets: [{
                    label: 'Score',
                    data: data.map(r => r.percentage),
                    borderColor: '#194987',
                    backgroundColor: 'rgba(31, 86, 156, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: borderColors,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- 3. Events ---
    $('#global-subject-filter, #global-difficulty-filter, #global-time-filter').on('change', applyFilters);

    $('#show-all-results').on('click', function() {
        isShowingAll = !isShowingAll; // Toggle the state
        applyFilters(); // Re-run filters and re-render table
    });

    // Sidebar Subject Change
    $('#config-subject').on('change', function() {
        const subName = $(this).val();
        updateChapters(subName);
        // Sync the global filter so the chart updates
        $('#global-subject-filter').val(subName);
        applyFilters();
    });

    function updateChapters(subjectName) {
        const $chapterSelect = $("#config-chapter");
        const subjectData = userCurriculum.find(s => s.subject === subjectName);

        if (subjectData && subjectName !== 'all') {
            let options = `<option value="all">Full Subject (Random Mix)</option>`;
            subjectData.chapters.forEach(ch => {
                options += `<option value="${ch.title}">${ch.title}</option>`;
            });
            $chapterSelect.html(options).prop('disabled', false);
        } else {
            $chapterSelect.html('<option value="all">Select Subject First</option>').prop('disabled', true);
        }
    }

    // --- 4. Launch Quiz ---
    $("#quiz-start-form").on('submit', function(e) {
        e.preventDefault();

        const subName = $("#config-subject").val();
        if (!subName || subName === 'all') return alert("Please select a subject!");

        const subObj = userCurriculum.find(s => s.subject === subName);
        const selectedChapterTitle = $("#config-chapter").val();
        const difficulty = $("#config-difficulty").val();

        let chapterObj = null;
        if (subObj && selectedChapterTitle !== 'all') {
            chapterObj = subObj.chapters.find(c => c.title === selectedChapterTitle);
        }

        const settings = {
            subjectId: subObj ? subObj.subject_id : null, 
            chapterId: chapterObj ? chapterObj.chapter_id : null,
            questionCount: $("input[name='qCount']:checked").val(),
            difficulty: difficulty
        };

        // Store settings temporarily
        sessionStorage.setItem('activeQuizConfig', JSON.stringify(settings));

        // --- CHECK FOR EXPERT DIFFICULTY ---
        const briefing = {
            easy: {
                title: "Beginner Mode",
                desc: "Perfect for a relaxed review. You can skip tough questions and come back to them later!",
                color: "bg-success",
                icon: "bi-emoji-smile-fill text-success",
                change: "Allowed",
                type: "Optional"
            },
            medium: {
                title: "Intermediate Mode",
                desc: "The standard challenge. You can rethink your choice, but you must answer to proceed.",
                color: "bg-primary",
                icon: "bi-mortarboard-fill text-primary",
                change: "Allowed",
                type: "Cumpolsary"
            },
            hard: {
                title: "Expert Mode",
                desc: "The ultimate test. Answers lock instantly. Precision is everything here.",
                color: "bg-danger",
                icon: "bi-shield-lock-fill text-danger",
                change: "Locked Instantly",
                type: "Cumpolsary"
            }
        };

        const config = briefing[difficulty];

        // Inject content into Modal
        $("#briefing-header").removeClass("bg-success bg-primary bg-danger").addClass(config.color);
        $("#briefing-icon-container").html(`<i class="bi ${config.icon} display-4"></i>`);
        $("#briefing-title").text(config.title);
        $("#briefing-desc").text(config.desc);
        $("#rule-change span").text(config.change);
        $("#rule-type span").text(config.type);
        $("#confirm-start-btn").removeClass("btn-success btn-primary btn-danger")
                            .addClass(config.color.replace('bg-', 'btn-'))
                            .text(`Start ${config.title}`);

        // Show Modal
        const myModal = new bootstrap.Modal(document.getElementById('quizBriefingModal'));
        myModal.show();
    });

    // Final confirmation
    $("#confirm-start-btn").on('click', function() {
        window.location.href = '/learn/quiz';
    });

    initialize();
});