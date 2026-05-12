const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('lancamentos').select('*');
  if (error) {
    console.error("Error", error);
    return;
  }
  let moved = data.filter(d => {
     if (!d.created_at || !d.data) return false;
     if (d.data === '2026-05-12' || d.data === '2026-05-11') {
         // if it was created in April or earlier but its date is today
         const createdMonth = d.created_at.substring(0, 7);
         return createdMonth !== d.data.substring(0, 7);
     }
     return false;
  });
  console.log(`Found ${moved.length} potentially moved items.`);
  for (const m of moved) {
     console.log(m.id, m.descricao, m.data, "Created:", m.created_at, m.status);
  }
  
  // Also check ia_lancamentos
  const { data: iaData } = await supabase.from('ia_lancamentos').select('*');
  let iaMoved = (iaData || []).filter(d => {
     if (!d.created_at || !d.data) return false;
     if (d.data === '2026-05-12' || d.data === '2026-05-11') {
         const createdMonth = d.created_at.substring(0, 7);
         return createdMonth !== d.data.substring(0, 7);
     }
     return false;
  });
  console.log(`Found ${iaMoved.length} potentially moved IA items.`);
  for (const m of iaMoved) {
     console.log(m.id, m.descricao, m.data, "Created:", m.created_at, m.status);
     // Let's attempt to restore the date to the created_at date?
     // Actually, if we just set `data` to `created_at` date, it will fix it.
     const origData = m.created_at.split('T')[0];
     // await supabase.from('ia_lancamentos').update({ data: origData }).eq('id', m.id);
  }
}
run();
