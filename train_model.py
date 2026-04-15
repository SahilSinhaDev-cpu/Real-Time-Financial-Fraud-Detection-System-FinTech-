import pandas as pd
import kagglehub
import os
from sklearn.ensemble import IsolationForest
import joblib

print("Downloading dataset from Kaggle...")
# Using your exact Kaggle API snippet
path = kagglehub.dataset_download("sriharshaeedala/financial-fraud-detection-dataset")

# Find the CSV file inside the downloaded folder
csv_file = [f for f in os.listdir(path) if f.endswith('.csv')][0]
full_path = os.path.join(path, csv_file)

print(f"Loading data from {full_path} (this is a large file, please wait)...")
df = pd.read_csv(full_path)

# The Kaggle dataset uses these key numerical features for transactions
features = ['amount', 'oldbalanceOrg', 'newbalanceOrig']

# For Phase 1 training, we drop empty values and just use the core financial features
X = df[features].dropna()

print("Training Isolation Forest model on real transaction data...")
# contamination=0.01 expects roughly 1% of the data to be fraudulent
model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
model.fit(X)

joblib.dump(model, 'fraud_model.pkl')
print("Model trained on Kaggle data and saved successfully as fraud_model.pkl!")