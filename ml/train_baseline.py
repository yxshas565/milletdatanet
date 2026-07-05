import csv
import os
import json
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, f1_score

DATA_ROOT = "data_pipeline/raw/pearl_millet"
MANIFEST = os.path.join(DATA_ROOT, "growth_stage_manifest.csv")
CLASSES = ["healthy", "sclpgr", "drecro"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])
eval_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

class LeafDataset(Dataset):
    def __init__(self, rows, transform):
        self.rows = rows
        self.transform = transform
    def __len__(self):
        return len(self.rows)
    def __getitem__(self, idx):
        r = self.rows[idx]
        img = Image.open(os.path.join(DATA_ROOT, r['filepath'])).convert("RGB")
        return self.transform(img), CLASS_TO_IDX[r['growth_stage']]

def load_rows():
    with open(MANIFEST) as f:
        return list(csv.DictReader(f))

def train_one_fold(train_rows, val_rows, device):
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    model.fc = nn.Linear(model.fc.in_features, len(CLASSES))
    model = model.to(device)

    train_loader = DataLoader(LeafDataset(train_rows, train_tf), batch_size=8, shuffle=True)
    val_loader = DataLoader(LeafDataset(val_rows, eval_tf), batch_size=8, shuffle=False)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)

    for epoch in range(10):
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
    rows = load_rows()
    labels_arr = [CLASS_TO_IDX[r['growth_stage']] for r in rows]

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    all_preds, all_actual = [], []
    last_model = None

    for fold, (train_idx, val_idx) in enumerate(skf.split(rows, labels_arr)):
        train_rows = [rows[i] for i in train_idx]
        val_rows = [rows[i] for i in val_idx]
        preds, actual, model = train_one_fold(train_rows, val_rows, device)
        print(f"Fold {fold+1}: {len(train_rows)} train / {len(val_rows)} val")
        all_preds.extend(preds)
        all_actual.extend(actual)
        last_model = model

    print("\n=== BASELINE RESULTS (5-fold cross-validation) ===")
    report = classification_report(all_actual, all_preds, target_names=CLASSES, output_dict=True, zero_division=0)
    print(classification_report(all_actual, all_preds, target_names=CLASSES, zero_division=0))
    cm = confusion_matrix(all_actual, all_preds, labels=list(range(len(CLASSES))))
    print("Confusion matrix:\n", cm)
    macro_f1 = f1_score(all_actual, all_preds, average='macro', zero_division=0)
    print(f"Macro-F1: {macro_f1:.4f}")

    os.makedirs("ml/models", exist_ok=True)
    torch.save(last_model.state_dict(), "ml/models/baseline_resnet18.pt")
    os.makedirs("docs", exist_ok=True)
    with open("docs/baseline_results.json", "w") as f:
        json.dump({"model": "resnet18_baseline_5fold", "classes": CLASSES,
                    "per_class_report": report, "confusion_matrix": cm.tolist(),
                    "macro_f1": macro_f1}, f, indent=2)
    print("Saved.")

if __name__ == "__main__":
    main()