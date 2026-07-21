// ====== إعدادات الاتصال بـ Supabase ======
// هذا الملف مشترك لكل الشاشات - لا تكرر هذي القيم بأي مكان ثاني

const SUPABASE_URL = "https://mqbmkkuntmueugqcquiq.supabase.co";
const SUPABASE_KEY = "sb_publishable_XJOMj3TnWfcPVoScWyeVrA_TnFq4JoM";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ====== أدوات مساعدة لتحويل رقم الهاتف ======
function normalizePhone(rawPhone) {
  let digits = rawPhone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) {
    digits = "964" + digits.slice(1);
  }
  if (!digits.startsWith("964")) {
    digits = "964" + digits;
  }
  return digits;
}

function phoneToInternalEmail(rawPhone) {
  const digits = normalizePhone(rawPhone);
  return digits + "@invest-app.local";
}

// يحول رقم مثل "0770 123 4567" إلى صيغة E.164 المطلوبة لتحقق Supabase بالـ SMS: "+9647701234567"
function toE164(rawPhone) {
  return "+" + normalizePhone(rawPhone);
}

function escapeAttr(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showFormMessage(elementId, text, isError) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
  el.style.color = isError ? "#E5675A" : "#8FC98D";
}

function generateReferralCode(fullName) {
  const namePart = (fullName || "USR").replace(/\s/g, "").slice(0, 4).toUpperCase();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return namePart + randomPart;
}

// ====== تنسيق الأرقام بالأرقام العربية (كما تظهر بتصميم الواجهة) ======
function toArabicDigits(str) {
  const map = { "0":"٠","1":"١","2":"٢","3":"٣","4":"٤","5":"٥","6":"٦","7":"٧","8":"٨","9":"٩" };
  return String(str).replace(/[0-9]/g, d => map[d]);
}

// يحول رقم مثل 12540.5 إلى "١٢,٥٤٠.٥٠"
function formatMoney(num, withArabicDigits) {
  const n = Number(num) || 0;
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return withArabicDigits === false ? formatted : toArabicDigits(formatted);
}

// يحول نسبة مثل 2.6 إلى "+٢.٦٪" أو "-٢.٦٪"
function formatPercent(num, withArabicDigits) {
  const n = Number(num) || 0;
  const sign = n >= 0 ? '+' : '-';
  const formatted = Math.abs(n).toFixed(1);
  const body = withArabicDigits === false ? formatted : toArabicDigits(formatted);
  return sign + body + '٪';
}

// ====== الوضع الليلي/النهاري: يطبّق على كل الشاشات تلقائياً (الكلاس مخزّن بالمتصفح محلياً) ======
function applySavedTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light-theme', saved === 'light');
  document.documentElement.style.colorScheme = saved;
  return saved;
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applySavedTheme();
}

applySavedTheme();

// ====== حارس الجلسة: يتأكد إن المستخدم مسجل دخول، وإلا يرجعه لصفحة الدخول ======
// كذلك يتأكد إن الحساب مو مجمّد من طرف الإدمن (is_frozen) - إذا مجمّد يسجّل خروج تلقائي
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    location.href = '02-login.html';
    return null;
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_frozen, deleted_at')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile && profile.deleted_at) {
    await supabaseClient.auth.signOut();
    alert('هذا الحساب محذوف.');
    location.href = '02-login.html';
    return null;
  }

  if (profile && profile.is_frozen === true) {
    await supabaseClient.auth.signOut();
    alert('حسابك مجمّد حالياً. تواصل مع الدعم لمزيد من التفاصيل.');
    location.href = '02-login.html';
    return null;
  }

  return session.user;
}

// ====== حارس صفحات الإدمن: يتأكد إن المستخدم مسجل دخول وإدمن فعلاً ======
async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.is_admin !== true) {
    location.href = '06-dashboard.html';
    return null;
  }
  return user;
         }
      
