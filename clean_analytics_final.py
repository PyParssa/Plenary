import re

with open("frontend/src/components/AdminView.tsx", "r") as f:
    content = f.read()

# Remove imports
content = content.replace("AnalyticsOverview,", "")
content = content.replace("adminFetchAnalytics,", "")

# Remove Analytics state
content = re.sub(r'// =========================================================================\n\s*// ANALYTICS STATE\n\s*// =========================================================================\n\s*const \[analytics.*?useState\(false\);', '', content, flags=re.DOTALL)

# Remove loadAnalytics function
content = re.sub(r'const loadAnalytics = useCallback\(async \(\) => \{.*?\n  \}, \[token\]\);', '', content, flags=re.DOTALL)

with open("frontend/src/components/AdminView.tsx", "w") as f:
    f.write(content)
print("Cleaned up remaining analytics code")
