import csv
import os
import json
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms, models
from PIL import Image
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, f1_score

DATA_ROOT = "data_pipeline/raw/pearl_millet"
SYNTHETIC_DIR = "data_pipeline/augmentation/synthetic/drecro"
MANIFEST = os.path.join(DATA_ROOT, "growth_stage_manifest.csv")
CLASSES = ["healthy", "sclpgr", "drecro"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])
eval_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

class LeafDataset(Dataset):
    def __init__(self, samples, transform):
        self.samples = samples  # list of (abs_path, label_str)
        self.transform = transform
    def __len__(self):
        return len(self.samples)
    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        return self.transform(img), CLASS_TO_IDX[label]

def load_real_samples():
    with open(MANIFEST) as f:
        rows = list(csv.DictReader(f))
    return [(os.path.join(DATA_ROOT, r['filepath']), r['growth_stage']) for r in rows]

def load_synthetic_samples():
    if not os.path.isdir(SYNTHETIC_DIR):
        return []
    files = [f for f in os.listdir(SYNTHETIC_DIR) if f.lower().endswith('.png')]
    return [(os.path.join(SYNTHETIC_DIR, f), "drecro") for f in files]

def train_one_fold(train_samples, val_samples, device):
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, len(CLASSES))
    model = model.to(device)

    train_labels = [CLASS_TO_IDX[s[1]] for s in train_samples]
    class_counts = np.bincount(train_labels, minlength=len(CLASSES))
    class_weights = 1.0 / np.maximum(class_counts, 1)
    sample_weights = [class_weights[l] for l in train_labels]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(train_samples), replacement=True)

    train_loader = DataLoader(LeafDataset(train_samples, train_tf), batch_size=8, sampler=sampler)
    val_loader = DataLoader(LeafDataset(val_samples, eval_tf), batch_size=8, shuffle=False)

    loss_weights = torch.tensor(class_weights / class_weights.sum() * len(CLASSES), dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=loss_weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=5e-3)

    for epoch in range(6):
        model.train()
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(imgs), labels)
            loss.backward()
            optimizer.step()

    model.eval()
    preds, actual = [], []
    with torch.no_grad():
        for imgs, labels in val_loader:
            out = model(imgs.to(device))
            preds.extend(out.argmax(1).cpu().numpy())
            actual.extend(labels.numpy())
    return preds, actual, model

def main():
    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    real_samples = load_real_samples()
    synthetic_samples = load_synthetic_samples()
    print(f"Real samples: {len(real_samples)} | Synthetic samples: {len(synthetic_samples)}")

    labels_arr = [CLASS_TO_IDX[s[1]] for s in real_samples]
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    all_preds, all_actual = [], []
    last_model = None

    real_samples_arr = np.array(real_samples, dtype=object)

    for fold, (train_idx, val_idx) in enumerate(skf.split(real_samples, labels_arr)):
        train_samples = [tuple(x) for x in real_samples_arr[train_idx]] + synthetic_samples
        val_samples = [tuple(x) for x in real_samples_arr[val_idx]]  # val stays real-only, never contaminated
        preds, actual, model = train_one_fold(train_samples, val_samples, device)
        print(f"Fold {fold+1}: {len(train_samples)} train (incl. {len(synthetic_samples)} synthetic) / {len(val_samples)} val")
        all_preds.extend(preds)
        all_actual.extend(actual)
        last_model = model

    print("\n=== REAL + SYNTHETIC RESULTS (class-weighted + oversampled + diffusion augmentation, 5-fold CV) ===")
    report = classification_report(all_actual, all_preds, target_names=CLASSES, output_dict=True, zero_division=0)
    print(classification_report(all_actual, all_preds, target_names=CLASSES, zero_division=0))
    cm = confusion_matrix(all_actual, all_preds, labels=list(range(len(CLASSES))))
    print("Confusion matrix:\n", cm)
    macro_f1 = f1_score(all_actual, all_preds, average='macro', zero_division=0)
    print(f"Macro-F1: {macro_f1:.4f}")

    os.makedirs("ml/models", exist_ok=True)
    torch.save(last_model.state_dict(), "ml/models/synthetic_augmented_resnet18.pt")
    os.makedirs("docs", exist_ok=True)
    with open("docs/synthetic_augmented_results.json", "w") as f:
        json.dump({"model": "resnet18_synthetic_augmented_5fold", "classes": CLASSES,
                    "per_class_report": report, "confusion_matrix": cm.tolist(),
                    "macro_f1": macro_f1, "num_synthetic_used": len(synthetic_samples)}, f, indent=2)
    print("Saved.")

if __name__ == "__main__":
    main()