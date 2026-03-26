from fpdf import FPDF
import os
from datetime import datetime

class LearnovaNotesPDF(FPDF):
    def __init__(self, dynamic_title="Course Notes"):
        super().__init__()
        self.dynamic_title = dynamic_title

    def header(self):
        # Set font for branding
        self.set_font("helvetica", "B", 10)
        self.set_text_color(41, 128, 185) # Learnova Blue
        
        # Left Side: System Tag
        self.cell(80, 10, "LEARNOVA EDUCATION", align="L")
        
        # Center: Dynamic Title (Truncated if too long)
        self.set_font("helvetica", "B", 9)
        self.set_text_color(50, 50, 50)
        display_title = (self.dynamic_title[:40] + '...') if len(self.dynamic_title) > 40 else self.dynamic_title
        self.cell(40, 10, display_title.upper(), align='C')
        
        # Right Side: Report Branding
        self.set_font("helvetica", "I", 9)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "AI-Generated Notes", align="R", ln=True)
        
        # Blue accent separator line
        self.set_draw_color(41, 128, 185)
        self.set_line_width(0.5)
        self.line(10, 20, 200, 20)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_draw_color(220, 220, 220)
        self.line(10, self.get_y(), 200, self.get_y())
        
        self.set_font("helvetica", "I", 8)
        self.set_text_color(160, 160, 160)
        
        self.cell(100, 10, f"© {datetime.now().year} Learnova Engine", align="L")
        self.cell(0, 10, f"Page {self.page_no()} of {{nb}}", align="R")

def create_pdf(course_title, data, output_path):
    """
    course_title: String for the header
    data: Object/Dict containing .title, .summary, .sections
    """
    try:
        # Pass the dynamic title to the class constructor
        pdf = LearnovaNotesPDF(dynamic_title=course_title)
        pdf.alias_nb_pages() 
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()
        
        # --- Main Body Title ---
        pdf.set_font("helvetica", "B", 24)
        pdf.set_text_color(20, 33, 61) 
        # Safety check for data attributes
        main_title = getattr(data, 'title', data.get('title', 'Chapter Overview'))
        pdf.multi_cell(0, 12, main_title, align='L')
        pdf.ln(5)
        
        # --- Meta Line ---
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, f"SUBJECT: {course_title.upper()}", ln=True)
        pdf.set_font("helvetica", "", 9)
        pdf.cell(0, 5, f"DATE: {datetime.now().strftime('%Y-%m-%d')}", ln=True)
        pdf.ln(10)
        
        # --- Summary Section ---
        pdf.set_fill_color(245, 247, 250)
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, " EXECUTIVE SUMMARY", ln=True, fill=True)
        pdf.ln(2)
        pdf.set_font("times", "", 11)
        summary_text = getattr(data, 'summary', data.get('summary', ''))
        pdf.multi_cell(0, 6, summary_text)
        pdf.ln(10)
        
        # --- Content Sections ---
        sections = getattr(data, 'sections', data.get('sections', []))
        for section in sections:
            if pdf.get_y() > 240:
                pdf.add_page()

            header_text = getattr(section, 'header', section.get('header', 'Section'))
            pdf.set_font("helvetica", "B", 14)
            pdf.set_text_color(41, 128, 185)
            pdf.cell(0, 10, header_text, ln=True)
            
            pdf.set_draw_color(41, 128, 185)
            pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 30, pdf.get_y())
            pdf.ln(4)
            
            content_text = getattr(section, 'content', section.get('content', ''))
            pdf.set_font("times", "", 11)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 6, content_text)
            pdf.ln(8)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pdf.output(output_path)
        return True
        
    except Exception as e:
        print(f"PDF Generation Error: {e}")
        return False