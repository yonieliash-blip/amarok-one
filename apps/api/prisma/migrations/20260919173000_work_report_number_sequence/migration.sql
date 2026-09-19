CREATE SEQUENCE "work_report_number_seq" START WITH 1;

DO $$
DECLARE
  last_number BIGINT;
BEGIN
  SELECT MAX((substring("reportNumber" FROM '^AM([0-9]+)$'))::BIGINT)
    INTO last_number
    FROM "work_reports";

  PERFORM setval(
    'work_report_number_seq',
    COALESCE(last_number, 1),
    last_number IS NOT NULL
  );
END $$;
