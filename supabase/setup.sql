-- ============================================================
-- DAVID & MADELINE · V4 COMPLETE SETUP
-- Ejecuta TODO este archivo una sola vez en Supabase SQL Editor.
-- Después habilita Anonymous Sign-Ins y crea las cuentas permanentes
-- de David/Madeline manualmente en Authentication > Users.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.is_permanent_user()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, true) is false;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- CONTENIDO EDITABLE ----------
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.site_content enable row level security;

drop policy if exists "site_content_read" on public.site_content;
create policy "site_content_read" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "site_content_write_permanent" on public.site_content;
create policy "site_content_write_permanent" on public.site_content for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

-- ---------- PROPUESTA / SI PARA SIEMPRE ----------
create table if not exists public.proposal_global_state (
  id integer primary key default 1 check (id = 1),
  accepted boolean not null default false,
  accepted_at timestamptz,
  first_accepted_by uuid
);
insert into public.proposal_global_state(id,accepted) values (1,false) on conflict (id) do nothing;
alter table public.proposal_global_state enable row level security;
drop policy if exists "proposal_state_read" on public.proposal_global_state;
create policy "proposal_state_read" on public.proposal_global_state for select to anon, authenticated using (true);

create table if not exists public.proposal_acceptance (
  user_id uuid primary key,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  letter_unlocked boolean not null default true
);
alter table public.proposal_acceptance enable row level security;
drop policy if exists "proposal_own_read" on public.proposal_acceptance;
create policy "proposal_own_read" on public.proposal_acceptance for select to authenticated using (auth.uid() = user_id);

create or replace function public.accept_proposal_forever()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  insert into public.proposal_acceptance(user_id,accepted,accepted_at,letter_unlocked)
  values(uid,true,now(),true)
  on conflict(user_id) do update set accepted=true, letter_unlocked=true;

  update public.proposal_global_state
     set accepted=true,
         accepted_at=coalesce(accepted_at,now()),
         first_accepted_by=coalesce(first_accepted_by,uid)
   where id=1;

  select to_jsonb(s) into result from public.proposal_global_state s where id=1;
  return result;
end;
$$;
revoke all on function public.accept_proposal_forever() from public;
grant execute on function public.accept_proposal_forever() to authenticated;

-- ---------- CAPITULOS ----------
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  chapter_number integer not null default 1,
  chapter_date date,
  emoji text default '❤️',
  title text not null,
  body text not null default '',
  cover_memory_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.chapters enable row level security;

