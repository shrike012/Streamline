import resend

def send_password_reset_email(to_email, reset_link):
    try:
        return resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": "jasonr23232@gmail.com",
            "subject": "Reset your Streamline password",
            "html": f"<p>Click below to reset your password:</p><p><a href='{reset_link}'>Reset Password</a></p>"
        })
    except Exception as e:
        print("Resend error:", e)
        return None