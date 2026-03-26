# services/email/templates.py

# --- 1. WELCOME EMAIL TEMPLATE ---
WELCOME_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px; border-top: 5px solid #007bff; border-radius: 10px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #007bff; margin: 0; font-size: 28px;">Welcome to Learnova!</h1>
            </div>
            
            <p style="font-size: 18px; color: #444;">Hi <strong>{username}</strong>,</p>
            
            <p style="font-size: 16px; color: #555;">
                We are thrilled to have you join us! <strong>Learnova</strong> is built on a simple promise: 
                <span style="color: #007bff; font-weight: bold;">Read Less, Discover More.</span>
            </p>
            
            <p style="font-size: 16px; color: #555;">
                Whether you're prepping for exams or diving into new research, your journey just got a whole lot faster. 
                Our AI agents are ready to help you summarize complex topics and answer your toughest questions in seconds.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="{dashboard_url}" style="background-color: #007bff; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Explore Your Dashboard
                </a>
            </div>
            
            <p style="font-size: 14px; color: #888;">
                <strong>Pro Tip:</strong> Check out the 'Subjects Explored' section on your profile to track your mastery progress as you learn.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
            
            <p style="font-size: 0.9em; color: #999; text-align: center; margin-bottom: 0;">
                Happy Learning!<br>
                <strong>The Learnova Team</strong>
            </p>
        </div>
    </body>
</html>
"""

# --- 2. LOGIN ALERT TEMPLATE ---
LOGIN_ALERT_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-top: 4px solid #007bff; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #333; margin-top: 0;">New Login Detected</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>This is an automated notification to let you know that your <strong>Learnova</strong> account was just accessed.</p>
            
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.9em; color: #555;">
                    <strong>Account:</strong> {email}<br>
                    <strong>Time:</strong> {time}<br>
                    <strong>Action:</strong> Successful Login
                </p>
            </div>

            <p>If this was you, you can safely ignore this message. No further action is required.</p>
            
            <p style="color: #dc3545; font-weight: bold;">If you did NOT perform this login:</p>
            <p>Please secure your account immediately by resetting your password using the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Secure My Account</a>
            </div>
            
            <p style="font-size: 0.85em; color: #777;">
                If you have trouble with the button, copy and paste this link into your browser:<br>
                <span style="color: #007bff;">{reset_url}</span>
            </p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.85em; color: #777; text-align: center;">
                Security Team | <strong>Learnova</strong>
            </p>
        </div>
    </body>
</html>
"""

# --- 3. PASSWORD RESET CODE TEMPLATE ---
PASSWORD_RESET_VERIFICATION_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #fdfdfd; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #ffc107; border-radius: 8px; background-color: #fffef0;">
            <h2 style="color: #856404; margin-top: 0;">Verification Code</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>You recently requested to reset your password for your <strong>Learnova</strong> account. Please enter the 6-digit verification code below to proceed:</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #ffffff; border: 2px dashed #ffc107; border-radius: 10px;">
                <span style="font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 8px; font-family: monospace;">{code}</span>
            </div>
            
            <p style="font-size: 0.95em;">This is a <strong>one-time code</strong> and will expire in 10 minutes for your security.</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="margin: 0; font-size: 0.85em; color: #856404;">
                    <strong>Didn't request this?</strong> If you didn't try to reset your password, you can safely ignore this email. Someone may have typed your email address by mistake.
                </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.85em; color: #777; text-align: center;">
                Security Team | <strong>Learnova</strong>
            </p>
        </div>
    </body>
</html>
"""

# --- 4. PASSWORD RESET SUCCESS TEMPLATE ---
PASSWORD_RESET_SUCCESS_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-top: 4px solid #28a745; border-radius: 8px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h2 style="color: #28a745; margin-top: 0;">Password Updated Successfully</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>This is a confirmation that the password for your <strong>Learnova</strong> account was recently changed.</p>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; color: #155724; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.95em;">
                    <strong>Security Check:</strong> If you made this change, you can safely ignore this email. No further action is required.
                </p>
            </div>
            
            <p style="color: #721c24; font-weight: bold;">Didn't make this change?</p>
            <p>If you did not reset your password, please contact our security team immediately or attempt to reset it again to lock out any unauthorized access.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.85em; color: #777; text-align: center;">
                Security Team | <strong>Learnova</strong><br>
                <em>This is an automated message, please do not reply.</em>
            </p>
        </div>
    </body>
</html>
"""

