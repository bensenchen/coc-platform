-- Least-privilege roles. System administrators are asserted only through the
-- trusted app_metadata JWT claim, never user-editable metadata.
alter table public.workspace_member drop constraint workspace_member_role_check;
alter table public.workspace_invitation drop constraint workspace_invitation_role_check;
alter table public.project_member drop constraint project_member_role_check;

insert into public.project_member(project_id,user_id,role)
select p.id,m.user_id,'project_editor' from public.project p join public.workspace_member m on m.workspace_id=p.workspace_id and m.role='editor'
on conflict(project_id,user_id) do update set role='project_editor';
update public.workspace_member set role='workspace_admin' where role='admin';
update public.workspace_member set role='viewer' where role='editor';
update public.workspace_invitation set role='workspace_admin' where role='admin';
update public.workspace_invitation set role='viewer' where role='editor';
update public.project_member set role=case role when 'admin' then 'project_editor' when 'editor' then 'project_editor' else role end;

alter table public.workspace_member add constraint workspace_member_role_check check(role in ('workspace_admin','viewer'));
alter table public.workspace_invitation add constraint workspace_invitation_role_check check(role in ('workspace_admin','viewer'));
alter table public.project_member add constraint project_member_role_check check(role in ('project_editor','commenter','viewer'));
alter table public.page drop constraint page_kind_check;
alter table public.page add constraint page_kind_check check(kind in ('context','org','data','data_view','interface_list','icd','sheet'));

create or replace function public.is_system_admin() returns boolean language sql stable set search_path='' as
$$ select coalesce(auth.jwt()->'app_metadata'->>'system_role','')='system_admin' $$;
create or replace function public.is_workspace_member(wid uuid) returns boolean language sql stable security definer set search_path='' as
$$ select public.is_system_admin() or exists(select 1 from public.workspace_member m where m.workspace_id=wid and m.user_id=auth.uid()) $$;
create or replace function public.is_workspace_admin(wid uuid) returns boolean language sql stable security definer set search_path='' as
$$ select public.is_system_admin() or exists(select 1 from public.workspace_member m where m.workspace_id=wid and m.user_id=auth.uid() and m.role='workspace_admin') $$;
create or replace function public.can_edit_project(pid uuid) returns boolean language sql stable security definer set search_path='' as
$$ select public.is_system_admin() or exists(select 1 from public.project p join public.workspace_member w on w.workspace_id=p.workspace_id and w.user_id=auth.uid() and w.role='workspace_admin' where p.id=pid) or exists(select 1 from public.project_member m where m.project_id=pid and m.user_id=auth.uid() and m.role='project_editor') $$;
create or replace function public.can_edit_workspace(wid uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.is_workspace_admin(wid) $$;

drop policy project_write on public.project;
create policy project_write on public.project for all using(public.is_workspace_admin(workspace_id)) with check(public.is_workspace_admin(workspace_id));
drop policy page_write on public.page;
create policy page_write on public.page for all using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
drop policy object_write on public.canvas_object;
create policy object_write on public.canvas_object for all using(public.can_edit_project((select project_id from public.page where id=page_id))) with check(public.can_edit_project((select project_id from public.page where id=page_id)));
drop policy column_access on public.sheet_column;
create policy column_access on public.sheet_column for all using(public.is_workspace_member(public.workspace_for_page(page_id))) with check(public.can_edit_project((select project_id from public.page where id=page_id)));
drop policy row_access on public.sheet_row;
create policy row_access on public.sheet_row for all using(public.is_workspace_member(public.workspace_for_page(page_id))) with check(public.can_edit_project((select project_id from public.page where id=page_id)));
drop policy anchor_access on public.connector_anchor;
create policy anchor_access on public.connector_anchor for all using(exists(select 1 from public.canvas_object o where o.id=connector_id and public.is_workspace_member(public.workspace_for_page(o.page_id)))) with check(exists(select 1 from public.canvas_object o join public.page p on p.id=o.page_id where o.id=connector_id and public.can_edit_project(p.project_id)));
drop policy cell_access on public.sheet_cell;
create policy cell_access on public.sheet_cell for all using(exists(select 1 from public.sheet_row r where r.id=row_id and public.is_workspace_member(public.workspace_for_page(r.page_id)))) with check(exists(select 1 from public.sheet_row r join public.page p on p.id=r.page_id where r.id=row_id and public.can_edit_project(p.project_id)));
drop policy interface_access on public.interface;
create policy interface_access on public.interface for all using(public.is_workspace_member(public.workspace_for_project(project_id))) with check(public.can_edit_project(project_id));
drop policy attachment_access on public.attachment;
create policy attachment_access on public.attachment for all using(public.is_workspace_member(public.workspace_for_project(project_id))) with check(public.can_edit_project(project_id));
drop policy snapshot_access on public.page_snapshot;
create policy snapshot_access on public.page_snapshot for all using(public.is_workspace_member(public.workspace_for_page(page_id))) with check(public.can_edit_project((select project_id from public.page where id=page_id)));

create or replace function public.create_workspace_for_user(workspace_name text) returns public.workspace language plpgsql security definer set search_path='' as $$
declare w public.workspace; base text; candidate text; n int:=1;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  base:=trim(both '-' from regexp_replace(lower(trim(workspace_name)),'[^a-z0-9]+','-','g')); if base='' then base:='workspace'; end if; candidate:=base;
  loop begin insert into public.workspace(name,slug,created_by) values(trim(workspace_name),candidate,auth.uid()) returning * into w; exit;
    exception when unique_violation then n:=n+1; candidate:=base||'-'||n; end; end loop;
  insert into public.workspace_member values(w.id,auth.uid(),'workspace_admin',now()); return w;
end $$;
