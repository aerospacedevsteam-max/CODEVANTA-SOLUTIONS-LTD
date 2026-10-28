-- Support email (codevantasolutions.com confirmed by the company).
update public.site_settings
   set setting_value = setting_value || jsonb_build_object('support_email', 'support@codevantasolutions.com')
 where setting_key = 'company';
