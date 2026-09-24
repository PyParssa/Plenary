with open("frontend/src/components/AdminView.tsx", "r") as f:
    content = f.read()

# Replace activeSubTab type
content = content.replace(
    "useState<'cards' | 'users' | 'analytics'>('cards')",
    "useState<'cards' | 'users' | 'discovery'>('cards')"
)

# Replace Analytics button with Discovery button
content = content.replace(
    "setActiveSubTab('analytics')",
    "setActiveSubTab('discovery')"
)
content = content.replace(
    "activeSubTab === 'analytics'",
    "activeSubTab === 'discovery'"
)
content = content.replace(
    "<BarChart3 className=\"w-3.5 h-3.5\" />",
    "<Compass className=\"w-3.5 h-3.5\" />"
)
content = content.replace(
    "Analytics\n          </button>",
    "Discovery\n          </button>"
)

# Replace the Analytics dashboard view
import re
analytics_view_start = content.find("{/* 3. ANALYTICS DASHBOARD VIEW */}")
if analytics_view_start != -1:
    analytics_view_end = content.find("</div>\n    </div>\n  );\n};", analytics_view_start)
    if analytics_view_end != -1:
        # replace block
        discovery_view = """{/* 3. DISCOVERY MANAGEMENT VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'discovery' && (
        <AdminDiscoveryTab token={token} onShowToast={onShowToast} />
      )}
"""
        content = content[:analytics_view_start] + discovery_view + content[analytics_view_end:]

# Inject import
if "AdminDiscoveryTab" not in content and "import { AdminDiscoveryTab }" not in content:
    content = content.replace(
        "import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';",
        "import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\nimport { AdminDiscoveryTab } from './AdminDiscoveryTab';"
    )
    content = content.replace(
        "Compass,",
        ""
    )
    content = content.replace(
        "import {\n  Shield,",
        "import {\n  Shield,\n  Compass,"
    )

with open("frontend/src/components/AdminView.tsx", "w") as f:
    f.write(content)

print("Patched AdminView.tsx")
