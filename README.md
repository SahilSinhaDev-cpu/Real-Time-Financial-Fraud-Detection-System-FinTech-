# 🛡️ AI-Powered FinTech Fraud Monitor
### *Real-Time Event-Driven Transaction Security Gateway*

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)
![Machine Learning](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

## 📌 Project Overview
This project is a full-stack **Fraud Detection Gateway** designed to protect financial institutions from unauthorized transactions. It uses a Machine Learning model (trained on the Kaggle PaySim dataset) to perform real-time inference on incoming transaction streams.

The system isn't just a script—it's an **Event-Driven Ecosystem** that logs data, updates a live monitoring dashboard via WebSockets, and triggers automated SMS security alerts when high-risk fraud is detected.

---

## 🚀 Key Features
* **AI Inference Engine:** Uses a Scikit-Learn model to analyze transaction patterns (amount, balances, time) in milliseconds.
* **Live Monitoring Dashboard:** A responsive dark-mode UI built with **Bootstrap** and **Chart.js** that visualizes fraud trends live without page refreshes.
* **Data Persistence:** Integrated **SQLite** backend to maintain a permanent audit log of all approved and declined transactions.
* **Automated Intervention:** **Twilio API** integration to send instant SMS alerts to users when the AI blocks a transaction.
* **Traffic Simulator:** Includes a multi-threaded Python simulator to mimic real-world banking traffic.

---

## 🏗️ System Architecture
*(Place your Architecture Diagram PNG here)*

The system follows a modern micro-gateway pattern:
1. **Simulator** sends a JSON POST request to the **Flask API**.
2. **Flask** triggers the **ML Model** for a "Go/No-Go" decision.
3. The result is saved to the **SQL Database**.
4. **Socket.IO** "pushes" the data to the **Frontend** instantly.
5. If fraud is detected, **Twilio** sends a mobile alert.

---

## 🛠️ Tech Stack
* **Backend:** Python 3.x, Flask, Flask-SocketIO
* **AI/ML:** Scikit-Learn, Pandas, Joblib
* **Database:** SQLite3
* **Frontend:** HTML5, CSS3 (Custom Dark Theme), JavaScript (ES6), Bootstrap 5, Chart.js
* **APIs:** Twilio SMS Gateway

---
```mermaid
graph TD
    %% Define Styles
    classDef simulator fill:#f9f,stroke:#333,stroke-width:2px;
    classDef server fill:#66fcf1,stroke:#45a29e,stroke-width:2px,color:#000;
    classDef database fill:#f96,stroke:#333,stroke-width:2px;
    classDef external fill:#ff4d4d,stroke:#333,stroke-width:2px,color:#fff;

    subgraph Sources [Input Sources]
        A[Transaction Simulator]:::simulator
    end

    subgraph Gateway [Backend AI Gateway - Flask]
        B[process_transaction API]:::server
        C{AI Prediction Engine}:::server
        D[Socket.IO WebSocket]:::server
    end

    subgraph Storage [Persistence]
        E[(SQLite Database)]:::database
    end

    subgraph Frontend [Monitoring Interface]
        F[Web Dashboard]:::server
        G[Chart.js Visualization]:::server
    end

    subgraph Alerts [Notification Layer]
        H[Twilio SMS API]:::external
        I[User Mobile Device]:::external
    end

    %% Data Flow
    A -->|1. POST JSON Data| B
    B -->|2. Inference Request| C
    C -->|3. Approved/Declined| B
    B -->|4. Log Transaction| E
    B -->|5. Broadcast Event| D
    D -->|6. Real-time Update| F
    F -->|7. Update| G
    B -->|8. Alert if Fraud| H
    H -->|9. SMS Security Alert| I
 


