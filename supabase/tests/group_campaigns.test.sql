begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222221', 'authenticated', 'authenticated', 'mvp11-goal-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'mvp11-goal-member@example.test', '', now(), now(), now());
insert into public.profiles (id, display_name, normalized_name)
values
  ('22222222-2222-4222-8222-222222222221', 'Goal Owner', 'goal owner'),
  ('22222222-2222-4222-8222-222222222222', 'Goal Member', 'goal member');
insert into public.user_settings (user_id, timezone, locale)
values
  ('22222222-2222-4222-8222-222222222221', 'UTC', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'UTC', 'de');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('22222222-2222-4222-8222-222222222221', 'core_processing', 'mvp-core-v1', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'core_processing', 'mvp-core-v1', 'de');
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values (
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222221',
  'Goal Circle',
  'goal circle',
  'UTC'
);
insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values
  ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222221', 'mvp08-group-sharing-v1'),
  ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222222', 'mvp08-group-sharing-v1');

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222221';
select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'month', 3000, 1);
select isnt(public.get_group_insights('22222222-2222-4222-8222-222222222201','week')->>'goal_amount', null::text, 'monthly campaign derives weekly goal when no weekly override exists');

-- Fixed calendar examples cover leap February and the 30/29-day Islamic transition.
reset role;
select is((select start_date from private.group_campaign_bounds('gregorian','2024-02-20')),date '2024-02-01','Gregorian choice normalizes to first of selected month');
select is((select end_date from private.group_campaign_bounds('gregorian','2024-02-20')),date '2024-02-29','Gregorian leap month ends on February 29');
select is((select start_date from private.group_campaign_bounds('islamic','2024-03-20')),date '2024-03-11','civil Ramadan 1445 begins March 11');
select is((select end_date from private.group_campaign_bounds('islamic','2024-04-20')),date '2024-05-08','civil Shawwal 1445 has 29 days');
update public.group_memberships set joined_at='2023-01-01';
insert into public.salawat_entries(id,user_id,amount,entry_date,timezone,recorded_at_client) values
(gen_random_uuid(),'22222222-2222-4222-8222-222222222221',10,'2024-02-16','UTC','2024-02-16T12:00:00Z'),
(gen_random_uuid(),'22222222-2222-4222-8222-222222222221',20,'2024-02-17','UTC','2024-02-17T12:00:00Z'),
(gen_random_uuid(),'22222222-2222-4222-8222-222222222221',30,'2024-03-17','UTC','2024-03-17T12:00:00Z'),
(gen_random_uuid(),'22222222-2222-4222-8222-222222222221',40,'2024-03-18','UTC','2024-03-18T12:00:00Z');
set local role authenticated;
select public.set_group_goal('22222222-2222-4222-8222-222222222201','month',3000,2,'custom','2024-02-17');
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','month')->>'campaign_end','2024-03-17','custom campaign has exactly thirty inclusive days across leap February');
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','month')->>'period_total','50','campaign aggregate includes only its inclusive start and end dates');
select is(public.get_group_leaderboard('22222222-2222-4222-8222-222222222201','month')->'items'->0->>'total','50','monthly leaderboard uses the same campaign bounds');
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','month')->>'group_per_day',null::text,'expired campaign does not invent a daily pace');
select public.set_group_goal('22222222-2222-4222-8222-222222222201','month',3000,3,'custom',date_trunc('week',now() at time zone 'UTC')::date+2);
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','week')->>'goal_amount','500','five overlap days of thirty derive 500 from 3000');
reset role;
insert into public.salawat_entries(id,user_id,amount,entry_date,timezone,recorded_at_client) values(gen_random_uuid(),'22222222-2222-4222-8222-222222222221',100,date_trunc('week',now() at time zone 'UTC')::date,'UTC',now());
set local role authenticated;
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','week')->>'period_total','0','derived weekly goal excludes entries before campaign start');
select is(public.get_group_leaderboard('22222222-2222-4222-8222-222222222201','week')->'items'->0->>'total','0','derived weekly ranking uses the same overlap window');
select public.set_group_goal('22222222-2222-4222-8222-222222222201','week',123,4);
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','week')->>'goal_amount','123','explicit weekly amount overrides campaign derivation');
select public.set_group_goal('22222222-2222-4222-8222-222222222201','week',null,5);
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201','week')->>'goal_amount','500','clearing explicit weekly override restores proportional campaign goal');
select throws_ok($$select public.set_group_goal('22222222-2222-4222-8222-222222222201','month',3000,1,'custom','2024-02-17')$$,'P0001','ENTRY_VERSION_CONFLICT','campaign updates enforce revision');
select throws_ok($$select public.set_group_goal('22222222-2222-4222-8222-222222222201','month',3000,6,'invalid','2024-02-17')$$,'P0001','INVALID_INPUT','unknown calendar rejected');
select throws_ok($$select public.set_group_goal('22222222-2222-4222-8222-222222222201','week',3000,6,'custom','2024-02-17')$$,'P0001','INVALID_INPUT','campaign arguments cannot mutate a weekly period');
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok($$select public.set_group_goal('22222222-2222-4222-8222-222222222201','month',999,6,'custom','2024-02-17')$$,'P0001','NOT_FOUND','ordinary member cannot change campaign');
select throws_ok($$select * from public.group_goal_campaigns$$,'42501',null,'raw campaign records are inaccessible');
select throws_ok($$update public.group_goal_campaigns set start_date='2024-01-01'$$,'42501',null,'client cannot bypass owner RPC with direct update');
reset role;
update public.group_memberships set left_at=now() where user_id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select throws_ok($$select public.get_group_insights('22222222-2222-4222-8222-222222222201','month')$$,'P0001','NOT_FOUND','former member cannot read campaign aggregates');
select throws_ok($$select public.get_group_leaderboard('22222222-2222-4222-8222-222222222201','month')$$,'P0001','NOT_FOUND','former member cannot read campaign ranking');
reset role;
set local role anon;
select throws_ok($$select public.set_group_goal('22222222-2222-4222-8222-222222222201','month',999,6,'custom','2024-02-17')$$,'42501',null,'anonymous caller cannot mutate campaigns');
select * from finish();
rollback;
