import requests
import json
import time

# Poll for health
print("Polling /health for model readiness...")
start_time = time.time()
while True:
    try:
        health = requests.get("http://localhost:8000/health").json()
        status = health.get("status")
        print(f"Model status: {status}")
        if status == "ready":
            break
        if status == "error":
            print("Model failed to load (check server logs).")
            exit(1)
    except Exception as e:
        print(f"Waiting for server... ({e})")
    
    if time.time() - start_time > 300: # 5 min timeout for loading
        print("Timeout waiting for model load.")
        exit(1)
    time.sleep(5)

print("Sending generation request...")
try:
    response = requests.post(
        "http://localhost:8000/generate",
        json={"prompt": "test image", "steps": 1},
        timeout=300 # 5 minutes timeout for CPU generation
    )
    if response.status_code == 200:
        data = response.json()
        if "image" in data and data["image"].startswith("data:image"):
            print("SUCCESS: Image generated.")
            # Verify it's not the test mode dummy response
            # Test mode returns "TEST MODE" text in image, but here we just check format.
            # Since main.py has TEST_MODE=False, it should be real.
        else:
            print(f"FAILURE: Unexpected response: {data.keys()}")
    else:
        print(f"FAILURE: Status {response.status_code}, {response.text}")
except Exception as e:
    print(f"FAILURE: Exception {e}")
