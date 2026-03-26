document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const levelSelect = document.getElementById('set-level-select');
    const gradeSelect = document.getElementById('set-grade-select');
    const contextField = document.getElementById('set-context-field');
    const branchField = document.getElementById('set-branch-field');
    const courseIdInput = document.getElementById('course_id');
    const aiForm = document.getElementById('ai-gen-form');
    const submitBtn = document.getElementById('submit-gen');
    const statusBox = document.getElementById('gen-status');
    
    // Subject Preview Elements
    const previewSection = document.getElementById('subject-preview-section');
    const chipContainer = document.getElementById('subject-chips');

    let debounceTimer;

    // --- 1. DYNAMIC GRADE GENERATOR ---
    if (levelSelect) {
        levelSelect.addEventListener('change', function() {
            const level = this.value;
            gradeSelect.disabled = false;
            gradeSelect.innerHTML = '<option value="" selected disabled>Select Grade/Year</option>';

            if (level === 'school') {
                for (let i = 6; i <= 12; i++) {
                    gradeSelect.innerHTML += `<option value="STD ${i}">Standard ${i}</option>`;
                }
            } else if (level === 'college') {
                for (let i = 1; i <= 4; i++) {
                    gradeSelect.innerHTML += `<option value="YEAR ${i}">Year ${i}</option>`;
                }
            }
            updateSlug();
        });
    }

    // --- 2. AUTO-SLUG GENERATOR (The Master Toggle) ---
    const updateSlug = () => {
        const clean = (val) => val.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        if (!levelSelect.value) {
            courseIdInput.value = "";
            return;
        }

        const acadLevel = levelSelect.value === 'college' ? 'UNI' : 'SCH';
        const context = clean(contextField.value);
        const branch = clean(branchField.value);
        
        let grade = gradeSelect.value.replace(/\s+/g, '').toUpperCase();
        grade = grade.replace('YEAR', 'YR').replace('STANDARD', 'STD');

        if (levelSelect.value && context && branch && grade) {
            const segments = [acadLevel, context, grade, branch].filter(Boolean);
            let generatedId = segments.join('_').substring(0, 32);
            
            courseIdInput.value = generatedId;

            const countEl = document.getElementById('char-count');
            countEl.innerText = `${generatedId.length}/32`;
            countEl.className = generatedId.length >= 32 ? 'text-danger small fw-bold' : 'text-primary small';
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchSubjectPreview, 800);
        } else {
            courseIdInput.value = "";
            document.getElementById('char-count').innerText = "0/32";
            previewSection.classList.add('d-none');
            chipContainer.innerHTML = '';
        }
    };

    // --- 3. SUBJECT PREVIEW (Multi-Selection Logic) ---
    const fetchSubjectPreview = async () => {
        if (!courseIdInput.value) return;

        previewSection.classList.remove('d-none');
        chipContainer.innerHTML = `
            <div class="d-flex align-items-center text-muted small">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                AI is suggesting 10+ curriculum options...
            </div>`;

        try {
            const response = await fetch('/admin/get_subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_level: levelSelect.value,
                    course_context: contextField.value,
                    branch: branchField.value,
                    grade: gradeSelect.value
                })
            });

            const subjects = await response.json();

            if (subjects && Array.isArray(subjects) && subjects.length > 0) {
                chipContainer.innerHTML = ''; 
                subjects.forEach(sub => {
                    const chip = document.createElement('span');
                    // Style: Default is light (unselected)
                    chip.className = "subject-chip badge rounded-pill bg-light text-dark border border-secondary border-opacity-25 px-3 py-2 fw-medium m-1 transition-all";
                    chip.style.cursor = "pointer";
                    chip.dataset.subjectName = sub;
                    chip.innerHTML = `<i class="bi bi-plus-circle me-2 text-primary"></i>${sub}`;
                    
                    // Click Event to Toggle Selection
                    chip.addEventListener('click', function() {
                        const isSelected = this.classList.contains('bg-primary');
                        if (isSelected) {
                            // Deselect
                            this.classList.replace('bg-primary', 'bg-light');
                            this.classList.replace('text-white', 'text-dark');
                            this.querySelector('i').classList.replace('text-white', 'text-primary');
                            this.querySelector('i').classList.replace('bi-check-circle-fill', 'bi-plus-circle');
                        } else {
                            // Select
                            this.classList.replace('bg-light', 'bg-primary');
                            this.classList.replace('text-dark', 'text-white');
                            this.querySelector('i').classList.replace('text-primary', 'text-white');
                            this.querySelector('i').classList.replace('bi-plus-circle', 'bi-check-circle-fill');
                        }
                    });

                    chipContainer.appendChild(chip);
                });
            }
        } catch (err) {
            chipContainer.innerHTML = `<span class="text-muted small">AI suggestions hidden. Proceed with manual entry or auto-pilot.</span>`;
        }
    };

    // --- 4. EVENT LISTENERS ---
    [contextField, branchField].forEach(el => {
        el.addEventListener('input', updateSlug);
    });
    gradeSelect.addEventListener('change', updateSlug);

    // --- 5. AI GENERATION SUBMIT ---
    if (aiForm) {
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Collect ONLY selected subjects from chips
            const selectedChips = document.querySelectorAll('.subject-chip.bg-primary');
            const subjectsToSeed = Array.from(selectedChips).map(c => c.dataset.subjectName);

            const reviewId = window.location.pathname.split('/').pop();
            const payload = {
                course_id: courseIdInput.value,
                level: levelSelect.value,
                context: contextField.value.toUpperCase(),
                branch: branchField.value.toUpperCase(),
                grade: gradeSelect.value,
                subjects: subjectsToSeed // If empty, backend will auto-generate 5
            };

            const confirmMsg = subjectsToSeed.length > 0 
                ? `Generate curriculum for selected subjects: ${subjectsToSeed.join(', ')}?`
                : `No subjects selected. Allow AI to choose the 5 most relevant subjects for ${payload.course_id}?`;

            if(!confirm(confirmMsg)) return;

            submitBtn.disabled = true;
            statusBox.classList.remove('d-none');
            submitBtn.innerHTML = `<span class="spinner-grow spinner-grow-sm me-2"></span>AI Authoring...`;

            try {
                const response = await fetch(`/admin/reviews/${reviewId}/resolve_issue/add_course`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert("✨ Course successfully seeded.");
                    window.location.href = "/admin/dashboard/reviews";
                } else {
                    const errData = await response.json();
                    alert("Error: " + (errData.message || "Seeding failed."));
                }
            } catch (err) {
                alert("Network error.");
            } finally {
                submitBtn.disabled = false;
                statusBox.classList.add('d-none');
                submitBtn.innerHTML = `<i class="bi bi-stars me-2"></i>Generate & Seed Course`;
            }
        });
    }
});