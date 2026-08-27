begin;

update public.staff_accounts
set first_name = 'Ivaylo', last_name = 'Nanev'
where staff_id = 'STF-0001' and role = 'owner_admin';

commit;
