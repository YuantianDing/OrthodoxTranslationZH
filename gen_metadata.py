from glob import glob
from yaml_type import load_yaml, dump_yaml
from pathlib import Path

def generate_metadata():
    metadata = []
    for path in Path(".").glob("**/book*.yaml"):
        with open(path, "r") as f:
            data = load_yaml(f)
        metadata.append({
            "filepath": str(path),
            "title": data.get("title", "Unknown Title"),
            "authors": data.get("authors", "Unknown Author"),
            "languages": data.get("languages", []),
        })
    with open("metadata.yaml", "w") as f:
        dump_yaml(metadata, f)


if __name__ == "__main__":
    generate_metadata()