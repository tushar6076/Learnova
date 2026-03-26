$(document).ready(function() {

    // Toggle Login/Signup Sections
    $("#toggle-to-signup").click(function() {
        $("#login-section").fadeOut(300, function() {
            $("#signup-section").fadeIn();
        });
    });

    $("#toggle-to-login").click(function() {
        $("#signup-section").fadeOut(300, function() {
            $("#login-section").fadeIn();
        });
    });

    // SUBMIT LOGIN
    $("#login-form").on('submit', function(e) {
        e.preventDefault();
        const $btn = $(this).find('button');
        const originalText = $btn.text();

        // Get 'next' parameter from the current URL bar
        const urlParams = new URLSearchParams(window.location.search);
        const nextParam = urlParams.get('next');

        // UI Loading state
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Signing in...');

        const formData = new FormData();
        formData.append('identifier', $(this).find('input[type="text"]').val());
        formData.append('password', $(this).find('input[type="password"]').val());

        $.ajax({
            // Alternatively, append it to the URL directly:
            url: "/auth/login" + (nextParam ? "?next=" + encodeURIComponent(nextParam) : ""),
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.status === "success") {
                    window.location.href = response.redirect;
                }
            },
            error: function(xhr) {
                $btn.prop('disabled', false).text(originalText);
                alert(xhr.responseJSON?.message || "Login failed. Check your credentials.");
            }
        });
    });




    let currentSignupStep = 1;

    window.nextStep = function() {
        // Validation for Step 1
        if (currentSignupStep === 1) {
            const pass = $("#reg-pass").val();
            const confirm = $("#reg-confirm").val();
            const email = $("#reg-email").val();
            const user = $("#reg-user").val();

            // Basic frontend validation
            if (!email || !user || !pass) return alert("Please fill in account credentials.");
            if (pass !== confirm) return alert("Passwords do not match!");

            const $btn = $("#next-step-btn"); // Ensure $btn is defined
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Checking...');
            
            const formData = new FormData();
            formData.append('userid', user);
            formData.append('email', email);

            $.ajax({
                url: "/api/check-credentials",
                type: "POST",
                data: { userid: user, email: email },
                success: function(response) {
                    // MOVE ONLY ON SUCCESS
                    $btn.prop('disabled', false).text("Next Step");
                    executeStepChange(); 
                },
                error: function(xhr) {
                    $btn.prop('disabled', false).text("Next Step");
                    $("#reg-email").val('');
                    $("#reg-user").val('');
                    $("#reg-pass").val('');
                    $("#reg-confirm").val('');
                    alert(xhr.responseJSON?.message || "Error");
                }
            });
            
            return; // <--- This stops Step 1 from "sliding" into Step 2 automatically
        }

        // Validation for Step 2
        if (currentSignupStep === 2) {
            if (!$("#reg-name").val() || !$("#reg-age").val() || !$("#reg-gender").val()) {
                return alert("Please complete your personal details.");
            }
            executeStepChange();
        }

        // Move to next step
        function executeStepChange() {
            if (currentSignupStep < 3) {
                $(`#signup-step-${currentSignupStep}`).fadeOut(300, function() {
                    currentSignupStep++; // Move forward first
                    updateStepUI();      // Sync all circles at once
                    $(`#signup-step-${currentSignupStep}`).fadeIn(300);
                });
            }
        }
    };

    window.prevStep = function() {
        if (currentSignupStep > 1) {
            $(`#signup-step-${currentSignupStep}`).fadeOut(300, function() {
                currentSignupStep--; // Move back first
                updateStepUI();      // Sync all circles at once
                $(`#signup-step-${currentSignupStep}`).fadeIn(300);
            });
        }
    };

    function updateStepUI() {
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`step${i}-indicator`);
            if (!el) continue;

            if (i <= currentSignupStep) {
                // This handles current and all previous steps
                el.classList.add('bg-primary', 'text-white');
                el.classList.remove('bg-light', 'text-muted');
            } else {
                // This handles all future steps
                el.classList.add('bg-light', 'text-muted');
                el.classList.remove('bg-primary', 'text-white');
            }
        }
    }


    // Instant Avatar Upload Logic
    $("#signup-avatar-upload").on('change', function() {
        const file = this.files[0];
        if (!file) return;

        // Instant UI Feedback (Local Preview)
        let reader = new FileReader();
        const $img = $("#signup-avatar-preview");

        reader.onload = function(e) {
            $img.attr("src", e.target.result);
        };
        reader.readAsDataURL(file);

        $img.removeClass('border-white').addClass('border-primary');
    });


    let academicData = {};

    // 1. Fetch dynamic data
    $.getJSON('/api/get_courses_hierarchy', function(data) {
        academicData = data;
    });

    // 2. Level -> Context
    $("#reg-level-select").change(function() {
        const level = $(this).val();
        const contexts = Object.keys(academicData[level] || {});

        if (contexts.length === 0) {
            $("#reg-context-select").html('<option value="" selected disabled>No Board/Major Available</option>');
            $("#reg-context-select").prop('disabled', true);
        } else {
            $("#reg-context-select").html('<option value="" selected disabled>Select Board/Major</option>');
            $("#reg-context-select").prop('disabled', false);
            contexts.forEach(ctx => {
                $("#reg-context-select").append(`<option value="${ctx}">${ctx}</option>`);
            });
        }
        resetDropdowns(['#reg-branch-select', '#reg-grade-select']);
    });

    // 3. Context -> Branch
    $("#reg-context-select").change(function() {
        const level = $("#reg-level-select").val();
        const context = $(this).val();
        const branches = Object.keys(academicData[level][context] || {});

        if (branches.length === 0) {
            $("#reg-branch-select").html('<option value="" selected disabled>No Branch Available</option>');
            $("#reg-branch-select").prop('disabled', true);
        } else {
             $("#reg-branch-select").html('<option value="" selected disabled>Select Branch</option>');
             $("#reg-branch-select").prop('disabled', false);
            branches.forEach(brn => {
                $("#reg-branch-select").append(`<option value="${brn}">${brn}</option>`);
            });
        }
        resetDropdowns(['#reg-grade-select']);
    });

    // 4. Branch -> Grade
    $("#reg-branch-select").change(function() {
        const level = $("#reg-level-select").val();
        const context = $("#reg-context-select").val();
        const branch = $(this).val();
        const grades = Object.keys(academicData[level][context][branch] || {});

        if (grades.length === 0) {
            $("#reg-grade-select").html('<option value="" selected disabled>No Grade/Year Available</option>');
            $("#reg-grade-select").prop('disabled', true);
        } else {
            $("#reg-grade-select").html('<option value="" selected disabled>Select Grade/Year</option>');
            $("#reg-grade-select").prop('disabled', false);
            grades.forEach(grd => {
                $("#reg-grade-select").append(`<option value="${grd}">${grd}</option>`);
            });
        }
    });

    // 5. Grade -> Fetch Course ID & Subjects
    $("#reg-grade-select").change(function() {
        const level = $("#reg-level-select").val();
        const context = $("#reg-context-select").val();
        const branch = $("#reg-branch-select").val();
        const grade = $(this).val();
        
        const courseId = academicData[level][context][branch][grade];

        // Attach the ID to the form for the final submit
        $(this).data('course-id', courseId);

        fetchSubjects(courseId);
    });


    // 6. Subject Chip Selection
    $(document).on('click', '.subject-chip', function() {
        $(this).toggleClass('active');
        $(this).find('i').toggleClass('bi-plus bi-check-lg');
    });

    // 7. SUBMIT SIGNUP (Step 1 + 2 + 3 Combined)
    $("#reg-form-3").on('submit', function(e) {
        e.preventDefault();
        const $btn = $(this).find('button[type="submit"]');

        const urlParams = new URLSearchParams(window.location.search);
        const nextParam = urlParams.get('next');
        
        // Subjects Validation
        let selectedSubjects = [];
        $(".subject-chip.active").each(function() {
            selectedSubjects.push($(this).data('val')); // This is the subject_id string
        });

        if (selectedSubjects.length < 3) {
            return alert("Please select at least 3 subjects.");
        }

        // Validation for Step 3 hidden ID
        const courseId = $("#reg-grade-select").data('course-id');
        if (!courseId) {
            return alert("Selection incomplete. Please select Level, Context, Branch, and Grade.");
        }

        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Syncing...');

        const formData = new FormData();
        
        // STEP 1 DATA
        formData.append('userid', $("#reg-user").val());
        formData.append('email', $("#reg-email").val());
        formData.append('password', $("#reg-pass").val());
        
        // STEP 2 DATA
        formData.append('name', $("#reg-name").val() || '');
        formData.append('age', $("#reg-age").val() || '');
        formData.append('gender', $("#reg-gender").val() || '');
        
        // Avatar upload
        const avatarFile = $('#signup-avatar-upload')[0].files[0];
        if (avatarFile) {
            formData.append('photo', avatarFile);
        }

        // STEP 3 DATA - Matches your UserDetails column names
        // formData.append('level', $("#reg-level-select").val() || '');
        formData.append('context', $("#reg-context-select").val() || '');
        formData.append('branch', $("#reg-branch-select").val() || '');
        formData.append('grade', $("#reg-grade-select").val() || '');
        formData.append('course_id', courseId); // Critical Foreign Key
        
        // Append subject_id list (handled as JSON in your model)
        selectedSubjects.forEach(subjectId => {
            formData.append('subjects[]', subjectId);
        });

        // formData.append('next', nextParam);

        $.ajax({
            url: "/auth/signup" + (nextParam ? "?next=" + encodeURIComponent(nextParam) : ""),
            type: "POST",
            data: formData,
            processData: false, // Required for FormData
            contentType: false, // Required for FormData
            success: function(response) {
                if (response.status === "success") {
                    window.location.href = response.redirect;
                }
            },
            error: function(xhr) {
                $btn.prop('disabled', false).text("Complete Registration");
                alert(xhr.responseJSON?.message || "Registration failed.");
            }
        });
    });

    // SUBMIT PASSWORD RESET
    $("#reset-password-form").on('submit', function(e) {
        e.preventDefault();
        const $btn = $(this).find('button');
        const pass = $("#new-pass").val();
        const confirm = $("#confirm-new-pass").val();

        if (pass !== confirm) {
            alert("Passwords do not match!");
            return;
        }

        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Updating...');

        const formData = new FormData();
        formData.append('password', pass);
        formData.append('confirm_password', confirm);

        $.ajax({
            url: "/auth/reset_password",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                // If successful, Flask redirects or returns JSON. 
                // Given your route uses flash/redirect, we handle it here:
                window.location.href = "/auth/login"; 
            },
            error: function(xhr) {
                $btn.prop('disabled', false).text("Reset Password");
                alert(xhr.responseJSON?.message || "Failed to reset password. Session may have expired.");
            }
        });
    });
    setSupportField();
});


