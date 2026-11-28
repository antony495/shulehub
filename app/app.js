/* ShuleHub Web - student and parent portal (version 18, results carry the subject id)
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

/* ---------- wording for each kind of institution (same as the Android app) ----------
   A university says Lecturer / Unit / Semester / Year / Course; a primary school says
   Pupil / Grade / Head teacher; and so on. Words the owner typed for the institution win. */
const TYPE_WORDS = {
  university: { teacher: "Lecturer", unit: "Unit", semester: "Semester", level: "Year", program: "Course", student: "Student", school: "university", head: "Dean", admission: "registration number", admissionShort: "reg no" },
  college:    { teacher: "Trainer",  unit: "Unit", semester: "Term", level: "Level", program: "Course", student: "Student", school: "college", head: "Principal", admission: "admission number", admissionShort: "admission no" },
  secondary:  { teacher: "Teacher",  unit: "Subject", semester: "Term", level: "Form", program: "Section", student: "Student", school: "school", head: "Principal", admission: "admission number", admissionShort: "admission no" },
  primary:    { teacher: "Teacher",  unit: "Subject", semester: "Term", level: "Grade", program: "Section", student: "Pupil", school: "school", head: "Head teacher", admission: "admission number", admissionShort: "admission no" },
  other:      { teacher: "Teacher",  unit: "Subject", semester: "Term", level: "Level", program: "Program", student: "Student", school: "institution", head: "Principal", admission: "admission number", admissionShort: "admission no" },
};
const pluralOf = (w) => /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + "ies" : /(s|x|ch|sh)$/i.test(w) ? w + "es" : w + "s";
let termRules = null;

function setTerms(inst) {
  termRules = null;
  if (!inst) return;
  const d = TYPE_WORDS[inst.type] || TYPE_WORDS.other;
  const w = (field, def) => (typeof inst[field] === "string" && inst[field].trim()) ? inst[field].trim() : def;
  const teacher = w("wordTeacher", d.teacher), unit = w("wordUnit", d.unit), semester = w("wordSemester", d.semester);
  const level = w("wordLevel", d.level), program = w("wordProgram", d.program), student = w("wordStudent", d.student);
  const school = w("wordInstitution", d.school);
  const plural = (field, word) => (typeof inst[field] === "string" && inst[field].trim()) ? pluralOf(word) : (word === d.head ? pluralOf(word) : pluralOf(word));
  const map = {};
  const put = (a, b, toA, toB) => {
    if (a.toLowerCase() !== toA.toLowerCase()) map[a] = toA;
    if (b.toLowerCase() !== toB.toLowerCase()) map[b] = toB;
  };
  put("teacher", "teachers", teacher, pluralOf(teacher));
  put("subject", "subjects", unit, pluralOf(unit));
  put("term", "terms", semester, pluralOf(semester));
  put("level", "levels", level, pluralOf(level));
  put("program", "programs", program, pluralOf(program));
  put("programme", "programmes", program, pluralOf(program));
  put("student", "students", student, pluralOf(student));
  put("school", "schools", school, pluralOf(school));
  put("institution", "institutions", school, pluralOf(school));
  put("principal", "principals", d.head, pluralOf(d.head));
  put("admission number", "admission numbers", d.admission, pluralOf(d.admission));
  put("admission no", "admission no", d.admissionShort, d.admissionShort);
  const keys = Object.keys(map);
  if (!keys.length) return;
  keys.sort((a, b) => b.length - a.length);
  const protectedPhrases = "(?:secondary|primary|junior|senior|high|nursery|boarding|special)\\s+schools?\\b|terms?\\s+(?:and|of)\\b|(?:long|short)[- ]term|subject\\s+to|(?:access|permission|grade|battery|log)\\s+level|term\\s+and\\s+condition";
  const esc2 = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  termRules = {
    map,
    re: new RegExp("(" + protectedPhrases + ")|\\b(" + keys.map(esc2).join("|") + ")\\b", "gi"),
  };
}

function shapeWord(src, target) {
  if (src.length > 1 && src === src.toUpperCase()) return target.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return target[0].toUpperCase() + target.slice(1);
  return target.toLowerCase();
}

function applyTermsTo(s) {
  if (!termRules || s.length < 3) return s;
  let out = s.replace(termRules.re, (m, prot, word) => prot ? m : shapeWord(word, termRules.map[word.toLowerCase()] || word));
  if (out !== s) {
    out = out.replace(/\b([Aa]n?)(\s+)(\w+)/g, (m, a, sp, w) => {
      const targets = Object.values(termRules.map).map((t) => t.toLowerCase());
      if (!targets.some((t) => t.startsWith(w.toLowerCase()) && t.split(" ")[0] === w.toLowerCase())) return m;
      const lw = w.toLowerCase();
      const vowel = "aeio".includes(lw[0]) || (lw[0] === "u" && !lw.startsWith("uni"));
      const art = vowel ? "an" : "a";
      return (a[0] === "A" ? art[0].toUpperCase() + art.slice(1) : art) + sp + w;
    });
    out = out.replace(/\b1 (students|pupils|units|subjects|lecturers|teachers|trainers|courses|semesters|terms|payments|results|sessions|lessons)\b/gi, (m, w) => "1 " + w.slice(0, -1));
  }
  return out;
}


/* ---------- Kiswahili ---------- */
let LANG = "en";
try { LANG = localStorage.getItem("shulehub_lang") === "sw" ? "sw" : "en"; } catch (e) {}
document.documentElement.lang = LANG;

