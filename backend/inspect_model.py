import torch

ckpt = torch.load("C:/Users/Abdullah Mansoor/OneDrive/Desktop/PS_Project/drug-food-interaction/drug-food-interaction/backend/model_artifacts/full_checkpoint.pt", map_location="cpu")

if isinstance(ckpt, dict):
    print("Keys:", ckpt.keys())
    for k, v in ckpt.items():
        print(k, type(v))
else:
    print(ckpt)

for k in ckpt["model_state_dict"].keys():
    print(k)