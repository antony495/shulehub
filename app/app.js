/* ShuleHub Web - student and parent portal (version 3, with PAY tab)
   Uses the same Firebase project as the Android app. Read-only for now. */

const firebaseConfig = {
  apiKey: "AIzaSyCvJp9KbTQW7YS63KoB7u4sys7g6KiBU1I",
  authDomain: "shulehub-27715.firebaseapp.com",
  projectId: "shulehub-27715",
  storageBucket: "shulehub-27715.firebasestorage.app",
  messagingSenderId: "127741742820",
  appId: "1:127741742820:web:875617db22f690011266f1"
};

const DEMO = new URLSearchParams(location.search).has("demo");
const root = document.getElementById("app");

/* ---------- small helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ksh = (n) => "KSh " + Math.round(Number(n) || 0).toLocaleString("en-KE");
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ms = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : num(v));
const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const monthKey = (date) => (/^\d{4}-\d{2}/.test(date || "") ? date.slice(0, 7) : "");
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
};

function friendlyAuthError(e) {
  const code = (e && e.code) || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") ||
      code.includes("user-not-found") || code.includes("invalid-email"))
    return "Wrong email or password. Please try again.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (code.includes("network"))
    return "No internet connection. Please check it and try again.";
  if (code.includes("unauthorized-domain"))
    return "This website address is not allowed yet. Ask ShuleHub support to add it.";
  return "Could not log in. Please try again.";
}

/* ---------- data layer (Firebase) ---------- */
async function makeFirebase() {
  const base = "https://www.gstatic.com/firebasejs/10.14.1/";
  const [appM, authM, fs] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-auth.js"),
    import(base + "firebase-firestore.js"),
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  const db = fs.getFirestore(app);

  const nameOf = async (path, field, fallback) => {
    try {
      const s = await fs.getDoc(fs.doc(db, ...path));
      return s.exists() ? (s.get(field) || fallback) : fallback;
    } catch (e) { return fallback; }
  };
  const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    onUser: (cb) => authM.onAuthStateChanged(auth, cb),
    signIn: (email, pw) => authM.signInWithEmailAndPassword(auth, email, pw),
    signOut: () => authM.signOut(auth),
    resetPassword: (email) => authM.sendPasswordResetEmail(auth, email),

    async getStudent(uid) {
      const s = await fs.getDoc(fs.doc(db, "students", uid));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
    async getParent(uid) {
      const s = await fs.getDoc(fs.doc(db, "parents", uid));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
    async getLinks(parentUid) {
      const q = fs.query(fs.collection(db, "parent_links"), fs.where("parentUid", "==", parentUid));
      return docs(await fs.getDocs(q));
    },
    institutionName: (id) => nameOf(["institutions", id], "name", ""),
    async getClassNames(st) {
      const { institutionId: i, programId: p, levelId: l, semesterId: s } = st;
      if (!i || !p) return {};
      const program = await nameOf(["institutions", i, "programs", p], "programName", "");
      const level = l ? await nameOf(["institutions", i, "programs", p, "levels", l], "levelName", "") : "";
      const semester = (l && s)
        ? await nameOf(["institutions", i, "programs", p, "levels", l, "semesters", s], "semesterName", "") : "";
      return { program, level, semester };
    },
    async getFees(sid) {
      return docs(await fs.getDocs(fs.collection(db, "students", sid, "fee_records")));
    },
    async getResults(sid) {
      return docs(await fs.getDocs(fs.collection(db, "students", sid, "results"))).filter((r) => r.published !== false);
    },
    // a student reads the class registers and keeps only the rows that include them
    async getStudentAttendance(st) {
      const q = fs.query(
        fs.collection(db, "attendance"),
        fs.where("institutionId", "==", st.institutionId || ""),
        fs.where("programId", "==", st.programId || ""),
        fs.where("levelId", "==", st.levelId || ""),
        fs.where("semesterId", "==", st.semesterId || "")
      );
      return docs(await fs.getDocs(q)).filter((a) => a.records && a.records[st.id]);
    },
    // a parent reads the child's own copy: students/{id}/attendance
    async getChildAttendance(sid) {
      return docs(await fs.getDocs(fs.collection(db, "students", sid, "attendance"))).map((r) => {
        const status = r.status || r.attendance || (r.records && r.records[sid]) ||
          (r.present === true ? "present" : r.present === false ? "absent" : "");
        return { ...r, records: { [sid]: status }, notes: { [sid]: r.note || r.notes?.[sid] || "" } };
      }).filter((r) => r.records[sid]);
    },
    async getTimetable(st) {
      const q = fs.query(
        fs.collection(db, "timetable_entries"),
        fs.where("institutionId", "==", st.institutionId || ""),
        fs.where("programId", "==", st.programId || ""),
        fs.where("levelId", "==", st.levelId || ""),
        fs.where("semesterId", "==", st.semesterId || "")
      );
      return docs(await fs.getDocs(q));
    },
    async getInstructions(institutionId) {
      try {
        const s = await fs.getDoc(fs.doc(db, "institutions", institutionId));
        const v = s.exists() ? s.get("paymentInstructions") : "";
        return typeof v === "string" ? v : "";
      } catch (e) { return ""; }
    },
    async getPayments(sid, parentUid, isParent) {
      const col = fs.collection(db, "payment_submissions");
      if (!isParent) return docs(await fs.getDocs(fs.query(col, fs.where("studentUid", "==", sid))));
      try {
        return docs(await fs.getDocs(fs.query(col, fs.where("studentUid", "==", sid))));
      } catch (e) {
        if (e.code !== "permission-denied") throw e;
        return docs(await fs.getDocs(fs.query(col, fs.where("parentUid", "==", parentUid))))
          .filter((r) => r.studentUid === sid);
      }
    },
    // the M-Pesa code is the document id, so sending the same code twice is refused by the rules
    submitPayment: (data) => fs.setDoc(fs.doc(db, "payment_submissions", data.mpesaCode), data),
  };
}

/* ---------- data layer (demo mode: sample data, no Firebase) ---------- */
function makeDemo() {
  let cb = null, role = "student";
  const demoPays = [
    { id: "QGH7K2LM9P", mpesaCode: "QGH7K2LM9P", amount: 12000, feeDescription: "Term 2 fees", status: "confirmed", createdAt: Date.now() - 20 * 864e5 },
    { id: "RTX4P0QW1Z", mpesaCode: "RTX4P0QW1Z", amount: 5000, feeDescription: "Term 3 fees", status: "rejected", rejectReason: "Code not found in school M-Pesa statement", createdAt: Date.now() - 5 * 864e5 },
  ];
  const now = Date.now();
  const kids = {
    c1: { id: "c1", fullName: "Brian Otieno (demo)", admission: "ADM-0231", institutionId: "i", programId: "p", levelId: "l", semesterId: "s",
          programName: "Secondary", levelName: "Form 2", semesterName: "Term 3" },
    c2: { id: "c2", fullName: "Faith Otieno (demo)", admission: "ADM-0310", institutionId: "i", programId: "p", levelId: "l2", semesterId: "s",
          programName: "Primary", levelName: "Grade 5", semesterName: "Term 3" },
    demo: { id: "demo", fullName: "Jane Wanjiru (demo)", email: "jane@example.com", admission: "ADM-0142", institutionId: "i", programId: "p",
          levelId: "l", semesterId: "s", programName: "Secondary", levelName: "Form 3", semesterName: "Term 3" },
  };
  return {
    onUser: (f) => { cb = f; setTimeout(() => f(null), 0); return () => {}; },
    signIn: async (email) => {
      role = /parent/i.test(email) ? "parent" : "student";
      setTimeout(() => cb && cb({ uid: role === "parent" ? "dp" : "demo", email }), 50);
    },
    signOut: async () => { cb && cb(null); },
    resetPassword: async () => {},
    getStudent: async (uid) => kids[uid] || null,
    getParent: async (uid) => (uid === "dp" ? { id: "dp", fullName: "Mrs Otieno (demo)", email: "parent@example.com", institutionId: "i", approved: true } : null),
    getLinks: async () => [
      { id: "dp_c1", studentUid: "c1", studentName: "Brian Otieno (demo)", admissionNumber: "ADM-0231" },
      { id: "dp_c2", studentUid: "c2", studentName: "Faith Otieno (demo)", admissionNumber: "ADM-0310" },
    ],
    institutionName: async () => "Mwangaza Secondary School",
    getClassNames: async () => ({}),
    getFees: async (sid) => [
      { id: "1", description: "Term 1 fees", amountDue: 25000, amountPaid: 25000, dueDate: "2026-01-20", createdAt: now - 9e9 },
      { id: "2", description: "Term 2 fees", amountDue: 25000, amountPaid: sid === "c2" ? 25000 : 12000, dueDate: "2026-05-05", createdAt: now - 6e9 },
      { id: "3", description: "Term 3 fees", amountDue: 25000, amountPaid: 0, dueDate: "2026-09-01", createdAt: now - 3e9 },
      { id: "4", description: "Trip to Nairobi", amountDue: 3500, amountPaid: 0, dueDate: "2027-02-01", createdAt: now - 1e9 },
    ],
    getResults: async () => [
      { id: "a", unitName: "Mathematics", unitCode: "MAT", marks: 78, totalMarks: 100, grade: "A-", feedback: "Very good work. Keep it up.", publishedAt: now - 2 * 864e5 },
      { id: "b", unitName: "English", marks: 64, totalMarks: 100, grade: "B", publishedAt: now - 30 * 864e5 },
      { id: "c", unitName: "Kiswahili", marks: 71, totalMarks: 100, grade: "B+", feedback: "Soma zaidi.", publishedAt: now - 30 * 864e5 },
    ],
    getStudentAttendance: async (st) => demoAtt(st.id),
    getChildAttendance: async (sid) => demoAtt(sid),
    getInstructions: async () => "Lipa na M-Pesa\nPaybill: 123456\nAccount number: the student's admission number\nThen type the M-Pesa code below.",
    getPayments: async () => demoPays.slice(),
    submitPayment: async (data) => {
      if (demoPays.some((p) => p.mpesaCode === data.mpesaCode)) { const e = new Error("dup"); e.code = "permission-denied"; throw e; }
      demoPays.push({ ...data, id: data.mpesaCode });
    },
    getTimetable: async () => {
      const t = (day, s, e, subject, room, teacherName) => ({ id: day + s, day, startTime: s, endTime: e, subject, room, teacherName });
      return [t(1, "08:00", "08:40", "Mathematics", "Room 4", "Mr Kamau"), t(1, "08:40", "09:20", "English", "Room 4", "Ms Achieng"),
        t(2, "08:00", "08:40", "Kiswahili", "Room 2", "Mrs Mwende"), t(3, "10:00", "10:40", "Chemistry", "Lab", "Mr Kiprop"),
        t(3, "08:00", "08:40", "Mathematics", "Room 4", "Mr Kamau"), t(5, "09:00", "09:40", "Games", "", "")];
    },
  };
  function demoAtt(sid) {
    const rows = [], statuses = ["present", "present", "late", "present", "absent", "present", "excused", "present"];
    statuses.forEach((s, i) => rows.push({ id: "m" + i, unitId: "u1", unitName: "Mathematics", unitCode: "MAT",
      date: "2026-11-" + String(20 - i * 2).padStart(2, "0"), records: { [sid]: s }, notes: i === 4 ? { [sid]: "Sick" } : {} }));
    ["present", "present", "absent"].forEach((s, i) => rows.push({ id: "e" + i, unitId: "u2", unitName: "English",
      date: "2026-10-" + String(25 - i * 3).padStart(2, "0"), records: { [sid]: s }, notes: {} }));
    return rows;
  }
}

/* ---------- state ---------- */
let api, user = null;
let role = "";           // "student" | "parent"
let parent = null;       // parent profile (parents only)
let children = [];       // links (parents only)
let subject = null;      // the student whose data is on screen (the student, or the chosen child)
let info = {};
let tab = "fees";
let attMonth = "all";
let cache = {};

/* ---------- login screen ---------- */
function showLogin(message, good) {
  root.innerHTML = `
  ${DEMO ? '<div class="demo">DEMO MODE: sample data only. Use an email containing "parent" for the parent view.</div>' : ""}
  <main class="login"><form class="login-card" id="loginForm" novalidate>
    <h1>ShuleHub</h1>
    <p class="tag">Your School, Your Learning, Your Future</p>
    <h3>Student or parent login</h3>
    <label for="em">Email</label>
    <input id="em" type="email" autocomplete="username" inputmode="email" required>
    <label for="pw">Password</label>
    <div class="field">
      <input id="pw" type="password" autocomplete="current-password" required>
      <button type="button" class="eye" id="eye" aria-label="Show or hide password">SHOW</button>
    </div>
    ${message ? `<p class="msg ${good ? "good" : ""}" role="alert">${esc(message)}</p>` : ""}
    <button class="btn" id="go" type="submit">LOG IN</button>
    <button class="linkbtn" type="button" id="forgot">Forgot password?</button>
    <p class="hint">Teachers and administrators: please use the ShuleHub app for now. Their web pages are coming soon.</p>
    <p class="hint"><a href="../privacy.html">Privacy policy</a> &middot; <a href="../index.html">About ShuleHub</a></p>
  </form></main>`;
  const em = document.getElementById("em"), pw = document.getElementById("pw");
  document.getElementById("eye").onclick = (e) => {
    const hidden = pw.type === "password";
    pw.type = hidden ? "text" : "password";
    e.currentTarget.textContent = hidden ? "HIDE" : "SHOW";
  };
  document.getElementById("forgot").onclick = async () => {
    const email = em.value.trim();
    if (!email) return showLogin("Type your email above first, then tap Forgot password.");
    try { await api.resetPassword(email); } catch (e) { /* do not reveal whether the email exists */ }
    showLogin("If that email has a ShuleHub account, a reset link has been sent. Check your inbox and spam folder.", true);
  };
  document.getElementById("loginForm").onsubmit = async (ev) => {
    ev.preventDefault();
    const email = em.value.trim(), pass = pw.value;
    if (!email || !pass) return showLogin("Please enter your email and password.");
    const go = document.getElementById("go");
    go.disabled = true; go.textContent = "Logging in…";
    try { await api.signIn(email, pass); }
    catch (e) { showLogin(friendlyAuthError(e)); }
  };
}

/* ---------- after login: work out who this is ---------- */
async function enter(u) {
  user = u; role = ""; parent = null; children = []; subject = null; info = {}; cache = {};
  root.innerHTML = '<p class="boot">Loading your account…</p>';
  try {
    const st = await api.getStudent(u.uid);
    if (st) {
      role = "student";
      await openSubject(st);
      return renderShell();
    }
    const p = await api.getParent(u.uid);
    if (p) {
      role = "parent";
      parent = p;
      if (p.approved !== true) return renderParentWaiting();
      children = await api.getLinks(u.uid);
      if (children.length === 1) {            // only one child: open it straight away
        await openChild(children[0]);
        return renderShell();
      }
      return renderParentHome();
    }
  } catch (e) {
    await api.signOut();
    return showLogin("We could not open your account. Please check your internet and try again.");
  }
  await api.signOut();
  showLogin("This website is for students and parents. Teachers and administrators: please use the ShuleHub app for now.");
}

async function openSubject(st) {
  subject = st; cache = {}; tab = "fees"; attMonth = "all";
  let names = { program: st.programName, level: st.levelName, semester: st.semesterName };
  if (!names.program && role === "student") {
    try { names = await api.getClassNames(st); } catch (e) { names = {}; }
  }
  let inst = "";
  try { inst = st.institutionId ? await api.institutionName(st.institutionId) : ""; } catch (e) { /* ignore */ }
  info = { institution: inst, ...names };
}

async function openChild(link) {
  const st = await api.getStudent(link.studentUid);
  if (!st) throw new Error("child not found");
  await openSubject({ ...st, id: link.studentUid });
}

/* ---------- parent screens ---------- */
function topBar(withBack) {
  return `
  ${DEMO ? '<div class="demo">DEMO MODE: sample data only</div>' : ""}
  <header class="top"><div class="wrap">
    <div><b>ShuleHub</b><div class="who">${esc(user.email || "")}</div></div>
    <div class="topbtns">${withBack ? '<button id="back">MY CHILDREN</button>' : ""}<button id="out">LOG OUT</button></div>
  </div></header>`;
}

function renderParentWaiting() {
  root.innerHTML = `${topBar(false)}<main class="wrap">
    <section class="hero"><h1>${esc(parent.fullName || "Parent")}</h1><p>Parent account</p></section>
    <div class="note">Your school has not confirmed a child for you yet. Open the ShuleHub app, go to <b>Add child</b>, and enter your child's admission number. When the school's administrator confirms it, your child will appear here.</div>
  </main>`;
  document.getElementById("out").onclick = () => api.signOut();
}

function renderParentHome() {
  root.innerHTML = `${topBar(false)}<main class="wrap">
    <section class="hero"><h1>${esc(parent.fullName || "Parent")}</h1><p>Parent dashboard</p></section>
    <h2>My children</h2>
    ${children.length ? children.map((c, i) => `
      <button class="card child" data-i="${i}"><div class="row"><div>
        <h3>${esc(c.studentName || "Child")}</h3>
        <div class="muted small">${c.admissionNumber ? "Adm: " + esc(c.admissionNumber) : ""}</div></div>
        <span class="chip info">OPEN</span></div></button>`).join("")
      : '<div class="empty">No child is linked to your account yet. Use the ShuleHub app to add a child.</div>'}
    <footer class="foot">ShuleHub Web shows your school records. Report payments on the PAY tab. &middot; <a href="../privacy.html">Privacy policy</a></footer>
  </main>`;
  document.getElementById("out").onclick = () => api.signOut();
  root.querySelectorAll(".child").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await openChild(children[Number(b.dataset.i)]); renderShell(); }
    catch (e) { b.disabled = false; alert("Could not open this child. Please try again."); }
  }));
}

