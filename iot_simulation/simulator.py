import time
import json
import random
import math
from datetime import datetime
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "milletdatanet/sensors"

GROWTH_STAGES = ["vegetative", "booting", "flowering", "maturity"]

def simulate_reading(tick):
    stage_idx = min(tick // 20, len(GROWTH_STAGES) - 1)
    stage = GROWTH_STAGES[stage_idx]
    moisture_dip = 15 if stage == "flowering" else 0
    soil_moisture = round(45 - moisture_dip + random.uniform(-3, 3) + 5 * math.sin(tick / 10), 2)
    temperature = round(27 + 4 * math.sin(tick / 15) + random.uniform(-1, 1), 2)
    humidity = round(60 + random.uniform(-5, 5), 2)
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "tick": tick,
        "predicted_growth_stage": stage,
        "soil_moisture_pct": soil_moisture,
        "temperature_c": temperature,
        "humidity_pct": humidity,
        "note": "SIMULATED - reference architecture, not live hardware"
    }

def main():
    client = mqtt.Client()
    client.connect(BROKER, PORT, 60)
    print(f"Connected to MQTT broker at {BROKER}:{PORT}. Publishing to '{TOPIC}'...")

    tick = 0
    try:
        while tick < 60:
            reading = simulate_reading(tick)
            client.publish(TOPIC, json.dumps(reading))
            print(f"Published: {reading}")
            tick += 1
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopped.")
    finally:
        client.disconnect()

if __name__ == "__main__":
    main()