import re

with open("frontend/src/components/DiscoveryView.tsx", "r") as f:
    content = f.read()

# Add import for fetchDiscoveryConfig
if "fetchDiscoveryConfig" not in content:
    content = content.replace(
        "import { LifeStage, QuestionCard } from '../types';",
        "import { LifeStage, QuestionCard } from '../types';\nimport { fetchDiscoveryConfig } from '../lib/api';"
    )
    content = content.replace(
        "import React, { useState } from 'react';",
        "import React, { useState, useEffect } from 'react';"
    )

    hook_code = """
  const [discoveryData, setDiscoveryData] = useState<{ authors: DiscoveryAuthorCard[], categories: DiscoveryCategoryCard[] }>({ authors: DISCOVERY_AUTHORS, categories: DISCOVERY_CATEGORIES });

  useEffect(() => {
    fetchDiscoveryConfig().then(data => {
      if (data && data.authors && data.categories) {
        setDiscoveryData(data);
      }
    }).catch(console.error);
  }, []);
"""
    # Insert at the beginning of the component
    content = re.sub(
        r'(export (const|function) DiscoveryView.*?(?:\(.*?\)\s*=>\s*{|\(.*?\)\s*{))',
        r'\1' + hook_code,
        content
    )
    
    content = content.replace("DISCOVERY_AUTHORS", "discoveryData.authors")
    content = content.replace("DISCOVERY_CATEGORIES", "discoveryData.categories")
    
    # Restore the imports that we broke
    content = content.replace(
        "discoveryData.authors,",
        "DISCOVERY_AUTHORS,"
    )
    content = content.replace(
        "discoveryData.categories,",
        "DISCOVERY_CATEGORIES,"
    )
    content = content.replace(
        "{ authors: discoveryData.authors, categories: discoveryData.categories }",
        "{ authors: DISCOVERY_AUTHORS, categories: DISCOVERY_CATEGORIES }"
    )

    with open("frontend/src/components/DiscoveryView.tsx", "w") as f:
        f.write(content)
    print("Patched DiscoveryView.tsx")
else:
    print("Already patched")
