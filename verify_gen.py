import requests
import time

def test_generation():
    print("Testing generation...")
    try:
        req = {"prompt": "a red cat", "steps": 1}
        response = requests.post("http://127.0.0.1:8000/generate", json=req)
        if response.status_code == 200:
            print("Generation successful!")
            print(str(response.json())[:100] + "...")
        else:
            print(f"Generation failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_generation()
