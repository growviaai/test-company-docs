#!/usr/bin/env node
/**
 * Creates the first admin user. Run locally with SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY in the environment. Refuses to run if an
 * admin already exists (per 03-database-schema.md section 8).
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *        node --loader tsx backend/scripts/create-first-admin.ts <email> <full name> <password>
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, fullName, password] = process.argv.slice(2);
  if (!email || !fullName || !password || password.length < 12) {
    console.error("Usage: create-first-admin.ts <email> <full name> <password (min 12 chars)>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    process.exit(1);
  }

  const db = createClient(url, key);

  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  if ((count ?? 0) > 0) {
    console.error("An admin already exists. Refusing to create another via this script.");
    process.exit(1);
  }

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    console.error("Failed to create auth user:", createErr?.message);
    process.exit(1);
  }

  const { error: profileErr } = await db.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: fullName,
    role: "admin",
    status: "active",
  });
  if (profileErr) {
    console.error("Failed to insert profile:", profileErr.message);
    process.exit(1);
  }

  await db.from("audit_logs").insert({
    actor_id: created.user.id,
    actor_email: email,
    action: "system.first_admin_created",
    target_type: "profile",
    target_id: created.user.id,
  });

  console.log(`First admin created: ${email}`);
}

main();
