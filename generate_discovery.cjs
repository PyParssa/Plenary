const fs = require('fs');

let content = fs.readFileSync('frontend/src/data/discoveryData.ts', 'utf8');
content = content.replace(/export interface.*?}/gs, '');
content = content.replace(/import.*?}/gs, '');
content = content.replace(/: DiscoveryAuthorCard\[\]/g, '');
content = content.replace(/: DiscoveryCategoryCard\[\]/g, '');
content = content.replace(/export const/g, 'const');

content += `
fs.writeFileSync('discovery.json', JSON.stringify({
  authors: DISCOVERY_AUTHORS,
  categories: DISCOVERY_CATEGORIES
}, null, 2));
`;
fs.writeFileSync('temp.cjs', content);
