create table merlin.plan_latest_snapshot(
  plan_id integer,
  snapshot_id integer,

  primary key (plan_id, snapshot_id),
  foreign key (plan_id)
    references merlin.plan
    on update cascade
    on delete cascade,
  foreign key (snapshot_id)
    references merlin.plan_snapshot
    on update cascade
    on delete cascade
);

comment on table merlin.plan_latest_snapshot is e''
  'An association table between a plan and the most recent snapshot taken of the plan.';
