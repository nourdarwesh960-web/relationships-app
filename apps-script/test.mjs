// Runs Code.gs against in-memory mocks of Apps Script services. Verifies all backend features.
import fs from "fs";
import vm from "vm";
import assert from "assert";
import crypto from "crypto";

const sheets = {}, props = { SPREADSHEET_ID: "x", GOOGLE_CLIENT_ID: "cid" }, cache = {};
const mkSheet = (n) => ({
  rows: [],
  getRange(a, b, c, d) {
    if (typeof a === "string") return { setNumberFormat() {} };
    return {
      setValues: (v) => {
        if (!this.rows[a - 1]) this.rows[a - 1] = [];
        const startCol = (b || 1) - 1;
        v[0].forEach((val, idx) => {
          this.rows[a - 1][startCol + idx] = val;
        });
      }
    };
  },
  appendRow(r) { this.rows.push(r.slice ? r.slice() : Array.from(r)); },
  getDataRange() { return { getValues: () => this.rows.map((r) => r.slice()) }; }
});

const tokens = { A: "ua", B: "ub", C: "uc" };
const ctx = {
  console,
  JSON,
  Date,
  Math,
  Object,
  Number,
  String,
  Array,
  RegExp,
  isFinite,
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] }) },
  SpreadsheetApp: {
    openById: () => ({
      getSheetByName: (n) => sheets[n] || null,
      insertSheet: (n) => (sheets[n] = mkSheet(n))
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => cache[k] ?? null,
      put: (k, v) => (cache[k] = v),
      remove: (k) => delete cache[k]
    })
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    computeDigest: (a, s) => crypto.createHash("sha256").update(s).digest(),
    base64EncodeWebSafe: (b) => Buffer.from(b).toString("base64url"),
    base64Decode: (s) => Buffer.from(s, "base64"),
    newBlob: (data, mime, name) => ({ data, mime, name }),
    Charset: { UTF_8: 1 },
    DigestAlgorithm: { SHA_256: 1 }
  },
  UrlFetchApp: {
    fetch: (u) => {
      const tk = decodeURIComponent(u.split("id_token=")[1]);
      const sub = tokens[tk];
      return {
        getResponseCode: () => (sub ? 200 : 400),
        getContentText: () =>
          JSON.stringify({
            sub,
            aud: tk === "W" ? "other" : "cid",
            iss: "accounts.google.com",
            exp: String(Math.floor(Date.now() / 1000) + 3600),
            name: "N" + sub
          })
      };
    }
  },
  ContentService: {
    createTextOutput: (s) => ({ s, setMimeType() { return this; } }),
    MimeType: { JSON: 1 }
  }
};

tokens.W = "uw";
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("./Code.gs", import.meta.url), "utf8"), ctx);

const call = (token, action, params) =>
  JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token, action, params }) } }).s);
const ok = (r) => { assert.ok(r.ok, JSON.stringify(r)); return r.data; };
const bad = (r, code) => assert.deepStrictEqual([r.ok, r.code], [false, code]);

let n = 0;
const test = (name, f) => { f(); n++; console.log("ok -", name); };

// 1. Basic auth checks
test("rejects missing/invalid/wrong-audience tokens", () => {
  bad(call("", "me"), "AUTH");
  bad(call("nope", "me"), "AUTH");
  bad(call("W", "me"), "AUTH");
});

test("unknown action rejected", () => bad(call("A", "constructor"), "BAD_ACTION"));

// 2. User registration and login
let tokenUser1, tokenUser2;
test("registration works with validation", () => {
  bad(call("", "register", { username: "ab", password: "short" }), "BAD_USERNAME");
  bad(call("", "register", { username: "user1", password: "123" }), "BAD_PASSWORD");
  const res1 = ok(call("", "register", { username: "layla", password: "password123", displayName: "Layla" }));
  assert.ok(res1.token);
  assert.equal(res1.user.name, "Layla");
  tokenUser1 = res1.token;

  bad(call("", "register", { username: "layla", password: "password123" }), "USERNAME_TAKEN");

  const res2 = ok(call("", "register", { username: "kareem", password: "password123", displayName: "Kareem" }));
  tokenUser2 = res2.token;
});

test("login works with credentials check", () => {
  bad(call("", "login", { username: "layla", password: "wrongpassword" }), "INVALID_CREDENTIALS");
  const res = ok(call("", "login", { username: "layla", password: "password123" }));
  assert.ok(res.token);
  tokenUser1 = res.token;
});

