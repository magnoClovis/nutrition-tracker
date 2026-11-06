const test = require('node:test');
const assert = require('node:assert/strict');

const loadModel = () => import('../../src/composite/local-reminder-model.js');
const loadRuntime = () => import('../../src/composite/local-reminders-runtime.js');

test('local reminders are opt-in and never use exact alarms or private progress', async () => {
  const {buildLocalReminderPlan} = await loadModel();
  const now = new Date(2026, 9, 11, 8, 0);
  assert.deepEqual(buildLocalReminderPlan({now}), []);
  const plan = buildLocalReminderPlan({
    now,
    preferences: {enabled: true, water: true, daily: true},
    waterState: {date: '2026-10-11', goal: 2500, intake: [{ml: 200}]},
    language: 'es',
  });
  assert.equal(plan.length, 8);
  assert.equal(plan.filter(item => item.extra.kind === 'water').length, 2);
  assert.ok(plan.every(item => item.isExactNotification === false));
  assert.ok(plan.every(item => !/2500|200|2026-10-11/.test(item.body + JSON.stringify(item.extra))));
  assert.ok(plan.some(item => item.body.includes('agua')));
});

test('water reminders use only a confirmed current day and stop at the goal', async () => {
  const {buildLocalReminderPlan} = await loadModel();
  const base = {now: new Date(2026, 9, 11, 10, 0), preferences: {enabled:true, water:true, daily:false}};
  assert.equal(buildLocalReminderPlan({...base, waterState:{date:'2026-10-10',goal:2500,intake:[]}}).length, 0);
  assert.equal(buildLocalReminderPlan({...base, waterState:{date:'2026-10-11',goal:2500,intake:[{ml:2500}]}}).length, 0);
  assert.equal(buildLocalReminderPlan({...base, waterState:{date:'2026-10-11',goal:2500,intake:[{ml:-1}]}}).length, 0);
  assert.equal(buildLocalReminderPlan({...base, waterState:{date:'2026-10-11',goal:2500,intake:[{ml:2000}]}}).length, 1);
});

test('civil-time quiet window, tomorrow horizon and invalid preferences are bounded', async () => {
  const {buildLocalReminderPlan, normalizeReminderPreferences} = await loadModel();
  assert.deepEqual(normalizeReminderPreferences({enabled:true,activeStart:'23:30',activeEnd:'02:00'}),
    {enabled:true,water:true,daily:false,activeStart:'09:00',activeEnd:'20:00'});
  const plan = buildLocalReminderPlan({
    now: new Date(2026, 9, 11, 22, 0),
    preferences: {enabled:true,water:true,daily:true,activeStart:'09:00',activeEnd:'20:00'},
    waterState: {date:'2026-10-11',goal:2500,intake:[]},
  });
  assert.equal(plan.length, 3);
  assert.ok(plan.every(item => item.schedule.at.getHours() >= 9 && item.schedule.at.getHours() < 20));
});

function fakePlugin({permission = 'granted'} = {}) {
  const calls = [];
  let pending = [{id:99,title:'Other app feature',schedule:{at:new Date(2026, 9, 12, 12, 0)}}];
  let delivered = [];
  return {
    calls,
    get pending() { return pending; },
    set delivered(value) { delivered = value; },
    async getPending() { return {notifications:pending}; },
    async getDeliveredNotifications() { return {notifications:delivered}; },
    async checkPermissions() { calls.push('check'); return {display:permission}; },
    async requestPermissions() { calls.push('request'); permission = 'granted'; return {display:permission}; },
    async createChannel() { calls.push('channel'); },
    async schedule({notifications}) { calls.push('schedule'); pending.push(...notifications); },
    async cancel({notifications}) { calls.push('cancel'); pending = pending.filter(item => !notifications.some(cancelled => cancelled.id === item.id)); },
    async removeDeliveredNotifications({notifications}) { calls.push('remove-delivered'); delivered = delivered.filter(item => !notifications.some(removed => removed.id === item.id)); },
    async addListener() { return {remove() {}}; },
  };
}

test('native reconciliation is idempotent and cancels only owned IDs', async () => {
  const {createLocalReminderRuntime} = await loadRuntime();
  const plugin = fakePlugin();
  const runtime = createLocalReminderRuntime({plugin,isNativeAndroid:()=>true,now:()=>new Date(2026,9,11,8,0)});
  const input = {uid:'account-1',preferences:{enabled:true,water:false,daily:true},language:'en'};
  assert.deepEqual(await runtime.reconcile(input), {status:'enabled',count:6});
  await runtime.reconcile(input);
  assert.equal(plugin.calls.filter(call => call === 'schedule').length, 1);
  plugin.delivered = [{id:2601010},{id:98}];
  await runtime.reconcile({...input,uid:null});
  assert.deepEqual(plugin.pending.map(item => item.id), [99]);
  assert.ok(plugin.calls.includes('remove-delivered'));
});

test('permission is requested only by an explicit opt-in action', async () => {
  const {createLocalReminderRuntime} = await loadRuntime();
  const plugin = fakePlugin({permission:'denied'});
  const runtime = createLocalReminderRuntime({plugin,isNativeAndroid:()=>true,now:()=>new Date(2026,9,11,9,0)});
  const input = {uid:'account-1',preferences:{enabled:true,water:false,daily:true}};
  assert.equal((await runtime.reconcile(input)).status, 'permission-denied');
  assert.equal(plugin.calls.includes('request'), false);
  assert.equal(await runtime.requestPermission(), true);
  assert.equal(plugin.calls.filter(call => call === 'request').length, 1);
  assert.equal((await runtime.reconcile(input)).status, 'enabled');
});

test('web runtime is inert and preferences remain per account', async () => {
  const {createLocalReminderRuntime,readLocalReminderPreferences,saveLocalReminderPreferences} = await loadRuntime();
  const plugin = fakePlugin();
  const runtime = createLocalReminderRuntime({plugin,isNativeAndroid:()=>false});
  const memory = new Map();
  const storage = {getItem:key=>memory.get(key) || null,setItem:(key,value)=>memory.set(key,value)};
  saveLocalReminderPreferences(storage,'a',{enabled:true,water:false,daily:true});
  assert.equal(readLocalReminderPreferences(storage,'a').enabled,true);
  assert.equal(readLocalReminderPreferences(storage,'b').enabled,false);
  assert.equal((await runtime.reconcile({uid:'a',preferences:{enabled:true}})).status,'unsupported');
  assert.equal(await runtime.requestPermission(),false);
  assert.deepEqual(plugin.calls,[]);
});
