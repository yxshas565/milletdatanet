import os
import time
from huggingface_hub import InferenceClient

HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN not set. Run: $env:HF_TOKEN = 'your_token' in PowerShell first.")

client = InferenceClient(api_key=HF_TOKEN)

DATA_ROOT = "data_pipeline/raw/pearl_millet/flat"
MINORITY_CLASS = "drecro"
OUTPUT_DIR = f"data_pipeline/augmentation/synthetic/{MINORITY_CLASS}"
NUM_SYNTHETIC = 15

PROMPT = ("close-up macro photo of a pearl millet leaf infected with fungal disease, "
          "exserohilum rostratum lesions, brown necrotic spots, natural outdoor lighting, "
          "realistic agricultural photography, high detail")

MODEL = "black-forest-labs/FLUX.1-dev"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating {NUM_SYNTHETIC} synthetic '{MINORITY_CLASS}' images via Hugging Face Inference Providers...")

    generated = 0
    for i in range(NUM_SYNTHETIC):
        print(f"[{i+1}/{NUM_SYNTHETIC}] generating...")
        try:
            image = client.text_to_image(PROMPT, model=MODEL)
            out_path = os.path.join(OUTPUT_DIR, f"synthetic_{MINORITY_CLASS}_{i}.png")
            image.save(out_path)
            generated += 1
            print(f"  saved {out_path}")
        except Exception as e:
            print(f"  failed: {e}")
        time.sleep(1)

    print(f"\nDone. Generated {generated}/{NUM_SYNTHETIC} synthetic images in {OUTPUT_DIR}")

if __name__ == "__main__":
    main()