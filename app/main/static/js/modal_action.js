$(document).ready(function() {
    $('#settingsModal').on('hidden.bs.modal', function () {
        location.reload();
    });

    // 1. Fetch the full hierarchy first (needed for dropdown options)
    $.getJSON('/api/get_courses_hierarchy', function(hierarchy) {
        dbHierarchy = hierarchy;
        const config = $("#user-academic-config").data();
        const currentCourseId = config.courseId;

        if (currentCourseId && currentCourseId !== "None" && currentCourseId !== "") {
            // Existing User Logic
            $.getJSON(`/api/get_initial_academic_data/${currentCourseId}`, function(data) {
                $("#set-level-select").val(data.level);
                populateContexts(data.level, data.context);
                populateBranches(data.level, data.context, data.branch);
                populateGrades(data.level, data.context, data.branch, data.grade);
                renderSubjectChips(data.available_subjects, data.selected_subjects);
            });
        } else {
            // New User: Just ensure the Level dropdown is ready
            // (Assuming your HTML already has School/College options hardcoded)
            console.log("New user detected. Waiting for manual selection.");
        }
    });

    // 1. When Level Changes (School vs College)
    $("#set-level-select").on('change', function() {
        const level = $(this).val();
        populateContexts(level); // Refill Context
        // Clear everything else below it
        resetDropdowns(['#set-branch', '#set-grade']); 
    });

    // 2. When Context Changes (Board vs Major)
    $("#set-context-select").on('change', function() {
        const level = $("#set-level-select").val();
        const context = $(this).val();
        populateBranches(level, context); // Refill Branch
        // Clear Grade below it
        resetDropdowns(['#set-grade']);
    });

    // 3. When Branch Changes
    $("#set-branch").on('change', function() {
        const level = $("#set-level-select").val();
        const context = $("#set-context-select").val();
        const branch = $(this).val();
        populateGrades(level, context, branch); // Refill Grade
        // We don't need to call resetDropdowns here because 
        // populateGrades overwrites the final dropdown anyway.
    });

    // In your grade change handler
    $("#set-grade").on('change', function() {
        const newCourseId = $(this).val(); 
        
        // Show a small loader in the chips area
        $("#set-subject-chips").html('<div class="spinner-border spinner-border-sm text-primary"></div> Fetching subjects...');

        $.getJSON(`/api/get_course_subjects/${newCourseId}`, function(subjects) {
            // Since it's a new grade, selected_subjects should be empty []
            renderSubjectChips(subjects, []); 
        });
    });

    $(document).on('click', '.subject-chip', function() {
        const $chip = $(this);
        const $icon = $chip.find('i');
        
        // 1. Toggle the active classes (consistent with your template)
        $chip.toggleClass('active bg-primary text-white border-primary bg-white text-dark');

        // 2. Toggle the specific icons you defined in the map function
        if ($chip.hasClass('active')) {
            $icon.removeClass('bi-plus-circle').addClass('bi-check-circle-fill');
        } else {
            $icon.removeClass('bi-check-circle-fill').addClass('bi-plus-circle');
        }
    });


    // Settings Save Handler
    $("#settings-form").on('submit', function(e) {
        e.preventDefault();
        
        const $form = $(this);
        const $btn = $form.find('button[type="submit"]');
        const $modal = $form.closest('.modal');
        const $modalBody = $modal.find('.modal-body');
        const $footer = $modal.find('.modal-footer');
        const $cancelBtn = $footer.find('.btn-light');

        // 1. Collect Selected Subjects
        let selectedSubjects = [];
        $(".subject-chip.active").each(function() {
            selectedSubjects.push($(this).data('val'));
        });

        // 2. Validation using handleFormError
        if (selectedSubjects.length < 3) {
            handleFormError($form, "Please select at least 3 subjects to help our AI personalize your dashboard.");
            return;
        }

        // 3. UI Loading & Modal Lock
        toggleModalProcessing($modal, true);
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');
        $cancelBtn.prop('disabled', true);

        const formData = new FormData();
        formData.append('name', $('#set-name').val() || '');
        formData.append('age', $('#set-age').val() || '');
        formData.append('gender', $('#set-gender').val() || '');
        formData.append('context', $("#set-context-select").val() || '');
        formData.append('branch', $("#set-branch").val() || '');
        formData.append('course_id', $("#set-grade").val() || ""); 
        formData.append('grade', $("#set-grade option:selected").text().trim());
        formData.append('subjects', JSON.stringify(selectedSubjects));

        $.ajax({
            url: "/main/update",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.status === "success") {
                    // 4. Success State (Uses default reload callback)
                    $footer.hide();
                    showSuccessState(
                        $modalBody, 
                        "Profile Updated", 
                        "Your preferences have been saved. We're tailoring your dashboard now..."
                    );
                }
            },
            error: function(xhr) {
                // 5. Unlock UI on Error
                toggleModalProcessing($modal, false);
                $btn.prop('disabled', false).text("Save Changes");
                $cancelBtn.prop('disabled', false);
                const errorMsg = xhr.responseJSON?.message || "Failed to update profile. Please try again.";
                handleFormError($form, errorMsg);
            }
        });
    });


    // SUBMIT PASSWORD RESET
    $("#password-change-form").on('submit', function(e) {
        e.preventDefault();
        
        const $form = $(this);
        const $btn = $form.find('button[type="submit"]');
        const $modal = $form.closest('.modal');
        const $modalBody = $modal.find('.modal-body');

        const oldpass = $('#old-p').val();
        const newpass = $("#new-p").val();
        const confirm = $("#conf-p").val();

        // 1. Validation Logic with handleFormError
        if (newpass !== confirm) {
            handleFormError($form, "New passwords do not match!");
            return;
        }
        if (newpass === oldpass) {
            handleFormError($form, "Your new password cannot be the same as your old one.");
            return;
        }

        // 2. Lock UI & Show Loading State
        toggleModalProcessing($modal, true);
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Updating...');

        const formData = new FormData();
        formData.append('password', oldpass);
        formData.append('new_password', newpass);

        $.ajax({
            url: "/main/verify_password_for_reset",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                // 3. Success State Integration
                showSuccessState(
                    $modalBody, 
                    "Security Updated", 
                    "Your password has been changed successfully. You will be redirected shortly."
                );
            },
            error: function(xhr) {
                // 4. Unlock UI on Error
                toggleModalProcessing($modal, false);
                $btn.prop('disabled', false).text("Update Security");
                
                const errorMsg = xhr.responseJSON?.message || "Failed to reset password. Please verify your current password.";
                handleFormError($form, errorMsg);
            }
        });
    });


    $('#confirm-delete-btn').on('click', function() {
        const $btn = $(this);
        const $modal = $('#deleteModal');
        const $modalBody = $modal.find('.modal-body');
        const $header = $modal.find('.modal-header');
        const $footer = $modal.find('.modal-footer');
        const $cancelBtn = $footer.find('.btn-light');

        // 1. Double Confirmation (Good for destructive actions)
        if (!confirm("Warning: This will permanently delete your data. Continue?")) return;

        // 2. Lock UI & Processing State
        toggleModalProcessing($modal, true);
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Wiping Data...');
        $cancelBtn.prop('disabled', true);

        $.ajax({
            url: '/main/delete_account',
            type: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    $header.removeClass('bg-danger').addClass('bg-success');
                    $header.find('.modal-title').html('<i class="bi bi-check-circle-fill me-2"></i>Success');

                    $footer.hide();
                    showSuccessState(
                        $modalBody, 
                        "Account Deleted", 
                        "Your data has been permanently removed. Redirecting you to the landing page...",
                        () => { window.location.href = response.redirect || '/'; },
                        2500
                    );
                }
            },
            error: function(xhr) {
                // 4. Unlock UI on Error
                toggleModalProcessing($modal, false);
                $btn.prop('disabled', false).text('Delete Permanently');
                $cancelBtn.prop('disabled', false);
                const errorMsg = xhr.responseJSON?.message || "An error occurred during deletion.";
                handleFormError($modalBody, errorMsg);
            }
        });
    });
});