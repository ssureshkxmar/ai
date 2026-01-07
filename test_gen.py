import requests
import base64
from io import BytesIO
from PIL import Image
import time

def test_generation():
    print("Testing image generation with optimizations...")
    start_time = time.time()
    try:
        # Request with default steps (implied by backend now)
        response = requests.post(
            "http://127.0.0.1:8000/generate", 
            json={"prompt": "beautiful landscape"},
            timeout=300 
        )
        duration = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if "image" in data:
                img_str = data["image"]
                if "data:image/png;base64," in img_str:
                    img_str = img_str.split(",")[1]
                
                img_data = base64.b64decode(img_str)
                img = Image.open(BytesIO(img_data))
                img.save("test_optimized.png")
                print(f"SUCCESS: Image generated in {duration:.2f} seconds.")
                print(f"Image saved to test_optimized.png")
            else:
                print(f"Error in response: {data}")
        else:
            print(f"Server returned status {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Exception during request: {e}")

if __name__ == "__main__":
    test_generation()
