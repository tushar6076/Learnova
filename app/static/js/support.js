/**
 * Helper: Toggles Modal Security State
 * @param {jQuery} $modalBody - The modal element
 * @param {boolean} isProcessing - True to lock, False to unlock
 * @param {string} title - Success title
 * @param {string} message - Success description
 * @param {function} callback - Default is location.reload
 * @param {number} delay - Default 2000ms
 */
function toggleModalProcessing($modalBody, isProcessing) {
    if (!$modalBody || $modalBody.length === 0) return; // Prevent "undefined" errors

    const $closeBtn = $modalBody.find('.btn-close');
    const modalElement = $modalBody[0];
    
    // Use getOrCreateInstance to ensure we always have the object
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

    if (isProcessing) {
        // 1. Hide the 'X' button
        $closeBtn.fadeOut(200);
        
        // 2. Lock the backdrop and keyboard
        if (modalInstance) {
            modalInstance._config.backdrop = 'static';
            modalInstance._config.keyboard = false;
        }
    } else {
        // 1. Restore the 'X' button
        $closeBtn.fadeIn(200);
        
        // 2. Unlock backdrop and keyboard
        if (modalInstance) {
            modalInstance._config.backdrop = true;
            modalInstance._config.keyboard = true;
        }
    }
}

/**
 * Helper: Inline Error Handler
 */
function handleFormError($form, message) {
    // Remove existing errors to prevent duplicates
    $form.find('.form-error-msg').remove();
    
    $form.prepend(`
        <div class="alert alert-danger small py-2 animate-fade-in form-error-msg">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
        </div>
    `);
}

/**
 * Helper: Success State Switcher
 */
function showSuccessState($modalBody, title, message, callback = () => location.reload(), delay = 2500) {
    // 1. Render Success UI (Removed data-bs-dismiss)
    $modalBody.html(`
        <div class="text-center py-4 animate__animated animate__fadeIn">
            <div class="mb-3">
                <div class="success-icon-circle d-flex align-items-center justify-content-center mx-auto bg-success bg-opacity-10 text-success rounded-circle" style="width: 80px; height: 80px;">
                    <i class="bi bi-check-circle-fill" style="font-size: 3rem;"></i>
                </div>
            </div>
            <h5 class="fw-bold text-dark">${title}</h5>
            <p class="text-muted small mb-3">${message}</p>
            <button type="button" id="success-done-btn" class="btn btn-primary btn-sm px-4">
                Great, thanks
            </button>
        </div>
    `);

    let actionTriggered = false;

    // Internal function to ensure the callback only runs once
    const runAction = () => {
        if (!actionTriggered) {
            actionTriggered = true;
            if (callback && typeof callback === 'function') {
                callback();
            }
        }
    };

    // 2. Manual Click Trigger
    $modalBody.find('#success-done-btn').on('click', function() {
        runAction();
    });

    // 3. Automated Timer Trigger
    setTimeout(() => {
        // Only trigger if the modal is still open/visible
        if ($.contains(document, $modalBody[0])) {
            runAction();
        }
    }, delay);
}

function setSupportField() {
    const $select = $("#supportModal select");
    
    // Use 'selected' but NOT 'disabled' so the value actually submits
    $select.html('<option value="Course content error" selected>Course content error</option>');
    
    // Visually disable it so the user can't change it, 
    // but it remains a valid form field.
    $select.css('pointer-events', 'none').addClass('bg-light');
    
    // Update the textarea placeholder to be more helpful for this step
    $("#supportDetails").attr("placeholder", "Please tell us which Board, Grade, or Major you are looking for...");
}


$(document).ready(function() {
    $("#submitTicketBtn").on('click', function() {
        const $btn = $(this);
        const $modal = $("#supportModal");
        const $form = $modal.find('form'); // Assuming your fields are inside a <form>
        const $modalBody = $modal.find('.modal-body');

        // 1. Data Capture
        const email = $('#reg-email').val()?.trim() || null;
        const issueType = $("#supportModal select").val();
        let details = $("#supportDetails").val();

        // Curriculum Capture
        const level = $('#reg-level-select').val() || $('#set-level-select').val();
        const context = $('#reg-context-select').val() || $('#set-context-select').val();
        const grade = $('#reg-grade-select').val() || $('#set-grade-select').val();
        const branch = $('#reg-branch-select').val() || $('#set-branch-field').val();

        if (level || context) {
            details += `\n\n--- Registration Context ---\n`;
            details += `Level: ${level || 'Not selected'}\n`;
            details += `Context: ${context || 'Not selected'}\n`;
            details += `Grade: ${grade || 'Not selected'}\n`;
            details += `Branch: ${branch || 'Not selected'}`;
        }

        // 2. Validation using handleFormError
        if (!details.trim()) {
            handleFormError($form, "Please provide some details about the course or issue.");
            return;
        }

        // 3. UI Processing State (Locked)
        toggleModalProcessing($modal, true);
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Sending...');

        $.ajax({
            url: "/main/submit_support_ticket",
            type: "POST",
            data: JSON.stringify({ 
                email: email, 
                issue_type: issueType, 
                details: details 
            }),
            contentType: "application/json",
            success: function(response) {
                // 4. Success State Integration
                showSuccessState(
                    $modalBody, 
                    "Sent!", 
                    "We'll get back to you.", 
                    () => $("#supportModal").modal('hide') // Now the button triggers this!
                );
                // Cleanup
                $("#supportDetails").val(''); 
            },
            error: function() {
                // 5. Error State Restoration
                toggleModalProcessing($modal, false);
                handleFormError($form, "Failed to send ticket. Please try again later.");
                $btn.prop('disabled', false).text("Submit Ticket");
            }
        });
    });
});