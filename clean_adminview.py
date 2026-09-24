with open("frontend/src/components/AdminView.tsx", "r") as f:
    content = f.read()

# Remove the useEffect that calls loadAnalytics on discovery subtab
content = content.replace(
    """  useEffect(() => {
    if (activeSubTab === 'discovery') {
      loadAnalytics();
    }
  }, [activeSubTab, loadAnalytics]);""",
    ""
)

with open("frontend/src/components/AdminView.tsx", "w") as f:
    f.write(content)
