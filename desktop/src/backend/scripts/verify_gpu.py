import torch
print(f"CUDA available : {torch.cuda.is_available()}")
print(f"CUDA version   : {torch.version.cuda}")
if torch.cuda.is_available():
    print(f"GPU            : {torch.cuda.get_device_name(0)}")
    print(f"VRAM total     : {torch.cuda.get_device_properties(0).total_memory // 1024**3} GB")
else:
    print("GPU: NOT DETECTED — whisper and CLIP will use CPU")