function resetDropdowns(ids) {
    ids.forEach(id => {
        $(id).html('<option value="" selected disabled>Select Above First</option>');
        $(id).prop('disabled', true);
    });
    // Also clear the subject chips if we are resetting
    if (ids.includes('#reg-grade-select')) {
        $("#reg-subject-chips").html('<p class="text-muted small">Select a grade to see subjects.</p>');
    }
}


function fetchSubjects(courseId) {
    const $container = $("#reg-subject-chips");
    $container.html('<div class="py-2 text-muted small">Loading available subjects...</div>');

    $.getJSON(`/api/get_course_subjects/${courseId}`, function(subjects) {
        $container.empty();

        if (subjects.length === 0) {
            $container.html('<p class="text-muted small italic">No subjects available for this selection.</p>');
            return;
        }

        let chipHtml = subjects.map(s => `
            <div class="subject-chip px-3 py-2 border rounded-pill small fw-bold" data-val="${s.id}">
                ${s.name}
            </div>
        `).join('');
        
        $container.html(chipHtml);
    });
}


// Function to switch to Forgot Password UI
window.showForgot = function() {
    $("#login-section").fadeOut(300, function() {
        $("#forgot-section").fadeIn();
    });
};

// Part 1: Send the OTP
window.sendRecoveryCode = function() {
    const email = $("#forgot-email").val();
    if (!email) return alert("Please enter your email");

    const $btn = $("#btn-send-code");
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Sending...');

    const formData = new FormData();
    // CHANGE THIS: Match the 'identifier' key used in your Python request.form.get()
    formData.append('identifier', email); 

    $.ajax({
        url: "/auth/forgot_password",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            $("#forgot-step-email").hide();
            $("#forgot-step-otp").fadeIn();
            $("#forgot-msg").text("We've sent a 6-digit code to " + email);
        },
        error: function(xhr) {
            $btn.prop('disabled', false).text("Send Code");
            // Better error handling for the 404 you were seeing
            $("#forgot-email").val('').focus();
            $("#forgot-email").addClass('is-invalid')

            const errorMsg = xhr.responseJSON?.message || "Error sending code.";
            alert(errorMsg);
        }
    });
};

