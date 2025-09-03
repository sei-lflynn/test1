create table hasura.create_snapshot_return_value(snapshot_id integer);
-- Description must be the last parameter since it has a default value
create function hasura.create_snapshot(_plan_id integer, _snapshot_name text, hasura_session json, _description text default null)
  returns hasura.create_snapshot_return_value
  volatile
  language plpgsql as $$
declare
  _snapshot_id integer;
  _snapshotter text;
  _function_permission permissions.permission;
begin
  _snapshotter := (hasura_session ->> 'x-hasura-user-id');
  _function_permission := permissions.get_function_permissions('create_snapshot', hasura_session);
  perform permissions.raise_if_plan_merge_permission('create_snapshot', _function_permission);
  if not _function_permission = 'NO_CHECK' then
    call permissions.check_general_permissions('create_snapshot', _function_permission, _plan_id, _snapshotter);
  end if;
  if _snapshot_name is null then
    raise exception 'Snapshot name cannot be null.';
  end if;

  select merlin.create_snapshot(_plan_id, _snapshot_name, _description, _snapshotter) into _snapshot_id;
  return row(_snapshot_id)::hasura.create_snapshot_return_value;
end;
$$;

create function hasura.restore_from_snapshot(_plan_id integer, _snapshot_id integer, hasura_session json)
	returns hasura.create_snapshot_return_value
	volatile
	language plpgsql as $$
declare
  _user text;
  _function_permission permissions.permission;
begin
	_user := (hasura_session ->> 'x-hasura-user-id');
  _function_permission := permissions.get_function_permissions('restore_snapshot', hasura_session);
  perform permissions.raise_if_plan_merge_permission('restore_snapshot', _function_permission);
  if not _function_permission = 'NO_CHECK' then
    call permissions.check_general_permissions('restore_snapshot', _function_permission, _plan_id, _user);
  end if;

  call merlin.restore_from_snapshot(_plan_id, _snapshot_id);
  return row(_snapshot_id)::hasura.create_snapshot_return_value;
end
$$;