-- ---------- MEMORIAS / MULTIMEDIA ----------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  memory_date date,
  place text,
  lat double precision,
  lng double precision,
  tags text[] not null default '{}',
  media_type text not null default 'image' check (media_type in ('image','video','audio')),
  storage_path text not null,
  visibility text not null default 'public' check (visibility in ('public','private')),
  favorite boolean not null default false,
  featured boolean not null default false,
  chapter_id uuid references public.chapters(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.memories enable row level security;

-- Add chapter cover FK after memories exists.
do $$ begin
  alter table public.chapters add constraint chapters_cover_memory_fk foreign key (cover_memory_id) references public.memories(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------- COMMENTS / REACTIONS ----------
create table if not exists public.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  display_name text default 'Nosotros',
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.memory_comments enable row level security;

create table if not exists public.memory_reactions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  reaction text not null check (reaction in ('❤️','😍','🥹','😂')),
  created_at timestamptz not null default now(),
  unique(memory_id,user_id,reaction)
);
alter table public.memory_reactions enable row level security;

-- ---------- FUTURO ----------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text default '',
  category text default 'juntos',
  target_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.plans enable row level security;

create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.capsules enable row level security;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_type text default 'other',
  description text default '',
  countdown boolean not null default true,
  annual boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.events enable row level security;

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  badge text default '🏆',
  title text not null,
  description text default '',
  achieved_on date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.achievements enable row level security;

-- ---------- PERFILES ----------
create table if not exists public.profiles (
  user_slot text primary key check (user_slot in ('david','madeline')),
  display_name text not null,
  bio text default '',
  birthday date,
  favorite_things text[] not null default '{}',
  avatar_path text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ---------- PREGUNTAS DE PAREJA ----------
create table if not exists public.couple_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  question_date date not null default current_date,
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.couple_questions enable row level security;

create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.couple_questions(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  display_name text,
  answer text not null,
  created_at timestamptz not null default now(),
  unique(question_id,user_id)
);
alter table public.question_answers enable row level security;



-- ---------- PLAYLIST / NOTAS COMPARTIDAS ----------
create table if not exists public.playlist (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text default '',
  url text default '',
  note text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.playlist enable row level security;

create table if not exists public.couple_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  display_name text default 'Nosotros',
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.couple_notes enable row level security;

-- ---------- HISTORIAL DE CAMBIOS ----------
create table if not exists public.change_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
alter table public.change_log enable row level security;

drop policy if exists "change_log_read" on public.change_log;
create policy "change_log_read" on public.change_log for select to authenticated using (public.is_permanent_user());

create or replace function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare rid text;
begin
  rid := coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id'),(to_jsonb(new)->>'key'),(to_jsonb(old)->>'key'),(to_jsonb(new)->>'user_slot'),(to_jsonb(old)->>'user_slot'));
  insert into public.change_log(table_name,record_id,action,old_data,new_data,changed_by)
  values(TG_TABLE_NAME,rid,TG_OP,case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) end,case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) end,auth.uid());
  if TG_OP='DELETE' then return old; else return new; end if;
end;
$$;

-- ---------- RLS HELPER POLICIES ----------
-- Public data: everyone can read active public rows; permanent users can read all including trash/private.

drop policy if exists "chapters_read" on public.chapters;
create policy "chapters_read" on public.chapters for select to anon, authenticated using (deleted_at is null or public.is_permanent_user());
drop policy if exists "chapters_write" on public.chapters;
create policy "chapters_write" on public.chapters for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "memories_read" on public.memories;
create policy "memories_read" on public.memories for select to anon, authenticated using ((deleted_at is null and visibility='public') or public.is_permanent_user());
drop policy if exists "memories_write" on public.memories;
create policy "memories_write" on public.memories for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "comments_read" on public.memory_comments;
create policy "comments_read" on public.memory_comments for select to anon, authenticated using (public.is_permanent_user() or (deleted_at is null and exists(select 1 from public.memories m where m.id=memory_id and m.deleted_at is null and m.visibility='public')));
drop policy if exists "comments_write" on public.memory_comments;
create policy "comments_write" on public.memory_comments for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "reactions_read" on public.memory_reactions;
create policy "reactions_read" on public.memory_reactions for select to anon, authenticated using (public.is_permanent_user() or exists(select 1 from public.memories m where m.id=memory_id and m.deleted_at is null and m.visibility='public'));
drop policy if exists "reactions_write" on public.memory_reactions;
create policy "reactions_write" on public.memory_reactions for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "plans_read" on public.plans;
create policy "plans_read" on public.plans for select to anon, authenticated using (deleted_at is null or public.is_permanent_user());
drop policy if exists "plans_write" on public.plans;
create policy "plans_write" on public.plans for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "capsules_read" on public.capsules;
create policy "capsules_read" on public.capsules for select to anon, authenticated using ((deleted_at is null and visibility='public') or public.is_permanent_user());
drop policy if exists "capsules_write" on public.capsules;
create policy "capsules_write" on public.capsules for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events for select to anon, authenticated using (deleted_at is null or public.is_permanent_user());
drop policy if exists "events_write" on public.events;
create policy "events_write" on public.events for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "achievements_read" on public.achievements;
create policy "achievements_read" on public.achievements for select to anon, authenticated using (deleted_at is null or public.is_permanent_user());
drop policy if exists "achievements_write" on public.achievements;
create policy "achievements_write" on public.achievements for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "profiles_write" on public.profiles;
create policy "profiles_write" on public.profiles for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "questions_read" on public.couple_questions;
create policy "questions_read" on public.couple_questions for select to anon, authenticated using (deleted_at is null or public.is_permanent_user());
drop policy if exists "questions_write" on public.couple_questions;
create policy "questions_write" on public.couple_questions for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "answers_read" on public.question_answers;
create policy "answers_read" on public.question_answers for select to authenticated using (public.is_permanent_user());
drop policy if exists "answers_write" on public.question_answers;
create policy "answers_write" on public.question_answers for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user() and auth.uid()=user_id);



drop policy if exists "playlist_read" on public.playlist;
create policy "playlist_read" on public.playlist for select to anon, authenticated using (deleted_at is null or public.is_permanent_user());
drop policy if exists "playlist_write" on public.playlist;
create policy "playlist_write" on public.playlist for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user());

drop policy if exists "notes_read" on public.couple_notes;
create policy "notes_read" on public.couple_notes for select to authenticated using (public.is_permanent_user());
drop policy if exists "notes_write" on public.couple_notes;
create policy "notes_write" on public.couple_notes for all to authenticated using (public.is_permanent_user()) with check (public.is_permanent_user() and auth.uid()=user_id);