# --- 5. PASSWORD RESET SUCCESS TEMPLATE ---
ACCOUNT_DELETED_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-top: 4px solid #dc3545; border-radius: 8px; background-color: #ffffff; shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #dc3545; margin-top: 0;">Account Deleted</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>We are writing to confirm that your <strong>Learnova</strong> account has been successfully deleted as per your request.</p>
            
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.95em;">
                    <strong>Note:</strong> All your progress, test results, and earned badges have been removed from our active database. 
                </p>
            </div>
            
            <p>We're sorry to see you go! If this was a mistake, or if you change your mind in the future, you are always welcome to create a new account and start your learning journey again.</p>
            
            <p>If you did <strong>not</strong> request this deletion, please contact our support team immediately.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.85em; color: #777; text-align: center;">
                Best regards,<br>
                The <strong>Learnova</strong> Team
            </p>
        </div>
    </body>
</html>
"""

# --- 6. SUPPORT ASSURANCE TEMPLATE ---
SUPPORT_ASSURANCE_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-top: 4px solid #0d6efd; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #0d6efd; margin-top: 0;">We've Received Your Ticket</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>Thank you for reaching out to <strong>Learnova Help Center</strong>. This email confirms that we have successfully received your support request.</p>
            
            <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 0.9em; text-transform: uppercase; color: #6c757d; font-weight: bold;">Ticket Summary</p>
                <p style="margin: 0 0 5px 0;"><strong>Issue Type:</strong> {issue_type}</p>
                <p style="margin: 0;"><strong>Details:</strong> {issue_details}</p>
            </div>
            
            <p>Our support team usually reviews requests and responds within <strong>24 hours</strong>. We appreciate your patience as we work to resolve this for you.</p>
            
            <p>If you have additional information to add, simply reply to this email.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.85em; color: #777; text-align: center;">
                Best regards,<br>
                The <strong>Learnova</strong> Support Team
            </p>
        </div>
    </body>
</html>
"""

# --- 7. COURSE FETCHED / GENERATED TEMPLATE ---
COURSE_FETCHED_HTML_BODY = """
<html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f0f4f8; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-top: 5px solid #28a745; border-radius: 10px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="font-size: 50px;">📚</span>
                <h2 style="color: #28a745; margin-top: 10px; font-size: 24px;">Your Requested Course is Live!</h2>
            </div>
            
            <p style="font-size: 16px;">Hello <strong>{username}</strong>,</p>
            
            <p style="font-size: 16px; color: #555;">
                Great news! Our AI academic team has finished architecting the course you requested. It is now fully seeded into our database and ready for you to explore.
            </p>
            
            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 15px 0; font-size: 0.85em; text-transform: uppercase; color: #6c757d; font-weight: bold; letter-spacing: 1px;">Course Specifications</p>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0; color: #666; width: 40%;"><strong>Academic Level:</strong></td>
                        <td style="padding: 5px 0; color: #333;">{level}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;"><strong>Context:</strong></td>
                        <td style="padding: 5px 0; color: #333;">{context}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;"><strong>Grade / Year:</strong></td>
                        <td style="padding: 5px 0; color: #333;"><span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.9em;">{grade}</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;"><strong>Branch:</strong></td>
                        <td style="padding: 5px 0; color: #333;"><strong>{branch}</strong></td>
                    </tr>
                </table>
            </div>
            
            <p style="font-size: 15px; color: #555;">
                This course includes a full curriculum with multiple subjects, chapters, and AI-generated practice questions to help you master the material quickly.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="{dashboard_url}" style="background-color: #28a745; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(40, 167, 69, 0.2);">
                    Start Learning Now
                </a>
            </div>
            
            <p style="font-size: 13px; color: #888; text-align: center; font-style: italic;">
                "Read Less, Discover More."
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 0.85em; color: #999; text-align: center;">
                Best regards,<br>
                The <strong>Learnova</strong> Academic Team
            </p>
        </div>
    </body>
</html>
"""