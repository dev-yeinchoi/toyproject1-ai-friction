import { rmSync, mkdirSync } from 'node:fs';
rmSync('results/raw',{recursive:true,force:true});
mkdirSync('results/raw',{recursive:true});
