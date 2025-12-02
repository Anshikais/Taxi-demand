from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime as dt

app = Flask(__name__)
CORS(app)  # allow requests from frontend (browser)

def preprocess(payload):
    dt_obj = dt.datetime.fromisoformat(payload["datetime"])
    hour = dt_obj.hour
    day = dt_obj.weekday()  # 0 = Monday, 6 = Sunday

    weather = payload.get("weather", "clear")
    traffic = payload.get("traffic", "medium")
    event = payload.get("event", False)

    # Base demand by hour (peak vs off-peak)
    if 7 <= hour <= 9 or 18 <= hour <= 21:
        base = 120   # peak hours
    elif 10 <= hour <= 17:
        base = 80    # normal hours
    else:
        base = 40    # late night / early morning

    # Adjust by day (weekend slightly higher)
    if day in (5, 6):  # Saturday, Sunday
        base *= 1.15

    # Adjust by weather
    if weather == "rainy":
        base *= 1.25
    elif weather == "storm":
        base *= 1.4
    elif weather == "cloudy":
        base *= 1.05

    # Adjust by traffic
    if traffic == "high":
        base *= 1.2
    elif traffic == "low":
        base *= 0.9

    # Adjust if there is a special event
    if event:
        base *= 1.3

    return base

@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json()
    estimated_demand = preprocess(payload)

    predicted_demand = int(round(estimated_demand))
    taxis_required = int(predicted_demand * 0.7)

    return jsonify(
        predicted_demand=predicted_demand,
        taxis_required=taxis_required
    )

if __name__ == "__main__":
    app.run(debug=True)

