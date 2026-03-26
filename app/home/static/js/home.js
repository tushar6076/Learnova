$(document).ready(function() {
    // 1. Data array - We use a simple 'key' to look up the route
    const features = [
        {
            key: "profile",
            title: "Academic Records",
            icon: "bi-journal-check",
            desc: "Track your grades and semester progress effortlessly.",
            color: "primary"
        },
        {
            key: "tutorials",
            title: "Skill Tutorials",
            icon: "bi-play-circle-fill",
            desc: "Watch and learn new high-demand industry skills.",
            color: "success"
        },
        {
            key: "quizzes",
            title: "Knowledge Quiz",
            icon: "bi-patch-question",
            desc: "Test your mastery with interactive skill assessments.",
            color: "warning"
        },
        {
            key: "achievements",
            title: "Achievements",
            icon: "bi-trophy",
            desc: "View your earned badges and certification milestones.",
            color: "danger"
        }
    ];

    // 2. Centralized URL Mapping (Matches your Blueprint prefixes)
    const getUrl = (key) => {
        const urlMap = {
            "profile": "/main/profile",
            "tutorials": "/learn/tutorials",
            "quizzes": "/learn/quizzes",
            "achievements": "/main/achievements"
        };
        return urlMap[key] || "#";
    };

    // 3. Render logic
    let htmlOutput = "";
    features.forEach(item => {
        htmlOutput += `
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="card h-100 shadow-sm border-0 feature-card">
                    <div class="card-body text-center p-4">
                        <div class="icon-box mb-3 rounded-circle d-inline-flex align-items-center justify-content-center bg-${item.color} bg-opacity-10 text-${item.color}" style="width: 70px; height: 70px;">
                            <i class="bi ${item.icon} fs-2"></i>
                        </div>
                        <h5 class="fw-bold">${item.title}</h5>
                        <p class="text-muted small">${item.desc}</p>
                        <a href="${getUrl(item.key)}" class="btn btn-outline-${item.color} btn-sm stretched-link">Open</a>
                    </div>
                </div>
            </div>
        `;
    });

    $("#home-cards-container").hide().html(htmlOutput).fadeIn(600);
});