-- ---------- UPDATED_AT TRIGGERS ----------
do $$
declare t text;
begin
  foreach t in array array['site_content','chapters','memories','plans','capsules','events','achievements','profiles','playlist','couple_questions'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;



-- Audit important editable tables.
do $$
declare t text;
begin
  foreach t in array array['site_content','chapters','memories','plans','capsules','events','achievements','profiles','playlist','couple_questions'] loop
    execute format('drop trigger if exists trg_%I_audit on public.%I',t,t);
    execute format('create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()',t,t);
  end loop;
end $$;

-- ---------- STORAGE ----------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
('couple-public','couple-public',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/aac']),
('couple-private','couple-private',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/aac'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "couple_public_read" on storage.objects;
create policy "couple_public_read" on storage.objects for select to anon, authenticated using (bucket_id='couple-public');
drop policy if exists "couple_public_write" on storage.objects;
create policy "couple_public_write" on storage.objects for insert to authenticated with check (bucket_id='couple-public' and public.is_permanent_user());
drop policy if exists "couple_public_update" on storage.objects;
create policy "couple_public_update" on storage.objects for update to authenticated using (bucket_id='couple-public' and public.is_permanent_user()) with check (bucket_id='couple-public' and public.is_permanent_user());
drop policy if exists "couple_public_delete" on storage.objects;
create policy "couple_public_delete" on storage.objects for delete to authenticated using (bucket_id='couple-public' and public.is_permanent_user());

drop policy if exists "couple_private_read" on storage.objects;
create policy "couple_private_read" on storage.objects for select to authenticated using (bucket_id='couple-private' and public.is_permanent_user());
drop policy if exists "couple_private_write" on storage.objects;
create policy "couple_private_write" on storage.objects for insert to authenticated with check (bucket_id='couple-private' and public.is_permanent_user());
drop policy if exists "couple_private_update" on storage.objects;
create policy "couple_private_update" on storage.objects for update to authenticated using (bucket_id='couple-private' and public.is_permanent_user()) with check (bucket_id='couple-private' and public.is_permanent_user());
drop policy if exists "couple_private_delete" on storage.objects;
create policy "couple_private_delete" on storage.objects for delete to authenticated using (bucket_id='couple-private' and public.is_permanent_user());

-- ---------- DEFAULT CONTENT ----------
insert into public.site_content(key,value) values
('couple', '{"david":"David","madeline":"Madeline","names":"David & Madeline","startedTalking":"2026-07-12","firstMeeting":"2026-08-16"}'::jsonb),
('hero', '{"eyebrow":"Nuestra historia, escrita a dos corazones","title":"David & Madeline","subtitle":"Hay encuentros que parecen casualidad… hasta que empiezas a sentir que todo te estaba llevando a esa persona.","question":"¿Quieres seguir escribiendo esta historia conmigo?"}'::jsonb),
('letter', '{"title":"Para ti, mi lugar favorito ❤️","body":"Desde que llegaste, los días comunes empezaron a tener algo especial. No quiero prometerte una historia perfecta; quiero prometerte una historia real: con risas, conversaciones eternas, planes improvisados, apoyo en los días difíciles y muchos recuerdos que todavía no existen.\n\nSi algún día vuelves a esta carta, quiero que recuerdes esto: elegirte no fue un impulso de un instante. Fue darme cuenta, poco a poco, de que quiero seguir descubriendo la vida contigo."}'::jsonb),
('reasons', '["Porque contigo una conversación sencilla puede convertirse en mi parte favorita del día.","Porque haces que tenga ganas de crear recuerdos incluso en los días normales.","Porque me gusta quién soy cuando estoy contigo.","Porque todavía tenemos demasiadas primeras veces por vivir."]'::jsonb),
('jar_messages', '["Hoy también te elegiría.","Gracias por convertirte en un lugar seguro dentro de mis días.","Algún día miraremos atrás y sonreiremos por todo lo que empezó con un simple hola.","No necesito un día especial para recordarte lo importante que eres para mí."]'::jsonb),
('open_when', '[{"title":"Abrir cuando me extrañes","body":"Si me extrañas, piensa que en alguna parte yo también estoy deseando volver a verte. La distancia solo confirma cuánto significan nuestros momentos juntos."},{"title":"Abrir cuando tengas un día difícil","body":"No tienes que poder con todo al mismo tiempo. Quiero estar para escucharte, acompañarte y recordarte lo increíble que eres incluso cuando tú no puedas verlo."},{"title":"Abrir cuando quieras sonreír","body":"Busca una de nuestras fotos más tontas. Si no funciona, recuerda que de todas las personas del mundo terminaste encontrándome a mí. Eso ya es bastante gracioso."}]'::jsonb),
('section_texts', '{"history_title":"Dos fechas que cambiaron el rumbo","gallery_title":"Nuestro archivo de momentos","chapters_title":"Capítulos que todavía siguen creciendo","plans_title":"Lo que todavía nos falta vivir","capsules_title":"Mensajes para nuestro futuro"}'::jsonb),
('settings', '{"music_enabled":true,"music_url":"./assets/audio/our-theme.wav","relationship_label":"Desde nuestro primer hola","footer":"Hecho con recuerdos, promesas y un poquito de código ❤️"}'::jsonb),
('date_ideas', '["Picnic al atardecer con una playlist hecha por los dos","Cocinar una receta que ninguno haya probado","Salir a manejar sin destino y elegir el lugar sobre la marcha","Noche de películas con snacks escogidos por el otro","Tomar fotos como turistas en nuestra propia ciudad","Escribir una carta para abrir dentro de un año"]'::jsonb),
('questions', '["¿Qué pequeño momento conmigo recuerdas con más cariño?","¿Qué lugar te gustaría conocer juntos algún día?","¿Qué cosa cotidiana te hace sentir querido/a?","¿Qué canción te hace pensar en nosotros?"]'::jsonb)
on conflict(key) do nothing;

insert into public.profiles(user_slot,display_name,bio,favorite_things) values
('david','David','El que convirtió recuerdos en código.','{"Madeline","música","fotografía","crear cosas"}'),
('madeline','Madeline','La persona que volvió especial esta historia.','{"detalles","recuerdos","momentos juntos"}')
on conflict(user_slot) do nothing;

insert into public.chapters(chapter_number,chapter_date,emoji,title,body)
select 1,'2026-07-12','💬','El primer hola','Comenzamos a hablar sin saber hasta dónde nos llevaría aquella conversación. Lo que parecía un día cualquiera terminó convirtiéndose en la primera página de algo importante.'
where not exists(select 1 from public.chapters where chapter_number=1);
insert into public.chapters(chapter_number,chapter_date,emoji,title,body)
select 2,'2026-08-16','✨','El día de conocernos','Después de tantas palabras llegó el momento de vernos frente a frente. Desde entonces esa fecha dejó de ser un día más en el calendario.'
where not exists(select 1 from public.chapters where chapter_number=2);

insert into public.events(title,event_date,event_type,description,countdown,annual)
select 'El día que empezamos a hablar','2026-07-12','anniversary','Nuestro primer hola',true,true
where not exists(select 1 from public.events where title='El día que empezamos a hablar');
insert into public.events(title,event_date,event_type,description,countdown,annual)
select 'El día que nos conocimos','2026-08-16','anniversary','La primera vez frente a frente',true,true
where not exists(select 1 from public.events where title='El día que nos conocimos');

insert into public.plans(title,details,category) select 'Hacer nuestro primer viaje inolvidable','Elegir el lugar juntos y llenar el álbum de fotos.','viaje' where not exists(select 1 from public.plans where title='Hacer nuestro primer viaje inolvidable');
insert into public.plans(title,details,category) select 'Crear una tradición solo nuestra','Algo pequeño que queramos repetir cada año.','tradición' where not exists(select 1 from public.plans where title='Crear una tradición solo nuestra');
insert into public.plans(title,details,category) select 'Escribir una carta para el futuro','Abrirla juntos cuando haya pasado un año.','cápsula' where not exists(select 1 from public.plans where title='Escribir una carta para el futuro');

insert into public.achievements(badge,title,description,achieved_on)
select '💬','Primer hola','El momento donde empezó todo.','2026-07-12' where not exists(select 1 from public.achievements where title='Primer hola');
insert into public.achievements(badge,title,description,achieved_on)
select '✨','Nos conocimos','La historia salió de la pantalla.','2026-08-16' where not exists(select 1 from public.achievements where title='Nos conocimos');



insert into public.playlist(title,artist,url,note)
select 'Nuestra canción del momento','David & Madeline','','Puedes editar este espacio y pegar un enlace de Spotify, YouTube o la canción que represente esta etapa.'
where not exists(select 1 from public.playlist where title='Nuestra canción del momento');



insert into public.couple_questions(question,question_date,generated_by_ai)
select '¿Qué pequeño momento de nosotros guardarías para volver a vivirlo exactamente igual?',current_date,false
where not exists(select 1 from public.couple_questions where deleted_at is null);

insert into public.capsules(title,message,unlock_at,visibility)
select 'Para nuestro próximo 12 de julio','Si estamos abriendo esto juntos, significa que aquella primera conversación siguió convirtiéndose en recuerdos. Ojalá al leerlo podamos mirar alrededor y sentir orgullo de todo lo que construimos desde aquel primer hola.','2027-07-12 00:00:00-05','public'
where not exists(select 1 from public.capsules where title='Para nuestro próximo 12 de julio');

-- Done.
