ALTER TABLE enquiries ADD COLUMN applicant_user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_enquiries_applicant_user_id ON enquiries(applicant_user_id);
