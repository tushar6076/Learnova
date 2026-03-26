import os
import json
import time
from datetime import datetime, timezone

from .schema import Subject, Chapter, ChapterTitleList # Added ChapterTitleList for skeleton phase
from .helper import call_groq

import os
import json
import time
from datetime import datetime, timezone
from .schema import Subject, Chapter, ChapterTitleList
from .helper import call_groq

def run_generator(app, course_id, level, context, branch, grade, subjects=[]):
    """
    Autonomous Curriculum Generator.
    If 'subjects' list is provided, it skips Phase 1 (AI Subject Selection).
    """
    # 0. Setup Directories
    BASE_DIR = app.config['BASE_DIR']
    json_dir = os.path.join(BASE_DIR, 'app', 'static', 'assets', 'json')
    os.makedirs(json_dir, exist_ok=True)
    
    checkpoint_path = "curriculum_checkpoint.json"
    output_file_path = os.path.join(json_dir, f"{course_id}_final_seed.json")

    # 1. Initialize course data
    course_data = {
        "course_id": course_id,
        "course_level": level,
        "course_context": context,
        "branch": branch,
        "grade_level": grade,
        "subjects": []
    }

    app.logger.info(f"🎯 Target: {context} in {branch} ({grade})")

    # --- PHASE 1: Determine Subjects ---
    # Logic: Use provided subjects if they exist; otherwise, ask AI for 5.
    if subjects and isinstance(subjects, list) and len(subjects) > 0:
        app.logger.info(f"🛠️ Using Admin-selected subjects: {', '.join(subjects)}")
        subject_names = subjects
    else:
        app.logger.info("🧠 PHASE 1: AI determining curriculum subjects...")
        skeleton_prompt = (
            f"Act as a University Registrar for {level} level. For a {context} degree in {branch} for {grade}, "
            f"identify exactly 5 core subjects. Provide only the subject names."
        )
        subjects_skeleton = call_groq(skeleton_prompt, ChapterTitleList)
        subject_names = subjects_skeleton.get("titles", []) if subjects_skeleton else []

        # Fallback if AI fails
        if len(subject_names) < 1:
            app.logger.warning("⚠️ AI failed to provide subjects. Using emergency fallback.")
            subject_names = ["General Theory", "Applied Science", "Core Principles", "Modern Ethics", "Research Methods"]

    app.logger.info(f"📋 Final Subject List: {', '.join(subject_names)}")

    # --- 2. Loop Through Subjects ---
    for s_idx, sub_name in enumerate(subject_names):
        app.logger.info(f"\n📂 PHASE 2: Expanding Subject {s_idx+1}/{len(subject_names)} -> {sub_name}")
        
        # ID Generation
        short_course = course_id.split('_')[-2:] # Takes 'YR1' and 'CSE'
        short_prefix = "_".join(short_course)
        clean_sub = "".join(filter(str.isalnum, sub_name))[:4].upper()
        
        # Pattern: [SHORT_COURSE]_[SUB_INDEX] (e.g., YR1_CSE_S1)
        sub_id = f"{short_prefix}_{clean_sub}_{s_idx+1}"[:32]
        
        sub_prompt = (
            f"Subject: '{sub_name}'. Context: {branch} {grade} ({level}). "
            f"Provide a subject_overview, a Bootstrap icon (bi-), and 2 achievements."
        )
        
        sub_meta = call_groq(sub_prompt, Subject)
        if not sub_meta:
            app.logger.error(f"❌ Skipping {sub_name}: AI returned None.")
            continue
        
        current_subject = {
            "subject_id": sub_id,
            "subject_name": sub_name,
            "subject_overview": sub_meta.get("subject_overview", "Comprehensive study material."),
            "icon": sub_meta.get("icon", "bi-book"),
            "achievement": sub_meta.get("achievement", []),
            "chapters": []
        }

        # --- 3. Loop Through Chapters (Fixed at 5 per Subject for consistency) ---
        for i in range(1, 6):
            chap_id = f"{sub_id}_CH{i}"[:32]
            app.logger.info(f"   📝 PHASE 3 & 4: Gen Chapter {i} + 30 Quizzes for {sub_name}...")
            
            chap_prompt = (
                f"Subject: {sub_name}. Generate Chapter {i} for {branch} {grade} ({level}). "
                f"Requirements: Title, 500-word overview, 2 video links, 30 MCQs. ID: {chap_id}"
            )
            
            chapter_data = call_groq(chap_prompt, Chapter)
            
            if chapter_data:
                chapter_data["chapter_id"] = chap_id
                current_subject["chapters"].append(chapter_data)
                
                # --- Continuous Checkpoint with Timezone ---
                try:
                    with open(checkpoint_path, "w") as f:
                        json.dump({
                            "status": "In Progress",
                            "last_updated": datetime.now(timezone.utc).isoformat(),
                            "course_id": course_id,
                            "current_subject": sub_name,
                            "data": course_data
                        }, f, indent=4)
                except Exception as e:
                    app.logger.error(f"Checkpoint write failed: {e}")
            
            # Anti-Rate Limit Delay (Gemini-Flash is fast, but Groq/AI APIs need breathing room)
            time.sleep(2.2) 

        course_data["subjects"].append(current_subject)

    # --- 4. Final Export ---
    try:
        with open(output_file_path, "w") as f:
            json.dump({"courses": [course_data]}, f, indent=4)
            
        app.logger.info(f"\n✨ SUCCESS: Course JSON saved to {output_file_path}")
        return output_file_path
    except Exception as e:
        app.logger.error(f"🔥 Final export failed: {e}")
        return None

# if __name__ == "__main__":
#     import argparse
#     parser = argparse.ArgumentParser(description="Autonomous B.Tech Curriculum Generator")
#     parser.add_argument("--id", required=True)
#     parser.add_argument("--branch", required=True)
#     parser.add_argument("--grade", required=True)
#     parser.add_argument("--level", default="college")
#     parser.add_argument("--context", default="B.Tech")

#     args = parser.parse_args()
#     run_generator(args.id, args.level, args.context, args.branch, args.grade)