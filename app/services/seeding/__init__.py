import os
from .generator import run_generator
from .seed import seed_data

# This acts as the entry point for the rest of your app
def generate_and_seed(app, course_id, level, context, branch, grade, subjects=None):
    """
    Orchestrates the full flow:
    1. AI generates the nested JSON structure.
    2. The generator saves the file to the static assets folder.
    3. The seeder reads that file and populates the SQLAlchemy models.
    """
    try:
        # Step 1: Generate the JSON file via AI
        # This returns the absolute path to the generated file
        file_path = run_generator(app, course_id, level, context, branch, grade, subjects)
        
        if not file_path or not os.path.exists(file_path):
            app.logger.error(f"❌ Generation failed for {course_id}. No file created.")
            return False

        # Step 2: Seed the database using that file
        seed_data(app, file_path)
        
        app.logger.info(f"✅ Successfully generated and seeded: {course_id}")
        return True

    except Exception as e:
        app.logger.error(f"🔥 Critical error in generate_and_seed: {e}")
        return False

# Exporting these makes them accessible via 'from app.services.seeding import run_generator'
__all__ = ['run_generator', 'seed_data', 'generate_and_seed']