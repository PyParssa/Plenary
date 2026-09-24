import re
import json

with open("frontend/src/data/discoveryData.ts", "r") as f:
    content = f.read()

def parse_block(var_name):
    block = re.search(f"export const {var_name}: .*? = \\[(.*?)\\];", content, re.DOTALL).group(1)
    # This is a bit tricky to parse without a JS parser. Let's just do some basic replacements.
    # Alternatively, just use node to evaluate it and dump it.
    pass

