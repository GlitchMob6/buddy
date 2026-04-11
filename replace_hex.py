import os
import re

replacements = {
    "#0d0d0f": "var(--bg-base)",
    "#111114": "var(--bg-surface)",
    "#1a1a20": "var(--bg-elevated)",
    "#141418": "var(--bg-elevated)",
    "#1e1e24": "var(--border)",
    "#1c1c22": "var(--border)",
    "#282830": "var(--border)",
    "#383842": "var(--border)",
    "#2e2e3a": "var(--border-active)",
    "#4a3a8a": "var(--border-active)",
    "#3f3f46": "var(--border-active)",
    "#7c6af7": "var(--accent)",
    "#6d5dfc": "var(--accent)",
    "#1a1630": "var(--accent-dim)",
    "#16132e": "var(--accent-dim)",
    "#e8e6ff": "var(--text-primary)",
    "#f0eeff": "var(--text-primary)",
    "#8c8c99": "var(--text-secondary)",
    "#8887aa": "var(--text-secondary)",
    "#a1a1aa": "var(--text-secondary)",
    "#52525b": "var(--text-secondary)",
    "#6e6d8a": "var(--text-secondary)",
    "#44435a": "var(--text-tertiary)",
    "#2e2d3a": "var(--text-tertiary)",
    "#3fcf8e": "var(--green)",
    "#34c47c": "var(--green)",
    "#4ade80": "var(--green)",
    "#f5a623": "var(--amber)",
    "#e09b2d": "var(--amber)",
    "#fbbf24": "var(--amber)",
    "#ff5c5c": "var(--red)",
    "#e84545": "var(--red)",
    "#f87171": "var(--red)"
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Case-insensitive replacement
    new_content = content
    for hex_code, var in replacements.items():
        pattern = re.compile(re.escape(hex_code), re.IGNORECASE)
        new_content = pattern.sub(var, new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

search_dirs = ["/home/bwoy/buddy/src/lib/components", "/home/bwoy/buddy/src/routes", "/home/bwoy/buddy/src"]

for search_dir in search_dirs:
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if file.endswith(".svelte") or file.endswith(".css"):
                if file == "app.css" and root == "/home/bwoy/buddy/src":
                    continue # Skip the one we just made
                filepath = os.path.join(root, file)
                process_file(filepath)
