import express from "express";
import cors from "cors";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.API_PORT || 3001;

// ── Supabase clients ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getServiceClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function getUserClient(authHeader) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const client = getUserClient(authHeader);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", allowedHeaders: ["authorization", "x-client-info", "apikey", "content-type"] }));
app.use(express.json({ limit: "50mb" }));

// ── Rate limiting (in-memory) ─────────────────────────────────────────────────
const rateLimitMap = new Map();
function isRateLimited(key, maxReq = 15, windowMs = 60000) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxReq) return true;
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAZORPAY
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/create-razorpay-order", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: "course_id is required" });

    const serviceClient = getServiceClient();
    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .select("id, title, price")
      .eq("id", course_id)
      .single();

    if (courseError || !course) return res.status(404).json({ error: "Course not found" });
    if (!course.price || course.price <= 0) return res.status(400).json({ error: "This course is free. Use free enrollment." });

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return res.status(500).json({ error: "Razorpay not configured" });

    const amountInPaise = Math.round(course.price * 100);
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `course_${course_id}_user_${user.id.slice(0, 8)}`,
        notes: { course_id: course_id.toString(), user_id: user.id, course_title: course.title },
      }),
    });

    if (!rzpRes.ok) return res.status(500).json({ error: "Failed to create Razorpay order" });
    const rzpOrder = await rzpRes.json();

    await serviceClient.from("razorpay_payments").insert({
      user_id: user.id,
      course_id,
      razorpay_order_id: rzpOrder.id,
      amount: course.price,
      currency: "INR",
      status: "pending",
    });

    res.json({ order_id: rzpOrder.id, amount: amountInPaise, currency: "INR", key_id: RAZORPAY_KEY_ID, course_title: course.title });
  } catch (e) {
    console.error("create-razorpay-order error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/verify-razorpay-payment", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, course_id } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !course_id)
      return res.status(400).json({ error: "Missing required fields" });

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    if (!RAZORPAY_KEY_SECRET) return res.status(500).json({ error: "Razorpay not configured" });

    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) return res.status(400).json({ error: "Payment verification failed: invalid signature" });

    const serviceClient = getServiceClient();

    await serviceClient.from("razorpay_payments").update({
      razorpay_payment_id,
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("razorpay_order_id", razorpay_order_id).eq("user_id", user.id);

    const { data: existing } = await serviceClient.from("enrollments")
      .select("id").eq("user_id", user.id).eq("course_id", course_id).eq("status", "active").maybeSingle();

    if (existing) return res.json({ success: true, enrollment_id: existing.id, message: "Already enrolled" });

    const { data: enrollment, error: enrollErr } = await serviceClient.from("enrollments")
      .upsert({ user_id: user.id, course_id: Number(course_id), status: "active", purchased_at: new Date().toISOString() }, { onConflict: "user_id,course_id", ignoreDuplicates: false })
      .select("id").single();

    if (enrollErr) return res.status(500).json({ error: "Payment verified but enrollment failed. Contact support." });
    res.json({ success: true, enrollment_id: enrollment.id });
  } catch (e) {
    console.error("verify-razorpay-payment error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════════════════════════════════

async function generateZoomSignature(sdkKey, sdkSecret, meetingNumber, role) {
  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const toB64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const header = toB64({ alg: "HS256", typ: "JWT" });
  const payload = toB64({ sdkKey, mn: meetingNumber, role, iat, exp, tokenExp: exp });
  const message = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", sdkSecret).update(message).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${message}.${sig}`;
}

app.post("/api/get-zoom-signature", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const { meetingNumber, role = 0 } = req.body;
    if (!meetingNumber) return res.status(400).json({ error: "meetingNumber is required" });

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;
    if (!sdkKey || !sdkSecret) return res.status(500).json({ error: "Zoom SDK credentials not configured" });

    const signature = await generateZoomSignature(sdkKey, sdkSecret, meetingNumber, role);
    res.json({ signature, sdkKey });
  } catch (e) {
    console.error("get-zoom-signature error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function getZoomAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) throw new Error("Zoom credentials not configured");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!response.ok) throw new Error(`Zoom OAuth failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

app.post("/api/create-zoom-meeting", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const { sessionId, topic, startTime, duration = 60 } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const serviceClient = getServiceClient();

    // Check admin/teacher role
    const { data: roleData } = await serviceClient.from("user_roles").select("role")
      .eq("user_id", user.id).in("role", ["admin", "teacher"]).maybeSingle();
    if (!roleData) return res.status(403).json({ error: "Only admins or teachers can create meetings" });

    const accessToken = await getZoomAccessToken();
    const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic || "Doubt Session",
        type: startTime ? 2 : 1,
        start_time: startTime || undefined,
        duration: Number(duration),
        settings: { host_video: true, participant_video: true, waiting_room: false, join_before_host: true },
      }),
    });

    if (!meetingRes.ok) {
      const errText = await meetingRes.text();
      throw new Error(`Zoom meeting creation failed: ${meetingRes.status} ${errText}`);
    }
    const meeting = await meetingRes.json();

    await serviceClient.from("doubt_sessions").update({
      zoom_meeting_id: meeting.id?.toString(),
      zoom_join_url: meeting.join_url,
      zoom_password: meeting.password,
      zoom_meeting_number: meeting.id?.toString(),
      status: "scheduled",
      teacher_id: user.id,
      scheduled_at: startTime || new Date().toISOString(),
    }).eq("id", sessionId);

    res.json({
      meetingId: meeting.id,
      meetingNumber: meeting.id?.toString(),
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      password: meeting.password,
      topic: meeting.topic,
    });
  } catch (e) {
    console.error("create-zoom-meeting error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ SCORING
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/score-quiz", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const { quiz_id, answers, time_taken_seconds } = req.body;
    if (!quiz_id || typeof answers !== "object") return res.status(400).json({ error: "Missing quiz_id or answers" });

    const serviceClient = getServiceClient();

    const { data: quiz, error: quizError } = await serviceClient.from("quizzes")
      .select("id, total_marks, pass_percentage").eq("id", quiz_id).single();
    if (quizError || !quiz) return res.status(404).json({ error: "Quiz not found" });

    const { data: questions, error: questionsError } = await serviceClient.from("questions")
      .select("id, correct_answer, marks, negative_marks").eq("quiz_id", quiz_id);
    if (questionsError || !questions) return res.status(500).json({ error: "Failed to fetch questions" });

    let score = 0;
    for (const q of questions) {
      const userAnswer = answers[q.id];
      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== "") {
        if (userAnswer === q.correct_answer) score += q.marks ?? 4;
        else score -= q.negative_marks ?? 0;
      }
    }

    const totalMarks = quiz.total_marks || questions.reduce((s, q) => s + (q.marks ?? 4), 0);
    score = Math.max(0, score);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
    const passed = percentage >= (quiz.pass_percentage ?? 40);

    const { data: attempt, error: insertError } = await serviceClient.from("quiz_attempts")
      .insert({ user_id: user.id, quiz_id, submitted_at: new Date().toISOString(), score, percentage, passed, answers, time_taken_seconds: time_taken_seconds ?? 0 })
      .select("id").single();

    if (insertError || !attempt) return res.status(500).json({ error: "Failed to save attempt" });
    res.json({ attempt_id: attempt.id, score, percentage, passed, total_marks: totalMarks });
  } catch (e) {
    console.error("score-quiz error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET LESSON URL
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveStoragePath(serviceClient, url) {
  if (!url || !url.startsWith("storage://")) return url;
  const withoutPrefix = url.slice("storage://".length);
  const slashIdx = withoutPrefix.indexOf("/");
  if (slashIdx === -1) return url;
  const bucket = withoutPrefix.slice(0, slashIdx);
  const filePath = withoutPrefix.slice(slashIdx + 1);
  const { data, error } = await serviceClient.storage.from(bucket).createSignedUrl(filePath, 3600);
  if (error) return url;
  return data.signedUrl;
}

app.post("/api/get-lesson-url", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const { lesson_id } = req.body;
    if (!lesson_id) return res.status(400).json({ error: "lesson_id is required" });

    const serviceClient = getServiceClient();

    const { data: lesson, error: lessonError } = await serviceClient.from("lessons")
      .select("id, title, video_url, class_pdf_url, is_locked, course_id, lecture_type").eq("id", lesson_id).single();
    if (lessonError || !lesson) return res.status(404).json({ error: "Lesson not found" });

    const { data: roleData } = await serviceClient.from("user_roles")
      .select("role").eq("user_id", user.id).in("role", ["admin", "teacher"]).maybeSingle();
    const isAdminOrTeacher = !!roleData;

    if (!lesson.is_locked || isAdminOrTeacher) {
      return res.json({
        video_url: await resolveStoragePath(serviceClient, lesson.video_url),
        class_pdf_url: await resolveStoragePath(serviceClient, lesson.class_pdf_url),
        lecture_type: lesson.lecture_type,
      });
    }

    const { data: enrollment } = await serviceClient.from("enrollments").select("id")
      .eq("user_id", user.id).eq("course_id", lesson.course_id).eq("status", "active").maybeSingle();
    if (!enrollment) return res.status(403).json({ error: "Purchase required to access this lesson" });

    res.json({
      video_url: await resolveStoragePath(serviceClient, lesson.video_url),
      class_pdf_url: await resolveStoragePath(serviceClient, lesson.class_pdf_url),
      lecture_type: lesson.lecture_type,
    });
  } catch (e) {
    console.error("get-lesson-url error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUNNY CDN
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/bunny-cdn", async (req, res) => {
  try {
    const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
    const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
    const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;
    const BUNNY_STORAGE_HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com";

    if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE) return res.status(500).json({ error: "Bunny.net credentials not configured" });

    const { action, fileName, fileBase64, contentType, folder } = req.body;

    if (action === "upload") {
      if (!fileName || !fileBase64) return res.status(400).json({ error: "Missing fileName or fileBase64" });
      const binaryData = Buffer.from(fileBase64, "base64");
      const uploadUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${fileName}`;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { AccessKey: BUNNY_API_KEY, "Content-Type": contentType || "application/octet-stream" },
        body: binaryData,
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return res.status(500).json({ error: `Upload failed: ${errText}` });
      }
      const cdnBase = BUNNY_CDN_HOSTNAME || `${BUNNY_STORAGE_ZONE}.b-cdn.net`;
      return res.json({ success: true, cdnUrl: `https://${cdnBase}/${fileName}`, fileName });
    }

    if (action === "list") {
      const listPath = folder ? `${BUNNY_STORAGE_ZONE}/${folder}/` : `${BUNNY_STORAGE_ZONE}/`;
      const listRes = await fetch(`https://${BUNNY_STORAGE_HOSTNAME}/${listPath}`, {
        headers: { AccessKey: BUNNY_API_KEY, Accept: "application/json" },
      });
      if (!listRes.ok) return res.status(500).json({ error: "List failed" });
      const files = await listRes.json();
      const cdnBase = BUNNY_CDN_HOSTNAME || `${BUNNY_STORAGE_ZONE}.b-cdn.net`;
      return res.json({ files: files.map((f) => ({ name: f.ObjectName, cdnUrl: `https://${cdnBase}/${folder ? folder + "/" : ""}${f.ObjectName}`, size: f.Length })) });
    }

    if (action === "stream-url") {
      if (!fileName) return res.status(400).json({ error: "Missing fileName" });
      const cdnBase = BUNNY_CDN_HOSTNAME || `${BUNNY_STORAGE_ZONE}.b-cdn.net`;
      return res.json({ cdnUrl: `https://${cdnBase}/${fileName}` });
    }

    res.status(400).json({ error: "Unknown action. Use: upload, list, stream-url" });
  } catch (e) {
    console.error("bunny-cdn error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI / CHATBOT (Sarathi)
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCKED_DOMAINS = new Set([
  "mailinator.com","tempmail.com","guerrillamail.com","yopmail.com","throwaway.email",
  "fakeinbox.com","sharklasers.com","grr.la","dispostable.com","trashmail.com",
  "10minutemail.com","tempail.com","burnermail.io","maildrop.cc","getairmail.com",
  "temp-mail.org","emailondeck.com","mintemail.com","mailcatch.com",
]);
const BLOCKED_PATTERNS = ["tempmail","throwaway","disposable","guerrilla","fakeinbox","trashmail","mailinator","yopmail"];

app.post("/api/validate-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") return res.status(400).json({ blocked: true, reason: "Invalid email" });
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return res.json({ blocked: true, reason: "Invalid email" });
    const blocked = BLOCKED_DOMAINS.has(domain) || BLOCKED_PATTERNS.some((p) => domain.includes(p));
    res.json({ blocked, reason: blocked ? "Disposable email not allowed" : null });
  } catch (e) {
    res.status(500).json({ blocked: false, error: "Server error" });
  }
});

function classifyQuery(msg) {
  const m = msg.toLowerCase();
  if (/course|syllabus|chapter|lesson|video|pdf|notes|subject|class\s*\d|enroll|price|fee|batch/.test(m)) return "course";
  if (/mock|test|quiz|exam|question|doubt|solve|answer|neet|jee|board|marks|score/.test(m)) return "mock_test";
  if (/login|password|video.*not|pdf.*not|error|problem|issue|download|app|install|payment|receipt/.test(m)) return "technical";
  if (/sad|depressed|fail|scared|anxious|stressed|worried|give up|hopeless|tired|demotiv|tension/.test(m)) return "emotional";
  if (/weather|cricket|movie|politics|news|sport|bollywood|celebrity|recipe|joke/.test(m)) return "offTopic";
  return "general";
}

const emotionalResponses = [
  "💛 Yaar, main samajhta hoon yeh waqt mushkil lag raha hai. Lekin yaad rakho – **har successful student ne yahi struggle kiya hai.**\n\n🌟 **Tumhare liye 3 steps:**\n1. Aaj sirf **ek topic** padho – chhota goal, bada confidence\n2. **5 minute break** lo – paani piyo, deep breath lo\n3. Phir wapas aao – **Sarathi tumhare saath hai** 💪\n\nKaun sa subject sabse tough lag raha hai? Main usme help karunga!",
  "🫂 Struggles are part of every topper's journey! **IIT/NEET toppers** bhi yahi feel karte the.\n\n💡 **Quick Motivation:** _\"Ek kadam roz – salbhar mein manzil\"_\n\nBata, kya specific problem hai? Solution nikalte hain saath mein! 🎯",
];

async function retrieveKnowledge(query, serviceClient) {
  try {
    const stopWords = new Set(["kaise","karna","karo","hoga","hai","hain","mein","the","and","for","with","this","that","from","they","have","what","when","where","which","will","your","about"]);
    const words = query.toLowerCase().replace(/[?!.,;:'"()]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));
    if (!words.length) return "";
    const orFilters = words.slice(0, 6).map((w) => `content.ilike.%${w}%,title.ilike.%${w}%`).join(",");
    const { data } = await serviceClient.from("knowledge_base").select("title, content, category").eq("is_active", true).or(orFilters).order("position", { ascending: true }).limit(4);
    if (!data?.length) return "";
    return data.map((d) => `### ${d.title}\n${d.content.trim()}`).join("\n\n---\n\n");
  } catch (e) {
    return "";
  }
}

app.post("/api/chatbot", async (req, res) => {
  try {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const serviceClient = getServiceClient();

    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader) {
      const client = getUserClient(authHeader);
      const { data: { user } } = await client.auth.getUser();
      userId = user?.id || null;
    }

    const { message, history = [], sessionId, feedback } = req.body;

    if (feedback) {
      const { messageContent, responseContent, rating } = feedback;
      await serviceClient.from("chatbot_feedback").insert({
        user_id: userId || null,
        session_id: sessionId,
        message_content: messageContent,
        response_content: responseContent,
        rating: rating === "up" ? 1 : -1,
      });
      return res.json({ success: true });
    }

    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    const rateLimitKey = userId || req.ip || "anonymous";
    if (isRateLimited(rateLimitKey)) {
      return res.json({ response: "⏳ Aap bahut tezi se messages bhej rahe hain. Thoda rukein aur phir poochein. 🙏" });
    }

    const queryType = classifyQuery(message);

    if (queryType === "offTopic") {
      return res.json({ response: "😊 Mujhe maaf karein! Main **Sarathi** hoon aur sirf padhai se juded sawaalon mein madad kar sakta hoon.\n\n📚 **Main help kar sakta hoon:**\n- Courses aur Syllabus\n- Mock Tests aur Doubts\n- Platform Features aur Technical Help\n- Study Tips aur Motivation\n\nKoi study se juda sawaal ho toh zaroor poochein! 🎯" });
    }

    if (queryType === "emotional") {
      const resp = emotionalResponses[Math.floor(Math.random() * emotionalResponses.length)];
      return res.json({ response: resp });
    }

    const [settingsRes, faqRes, coursesRes, ragContext] = await Promise.all([
      serviceClient.from("chatbot_settings").select("*").eq("id", 1).single(),
      serviceClient.from("chatbot_faq").select("question, answer, category").eq("is_active", true).limit(30),
      serviceClient.from("courses").select("title, description, grade, price").limit(20),
      retrieveKnowledge(message, serviceClient),
    ]);

    const settings = settingsRes.data;
    const faqs = faqRes.data || [];
    const courses = coursesRes.data || [];

    const msgLower = message.toLowerCase();
    const faqMatch = faqs.find((f) =>
      f.question.toLowerCase().split(" ").some((word) => word.length > 3 && msgLower.includes(word))
    );
    if (faqMatch && msgLower.split(" ").length < 8) {
      if (userId) await serviceClient.from("chatbot_logs").insert({ user_id: userId, message, response: faqMatch.answer, session_id: sessionId });
      return res.json({ response: faqMatch.answer });
    }

    if (!LOVABLE_API_KEY) {
      return res.json({ response: "🔧 Main abhi connect nahi ho pa raha. Thodi der baad try karein." });
    }

    const coursesSection = courses.length > 0
      ? `\n\n**Available Courses:**\n${courses.map((c) => `- ${c.title}${c.grade ? ` (Grade ${c.grade})` : ""}${c.price ? ` - ₹${c.price}` : " - Free"}: ${c.description?.slice(0, 80) || ""}`).join("\n")}`
      : "";
    const ragSection = ragContext ? `\n\n**Academy Knowledge Base:**\n${ragContext}` : "";
    const customInstructions = settings?.custom_instructions ? `\n\n${settings.custom_instructions}` : "";

    const fullSystemPrompt = `You are Sarathi (सारथी), the friendly AI assistant for Mahima Academy – an online education platform for NEET/JEE/Board exam preparation in India.

PERSONALITY: Helpful, encouraging, knowledgeable. Speaks Hinglish (Hindi + English mix) naturally. Uses emojis appropriately.

RULES:
- ONLY answer questions about: courses, syllabus, mock tests, doubts, study tips, platform help, enrollment, payments
- For off-topic queries: politely redirect to studies
- Be concise but comprehensive
- Use bullet points for lists
- Always encourage the student${coursesSection}${ragSection}${customInstructions}`;

    const model = settings?.model_name || "google/gemini-flash-1.5";
    const temperature = settings?.temperature ?? 0.7;
    const maxTokens = settings?.max_tokens ?? 1000;

    const messagesPayload = [
      { role: "system", content: fullSystemPrompt },
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: messagesPayload, temperature, max_tokens: maxTokens }),
    });

    if (aiResponse.status === 429) return res.json({ response: "⏳ Bahut zyada requests aa rahi hain. Thodi der baad try karein. 🙏" });
    if (aiResponse.status === 402) return res.json({ response: "🔧 Sarthi temporarily unavailable. Please contact support." });
    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || "Maaf karein, main ise process nahi kar paya. Phir se try karein. 🙏";

    if (userId) await serviceClient.from("chatbot_logs").insert({ user_id: userId, message, response, session_id: sessionId });
    res.json({ response, queryType, ragUsed: ragContext.length > 0 });
  } catch (e) {
    console.error("chatbot error:", e);
    res.json({ response: "🔧 Connection mein problem hai. Thodi der baad try karein. 🙏" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI: SUMMARIZE VIDEO & DEEP SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/summarize-video", async (req, res) => {
  try {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) return res.status(500).json({ error: "AI gateway not configured" });

    const { videoUrl, lessonTitle, lessonId, mode = "summary", thinking = false, description, overview } = req.body;

    let youtubeId = "";
    if (videoUrl) {
      const m = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (m) youtubeId = m[1];
    }

    const normalizedDescription = description?.trim() || "";
    const normalizedOverview = overview?.trim() || "";
    const hasContext = !!(youtubeId || normalizedDescription || normalizedOverview);

    const contextBlock = [
      `Title: ${lessonTitle || "Unknown Lesson"}`,
      youtubeId ? `YouTube Video ID: ${youtubeId}` : "",
      normalizedDescription ? `Description: ${normalizedDescription}` : "",
      normalizedOverview ? `Overview/Content: ${normalizedOverview}` : "",
    ].filter(Boolean).join("\n");

    const groundingInstruction = hasContext
      ? "Provided context ke basis par hi respond karo. Sirf is specific lecture ke baare mein likho."
      : "Sirf title ke basis par best possible summary do.";

    let systemPrompt = `You are Sarathi, an expert educational assistant for Mahima Academy. You help students understand lecture content with clear, engaging explanations in Hinglish.\n\nIMPORTANT: Sirf is SPECIFIC lecture ke topic ke baare mein likho.\n\n${groundingInstruction}`;
    let prompt = "";

    if (mode === "research") {
      systemPrompt = `You are Sarathi, an expert educational researcher for Mahima Academy platform. You do deep conceptual analysis for NEET/JEE/Board exam students.\n\nIMPORTANT RULES:\n- SIRF is specific lecture topic ke concepts pe focus karo.\n- Generic educational advice mat do.\n\n${groundingInstruction}`;
      prompt = `Is SPECIFIC lecture ke topic ka deep research karo:\n\n--- LECTURE DETAILS ---\n${contextBlock}\n--- END ---\n\nFormat:\n1. **🔬 ${lessonTitle || "Topic"} — Conceptual Analysis**\n2. **📊 Exam Pattern**\n3. **📚 NCERT Connection**\n4. **🧮 Formulas & Key Points**\n5. **❌ Common Mistakes**\n6. **📝 Practice Questions** — 3-5 questions\n7. **🎯 Tips**\n8. **🔗 Related Topics**\n\nHinglish mein likho.`;
    } else {
      prompt = `Is SPECIFIC lecture ko summarize karo:\n\n--- LECTURE DETAILS ---\n${contextBlock}\n--- END ---\n\nFormat:\n1. **📋 Is Lecture Mein Kya Hai**\n2. **📝 Key Concepts** — 3-5 important concepts\n3. **💡 Yaad Karne Ke Tips**\n4. **🎯 Quick Revision** — 5-7 one-liners\n5. **❓ Exam Questions** — 2-3 likely questions\n\nHinglish mein likho. Emojis use karo.`;
    }

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
      max_tokens: mode === "research" ? 2500 : 1200,
      temperature: mode === "research" ? 0.4 : 0.3,
    };
    if (mode === "research" || thinking) body.reasoning = { effort: mode === "research" ? "high" : "medium" };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (aiRes.status === 429) return res.status(429).json({ error: "Rate limited. Try again in a minute." });
    if (aiRes.status === 402) return res.status(402).json({ error: "AI credits exhausted." });
    if (!aiRes.ok) throw new Error(`AI API error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const choice = aiData.choices?.[0];
    const summary = choice?.message?.content || "Could not generate summary. Please try again.";
    const thinkingContent = choice?.message?.reasoning_content || null;

    const responseBody = { summary, hasContext, contextWarning: hasContext ? null : "⚠️ Limited context." };
    if (thinking && thinkingContent) responseBody.thinking = thinkingContent;
    res.json(responseBody);
  } catch (e) {
    console.error("summarize-video error:", e);
    res.status(500).json({ error: e.message || "Unknown error" });
  }
});

app.post("/api/deep-search-lecture", async (req, res) => {
  try {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) return res.status(500).json({ error: "AI gateway not configured" });

    const { query, lessonId, thinking = false, description, overview } = req.body;
    if (!query) return res.status(400).json({ error: "query is required" });

    const normalizedDescription = description?.trim() || "";
    const normalizedOverview = overview?.trim() || "";
    const hasLessonContext = !!(normalizedDescription || normalizedOverview);

    const lessonContext = hasLessonContext
      ? `\n\n**Lesson Context:**\n${normalizedDescription ? `Description: ${normalizedDescription}\n` : ""}${normalizedOverview ? `Overview: ${normalizedOverview}` : ""}`
      : "";

    const prompt = `Tum Sarathi ho — Mahima Academy ka AI research assistant. Topic ke baare mein comprehensive study guide banao:\n\n**Topic:** ${query}${lessonContext}\n\nFormat:\n1. **🔬 Conceptual Analysis**\n2. **📚 NCERT & Textbook References**\n3. **📝 Additional Explanations**\n4. **🎯 Exam Relevant Points**\n5. **📝 Practice Questions** — 3-5 questions\n6. **🎯 Tips**\n\nHindi/Hinglish mein likho.`;

    const aiBody = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: "You are Sarathi, the AI research companion for Mahima Academy. Create curated study guides for Indian students. Speak in Hinglish." }, { role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.4,
    };
    if (thinking) aiBody.reasoning = { effort: "medium" };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(aiBody),
    });

    if (aiRes.status === 429) return res.status(429).json({ error: "Rate limited." });
    if (aiRes.status === 402) return res.status(402).json({ error: "AI credits exhausted." });
    if (!aiRes.ok) throw new Error(`AI API error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const choice = aiData.choices?.[0];
    const summary = choice?.message?.content || "Could not generate research report.";
    const thinkingContent = choice?.message?.reasoning_content || null;

    const responseBody = { summary, hasContext: hasLessonContext };
    if (thinking && thinkingContent) responseBody.thinking = thinkingContent;
    res.json(responseBody);
  } catch (e) {
    console.error("deep-search-lecture error:", e);
    res.status(500).json({ error: e.message || "Unknown error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRAWL4AI BRIDGE (admin only)
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/crawl4ai-bridge", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const serviceClient = getServiceClient();
    const { data: roleData } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "admin") return res.status(403).json({ error: "Admin access required" });

    const { mode, url, category } = req.body;

    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    if (!FIRECRAWL_API_KEY) return res.status(500).json({ error: "Firecrawl API key not configured" });

    if (mode === "scrape") {
      const targetUrl = new URL(url);
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.href, formats: ["markdown"], onlyMainContent: true }),
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: `Firecrawl error: ${data.error || "Unknown"}` });

      const markdown = data.data?.markdown || data.markdown || "";
      const pageTitle = data.data?.metadata?.title || data.metadata?.title || targetUrl.hostname;

      if (!markdown || markdown.length < 50) return res.status(400).json({ error: "Page returned empty or very short content." });

      const CHUNK_SIZE = 1500;
      function splitIntoChunks(content, title) {
        if (content.length <= CHUNK_SIZE) return [{ title, content }];
        const chunks = [];
        const paragraphs = content.split(/\n\n+/);
        let current = "";
        let idx = 1;
        for (const para of paragraphs) {
          if ((current + para).length > CHUNK_SIZE && current.length > 0) {
            chunks.push({ title: `${title} (Part ${idx})`, content: current.trim() });
            current = para;
            idx++;
          } else {
            current += (current ? "\n\n" : "") + para;
          }
        }
        if (current.trim()) chunks.push({ title: idx > 1 ? `${title} (Part ${idx})` : title, content: current.trim() });
        return chunks;
      }

      const chunks = splitIntoChunks(markdown, pageTitle);
      const kbEntries = chunks.map((chunk) => ({
        title: chunk.title,
        content: chunk.content,
        category: category || "general",
        keywords: [targetUrl.hostname.replace("www.", ""), ...pageTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 5)],
        is_active: true,
        position: 999,
      }));

      const { data: insertedEntries, error: kbError } = await serviceClient.from("knowledge_base").insert(kbEntries).select("id");
      if (kbError) return res.status(500).json({ error: `DB insert error: ${kbError.message}` });

      return res.json({ success: true, title: pageTitle, entriesCreated: insertedEntries?.length || 0, url: targetUrl.href });
    }

    res.status(400).json({ error: "Invalid mode. Use scrape" });
  } catch (e) {
    console.error("crawl4ai-bridge error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGE SESSION
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/manage-session", async (req, res) => {
  try {
    const user = await verifyAuth(req, res);
    if (!user) return;

    const serviceClient = getServiceClient();
    const { action, session_token, device_type, user_agent } = req.body;

    if (action === "create") {
      const { data: activeSessions } = await serviceClient.from("user_sessions")
        .select("id, session_token, logged_in_at").eq("user_id", user.id).eq("is_active", true)
        .order("logged_in_at", { ascending: true });

      const sessions = activeSessions ?? [];
      if (sessions.length >= 2) {
        const oldest = sessions[0];
        await serviceClient.from("user_sessions").update({ is_active: false, expires_at: new Date().toISOString() }).eq("id", oldest.id);
      }

      const newToken = crypto.randomUUID();
      const { data: newSession, error: insertError } = await serviceClient.from("user_sessions")
        .insert({ user_id: user.id, session_token: newToken, device_type: device_type ?? "web", user_agent: user_agent ?? null, is_active: true })
        .select().single();

      if (insertError) return res.status(500).json({ error: insertError.message });
      return res.json({ session_token: newToken, session_id: newSession.id });
    }

    if (action === "heartbeat") {
      if (!session_token) return res.status(400).json({ error: "session_token required" });
      await serviceClient.from("user_sessions").update({ last_active_at: new Date().toISOString() })
        .eq("session_token", session_token).eq("user_id", user.id).eq("is_active", true);
      return res.json({ ok: true });
    }

    if (action === "terminate") {
      if (!session_token) return res.status(400).json({ error: "session_token required" });
      await serviceClient.from("user_sessions").update({ is_active: false, expires_at: new Date().toISOString() })
        .eq("session_token", session_token);
      return res.json({ ok: true });
    }

    if (action === "logout") {
      if (!session_token) return res.status(400).json({ error: "session_token required" });
      await serviceClient.from("user_sessions").update({ is_active: false, expires_at: new Date().toISOString() })
        .eq("session_token", session_token).eq("user_id", user.id);
      return res.json({ ok: true });
    }

    res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    console.error("manage-session error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[API Server] Running on port ${PORT}`);
});
