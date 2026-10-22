#!/usr/bin/env python3
"""Checks every verse in js/strings.js word for word against two public KJV texts.

Usage: python3 tools/check-verses.py [cache_dir]
Downloads the texts once into cache_dir (default: tools/.kjv) and prints any difference.
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tools" / ".kjv"
CACHE.mkdir(parents=True, exist_ok=True)
BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
         "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalm", "Proverbs",
         "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
         "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark",
         "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
         "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
         "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"]
ARUL = {"Psalm": "Psalms"}


def fetch(url, name):
    path = CACHE / name
    if not path.exists():
        with urllib.request.urlopen(url, timeout=60) as r:
            path.write_bytes(r.read())
    return json.loads(path.read_text(encoding="utf-8-sig"))


def norm(s):
    s = s.replace("’", "'").replace("‘", "'")
    s = re.sub(r"\{[^}]*\}", "", s)  # translators' notes in some texts
    s = re.sub(r"\s+([,;:.?!])", r"\1", s)  # one text puts stray spaces before punctuation
    return re.sub(r"\s+", " ", s).strip()


def main():
    full = fetch("https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json", "en_kjv.json")
    src = (ROOT / "js" / "strings.js").read_text()
    pairs = re.findall(r'\["((?:[123] )?[A-Z][a-z]+(?: of Solomon)? \d+:[\d-]+)", "((?:[^"\\]|\\.)*)"\]', src)
    bad = 0
    for ref, text in pairs:
        m = re.match(r"(.+) (\d+):(\d+)(?:-(\d+))?$", ref)
        book, ch, v1, v2 = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3))
        b = full[BOOKS.index(book)]
        a = " ".join(b["chapters"][ch - 1][v - 1] for v in range(v1, v2 + 1))
        name = ARUL.get(book, book).replace(" ", "")
        try:
            other = fetch(f"https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/{name}.json", name + ".json")
            vs = other["chapters"][ch - 1]["verses"]
            o = " ".join(x["text"] for x in vs if v1 <= int(x["verse"]) <= v2)
        except Exception as e:  # noqa: BLE001
            o = None
            print("  (second text unavailable for", ref, e, ")")
        mine = norm(text)
        ok_a = norm(a) == mine
        ok_o = o is None or norm(o) == mine
        if ok_a and ok_o:
            print("ok  ", ref)
        else:
            bad += 1
            print("DIFF", ref)
            print("   mine :", mine)
            if not ok_a:
                print("   text1:", norm(a))
            if not ok_o:
                print("   text2:", norm(o))
    print(f"{len(pairs)} verses checked, {bad} different")
    sys.exit(1 if bad else 0)


main()
