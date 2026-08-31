begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

select has_function('public', 'get_home_summary', 'home summary RPC exists');
select has_function('public', 'list_entries', 'entry listing RPC exists');
select has_function('public', 'create_entry', 'entry creation RPC exists');
select has_function('public', 'update_entry', 'entry update RPC exists');
select has_function('public', 'delete_entry', 'entry deletion RPC exists');
select has_function('public', 'set_daily_goal', 'daily goal RPC exists');
select has_function('public', 'list_my_groups', 'my groups RPC exists');
select has_function('public', 'create_group', 'group creation RPC exists');
select has_function('public', 'update_group_name', 'group naming RPC exists');
select has_function('public', 'get_group_leaderboard', 'leaderboard RPC exists');
select has_function('private', 'require_active_core_user', 'MVP03 consent guard for MVP04 exists');

select * from finish();
rollback;
