from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from config import Config
from models import db, User, DiaryEntry, MoodLog, ChatMessage, GratitudeEntry
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from functools import wraps
import os
from groq import Groq

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

client = Groq(api_key=app.config["GROQ_API_KEY"])

with app.app_context():
    db.create_all()


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return wrapper


# ───────────────── Auth & Home ─────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup", methods=["POST"])
def signup():
    name = request.form.get("name", "").strip()
    username = request.form.get("username", "").strip().lower()
    password = request.form.get("password", "")

    if not name or not username or not password:
        return redirect(url_for("index", error="Please fill in all fields"))

    if len(password) < 6:
        return redirect(url_for("index", error="Password must be at least 6 characters"))

    existing = User.query.filter_by(username=username).first()
    if existing:
        return redirect(url_for("index", error="That username is already taken"))

    user = User(
        name=name,
        username=username,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()
    session["user_id"] = user.id
    session["user_name"] = user.name
    return redirect(url_for("index"))


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username", "").strip().lower()
    password = request.form.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return redirect(url_for("index", error="Incorrect username or password"))

    session["user_id"] = user.id
    session["user_name"] = user.name
    return redirect(url_for("index"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


# ───────────────── Diary ─────────────────

@app.route("/diary")
@login_required
def diary():
    user_id = session.get("user_id")
    entries = DiaryEntry.query.filter_by(user_id=user_id).order_by(DiaryEntry.created_at.desc()).all()
    return render_template("diary.html", entries=entries)


@app.route("/diary/save", methods=["POST"])
@login_required
def save_diary():
    data = request.json
    user_id = session.get("user_id")
    entry = DiaryEntry(
        user_id=user_id,
        title=data.get("title", ""),
        content=data.get("content", ""),
        shared_with_ai=False
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"success": True, "entry_id": entry.id})


@app.route("/diary/discuss/<int:entry_id>", methods=["POST"])
@login_required
def discuss_entry(entry_id):
    entry = DiaryEntry.query.get(entry_id)
    if not entry:
        return jsonify({"error": "Entry not found"})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a warm, empathetic personal therapist. The user has shared a diary entry with you. Listen carefully, acknowledge their feelings, and offer gentle, honest perspective and advice. Be like a wise, caring friend — not clinical."},
            {"role": "user", "content": f"Here is my diary entry:\n\n{entry.content}"}
        ]
    )
    ai_response = response.choices[0].message.content
    entry.ai_response = ai_response
    entry.shared_with_ai = True
    db.session.commit()
    return jsonify({"response": ai_response})


# ───────────────── Chat ─────────────────

@app.route("/chat")
@login_required
def chat():
    return render_template("chat.html")


@app.route("/chat/send", methods=["POST"])
@login_required
def send_message():
    data = request.json
    user_id = session.get("user_id")
    user_message = data.get("message", "")

    history = ChatMessage.query.filter_by(user_id=user_id).order_by(ChatMessage.created_at.desc()).limit(10).all()
    history = list(reversed(history))

    messages = [{"role": "system", "content": "You are MindEase, a warm and empathetic AI companion. Help the user with overthinking, friendships, decisions, and emotions. Be calm, honest, and supportive like a wise friend."}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )
    ai_reply = response.choices[0].message.content

    db.session.add(ChatMessage(user_id=user_id, role="user", content=user_message))
    db.session.add(ChatMessage(user_id=user_id, role="assistant", content=ai_reply))
    db.session.commit()

    return jsonify({"reply": ai_reply})


# ───────────────── Mood ─────────────────

@app.route("/mood")
@login_required
def mood():
    user_id = session.get("user_id")
    logs = MoodLog.query.filter_by(user_id=user_id).order_by(MoodLog.created_at.desc()).limit(7).all()
    logs_data = [
        {
            "mood": log.mood,
            "note": log.note,
            "created_at": log.created_at.strftime('%Y-%m-%d')
        }
        for log in logs
    ]
    return render_template("mood.html", logs=logs, logs_data=logs_data)


@app.route("/mood/save", methods=["POST"])
@login_required
def save_mood():
    data = request.json
    user_id = session.get("user_id")
    log = MoodLog(user_id=user_id, mood=data.get("mood"), note=data.get("note", ""))
    db.session.add(log)
    db.session.commit()
    return jsonify({"success": True})


# ───────────────── Breathe ─────────────────

@app.route("/breathe")
@login_required
def breathe():
    return render_template("breathe.html")


# ───────────────── Gratitude ─────────────────

@app.route("/gratitude")
@login_required
def gratitude():
    user_id = session.get("user_id")
    entries = GratitudeEntry.query.filter_by(user_id=user_id).order_by(GratitudeEntry.created_at.desc()).limit(7).all()
    return render_template("gratitude.html", entries=entries)


@app.route("/gratitude/save", methods=["POST"])
@login_required
def save_gratitude():
    data = request.json
    user_id = session.get("user_id")
    entry = GratitudeEntry(
        user_id=user_id,
        item1=data.get("item1", ""),
        item2=data.get("item2", ""),
        item3=data.get("item3", "")
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"success": True})


# ───────────────── Vent ─────────────────

@app.route("/vent")
@login_required
def vent():
    return render_template("vent.html")


# ───────────────── Stats ─────────────────

@app.route("/stats")
@login_required
def stats():
    user_id = session.get("user_id")
    entries = DiaryEntry.query.filter_by(user_id=user_id).count()
    moods = MoodLog.query.filter_by(user_id=user_id).count()
    chats = ChatMessage.query.filter_by(user_id=user_id, role="user").count()
    return jsonify({"entries": entries, "moods": moods, "chats": chats})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))