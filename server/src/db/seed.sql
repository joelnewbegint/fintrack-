-- ============================================================================
-- VK BANKER'S & FINANCE - SAMPLE SEED DATA (PostgreSQL)
-- Three sample loans: 1 ACTIVE, 1 OVERDUE, 1 COMPLETED (+ LN-D26-6057)
-- ============================================================================

-- 1. Insert Agents
INSERT INTO agents (name, phone, role, active)
VALUES 
    ('Rajesh Kumar (Field Officer)', '9842111111', 'agent', true),
    ('Karthik S (Collection Agent)', '9842122222', 'agent', true),
    ('Admin Officer (VK Bankers)', '9842100000', 'admin', true)
ON CONFLICT (phone) DO NOTHING;

-- 2. Insert Sample Borrowers
INSERT INTO borrowers (id, borrower_code, name, father_spouse_name, dob, mobile, alt_mobile, full_address, area_ward, pincode, aadhaar_last4)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'BOR-001', 'S. Murugesan (முருகேசன்)', 'Sundaram', '1985-05-12', '9842133333', '9842133334', '12/4 Bazaar Street, Ambur', 'Ward 4 - Bazaar', '635802', '4582'),
    ('22222222-2222-2222-2222-222222222222', 'BOR-002', 'K. Anbarasan (அன்பரசன்)', 'Krishnan', '1990-11-20', '9842144444', '9842144445', '45 Gandhi Nagar, Vaniyambadi', 'Ward 2 - Gandhi Nagar', '635751', '9123'),
    ('33333333-3333-3333-3333-333333333333', 'BOR-003', 'M. Saravanan (சரவணன்)', 'Mani', '1978-02-18', '9842155555', '9842155556', '78 Railway Feeder Road, Jolarpet', 'Ward 7 - Junction', '635851', '6734'),
    ('44444444-4444-4444-4444-444444444444', 'BOR-6057', 'Thilaga (திலகா)', 'Venkatesan', '1988-08-14', '9579477655', '9443210000', '15 Muthumari Amman Koil Street, Madhanur', 'Muthumari Nagar', '635804', '3838')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Guarantors
INSERT INTO guarantors (id, borrower_id, name, mobile, relation, address, id_last4, not_required)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'R. Velu', '9842199901', 'Brother', '14 Bazaar Street, Ambur', '1122', false),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'P. Natarajan', '9842199902', 'Uncle', '40 Gandhi Nagar, Vaniyambadi', '3344', false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Self-guaranteed', '', 'Self', 'Jolarpet', '6734', true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'S. Venkatesan', '9579477656', 'Spouse', 'Madhanur', '7788', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Loan 1: ACTIVE (LN-26-0001)
-- Principal: ₹20,000, Charge: ₹2,000, Disbursed: ₹18,000, Installment: ₹200 (100 days), Total: ₹20,000
-- Paid: ₹7,600, Outstanding: ₹12,400. Status: ACTIVE
INSERT INTO loans (
    id, loan_no, borrower_id, guarantor_id,
    principal, charge_amount, net_disbursed, total_payable, installment_amount,
    scheme, tenure, start_date, end_date, collection_agent_id, payment_mode,
    total_paid, outstanding, status, agreement_place
) VALUES (
    'aaaaaaaa-1111-4444-8888-000000000001', 'LN-26-0001',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    20000.00, 2000.00, 18000.00, 20000.00, 200.00,
    'daily', 100, CURRENT_DATE - INTERVAL '38 days', CURRENT_DATE + INTERVAL '62 days', 1, 'cash',
    7600.00, 12400.00, 'active', 'Ambur'
) ON CONFLICT (loan_no) DO NOTHING;

-- 5. Sample Loan 2: OVERDUE (LN-26-0002)
-- Principal: ₹30,000, Charge: ₹4,500, Disbursed: ₹25,500, Installment: ₹300 (100 days), Total: ₹30,000
-- Ended 15 days ago, Outstanding: ₹6,700 > 0. Status: OVERDUE, Accrued Late Fee
INSERT INTO loans (
    id, loan_no, borrower_id, guarantor_id,
    principal, charge_amount, net_disbursed, total_payable, installment_amount,
    scheme, tenure, start_date, end_date, collection_agent_id, payment_mode,
    total_paid, outstanding, overdue_days, late_fee_accrued, status, agreement_place
) VALUES (
    'bbbbbbbb-2222-4444-8888-000000000002', 'LN-26-0002',
    '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    30000.00, 4500.00, 25500.00, 30000.00, 300.00,
    'daily', 100, CURRENT_DATE - INTERVAL '115 days', CURRENT_DATE - INTERVAL '15 days', 2, 'cash',
    23300.00, 6700.00, 15, 750.00, 'overdue', 'Vaniyambadi'
) ON CONFLICT (loan_no) DO NOTHING;

-- 6. Sample Loan 3: COMPLETED (LN-26-0003)
-- Principal: ₹10,000, Charge: ₹1,500, Disbursed: ₹8,500, Installment: ₹100 (100 days), Total: ₹10,000
-- Paid: ₹10,000, Outstanding: ₹0. Status: COMPLETED
INSERT INTO loans (
    id, loan_no, borrower_id, guarantor_id,
    principal, charge_amount, net_disbursed, total_payable, installment_amount,
    scheme, tenure, start_date, end_date, collection_agent_id, payment_mode,
    total_paid, outstanding, status, agreement_place
) VALUES (
    'cccccccc-3333-4444-8888-000000000003', 'LN-26-0003',
    '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    10000.00, 1500.00, 8500.00, 10000.00, 100.00,
    'daily', 100, CURRENT_DATE - INTERVAL '130 days', CURRENT_DATE - INTERVAL '30 days', 1, 'upi',
    10000.00, 0.00, 'completed', 'Jolarpet'
) ON CONFLICT (loan_no) DO NOTHING;

-- 7. Sample Loan 4: User Sample Loan LN-D26-6057 (COMPLETED)
-- Principal: ₹20,000, Charge: ₹3,000, Disbursed: ₹17,000, Installment: ₹200 (100 days)
-- Paid: ₹20,000, Outstanding: ₹0. Status: COMPLETED
INSERT INTO loans (
    id, loan_no, borrower_id, guarantor_id,
    principal, charge_amount, net_disbursed, total_payable, installment_amount,
    scheme, tenure, start_date, end_date, collection_agent_id, payment_mode,
    total_paid, outstanding, status, agreement_place
) VALUES (
    'dddddddd-4444-4444-8888-000000006057', 'LN-D26-6057',
    '44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    20000.00, 3000.00, 17000.00, 20000.00, 200.00,
    'daily', 100, '2026-07-01', '2026-10-09', 1, 'cash',
    20000.00, 0.00, 'completed', 'Madhanur'
) ON CONFLICT (loan_no) DO NOTHING;

