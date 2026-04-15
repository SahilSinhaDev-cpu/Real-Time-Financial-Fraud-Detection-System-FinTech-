from app import app, socketio

if __name__ == '__main__':
    print("Starting FinTech Fraud Detection Gateway on Port 5000...")
    # In a production environment, you would use Eventlet or Gevent here
    socketio.run(app, host='0.0.0.0', port=5001)