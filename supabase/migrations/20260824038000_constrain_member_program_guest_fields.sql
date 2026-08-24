-- Mirror member-program input limits at the database boundary.

begin;

alter table public.member_program_requests
  add constraint member_program_requests_guest_name_length
    check (guest_name is null or char_length(guest_name) between 1 and 100),
  add constraint member_program_requests_guest_email_length
    check (guest_email is null or char_length(guest_email) between 3 and 254),
  add constraint member_program_requests_guest_email_shape
    check (guest_email is null or guest_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

commit;
