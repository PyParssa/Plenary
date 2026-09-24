with open("frontend/src/components/AdminView.tsx", "r") as f:
    content = f.read()

import re

start_marker = "{/* ===================================================================== */}\n      {/* 3. ANALYTICS DASHBOARD VIEW */}"
end_marker = "{/* ===================================================================== */}\n      {/* MODAL: EDIT CARD */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    discovery_view = """{/* ===================================================================== */}
      {/* 3. DISCOVERY MANAGEMENT VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'discovery' && (
        <AdminDiscoveryTab token={token} onShowToast={onShowToast} />
      )}

      """
    
    content = content[:start_idx] + discovery_view + content[end_idx:]
    with open("frontend/src/components/AdminView.tsx", "w") as f:
        f.write(content)
    print("Replaced Analytics with Discovery in AdminView")
else:
    print("Could not find markers")
    print(start_idx, end_idx)

