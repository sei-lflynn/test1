create view permissions.users_and_roles as
(
  select
    u.username as username,
    -- Roles
    u.default_role as hasura_default_role,
    array_agg(r.allowed_role) filter (where r.allowed_role is not null) as hasura_allowed_roles
  from permissions.users u
  left join permissions.users_allowed_roles r using (username)
  group by u.username
);

comment on view permissions.users_and_roles is e''
'View a user''s information with their role information';
