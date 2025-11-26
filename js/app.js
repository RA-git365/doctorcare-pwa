// DoctorCare PWA — app.js
// Hash-based SPA, mock localStorage DB, simple flows (patient login, view doctors, book appt, prescriptions, billing)

const App = (() => {
  const root = document.getElementById('app');

  // Simple mock DB stored in localStorage
  const DB_KEY = 'doctorcare_db_v1';
  const SESSION_KEY = 'doctorcare_session';

  function defaultData(){
    return {
      doctors: [
        { id: 'D1', name: 'Dr. Asha Rao', specialization: 'General Physician', clinic: 'City Clinic', availability: ['09:00','10:00','12:00'], fee: 300, email: 'asha@clinic' },
        { id: 'D2', name: 'Dr. Raj Kapoor', specialization: 'Pediatrics', clinic: 'Sunrise Kids', availability: ['10:30','13:00','15:00'], fee: 350, email: 'raj@kids' },
        { id: 'D3', name: 'Dr. Meera Iyer', specialization: 'Dermatology', clinic: 'SkinCare', availability: ['11:00','14:00','16:00'], fee: 400, email: 'meera@skin' }
      ],
      patients: [],
      appointments: [],
      prescriptions: [],
      bills: []
    };
  }

  function readDB(){
    const raw = localStorage.getItem(DB_KEY);
    if(!raw) {
      const def = defaultData();
      localStorage.setItem(DB_KEY, JSON.stringify(def));
      return def;
    }
    try { return JSON.parse(raw); }
    catch(e){ const def = defaultData(); localStorage.setItem(DB_KEY, JSON.stringify(def)); return def; }
  }
  function writeDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  function setSession(obj){ localStorage.setItem(SESSION_KEY, JSON.stringify(obj)); }
  function getSession(){ const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  // --- VIEWS ---
  function renderLanding(){
    root.innerHTML = '';
    const tpl = document.getElementById('tpl-landing').content.cloneNode(true);
    root.appendChild(tpl);
    document.getElementById('btn-doctor-login').addEventListener('click', () => location.hash = '#/doctor-login');
    document.getElementById('btn-patient-login').addEventListener('click', () => location.hash = '#/patient-login');
  }

  function renderDoctorLogin(){
    root.innerHTML = '';
    const tpl = document.getElementById('tpl-doctor-login').content.cloneNode(true);
    root.appendChild(tpl);
    const form = document.getElementById('doctor-login-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      alert('Demo doctor login — for production integrate backend.'); // placeholder
    });
    document.getElementById('btn-doctor-register').addEventListener('click', () => alert('Doctor registration flow — integrate later.'));
  }

  function renderPatientLogin(){
    root.innerHTML = '';
    const tpl = document.getElementById('tpl-patient-login').content.cloneNode(true);
    root.appendChild(tpl);
    const form = document.getElementById('patient-login-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.name.value.trim();
      const mobile = form.mobile.value.trim();
      if(!name || !mobile){ alert('Enter name & mobile'); return; }
      const db = readDB();
      // create or reuse patient
      let patient = db.patients.find(p => p.mobile === mobile);
      if(!patient){
        patient = { id: 'P' + (db.patients.length + 1), name, mobile, created: new Date().toISOString() };
        db.patients.push(patient);
        writeDB(db);
      }
      setSession({ type: 'patient', id: patient.id });
      location.hash = '#/patient-home';
    });
  }

  function renderPatientHome(){
    const session = getSession();
    if(!session || session.type !== 'patient'){ location.hash = '#/patient-login'; return; }

    root.innerHTML = '';
    const tpl = document.getElementById('tpl-patient-home').content.cloneNode(true);
    root.appendChild(tpl);

    const db = readDB();
    const patient = db.patients.find(p => p.id === session.id);

    document.getElementById('patient-welcome').textContent = `Welcome, ${patient.name}`;
    document.getElementById('patient-name').textContent = patient.name;
    document.getElementById('patient-id').textContent = patient.id;

    document.getElementById('btn-logout').addEventListener('click', () => {
      clearSession(); location.hash = '#/';
    });

    document.getElementById('btn-edit-profile').addEventListener('click', () => {
      const newName = prompt('Edit name', patient.name);
      if(newName){ patient.name = newName; writeDB(db); renderPatientHome(); }
    });

    // doctors list
    const dl = document.getElementById('doctors-list');
    dl.innerHTML = '';
    db.doctors.forEach(d => {
      const el = document.createElement('div'); el.className = 'item';
      el.innerHTML = `<div>
          <div><strong>${d.name}</strong></div>
          <div class="meta">${d.specialization} • ${d.clinic} • ₹${d.fee}</div>
        </div>
        <div class="actions">
          <button data-id="${d.id}" class="btn-book">Book</button>
        </div>`;
      dl.appendChild(el);
    });
    dl.querySelectorAll('.btn-book').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const docId = ev.currentTarget.dataset.id;
        openBookDialog(docId, patient.id);
      });
    });

    // appointments list
    const apList = document.getElementById('appointments-list');
    const appts = db.appointments.filter(a => a.patientId === patient.id);
    apList.innerHTML = '';
    if(appts.length === 0) apList.innerHTML = '<div class="meta">No upcoming appointments</div>';
    appts.forEach(a => {
      const doc = db.doctors.find(d => d.id === a.doctorId);
      const el = document.createElement('div'); el.className = 'item';
      el.innerHTML = `<div>
          <div><strong>${doc.name}</strong></div>
          <div class="meta">${a.date} • ${a.time}</div>
        </div>
        <div class="actions">
          <button data-id="${a.id}" class="btn-cancel">Cancel</button>
        </div>`;
      apList.appendChild(el);
    });
    apList.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        if(!confirm('Cancel appointment?')) return;
        const id = ev.currentTarget.dataset.id;
        const idx = db.appointments.findIndex(x => x.id === id);
        if(idx >= 0) { db.appointments.splice(idx,1); writeDB(db); renderPatientHome(); }
      });
    });

    // prescriptions list
    const prList = document.getElementById('prescriptions-list');
    const pres = db.prescriptions.filter(p => p.patientId === patient.id);
    prList.innerHTML = '';
    if(pres.length === 0) prList.innerHTML = '<div class="meta">No prescriptions</div>';
    pres.forEach(p => {
      const el = document.createElement('div'); el.className = 'item';
      el.innerHTML = `<div>
          <div><strong>${p.title || 'Prescription'}</strong></div>
          <div class="meta">${new Date(p.created).toLocaleDateString()}</div>
        </div>`;
      prList.appendChild(el);
    });

    // billing list
    const billList = document.getElementById('billing-list');
    const bills = db.bills.filter(b => b.patientId === patient.id);
    billList.innerHTML = '';
    if(bills.length === 0) billList.innerHTML = '<div class="meta">No bills</div>';
    bills.forEach(b => {
      const el = document.createElement('div'); el.className = 'item';
      el.innerHTML = `<div>
          <div><strong>Bill #${b.id}</strong></div>
          <div class="meta">₹${b.amount} • ${b.status}</div>
        </div>`;
      billList.appendChild(el);
    });

    // buttons
    document.getElementById('btn-book-appointment').addEventListener('click', () => {
      // show all doctors booking
      const docId = db.doctors[0].id;
      openBookDialog(docId, patient.id);
    });
    document.getElementById('btn-view-all-doctors').addEventListener('click', () => {
      alert('Doctor listing (demo). Use Book buttons to book.');
    });
  }

  function openBookDialog(doctorId, patientId){
    const db = readDB();
    const doc = db.doctors.find(d => d.id === doctorId);
    const time = prompt(`Book with ${doc.name}\nAvailable times: ${doc.availability.join(', ')}\nEnter time (e.g. ${doc.availability[0]})`);
    if(!time || !doc.availability.includes(time)) { alert('Invalid time'); return; }
    const date = prompt('Enter date (YYYY-MM-DD)', new Date().toISOString().slice(0,10));
    if(!date) return;
    // ensure one appointment per doctor per slot
    const clash = db.appointments.find(a => a.doctorId === doctorId && a.date === date && a.time === time);
    if(clash){ alert('Selected slot is taken. Choose another.'); return; }
    const ap = { id: 'A' + (db.appointments.length + 1), doctorId, patientId, date, time, created: new Date().toISOString() };
    db.appointments.push(ap);
    // create a bill
    const bill = { id: 'B' + (db.bills.length + 1), patientId, appointmentId: ap.id, amount: doc.fee, status: 'Pending', created: new Date().toISOString() };
    db.bills.push(bill);
    writeDB(db);
    alert('Appointment booked ✓');
    renderPatientHome();
  }

  // router
  function route(){
    const hash = location.hash || '#/';
    if(hash === '#/' || hash === '') renderLanding();
    else if(hash.startsWith('#/doctor-login')) renderDoctorLogin();
    else if(hash.startsWith('#/patient-login')) renderPatientLogin();
    else if(hash.startsWith('#/patient-home')) renderPatientHome();
    else renderLanding();
  }

  // init
  function init(){
    // ensure DB present
    readDB();
    window.addEventListener('hashchange', route);
    // show landing or redirect to session
    const session = getSession();
    if(session && session.type === 'patient') location.hash = '#/patient-home';
    else route();

    // install prompt hook (optional)
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // show a subtle toast / console guidance
      console.log('[PWA] Install available. Prompt will be shown on user action.');
      // optionally show prompt:
      // deferredPrompt.prompt();
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
