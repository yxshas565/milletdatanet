import json
import sqlite3
import os
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "milletdatanet/sensors"
DB_PATH = "provenance_service/provenance.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT, tick INTEGER, predicted_growth_stage TEXT,
        soil_moisture_pct REAL, temperature_c REAL, humidity_pct REAL, note TEXT)""")
    conn.commit()
    return conn

def on_connect(client, userdata, flags, rc):
    print(f"Subscriber connected (rc={rc}). Listening on '{TOPIC}'...")
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())
    conn = get_conn()
    conn.execute(
        "INSERT INTO sensor_readings (timestamp, tick, predicted_growth_stage, soil_moisture_pct, temperature_c, humidity_pct, note) VALUES (?,?,?,?,?,?,?)",
        (data["timestamp"], data["tick"], data["predicted_growth_stage"],
         data["soil_moisture_pct"], data["temperature_c"], data["humidity_pct"], data["note"])
    )
    conn.commit()
    conn.close()
    print(f"Stored tick {data['tick']}: stage={data['predicted_growth_stage']}, moisture={data['soil_moisture_pct']}")

def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT, 60)
    client.loop_forever()

if __name__ == "__main__":
    main()