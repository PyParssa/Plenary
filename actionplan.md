# Action Plan: Fix Admin Panel Import/Export Buttons

## The Issue
In the Admin View's Cards section, the "Import Cards" and "Export" buttons were placed with mismatched visual hierarchies and positions. 
The standard convention is that the primary action (adding data into the system, i.e., Import) should be the prominent primary button (black) placed on the right, while secondary actions (saving data out, i.e., Export) should be the secondary button (white outline) placed on the left.
Previously, they were reversed, leading to a confusing UX where the white secondary button opened the crucial Import modal, and the black primary button just triggered an export dropdown.

## Proposed Fixes

### Swap Button Placements and Hierarchy
**File:** `frontend/src/components/AdminView.tsx`

1. **Reposition the Buttons:**
   - Move the Export button to the left side of the controls group.
   - Move the Import button to the right side.

2. **Swap Styling:**
   - Give the **Export** button the secondary styling (`bg-white border text-[#14213d] hover:bg-gray-100`).
   - Give the **Import** button the primary styling (`bg-[#14213d] text-white hover:bg-black`).

3. **Verify Icons:**
   - Ensure `Export` uses the `Download` icon (downloading data from cloud to local).
   - Ensure `Import` uses the `Upload` icon (uploading data from local to cloud).

### Example Code Fix
```tsx
{/* Secondary Action: Export */}
<div className="relative group">
  <button className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#14213d]/20 text-[#14213d] hover:bg-[#14213d]/5 flex items-center gap-1.5 transition-colors">
    <Download className="w-3.5 h-3.5 text-[#fca311]" />
    Export
  </button>
  {/* Dropdown content... */}
</div>

{/* Primary Action: Import */}
<button onClick={() => setIsImportModalOpen(true)} className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#14213d] text-white hover:bg-black flex items-center gap-1.5 transition-colors">
  <Upload className="w-3.5 h-3.5 text-[#fca311]" />
  Import Cards
</button>
```

## Expected Outcome
The Admin Panel will now have an intuitive button layout where the primary action "Import Cards" draws the eye on the right with a solid background, and "Export" acts as a clear secondary option on the left, matching their respective icons and standard SaaS conventions.
