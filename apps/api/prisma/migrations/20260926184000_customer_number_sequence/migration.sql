CREATE SEQUENCE IF NOT EXISTS "customer_number_seq" START WITH 1;

DO $$
DECLARE
  last_number BIGINT;
BEGIN
  SELECT MAX((substring("customerNumber" FROM '^CUST-([0-9]+)$'))::BIGINT)
    INTO last_number
    FROM "customers"
    WHERE "customerNumber" ~ '^CUST-[0-9]+$';

  IF last_number IS NOT NULL THEN
    PERFORM setval('customer_number_seq', last_number, true);
  END IF;
END $$;