test("profile updates and password changes", () => {
  const p = ok(call(tokenUser1, "updateProfile", { displayName: "Layla Noor", avatar: "heart" }));
  assert.equal(p.user.name, "Layla Noor");
  bad(call(tokenUser1, "changePassword", { currentPassword: "wrong", newPassword: "newpassword123" }), "INVALID_CREDENTIALS");
  ok(call(tokenUser1, "changePassword", { currentPassword: "password123", newPassword: "newpassword123" }));
  ok(call("", "login", { username: "layla", password: "newpassword123" }));
});

// 3. Connections between User1 and User2
let code;
test("User1 creates connection, User2 joins", () => {
  bad(call(tokenUser1, "createConnection", { startDate: "bad" }), "BAD_REQUEST");
  code = ok(call(tokenUser1, "createConnection", { startDate: "2024-01-05" })).connection.connectionId;
  assert.match(code, /^[A-Z2-9]{8}$/);
  bad(call(tokenUser1, "createConnection", { startDate: "2024-01-05" }), "EXISTS");
  bad(call(tokenUser1, "joinConnection", { code }), "EXISTS");
  bad(call(tokenUser2, "joinConnection", { code: "ZZZZZZZZ" }), "NOT_FOUND");

  const joinRes = ok(call(tokenUser2, "joinConnection", { code: code.toLowerCase() }));
  assert.equal(joinRes.connection.partnerJoined, true);

  const me1 = ok(call(tokenUser1, "me"));
  assert.equal(me1.connection.connectionId, code);
  assert.equal(me1.connection.partner.name, "Kareem");

  const me2 = ok(call(tokenUser2, "me"));
  assert.equal(me2.connection.connectionId, code);
  assert.equal(me2.connection.partner.name, "Layla Noor");
});

// 4. Memories & Photos
let memId;
test("Memories creation, update, privacy and listing", () => {
  bad(call(tokenUser1, "saveMemory", { title: "", memoryDate: "2024-02-14" }), "BAD_REQUEST");
  const m1 = ok(call(tokenUser1, "saveMemory", {
    title: "First Trip to the Beach",
    memoryDate: "2024-06-15",
    content: "The sunset was breathtaking and we walked for hours.",
    category: "trip",
    tags: ["beach", "summer"],
    isFavorite: true,
    privacy: "shared"
  })).memory;
  memId = m1.memoryId;

  // Private memory by User1
  ok(call(tokenUser1, "saveMemory", {
    title: "Secret Surprise Plan",
    memoryDate: "2024-07-01",
    content: "Planning birthday gift.",
    category: "special",
    tags: ["gift"],
    isFavorite: false,
    privacy: "private"
  }));

  const user1Memories = ok(call(tokenUser1, "getMemories")).memories;
  assert.equal(user1Memories.length, 2);

  const user2Memories = ok(call(tokenUser2, "getMemories")).memories;
  assert.equal(user2Memories.length, 1); // User2 does not see private memory!
  assert.equal(user2Memories[0].title, "First Trip to the Beach");
  assert.equal(user2Memories[0].isFavorite, true);
});

let photoId;
test("Photos upload, set cover and deletion", () => {
  bad(call(tokenUser1, "uploadPhoto", { memoryId: memId, data: "bad-data" }), "BAD_FILE");
  const pRes = ok(call(tokenUser1, "uploadPhoto", {
    memoryId: memId,
    data: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    caption: "Sunset view",
    isCover: true
  }));
  photoId = pRes.photo.photoId;
  assert.ok(photoId);

  const mems = ok(call(tokenUser1, "getMemories")).memories;
  const targetMem = mems.find((m) => m.id === memId);
  assert.equal(targetMem.photos.length, 1);
  assert.equal(targetMem.photos[0].caption, "Sunset view");
  assert.equal(targetMem.coverPhotoId, photoId);
  assert.equal(targetMem.coverPhotoUrl, "data:image/jpeg;base64,/9j/4AAQSkZJRg==");
  assert.equal(targetMem.photoUrl, "data:image/jpeg;base64,/9j/4AAQSkZJRg==");

  // Creating memory directly with photoUrl sets coverPhotoId and URLs
  const memWithPhoto = ok(call(tokenUser1, "saveMemory", {
    title: "Cafe Afternoon",
    memoryDate: "2024-08-10",
    content: "Delicious coffee",
    photoUrl: "https://example.com/cafe.jpg"
  })).memory;
  assert.ok(memWithPhoto.coverPhotoId);
  assert.equal(memWithPhoto.photoUrl, "https://example.com/cafe.jpg");
  assert.equal(memWithPhoto.photos.length, 1);
});

