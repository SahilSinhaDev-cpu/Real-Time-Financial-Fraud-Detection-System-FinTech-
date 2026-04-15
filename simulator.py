import time
import requests
import pandas as pd
import kagglehub
import os
import random

API_URL = "http://127.0.0.1:5001/process_transaction"

print("Locating Kaggle dataset for live simulation...")
path = kagglehub.dataset_download("sriharshaeedala/financial-fraud-detection-dataset")
csv_file = [f for f in os.listdir(path) if f.endswith('.csv')][0]

# Load a sample of 5000 rows to simulate so we don't eat up all your RAM
df = pd.read_csv(os.path.join(path, csv_file)).sample(n=5000, random_state=42)

print("Starting Real-Data Streamer...")
print("Press Ctrl+C to stop.")

# Loop through the actual Kaggle rows and send them to the API
for index, row in df.iterrows():
    tx_data = {
        'amount': row['amount'],
        'oldbalanceOrg': row['oldbalanceOrg'],
        'newbalanceOrig': row['newbalanceOrig'],
        'vendor': row['nameDest'] # Using the destination account ID as the "vendor"
    }
    
    try:
        response = requests.post(API_URL, json=tx_data)
        result = response.json().get('status', 'ERROR')
        print(f"Sent: ${tx_data['amount']} to {tx_data['vendor']} | Result: {result}")
    except requests.exceptions.ConnectionError:
        print("Failed to connect. Is server.py running?")
        
    # Wait half a second before processing the next swipe
    time.sleep(0.5)