// longest and most specific first; plain strings match whole words, ignoring case
const SW_PHRASES = [
  [/Attendance saved: (\d+) of (\d+) attended, (\d+) absent\./g, "Mahudhurio yamehifadhiwa: $1 kati ya $2 wamehudhuria, $3 hawapo."],
  [/Saved marks for (\d+) students? \((.+?)\)\. Grades came from your (?:school|university|college|institution)'s grading scale\./g, "Alama za wanafunzi $1 zimehifadhiwa ($2). Madaraja yametoka kwenye vipimo vya alama vya shule yako."],
  [/Check the marks for (.+?)\. They must be a number from 0 to (\d+)\./g, "Angalia alama za $1. Lazima ziwe nambari kuanzia 0 hadi $2."],
  [/^Marks$/g, "Alama"],
  [/Present (\d+) of (\d+) sessions/g, "Amehudhuria $1 kati ya $2 vipindi"],
  [/\b(?:Term|Semester) (\d+) fees\b/gi, "Ada ya Muhula $1"],
  [/\bTerm (\d+)\b/gi, "Muhula $1"], [/\bSemester (\d+)\b/gi, "Muhula $1"],
  [/\bForm (\d+)\b/gi, "Kidato $1"], [/\bGrade (\d+)\b/gi, "Darasa la $1"], [/\bYear (\d+)\b/gi, "Mwaka wa $1"],
  [/(\d+) out of (\d+)/g, "$1 kati ya $2"],
  ["Administrators: please use the ShuleHub app for now. Their web pages are coming soon.", "Walimu na wasimamizi: tafadhali tumia programu ya ShuleHub kwa sasa. Kurasa zao za wavuti zinakuja hivi karibuni."],
  ["This website is for students, parents, teachers and administrators.", "Tovuti hii ni ya wanafunzi na wazazi. Walimu na wasimamizi: tafadhali tumia programu ya ShuleHub kwa sasa."],
  ["Your School, Your Learning, Your Future", "Shule Yako, Masomo Yako, Kesho Yako"],
  ["Student or parent login", "Kuingia kwa mwanafunzi au mzazi"],
  ["Type your email above first, then tap Forgot password.", "Andika barua pepe yako juu kwanza, kisha bonyeza Umesahau nenosiri."],
  ["If that email has a ShuleHub account, a reset link has been sent. Check your inbox and spam folder.", "Ikiwa barua pepe hiyo ina akaunti ya ShuleHub, kiungo cha kubadilisha nenosiri kimetumwa. Angalia kikasha chako na folda ya spam."],
  ["Please enter your email and password.", "Tafadhali weka barua pepe na nenosiri lako."],
  ["We could not open your account. Please check your internet and try again.", "Hatukuweza kufungua akaunti yako. Tafadhali angalia intaneti na ujaribu tena."],
  ["Wrong email or password. Please try again.", "Barua pepe au nenosiri si sahihi. Tafadhali jaribu tena."],
  ["Too many attempts. Please wait a few minutes and try again.", "Majaribio mengi mno. Tafadhali subiri dakika chache kisha ujaribu tena."],
  ["No internet connection. Please check it and try again.", "Hakuna mtandao. Tafadhali angalia kisha ujaribu tena."],
  ["Could not log in. Please try again.", "Imeshindikana kuingia. Tafadhali jaribu tena."],
  ["Could not open this child. Please try again.", "Imeshindikana kufungua mtoto huyu. Tafadhali jaribu tena."],
  ["You are not allowed to see this yet. Please try the ShuleHub app, or contact your school.", "Huruhusiwi kuona hii bado. Tafadhali jaribu programu ya ShuleHub, au wasiliana na shule yako."],
  ["Could not load this page. Please check your internet and try again.", "Imeshindikana kupakia ukurasa huu. Tafadhali angalia intaneti na ujaribu tena."],
  ["Could not start. Please check your internet connection and reload the page.", "Imeshindikana kuanza. Tafadhali angalia intaneti kisha pakia ukurasa upya."],
  ["Loading your account…", "Inapakia akaunti yako…"], ["Loading…", "Inapakia…"], ["Sending…", "Inatuma…"],
  ["Pay ahead (advance for future fees)", "Lipa mapema (kwa ada zijazo)"],
  ["Advance payment (pay ahead)", "Malipo ya mapema"],
  ["You can also pay ahead. Choose \"Pay ahead\" and any amount: it is kept as credit and covers your future fees.", "Unaweza pia kulipa mapema. Chagua \"Lipa mapema\" na kiasi chochote: kinabaki kama salio la ziada na kitalipia ada zako zijazo."],
  ["No fees have been recorded yet, so there is nothing to pay.", "Hakuna ada iliyorekodiwa bado, kwa hiyo hakuna cha kulipa."],
  ["CREDIT (PAID IN ADVANCE)", "SALIO LA ZIADA (LIMELIPWA MAPEMA)"],
  ["PART PAID", "IMELIPWA SEHEMU"],
  ["Student, parent or teacher login", "Kuingia kwa mwanafunzi, mzazi au mwalimu"],
  ["Administrators: please use the ShuleHub app for now. Their web pages are coming soon.", "Wasimamizi: tafadhali tumia programu ya ShuleHub kwa sasa. Kurasa zao za wavuti zinakuja hivi karibuni."],
  ["This website is for students, parents, teachers and administrators.", "Tovuti hii ni ya wanafunzi, wazazi na walimu. Wasimamizi: tafadhali tumia programu ya ShuleHub kwa sasa."],
  ["Take attendance and enter class marks here. Homework and messages are in the ShuleHub app.", "Chukua mahudhurio na weka alama za darasa hapa. Kazi za nyumbani na ujumbe ziko kwenye programu ya ShuleHub."],
  ["No subject has been assigned to you yet. Ask your administrator to assign your subjects.", "Hujapewa somo lolote bado. Muulize msimamizi wako akupe masomo."],
  ["No students are assigned to this class yet.", "Hakuna wanafunzi waliowekwa kwenye darasa hili bado."],
  ["You are not allowed to save this. Check that this subject is assigned to you, or use the ShuleHub app.", "Huruhusiwi kuhifadhi hili. Hakikisha somo hili umepewa, au tumia programu ya ShuleHub."],
  ["You are not allowed to save these marks. Check that this subject is assigned to you, or use the ShuleHub app.", "Huruhusiwi kuhifadhi alama hizi. Hakikisha somo hili umepewa, au tumia programu ya ShuleHub."],
  ["Could not save. Please check your internet and try again.", "Imeshindikana kuhifadhi. Tafadhali angalia intaneti na ujaribu tena."],
  ["Your school has not set a grading scale yet. Ask your administrator to open GRADING SCALE in the ShuleHub app. You cannot save marks until then.", "Shule yako haijaweka vipimo vya alama bado. Muulize msimamizi afungue GRADING SCALE kwenye programu ya ShuleHub. Huwezi kuhifadhi alama hadi hapo."],
  ["Enter the total marks, for example 100.", "Weka jumla ya alama, kwa mfano 100."],
  ["Enter the exam name.", "Weka jina la mtihani."],
  ["Enter marks for at least one student.", "Weka alama za angalau mwanafunzi mmoja."],
  ["Exam (for example CAT 1, Mid-term, End of term)", "Mtihani (kwa mfano CAT 1, Katikati ya muhula, Mwisho wa muhula)"],
  ["Note (optional; the student and parent can see it)", "Maelezo (si lazima; mwanafunzi na mzazi wanaweza kuyaona)"],
  ["Grades came from your school's grading scale.", "Madaraja yametoka kwenye vipimo vya alama vya shule yako."],
  ["Grading scale:", "Vipimo vya alama:"],
  ["BACK TO MY SUBJECTS", "RUDI KWA MASOMO YANGU"], ["My subjects", "Masomo yangu"], ["Teacher dashboard", "Ukurasa wa mwalimu"],
  ["MARK ALL PRESENT", "WEKA WOTE WAMEHUDHURIA"], ["SAVE ATTENDANCE", "HIFADHI MAHUDHURIO"], ["SAVE ALL MARKS", "HIFADHI ALAMA ZOTE"],
  ["CLASS MARKS", "ALAMA ZA DARASA"], ["SAVING…", "INAHIFADHI…"], ["Total marks", "Jumla ya alama"], ["Date", "Tarehe"],
  ["Login", "Kuingia"],
  ["Confirm or reject fee payments here. Everything else is in the ShuleHub app.", "Thibitisha au kataa malipo ya ada hapa. Mengine yote yako kwenye programu ya ShuleHub."],
  ["No payments are waiting for you.", "Hakuna malipo yanayokusubiri."],
  ["Payments to confirm", "Malipo ya kuthibitisha"], ["Administrator dashboard", "Ukurasa wa msimamizi"],
  ["Payment confirmed.", "Malipo yamethibitishwa."], ["Payment rejected.", "Malipo yamekataliwa."],
  ["This payment was already processed.", "Malipo haya yameshashughulikiwa."], ["The fee record no longer exists.", "Rekodi ya ada haipo tena."],
  ["The extra money could not be added to the next fees. Please check it in the ShuleHub app.", "Pesa ya ziada haikuweza kuongezwa kwenye ada zinazofuata. Tafadhali angalia kwenye programu ya ShuleHub."],
  ["Could not confirm the payment. Please check your internet and try again.", "Imeshindikana kuthibitisha malipo. Tafadhali angalia intaneti na ujaribu tena."],
  ["Could not reject the payment. Please check your internet and try again.", "Imeshindikana kukataa malipo. Tafadhali angalia intaneti na ujaribu tena."],
  ["You are not allowed to confirm this. Please use the ShuleHub app.", "Huruhusiwi kuthibitisha hili. Tafadhali tumia programu ya ShuleHub."],
  ["You are not allowed to reject this. Please use the ShuleHub app.", "Huruhusiwi kukataa hili. Tafadhali tumia programu ya ShuleHub."],
  ["Please enter a reason for rejecting.", "Tafadhali andika sababu ya kukataa."],
  ["Or reject it. Reason (shown to the student)", "Au ikatae. Sababu (itaonyeshwa kwa mwanafunzi)"],
  ["Admission number:", "Nambari ya usajili:"], ["Paid from:", "Imelipwa kutoka:"], ["Paid by parent:", "Imelipwa na mzazi:"], ["Submitted:", "Imetumwa:"],
  ["CONFIRM PAYMENT", "THIBITISHA MALIPO"], ["REJECT PAYMENT", "KATAA MALIPO"], ["PLEASE WAIT…", "TAFADHALI SUBIRI…"], ["REVIEW", "KAGUA"], ["CLOSE", "FUNGA"],
  ["Confirm payments, approve new students and post announcements here. Everything else is in the ShuleHub app.", "Thibitisha malipo, idhinisha wanafunzi wapya na weka matangazo hapa. Mengine yote yako kwenye programu ya ShuleHub."],
  ["ShuleHub Web shows your school records. Report payments on the PAY tab.", "ShuleHub Web inaonyesha rekodi za shule yako. Ripoti malipo kwenye kichupo cha LIPA."], ["DELETE", "FUTA"],
  ["My previous announcements", "Matangazo yangu ya awali"], ["Title", "Kichwa"], ["Message", "Ujumbe"],
  [/(\d+) of (\d+) students/g, "Wanafunzi $1 kati ya $2"],
  [/Showing (\d+) marks? you already saved for (.+)\. Change them and save to correct them\./g, "Inaonyesha alama $1 ulizohifadhi tayari za $2. Zibadilishe na uhifadhi ili kuzisahihisha."],
  ["ALL STUDENTS", "WANAFUNZI WOTE"], ["Students by class", "Wanafunzi kwa darasa"], ["Search by name or admission number", "Tafuta kwa jina au nambari ya usajili"],
  ["No students found.", "Hakuna wanafunzi waliopatikana."], ["No class assigned yet", "Bado hajapangiwa darasa"],
  ["NOTICES", "MATANGAZO"], ["No announcements yet.", "Hakuna matangazo bado."], ["Announcements", "Matangazo"],
  ["Who should see it?", "Nani aone?"], ["All students in my institution", "Wanafunzi wote katika taasisi yangu"],
  ["Please enter a title and a message.", "Tafadhali andika kichwa na ujumbe."], ["POST ANNOUNCEMENT", "WEKA TANGAZO"], ["POSTING…", "INAWEKA…"],
  ["Announcement posted.", "Tangazo limewekwa."], ["Announcement deleted.", "Tangazo limefutwa."],
  ["None yet.", "Hakuna bado."], ["Everyone", "Wote"],
  ["You are not allowed to post this. Please use the ShuleHub app.", "Huruhusiwi kuweka hili. Tafadhali tumia programu ya ShuleHub."],
  ["Could not post. Please check your internet and try again.", "Imeshindikana kuweka. Tafadhali angalia intaneti na ujaribu tena."],
  ["Could not delete. Please try again.", "Imeshindikana kufuta. Tafadhali jaribu tena."],
  ["Delete this announcement? Students will no longer see it.", "Futa tangazo hili? Wanafunzi hawataliona tena."],
  ["No new students are waiting for approval.", "Hakuna wanafunzi wapya wanaosubiri idhini."],
  ["Students waiting for approval", "Wanafunzi wanaosubiri idhini"], ["NEW STUDENTS", "WANAFUNZI WAPYA"], ["PAYMENTS", "MALIPO"],
  ["Approve only students you know. You can assign their class afterwards in the ShuleHub app.", "Idhinisha tu wanafunzi unaowajua. Unaweza kuwapangia darasa baadaye kwenye programu ya ShuleHub."],
  ["Student approved. They can log in now. Assign their class in the ShuleHub app.", "Mwanafunzi ameidhinishwa. Anaweza kuingia sasa. Mpangie darasa kwenye programu ya ShuleHub."],
  ["Student request rejected. The reason is shown to the student.", "Ombi la mwanafunzi limekataliwa. Mwanafunzi ataonyeshwa sababu."],
  ["A student with this admission number is already in your school. Check it before approving.", "Mwanafunzi mwenye nambari hii ya usajili tayari yuko shuleni kwako. Hakikisha kabla ya kuidhinisha."],
  ["You are not allowed to approve this. Please use the ShuleHub app.", "Huruhusiwi kuidhinisha hili. Tafadhali tumia programu ya ShuleHub."],
  ["Could not approve. Please check your internet and try again.", "Imeshindikana kuidhinisha. Tafadhali angalia intaneti na ujaribu tena."],
  ["Could not reject. Please check your internet and try again.", "Imeshindikana kukataa. Tafadhali angalia intaneti na ujaribu tena."],
  ["Or reject. Reason (shown to the student)", "Au kataa. Sababu (itaonyeshwa kwa mwanafunzi)"],
  ["APPROVE", "IDHINISHA"], ["REJECT", "KATAA"], ["Email:", "Barua pepe:"], ["Phone:", "Simu:"],
  ["No child is linked to your account yet. Use the ShuleHub app to add a child.", "Hakuna mtoto aliyeunganishwa na akaunti yako bado. Tumia programu ya ShuleHub kuongeza mtoto."],
  ["No fees have been recorded yet.", "Hakuna ada iliyorekodiwa bado."],
  ["No results have been published yet. Please check again later.", "Hakuna matokeo yaliyochapishwa bado. Tafadhali angalia tena baadaye."],
  ["No results have been published yet, so there is no report card.", "Hakuna matokeo yaliyochapishwa bado, kwa hiyo hakuna ripoti."],
  ["No attendance has been recorded yet.", "Hakuna mahudhurio yaliyorekodiwa bado."],
  ["No timetable has been set up for this class yet.", "Hakuna ratiba iliyowekwa kwa darasa hili bado."],
  ["There are no unpaid fees to pay right now.", "Hakuna ada ambazo hazijalipwa kwa sasa."],
  ["You have not reported any payment yet.", "Hujaripoti malipo yoyote bado."],
  ["To pay, open the PAY tab. Send the money by M-Pesa as the school instructs, then report the M-Pesa code there. The school confirms it, and it shows here.", "Kulipa, fungua kichupo cha LIPA. Tuma pesa kwa M-Pesa kama shule inavyoelekeza, kisha andika msimbo wa M-Pesa hapo. Shule italithibitisha, na itaonekana hapa."],
  ["ShuleHub Web shows your school records. Report payments on the PAY tab.", "ShuleHub Web inaonyesha rekodi za shule yako. Ripoti malipo kwenye kichupo cha LIPA."],
  ["Account number: the student's admission number", "Nambari ya akaunti: nambari ya usajili ya mwanafunzi"],
  ["Then type the M-Pesa code below.", "Kisha andika msimbo wa M-Pesa hapa chini."],
  ["You can pay more than one fee at once. The extra goes to your next unpaid fees when the school confirms.", "Unaweza kulipa ada zaidi ya moja kwa pamoja. Kiasi cha ziada kinaenda kwenye ada zako zinazofuata shule ikithibitisha."],
  ["Please choose which fee you are paying.", "Tafadhali chagua ada unayolipia."],
  ["Please enter the amount you sent.", "Tafadhali weka kiasi ulichotuma."],
  ["The amount is too large. The most you can send in one payment is KSh 1,000,000.", "Kiasi ni kikubwa mno. Kiwango cha juu kwa malipo moja ni KSh 1,000,000."],
  ["The M-Pesa code must be 10 letters and numbers, for example QGH7K2LM9P.", "Msimbo wa M-Pesa lazima uwe na herufi na tarakimu 10, kwa mfano QGH7K2LM9P."],
  ["Please enter the phone number you paid from, for example 0712345678.", "Tafadhali weka nambari ya simu uliyolipia, kwa mfano 0712345678."],
  ["This M-Pesa code has already been submitted, or it was not accepted. Check the code, and check that your device's date and time are correct.", "Msimbo huu wa M-Pesa umeshatumwa, au haukukubaliwa. Angalia msimbo, na uhakikishe tarehe na saa ya kifaa chako ni sahihi."],
  ["Could not send. Please check your internet and try again.", "Imeshindikana kutuma. Tafadhali angalia intaneti na ujaribu tena."],
  ["Use an email containing \"parent\" for the parent view.", "Tumia barua pepe yenye \"parent\" kuona ukurasa wa mzazi."],
  ["DEMO MODE: sample data only", "HALI YA MAJARIBIO: data ya mfano tu"],
  ["Code not found in school M-Pesa statement", "Msimbo haukupatikana kwenye taarifa ya M-Pesa ya shule"],
  ["Show or hide password", "Onyesha au ficha nenosiri"],
  ["Forgot password?", "Umesahau nenosiri?"], ["Privacy policy", "Sera ya faragha"], ["About ShuleHub", "Kuhusu ShuleHub"],
  ["Fee statement", "Taarifa ya ada"], ["TOTAL BILLED", "JUMLA YA ADA"], ["TOTAL PAID", "JUMLA ILIYOLIPWA"], ["TOTAL BALANCE", "JUMLA YA SALIO"],
  ["MY CHILDREN", "WATOTO WANGU"], ["My children", "Watoto wangu"],
  ["How to pay", "Jinsi ya kulipa"], ["Report your payment", "Ripoti malipo yako"], ["Which fee are you paying?", "Unalipa ada gani?"],
  ["Amount you sent (KSh)", "Kiasi ulichotuma (KSh)"], ["THIS FEE", "ADA HII"], ["ALL FEES", "ADA ZOTE"],
  ["M-Pesa code", "Msimbo wa M-Pesa"], ["Phone number you paid from", "Nambari ya simu uliyolipia"],
  ["SEND PAYMENT REPORT", "TUMA RIPOTI YA MALIPO"], ["My payment reports", "Ripoti zangu za malipo"],
  ["Results and grades", "Matokeo na alama"], ["Teacher feedback:", "Maoni ya mwalimu:"],
  ["MEAN POINTS · MEAN GRADE", "POINTI WASTANI · DARAJA WASTANI"], ["CLASS POSITION", "NAFASI DARASANI"],
  ["Teacher's remarks", "Maoni ya walimu"], ["Principal's remark", "Maoni ya mkuu wa shule"],
  ["Closing date:", "Tarehe ya kufunga:"], ["Next term opens:", "Muhula ujao unafunguliwa:"], ["Grading scale:", "Vipimo vya alama:"],
  ["PRINT OR SAVE AS PDF", "CHAPISHA AU HIFADHI KAMA PDF"],
  ["REPORT CARD", "RIPOTI YA MAENDELEO"], ["Admission no", "Nambari ya usajili"], ["Adm:", "Nambari ya usajili:"],
  ["All months", "Miezi yote"], ["By month", "Kwa mwezi"], ["By subject", "Kwa somo"],
  ["End of term", "Mwisho wa muhula"], ["End of semester", "Mwisho wa semista"], ["Mid-term", "Katikati ya muhula"],
  ["Marks:", "Alama:"], ["Grade:", "Daraja:"], ["Overall:", "Kwa ujumla:"],
  ["LOG IN", "INGIA"], ["LOG OUT", "TOKA"], ["SHOW", "ONYESHA"], ["HIDE", "FICHA"], ["Email", "Barua pepe"], ["Password", "Nenosiri"],
  ["FEES", "ADA"], ["PAY", "LIPA"], ["RESULTS", "MATOKEO"], ["ATTENDANCE", "MAHUDHURIO"], ["TIMETABLE", "RATIBA"],
  ["BALANCE", "SALIO"], ["balance", "salio"], ["Charged", "Imetozwa"], ["Paid", "Imelipwa"], ["Due", "Mwisho"],
  ["OVERDUE", "IMECHELEWA"], ["UNPAID", "HAIJALIPWA"], ["REJECTED", "IMEKATALIWA"], ["CONFIRMED", "IMETHIBITISHWA"], ["PENDING", "INASUBIRI"], ["NEW", "MPYA"],
  ["Present", "Amehudhuria"], ["Absent", "Hayupo"], ["Late", "Amechelewa"], ["Excused", "Ameruhusiwa"],
  ["Total", "Jumla"], ["Average", "Wastani"], ["Reason:", "Sababu:"], ["e.g.", "mf."], ["ALL", "YOTE"], ["Room", "Chumba"], ["Lesson", "Somo"], ["Subject", "Somo"],
  ["January", "Januari"], ["February", "Februari"], ["March", "Machi"], ["April", "Aprili"], ["May", "Mei"], ["June", "Juni"],
  ["July", "Julai"], ["August", "Agosti"], ["September", "Septemba"], ["October", "Oktoba"], ["November", "Novemba"], ["December", "Desemba"],
  ["Monday", "Jumatatu"], ["Tuesday", "Jumanne"], ["Wednesday", "Jumatano"], ["Thursday", "Alhamisi"], ["Friday", "Ijumaa"], ["Saturday", "Jumamosi"], ["Sunday", "Jumapili"],
].map(([a, b]) => [typeof a === "string"
  ? new RegExp((/^\w/.test(a) ? "\\b" : "") + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (/\w$/.test(a) ? "\\b" : ""), "gi") : a, b]);

function swTranslate(s) {
  if (!s || !/[A-Za-z]/.test(s)) return s;
  let out = s;
  for (const [re, to] of SW_PHRASES) {
    out = out.replace(re, (...m) => {
      const hit = m[0];
      const r = to.replace(/\$(\d)/g, (_, i) => m[+i]);
      if (hit.length > 2 && hit === hit.toUpperCase() && /[A-Z]{3}/.test(hit)) return r.toUpperCase();
      if (r.length > 2 && r === r.toUpperCase()) {            // the table holds a capitals word: follow the original's case
        const low = r.toLowerCase();
        return hit[0] === hit[0].toLowerCase() ? low : low[0].toUpperCase() + low.slice(1);
      }
      return r;
    });
  }
  return out;
}

function swAttributes() {
  root.querySelectorAll("[placeholder],[aria-label],[title]").forEach((e) => {
    ["placeholder", "aria-label", "title"].forEach((a) => {
      const v = e.getAttribute(a);
      if (!v) return;
      const key = "data-en-" + a;
      if (!e.hasAttribute(key)) e.setAttribute(key, v);
      const t = swTranslate(e.getAttribute(key));
      if (t !== v) e.setAttribute(a, t);
    });
  });
}

(function langSwitch() {
  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;justify-content:flex-end;padding:8px 16px 0;font:600 12px system-ui";
  const pill = document.createElement("div");
  pill.style.cssText = "display:flex;gap:4px;background:#fff;border:1px solid #bbb;border-radius:20px;padding:3px";
  bar.appendChild(pill);
  [["en", "EN"], ["sw", "SW"]].forEach(([code, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label; b.setAttribute("aria-label", code === "sw" ? "Kiswahili" : "English");
    b.style.cssText = "border:0;border-radius:16px;padding:5px 10px;cursor:pointer;color:#111;background:" + (LANG === code ? "#9fe0c5" : "transparent");
    b.onclick = () => { try { localStorage.setItem("shulehub_lang", code); } catch (e) {} location.reload(); };
    pill.appendChild(b);
  });
  document.body.insertBefore(bar, root);
})();

let termBusy = false;
function rewriteTerms() {
  if ((!termRules && LANG !== "sw") || termBusy) return;
  termBusy = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const p = n.parentNode && n.parentNode.nodeName;
      if (p === "SCRIPT" || p === "STYLE") continue;
      if (n.parentNode.closest && n.parentNode.closest(".ut")) continue;   // text typed by people is never reworded or translated
      const before = n.nodeValue;
      const after = LANG === "sw" ? swTranslate(before) : applyTermsTo(before);
      if (after !== before) n.nodeValue = after;
    }
    if (LANG === "sw") swAttributes();
  } finally { termBusy = false; }
}
new MutationObserver(() => rewriteTerms()).observe(root, { childList: true, subtree: true, characterData: true });

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
    async institutionTerms(id) {
      try {
        const s = await fs.getDoc(fs.doc(db, "institutions", id));
        return s.exists() ? s.data() : null;
      } catch (e) { return null; }
    },
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
    // a student reads only their own attendance copy: students/{id}/attendance (never the class registers)
    async getStudentAttendance(st) {
      return this.getChildAttendance(st.id);
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
    // everything a report card needs besides the results; each part fails on its own
    async getReportCard(st) {
      const inst = st.institutionId || "";
      const out = { scheme: null, settings: {}, summaries: [], remarks: [] };
      if (inst) {
        try {
          const d = await fs.getDoc(fs.doc(db, "institutions", inst, "settings", "grading"));
          const raw = d.exists() ? d.get("bands") : null;
          if (Array.isArray(raw)) {
            const bands = raw.filter((m) => m && typeof m.grade === "string")
              .map((m) => ({ min: num(m.min), grade: m.grade, points: num(m.points), remark: m.remark || "" }));
            if (bands.length) out.scheme = { name: d.get("name") || "Custom", bands, passMark: num(d.get("passMark")) || 40 };
          }
        } catch (e) { /* no scale */ }
        try {
          const d = await fs.getDoc(fs.doc(db, "institutions", inst, "settings", "reportCard"));
          if (d.exists()) out.settings = d.data();
        } catch (e) { /* no settings */ }
      }
      try { out.summaries = docs(await fs.getDocs(fs.collection(db, "students", st.id, "report_summaries"))); } catch (e) { /* none */ }
      try { out.remarks = docs(await fs.getDocs(fs.collection(db, "students", st.id, "teacherRemarks"))); } catch (e) { /* none */ }
      return out;
    },
    // ----- teachers -----
    async getTeacher(uid) {
      const s = await fs.getDoc(fs.doc(db, "teachers", uid));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
    async getAssignedUnits(uid) {
      return docs(await fs.getDocs(fs.collection(db, "teachers", uid, "assigned_units")));
    },
    async getClassStudents(inst, u) {
      const q = fs.query(fs.collection(db, "students"), fs.where("institutionId", "==", inst));
      return docs(await fs.getDocs(q))
        .filter((s) => s.programId === u.programId && s.levelId === u.levelId && s.semesterId === u.semesterId)
        .map((s) => ({ uid: s.id, name: s.fullName || s.email || "Student", admission: s.admissionNumber || "" }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    },
    async getRegister(unitId, date) {
      const s = await fs.getDoc(fs.doc(db, "attendance", unitId + "_" + date));
      return s.exists() ? s.data() : null;
    },
    // the class register, plus one private record per student, in groups of 10 (the same as the app)
    async saveAttendance({ unit, institutionId, teacherUid, date, statuses, notes, students }) {
      const id = unit.unitId + "_" + date, now = Date.now();
      const attended = Object.values(statuses).filter((x) => x === "present" || x === "late").length;
      for (let i = 0; i < students.length; i += 10) {
        const batch = fs.writeBatch(db);
        if (i === 0) batch.set(fs.doc(db, "attendance", id), {
          unitId: unit.unitId, unitName: unit.unitName, unitCode: unit.unitCode || "", date, institutionId, teacherUid,
          programId: unit.programId, levelId: unit.levelId, semesterId: unit.semesterId,
          records: statuses, notes, totalStudents: students.length, presentCount: attended, savedAt: now,
        });
        students.slice(i, i + 10).forEach((s) => batch.set(fs.doc(db, "students", s.uid, "attendance", id), {
          unitId: unit.unitId, unitName: unit.unitName, unitCode: unit.unitCode || "", date, institutionId, teacherUid,
          status: statuses[s.uid] || "present", note: notes[s.uid] || "", savedAt: now,
        }));
        await batch.commit();
      }
    },
    async getGrading(inst) {
      try {
        const d = await fs.getDoc(fs.doc(db, "institutions", inst, "settings", "grading"));
        const raw = d.exists() ? d.get("bands") : null;
        if (!Array.isArray(raw)) return null;
        const bands = raw.filter((m) => m && typeof m.grade === "string")
          .map((m) => ({ min: num(m.min), grade: m.grade, points: num(m.points), remark: m.remark || "" }));
        return bands.length ? { name: d.get("name") || "Custom", bands, passMark: num(d.get("passMark")) || 40 } : null;
      } catch (e) { return null; }
    },
    // marks this teacher already saved for one exam; a student with nothing saved (or not readable) is simply left out
    async getSavedMarks(unit, exam, students) {
      const id = resultIdFor(unit.unitName, unit.semesterId, exam), out = {};
      await Promise.all(students.map(async (st) => {
        try {
          const d = await fs.getDoc(fs.doc(db, "students", st.uid, "results", id));
          if (d.exists() && d.get("teacherUid") === auth.currentUser.uid) out[st.uid] = { marks: d.get("marks"), totalMarks: d.get("totalMarks") };
        } catch (e) { /* not saved yet */ }
      }));
      return out;
    },
    async saveMarks({ unit, institutionId, teacher, teacherUid, exam, total, entries }) {
      const now = Date.now();
      for (let i = 0; i < entries.length; i += 10) {
        const batch = fs.writeBatch(db);
        entries.slice(i, i + 10).forEach(({ student, marks, band }) => batch.set(
          fs.doc(db, "students", student.uid, "results", resultIdFor(unit.unitName, unit.semesterId, exam)), {
            unitId: unit.unitId || unit.id || "", unitName: unit.unitName, unitCode: unit.unitCode || "", marks, totalMarks: total,
            grade: band ? band.grade : "", points: band ? band.points : 0, gradeRemark: band ? band.remark : "",
            published: true, teacherUid, teacherName: teacher.fullName || teacher.email || "Teacher",
            institutionId, programId: unit.programId, levelId: unit.levelId, semesterId: unit.semesterId,
            assessment: exam, publishedAt: now, updatedAt: now,
          }, { merge: true }));
        await batch.commit();
      }
    },
    // ----- administrators: payments -----
    async getAdmin(uid) {
      const s = await fs.getDoc(fs.doc(db, "admins", uid));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
    async getPendingPayments(inst) {
      const q = fs.query(fs.collection(db, "payment_submissions"), fs.where("institutionId", "==", inst), fs.where("status", "==", "pending"));
      return docs(await fs.getDocs(q));
    },
    // the same steps as the app: one transaction for the fee and the payment, then any extra money goes to the next fees
    async confirmPayment(p, adminUid) {
      const subRef = fs.doc(db, "payment_submissions", p.id);
      const feeRef = fs.doc(db, "students", p.studentUid, "fee_records", p.feeId);
      const extra = await fs.runTransaction(db, async (tx) => {
        const sub = await tx.get(subRef);
        if (sub.get("status") !== "pending") throw Object.assign(new Error("done"), { userMessage: "This payment was already processed." });
        const fee = await tx.get(feeRef);
        if (!fee.exists()) throw Object.assign(new Error("nofee"), { userMessage: "The fee record no longer exists." });
        const due = num(fee.get("amountDue") ?? fee.get("amount"));
        const before = num(fee.get("amountPaid"));
        const applied = Math.min(num(p.amount), Math.max(due - before, 0));
        const paid = before + applied;
        tx.update(feeRef, { amountPaid: paid, status: paid >= due ? "Paid" : "Partially paid",
          transactionReference: p.mpesaCode || p.id, lastPaymentAt: Date.now() });
        tx.update(subRef, { status: "confirmed", confirmedBy: adminUid, confirmedAt: Date.now() });
        return num(p.amount) - applied;
      });
      if (extra <= 0.004) return {};
      try {
        const col = fs.collection(db, "students", p.studentUid, "fee_records");
        const snap = await fs.getDocs(col);
        const open = snap.docs.filter((d) => d.id !== p.feeId).map((d) => ({ d, due: num(d.get("amountDue") ?? d.get("amount")), paid: num(d.get("amountPaid")) }))
          .filter((x) => x.due - x.paid > 0.004)
          .sort((a, b) => String(a.d.get("dueDate") || "9999-99-99").localeCompare(String(b.d.get("dueDate") || "9999-99-99")) || num(a.d.get("createdAt")) - num(b.d.get("createdAt")));
        const batch = fs.writeBatch(db);
        let left = extra;
        for (const x of open) {
          if (left <= 0.004) break;
          const use = Math.min(left, x.due - x.paid), np = x.paid + use;
          batch.update(x.d.ref, { amountPaid: np, status: np >= x.due - 0.004 ? "Paid" : "Partially paid", lastPaymentAt: Date.now() });
          left -= use;
        }
        if (left > 0.004) batch.update(fs.doc(db, "students", p.studentUid, "fee_records", p.feeId), { amountPaid: fs.increment(left) });
        await batch.commit();
      } catch (e) {
        return { warning: "The extra money could not be added to the next fees. Please check it in the ShuleHub app." };
      }
      return {};
    },
    async getNotices(inst) {
      const q = fs.query(fs.collection(db, "announcements"), fs.where("institutionId", "==", inst));
      return docs(await fs.getDocs(q));
    },
    async getMyNotices(uid) {
      return docs(await fs.getDocs(fs.query(fs.collection(db, "announcements"), fs.where("teacherUid", "==", uid))));
    },
    postNotice: (n) => fs.addDoc(fs.collection(db, "announcements"), n),
    deleteNotice: (id) => fs.deleteDoc(fs.doc(db, "announcements", id)),
    async getAllStudents(inst) {
      return docs(await fs.getDocs(fs.query(fs.collection(db, "students"), fs.where("institutionId", "==", inst))));
    },
    async getPendingStudents(inst) {
      const q = fs.query(fs.collection(db, "studentRegistrationRequests"), fs.where("institutionId", "==", inst), fs.where("status", "==", "pending"));
      return docs(await fs.getDocs(q));
    },
    // same as the app: refuse a repeated admission number, then create the profile and remove the request together
    async approveStudent(r, inst) {
      const adm = String(r.admissionNumber || "").trim();
      if (adm) {
        const q = fs.query(fs.collection(db, "students"), fs.where("institutionId", "==", inst), fs.where("admissionNumber", "==", adm), fs.limit(1));
        if (!(await fs.getDocs(q)).empty) throw Object.assign(new Error("dup"), { userMessage: "A student with this admission number is already in your school. Check it before approving." });
      }
      const now = Date.now(), batch = fs.writeBatch(db);
      batch.set(fs.doc(db, "students", r.id), {
        uid: r.id, fullName: r.fullName || "", email: r.email || "", phone: r.phone || "", admissionNumber: r.admissionNumber || "",
        schoolName: r.schoolName || "", institutionId: inst, joinCode: r.joinCode || "", role: "student",
        consentAcceptedAt: r.consentAcceptedAt || now, consentPolicyVersion: r.consentPolicyVersion || "2.2", createdAt: r.createdAt || now,
      });
      batch.delete(fs.doc(db, "studentRegistrationRequests", r.id));
      await batch.commit();
    },
    rejectStudent: (r, reason, adminUid) => fs.updateDoc(fs.doc(db, "studentRegistrationRequests", r.id),
      { status: "rejected", rejectReason: reason, decidedAt: Date.now(), decidedBy: adminUid }),
    rejectPayment: (p, reason) => fs.updateDoc(fs.doc(db, "payment_submissions", p.id), { status: "rejected", rejectReason: reason, rejectedAt: Date.now() }),
    // the document id is schoolId_code, so one school cannot block another school's code,
    // and sending the same code twice to the same school is refused by the rules
    submitPayment: (data) => fs.setDoc(fs.doc(db, "payment_submissions", data.institutionId + "_" + data.mpesaCode), data),
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
  const demoPending = [
    { id: "i_QGH7K2LM9P", mpesaCode: "QGH7K2LM9P", studentName: "Brian Otieno (demo)", admissionNumber: "ADM-0231", amount: 12000, feeDescription: "Term 3 fees", phone: "0712345678", createdAt: now - 3e6, status: "pending" },
    { id: "i_RTX4P0QW1Z", mpesaCode: "RTX4P0QW1Z", studentName: "Faith Otieno (demo)", admissionNumber: "ADM-0310", amount: 5000, feeDescription: "Trip to Nairobi", phone: "0722000111", parentName: "Mrs Otieno", createdAt: now - 9e6, status: "pending" },
  ];
  const demoNotes = [
    { id: "n0", title: "Parents meeting", message: "Parents meeting on Friday at 10am in the hall.", teacherName: "Mrs Njeri", teacherUid: "me", institutionId: "i", programId: "", levelId: "", semesterId: "", unitName: "", createdAt: now - 8e7 },
    { id: "n1", title: "Maths test", message: "Maths test on Monday. Revise chapters 4 and 5.", teacherName: "Mr Kamau", teacherUid: "x", institutionId: "i", programId: "p", levelId: "l", semesterId: "s", unitName: "Mathematics", createdAt: now - 4e7 },
    { id: "n2", title: "Other class", message: "This is for another class.", teacherName: "Mr Kamau", teacherUid: "x", institutionId: "i", programId: "p", levelId: "zzz", semesterId: "s", unitName: "Physics", createdAt: now - 3e7 },
  ];
  const demoReqs = [
    { id: "r1", fullName: "Peter Kimani", email: "peter@example.com", phone: "0700111222", admissionNumber: "ADM-0400", createdAt: now - 5e6 },
    { id: "r2", fullName: "Grace Atieno", email: "grace@example.com", phone: "0700333444", admissionNumber: "ADM-0401", createdAt: now - 2e6 },
  ];
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
      role = /admin/i.test(email) ? "admin" : /teacher/i.test(email) ? "teacher" : /parent/i.test(email) ? "parent" : "student";
      setTimeout(() => cb && cb({ uid: role === "parent" ? "dp" : role === "teacher" ? "dt" : role === "admin" ? "da" : "demo", email }), 50);
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
    institutionTerms: async () => ({ type: new URLSearchParams(location.search).get("type") || "secondary" }),
    getClassNames: async (st) => (st && st.programId ? { program: "Secondary", level: st.levelId === "l2" ? "Form 2" : "Form 3", semester: "Term 3" } : {}),
    getFees: async (sid) => [
      { id: "1", description: "Term 1 fees", amountDue: 25000, amountPaid: 25000, dueDate: "2026-01-20", createdAt: now - 9e9 },
      { id: "2", description: "Term 2 fees", amountDue: 25000, amountPaid: sid === "c2" ? 25000 : 12000, dueDate: "2026-05-05", createdAt: now - 6e9 },
      { id: "3", description: "Term 3 fees", amountDue: 25000, amountPaid: 0, dueDate: "2026-09-01", createdAt: now - 3e9 },
      { id: "4", description: "Trip to Nairobi", amountDue: 3500, amountPaid: 0, dueDate: "2027-02-01", createdAt: now - 1e9 },
    ],
    getResults: async () => [
      { id: "a", unitName: "Mathematics", unitCode: "MAT", marks: 78, totalMarks: 100, grade: "A-", points: 11, assessment: "End of term", feedback: "Very good work. Keep it up.", publishedAt: now - 2 * 864e5 },
      { id: "b", unitName: "English", marks: 64, totalMarks: 100, grade: "B", points: 9, assessment: "End of term", publishedAt: now - 2 * 864e5 },
      { id: "c", unitName: "Kiswahili", marks: 71, totalMarks: 100, grade: "B+", points: 10, assessment: "End of term", feedback: "Soma zaidi.", publishedAt: now - 2 * 864e5 },
      { id: "d", unitName: "Mathematics", unitCode: "MAT", marks: 55, totalMarks: 100, grade: "C+", points: 7, assessment: "Mid-term", publishedAt: now - 40 * 864e5 },
      { id: "e", unitName: "English", marks: 60, totalMarks: 100, grade: "B-", points: 8, assessment: "Mid-term", publishedAt: now - 40 * 864e5 },
    ],
    getReportCard: async () => ({
      scheme: { name: "Secondary", passMark: 40, bands: [
        { min: 80, grade: "A", points: 12, remark: "Excellent" }, { min: 75, grade: "A-", points: 11, remark: "Very good" },
        { min: 70, grade: "B+", points: 10, remark: "Good" }, { min: 65, grade: "B", points: 9, remark: "Good" },
        { min: 60, grade: "B-", points: 8, remark: "Fairly good" }, { min: 55, grade: "C+", points: 7, remark: "Fair" },
        { min: 0, grade: "E", points: 1, remark: "Very poor" }] },
      settings: { principalName: "Mrs R. Njeri", closingDate: "2026-11-27", nextTermDate: "2027-01-11" },
      summaries: [{ id: "end_of_term", position: 4, outOf: 52, principalRemark: "A steady and hardworking student. Keep it up." },
                  { id: "mid_term", position: 9, outOf: 52, principalRemark: "" }],
      remarks: [{ id: "r1", text: "Participates well in class and is improving.", teacherName: "Mr Kamau", createdAt: now - 3 * 864e5 },
                { id: "r2", text: "Needs to submit homework on time.", teacherName: "Ms Achieng", createdAt: now - 9 * 864e5 }],
    }),
    getStudentAttendance: async (st) => demoAtt(st.id),
    getChildAttendance: async (sid) => demoAtt(sid),
    getInstructions: async () => "Lipa na M-Pesa\nPaybill: 123456\nAccount number: the student's admission number\nThen type the M-Pesa code below.",
    getPayments: async () => demoPays.slice(),
    submitPayment: async (data) => {
      if (demoPays.some((p) => p.mpesaCode === data.mpesaCode)) { const e = new Error("dup"); e.code = "permission-denied"; throw e; }
      demoPays.push({ ...data, id: data.mpesaCode });
    },
    getTeacher: async (uid) => (uid === "dt" ? { id: "dt", fullName: "Mr Kamau (demo)", email: "teacher@example.com", institutionId: "i" } : null),
    getAssignedUnits: async () => [
      { id: "u1", unitId: "u1", unitName: "Mathematics", unitCode: "MAT", programId: "p", levelId: "l", semesterId: "s", programName: "Secondary", levelName: "Form 3", semesterName: "Term 3" },
      { id: "u2", unitId: "u2", unitName: "Physics", unitCode: "PHY", programId: "p", levelId: "l", semesterId: "s", programName: "Secondary", levelName: "Form 3", semesterName: "Term 3" },
    ],
    getClassStudents: async () => ["Alice Wanjiku", "Brian Otieno", "Faith Achieng", "Martin Maina", "Morris Murigi"]
      .map((n, i) => ({ uid: "s" + i, name: n, admission: "ADM-0" + (140 + i) })),
    getRegister: async () => null,
    saveAttendance: async (x) => { window.__att = x; },
    getGrading: async () => ({ name: "Secondary", passMark: 40, bands: [
      { min: 80, grade: "A", points: 12, remark: "Excellent" }, { min: 60, grade: "B", points: 9, remark: "Good" },
      { min: 40, grade: "C", points: 6, remark: "Fair" }, { min: 0, grade: "E", points: 1, remark: "Very poor" }] }),
    getSavedMarks: async (unit, exam, students) => (exam === "Mid-term" && students[0] ? { [students[0].uid]: { marks: 72, totalMarks: 100 } } : {}),
    saveMarks: async (x) => { window.__marks = x; },
    getNotices: async () => demoNotes.slice(),
    getMyNotices: async () => demoNotes.filter((n) => n.teacherUid === "me"),
    postNotice: async (n) => { demoNotes.push({ id: "n" + demoNotes.length, ...n, teacherUid: "me" }); window.__posted = n; },
    deleteNotice: async (id) => { const i = demoNotes.findIndex((x) => x.id === id); if (i >= 0) demoNotes.splice(i, 1); },
    getAllStudents: async () => [
      { id: "s1", fullName: "Jane Wanjiru", admissionNumber: "ADM-0142", email: "jane@example.com", phone: "0700000001", programId: "p", levelId: "l", semesterId: "s" },
      { id: "s2", fullName: "Brian Otieno", admissionNumber: "ADM-0231", email: "brian@example.com", phone: "0700000002", programId: "p", levelId: "l", semesterId: "s" },
      { id: "s3", fullName: "Faith Otieno", admissionNumber: "ADM-0310", email: "faith@example.com", phone: "0700000003", programId: "p", levelId: "l2", semesterId: "s" },
      { id: "s4", fullName: "Kevin Mwangi", admissionNumber: "ADM-0399", email: "", phone: "", programId: "", levelId: "", semesterId: "" },
    ],
    getPendingStudents: async () => demoReqs.slice(),
    approveStudent: async (r) => { const i = demoReqs.findIndex((x) => x.id === r.id); if (i >= 0) demoReqs.splice(i, 1); window.__approved = r.id; },
    rejectStudent: async (r, reason) => { const i = demoReqs.findIndex((x) => x.id === r.id); if (i >= 0) demoReqs.splice(i, 1); window.__rejectedStudent = [r.id, reason]; },
    getAdmin: async (uid) => (uid === "da" ? { id: "da", fullName: "Mrs Njeri (demo)", email: "admin@example.com", institutionId: "i" } : null),
    getPendingPayments: async () => demoPending.slice(),
    confirmPayment: async (p) => { const i = demoPending.findIndex((x) => x.id === p.id); if (i >= 0) demoPending.splice(i, 1); window.__confirmed = p; return {}; },
    rejectPayment: async (p, reason) => { const i = demoPending.findIndex((x) => x.id === p.id); if (i >= 0) demoPending.splice(i, 1); window.__rejected = [p.id, reason]; },
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
let rcExam = "";         // the exam chosen on the report card
let cache = {};

/* ---------- login screen ---------- */
function showLogin(message, good) {
  setTerms(null);
  root.innerHTML = `
  ${DEMO ? '<div class="demo">DEMO MODE: sample data only. Use an email containing "parent" for the parent view.</div>' : ""}
  <main class="login"><form class="login-card" id="loginForm" novalidate>
    <h1>ShuleHub</h1>
    <p class="tag">Your School, Your Learning, Your Future</p>
    <h3>Login</h3>
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
  // a person with another role may be refused when we look for the wrong kind of profile: go on to the next kind
  const probe = async (fn) => {
    try { return await fn(); } catch (e) { if (e && e.code === "permission-denied") return null; throw e; }
  };
  try {
    const st = await probe(() => api.getStudent(u.uid));
    if (st) {
      role = "student";
      await openSubject(st);
      return renderShell();
    }
    const p = await probe(() => api.getParent(u.uid));
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
    const t = await probe(() => api.getTeacher(u.uid));
    if (t) {
      role = "teacher"; teacherProfile = t; tScheme = undefined;
      let inst = "";
      try { inst = t.institutionId ? await api.institutionName(t.institutionId) : ""; } catch (e) { /* ignore */ }
      info = { institution: inst };
      try { setTerms(t.institutionId ? await api.institutionTerms(t.institutionId) : null); } catch (e) { setTerms(null); }
      return renderTeacherHome();
    }
    const a = await probe(() => api.getAdmin(u.uid));
    if (a) {
      role = "admin"; adminProfile = a; aPays = null; aOpen = ""; aMsg = "";
      let inst = "";
      try { inst = a.institutionId ? await api.institutionName(a.institutionId) : ""; } catch (e) { /* ignore */ }
      info = { institution: inst };
      try { setTerms(a.institutionId ? await api.institutionTerms(a.institutionId) : null); } catch (e) { setTerms(null); }
      return renderAdminHome();
    }
  } catch (e) {
    await api.signOut();
    return showLogin("We could not open your account. Please check your internet and try again.");
  }
  await api.signOut();
  showLogin("This website is for students, parents, teachers and administrators.");
}

async function openSubject(st) {
  subject = st; cache = {}; tab = "fees"; attMonth = "all"; rcExam = "";
  let names = { program: st.programName, level: st.levelName, semester: st.semesterName };
  if (!names.program && role === "student") {
    try { names = await api.getClassNames(st); } catch (e) { names = {}; }
  }
  let inst = "";
  try { inst = st.institutionId ? await api.institutionName(st.institutionId) : ""; } catch (e) { /* ignore */ }
  info = { institution: inst, ...names };
  try { setTerms(st.institutionId ? await api.institutionTerms(st.institutionId) : null); } catch (e) { setTerms(null); }
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
      ${[["fees", "FEES"], ["pay", "PAY"], ["results", "RESULTS"], ["report", "REPORT CARD"], ["attendance", "ATTENDANCE"], ["timetable", "TIMETABLE"], ["notices", "NOTICES"]].map(([k, t]) =>
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
    } else if (tab === "report") {
      cache.results ??= await api.getResults(who.id);
      cache.rc ??= await api.getReportCard(who);
      html = reportHtml(cache.results, cache.rc);
    } else if (tab === "attendance") {
      cache.att ??= role === "parent" ? await api.getChildAttendance(who.id) : await api.getStudentAttendance(who);
      html = attendanceHtml(cache.att);
    } else if (tab === "notices") {
      cache.notes ??= await api.getNotices(who.institutionId);
      html = noticesHtml(cache.notes.filter((n) => !n.programId ||
        (n.programId === who.programId && n.levelId === who.levelId && n.semesterId === who.semesterId)));
    } else {
      cache.tt ??= await api.getTimetable(who);
      html = timetableHtml(cache.tt);
    }
    if (mine !== tab || who !== subject) return;
    view.innerHTML = html;
    if (tab === "pay") wirePay(view);
    if (tab === "report") wireReport(view);
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

/* ---------- report card ---------- */
const rcNum = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const rcPretty = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : String(s || "");
};
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const bandFor = (scheme, percent) => scheme
  ? ([...scheme.bands].sort((a, b) => b.min - a.min).find((b) => percent >= b.min) || null) : null;

function reportHtml(all, rc) {
  const rows = all.filter((r) => typeof r.marks === "number" && typeof r.totalMarks === "number").map((r) => ({
    subject: r.unitName || r.subjectName || "Subject", code: r.unitCode || r.subjectCode || "",
    marks: r.marks, total: r.totalMarks, grade: r.grade || "-", points: num(r.points),
    comment: r.feedback || r.gradeRemark || "", assessment: r.assessment || "End of term", publishedAt: ms(r.publishedAt),
  }));
  if (!rows.length) return '<div class="empty">No results have been published yet, so there is no report card.</div>';

  const exams = [...new Set(rows.map((r) => r.assessment))];
  if (!exams.includes(rcExam)) rcExam = [...rows].sort((a, b) => b.publishedAt - a.publishedAt)[0].assessment;
  const shown = rows.filter((r) => r.assessment === rcExam).sort((a, b) => a.subject.toLowerCase().localeCompare(b.subject.toLowerCase()));

  const pct = (r) => (r.total > 0 ? (r.marks / r.total) * 100 : 0);
  const gradeOf = (r) => (r.grade && r.grade !== "-" ? r.grade : (bandFor(rc.scheme, pct(r))?.grade || "-"));
  const sumMarks = shown.reduce((s, r) => s + r.marks, 0);
  const sumTotal = shown.reduce((s, r) => s + r.total, 0);
  const average = shown.reduce((s, r) => s + pct(r), 0) / shown.length;
  const usesPoints = shown.some((r) => r.points > 0);
  const meanPoints = shown.reduce((s, r) => s + r.points, 0) / shown.length;
  const meanBand = usesPoints && rc.scheme
    ? [...rc.scheme.bands].sort((a, b) => Math.abs(a.points - meanPoints) - Math.abs(b.points - meanPoints) || b.points - a.points)[0] : null;
  const overall = bandFor(rc.scheme, average);

  const summ = rc.summaries.find((x) => slug(x.id) === slug(rcExam) || (x.assessment && slug(x.assessment) === slug(rcExam)));
  const position = summ && Number.isFinite(Number(summ.position)) && Number.isFinite(Number(summ.outOf))
    ? `${Number(summ.position)} out of ${Number(summ.outOf)}` : "";
  const principalRemark = (summ && summ.principalRemark) || "";
  const remarks = [...rc.remarks].sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).slice(0, 3).filter((r) => r.text);
  const set = rc.settings || {};
  const scale = rc.scheme ? [...rc.scheme.bands].sort((a, b) => b.min - a.min).map((b) => `${b.grade} ${rcNum(b.min)}%+`).join("  |  ") : "";
  const klass = [info.program, info.level, info.semester].filter(Boolean).join(" • ");

  const examChips = exams.length > 1 ? `<div class="months noprint">${exams.map((e) =>
    `<button class="tab" data-exam="${esc(e)}" aria-selected="${e === rcExam}">${esc(e.toUpperCase())}</button>`).join("")}</div>` : "";

  return `
  ${examChips}
  <section class="paper">
    <div class="paperhead">
      <h2>REPORT CARD</h2>
      ${info.institution ? `<div><b>${esc(info.institution)}</b></div>` : ""}
      <div>${esc(subject.fullName || "")}</div>
      <div class="muted small">${subject.admissionNumber || subject.admission ? "Admission no: " + esc(subject.admissionNumber || subject.admission) : ""}${klass ? " &middot; " + esc(klass) : ""}</div>
      <div class="chip info" style="margin-top:8px">${esc(rcExam.toUpperCase())}</div>
    </div>
    ${shown.map((r) => `
    <div class="card"><div class="row"><div><h3>${esc(r.subject)}${r.code ? " (" + esc(r.code) + ")" : ""}</h3>
      <div>Marks: ${esc(rcNum(r.marks))} / ${esc(rcNum(r.total))} (${esc(rcNum(pct(r)))}%)</div>
      ${r.comment ? `<div class="muted small">${esc(r.comment)}</div>` : ""}</div>
      <span class="chip ok">${esc(gradeOf(r))}</span></div></div>`).join("")}

    <div class="grid3">
      <div class="sum"><div class="k">TOTAL</div><div class="v">${esc(rcNum(sumMarks))} / ${esc(rcNum(sumTotal))}</div></div>
      <div class="sum"><div class="k">AVERAGE</div><div class="v">${esc(rcNum(average))}%${overall ? " &middot; " + esc(overall.grade) : ""}</div></div>
      ${position ? `<div class="sum"><div class="k">CLASS POSITION</div><div class="v">${esc(position)}</div></div>` : ""}
      ${usesPoints ? `<div class="sum"><div class="k">MEAN POINTS${meanBand ? " &middot; MEAN GRADE" : ""}</div><div class="v">${esc(meanPoints.toFixed(2))}${meanBand ? " &middot; " + esc(meanBand.grade) : ""}</div></div>` : ""}
    </div>
    ${overall && overall.remark ? `<p class="note">Overall: ${esc(overall.remark)}</p>` : ""}

    ${remarks.length ? `<h2>Teacher's remarks</h2>${remarks.map((r) => `<div class="card">${esc(r.text)}<div class="muted small">— ${esc(r.teacherName || "Teacher")}</div></div>`).join("")}` : ""}
    ${principalRemark ? `<h2>Principal's remark</h2><div class="card">${esc(principalRemark)}${set.principalName ? `<div class="muted small">— ${esc(set.principalName)}</div>` : ""}</div>` : ""}
    ${set.closingDate || set.nextTermDate ? `<p class="small">${set.closingDate ? "Closing date: <b>" + esc(rcPretty(set.closingDate)) + "</b>" : ""}${set.closingDate && set.nextTermDate ? " &middot; " : ""}${set.nextTermDate ? "Next term opens: <b>" + esc(rcPretty(set.nextTermDate)) + "</b>" : ""}</p>` : ""}
    ${scale ? `<p class="muted small">Grading scale: ${esc(scale)}</p>` : ""}
  </section>
  <button class="btn noprint" id="rcPrint" type="button">PRINT OR SAVE AS PDF</button>`;
}

function wireReport(view) {
  view.querySelectorAll("[data-exam]").forEach((b) => (b.onclick = () => { rcExam = b.dataset.exam; renderView(); }));
  const p = view.querySelector("#rcPrint");
  if (p) p.onclick = () => window.print();
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

  // "pay ahead": the money is reported against the newest fee and kept as credit for the fees that come later
  const newest = [...fees].map((f) => ({ ...f, due: num(f.amountDue ?? f.amount) }))
    .sort((a, b) => String(b.dueDate || "").localeCompare(String(a.dueDate || "")) || ms(b.createdAt) - ms(a.createdAt))[0];
  const options = open.map((r) => `<option value="${esc(r.id)}" data-bal="${r.bal}" data-desc="${esc(r.description || "Fee")}">${esc(r.description || "Fee")} (balance ${esc(ksh(r.bal))})</option>`);
  if (newest) options.push(`<option value="${esc(newest.id)}" data-bal="0" data-adv="1" data-desc="Advance payment (pay ahead)">Pay ahead (advance for future fees)</option>`);
  const form = newest ? `
    <h2>Report your payment</h2>
    <form class="card" id="payForm" data-total="${total}" novalidate>
      <label for="payFee">Which fee are you paying?</label>
      <select id="payFee">${options.join("")}</select>
      <label for="payAmt">Amount you sent (KSh)</label>
      <input id="payAmt" type="number" inputmode="decimal" min="1" max="1000000" step="any" value="${open.length ? open[0].bal : ""}">
      ${open.length ? `<div class="qbtns"><button type="button" class="tab" id="qThis">THIS FEE</button><button type="button" class="tab" id="qAll">ALL FEES (${esc(ksh(total))})</button></div>` : ""}
      <p class="muted small">You can pay more than one fee at once. The extra goes to your next unpaid fees when the school confirms.</p>
      <p class="muted small">You can also pay ahead. Choose "Pay ahead" and any amount: it is kept as credit and covers your future fees.</p>
      <label for="payCode">M-Pesa code</label>
      <input id="payCode" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="e.g. QGH7K2LM9P">
      <label for="payPhone">Phone number you paid from</label>
      <input id="payPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 0712345678">
      <p class="msg" id="payMsg" role="alert" hidden></p>
      <button class="btn" id="payGo" type="submit">SEND PAYMENT REPORT</button>
    </form>` : '<div class="empty">No fees have been recorded yet, so there is nothing to pay.</div>';

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
  const qThis = form.querySelector("#qThis"), qAll = form.querySelector("#qAll");
  if (qThis) qThis.onclick = () => { amt.value = balOf() || ""; };
  if (qAll) qAll.onclick = () => { amt.value = Number(form.dataset.total) || ""; };
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

/* ---------- teacher pages: take attendance and enter class marks ---------- */
let teacherProfile = null, tUnits = [], tUnit = null, tTab = "attendance", tStudents = null, tScheme;
const underSlug = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const fullClass = (u) => [u.programName, u.levelName, u.semesterName].filter(Boolean).join(" • ");
const unitTitle = (u) => (u.unitCode ? `${u.unitName} (${u.unitCode})` : u.unitName || "Subject");

// the default exam name carries the term, so two terms never share one report card
function examNameFor(semesterName) {
  const base = applyTermsTo("End of term");
  const t = String(semesterName || "").trim();
  return t ? t + " - " + base : base;
}
// the same result ids as the Android app, so both stay in step
function resultIdFor(unitName, semesterId, exam) {
  const u = underSlug(unitName), e = underSlug(exam);
  const base = u ? `unit_${u}_${semesterId || "none"}` : "unit";
  return !e || e === "end_of_term" ? base : `${base}_${e}`;
}

async function renderTeacherHome() {
  tUnit = null; tStudents = null;
  root.innerHTML = `${topBar(false)}<main class="wrap">
    <section class="hero"><h1>${esc(teacherProfile.fullName || user.email || "Teacher")}</h1>
      <p>${esc(info.institution || "")}<br>Teacher dashboard</p></section>
    <h2>My subjects</h2>
    <div id="units"><p class="muted">Loading…</p></div>
    <h2>Announcements</h2>
    <div id="tnotes"><p class="muted">Loading…</p></div>
    <footer class="foot">Take attendance and enter class marks here. Homework and messages are in the ShuleHub app. &middot;
      <a href="../privacy.html">Privacy policy</a></footer></main>`;
  document.getElementById("out").onclick = () => api.signOut();
  const box = document.getElementById("units");
  try {
    tUnits = (await api.getAssignedUnits(user.uid)).sort((a, b) => unitTitle(a).localeCompare(unitTitle(b)));
  } catch (e) {
    box.innerHTML = '<p class="msg" role="alert">Could not load this page. Please check your internet and try again.</p>';
    return;
  }
  wireNotices(document.getElementById("tnotes"), tUnits, teacherProfile);
  if (!tUnits.length) {
    box.innerHTML = '<div class="empty">No subject has been assigned to you yet. Ask your administrator to assign your subjects.</div>';
    return;
  }
  box.innerHTML = tUnits.map((u, i) => `
    <button class="card child" data-i="${i}"><div class="row"><div>
      <h3>${esc(unitTitle(u))}</h3><div class="muted small">${esc(fullClass(u))}</div></div>
      <span class="chip info">OPEN</span></div></button>`).join("");
  box.querySelectorAll(".child").forEach((b) => (b.onclick = () => {
    tUnit = tUnits[Number(b.dataset.i)]; tTab = "attendance"; tStudents = null; renderTeacherUnit();
  }));
}

function renderTeacherUnit() {
  root.innerHTML = `${topBar(false)}<main class="wrap">
    <section class="hero"><h1>${esc(unitTitle(tUnit))}</h1><p>${esc(fullClass(tUnit))}</p></section>
    <button class="btn ghost" id="tback" style="margin-top:12px">BACK TO MY SUBJECTS</button>
    <nav class="tabs" role="tablist" aria-label="Sections" style="margin-top:12px">
      ${[["attendance", "ATTENDANCE"], ["marks", "CLASS MARKS"]].map(([k, t]) =>
        `<button class="tab" role="tab" data-tt="${k}" aria-selected="${k === tTab}">${t}</button>`).join("")}
    </nav>
    <div id="tview"></div></main>`;
  document.getElementById("out").onclick = () => api.signOut();
  document.getElementById("tback").onclick = () => renderTeacherHome();
  root.querySelectorAll("[data-tt]").forEach((b) => (b.onclick = () => { tTab = b.dataset.tt; renderTeacherUnit(); }));
  const view = document.getElementById("tview");
  view.innerHTML = '<p class="muted" style="margin-top:18px">Loading…</p>';
  const unit = tUnit, mine = tTab;
  (async () => {
    try {
      tStudents ??= await api.getClassStudents(teacherProfile.institutionId, unit);
      if (unit !== tUnit || mine !== tTab) return;
      if (mine === "attendance") await wireAttendance(view, unit); else await wireMarks(view, unit);
    } catch (e) {
      if (unit !== tUnit || mine !== tTab) return;
      view.innerHTML = `<p class="msg" role="alert">${e && e.code === "permission-denied"
        ? "You are not allowed to see this yet. Please try the ShuleHub app, or contact your school."
        : "Could not load this page. Please check your internet and try again."}</p>`;
    }
  })();
}

function noticesHtml(list) {
  if (!list.length) return '<div class="empty">No announcements yet.</div>';
  return [...list].sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).map((n) => `
    <div class="card" style="margin-top:8px"><h3 class="ut">${esc(n.title || "")}</h3>
      <div class="muted small">${esc(n.teacherName || "")}${n.unitName ? " \u2022 " + esc(n.unitName) : ""} \u2022 ${esc(when(num(n.createdAt)))}</div>
      <p class="ut" style="white-space:pre-wrap">${esc(n.message || "")}</p></div>`).join("");
}

// post and manage announcements (teacher: everyone or one subject; administrator: everyone)
async function wireNotices(box, units, profile) {
  let mine = [], msg = "";
  const draw = () => {
    box.innerHTML = `${msg ? `<p class="msg good" role="alert">${esc(msg)}</p>` : ""}
      <label for="nto">Who should see it?</label>
      <select id="nto"><option value="">All students in my institution</option>
        ${units.map((u, i) => `<option value="${i}">${esc(unitTitle(u))} class (${esc(fullClass(u))})</option>`).join("")}</select>
      <label for="nt">Title</label><input id="nt" type="text" maxlength="100">
      <label for="nm">Message</label><textarea id="nm" rows="5" maxlength="1000"></textarea>
      <p class="msg" id="nerr" role="alert" hidden></p>
      <button class="btn" id="npost" type="button">POST ANNOUNCEMENT</button>
      <h2>My previous announcements</h2>
      ${mine.length ? [...mine].sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).map((n) => `
        <div class="card" style="margin-top:8px"><h3 class="ut">${esc(n.title || "")}</h3>
          <div class="muted small">${n.unitName ? esc(n.unitName) : "Everyone"} \u2022 ${esc(when(num(n.createdAt)))}</div>
          <p class="ut" style="white-space:pre-wrap">${esc(n.message || "")}</p>
          <button class="btn ghost" data-del="${esc(n.id)}" type="button">DELETE</button></div>`).join("")
        : '<div class="empty">None yet.</div>'}`;
    const err = (t) => { const e = document.getElementById("nerr"); e.hidden = !t; e.textContent = t || ""; };
    document.getElementById("npost").onclick = async (ev) => {
      const title = document.getElementById("nt").value.trim(), body = document.getElementById("nm").value.trim();
      if (!title || !body) return err("Please enter a title and a message.");
      const v = document.getElementById("nto").value, u = v === "" ? null : units[Number(v)];
      ev.target.disabled = true; ev.target.textContent = "POSTING…"; err("");
      try {
        await api.postNotice({ title, message: body, teacherUid: user.uid, teacherName: profile.fullName || user.email || "",
          institutionId: profile.institutionId, programId: u ? u.programId || "" : "", levelId: u ? u.levelId || "" : "",
          semesterId: u ? u.semesterId || "" : "", unitName: u ? u.unitName || "" : "", createdAt: Date.now() });
        mine = await api.getMyNotices(user.uid); msg = "Announcement posted."; draw();
      } catch (e) {
        ev.target.disabled = false; ev.target.textContent = "POST ANNOUNCEMENT";
        err(e && e.code === "permission-denied" ? "You are not allowed to post this. Please use the ShuleHub app." : "Could not post. Please check your internet and try again.");
      }
    };
    box.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      if (!confirm("Delete this announcement? Students will no longer see it.")) return;
      try { await api.deleteNotice(b.dataset.del); mine = await api.getMyNotices(user.uid); msg = "Announcement deleted."; draw(); }
      catch (e) { alert("Could not delete. Please try again."); }
    }));
  };
  try { mine = await api.getMyNotices(user.uid); draw(); }
  catch (e) { box.innerHTML = '<p class="msg" role="alert">Could not load this page. Please check your internet and try again.</p>'; }
}

const STATUSES = ["present", "late", "absent", "excused"];

async function wireAttendance(view, unit) {
  if (!tStudents.length) { view.innerHTML = '<div class="empty">No students are assigned to this class yet.</div>'; return; }
  const status = {}, notes = {};
  let date = todayStr();
  view.innerHTML = `
    <label for="adate">Date</label>
    <input id="adate" type="date" value="${esc(date)}">
    <div class="qbtns"><button type="button" class="tab" id="allp">MARK ALL PRESENT</button></div>
    <div id="arows"></div>
    <p class="muted small" id="acount"></p>
    <p class="msg" id="amsg" role="alert" hidden></p>
    <button class="btn" id="asave" type="button">SAVE ATTENDANCE</button>`;
  const rows = view.querySelector("#arows"), count = view.querySelector("#acount"), msg = view.querySelector("#amsg");
  const say = (t, good) => { msg.hidden = !t; msg.textContent = t || ""; msg.className = "msg" + (good ? " good" : ""); };

  function paint() {
    rows.innerHTML = tStudents.map((s) => {
      const cur = status[s.uid] || "present";
      return `<div class="card" style="margin-top:8px"><div class="row"><div><h3>${esc(s.name)}</h3>
        <div class="muted small">Adm: ${esc(s.admission)}</div></div>
        <select data-st="${esc(s.uid)}" style="max-width:9.5em" aria-label="Status of ${esc(s.name)}">
          ${STATUSES.map((x) => `<option value="${x}" ${x === cur ? "selected" : ""}>${statusLabel(x)}</option>`).join("")}
        </select></div>
        ${cur !== "present" ? `<input data-note="${esc(s.uid)}" type="text" maxlength="100" value="${esc(notes[s.uid] || "")}"
          placeholder="Note (optional; the student and parent can see it)" style="margin-top:8px">` : ""}</div>`;
    }).join("");
    rows.querySelectorAll("[data-st]").forEach((el) => (el.onchange = () => {
      status[el.dataset.st] = el.value; if (el.value === "present") delete notes[el.dataset.st]; paint();
    }));
    rows.querySelectorAll("[data-note]").forEach((el) => (el.oninput = () => { notes[el.dataset.note] = el.value; }));
    const c = {}; tStudents.forEach((s) => { const k = status[s.uid] || "present"; c[k] = (c[k] || 0) + 1; });
    count.textContent = `Present ${c.present || 0}  •  Late ${c.late || 0}  •  Absent ${c.absent || 0}  •  Excused ${c.excused || 0}`;
  }

  async function loadDate() {
    say("");
    Object.keys(status).forEach((k) => delete status[k]); Object.keys(notes).forEach((k) => delete notes[k]);
    let reg = null;
    try { reg = await api.getRegister(unit.unitId, date); } catch (e) { /* none saved yet */ }
    if (reg && reg.records) tStudents.forEach((s) => {
      if (reg.records[s.uid]) status[s.uid] = reg.records[s.uid];
      if (reg.notes && reg.notes[s.uid]) notes[s.uid] = reg.notes[s.uid];
    });
    paint();
  }

  view.querySelector("#adate").onchange = (e) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { date = e.target.value; loadDate(); }
  };
  view.querySelector("#allp").onclick = () => { tStudents.forEach((s) => { status[s.uid] = "present"; delete notes[s.uid]; }); paint(); };
  view.querySelector("#asave").onclick = async (ev) => {
    const btn = ev.currentTarget; btn.disabled = true; btn.textContent = "SAVING…"; say("");
    const statuses = {}, noteMap = {};
    tStudents.forEach((s) => {
      statuses[s.uid] = status[s.uid] || "present";
      const n = (notes[s.uid] || "").trim();
      if (statuses[s.uid] !== "present" && n) noteMap[s.uid] = n;
    });
    try {
      await api.saveAttendance({ unit, institutionId: teacherProfile.institutionId, teacherUid: user.uid, date, statuses, notes: noteMap, students: tStudents });
      const attended = Object.values(statuses).filter((x) => x === "present" || x === "late").length;
      const absent = Object.values(statuses).filter((x) => x === "absent").length;
      say(`Attendance saved: ${attended} of ${tStudents.length} attended, ${absent} absent.`, true);
    } catch (e) {
      say(e && e.code === "permission-denied"
        ? "You are not allowed to save this. Check that this subject is assigned to you, or use the ShuleHub app."
        : "Could not save. Please check your internet and try again.");
    }
    btn.disabled = false; btn.textContent = "SAVE ATTENDANCE";
  };
  await loadDate();
}

async function wireMarks(view, unit) {
  if (!tStudents.length) { view.innerHTML = '<div class="empty">No students are assigned to this class yet.</div>'; return; }
  if (tScheme === undefined) tScheme = await api.getGrading(teacherProfile.institutionId);
  const scheme = tScheme;
  const marks = {};
  view.innerHTML = `
    ${scheme ? `<p class="muted small">Grading scale: ${esc(scheme.name)}</p>`
      : '<div class="note">Your school has not set a grading scale yet. Ask your administrator to open GRADING SCALE in the ShuleHub app. You cannot save marks until then.</div>'}
    <label for="mexam">Exam (for example CAT 1, Mid-term, End of term)</label>
    <input id="mexam" type="text" maxlength="60" value="${esc(examNameFor(unit.semesterName))}">
    <label for="mtotal">Total marks</label>
    <input id="mtotal" type="number" inputmode="decimal" min="1" step="any" value="100">
    <div id="mrows"></div>
    <p class="msg" id="mmsg" role="alert" hidden></p>
    <button class="btn" id="msave" type="button" ${scheme ? "" : "disabled"}>SAVE ALL MARKS</button>`;
  const rows = view.querySelector("#mrows"), msg = view.querySelector("#mmsg");
  const totalEl = view.querySelector("#mtotal"), examEl = view.querySelector("#mexam");
  const say = (t, good) => { msg.hidden = !t; msg.textContent = t || ""; msg.className = "msg" + (good ? " good" : ""); };
  const gradeOf = (m, t) => {
    if (!scheme || !(t > 0) || !Number.isFinite(m)) return null;
    const pct = (m / t) * 100;
    return [...scheme.bands].sort((a, b) => b.min - a.min).find((b) => pct >= b.min) || null;
  };
  rows.innerHTML = tStudents.map((s) => `<div class="card" style="margin-top:8px"><div class="row"><div>
      <h3>${esc(s.name)}</h3><div class="muted small">Adm: ${esc(s.admission)}</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <input data-m="${esc(s.uid)}" type="number" inputmode="decimal" min="0" step="any" style="width:6.5em" aria-label="Marks for ${esc(s.name)}" placeholder="Marks">
        <b data-g="${esc(s.uid)}" style="min-width:2.4em"></b></div></div></div>`).join("");
  const regrade = () => {
    const t = Number(totalEl.value);
    rows.querySelectorAll("[data-m]").forEach((el) => {
      const g = gradeOf(Number(el.value), t);
      rows.querySelector(`[data-g="${CSS.escape(el.dataset.m)}"]`).textContent = el.value.trim() && g ? g.grade : "";
    });
  };
  const typed = new Set();   // boxes the teacher has typed in: saved marks must never overwrite these
  rows.querySelectorAll("[data-m]").forEach((el) => (el.oninput = () => { typed.add(el.dataset.m); marks[el.dataset.m] = el.value; regrade(); }));
  totalEl.oninput = regrade;
  // show marks already saved for this exam so a teacher can correct them instead of starting blank
  let shownExam = null;
  const showSaved = async () => {
    const exam = examEl.value.trim();
    if (!exam || exam === shownExam) return;
    if (shownExam !== null) typed.clear();   // a different exam: start fresh
    shownExam = exam;
    let saved = {};
    try { saved = await api.getSavedMarks(unit, exam, tStudents); } catch (e) { saved = {}; }
    if (exam !== examEl.value.trim()) return;
    const ids = Object.keys(saved);
    rows.querySelectorAll("[data-m]").forEach((el) => {
      if (typed.has(el.dataset.m)) return;
      const r = saved[el.dataset.m];
      el.value = r && Number.isFinite(Number(r.marks)) ? String(r.marks) : "";
      marks[el.dataset.m] = el.value;
    });
    if (ids.length) totalEl.value = String(saved[ids[0]].totalMarks);
    regrade();
    say(ids.length ? `Showing ${ids.length} mark${ids.length === 1 ? "" : "s"} you already saved for ${exam}. Change them and save to correct them.` : "", true);
  };
  examEl.onchange = showSaved;
  showSaved();

  view.querySelector("#msave").onclick = async (ev) => {
    const btn = ev.currentTarget; say("");
    const total = Number(totalEl.value), exam = examEl.value.trim();
    if (!(total > 0)) return say("Enter the total marks, for example 100.");
    if (!exam) return say("Enter the exam name.");
    const entries = [];
    for (const s of tStudents) {
      const raw = String(marks[s.uid] ?? "").trim();
      if (!raw) continue;
      const m = Number(raw);
      if (!Number.isFinite(m) || m < 0 || m > total) return say(`Check the marks for ${s.name}. They must be a number from 0 to ${total}.`);
      entries.push({ student: s, marks: m, band: gradeOf(m, total) });
    }
    if (!entries.length) return say("Enter marks for at least one student.");
    btn.disabled = true; btn.textContent = "SAVING…";
    try {
      await api.saveMarks({ unit, institutionId: teacherProfile.institutionId, teacher: teacherProfile, teacherUid: user.uid, exam, total, entries });
      say(`Saved marks for ${entries.length} student${entries.length === 1 ? "" : "s"} (${exam}). Grades came from your school's grading scale.`, true);
    } catch (e) {
      say(e && e.code === "permission-denied"
        ? "You are not allowed to save these marks. Check that this subject is assigned to you, or use the ShuleHub app."
        : "Could not save. Please check your internet and try again.");
    }
    btn.disabled = false; btn.textContent = "SAVE ALL MARKS";
  };
}

/* ---------- administrator page: confirm or reject payments ---------- */
let adminProfile = null, aPays = null, aOpen = "", aMsg = "";
const when = (t) => (t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

let aTab = "payments", aReqs = null;

async function renderAdminHome() {
  const heading = aTab === "students" ? "Students waiting for approval" : aTab === "notices" ? "Announcements" : aTab === "roll" ? "Students by class" : "Payments to confirm";
  root.innerHTML = `${topBar(false)}<main class="wrap">
    <section class="hero"><h1>${esc(adminProfile.fullName || user.email || "Administrator")}</h1>
      <p>${esc(info.institution || "")}<br>Administrator dashboard</p></section>
    <nav class="tabs" role="tablist" aria-label="Sections">
      ${[["payments", "PAYMENTS"], ["students", "NEW STUDENTS"], ["roll", "ALL STUDENTS"], ["notices", "NOTICES"]].map(([k, t]) =>
        `<button class="tab" role="tab" data-at="${k}" aria-selected="${k === aTab}">${t}</button>`).join("")}
    </nav>
    <h2>${heading}</h2>
    <div id="apay"><p class="muted">Loading…</p></div>
    <footer class="foot">Confirm payments, approve new students and post announcements here. Everything else is in the ShuleHub app. &middot;
      <a href="../privacy.html">Privacy policy</a></footer></main>`;
  document.getElementById("out").onclick = () => api.signOut();
  root.querySelectorAll("[data-at]").forEach((b) => (b.onclick = () => { aTab = b.dataset.at; aOpen = ""; aMsg = ""; renderAdminHome(); }));
  const box = document.getElementById("apay");
  const failed = (e) => {
    box.innerHTML = `<p class="msg" role="alert">${e && e.code === "permission-denied"
      ? "You are not allowed to see this yet. Please try the ShuleHub app, or contact your school."
      : "Could not load this page. Please check your internet and try again."}</p>`;
  };
  try {
    if (aTab === "notices") return wireNotices(box, [], adminProfile);
    if (aTab === "roll") return wireRoll(box);
    if (aTab === "students") {
      aReqs = (await api.getPendingStudents(adminProfile.institutionId)).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
      return paintAdminStudents();
    }
    aPays = (await api.getPendingPayments(adminProfile.institutionId)).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  } catch (e) { return failed(e); }
  paintAdminPays();
}

// read-only list of every student, grouped by class, with a search box
async function wireRoll(box) {
  const all = await api.getAllStudents(adminProfile.institutionId);
  const keys = [...new Set(all.map((x) => [x.programId, x.levelId, x.semesterId].join("|")))];
  const names = {};
  await Promise.all(keys.map(async (k) => {
    const [programId, levelId, semesterId] = k.split("|");
    try {
      const n = programId ? await api.getClassNames({ institutionId: adminProfile.institutionId, programId, levelId, semesterId }) : {};
      names[k] = [n.program, n.level, n.semester].filter(Boolean).join(" \u2022 ");
    } catch (e) { names[k] = ""; }
  }));
  box.innerHTML = `<label for="rq">Search by name or admission number</label><input id="rq" type="search" autocomplete="off">
    <p class="muted small" id="rcount"></p><div id="rlist"></div>`;
  const paint = () => {
    const q = document.getElementById("rq").value.trim().toLowerCase();
    const hit = all.filter((x) => !q || (x.fullName || "").toLowerCase().includes(q) || String(x.admissionNumber || "").toLowerCase().includes(q));
    document.getElementById("rcount").textContent = hit.length + " of " + all.length + " students";
    const groups = {};
    hit.forEach((x) => { const k = [x.programId, x.levelId, x.semesterId].join("|"); (groups[k] ||= []).push(x); });
    const order = Object.keys(groups).sort((a, b) => (names[a] || "\uffff").localeCompare(names[b] || "\uffff"));
    document.getElementById("rlist").innerHTML = order.length ? order.map((k) => `
      <h3 style="margin-top:16px">${esc(names[k] || "No class assigned yet")} <span class="muted small">(${groups[k].length})</span></h3>
      ${groups[k].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "")).map((x) => `
        <div class="card" style="margin-top:6px"><div class="row"><div><h3 class="ut">${esc(x.fullName || "")}</h3>
          <div class="muted small">Adm: <span class="ut">${esc(x.admissionNumber || "")}</span></div></div></div>
          ${x.phone || x.email ? `<div class="muted small ut">${esc([x.phone, x.email].filter(Boolean).join(" \u2022 "))}</div>` : ""}</div>`).join("")}`).join("")
      : '<div class="empty">No students found.</div>';
  };
  document.getElementById("rq").oninput = paint;
  paint();
}

function paintAdminStudents() {
  const box = document.getElementById("apay");
  const note = aMsg ? `<p class="msg good" role="alert">${esc(aMsg)}</p>` : "";
  if (!aReqs.length) { box.innerHTML = note + '<div class="empty">No new students are waiting for approval.</div>'; return; }
  box.innerHTML = note + aReqs.map((r) => {
    const open = aOpen === r.id;
    return `<div class="card" style="margin-top:8px">
      <button class="linkbtn" data-open="${esc(r.id)}" style="text-align:left;width:100%"><div class="row"><div>
        <h3>${esc(r.fullName || "Unnamed student")}</h3>
        <div class="muted small">Adm: ${esc(r.admissionNumber || "")}</div></div>
        <span class="chip warn">${open ? "CLOSE" : "REVIEW"}</span></div></button>
      ${open ? `<div style="margin-top:10px">
        <div class="muted small">Email: ${esc(r.email || "")}</div>
        <div class="muted small">Phone: ${esc(r.phone || "")}</div>
        <div class="muted small">Admission number: ${esc(r.admissionNumber || "")}</div>
        <div class="muted small">Submitted: ${esc(when(num(r.createdAt)))}</div>
        <p class="note">Approve only students you know. You can assign their class afterwards in the ShuleHub app.</p>
        <p class="msg" id="rmsg" role="alert" hidden></p>
        <button class="btn" data-ok="${esc(r.id)}" type="button">APPROVE</button>
        <label for="rr">Or reject. Reason (shown to the student)</label>
        <input id="rr" type="text" maxlength="120">
        <button class="btn ghost" data-no="${esc(r.id)}" type="button">REJECT</button></div>` : ""}</div>`;
  }).join("");
  const find = (id) => aReqs.find((x) => x.id === id);
  const say = (t) => { const m = document.getElementById("rmsg"); if (m) { m.hidden = !t; m.textContent = t || ""; } };
  box.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { aOpen = aOpen === b.dataset.open ? "" : b.dataset.open; aMsg = ""; paintAdminStudents(); }));
  box.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = async () => {
    b.disabled = true; b.textContent = "PLEASE WAIT…"; say("");
    try {
      await api.approveStudent(find(b.dataset.ok), adminProfile.institutionId);
      aMsg = "Student approved. They can log in now. Assign their class in the ShuleHub app.";
      aReqs = aReqs.filter((x) => x.id !== b.dataset.ok); aOpen = ""; paintAdminStudents();
    } catch (e) {
      b.disabled = false; b.textContent = "APPROVE";
      say(e && e.code === "permission-denied" ? "You are not allowed to approve this. Please use the ShuleHub app."
        : e && e.userMessage ? e.userMessage : "Could not approve. Please check your internet and try again.");
    }
  }));
  box.querySelectorAll("[data-no]").forEach((b) => (b.onclick = async () => {
    const reason = (document.getElementById("rr").value || "").trim();
    if (!reason) return say("Please enter a reason for rejecting.");
    b.disabled = true; say("");
    try {
      await api.rejectStudent(find(b.dataset.no), reason, user.uid);
      aMsg = "Student request rejected. The reason is shown to the student.";
      aReqs = aReqs.filter((x) => x.id !== b.dataset.no); aOpen = ""; paintAdminStudents();
    } catch (e) {
      b.disabled = false;
      say(e && e.code === "permission-denied" ? "You are not allowed to reject this. Please use the ShuleHub app."
        : "Could not reject. Please check your internet and try again.");
    }
  }));
}

