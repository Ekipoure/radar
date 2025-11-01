import pool from './lib/database';
import { 
  getAgentsWithMonitoringData, 
  getServersWithAdvancedStatus, 
  applyConsecutiveTimeoutLogic 
} from './lib/monitoring';
import { MonitoringData } from './lib/types';

async function testOfflineDetection() {
  console.log('🧪 شروع تست تشخیص آفلاین...\n');
  
  const client = await pool.connect();
  
  try {
    // Set timezone
    await client.query("SET timezone = 'Asia/Tehran'");
    
    // Get all active agents and servers
    const agentsResult = await client.query(`
      SELECT id, name, server_ip, status
      FROM agents
      WHERE is_active = true
      LIMIT 5
    `);
    
    const serversResult = await client.query(`
      SELECT id, name, ip_address, timeout_count
      FROM servers
      WHERE is_active = true
      LIMIT 5
    `);
    
    console.log(`📊 یافت شد: ${agentsResult.rows.length} ایجنت و ${serversResult.rows.length} سرور\n`);
    
    // Test 1: بررسی تشخیص آفلاین برای ایجنت‌ها
    console.log('═══════════════════════════════════════════════════════');
    console.log('تست 1: بررسی تشخیص آفلاین برای ایجنت‌ها');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const agents = await getAgentsWithMonitoringData(6);
    
    for (const agent of agents) {
      console.log(`📌 ایجنت: ${agent.name} (${agent.server_ip})`);
      console.log(`   وضعیت: ${agent.current_status}`);
      console.log(`   تعداد چک‌های موفق: ${agent.success_count}`);
      console.log(`   تعداد چک‌های ناموفق: ${agent.failed_count}`);
      console.log(`   تعداد کل چک‌های اخیر: ${agent.total_recent_checks}`);
      
      // بررسی منطق تشخیص آفلاین
      if (agent.total_recent_checks === 0) {
        console.log(`   ⚠️  هیچ داده مانیتورینگ اخیری وجود ندارد`);
      } else if (agent.current_status === 'inactive') {
        if (agent.failed_count === agent.total_recent_checks && agent.failed_count > 0) {
          console.log(`   ✅ تشخیص آفلاین صحیح است (همه چک‌ها ناموفق)`);
        } else {
          console.log(`   ❌ تشخیص آفلاین نامعتبر (لاجیک نادرست)`);
        }
      } else if (agent.current_status === 'active') {
        if (agent.success_count > 0) {
          console.log(`   ✅ تشخیص آنلاین صحیح است (حداقل یک چک موفق)`);
        } else {
          console.log(`   ❌ تشخیص آنلاین نامعتبر (هیچ چک موفقی وجود ندارد)`);
        }
      }
      console.log('');
    }
    
    // Test 2: بررسی تشخیص آفلاین برای سرورها
    console.log('═══════════════════════════════════════════════════════');
    console.log('تست 2: بررسی تشخیص آفلاین برای سرورها');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const servers = await getServersWithAdvancedStatus();
    
    for (const server of servers) {
      console.log(`📌 سرور: ${server.name} (${server.ip_address})`);
      console.log(`   وضعیت: ${server.current_status}`);
      console.log(`   timeout_count تنظیم شده: ${server.timeout_count || 3}`);
      console.log(`   تعداد چک‌های موفق: ${server.success_count || 0}`);
      console.log(`   تعداد چک‌های ناموفق: ${server.failed_count || 0}`);
      console.log(`   تعداد کل چک‌های اخیر: ${server.total_count || 0}`);
      console.log(`   آخرین چک: ${server.last_checked || 'بدون داده'}`);
      
      // بررسی منطق تشخیص آفلاین
      if (!server.last_checked) {
        console.log(`   ⚠️  هیچ داده مانیتورینگ اخیری وجود ندارد`);
      } else if (server.current_status === 'inactive') {
        const failedCount = server.failed_count ?? 0;
        const totalCount = server.total_count ?? 0;
        if (failedCount === totalCount && failedCount > 0) {
          console.log(`   ✅ تشخیص آفلاین صحیح است (همه چک‌ها ناموفق)`);
        } else {
          console.log(`   ❌ تشخیص آفلاین نامعتبر (لاجیک نادرست)`);
        }
      } else if (server.current_status === 'active') {
        const successCount = server.success_count ?? 0;
        if (successCount > 0) {
          console.log(`   ✅ تشخیص آنلاین صحیح است (حداقل یک چک موفق)`);
        } else {
          console.log(`   ⚠️  وضعیت active اما هیچ چک موفقی وجود ندارد`);
        }
      } else if (server.current_status === 'down') {
        console.log(`   ✅ سرور به عنوان down تشخیص داده شده است`);
      }
      console.log('');
    }
    
    // Test 3: تست منطق consecutive timeout
    console.log('═══════════════════════════════════════════════════════');
    console.log('تست 3: بررسی منطق consecutive timeout');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (servers.length > 0) {
      const testServer = servers[0];
      const serverId = testServer.id;
      const timeoutCount = testServer.timeout_count || 3;
      
      console.log(`🔍 بررسی سرور: ${testServer.name}`);
      console.log(`   Timeout Count: ${timeoutCount}\n`);
      
      // گرفتن داده‌های مانیتورینگ خام
      const rawDataResult = await client.query(`
        SELECT id, server_id, status, checked_at
        FROM monitoring_data
        WHERE server_id = $1
        ORDER BY checked_at DESC
        LIMIT 20
      `, [serverId]);
      
      if (rawDataResult.rows.length > 0) {
        // اعمال منطق consecutive timeout
        const processedData = applyConsecutiveTimeoutLogic(
          [...rawDataResult.rows].reverse() as MonitoringData[],
          timeoutCount
        );
        
        console.log(`   آخرین ${Math.min(10, rawDataResult.rows.length)} رکورد:`);
        console.log(`   ┌──────────┬──────────────┬─────────────────────┬──────────────┐`);
        console.log(`   │ Index    │ Status (Raw) │ Status (Processed)  │ Time         │`);
        console.log(`   ├──────────┼──────────────┼─────────────────────┼──────────────┤`);
        
        const displayData = processedData.slice(-10);
        displayData.forEach((row, idx) => {
          const originalIdx = processedData.length - displayData.length + idx;
          const rawStatus = rawDataResult.rows[rawDataResult.rows.length - originalIdx - 1]?.status || 'N/A';
          const processedStatus = row.status;
          const time = new Date(row.checked_at).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
          const marker = rawStatus !== processedStatus ? '✨' : '  ';
          
          console.log(`   │ ${String(originalIdx).padStart(8)} │ ${String(rawStatus).padEnd(12)} │ ${String(processedStatus).padEnd(19)} │ ${time.padEnd(12)} │ ${marker}`);
        });
        console.log(`   └──────────┴──────────────┴─────────────────────┴──────────────┘`);
        
        // بررسی تغییرات
        const changedCount = processedData.filter((row, idx) => {
          const originalRow = [...rawDataResult.rows].reverse()[idx];
          return originalRow && originalRow.status !== row.status;
        }).length;
        
        if (changedCount > 0) {
          console.log(`\n   ✅ ${changedCount} رکورد بر اساس منطق consecutive timeout تغییر کرد`);
          
          // نمایش تغییرات
          processedData.forEach((row, idx) => {
            const originalRow = [...rawDataResult.rows].reverse()[idx];
            if (originalRow && originalRow.status !== row.status) {
              console.log(`   📝 تغییر: ${originalRow.status} → ${row.status} (بعد از ${timeoutCount} timeout متوالی)`);
            }
          });
        } else {
          console.log(`\n   ℹ️  هیچ تغییری اعمال نشد (شرایط consecutive timeout برقرار نبود)`);
        }
      } else {
        console.log(`   ⚠️  هیچ داده مانیتورینگی برای این سرور وجود ندارد`);
      }
    }
    
    // Test 4: تست سناریوی آفلاین با داده تستی
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('تست 4: سناریوی آفلاین با داده تستی');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (servers.length > 0 && agents.length > 0) {
      const testServer = servers[0];
      const testAgent = agents[0];
      
      console.log(`📝 ایجاد داده تستی برای:`);
      console.log(`   سرور: ${testServer.name} (ID: ${testServer.id})`);
      console.log(`   ایجنت: ${testAgent.name} (IP: ${testAgent.server_ip})`);
      console.log(`   Timeout Count: ${testServer.timeout_count || 3}\n`);
      
      // پاک کردن داده‌های قبلی تستی برای این سرور و ایجنت
      await client.query(
        `DELETE FROM monitoring_data 
         WHERE server_id = $1 
         AND source_ip = $2 
         AND checked_at > NOW() - INTERVAL '2 hours'`,
        [testServer.id, testAgent.server_ip]
      );
      
      // ایجاد timeout_count timeout متوالی (با زمان‌های گذشته)
      const timeoutCount = testServer.timeout_count || 3;
      console.log(`   1️⃣  ایجاد ${timeoutCount} timeout متوالی...`);
      for (let i = 0; i < timeoutCount; i++) {
        await client.query(
          `INSERT INTO monitoring_data (server_id, source_ip, status, checked_at)
           VALUES ($1, $2, $3, NOW() - INTERVAL '${(timeoutCount - i) * 2} minutes')`,
          [testServer.id, testAgent.server_ip, 'timeout']
        );
      }
      
      // ایجاد یک رکورد timeout بعدی که باید به 'down' تبدیل شود
      console.log(`   2️⃣  ایجاد رکورد timeout بعدی (باید به 'down' تبدیل شود)...`);
      await client.query(
        `INSERT INTO monitoring_data (server_id, source_ip, status, checked_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '1 minute')`,
        [testServer.id, testAgent.server_ip, 'timeout']
      );
      
      // بررسی وضعیت بعد از اعمال منطق
      const testDataResult = await client.query(`
        SELECT id, server_id, status, checked_at
        FROM monitoring_data
        WHERE server_id = $1
          AND source_ip = $2
          AND checked_at > NOW() - INTERVAL '2 hours'
        ORDER BY checked_at ASC
        LIMIT 20
      `, [testServer.id, testAgent.server_ip]);
      
      const rawLastStatus = testDataResult.rows[testDataResult.rows.length - 1]?.status;
      
      const processedTestData = applyConsecutiveTimeoutLogic(
        testDataResult.rows as MonitoringData[],
        timeoutCount
      );
      
      const lastProcessed = processedTestData[processedTestData.length - 1];
      console.log(`\n   📊 نتایج:`);
      console.log(`      تعداد رکوردهای تستی: ${testDataResult.rows.length}`);
      console.log(`      آخرین رکورد خام: ${rawLastStatus}`);
      console.log(`      آخرین رکورد پردازش شده: ${lastProcessed?.status}`);
      console.log(`      Timeout Count تنظیم شده: ${timeoutCount}`);
      
      if (lastProcessed?.status === 'down' && rawLastStatus === 'timeout') {
        console.log(`      ✅ منطق consecutive timeout صحیح کار کرد! رکورد timeout به 'down' تغییر کرد`);
      } else if (lastProcessed?.status === 'down' && rawLastStatus === 'down') {
        console.log(`      ⚠️  رکورد قبلاً 'down' بود (ممکن است منطق قبلاً اعمال شده باشد)`);
      } else {
        console.log(`      ❌ منطق consecutive timeout کار نکرد. انتظار 'down' بود اما ${lastProcessed?.status} دریافت شد`);
        console.log(`      بررسی: تعداد timeoutهای متوالی قبل از آخرین رکورد باید ${timeoutCount} باشد`);
      }
      
      // پاک کردن داده‌های تستی
      console.log(`\n   🧹 در حال پاک کردن داده‌های تستی...`);
      await client.query(
        `DELETE FROM monitoring_data 
         WHERE server_id = $1 
         AND source_ip = $2 
         AND checked_at > NOW() - INTERVAL '2 hours'`,
        [testServer.id, testAgent.server_ip]
      );
      console.log(`      ✅ داده‌های تستی پاک شدند`);
    }
    
    // خلاصه نتایج
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 خلاصه نتایج');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const inactiveAgents = agents.filter(a => a.current_status === 'inactive').length;
    const activeAgents = agents.filter(a => a.current_status === 'active').length;
    const inactiveServers = servers.filter(s => s.current_status === 'inactive').length;
    const activeServers = servers.filter(s => s.current_status === 'active').length;
    const downServers = servers.filter(s => s.current_status === 'down').length;
    
    console.log(`ایجنت‌ها:`);
    console.log(`   ✅ آنلاین: ${activeAgents}`);
    console.log(`   ❌ آفلاین: ${inactiveAgents}`);
    console.log(`   ❓ نامشخص: ${agents.length - activeAgents - inactiveAgents}`);
    console.log(`\nسرورها:`);
    console.log(`   ✅ آنلاین: ${activeServers}`);
    console.log(`   ❌ آفلاین: ${inactiveServers}`);
    console.log(`   🔴 Down: ${downServers}`);
    console.log(`   ❓ نامشخص: ${servers.length - activeServers - inactiveServers - downServers}`);
    
    console.log('\n✅ تست‌ها با موفقیت انجام شد!\n');
    
  } catch (error) {
    console.error('❌ خطا در تست:', error);
    throw error;
  } finally {
    client.release();
  }
}

// اجرای تست
if (require.main === module) {
  testOfflineDetection()
    .then(() => {
      console.log('✅ تست کامل شد');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ تست با خطا مواجه شد:', error);
      process.exit(1);
    });
}

export { testOfflineDetection };

