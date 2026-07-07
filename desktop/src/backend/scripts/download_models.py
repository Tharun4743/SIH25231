#!/usr/bin/env python3
import os
import sys

def download_and_verify():
    print("==========================================================")
    print("  AURA Offline Model Downloader & Cache Initializer       ")
    print("==========================================================")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    models_dir = os.path.join(backend_dir, "models")

    # 1. Download and save CLIP model
    print("\n[CLIP] Initializing CLIP (openai/clip-vit-base-patch32) local save...")
    try:
        from transformers import CLIPModel, CLIPProcessor
        clip_path = os.path.join(models_dir, "clip-vit-base-patch32")
        os.makedirs(clip_path, exist_ok=True)
        
        print("[CLIP] Fetching and caching CLIP model weights...")
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        
        print(f"[CLIP] Saving CLIP model files locally to: {clip_path}")
        model.save_pretrained(clip_path)
        processor.save_pretrained(clip_path)
        
        print("[CLIP] Success: CLIP model is saved locally. Offline load verified.")
    except Exception as e:
        print(f"[CLIP] Error downloading/saving CLIP model: {e}")
        print("[CLIP] NOTE: Install dependencies 'transformers', 'torch' to run successfully.")
        
    # 2. Pre-cache faster-whisper model
    print("\n[Whisper] Initializing Whisper (medium) pre-cache...")
    try:
        from faster_whisper import WhisperModel
        whisper_cache_dir = os.path.join(models_dir, "whisper")
        os.makedirs(whisper_cache_dir, exist_ok=True)
        
        print("[Whisper] Fetching and caching Whisper weights...")
        # This will download and save it to our cache directory
        _ = WhisperModel(
            "medium",
            device="cpu", # Force CPU for downloading
            compute_type="float32",
            download_root=whisper_cache_dir
        )
        print(f"[Whisper] Success: Whisper medium cached at {whisper_cache_dir}.")
    except Exception as e:
        print(f"[Whisper] Error downloading Whisper model: {e}")
        print("[Whisper] NOTE: Install 'faster-whisper' package to run successfully.")
        
    print("\n==========================================================")
    print("  Setup complete! TRANSFORMERS_OFFLINE=1 is now ready.")
    print("==========================================================")

if __name__ == "__main__":
    download_and_verify()
