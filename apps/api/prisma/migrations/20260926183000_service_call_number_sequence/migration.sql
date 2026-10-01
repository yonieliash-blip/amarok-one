CREATE SEQUENCE IF NOT EXISTS "service_call_number_seq" START WITH 1;

DO $$
DECLARE
  last_number BIGINT;
BEGIN
  SELECT MAX((substring("serviceCallNumber" FROM '^SC-([0-9]+)$'))::BIGINT)
    INTO last_number
    FROM "service_calls"
    WHERE "serviceCallNumber" ~ '^SC-[0-9]+$';

  IF last_number IS NOT NULL THEN
    PERFORM setval('service_call_number_seq', last_number, true);
  END IF;
END $$;