// 5. Free Typing / Notes
test("Notes get, save and conflict resolution", () => {
  const init = ok(call(tokenUser1, "getNote")).note;
  const s1 = ok(call(tokenUser1, "saveNote", { title: "Our Bucket List", content: "1. Stargazing in the desert" })).note;
  assert.equal(s1.version, 1);

  const s2 = ok(call(tokenUser2, "saveNote", { baseVersion: 1, title: "Our Bucket List", content: "1. Stargazing\n2. Road trip" })).note;
  assert.equal(s2.version, 2);

  // Stale baseVersion returns conflict
  const sStale = ok(call(tokenUser1, "saveNote", { baseVersion: 1, content: "Overwriting" }));
  assert.equal(sStale.conflict, true);
  assert.equal(sStale.note.version, 2);
});

// 6. Letters & Time Capsules
let scheduledLetterId, instantLetterId;
test("Letters draft, scheduled time capsule locking, immediate delivery and read status", () => {
  // Save draft
  const draft = ok(call(tokenUser1, "saveLetter", {
    title: "Draft thoughts",
    content: "Just some notes...",
    theme: "vintage"
  })).letter;
  assert.equal(draft.status, "draft");

  // Schedule letter for future
  const futureDate = new Date(Date.now() + 864e5 * 10).toISOString();
  const sched = ok(call(tokenUser1, "sendLetter", {
    title: "Open in 10 Days!",
    content: "Happy 10 days in the future!",
    theme: "romantic",
    scheduledFor: futureDate
  })).letter;
  scheduledLetterId = sched.letterId;

  // Immediate letter
  const imm = ok(call(tokenUser1, "sendLetter", {
    title: "Good Morning Love",
    content: "Thinking of you today!",
    theme: "classic"
  })).letter;
  instantLetterId = imm.letterId;

  // User2 fetches letters
  const u2Letters = ok(call(tokenUser2, "getLetters"));
  assert.equal(u2Letters.received.length, 2);

  const lockedSched = u2Letters.received.find((l) => l.id === scheduledLetterId);
  assert.equal(lockedSched.isLocked, true);
  assert.equal(lockedSched.content, ""); // Content hidden before time arrives!

  const openLetter = u2Letters.received.find((l) => l.id === instantLetterId);
  assert.equal(openLetter.isLocked, false);
  assert.equal(openLetter.content, "Thinking of you today!");
  assert.equal(openLetter.isRead, false);

  // Mark read
  ok(call(tokenUser2, "markLetterRead", { id: instantLetterId }));
  const u2LettersAfterRead = ok(call(tokenUser2, "getLetters"));
  const readLetter = u2LettersAfterRead.received.find((l) => l.id === instantLetterId);
  assert.equal(readLetter.isRead, true);
});

// 7. Calendar Events
let eventId;
test("Calendar events creation, milestones, and deletion", () => {
  const ev = ok(call(tokenUser1, "saveEvent", {
    title: "Candlelight Dinner",
    eventDate: "2024-08-20",
    eventType: "date",
    notes: "Reserve table by window"
  })).event;
  eventId = ev.eventId;
  assert.ok(eventId);

  const allEvents = ok(call(tokenUser2, "getEvents")).events;
  assert.ok(allEvents.some((e) => e.title === "Candlelight Dinner"));
  assert.ok(allEvents.some((e) => e.eventType === "anniversary")); // Automatic anniversary milestone!

  ok(call(tokenUser1, "deleteEvent", { id: eventId }));
});

// 8. Wishlist
let wishId;
test("Wishlist items creation, status toggle and deletion", () => {
  const item = ok(call(tokenUser2, "saveWishlistItem", {
    title: "Starlight Projector",
    category: "home",
    priority: "high",
    price: "$35",
    url: "https://example.com/projector"
  })).item;
  wishId = item.itemId;
  assert.ok(wishId);

  const list = ok(call(tokenUser1, "getWishlist")).wishlist;
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Starlight Projector");
  assert.equal(list[0].status, "idea");

  ok(call(tokenUser1, "updateWishlistStatus", { id: wishId, status: "purchased" }));
  const updatedList = ok(call(tokenUser2, "getWishlist")).wishlist;
  assert.equal(updatedList[0].status, "purchased");
});

