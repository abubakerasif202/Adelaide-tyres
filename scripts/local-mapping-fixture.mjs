import postgres from 'postgres';
import { catalogue } from '../lib/catalogue.ts';

// This rehearsal is intentionally fixed to the disposable local inventory DB.
// Every fixture is rolled back; catalogue prices are copied, stock is not seeded.
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:55332/postgres',{max:1});
let report;
const rollback = new Error('ROLLBACK_MAPPING_FIXTURE');
try {
  await sql.begin(async tx => {
    const [admin] = await tx`select user_id from public.user_profiles where role='admin' limit 1`;
    if (!admin) throw new Error('Local fixture Admin required');
    await tx`select set_config('request.jwt.claim.sub',${admin.user_id},true),set_config('request.jwt.claim.role','authenticated',true)`;
    const products = await tx`select * from public.adelaide_website_products order by website_product_id`;
    for (const item of products) {
      if (item.website_product_id === 'greforce-g-pilot-x1-29580r225') continue;
      const tyre=catalogue.find(tyre=>tyre.id===item.website_product_id);
      if (!tyre) throw new Error('Catalogue identity missing');
      const [created]=await tx`select public.create_product(
        p_name=>${`LOCAL MAPPING FIXTURE ${tyre.brand} ${tyre.pattern} ${tyre.size}`},
        p_category_code=>'truck_tyre',p_selling_price_incl_gst=>${tyre.price},
        p_tyre_condition=>'new',p_tyre_brand=>${tyre.brand},p_tyre_pattern=>${tyre.pattern},p_tyre_size=>${tyre.size}) as id`;
      await tx`select public.upsert_adelaide_product_mapping(${item.expected_mapping_id}::uuid,${item.website_product_id},${created.id}::uuid)`;
    }
    const failures=await tx`select external_order_reference from public.adelaide_integration_reconciliation() where discrepancy_type='product_mapping_invalid'`;
    report={scope:'rolled-back local catalogue fixture; not production verification',registered:products.length,valid:products.length-failures.length,unresolved:failures.map(row=>row.external_order_reference)};
    throw rollback;
  });
} catch(error) { if(error!==rollback) throw error; }
finally { await sql.end(); }
console.log(JSON.stringify(report,null,2));
if(report.valid!==24 || report.unresolved.length!==1 || report.unresolved[0]!=='greforce-g-pilot-x1-29580r225') process.exitCode=1;
