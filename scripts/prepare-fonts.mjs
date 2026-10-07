import fs from 'node:fs/promises';
const fonts=[['Italiana','serif'],['DM+Sans:wght@400','sans']];
for(const [family,name] of fonts){
 const res=await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`,{headers:{'User-Agent':'Mozilla/5.0'}});
 if(!res.ok)throw new Error(`Font request failed: ${res.status}`);
 const css=await res.text();
 const url=[...css.matchAll(/url\((https:[^)]+)\)/g)].at(-1)?.[1];
 if(!url)throw new Error('Font source missing');
 const font=await fetch(url);if(!font.ok)throw new Error(`Font download failed: ${font.status}`);
 await fs.writeFile(`public/assets/${name}.ttf`,Buffer.from(await font.arrayBuffer()));
 const fontName=name==='serif'?'italiana':'dmsans';
 const license=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${fontName}/OFL.txt`);
 if(!license.ok)throw new Error(`License download failed: ${license.status}`);
 await fs.writeFile(`public/assets/${fontName}-OFL.txt`,await license.text());
 console.log(`${name} saved locally`);
}
