#!/usr/bin/env node
/*
  Script: fix-express-router-duplicates.js
  - Scans the given directory (default: project root) for .js files
  - Creates a timestamped backup folder and copies original files there
  - For each .js file, keeps only one `const express = require('express');`
    and one `const router = express.Router();`, placing them at the top of the file
    (express first, router second if router existed).
  - Leaves other file content intact.

  Usage:
    node scripts/fix-express-router-duplicates.js [targetDir]

  Example:
    node scripts/fix-express-router-duplicates.js .
    node scripts/fix-express-router-duplicates.js backend

*/

const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, filelist);
    } else if (stat.isFile() && filepath.endsWith('.js')) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backupFiles(files, backupRoot) {
  files.forEach((file) => {
    const rel = path.relative(process.cwd(), file);
    const dest = path.join(backupRoot, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(file, dest);
  });
}

function processFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  const expressRegex = /^\s*const\s+express\s*=\s*require\(['"]express['"]\)\s*;?\s*$/;
  const routerRegex = /^\s*const\s+router\s*=\s*express\.Router\(\)\s*;?\s*$/;

  // Collect first occurrences
  let firstExpressLine = -1;
  let firstRouterLine = -1;
  const expressLines = [];
  const routerLines = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (expressRegex.test(l)) {
      expressLines.push(i);
      if (firstExpressLine === -1) firstExpressLine = i;
    }
    if (routerRegex.test(l)) {
      routerLines.push(i);
      if (firstRouterLine === -1) firstRouterLine = i;
    }
  }

  // If nothing to do, return false
  if (expressLines.length <= 1 && routerLines.length <= 1) return false;

  // Prepare header lines (keep express if present, keep router if present)
  const header = [];
  if (expressLines.length > 0) header.push(lines[firstExpressLine].trim());
  if (routerLines.length > 0) header.push(lines[firstRouterLine].trim());

  // Build body by skipping all lines that are express/router declarations
  const body = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (expressRegex.test(l)) continue;
    if (routerRegex.test(l)) continue;
    body.push(l);
  }

  // Trim leading blank lines in body
  while (body.length && body[0].trim() === '') body.shift();

  // Construct new content: header lines, blank line, then body
  const newLines = [];
  if (header.length > 0) {
    header.forEach(h => newLines.push(h));
    newLines.push('');
  }
  newLines.push(...body);

  // Write back
  fs.writeFileSync(file, newLines.join('\n'), 'utf8');
  return true;
}

function main() {
  const target = process.argv[2] || '.';
  const absTarget = path.resolve(process.cwd(), target);
  if (!fs.existsSync(absTarget)) {
    console.error('Target folder does not exist:', absTarget);
    process.exit(1);
  }

  const allJs = walk(absTarget);
  if (!allJs.length) {
    console.log('No .js files found under', absTarget);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(process.cwd(), 'backups', `fix-express-router-${timestamp}`);
  ensureDir(backupRoot);
  backupFiles(allJs, backupRoot);
  console.log('Backed up', allJs.length, 'files to', backupRoot);

  const modified = [];
  allJs.forEach((file) => {
    try {
      const changed = processFile(file);
      if (changed) modified.push(file);
    } catch (err) {
      console.error('Error processing', file, err);
    }
  });

  console.log(`Modified ${modified.length} file(s).`);
  if (modified.length) console.log(modified.join('\n'));
  else console.log('No changes necessary.');
}

if (require.main === module) main();
