import os
import smtplib
from email.message import EmailMessage
from flask import current_app

def send_password_reset_email(to_email, reset_link):
    try:
        # Load credentials from env or Railway dashboard
        email_user = os.getenv("EMAIL_USER")  # your Gmail address
        email_pass = os.getenv("EMAIL_PASS")  # your 16-char app password

        msg = EmailMessage()
        msg["Subject"] = "Reset your Streamline password"
        msg["From"] = email_user
        msg["To"] = to_email
        msg.set_content(
            f"Click the link to reset your password: {reset_link}", subtype="plain"
        )
        msg.add_alternative(
            f"""
            <html>
              <body>
                <p>Click below to reset your password:</p>
                <p><a href="{reset_link}">Reset Password</a></p>
              </body>
            </html>
            """,
            subtype="html",
        )

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(email_user, email_pass)
            server.send_message(msg)

        current_app.logger.info(f"Password reset email sent to {to_email}")
        return True

    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to_email}: {e}")
        return False