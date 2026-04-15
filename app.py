from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
import joblib
import pandas as pd
import os
import sqlite3
from twilio.rest import Client

app = Flask(__name__)
app.config['SECRET_KEY'] = 'fintech_secure_key!'
socketio = SocketIO(app, cors_allowed_origins="*")

# --- 1. LOAD THE AI MODEL ---
try:
    model = joblib.load('fraud_model.pkl')
except FileNotFoundError:
    print("Warning: fraud_model.pkl not found. Please run train_model.py first.")
    model = None

# --- 2. TWILIO SMS CONFIGURATION ---
# Replace these with your actual Twilio credentials when you want real texts
TWILIO_SID = os.getenv('TWILIO_SID', 'your_account_sid')
TWILIO_AUTH = os.getenv('TWILIO_AUTH', 'your_auth_token')
TWILIO_PHONE = '+1234567890'
USER_PHONE = '+0987654321' 

# --- 3. DATABASE SETUP (The "Memory") ---
def init_db():
    conn = sqlite3.connect('fraud_detection.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS transactions 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  amount REAL, 
                  vendor TEXT, 
                  status TEXT, 
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

def save_to_db(amount, vendor, status):
    conn = sqlite3.connect('fraud_detection.db')
    c = conn.cursor()
    c.execute("INSERT INTO transactions (amount, vendor, status) VALUES (?, ?, ?)", 
              (amount, vendor, status))
    conn.commit()
    conn.close()

# Initialize the DB when this script loads
init_db()

# --- 4. FLASK ROUTES ---
@app.route('/')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    return render_template('index.html')

@app.route('/get_history')
def get_history():
    """Fetches the last 10 transactions so the dashboard loads with data."""
    conn = sqlite3.connect('fraud_detection.db')
    c = conn.cursor()
    c.execute("SELECT amount, vendor, status FROM transactions ORDER BY id DESC LIMIT 10")
    rows = c.fetchall()
    conn.close()
    
    # Convert to JSON list
    history = [{"amount": r[0], "vendor": r[1], "status": r[2]} for r in rows]
    return jsonify(history)

@app.route('/process_transaction', methods=['POST'])
def process_transaction():
    """The main engine: AI inference, Database saving, Web Sockets, and SMS Alerts"""
    if not model:
        return jsonify({"error": "Model offline"}), 500
        
    data = request.json
    
    # A. Format incoming data for the ML Model (Using Kaggle Features)
    features = pd.DataFrame([{
        'amount': data['amount'],
        'oldbalanceOrg': data['oldbalanceOrg'],
        'newbalanceOrig': data['newbalanceOrig']
    }])
    
    # B. AI Inference (-1 is anomaly/fraud, 1 is normal)
    prediction = model.predict(features)[0]
    status = "DECLINED (FRAUD)" if prediction == -1 else "APPROVED"
    
    # C. Save the final decision to our SQLite Database
    save_to_db(data['amount'], data['vendor'], status)
    
    # D. Broadcast live to the Web Dashboard
    socketio.emit('new_transaction', {
        'amount': data['amount'],
        'vendor': data['vendor'],
        'status': status
    })
    
    # E. Send Twilio SMS Alert (Only if it is Fraud!)
    if status == "DECLINED (FRAUD)":
        try:
            client = Client(TWILIO_SID, TWILIO_AUTH)
            client.messages.create(
                body=f"🚨 SECURITY ALERT: A purchase of ${data['amount']} at {data['vendor']} was blocked.",
                from_=TWILIO_PHONE,
                to=USER_PHONE
            )
            print(f"Twilio SMS sent to {USER_PHONE}")
        except Exception as e:
            # This safely catches the error so the server doesn't crash if Twilio isn't set up yet
            print("Twilio alert bypassed (configure credentials to activate).")
            
    return jsonify({"status": status})