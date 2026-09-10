-- Shruti — demo seed. Run AFTER schema.sql and AFTER creating the demo user:
--   Authentication → Users → Add user → email doctor@shruti.demo,
--   password shruti-demo-2026, "Auto confirm user" on.
-- Safe to re-run: it wipes and recreates the demo clinic's rows.

do $$
declare
  v_user   uuid;
  v_clinic uuid := '11111111-1111-1111-1111-111111111111';
  p1 uuid := '00000000-0000-0000-0000-000000000001';
  p2 uuid := '00000000-0000-0000-0000-000000000002';
  p3 uuid := '00000000-0000-0000-0000-000000000003';
  p4 uuid := '00000000-0000-0000-0000-000000000004';
  p5 uuid := '00000000-0000-0000-0000-000000000005';
  p6 uuid := '00000000-0000-0000-0000-000000000006';
  p7 uuid := '00000000-0000-0000-0000-000000000007';
  p8 uuid := '00000000-0000-0000-0000-000000000008';
  c uuid;
  v_email text := 'doctor@shruti.demo';   -- ← change to the email you created, if different
begin
  select id into v_user from auth.users where email = v_email;
  -- Fresh project with exactly one user? Use that one, whatever its email.
  if v_user is null and (select count(*) from auth.users) = 1 then
    select id, email into v_user, v_email from auth.users limit 1;
  end if;
  if v_user is null then
    raise exception 'No auth user found for %. Create it under Authentication → Users → Add user, or set v_email at the top of this file.', v_email;
  end if;

  -- wipe
  delete from consultations where clinic_id = v_clinic;
  delete from patients where clinic_id = v_clinic;
  delete from profiles where id = v_user;
  delete from clinics where id = v_clinic;

  insert into clinics (id, name, code_prefix, patient_seq) values (v_clinic, 'Shruti Demo Clinic', 'SHR', 148);
  insert into profiles (id, clinic_id, full_name, qualification, reg_number, role)
    values (v_user, v_clinic, 'Dr. Anjali Rao', 'MBBS, MD (General Medicine)', 'KMC 48213', 'doctor');

  insert into patients (id, clinic_id, patient_code, full_name, age_years, gender, phone, address, blood_group, abha_number, allergies, preferred_language, consent_given, consent_at, created_at) values
    (p1, v_clinic, 'SHR-2026-0141', 'Sunita Devi',      46, 'female', '98450 12345', 'Jayanagar 4th Block, Bengaluru', 'B+',  '91-2345-6789-0123', '{}',                                   'hi', true, now() - interval '120 days', now() - interval '120 days'),
    (p2, v_clinic, 'SHR-2026-0142', 'Ramesh Kumar',     52, 'male',   '99000 23456', 'BTM Layout, Bengaluru',          'O+',  null, '{}',                                                  'hi', true, now() - interval '400 days', now() - interval '400 days'),
    (p3, v_clinic, 'SHR-2026-0143', 'Priya Nair',       29, 'female', '98860 34567', 'Koramangala, Bengaluru',         'A+',  null, '{}',                                                  'en', true, now() - interval '30 days',  now() - interval '30 days'),
    (p4, v_clinic, 'SHR-2026-0144', 'Mohammed Irfan',   34, 'male',   '97410 45678', 'Shivajinagar, Bengaluru',        'AB+', null, '{"Penicillin — urticaria","Sulpha drugs"}',           'hi', true, now() - interval '60 days',  now() - interval '60 days'),
    (p5, v_clinic, 'SHR-2026-0145', 'Lakshmi Iyer',     61, 'female', '98440 56789', 'Malleshwaram, Bengaluru',        'O-',  null, '{}',                                                  'ta', true, now() - interval '200 days', now() - interval '200 days'),
    (p6, v_clinic, 'SHR-2026-0146', 'Arjun Patil',       8, 'male',   '98220 67890', 'Rajajinagar, Bengaluru',         'B+',  null, '{"Peanuts"}',                                         'mr', true, now() - interval '14 days',  now() - interval '14 days'),
    (p7, v_clinic, 'SHR-2026-0147', 'Fatima Begum',     38, 'female', '98310 78901', 'Frazer Town, Bengaluru',         'A-',  null, '{}',                                                  'bn', true, now() - interval '5 days',   now() - interval '5 days'),
    (p8, v_clinic, 'SHR-2026-0148', 'Venkatesh Reddy',  45, 'male',   '99490 89012', 'HSR Layout, Bengaluru',          'O+',  null, '{}',                                                  'te', true, now() - interval '90 days',  now() - interval '90 days');

  -- ---- Sunita Devi: two signed visits ----
  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at, signed_at, is_locked, summary)
    values (gen_random_uuid(), v_clinic, p1, v_user, 'new', 'draft', 'Headache and giddiness for 2 weeks', 'hi', 88, now() - interval '95 days', now() - interval '95 days' + interval '21 minutes', false,
      E'PRESENTING COMPLAINT\nHeadache and giddiness for two weeks, worse in the mornings.\n\nHISTORY\nNo known diabetes or prior hospitalisation. Family history of hypertension (mother). Not on regular medication; no known drug allergies.\n\nEXAMINATION\nBP 156/98 mmHg, pulse 84 bpm, SpO₂ 98%, BMI 28.4. Cardiovascular and respiratory examination unremarkable.\n\nASSESSMENT AS DOCUMENTED\nDocumented provisional diagnosis: newly detected essential hypertension.\n\nPLAN\nSalt restriction and daily walking advised. FBS, lipid profile, RFT and ECG ordered. Review in two weeks with reports.')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content, source) values
    (c, 'chief_complaint', 'Headache and giddiness for 2 weeks, worse in the mornings.', 'doctor'),
    (c, 'hpi', 'Dull occipital headache most mornings for two weeks. Occasional giddiness on standing. No visual disturbance, no vomiting. Sleep reduced due to work stress.', 'ai_accepted'),
    (c, 'past_history', 'No known diabetes. No prior hospitalisation. Mother has hypertension.', 'ai_accepted'),
    (c, 'medications', 'Not on any regular medication. No known drug allergies.', 'doctor'),
    (c, 'examination', 'Alert, oriented. No pallor. CVS: S1 S2 normal, no murmur. RS: clear. Fundus not examined.', 'ai_edited'),
    (c, 'plan', 'Provisional: Essential hypertension, newly detected. Advised salt restriction, 30 min daily walk. Investigations: FBS, lipid profile, RFT, ECG. Review in 2 weeks with reports.', 'doctor');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, resp_rate, spo2_percent, height_cm, weight_kg) values (c, 156, 98, 84, 98.2, 16, 98, 158, 71);
  update consultations set status = 'signed', is_locked = true where id = c;

  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at, signed_at, is_locked, summary)
    values (gen_random_uuid(), v_clinic, p1, v_user, 'follow-up', 'draft', 'Follow-up with reports — hypertension', 'hi', 92, now() - interval '80 days', now() - interval '80 days' + interval '17 minutes', false,
      E'PRESENTING COMPLAINT\nFollow-up for hypertension with investigation reports.\n\nHISTORY\nHeadaches reduced with lifestyle changes; no giddiness this week. FBS 104 mg/dL, total cholesterol 218 mg/dL, creatinine 0.9 mg/dL, ECG within normal limits. Started Amlodipine 5 mg at night.\n\nEXAMINATION\nBP 148/92 mmHg, pulse 78 bpm, BMI 28.0. Cardiovascular and respiratory examination normal.\n\nASSESSMENT AS DOCUMENTED\nDocumented diagnosis: essential hypertension, Stage 1.\n\nPLAN\nContinue Amlodipine 5 mg once daily. Home BP monitoring twice daily. Review in four weeks.')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content, source) values
    (c, 'chief_complaint', 'Follow-up for hypertension with investigation reports.', 'doctor'),
    (c, 'hpi', 'Headaches reduced with lifestyle changes. No giddiness this week. Reports: FBS 104 mg/dL, total cholesterol 218 mg/dL, creatinine 0.9 mg/dL, ECG within normal limits.', 'ai_accepted'),
    (c, 'past_history', 'Newly detected hypertension (previous visit). Mother has hypertension.', 'doctor'),
    (c, 'medications', 'Started Tab. Amlodipine 5 mg once daily at night. No known drug allergies.', 'doctor'),
    (c, 'examination', 'BP 148/92 mmHg on repeat. CVS and RS normal.', 'ai_accepted'),
    (c, 'plan', 'Diagnosis: Essential hypertension, Stage 1. Continue Amlodipine 5 mg OD. Home BP monitoring twice daily. Review in 4 weeks.', 'doctor');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, resp_rate, spo2_percent, height_cm, weight_kg) values (c, 148, 92, 78, 98.4, 16, 98, 158, 70);
  update consultations set status = 'signed', is_locked = true where id = c;

  -- ---- Ramesh Kumar: three signed visits (diabetes) ----
  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at, signed_at, is_locked, summary)
    values (gen_random_uuid(), v_clinic, p2, v_user, 'new', 'draft', 'Increased thirst and frequent urination for 1 month', 'hi', 90, now() - interval '180 days', now() - interval '180 days' + interval '18 minutes', false,
      E'PRESENTING COMPLAINT\nIncreased thirst and frequent urination for one month.\n\nHISTORY\nPolyuria and polydipsia for one month, 3 kg weight loss. No fever. RBS at pharmacy 268 mg/dL. Father had diabetes.\n\nEXAMINATION\nBP 132/84 mmHg. Cardiovascular and respiratory examination normal. Foot sensation intact.\n\nPLAN\nProvisional: Type 2 diabetes mellitus. FBS, PPBS, HbA1c, lipid profile, RFT, urine routine ordered. Diet counselling given. Review in 1 week.')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content, source) values
    (c, 'chief_complaint', 'Increased thirst and frequent urination for 1 month.', 'doctor'),
    (c, 'hpi', 'Polyuria and polydipsia for one month, 3 kg weight loss. No fever. RBS at pharmacy 268 mg/dL.', 'ai_accepted'),
    (c, 'past_history', 'No prior chronic illness before this. Father had diabetes.', 'doctor'),
    (c, 'medications', 'None. No known drug allergies.', 'doctor'),
    (c, 'examination', 'No pallor, no pedal oedema. CVS and RS normal. Foot examination: sensation intact.', 'ai_accepted'),
    (c, 'plan', 'Provisional: Type 2 diabetes mellitus. Ordered FBS, PPBS, HbA1c, lipid profile, RFT, urine routine. Diet counselling given. Review in 1 week.', 'doctor');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, resp_rate, spo2_percent, height_cm, weight_kg) values (c, 132, 84, 76, 98.4, 15, 98, 170, 78);
  update consultations set status = 'signed', is_locked = true where id = c;

  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at, signed_at, is_locked, summary)
    values (gen_random_uuid(), v_clinic, p2, v_user, 'follow-up', 'draft', 'Diabetes — review with reports', 'hi', 90, now() - interval '172 days', now() - interval '172 days' + interval '18 minutes', false,
      E'PRESENTING COMPLAINT\nDiabetes — review with reports.\n\nHISTORY\nHbA1c 8.9%, FBS 186, PPBS 262. Symptoms unchanged. Father had diabetes.\n\nEXAMINATION\nBP 130/82 mmHg. Cardiovascular and respiratory examination normal.\n\nPLAN\nDiagnosis: Type 2 DM. Started Tab. Metformin 500 mg BD after food. Diet and 30 min walk daily. Review in 6 weeks.')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content, source) values
    (c, 'chief_complaint', 'Diabetes — review with reports.', 'doctor'),
    (c, 'hpi', 'HbA1c 8.9%, FBS 186, PPBS 262. Symptoms unchanged.', 'ai_accepted'),
    (c, 'past_history', 'No prior chronic illness before this. Father had diabetes.', 'doctor'),
    (c, 'medications', 'Tab. Metformin 500 mg BD. No known drug allergies.', 'doctor'),
    (c, 'examination', 'No pallor, no pedal oedema. CVS and RS normal. Foot examination: sensation intact.', 'ai_accepted'),
    (c, 'plan', 'Diagnosis: Type 2 DM. Started Tab. Metformin 500 mg BD after food. Diet and 30 min walk daily. Review in 6 weeks.', 'doctor');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, resp_rate, spo2_percent, height_cm, weight_kg) values (c, 130, 82, 76, 98.4, 15, 98, 170, 77);
  update consultations set status = 'signed', is_locked = true where id = c;

  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at, signed_at, is_locked, summary)
    values (gen_random_uuid(), v_clinic, p2, v_user, 'follow-up', 'draft', 'Diabetes follow-up', 'hi', 90, now() - interval '45 days', now() - interval '45 days' + interval '18 minutes', false,
      E'PRESENTING COMPLAINT\nDiabetes follow-up.\n\nHISTORY\nSymptoms resolved. HbA1c 7.2%. Tolerating Metformin, mild bloating initially, now settled.\n\nEXAMINATION\nBP 128/80 mmHg. Cardiovascular and respiratory examination normal. Foot sensation intact.\n\nPLAN\nGood control. Continue Metformin 500 mg BD. Annual eye and foot check advised. Review in 3 months with HbA1c.')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content, source) values
    (c, 'chief_complaint', 'Diabetes follow-up.', 'doctor'),
    (c, 'hpi', 'Symptoms resolved. HbA1c 7.2%. Tolerating Metformin, mild bloating initially, now settled.', 'ai_accepted'),
    (c, 'past_history', 'No prior chronic illness before this. Father had diabetes.', 'doctor'),
    (c, 'medications', 'Tab. Metformin 500 mg BD. No known drug allergies.', 'doctor'),
    (c, 'examination', 'No pallor, no pedal oedema. CVS and RS normal. Foot examination: sensation intact.', 'ai_accepted'),
    (c, 'plan', 'Good control. Continue Metformin 500 mg BD. Annual eye and foot check advised. Review in 3 months with HbA1c.', 'doctor');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, resp_rate, spo2_percent, height_cm, weight_kg) values (c, 128, 80, 76, 98.4, 15, 98, 170, 75);
  update consultations set status = 'signed', is_locked = true where id = c;

  -- ---- Mohammed Irfan: one signed visit (the allergy patient) ----
  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at, signed_at, is_locked, summary)
    values (gen_random_uuid(), v_clinic, p4, v_user, 'new', 'draft', 'Sore throat and fever for 3 days', 'hi', 85, now() - interval '40 days', now() - interval '40 days' + interval '14 minutes', false,
      E'PRESENTING COMPLAINT\nSore throat and fever for three days.\n\nHISTORY\nNo chronic illness. Documented allergy to penicillin (urticaria) and sulpha drugs.\n\nEXAMINATION\nTemperature 100.8°F, pulse 92 bpm. Congested throat with tonsillar exudate and tender cervical nodes. Chest clear.\n\nASSESSMENT AS DOCUMENTED\nDocumented provisional diagnosis: acute tonsillitis.\n\nPLAN\nAzithromycin 500 mg once daily for three days (penicillin avoided), Paracetamol as needed, warm saline gargles. Review if no improvement in three days.')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content, source) values
    (c, 'chief_complaint', 'Sore throat and fever for 3 days.', 'doctor'),
    (c, 'hpi', 'Fever up to 101°F with sore throat and painful swallowing for three days. No cough. No breathlessness.', 'ai_accepted'),
    (c, 'past_history', 'No chronic illness.', 'doctor'),
    (c, 'medications', 'ALLERGY: Penicillin (urticaria), sulpha drugs. Not on regular medication.', 'doctor'),
    (c, 'examination', 'Temp 100.8°F. Throat: congested, tonsils enlarged with exudate. Tender anterior cervical nodes. Chest clear.', 'ai_edited'),
    (c, 'plan', 'Provisional: Acute tonsillitis. Penicillin allergy noted — prescribed Tab. Azithromycin 500 mg OD × 3 days, Tab. Paracetamol 650 mg SOS. Warm saline gargles. Review if no improvement in 3 days.', 'doctor');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, resp_rate, spo2_percent, height_cm, weight_kg) values (c, 118, 76, 92, 100.8, 18, 98, 172, 68);
  update consultations set status = 'signed', is_locked = true where id = c;

  -- ---- Two drafts today so the dashboard queue is populated ----
  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at)
    values (gen_random_uuid(), v_clinic, p5, v_user, 'new', 'draft', 'Knee pain for 2 months', 'ta', 29, date_trunc('day', now()) + interval '9 hours 5 minutes')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content) values
    (c, 'chief_complaint', 'Pain in both knees for two months, worse on climbing stairs.'),
    (c, 'hpi', ''), (c, 'past_history', ''), (c, 'medications', ''), (c, 'examination', ''), (c, 'plan', '');
  insert into vitals (consultation_id, bp_systolic, bp_diastolic, pulse_bpm, temperature_f, height_cm, weight_kg) values (c, 134, 86, 80, 98.1, 152, 74);

  insert into consultations (id, clinic_id, patient_id, doctor_id, visit_type, status, chief_complaint, language_used, completeness_score, started_at)
    values (gen_random_uuid(), v_clinic, p6, v_user, 'follow-up', 'draft', 'Cough and cold', 'mr', 14, date_trunc('day', now()) + interval '9 hours 40 minutes')
    returning id into c;
  insert into case_sections (consultation_id, section_key, content) values
    (c, 'chief_complaint', 'Cough and running nose for 4 days.'),
    (c, 'hpi', ''), (c, 'past_history', ''), (c, 'medications', ''), (c, 'examination', ''), (c, 'plan', '');

  raise notice 'Seeded Shruti Demo Clinic for %', v_user;
end $$;
