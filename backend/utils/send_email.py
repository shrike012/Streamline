import resend
from flask import current_app

def send_password_reset_email(to_email, reset_link):
    try:
        result = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": to_email,
            "subject": "Reset your Streamline password",
            "html": f"<p>Click below to reset your password:</p><p><a href='{reset_link}'>Reset Password</a></p>"
        })
        current_app.logger.info(f"Password reset email sent to {to_email}: {result}")
        return result
    except Exception as e:
        current_app.logger.error(f"Error sending reset email to {to_email}: {e}")
        return None