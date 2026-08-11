import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
import xgboost as xgb
import json

def train_lstm():
    print("Generating synthetic time-series data for LSTM...")
    # Generate 1000 sequences of length 3 (3 days of cases) predicting the 4th day
    X_train = np.random.rand(1000, 3, 1) * 50 # random cases between 0-50
    y_train = np.sum(X_train, axis=1) * 1.5 + np.random.rand(1000, 1) * 10 # dummy relation

    print("Building and training LSTM model...")
    model = Sequential([
        Input(shape=(3, 1)),
        LSTM(32, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X_train, y_train, epochs=5, batch_size=32, verbose=1)

    os.makedirs("./data/models", exist_ok=True)
    model.save("./data/models/outbreak_lstm.keras") # keras format is safer for tf2.17+
    print("LSTM model saved to ./data/models/outbreak_lstm.keras")

def train_xgboost():
    print("Generating synthetic tabular data for XGBoost...")
    # Features: [temp, humidity, recent_case_sum]
    # Labels: 0 (low), 1 (moderate), 2 (high)
    X_train = np.random.rand(1000, 3)
    X_train[:, 0] = X_train[:, 0] * 20 + 20 # Temp 20-40C
    X_train[:, 1] = X_train[:, 1] * 50 + 50 # Humidity 50-100%
    X_train[:, 2] = X_train[:, 2] * 200     # Cases 0-200

    y_train = []
    for row in X_train:
        risk_score = (row[0]-25)*2 + row[1]*0.5 + row[2]*2
        if risk_score > 350:
            y_train.append(2)
        elif risk_score > 200:
            y_train.append(1)
        else:
            y_train.append(0)
    
    y_train = np.array(y_train)

    print("Building and training XGBoost Classifier...")
    model = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1, objective='multi:softmax', num_class=3)
    model.fit(X_train, y_train)

    os.makedirs("./data/models", exist_ok=True)
    model.save_model("./data/models/outbreak_xgb.json")
    print("XGBoost model saved to ./data/models/outbreak_xgb.json")

if __name__ == "__main__":
    train_lstm()
    train_xgboost()
    print("All models trained and saved successfully.")