function paintAdminPays() {
  const box = document.getElementById("apay");
  const note = aMsg ? `<p class="msg good" role="alert">${esc(aMsg)}</p>` : "";
  if (!aPays.length) { box.innerHTML = note + '<div class="empty">No payments are waiting for you.</div>'; return; }
  box.innerHTML = note + aPays.map((p) => {
    const code = p.mpesaCode || p.id, open = aOpen === p.id;
    return `<div class="card" style="margin-top:8px">
      <button class="linkbtn" data-open="${esc(p.id)}" style="text-align:left;width:100%"><div class="row"><div>
        <h3>${esc(p.studentName || "Student")} &middot; ${esc(ksh(p.amount))}</h3>
        <div class="muted small">${esc(p.feeDescription || "Fee")} &middot; ${esc(code)}</div></div>
        <span class="chip warn">${open ? "CLOSE" : "REVIEW"}</span></div></button>
      ${open ? `<div style="margin-top:10px">
        <div class="muted small">Admission number: ${esc(p.admissionNumber || "")}</div>
        <div class="muted small">M-Pesa code: <b>${esc(code)}</b></div>
        <div class="muted small">Paid from: ${esc(p.phone || "")}</div>
        ${p.parentName ? `<div class="muted small">Paid by parent: ${esc(p.parentName)}</div>` : ""}
        <div class="muted small">Submitted: ${esc(when(num(p.createdAt)))}</div>
        <p class="msg" id="rmsg" role="alert" hidden></p>
        <button class="btn" data-ok="${esc(p.id)}" type="button">CONFIRM PAYMENT</button>
        <label for="rr">Or reject it. Reason (shown to the student)</label>
        <input id="rr" type="text" maxlength="120">
        <button class="btn ghost" data-no="${esc(p.id)}" type="button">REJECT PAYMENT</button></div>` : ""}</div>`;
  }).join("");
  const find = (id) => aPays.find((x) => x.id === id);
  const say = (t) => { const m = document.getElementById("rmsg"); if (m) { m.hidden = !t; m.textContent = t || ""; } };
  box.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { aOpen = aOpen === b.dataset.open ? "" : b.dataset.open; aMsg = ""; paintAdminPays(); }));
  box.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = async () => {
    b.disabled = true; b.textContent = "PLEASE WAIT…"; say("");
    try {
      const r = await api.confirmPayment(find(b.dataset.ok), user.uid);
      aMsg = "Payment confirmed." + (r && r.warning ? " " + r.warning : "");
      aPays = aPays.filter((x) => x.id !== b.dataset.ok); aOpen = ""; paintAdminPays();
    } catch (e) {
      b.disabled = false; b.textContent = "CONFIRM PAYMENT";
      say(e && e.code === "permission-denied" ? "You are not allowed to confirm this. Please use the ShuleHub app."
        : e && e.userMessage ? e.userMessage : "Could not confirm the payment. Please check your internet and try again.");
    }
  }));
  box.querySelectorAll("[data-no]").forEach((b) => (b.onclick = async () => {
    const reason = (document.getElementById("rr").value || "").trim();
    if (!reason) return say("Please enter a reason for rejecting.");
    b.disabled = true; say("");
    try {
      await api.rejectPayment(find(b.dataset.no), reason);
      aMsg = "Payment rejected."; aPays = aPays.filter((x) => x.id !== b.dataset.no); aOpen = ""; paintAdminPays();
    } catch (e) {
      b.disabled = false;
      say(e && e.code === "permission-denied" ? "You are not allowed to reject this. Please use the ShuleHub app."
        : "Could not reject the payment. Please check your internet and try again.");
    }
  }));
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
