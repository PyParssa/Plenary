with open("frontend/src/lib/api.ts", "r") as f:
    content = f.read()

new_functions = """
/**
 * Public API: Fetch discovery configuration
 */
export async function fetchDiscoveryConfig(): Promise<any> {
  const res = await fetch(getApiUrl('/api/discovery'));
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to fetch discovery config: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Admin API: Update discovery configuration
 */
export async function adminUpdateDiscoveryConfig(token: string, payload: any): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(getApiUrl('/api/admin/discovery'), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to update discovery config: ${res.statusText}`);
  }
  return res.json();
}
"""

if "fetchDiscoveryConfig" not in content:
    content = content + "\n\n" + new_functions
    with open("frontend/src/lib/api.ts", "w") as f:
        f.write(content)
    print("Patched api.ts")
else:
    print("Already patched")
