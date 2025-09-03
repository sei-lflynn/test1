create table scheduler.scheduling_request (
  analysis_id integer generated always as identity,
  specification_id integer not null,
  dataset_id integer default null,

  specification_revision integer not null,
  plan_revision integer not null,

  -- Scheduling State
  status util_functions.request_status not null default 'pending',
  reason jsonb null,
  canceled boolean not null default false,

  -- Simulation Arguments Used in Scheduling
  horizon_start timestamptz not null,
  horizon_end timestamptz not null,
  simulation_arguments jsonb not null,

  -- Additional Metadata
  requested_by text,
  requested_at timestamptz not null default now(),

  constraint scheduling_request_pkey
    primary key(analysis_id),
  constraint scheduling_request_unique
    unique (specification_id, specification_revision, plan_revision),
  constraint scheduling_request_references_scheduling_specification
    foreign key(specification_id)
      references scheduler.scheduling_specification
      on update cascade
      on delete cascade,
  constraint scheduling_request_requester_exists
    foreign key (requested_by)
      references permissions.users
        on update cascade
        on delete set null,
  constraint scheduling_request_references_dataset
    foreign key (dataset_id)
      references merlin.dataset
      on update cascade
      on delete set null,
  constraint start_before_end
    check (horizon_start <= horizon_end)
);

comment on table scheduler.scheduling_request is e''
  'The status of a scheduling run that is to be performed (or has been performed).';
comment on column scheduler.scheduling_request.analysis_id is e''
  'The ID associated with the analysis of this scheduling run.';
comment on column scheduler.scheduling_request.specification_id is e''
  'The ID of scheduling specification for this scheduling run.';
comment on column scheduler.scheduling_request.dataset_id is e''
  'The dataset containing the final simulation results for the simulation. NULL if no simulations were run during scheduling.';
comment on column scheduler.scheduling_request.specification_revision is e''
  'The revision of the scheduling_specification associated with this request.';
comment on column scheduler.scheduling_request.plan_revision is e''
  'The revision of the plan corresponding to the given revision of the dataset.';
comment on column scheduler.scheduling_request.status is e''
  'The state of the the scheduling request.';
comment on column scheduler.scheduling_request.reason is e''
  'The reason for failure in the event a scheduling request fails.';
comment on column scheduler.scheduling_request.canceled is e''
  'Whether the scheduling run has been marked as canceled.';
comment on column scheduler.scheduling_request.horizon_start is e''
  'The start of the scheduling and simulation horizon for this scheduling run.';
comment on column scheduler.scheduling_request.horizon_end is e''
  'The end of the scheduling and simulation horizon for this scheduling run.';
comment on column scheduler.scheduling_request.simulation_arguments is e''
  'The arguments simulations run during the scheduling run will use.';
comment on column scheduler.scheduling_request.requested_by is e''
  'The user who made the scheduling request.';
comment on column scheduler.scheduling_request.requested_at is e''
  'When this scheduling request was made.';

-- Scheduling request NOTIFY triggers
-- These triggers NOTIFY LISTEN(ing) scheduler worker clients of pending scheduling requests

create function scheduler.notify_scheduler_workers ()
returns trigger
security definer
language plpgsql as $$
begin
  perform (
    with payload(specification_revision,
                 plan_revision,
                 specification_id,
                 analysis_id) as
    (
      select NEW.specification_revision,
             NEW.plan_revision,
             NEW.specification_id,
             NEW.analysis_id
    )
    select pg_notify('scheduling_request_notification', json_strip_nulls(row_to_json(payload))::text)
    from payload
  );
  return null;
end$$;

create trigger notify_scheduler_workers
  after insert on scheduler.scheduling_request
  for each row
  execute function scheduler.notify_scheduler_workers();

create function scheduler.cancel_pending_scheduling_rqs()
returns trigger
security definer
language plpgsql as $$
begin
  update scheduler.scheduling_request
  set canceled = true
  where status = 'pending'
  and specification_id = new.specification_id;
  return new;
end
$$;

create trigger cancel_pending_scheduling_rqs
  before insert on scheduler.scheduling_request
  for each row
  execute function scheduler.cancel_pending_scheduling_rqs();

create function scheduler.notify_scheduling_workers_cancel()
returns trigger
security definer
language plpgsql as $$
begin
  perform pg_notify('scheduling_cancel', '' || new.specification_id);
  return null;
end
$$;

create trigger notify_scheduling_workers_cancel
after update of canceled on scheduler.scheduling_request
for each row
when ((old.status != 'success' or old.status != 'failed') and new.canceled)
execute function scheduler.notify_scheduling_workers_cancel();
