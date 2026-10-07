import fs from 'node:fs/promises';
import sharp from 'sharp';
const images = {
 coastal: 'photo-1613977257363-707ba9348227',
 woodland: 'photo-1600607687920-4e2a09cf159d',
 villa: 'photo-1613490493576-7fde63acd811',
 interior: 'photo-1600210492486-724fe5c67fb0',
 'expert-1': 'photo-1560250097-0b93528c311a',
 'expert-2': 'photo-1519085360753-af0119f7cbe7',
 'expert-3': 'photo-1500648767791-00dcc994a43e',
};
await fs.mkdir('public/assets', { recursive: true });
try { await fs.access('public/assets/hero.webp'); } catch {
 await sharp('artifacts/hero-source.png').resize({width:1920,withoutEnlargement:true}).webp({quality:88}).toFile('public/assets/hero.webp');
}
for (const [name,id] of Object.entries(images)) {
 const target=`public/assets/${name}.webp`;
 try { await fs.access(target); console.log(`${name}: already prepared`); continue; } catch {}
 const response=await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${name.startsWith('expert')?500:1400}&q=85`);
 if(!response.ok) throw new Error(`${name}: ${response.status}`);
 await sharp(Buffer.from(await response.arrayBuffer())).webp({quality:83}).toFile(target);
 console.log(`${name}: prepared`);
}
