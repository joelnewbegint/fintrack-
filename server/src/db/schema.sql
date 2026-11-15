-- ============================================================================
-- VK BANKER'S & FINANCE - LOAN APPLICATION & AGREEMENT MODULE
-- Database Schema: PostgreSQL 14+ (Compatible with Supabase / Neon / AWS RDS)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
DO $$ BEGIN
    CREATE TYPE loan_scheme_enum AS ENUM ('daily', 'weekly', 'monthly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_status_enum AS ENUM ('active', 'overdue', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('cash', 'upi', 'bank_transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'agent', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sequence for Year-Prefixed Sequential Loan IDs: LN-{YY}{seq} (e.g. LN-26-0001)
CREATE SEQUENCE IF NOT EXISTS loan_id_seq START WITH 1 INCREMENT BY 1;

-- 1. Agents / Staff Table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'agent',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Borrowers Table (Customer Registry)
CREATE TABLE IF NOT EXISTS borrowers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_code VARCHAR(30) UNIQUE,
    name VARCHAR(150) NOT NULL,
    father_spouse_name VARCHAR(150),
    dob DATE,
    mobile VARCHAR(10) NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
    alt_mobile VARCHAR(15),
    full_address TEXT NOT NULL,
    area_ward VARCHAR(100) NOT NULL,
    pincode VARCHAR(6) CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$'),
    aadhaar_last4 VARCHAR(4) NOT NULL CHECK (aadhaar_last4 ~ '^[0-9]{4}$'),
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrowers_mobile ON borrowers(mobile);
CREATE INDEX IF NOT EXISTS idx_borrowers_aadhaar ON borrowers(aadhaar_last4);
CREATE INDEX IF NOT EXISTS idx_borrowers_area ON borrowers(area_ward);

-- 3. Guarantors Table
CREATE TABLE IF NOT EXISTS guarantors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_id UUID REFERENCES borrowers(id) ON DELETE CASCADE,
    name VARCHAR(150),
    mobile VARCHAR(15),
    relation VARCHAR(80),
    address TEXT,
    id_last4 VARCHAR(4),
    photo_url TEXT,
    not_required BOOLEAN NOT NULL DEFAULT false,
    not_required_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guarantors_borrower ON guarantors(borrower_id);

-- 4. Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_no VARCHAR(30) UNIQUE NOT NULL,
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE RESTRICT,
    guarantor_id UUID REFERENCES guarantors(id) ON DELETE SET NULL,
    principal NUMERIC(12, 2) NOT NULL CHECK (principal > 0),
    charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_disbursed NUMERIC(12, 2) NOT NULL CHECK (net_disbursed > 0),
    total_payable NUMERIC(12, 2) NOT NULL CHECK (total_payable >= principal),
    installment_amount NUMERIC(12, 2) NOT NULL CHECK (installment_amount > 0),
    scheme loan_scheme_enum NOT NULL DEFAULT 'daily',
    tenure INT NOT NULL CHECK (tenure > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    skip_holidays BOOLEAN NOT NULL DEFAULT true,
    collection_agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'cash',
    late_fee_per_day NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    effective_annual_rate NUMERIC(6, 2), -- Internal EAR metric (not shown on form)
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    outstanding NUMERIC(12, 2) NOT NULL,
    overdue_days INT NOT NULL DEFAULT 0,
    late_fee_accrued NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status loan_status_enum NOT NULL DEFAULT 'active',
    borrower_signature_url TEXT,
    guarantor_signature_url TEXT,
    officer_signature_url TEXT,
    agreement_place VARCHAR(100) DEFAULT 'Tamil Nadu',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_completed_outstanding CHECK (
        (status = 'completed' AND outstanding = 0) OR (status <> 'completed')
    )
);

CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_scheme ON loans(scheme);
CREATE INDEX IF NOT EXISTS idx_loans_dates ON loans(start_date, end_date);

-- Function to Generate Sequential Loan ID: LN-26-0001
CREATE OR REPLACE FUNCTION generate_loan_no()
RETURNS TRIGGER AS $$
DECLARE
    yy TEXT;
    seq_num BIGINT;
BEGIN
    IF NEW.loan_no IS NULL OR NEW.loan_no = '' THEN
        yy := to_char(CURRENT_DATE, 'YY');
        seq_num := nextval('loan_id_seq');
        NEW.loan_no := 'LN-' || yy || '-' || LPAD(seq_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_loan_no ON loans;
CREATE TRIGGER trg_generate_loan_no
BEFORE INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION generate_loan_no();

-- 5. Payments Table (Immutable Audit Ledger: Reversals Only, No Updates/Deletes)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    receipt_no VARCHAR(40) UNIQUE NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode payment_mode_enum NOT NULL DEFAULT 'cash',
    agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversal_reason TEXT,
    reversed_at TIMESTAMPTZ,
    reversed_by INT REFERENCES agents(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 6. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(60) NOT NULL,
    record_id TEXT NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, REVERSAL
    old_data JSONB,
    new_data JSONB,
    performed_by TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- 7. Trigger to Update Loan Outstanding upon Payment / Reversal
CREATE OR REPLACE FUNCTION update_loan_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    paid_sum NUMERIC(12, 2);
    l_total NUMERIC(12, 2);
    l_end DATE;
    l_rem NUMERIC(12, 2);
    new_status loan_status_enum;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO paid_sum
    FROM payments
    WHERE loan_id = NEW.loan_id AND is_reversed = false;

    SELECT total_payable, end_date INTO l_total, l_end
    FROM loans
    WHERE id = NEW.loan_id;

    l_rem := GREATEST(0, l_total - paid_sum);

    IF l_rem = 0 THEN
        new_status := 'completed';
    ELSIF CURRENT_DATE > l_end THEN
        new_status := 'overdue';
    ELSE
        new_status := 'active';
    END IF;

    UPDATE loans
    SET total_paid = paid_sum,
        outstanding = l_rem,
        status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.loan_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_update_loan ON payments;
CREATE TRIGGER trg_payment_update_loan
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_loan_on_payment();

