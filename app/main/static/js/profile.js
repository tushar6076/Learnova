$(document).ready(function() {

    let isShowingAll = false;
    let cachedActivities = [];

    // Fetch all required data in parallel
    $.when(
        $.getJSON('/static/assets/json/aggregate_stats.json'), // The properties (icon, color, label)
        $.getJSON('/api/user_stats'),                     // The values (from your aggregator)
        $.getJSON('/api/recent_activity'),                // The last 3-5 quiz results
        $.getJSON('/api/user-achievements')
    ).done(function(configRes, statsRes, activityRes, achievementRes) {
        
        const config = configRes[0];
        const stats = statsRes[0];
        cachedActivities = activityRes[0];
        const achievements = achievementRes[0];

        // --- Render Stats Grid ---
        renderStats(config, stats);

        // --- Render Activity List ---
        renderActivity(cachedActivities);

        // --- Render the Badge Card ---
        renderLatestBadge(achievements.badges);

    }).fail(function() {
        console.error("Failed to load profile data.");
        $("#stats-grid").html('<p class="text-center text-muted">Error loading stats.</p>');
    });

    // The Stats Engine
    function renderStats(config, data) {
        let statsHtml = config.map(s => {
            const val = data[s.key] ?? 0;
            // Round percentages to 1 decimal place
            const displayVal = (s.key === 'avg_percentage') ? parseFloat(val).toFixed(1) : val;

            return `
                <div class="learn-stats col-6 col-md-3 mb-3 mb-md-0 text-center">
                    <div class="p-3">
                        <i class="bi ${s.icon} fs-2 ${s.color}"></i>
                        <h3 class="fw-bold mt-2 mb-0">${displayVal}${s.suffix || ''}</h3>
                        <p class="text-muted small mb-0">${s.label}</p>
                    </div>
                </div>
            `;
        }).join('');
        $("#stats-grid").html(statsHtml);
    }

    // The Activity Engine
   function renderActivity(activities) {
        // 1. Safety Check (Crucial for the "undefined" error)
        if (!activities || !Array.isArray(activities) || activities.length === 0) {
            $("#activity-list").html('<p class="text-muted small px-3">No recent activity found.</p>');
            $('#show-all-activities').hide();
            return;
        }

        // 2. Logic to toggle 5 vs All
        const displayActivities = isShowingAll ? activities : activities.slice(0, 3);

        // 3. Render HTML
        let activityHtml = displayActivities.map(a => `
            <div class="list-group-item border-0 px-0 d-flex align-items-center bg-transparent animate__animated animate__fadeIn">
                <div class="bg-light p-2 rounded me-3">
                    <i class="bi ${getActivityIcon(a.score)} text-primary fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <p class="mb-0 small fw-bold text-dark">${a.description}</p>
                    <small class="text-muted">${a.time_ago}</small>
                </div>
            </div>
        `).join('');

        $("#activity-list").html(activityHtml);

        // 4. Update Button Text and Visibility
        if (activities.length <= 3) {
            $('#show-all-activities').hide();
        } else {
            $('#show-all-activities')
                .show()
                .html(isShowingAll ? 
                    'Show Less <i class="bi bi-chevron-up ms-1"></i>' : 
                    'See All <i class="bi bi-chevron-down ms-1"></i>');
        }
    }
    // Helper to change icon based on performance
    function getActivityIcon(score) {
        return score >= 80 ? "bi-trophy" : "bi-pencil-square";
    }

    // Badge Card Engine
    function renderLatestBadge(badges) {
        // Safety check: ensure badges exists and is an array
        if (!badges || !Array.isArray(badges)) {
            console.warn("Badges data is missing or not an array");
            return;
        }

        const unlocked = badges.filter(b => b.is_unlocked);
        
        if (unlocked.length > 0) {
            const latest = unlocked[unlocked.length - 1];
            $("#badge-icon").attr('class', `bi ${latest.icon} text-warning fs-3`);
            $("#badge-name").text(latest.title);
            $("#badge-message").text(latest.description || "Top performance!");
        } else {
            $("#badge-icon").attr('class', 'bi bi-lock-fill text-muted fs-3');
            $("#badge-name").text("Locked");
            $("#badge-message").text("Keep practicing to earn badges!");
        }
    }


    $('#finish-now-upload').on('click', function(e) {
        e.preventDefault();
        $('#avatar-upload').click();
    });

    // Instant Avatar Upload Logic
    $("#avatar-upload").on('change', function() {
        const file = this.files[0];
        if (!file) return;

        // 1. Instant UI Feedback (Local Preview)
        let reader = new FileReader();
        const $img = $("#header-avatar");
        const originalSrc = $img.attr('src'); // Backup in case upload fails

        reader.onload = function(e) {
            $img.attr("src", e.target.result);
        };
        reader.readAsDataURL(file);

        // 2. Background Upload to Server
        const formData = new FormData();
        formData.append('avatar', file);

        // Optional: Add a loading state to the camera icon
        const $label = $("label[for='avatar-upload'] i");
        $label.removeClass('bi-camera-fill').addClass('spinner-border spinner-border-sm');

        $.ajax({
            url: "/main/update_avatar", // We'll create this specific route
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                $label.removeClass('spinner-border spinner-border-sm').addClass('bi-camera-fill');
                location.reload()
                console.log("Avatar updated successfully!");
            },
            error: function() {
                $label.removeClass('spinner-border spinner-border-sm').addClass('bi-camera-fill');
                $img.attr("src", originalSrc); // Revert on failure
                alert("Failed to upload image. Please try again.");
            }
        });
    });


    $('#show-all-activities').on('click', function() {
        isShowingAll = !isShowingAll; // Toggle the state
        renderActivity(cachedActivities); // re-render Activity
        $("#activity-list").animate({ scrollTop: 0 }, "fast");
    });
});