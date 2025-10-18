from glob import glob
import yaml
from pathlib import Path

def generate_metadata():
    metadata = []
    for path in Path(".").glob("**/book*.yaml"):
        with open(path, "r") as f:
            data = yaml.safe_load(f)
        metadata.append({
            "filepath": str(path),
            "title": data.get("title", "Unknown Title"),
            "authors": data.get("authors", "Unknown Author"),
            "languages": data.get("language", []),
        })
    with open("metadata.yaml", "w") as f:
        yaml.dump(metadata, f, sort_keys=False, allow_unicode=True, width=12897218347)


if __name__ == "__main__":
    generate_metadata()