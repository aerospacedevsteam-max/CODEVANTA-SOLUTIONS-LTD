-- Registered company details (Companies House) shown in the footer, About,
-- Contact and legal pages. Support email is set separately once confirmed.
update public.site_settings
   set setting_value = setting_value || jsonb_build_object(
         'legal_name', 'CODEVANTA SOLUTIONS LTD',
         'registration_number', '17535159',
         'registered_office', 'Office 22003, 182-184 High Street North, East Ham, E6 2JA, United Kingdom',
         'country', 'England and Wales',
         'incorporated_on', '2026-10-22'
       )
 where setting_key = 'company';

-- Spreadsheet listings: keep the verified facts, drop the internal testing note.
update public.products
   set compatibility = array_remove(compatibility, 'Not yet manually tested in Excel, LibreOffice or Google Sheets')
 where 'Not yet manually tested in Excel, LibreOffice or Google Sheets' = any (compatibility);
