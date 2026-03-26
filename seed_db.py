import json
import os
from app import create_app

from app.extensions import db

from app.models import Courses, Subjects, Chapters

app = create_app('default')

def seed_data():
    with app.app_context():
        print("🚀 Cleaning existing data...")
        # Delete in reverse order of dependency
        Chapters.query.delete()
        Subjects.query.delete()
        Courses.query.delete()
        db.session.commit()

        # Path to your JSON file
        json_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'seed_data.json')
        
        if not os.path.exists(json_path):
            print(f"❌ Error: {json_path} not found.")
            return

        with open(json_path, 'r') as f:
            data = json.load(f)

        print(f"📦 Found {len(data['courses'])} courses in JSON. Starting import...")

        for c_data in data['courses']:
            # Create Course
            course = Courses(
                course_id=c_data['course_id'],
                course_level=c_data['course_level'],
                course_context=c_data['course_context'],
                branch=c_data['branch'],
                grade_level=c_data['grade_level']
            )
            db.session.add(course)
            
            # Process Subjects for this Course
            for s_data in c_data.get('subjects', []):
                subject = Subjects(
                    subject_id=s_data['subject_id'],
                    subject_name=s_data['subject_name'],
                    # Use .get() to provide safety for the fields you just added
                    subject_overview=s_data.get('subject_overview', 'No description available.'),
                    icon=s_data.get('icon', 'bi-book'), # Default icon if missing
                    achievement=s_data.get('achievement', []), # Default to empty list
                    course_id=course.course_id
                )
                db.session.add(subject)

                # Process Chapters for this Subject
                for ch_data in s_data.get('chapters', []):
                    chapter = Chapters(
                        chapter_id=ch_data['chapter_id'],
                        title=ch_data['title'],
                        # Use .get() to provide fallbacks for missing keys
                        overview=ch_data.get('overview', 'No overview available.'),
                        video_stack=ch_data.get('video_stack', []), # Defaults to empty list
                        quiz_data=ch_data.get('quiz_data', []),
                        subject_id=subject.subject_id
                    )
                    db.session.add(chapter)

        try:
            db.session.commit()
            print("✨ Success! Database populated from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"🔥 Critical Error during seeding: {e}")

if __name__ == "__main__":
    seed_data()