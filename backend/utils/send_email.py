import resend

def send_password_reset_email(to_email, reset_link):
    try:
        print("Sending email to:", to_email)
        print("Reset link:", reset_link)
        result = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": to_email,
            "subject": "Reset your Streamline password",
            "html": f"<p>Click below to reset your password:</p><p><a href='{reset_link}'>Reset Password</a></p>"
        })
        print("Resend response:", result)
        return result
    except Exception as e:
        print("Resend error:", e)
        return None