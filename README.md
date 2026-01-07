# Local AI Image Generator

A fully free, privacy-focused AI image generator running locally on your machine.

## Prerequisites
- **Python 3.10+**
- **Node.js**
- **NVIDIA GPU** (Recommended, 4GB+ VRAM)

## Setup (First Time)
The system has already set up the environment and installed (or is installing) the dependencies.

## How to Run
Simply double-click the **`start_app.bat`** file in this directory.

It will open two terminal windows:
1.  **Backend**: Loads the Stable Diffusion model (might take a minute on first run).
2.  **Frontend**: Starts the web interface.

Once running, open your browser to the URL shown in the Frontend window (usually `http://localhost:5173`).

## Troubleshooting
- **First Run Slowness**: The first time you generate an image, it downloads ~4-5GB of model weights. This depends on your internet speed.
- **Out of Memory**: If you crash with "CUDA out of memory", open `backend/main.py` and ensure `dtype = torch.float16` and `pipe.enable_attention_slicing()` are active (they are by default).
