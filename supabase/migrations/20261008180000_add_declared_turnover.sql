-- CA actually declared to the CPS for a period. When set, the contributions
-- due for that period are computed from it instead of from the encaissements
-- recorded in the app, so the tracker matches the CPS receipts even when the
-- app's revenue for an old period is incomplete or dated differently.
ALTER TABLE cotisation_reserves
  ADD COLUMN declared_turnover NUMERIC(12, 2)
    CHECK (declared_turnover IS NULL OR declared_turnover >= 0);
