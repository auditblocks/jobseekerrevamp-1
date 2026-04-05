-- Add features column to flash_sale_config
ALTER TABLE public.flash_sale_config 
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT ARRAY[
  'Everything in PRO MAX',
  'Exclusive Beta Access',
  'Premium Support & Insights',
  'Legacy License Status',
  '5 Years of Continuous Value'
];
