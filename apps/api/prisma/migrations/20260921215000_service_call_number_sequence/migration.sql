CREATE SEQUENCE "service_call_number_seq" START WITH 1;

DO $$
DECLARE
  last_number BIGINT;
BEGIN
  SELECT MAX((substring("serviceCallNumber" FROM '^SC-([0-9]+)$'))::BIGINT)
    INTO last_number
    FROM "service_calls";

  PERFORM setval(
    'service_call_number_seq',
    COALESCE(last_number, 1),
    last_number IS NOT NULL
  );
END $$;