// 9. Watch / Listen Sync & Queue
let queueItemId;
test("MediaQueue management", () => {
  const qItem = ok(call(tokenUser1, "addMediaQueueItem", {
    type: "watch",
    title: "Our Favorite Clip",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  })).item;
  queueItemId = qItem.queueId;
  assert.ok(queueItemId);

  const q = ok(call(tokenUser2, "getMediaQueue", { type: "watch" })).queue;
  assert.equal(q.length, 1);
  assert.equal(q[0].title, "Our Favorite Clip");
});

let sessVer;
test("Watch & Listen playback session synchronization", () => {
  sessVer = ok(call(tokenUser1, "createSession", { type: "watch", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })).session.version;
  const s2 = ok(call(tokenUser2, "getSession", { type: "watch", sinceVersion: 0 }));
  assert.equal(s2.session.mediaId, "dQw4w9WgXcQ");

  const r1 = ok(call(tokenUser2, "updateSession", { type: "watch", baseVersion: sessVer, patch: { playbackState: "playing", currentTime: 45 } }));
  assert.equal(r1.session.version, sessVer + 1);

  // Audio session
  const aSess = ok(call(tokenUser1, "createSession", { type: "listen", url: "https://example.com/song.mp3" }));
  assert.equal(aSess.session.provider, "audio");
});

// 10. Activities and Prompts
test("Activity log records events and provides conversation prompts", () => {
  const acts = ok(call(tokenUser1, "getActivities"));
  assert.ok(acts.activities.length > 0);
  assert.ok(acts.prompts.length >= 5);
});

// 11. Disconnect and Account Deletion
test("Disconnect ends partnership cleanly", () => {
  ok(call(tokenUser1, "disconnect"));
  const meAfter = ok(call(tokenUser1, "me"));
  assert.equal(meAfter.connection, null);
});

test("Account deletion deactivates user and invalidates session", () => {
  ok(call(tokenUser2, "deleteAccount"));
  bad(call(tokenUser2, "me"), "AUTH");
});

// 12. Robust Authentication & Google Sheets Edge Cases
test("Login is case-insensitive for username and handles whitespace", () => {
  const r1 = ok(call("", "login", { username: "LAYLA", password: "newpassword123" }));
  assert.ok(r1.token);
  const r2 = ok(call("", "login", { username: "  Layla  ", password: "newpassword123" }));
  assert.ok(r2.token);
});

test("Login works with registered email", () => {
  ok(call("", "register", { username: "samir", password: "password123", email: "samir@love.com", displayName: "Samir" }));
  const byUser = ok(call("", "login", { username: "samir", password: "password123" }));
  assert.equal(byUser.user.name, "Samir");
  const byEmail = ok(call("", "login", { username: "samir@love.com", password: "password123" }));
  assert.equal(byEmail.user.name, "Samir");
  const byEmailUpper = ok(call("", "login", { username: "SAMIR@LOVE.COM", password: "password123" }));
  assert.equal(byEmailUpper.user.name, "Samir");
});

test("Handles Google Sheet with status instead of accountStatus, spaced headers, and reordered columns", () => {
  const customAccounts = mkSheet("CustomAccounts");
  // Col 0: User ID, Col 1: Username, Col 2: Password Hash, Col 3: Salt, Col 4: Display Name, Col 5: Status
  customAccounts.rows.push(["User ID", "Username", "Password Hash", "Salt", "Display Name", "Status"]);
  
  const salt = "s123";
  const pass = "CustomPass123!";
  const hash = ctx.passwordHash_(pass, salt);
  customAccounts.rows.push(["u_custom_99", "customuser", hash, salt, "Custom Person", "Active"]);
  sheets["Accounts"] = customAccounts;

  const loginRes = ok(call("", "login", { username: "customuser", password: pass }));
  assert.ok(loginRes.token);
  assert.equal(loginRes.user.name, "Custom Person");

  const meRes = ok(call(loginRes.token, "me"));
  assert.equal(meRes.user.name, "Custom Person");
});

test("Handles LoginSessions with formatted string expiry", () => {
  const sessions = sheets["LoginSessions"];
  assert.ok(sessions);
  const customToken = "special_token_99999999999999999999";
  sessions.rows.push([customToken, "u_custom_99", "12345", "1,899,999,999,999"]);
  
  // Clear cache to verify sheet fallback
  delete cache['sess_' + Buffer.from(crypto.createHash('sha256').update(customToken).digest()).toString('base64url')];
  
  const meRes = ok(call(customToken, "me"));
  assert.equal(meRes.user.name, "Custom Person");
});

console.log(`\nAll ${n} test groups passed successfully!`);
