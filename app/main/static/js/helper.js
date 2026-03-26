function resetDropdowns(ids) {
    ids.forEach(id => {
        $(id).html('<option value="" selected disabled>Select Above First</option>');
        $(id).prop('disabled', true);
    });
    // Also clear the subject chips if we are resetting
    if (ids.includes('#set-grade')) {
        $("#set-subject-chips").html('<p class="text-muted small">Select a grade to see subjects.</p>');
    }
}

// Populates the "Board / Major" dropdown
function populateContexts(level, selectedContext = null) {
    // 1. Get the contexts (Boards) for the chosen level
    const contexts = Object.keys(dbHierarchy[level] || {});

    let html = "";
    
    // 2. Placeholder: Selected only if selectedContext is null
    if (contexts.length === 0) {
        html = `<option value="" disabled selected>No Board / Major Available</option>`;
        $("#set-context-select").prop('disabled', true);
    } else {
        html = `<option value="" disabled ${!selectedContext ? 'selected' : ''}>Select Board / Major</option>`;
        $("#set-context-select").prop('disabled', false);
        contexts.forEach(ctx => {
            const isSelected = (ctx === selectedContext) ? 'selected' : '';
            html += `<option value="${ctx}" ${isSelected}>${ctx}</option>`;
        });
    }

    $("#set-context-select").html(html);
}

// Populates the "Branch" dropdown
function populateBranches(level, context, selectedBranch = null) {
    // 1. Get the branches from the hierarchy object
    const branches = Object.keys(dbHierarchy[level]?.[context] || {});

    let html = "";
    
    // 2. Start with the placeholder. 
    if (branches.length === 0) {
        html = `<option value="" disabled selected}>No Branch Available</option>`;
        $("#set-branch").prop('disabled', true);
    } else {
        html = `<option value="" disabled ${!selectedBranch ? 'selected' : ''}>Select Branch</option>`;
        $("#set-branch").prop('disabled', false);

        branches.forEach(br => {
            const isSelected = (br === selectedBranch) ? 'selected' : '';
            html += `<option value="${br}" ${isSelected}>${br}</option>`;
        });
    }
    $("#set-branch").html(html);
}


function populateGrades(level, context, branch, selectedGrade = null) {
    // 1. Get the grades object safely
    const gradesObj = dbHierarchy[level]?.[context]?.[branch] || {};
    const gradeNames = Object.keys(gradesObj);

    let html = "";
    
    // 2. Placeholder: Selected only if selectedGrade is null
    if (gradeNames.length === 0) {
        html = `<option value="" disabled selected>No Grade / Year Available</option>`;
        $("#set-grade").prop('disabled', true);
    } else {
        html = `<option value="" disabled ${!selectedGrade ? 'selected' : ''}>Select Grade / Year</option>`;
        $("#set-grade").prop('disabled', false);

        gradeNames.forEach(gradeName => {
            const courseId = gradesObj[gradeName];
            const isSelected = (gradeName === selectedGrade) ? 'selected' : '';
            
            // value is the courseId (e.g., 5), text is the label (e.g., "STD 12")
            html += `<option value="${courseId}" ${isSelected}>${gradeName}</option>`;
        });
    }

    $("#set-grade").html(html);
}


function renderSubjectChips(available, selected) {
    const $container = $("#set-subject-chips");
    
    // 1. Ensure selected is always an array (prevents .includes crashes)
    const selectedList = selected || [];

    // 2. Guard Clause: If no subjects are found
    if (!available || available.length === 0) {
        $container.html(`
            <div class="text-center p-3 border rounded bg-light w-100">
                <i class="bi bi-journal-x text-muted fs-4"></i>
                <p class="text-muted small mb-0">No subjects found for this selection.</p>
            </div>
        `);
        return;
    }

    // 3. Render the Chips
    let html = available.map(s => {
        const isActive = selectedList.includes(String(s.id)); 
        
        return `
            <div class="subject-chip border rounded-pill px-3 py-1 me-2 mb-2 d-inline-block 
                        ${isActive ? 'active bg-primary text-white border-primary' : 'bg-white text-dark'}" 
                role="button" 
                data-val="${s.id}" 
                style="cursor: pointer; transition: all 0.2s ease;">
                <i class="bi ${isActive ? 'bi-check-circle-fill' : 'bi-plus-circle'} me-1"></i>
                ${s.name}
            </div>`;
    }).join('');

    $container.html(html);
}

function openSupportFromSettings() {
    // 1. Get instances of both modals
    const supportModalEl = document.getElementById('supportModal');
    
    const supportModal = new bootstrap.Modal(supportModalEl);


    // 3. Configure the support fields (Your existing logic)
    const $select = $("#supportModal select");
    $select.html('<option value="Course content error" selected>Course content error</option>');
    
    const currentLevel = $("#set-level-select").val() || "N/A";
    const currentContext = $("#set-context-select").val() || "N/A";
    
    $("#supportDetails").val(`I am looking to update my profile to ${currentLevel} - ${currentContext}, but my specific options aren't listed.`);

    // 4. Show the support modal after a tiny delay to allow the backdrop to reset
    setTimeout(() => {
        supportModal.show();
    }, 100);
}