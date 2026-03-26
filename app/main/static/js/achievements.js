$(document).ready(function() {
    function loadRealAchievements() {
        $.get('/api/user-achievements', function(data) {
            
            // 1. Render Global "Badges" (from achievements.json)
            renderGlobalBadges(data.badges);

            // 2. Render Subject "Mastery Milestones" (from Subjects table)
            renderMasteryMilestones(data.mastery_milestones);

            // 3. Render Mastery Progress Bars (The skill levels)
            renderMasteryBars(data.mastery_progress);
            
        }).fail(function() {
            console.error("Error connecting to the success gallery API.");
        });
    }

    // Renders the horizontal/top row of common badges
    function renderGlobalBadges(badges) {
        let html = '<div class="col-12"><h5 class="fw-bold mb-3">Common Milestones</h5></div>';
        badges.forEach(b => {
            html += generateBadgeHtml(b);
        });
        $("#badges-container").html(html);
    }

    // Renders milestones grouped by their specific subject
    function renderMasteryMilestones(milestones) {
        let html = "";
        const grouped = milestones.reduce((acc, m) => {
            (acc[m.subject_name] = acc[m.subject_name] || []).push(m);
            return acc;
        }, {});

        for (const [subject, list] of Object.entries(grouped)) {
            html += `<div class="col-12 mt-4"><h5 class="fw-bold text-primary">${subject} Achievements</h5><hr></div>`;
            list.forEach(m => {
                html += generateBadgeHtml(m);
            });
        }
        $("#mastery-milestones-container").append(html); // Assuming you add this ID to your HTML
    }

    // Helper to keep card HTML consistent
    function generateBadgeHtml(b) {
        const lockClass = b.is_unlocked ? "" : "locked";
        const iconColor = b.is_unlocked ? (b.color || 'warning') : 'secondary';
        return `
            <div class="col-6 col-md-3 text-center mb-4">
                <div class="badge-card ${lockClass}">
                    <div class="badge-icon bg-${iconColor} shadow">
                        <i class="bi ${b.icon}"></i>
                    </div>
                    <h6 class="fw-bold mt-3 mb-1">${b.title}</h6>
                    <p class="small text-muted">${b.description}</p>
                </div>
            </div>
        `;
    }

    function renderMasteryBars(masteryData) {
        let skillHtml = "";
        masteryData.forEach(s => {
            skillHtml += `
                <div class="mb-4">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="fw-bold small text-uppercase">${s.subject_name} Proficiency</span>
                        <span class="small fw-bold">${s.avg_score}%</span>
                    </div>
                    <div class="progress" style="height: 12px; border-radius: 10px;">
                        <div class="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                             style="width: ${s.avg_score}%"></div>
                    </div>
                </div>
            `;
        });
        $("#skills-progress-container").html(skillHtml);
    }

    loadRealAchievements();
});