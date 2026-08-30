-- Synthetic seed data for local development and testing
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'test1@example.com', '$2a$10$abcdefghijklmnopqrstuu', now(), '{"display_name": "Test User 1"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'test2@example.com', '$2a$10$abcdefghijklmnopqrstuu', now(), '{"display_name": "Test User 2"}'::jsonb, 'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Seed daily goals and entries for test1
INSERT INTO public.daily_goal_versions (id, user_id, effective_from, amount)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '7 days', 100)
ON CONFLICT (user_id, effective_from) DO NOTHING;

INSERT INTO public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client, revision)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 50, CURRENT_DATE, 'UTC', now(), 1),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 70, CURRENT_DATE, 'UTC', now(), 1)
ON CONFLICT (id) DO NOTHING;
