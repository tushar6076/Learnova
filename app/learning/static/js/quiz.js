$(document).ready(function() {
    const config = JSON.parse(sessionStorage.getItem('activeQuizConfig'));

    if (!config) {
        window.location.href = "/learn/quizzes";
        return;
    }

    let filteredQuestions = [];
    let currentIdx = 0;
    let score = 0;
    let isAnswered = false;
    let isReviewMode = false;

    // --- Fetch Real Questions from Postgres ---
    function fetchQuestions() {
        $.ajax({
            url: '/api/generate_quiz', // Points to your Flask route
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(config),
            success: function(data) {
                filteredQuestions = data;
                loadQuestion();
            },
            error: function() {
                $("#quiz-content").html("<p class='text-center text-danger'>Failed to load questions. Please try again.</p>");
            }
        });
    }

    // --- Render Engine (Using your PG Keys) ---
    function loadQuestion() {
        if (filteredQuestions.length === 0) {
            $("#quiz-content").html(`
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-circle text-warning fs-1 mb-3"></i>
                    <p class='lead fw-bold'>No questions found for this selection.</p>
                    <p class='text-muted'>Try a different difficulty level or select another chapter.</p>
                    <div class="mt-4">
                        <a href="/learn/quizzes" class="btn btn-primary rounded-pill px-4">
                            <i class="bi bi-arrow-left me-2"></i>Back to Quiz Settings
                        </a>
                    </div>
                </div>
            `);
            return;
        }

        isAnswered = false;
        const data = filteredQuestions[currentIdx];
        $("#question-text").text(data.question); // 'question' key from PG
        $("#question-counter").text(`Question ${currentIdx + 1}/${filteredQuestions.length}`);
        
        let progress = ((currentIdx + 1) / filteredQuestions.length) * 100;
        $("#quiz-progress").css("width", progress + "%");

        // Map keys option1 -> option4
        let optionsHtml = "";
        ['option1', 'option2', 'option3', 'option4'].forEach((key) => {
            if (data[key]) {
                optionsHtml += `<button class="btn option-btn w-100 mb-2" data-key="${key}">${data[key]}</button>`;
            }
        });
        
        $("#options-container").hide().html(optionsHtml).fadeIn(300);
        $("#next-btn").text(currentIdx === filteredQuestions.length - 1 ? "Finish Quiz" : "Next Question");

        // --- Difficulty Based Button State ---
        if (config.difficulty === 'easy') {
            // Beginner: Always allowed to skip/move forward
            $("#next-btn").removeClass("disabled")
        } else {
            // Intermediate & Expert: Must answer first
            $("#next-btn").addClass("disabled")
        }
    }

    // Helper function to handle the actual scoring colors
    function processAnswer($selected) {
        const selectedKey = $selected.data("key");
        const correctKey = filteredQuestions[currentIdx].answer;
        
        $(".option-btn").prop("disabled", true);

        if (selectedKey === correctKey) {
            $selected.removeClass("bg-primary").addClass("correct");
            score++;
        } else {
            $selected.removeClass("bg-primary").addClass("incorrect");
            $(`[data-key="${correctKey}"]`).addClass("correct");
        }
    }

    function loadReviewQuestion() {
        const data = filteredQuestions[currentIdx];
        const correctKey = data.answer;

        $("#question-text").text(data.question);
        $("#question-counter").text(`Answer Key: ${currentIdx + 1}/${filteredQuestions.length}`);

        let progress = ((currentIdx + 1) / filteredQuestions.length) * 100;
        $("#quiz-progress").css("width", progress + "%");

        let optionsHtml = "";
        ['option1', 'option2', 'option3', 'option4'].forEach((key) => {
            if (data[key]) {
                const isCorrect = (key === correctKey);
                // We use 'correct' for the right answer and 'opacity-50' to dim the wrong ones
                const statusClass = isCorrect ? 'correct shadow-sm' : 'opacity-50';
                optionsHtml += `<button class="btn option-btn ${statusClass} w-100 mb-2" disabled>${data[key]}</button>`;
            }
        });

        $("#options-container").hide().html(optionsHtml).fadeIn(300);
        
        // THE FIX: Ensure button is visible and has correct text
        const $nextBtn = $("#next-btn");
        $nextBtn.show(); // Ensure it's not hidden from the result screen logic
        
        if (currentIdx === filteredQuestions.length - 1) {
            $nextBtn.text("Return to Results");
        } else {
            $nextBtn.text("Next Answer");
        }
    }


    // --- Interaction & Scoring ---
    $(document).on("click", ".option-btn", function() {
        if (isAnswered) return;

        const $selected = $(this);
        const mode = config.difficulty;

        if (mode === 'hard') {
            // EXPERT: Instant Lock & Visual Feedback
            isAnswered = true;
            processAnswer($selected); // Shows colors immediately
            $("#next-btn").removeClass("disabled"); 
        } else {
            // BEGINNER & INTERMEDIATE: Just highlight selection
            $(".option-btn").removeClass("selected-style bg-primary text-white");
            $selected.addClass("selected-style bg-primary text-white");
            
            // Unlock Next button
            $("#next-btn").removeClass("disabled");
        }
    });

    $("#next-btn").click(function() {
        if ($(this).hasClass('disabled')) return;

        if (isReviewMode) {
            currentIdx++;
            if (currentIdx < filteredQuestions.length) {
                loadReviewQuestion();
            } else {
                // End of review: go back to results
                isReviewMode = false;
                $("#quiz-content, #next-btn, .card-footer").hide();
                $("#result-container").fadeIn();
            }
            return; // Exit early so we don't trigger normal quiz logic
        }

        const mode = config.difficulty;
        const $selected = $(".option-btn.selected-style");

        // 1. Silent Scoring (For Beginner/Intermediate)
        // Expert is already scored on click, so we only score the others here
        if (mode !== 'hard' && $selected.length > 0) {
            const selectedKey = $selected.data("key");
            const correctKey = filteredQuestions[currentIdx].answer;
            if (selectedKey === correctKey) {
                score++;
            }
        }

        // 2. Immediate Move (No "Reveal" step)
        currentIdx++;
        if (currentIdx < filteredQuestions.length) {
            loadQuestion();
        } else {
            showResults();
        }
    });

    $('#retry-quiz-btn').on('click', () => location.reload());

    $(document).on('click', '#check-answer', function() {
        isReviewMode = true;
        currentIdx = 0; 
        
        // UI Transitions
        $("#result-container").hide();
        
        // Explicitly show the content, the footer, and the button itself
        $("#quiz-content, .card-footer, #next-btn").fadeIn().removeClass("d-none disabled");
        
        // Set the initial text
        $("#next-btn").text("Next Answer");

       // Add review styling to progress bar
        $("#quiz-progress").addClass("review-mode-bar");

        // Calculate and trigger the transition
        let initialProgress = (1 / filteredQuestions.length) * 100;
        
        // This ensures the browser "sees" the change and animates it
        window.requestAnimationFrame(() => {
            $("#quiz-progress").css("width", initialProgress + "%");
        });

        loadReviewQuestion();
    });


    function showResults() {
        const percentage = Math.round((score / filteredQuestions.length) * 100);

        // 1. Update Score Text
        $("#percentage").text(percentage + "%");
        $("#final-score").text(score);
        $("#total-questions").text(filteredQuestions.length);

        // 2. Reveal the "Check Answers" button you just added
        $("#check-answer").closest('.d-none').removeClass('d-none').addClass('d-flex');

        // 3. Dynamic Redirection Logic
        const learnBtn = $("#redirect-to-learn");
        const tutorialsUrl = learnBtn.data("tutorials-url");
        const btnText = $("#learn-btn-text");

        if (config.chapterId && config.chapterId !== 'all') {
            learnBtn.attr("href", `/learn/chapter/${config.chapterId}`);
            btnText.text("Review Chapter");
        } else {
            learnBtn.attr("href", tutorialsUrl);
            $("#learn-btn-text").text("Browse Curriculum");
        }

        // 4. UI Transition
        $("#quiz-content, #next-btn, .card-footer").hide();
        $("#result-container").fadeIn();
        
        saveToDatabase();
    }
    function saveToDatabase() {
        $.ajax({
            url: '/learn/result',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                subject_id: config.subjectId, // Ensure these match Python keys
                chapter_id: config.chapterId,
                score: score,
                total_questions: filteredQuestions.length,
                difficulty: config.difficulty
            }),
            error: function(xhr) {
                console.error("Server Error Detail:", xhr.responseText);
            }
        });
    }

    fetchQuestions(); // Start the process
});