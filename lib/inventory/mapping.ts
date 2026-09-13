/**
 * Permanent Adelaide-to-247 mapping identities. These UUIDs identify immutable
 * rows in 247's `adelaide_product_mappings` table; they are not product names
 * and are never sent to the browser. The one intentionally unmapped product
 * remains unavailable for online checkout.
 */
const mapping: Readonly<Record<string, string | null>> = {
  'ralson-rdr75-26570r195': 'af916d9c-4d63-30d0-c56f-5cfa433ef9a4',
  'ralson-rmr61-26570r195': '92160bcb-6b84-845b-3543-63f018207f9a',
  'ralson-rmr61-29580r225': '605b90ca-7297-3425-32da-ba5fb59328f2',
  'ralson-rdr75-29580r225': '65519635-d7ec-96c8-3de1-bcb033ccfb05',
  'ralson-rmr61-38565r225': '84a52bbb-5878-52b0-99c2-6258b52dc401',
  'ralson-rtr71-11r225': 'd0d5167c-3b29-7ecd-9897-6571f6422684',
  'ralson-rdr52-11r225': '73f51fd7-1c61-208b-1343-1b5f49b3b867',
  'ralson-rdr55-11r225': 'f02dc96d-1454-d4d5-ab3b-deb3902d1c64',
  'ralson-rdc66-11r225': '9e6d7e27-1f11-9d1b-92eb-cfa4a83d314d',
  'ralson-rac55-11r225': 'af8e0214-91d8-25df-4bc4-9ead40f7d352',
  'ralson-rdr75-23575r175': '350c9a86-6832-94ba-4448-65392aab8468',
  'ralson-rmr61-23575r175': 'ca21dd78-fef6-ccec-d2a8-cc18904fe274',
  'ralson-rmr61-27570r225': 'a7b97afa-05b2-0434-934e-6fc43e46f8e8',
  'greforce-hd02-11r225': 'b73b0c6a-d807-63c3-9cf0-94c23c45d6b8',
  'greforce-gr881w-11r225': 'fbdda1f3-f3af-e726-5d63-f6bb65de2872',
  'greforce-grd1919-11r225': '79f0d2f5-bcc6-4964-fa50-b7bbdee3a35a',
  'greforce-g-pilot-x1-29580r225': null,
  'greforce-grt33-95r175': 'cb00b3b0-8ad5-1b06-3380-8d68c999c7c5',
  'greforce-grt33-23575r175': '1a502a0c-0bd2-7d48-ef38-9de3119ac276',
  'jumbo-ss398-29580r225': '52de19dc-66c3-b74d-4d7d-26e16e62c970',
  'opartner-cp989-26570r195': 'd14d22ef-b256-8124-38f3-6bf2327420fe',
  'haulmax-att101-11r225': 'c663441f-eca8-c06c-f6b4-c396f3fd03d5',
  'haulmax-att101-27570r225': 'f69e566c-be24-0c15-9869-e2b28c68cd29',
  'haulmax-att420-29580r225': '193facc3-d3d4-9c7e-57da-cc6c8edaaf3a',
  'sailun-sfr22-38565r225': 'c2e16e17-ae26-5801-5466-1754188e7289',
};

export function inventoryMappingIdForProduct(id: string): string | null {
  return mapping[id] ?? null;
}

export const inventoryMappingSummary = { mapped: 24, unmatched: 1, ambiguous: 0 } as const;
