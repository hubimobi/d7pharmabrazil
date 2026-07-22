#!/usr/bin/env node
/**
 * Migração de Storage: Lovable Cloud → Seu Supabase
 *
 * Copia todos os arquivos dos buckets `product-images`, `store-assets`, `images`
 * do projeto de origem para o projeto de destino, preservando os paths (tenant_id/...).
 *
 * Uso:
 *   npm install @supabase/supabase-js
 *   node 03-migrar-storage.mjs
 *
 * Preencha as constantes SOURCE_* e TARGET_* abaixo.
 */

import { createClient } from '@supabase/supabase-js';

// ============ CONFIGURAÇÃO ============
const SOURCE_URL = 'https://xufiemrhlmirkrdrcxox.supabase.co'; // Lovable Cloud atual
const SOURCE_SERVICE_ROLE = 'COLE_AQUI_O_SERVICE_ROLE_DO_LOVABLE_CLOUD'; // pegue em Cloud → Advanced

const TARGET_URL = 'https://SEU_REF.supabase.co';
const TARGET_SERVICE_ROLE = 'SEU_SERVICE_ROLE_KEY';

const BUCKETS = ['product-images', 'store-assets', 'images'];
// ======================================

const src = createClient(SOURCE_URL, SOURCE_SERVICE_ROLE, { auth: { persistSession: false } });
const dst = createClient(TARGET_URL, TARGET_SERVICE_ROLE, { auth: { persistSession: false } });

async function ensureBucket(name) {
  const { data } = await dst.storage.getBucket(name);
  if (!data) {
    console.log(`  Criando bucket ${name}...`);
    await dst.storage.createBucket(name, { public: true });
  }
}

async function listAll(client, bucket, prefix = '') {
  const files = [];
  const stack = [prefix];
  while (stack.length) {
    const p = stack.pop();
    let offset = 0;
    while (true) {
      const { data, error } = await client.storage.from(bucket).list(p, {
        limit: 1000, offset,
      });
      if (error) throw error;
      if (!data || !data.length) break;
      for (const entry of data) {
        const full = p ? `${p}/${entry.name}` : entry.name;
        if (entry.id === null || entry.metadata === null) {
          stack.push(full); // pasta
        } else {
          files.push({ path: full, size: entry.metadata?.size ?? 0 });
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return files;
}

async function copyFile(bucket, path) {
  const { data: blob, error: dlErr } = await src.storage.from(bucket).download(path);
  if (dlErr) { console.error(`  ✗ download ${path}: ${dlErr.message}`); return false; }
  const buf = Buffer.from(await blob.arrayBuffer());
  const { error: upErr } = await dst.storage.from(bucket).upload(path, buf, {
    contentType: blob.type || 'application/octet-stream',
    upsert: true,
  });
  if (upErr) { console.error(`  ✗ upload ${path}: ${upErr.message}`); return false; }
  return true;
}

async function main() {
  let total = 0, ok = 0, fail = 0;
  for (const bucket of BUCKETS) {
    console.log(`\n=== Bucket: ${bucket} ===`);
    await ensureBucket(bucket);
    const files = await listAll(src, bucket);
    console.log(`  ${files.length} arquivos a copiar (${(files.reduce((s,f)=>s+f.size,0)/1024/1024).toFixed(1)} MB)`);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const done = await copyFile(bucket, f.path);
      total++; done ? ok++ : fail++;
      if ((i+1) % 20 === 0) console.log(`  ${i+1}/${files.length}...`);
    }
  }
  console.log(`\n✅ ${ok}/${total} copiados. Falhas: ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
