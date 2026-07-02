-- Add discount type support to promotions
-- Supports both percentage (e.g. 10%) and fixed value (e.g. $5 Off)

alter table promotions
  add column if not exists discount_type     text check (discount_type in ('percentage', 'fixed_value')),
  add column if not exists discount_value    numeric(10, 2),
  add column if not exists discount_currency text default 'USD';

comment on column promotions.discount_type     is 'percentage or fixed_value';
comment on column promotions.discount_value    is 'The numeric value: 10 = 10% or $10';
comment on column promotions.discount_currency is 'Currency code for fixed_value discounts (USD, EUR, GBP...)';