/* ---------- shell shared by student and parent ---------- */
function renderShell() {
  const klass = [info.program, info.level, info.semester].filter(Boolean).join(" • ");
  const canGoBack = role === "parent" && children.length > 1;
  root.innerHTML = `${topBar(canGoBack)}
  <main class="wrap">
    <section class="hero">
      <h1>${esc(subject.fullName || "Student")}</h1>
      <p>${esc(info.institution || "")}${klass ? "<br>" + esc(klass) : ""}${subject.admission || subject.admissionNumber ? "<br>Adm: " + esc(subject.admission || subject.admissionNumber) : ""}</p>
    </section>
    <nav class="tabs" role="tablist" aria-label="Sections">
      ${[["fees", "FEES"], ["pay", "PAY"], ["results", "RESULTS"], ["attendance", "ATTENDANCE"], ["timetable", "TIMETABLE"]].map(([k, t]) =>
        `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === tab}">${t}</button>`).join("")}
    </nav>
    <div id="view"></div>
    <footer class="foot">ShuleHub Web shows your school records. Report payments on the PAY tab. &middot;
      <a href="../privacy.html">Privacy policy</a></footer>
  </main>`;
  document.getElementById("out").onclick = () => api.signOut();
  const back = document.getElementById("back");
  if (back) back.onclick = () => { subject = null; cache = {}; renderParentHome(); };
  root.querySelectorAll(".tab[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderShell(); }));
  renderView();
}

async function renderView() {
  const view = document.getElementById("view");
  view.innerHTML = '<p class="muted" style="margin-top:18px">Loading…</p>';
  const mine = tab, who = subject;
  try {
    let html;
    if (tab === "fees") {
      cache.fees ??= await api.getFees(who.id);
      html = feesHtml(cache.fees);
    } else if (tab === "results") {
      cache.results ??= await api.getResults(who.id);
      html = resultsHtml(cache.results);
    } else if (tab === "pay") {
      cache.fees ??= await api.getFees(who.id);
      cache.instr ??= await api.getInstructions(role === "parent" ? parent.institutionId : who.institutionId);
      try { cache.pays ??= await api.getPayments(who.id, user.uid, role === "parent"); }
      catch (e) { cache.pays = null; }
      html = payHtml(cache.fees, cache.instr, cache.pays);
    } else if (tab === "attendance") {
      cache.att ??= role === "parent" ? await api.getChildAttendance(who.id) : await api.getStudentAttendance(who);
      html = attendanceHtml(cache.att);
    } else {
      cache.tt ??= await api.getTimetable(who);
      html = timetableHtml(cache.tt);
    }
    if (mine !== tab || who !== subject) return;
    view.innerHTML = html;
    if (tab === "pay") wirePay(view);
    view.querySelectorAll("[data-month]").forEach((b) => (b.onclick = () => { attMonth = b.dataset.month; renderView(); }));
  } catch (e) {
    if (mine !== tab || who !== subject) return;
    const denied = e && e.code === "permission-denied";
    view.innerHTML = `<p class="msg" role="alert">${denied
      ? "You are not allowed to see this yet. Please try the ShuleHub app, or contact your school."
      : "Could not load this page. Please check your internet and try again."}</p>`;
  }
}

/* ---------- fees ---------- */
function feesHtml(list) {
  if (!list.length) return '<div class="empty">No fees have been recorded yet.</div>';
  const rows = list.map((f) => ({ ...f, due: num(f.amountDue ?? f.amount), paid: num(f.amountPaid) }))
    .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")) || ms(a.createdAt) - ms(b.createdAt));
  const billed = rows.reduce((s, r) => s + r.due, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const bal = billed - paid;
  const today = todayStr();
  const chip = (r) => {
    if (r.paid >= r.due && r.due > 0) return ["PAID", "ok"];
    if (r.dueDate && r.dueDate < today) return ["OVERDUE", "bad"];
    if (r.paid > 0) return ["PART PAID", "warn"];
    return ["UNPAID", "info"];
  };
  return `
  <div class="grid3">
    <div class="sum"><div class="k">TOTAL BILLED</div><div class="v">${ksh(billed)}</div></div>
    <div class="sum paid"><div class="k">TOTAL PAID</div><div class="v">${ksh(paid)}</div></div>
    <div class="sum ${bal < 0 ? "credit" : "bal"}"><div class="k">${bal < 0 ? "CREDIT (PAID IN ADVANCE)" : "BALANCE"}</div><div class="v">${ksh(Math.abs(bal))}</div></div>
  </div>
  <h2>Fee statement</h2>
  ${rows.map((r) => { const [t, c] = chip(r); return `
    <div class="card"><div class="row"><div><h3>${esc(r.description || "Fee")}</h3>
      <div class="muted small">Charged ${ksh(r.due)} &middot; Paid ${ksh(r.paid)}${r.dueDate ? " &middot; Due " + esc(r.dueDate) : ""}</div></div>
      <span class="chip ${c}">${t}</span></div></div>`; }).join("")}
  <p class="note">To pay, open the PAY tab. Send the money by M-Pesa as the school instructs, then report the M-Pesa code there. The school confirms it, and it shows here.</p>`;
}

/* ---------- results ---------- */
function resultsHtml(list) {
  if (!list.length) return '<div class="empty">No results have been published yet. Please check again later.</div>';
  const week = 7 * 864e5, nowMs = Date.now();
  const rows = [...list].sort((a, b) => (ms(b.publishedAt) || ms(b.createdAt)) - (ms(a.publishedAt) || ms(a.createdAt)));
  return `<h2>Results and grades</h2>` + rows.map((r) => {
    const name = r.unitName || r.subjectName || r.title || "Subject";
    const code = r.unitCode || r.subjectCode || "";
    const when = ms(r.publishedAt) || ms(r.createdAt);
    const isNew = when > 0 && nowMs - when < week;
    return `<div class="card"><div class="row"><div><h3>${esc(name)}${code ? " (" + esc(code) + ")" : ""}</h3>
      <div>Marks: ${esc(r.marks ?? "Not released")}${r.totalMarks != null ? " / " + esc(r.totalMarks) : ""} &middot; Grade: <b>${esc(r.grade ?? "Not released")}</b></div>
      ${r.feedback ? `<div class="muted small">Teacher feedback: ${esc(r.feedback)}</div>` : ""}</div>
      ${isNew ? '<span class="chip ok">NEW</span>' : ""}</div></div>`;
  }).join("");
}

/* ---------- attendance ---------- */
const statusLabel = (s) => ({ present: "Present", absent: "Absent", late: "Late", excused: "Excused" }[s] ||
  (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Absent"));

function summary(statuses) {
  const n = statuses.length;
  const c = (k) => statuses.filter((s) => s === k).length;
  const present = c("present");
  const pct = n ? Math.round((present * 100) / n) : 0;
  const extra = [c("late") && `Late ${c("late")}`, c("absent") && `Absent ${c("absent")}`, c("excused") && `Excused ${c("excused")}`]
    .filter(Boolean).join(" · ");
  return `Present ${present} of ${n} sessions (${pct}%)${extra ? " · " + extra : ""}`;
}

function attendanceHtml(all) {
  const id = subject.id;
  if (!all.length) return '<div class="empty">No attendance has been recorded yet.</div>';
  const sessions = [...all].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const months = [...new Set(sessions.map((s) => monthKey(s.date)).filter(Boolean))].sort().reverse();
  if (attMonth !== "all" && !months.includes(attMonth)) attMonth = "all";
  const shown = attMonth === "all" ? sessions : sessions.filter((s) => monthKey(s.date) === attMonth);
  const byUnit = new Map();
  shown.forEach((s) => { const k = s.unitId || s.unitName || "x"; byUnit.set(k, [...(byUnit.get(k) || []), s]); });

  const chips = [["all", "ALL"], ...months.map((m) => [m, monthLabel(m).toUpperCase()])]
    .map(([k, t]) => `<button class="tab" data-month="${esc(k)}" aria-selected="${k === attMonth}">${esc(t)}</button>`).join("");

  let html = `<div class="months">${chips}</div>
    <h2>${attMonth === "all" ? "All months" : esc(monthLabel(attMonth))}</h2>
    <div class="card"><b>Overall:</b> ${esc(summary(shown.map((s) => s.records[id])))}</div>`;

  if (attMonth === "all" && months.length) {
    html += `<h2>By month</h2>` + months.map((m) => `<div class="card"><b>${esc(monthLabel(m))}:</b> ${esc(summary(
      sessions.filter((s) => monthKey(s.date) === m).map((s) => s.records[id])))}</div>`).join("");
  }
  html += `<h2>By subject</h2>`;
  byUnit.forEach((list) => {
    const f = list[0];
    html += `<div class="card"><h3>${esc(f.unitName || "Subject")}${f.unitCode ? " (" + esc(f.unitCode) + ")" : ""}</h3>
      <div class="muted small">${esc(summary(list.map((s) => s.records[id])))}</div>
      ${list.slice(0, 5).map((s) => { const note = s.notes && s.notes[id];
        return `<div class="small">${esc(s.date)}: ${esc(statusLabel(s.records[id]))}${note ? " - " + esc(note) : ""}</div>`; }).join("")}</div>`;
  });
  return html;
}

/* ---------- timetable ---------- */
function timetableHtml(list) {
  if (!list.length) return '<div class="empty">No timetable has been set up for this class yet.</div>';
  const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const byDay = new Map();
  [...list].sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")))
    .forEach((e) => { const d = num(e.day); byDay.set(d, [...(byDay.get(d) || []), e]); });
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => `
    <h2>${esc(days[d] || "Day " + d)}</h2>` + byDay.get(d).map((e) => `
    <div class="card"><div class="row"><div><h3>${esc(e.subject || "Lesson")}</h3>
      <div class="muted small">${esc(e.room || "")}${e.room && e.teacherName ? " · " : ""}${esc(e.teacherName || "")}</div></div>
      <span class="chip info">${esc(e.startTime || "")}${e.endTime ? "–" + esc(e.endTime) : ""}</span></div></div>`).join("")).join("");
}

/* ---------- pay fees ---------- */
let payNotice = "";

function payHtml(fees, instr, pays) {
  const open = fees.map((f) => ({ ...f, due: num(f.amountDue ?? f.amount), paid: num(f.amountPaid) }))
    .map((r) => ({ ...r, bal: r.due - r.paid }))
    .filter((r) => r.bal > 0)
    .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")) || ms(a.createdAt) - ms(b.createdAt));
  const total = open.reduce((s, r) => s + r.bal, 0);
  const chipFor = { pending: ["WAITING", "warn"], confirmed: ["CONFIRMED", "ok"], rejected: ["REJECTED", "bad"] };

  const notice = payNotice ? `<p class="msg good" role="status">${esc(payNotice)}</p>` : "";
  payNotice = "";

  const how = `<h2>How to pay</h2><div class="card instr">${esc(instr || "Send the money by M-Pesa as your school instructs, then type the M-Pesa code below.")}</div>`;

  const form = open.length ? `
    <h2>Report your payment</h2>
    <form class="card" id="payForm" data-total="${total}" novalidate>
      <label for="payFee">Which fee are you paying?</label>
      <select id="payFee">${open.map((r) => `<option value="${esc(r.id)}" data-bal="${r.bal}" data-desc="${esc(r.description || "Fee")}">${esc(r.description || "Fee")} (balance ${esc(ksh(r.bal))})</option>`).join("")}</select>
      <label for="payAmt">Amount you sent (KSh)</label>
      <input id="payAmt" type="number" inputmode="decimal" min="1" max="1000000" step="any" value="${open[0].bal}">
      <div class="qbtns"><button type="button" class="tab" id="qThis">THIS FEE</button><button type="button" class="tab" id="qAll">ALL FEES (${esc(ksh(total))})</button></div>
      <p class="muted small">You can pay more than one fee at once. The extra goes to your next unpaid fees when the school confirms.</p>
      <label for="payCode">M-Pesa code</label>
      <input id="payCode" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="e.g. QGH7K2LM9P">
      <label for="payPhone">Phone number you paid from</label>
      <input id="payPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 0712345678">
      <p class="msg" id="payMsg" role="alert" hidden></p>
      <button class="btn" id="payGo" type="submit">SEND PAYMENT REPORT</button>
    </form>` : '<div class="empty">There are no unpaid fees to pay right now.</div>';

  let hist;
  if (pays === null) hist = '<p class="muted small">Your earlier payment reports could not be loaded.</p>';
  else if (!pays.length) hist = '<div class="empty">You have not reported any payment yet.</div>';
  else hist = [...pays].sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).map((p) => {
    const [t, c] = chipFor[p.status] || [String(p.status || "").toUpperCase(), "info"];
    const when = ms(p.createdAt) ? new Date(ms(p.createdAt)).toLocaleDateString("en-GB") : "";
    return `<div class="card"><div class="row"><div><h3>${esc(ksh(p.amount))} &middot; ${esc(p.mpesaCode || p.id)}</h3>
      <div class="muted small">${esc(p.feeDescription || "")}${when ? " &middot; " + esc(when) : ""}</div>
      ${p.status === "rejected" && p.rejectReason ? `<div class="small">Reason: ${esc(p.rejectReason)}</div>` : ""}</div>
      <span class="chip ${c}">${esc(t)}</span></div></div>`;
  }).join("");

  return `${notice}<div class="grid3"><div class="sum bal"><div class="k">TOTAL BALANCE</div><div class="v">${esc(ksh(total))}</div></div></div>
    ${how}${form}<h2>My payment reports</h2>${hist}`;
}

function wirePay(view) {
  const form = view.querySelector("#payForm");
  if (!form) return;
  const feeSel = form.querySelector("#payFee"), amt = form.querySelector("#payAmt");
  const code = form.querySelector("#payCode"), phoneEl = form.querySelector("#payPhone");
  const msg = form.querySelector("#payMsg"), go = form.querySelector("#payGo");
  const balOf = () => Number(feeSel.selectedOptions[0]?.dataset.bal || 0);
  const say = (t) => { msg.textContent = t; msg.hidden = false; };

  feeSel.onchange = () => { amt.value = balOf() || ""; };
  form.querySelector("#qThis").onclick = () => { amt.value = balOf() || ""; };
  form.querySelector("#qAll").onclick = () => { amt.value = Number(form.dataset.total) || ""; };
  code.oninput = () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    msg.hidden = true;
    const amount = Number(amt.value);
    const mcode = code.value.trim();
    const phone = phoneEl.value.replace(/[\s-]+/g, "");
    const feeId = feeSel.value;
    const feeDesc = feeSel.selectedOptions[0]?.dataset.desc || "";
    if (!feeId) return say("Please choose which fee you are paying.");
    if (!Number.isFinite(amount) || amount <= 0) return say("Please enter the amount you sent.");
    if (amount > 1000000) return say("The amount is too large. The most you can send in one payment is KSh 1,000,000.");
    if (!/^[A-Z0-9]{10}$/.test(mcode)) return say("The M-Pesa code must be 10 letters and numbers, for example QGH7K2LM9P.");
    if (!/^(\+?254|0)[17]\d{8}$/.test(phone)) return say("Please enter the phone number you paid from, for example 0712345678.");

    const data = {
      studentUid: subject.id,
      studentName: subject.fullName || "",
      admissionNumber: subject.admissionNumber || subject.admission || "",
      institutionId: role === "parent" ? parent.institutionId : subject.institutionId,
      feeId, feeDescription: feeDesc, amount, mpesaCode: mcode, phone,
      status: "pending", createdAt: Date.now(),
    };
    if (role === "parent") { data.parentUid = user.uid; data.parentName = parent.fullName || ""; }

    go.disabled = true; go.textContent = "Sending…";
    try {
      await api.submitPayment(data);
      payNotice = "Payment report sent. The school will confirm it, and then it shows in your fees.";
      delete cache.pays;
      renderView();
    } catch (e) {
      go.disabled = false; go.textContent = "SEND PAYMENT REPORT";
      if (e && e.code === "permission-denied")
        say("This M-Pesa code has already been submitted, or it was not accepted. Check the code, and check that your device's date and time are correct.");
      else say("Could not send. Please check your internet and try again.");
    }
  };
}

/* ---------- start ---------- */
(async function start() {
  try {
    api = DEMO ? makeDemo() : await makeFirebase();
  } catch (e) {
    root.innerHTML = '<p class="boot">Could not start. Please check your internet connection and reload the page.</p>';
    return;
  }
  api.onUser((u) => { if (u) enter(u); else { user = null; subject = null; showLogin(); } });
})();
