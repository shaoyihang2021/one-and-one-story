#!/usr/bin/env python3
"""Convert the original level XML files to the compact JSON format used by the web build."""
import json
import pathlib
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "archive" / "levels"
OUT = ROOT / "data" / "levels.json"

STORY = [
    "TUTORIAL",
    "LEVEL1", "LEVEL2", "LEVEL3",
    "LEVEL1M1", "LEVEL7", "LEVEL12",
    "LEVEL1M1", "LEVEL2", "LEVEL5",
    "LEVEL1M1", "LEVEL2", "LEVEL6",
    "LEVEL10", "LEVEL11",
    "LEVEL8", "LEVEL9", "LEVEL13",
    "LEVEL1", "ENDLEVEL",
]

COOP = [
    "COOP1", "COOP2", "COOP3", "COOP4", "COOP5", "COOP6",
    "COOP7", "COOP8", "COOP9", "COOP10", "COOP_END",
]


def num(value):
    if value is None:
        return None
    n = float(value)
    return int(n) if n.is_integer() else n


def convert(name):
    root = ET.parse(SRC / f"{name}.xml").getroot()
    background = root.find("background")
    data = {
        "id": name,
        "width": num(root.findtext("width")),
        "height": num(root.findtext("height")),
        "floors": [
            [num(r.get("x")), num(r.get("y")), num(r.get("w")), num(r.get("h"))]
            for r in root.findall("./floors/rect")
        ],
        "tiles": [
            [num(t.get("x")), num(t.get("y")), num(t.get("tx")), num(t.get("ty"))]
            for t in root.findall("./tilesAbove/tile")
        ],
        "background": (
            [
                [child.tag, num(child.get("x")), num(child.get("y"))]
                for child in background
            ]
            if background is not None
            else []
        ),
        "josh": [num(root.find("./objects/josh").get("x")), num(root.find("./objects/josh").get("y"))],
        "rosie": [num(root.find("./objects/rosie").get("x")), num(root.find("./objects/rosie").get("y"))],
        "spikes": [
            [num(s.get("x")), num(s.get("y"))]
            for s in root.findall("./objects/spikes")
        ],
        "crates": [
            [num(c.get("x")), num(c.get("y"))]
            for c in root.findall("./objects/crate")
        ],
    }
    wrap = {
        key: num(root.findtext(key))
        for key in (
            "XstartJosh", "YstartJosh", "XendJosh", "YendJosh",
            "XstartRosie", "YstartRosie", "XendRosie", "YendRosie",
        )
        if root.findtext(key) is not None
    }
    if wrap:
        data["wrap"] = wrap
    return data


def main():
    payload = {
        "story": [convert(name) for name in STORY],
        "coop": [convert(name) for name in COOP],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
