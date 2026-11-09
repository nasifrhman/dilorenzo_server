const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  const athleteId = '6acc80dca1df2a2ed315c20e'; // Alex Thompson

  console.log('=== TEST 1: GET /api/v1/coach/players/:athleteId/videos ===');
  const res1 = await makeRequest({
    hostname: 'localhost',
    port: 8052,
    path: `/api/v1/coach/players/${athleteId}/videos`,
    method: 'GET',
  });
  console.log('Status:', res1.status);
  console.log('Athlete Header:', res1.body?.data?.athlete?.name, '|', res1.body?.data?.athlete?.tier, '|', res1.body?.data?.athlete?.day);
  console.log('Section Title:', res1.body?.data?.sectionTitle);
  console.log('Total Videos Count:', res1.body?.data?.totalVideos);
  console.log('Videos:', res1.body?.data?.videos?.map(v => ({
    title: v.title,
    phase: v.phase,
    duration: v.duration,
    xpBadge: v.xpBadge,
    instructor: v.instructor,
    employee: v.employee?.fullName,
    teachingPoints: v.teachingPoints,
    isAssigned: v.isAssigned,
  })));

  console.log('\n=== TEST 2: GET /api/v1/coach/players/:athleteId?tab=videos ===');
  const res2 = await makeRequest({
    hostname: 'localhost',
    port: 8052,
    path: `/api/v1/coach/players/${athleteId}?tab=videos`,
    method: 'GET',
  });
  console.log('Status:', res2.status);
  console.log('Active Tab:', res2.body?.data?.activeTab);

  console.log('\n=== TEST 3: GET /api/v1/user/mentorship/training-program ===');
  const res3 = await makeRequest({
    hostname: 'localhost',
    port: 8052,
    path: `/api/v1/user/mentorship/training-program?athleteId=${athleteId}`,
    method: 'GET',
  });
  console.log('Status:', res3.status);
  console.log('Header:', res3.body?.data?.title, '-', res3.body?.data?.subtitle);
  console.log('Summary:', res3.body?.data?.summary);
  console.log('Weeks:', res3.body?.data?.weeks?.map(w => ({
    week: w.weekLabel,
    drillCount: w.drills.length,
    drills: w.drills.map(d => ({ title: d.title, xp: d.xpText, isCompleted: d.isCompleted, buttons: d.buttons }))
  })));

  console.log('\n=== TEST 4: POST /api/v1/coach/players/:athleteId/assign-video (Due Date in Week 2) ===');
  // First video from library
  const firstVideo = res1.body?.data?.videos?.[0];
  const res4 = await makeRequest({
    hostname: 'localhost',
    port: 8052,
    path: `/api/v1/coach/players/${athleteId}/assign-video`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    drillId: firstVideo?._id,
    dueDate: '2026-11-05',
    notes: 'Focus on body shape before receiving',
  });
  console.log('Status:', res4.status);
  console.log('Assigned Video:', res4.body?.data?.title, '| Week:', res4.body?.data?.week, '| DueDate:', res4.body?.data?.dueDate);

  console.log('\n=== TEST 5: Complete Training Drill ===');
  const targetDrillId = res4.body?.data?._id;
  const res5 = await makeRequest({
    hostname: 'localhost',
    port: 8052,
    path: `/api/v1/user/mentorship/training-drill/${targetDrillId}/complete?athleteId=${athleteId}`,
    method: 'POST',
  });
  console.log('Status:', res5.status);
  console.log('Drill Complete Result:', res5.body?.data);

  console.log('\n=== TEST 6: Verify User Training Program Summary Updated ===');
  const res6 = await makeRequest({
    hostname: 'localhost',
    port: 8052,
    path: `/api/v1/user/mentorship/training-program?athleteId=${athleteId}`,
    method: 'GET',
  });
  console.log('Status:', res6.status);
  console.log('Updated Summary:', res6.body?.data?.summary);
}

runTests().catch(console.error);