// Part 2: Verify the OTP
window.verifyRecoveryCode = function() {
    const email = $("#forgot-email").val();
    const code = $("#forgot-otp").val();
    
    const $btn = $("#btn-verify-code");
    $btn.prop('disabled', true).text("Verifying...");

    const formData = new FormData();
    formData.append('identifier', email);
    formData.append('code', code);

    $.ajax({
        url: "/auth/verify_code",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            // If successful, the server-side route sets a session variable 
            // and we redirect to the reset_password page/section
            if (response.status === "success") {
                // If you are using a separate page:
                window.location.href = response.redirect;
                // OR if you want to stay on the same page and just show the reset form:
                // $("#forgot-section").hide();
                // $("#reset-section").fadeIn();
            }
        },
        error: function(xhr) {
            $btn.prop('disabled', false).text("Verify & Proceed");

            const errorMessage = xhr.responseJSON?.message || "An unexpected error occurred.";
            // HANDLE SESSION EXPIRY (403)
            if (xhr.status === 403) {
                // Use a SweetAlert or a standard alert
                alert("Session Expired: " + errorMessage);
                // Redirect them back to the login/forgot password start
                window.location.href = "/auth/login"; 
                return; // Stop further execution
            }

            $("#forgot-otp").val('').focus(); 
            $("#forgot-otp").addClass('is-invalid');
            
            alert(xhr.responseJSON?.message || "Invalid or expired code.");
        }
    });
};

window.showLogin = function() {
    $("#forgot-section").fadeOut(300, function() {
        $("#login-section").fadeIn();
    });
};