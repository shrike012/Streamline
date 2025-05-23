def analyze_idea(idea_text):
    feedback = "This idea is specific and has viral potential. Could be stronger with a more emotional angle."
    score = 82

    return {
        "idea": idea_text,
        "score": score,
        "feedback": feedback
    }

def analyze_packaging(title, thumbnail_description):
    return {
        "score": 71,
        "feedback": "Good title and thumbnail pairing. Could benefit from stronger emotion or contrast.",
        "title": title,
        "thumbnail_description": thumbnail_description
    }

def analyze_content(script, medium, visual_style):
    return {
        "score": 79,
        "feedback": "The script is well-structured. Visual style fits the format. Consider tightening the pacing.",
        "script": script,
        "medium": medium,
        "visual_style": visual_style
    }