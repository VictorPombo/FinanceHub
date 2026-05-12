const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'],
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function recreateUsers() {
  const usersToCreate = [
    { email: 'eduardaporai@gmail.com', password: 'Eatmkt1337' }
  ];

  console.log("Recriando contas no novo Supabase...");

  for (const user of usersToCreate) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    });
    if (error) {
       console.error(`❌ Erro ao criar ${user.email}: ${error.message}`);
    } else {
       console.log(`✅ Usuário recriado: ${user.email}`);
    }
  }
}

recreateUsers();
