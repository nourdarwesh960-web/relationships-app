/** RelationshipsApp backend. Script Properties required: SPREADSHEET_ID, GOOGLE_CLIENT_ID. */
var H = {
  Accounts: ['userId','username','salt','passwordHash','displayName','avatar','email','createdAt','accountStatus'],
  LoginSessions: ['token','userId','createdAt','expiresAt'],
  Users: ['userId','displayName','avatar','email','createdAt','accountStatus'],
  Connections: ['connectionId','userAId','userBId','relationshipStartDate','connectionStatus','inviteExpiresAt','createdAt','updatedAt'],
  Sessions: ['sessionId','connectionId','sessionType','mediaProvider','mediaId','mediaUrl','playbackState','currentTime','playbackRate','hostUserId','version','updatedBy','updatedAt','status'],
  Memories: ['memoryId','connectionId','authorId','title','memoryDate','location','content','category','tags','isFavorite','privacy','coverPhotoId','coverPhotoUrl','createdAt','updatedAt','status'],
  Photos: ['photoId','connectionId','memoryId','uploaderId','url','caption','orderIndex','createdAt','status'],
  Notes: ['noteId','connectionId','authorId','title','content','format','version','updatedAt','status'],
  Letters: ['letterId','connectionId','senderId','recipientId','title','content','theme','status','scheduledFor','sentAt','isRead','readAt','createdAt'],
  Events: ['eventId','connectionId','creatorId','title','eventDate','eventType','recurrence','reminderDays','notes','createdAt','status'],
  Wishlist: ['itemId','connectionId','creatorId','title','category','priority','price','url','targetDate','status','notes','createdAt'],
  MediaQueue: ['queueId','connectionId','creatorId','mediaType','title','url','provider','mediaId','isFavorite','status','orderIndex','createdAt'],
  Activities: ['activityId','connectionId','actorId','actionType','summary','entityType','entityId','createdAt'],
  Storybooks: ['bookId','connectionId','title','coverPhotoUrl','theme','config','lastReadPage','updatedBy','updatedAt','status']
};

var WRITES = {
  register: 1, login: 1, googleLogin: 1, logout: 1, updateProfile: 1, changePassword: 1, deleteAccount: 1,
  me: 1, createConnection: 1, joinConnection: 1, updateConnection: 1, cancelInvitation: 1, disconnect: 1,
  createSession: 1, updateSession: 1, leaveSession: 1,
  saveMemory: 1, deleteMemory: 1,
  uploadPhoto: 1, deletePhoto: 1, setCoverPhoto: 1,
  saveNote: 1,
  saveLetter: 1, sendLetter: 1, cancelLetter: 1, markLetterRead: 1,
  saveEvent: 1, deleteEvent: 1,
  saveWishlistItem: 1, deleteWishlistItem: 1, updateWishlistStatus: 1,
  addMediaQueueItem: 1, updateMediaQueueItem: 1, deleteMediaQueueItem: 1,
  saveStorybook: 1
};

function prop_(k){ return PropertiesService.getScriptProperties().getProperty(k); }
function err_(code,msg){ var e=new Error(msg); e.code=code; return e; }

function normKey_(k) {
  if (!k) return '';
  var clean = String(k).trim().toLowerCase().replace(/[\s_\-\.]+/g, '');
  var map = {
    'userid': 'userId', 'id': 'userId', 'user': 'userId',
    'username': 'username', 'login': 'username',
    'passwordhash': 'passwordHash', 'password': 'passwordHash', 'pass': 'passwordHash', 'hash': 'passwordHash',
    'salt': 'salt',
    'displayname': 'displayName', 'name': 'displayName', 'fullname': 'displayName',
    'avatar': 'avatar', 'avatarurl': 'avatar', 'picture': 'avatar', 'photo': 'avatar',
    'email': 'email', 'mail': 'email',
    'createdat': 'createdAt', 'created': 'createdAt', 'date': 'createdAt',
    'accountstatus': 'accountStatus', 'status': 'accountStatus', 'state': 'accountStatus',
    'expiresat': 'expiresAt', 'expires': 'expiresAt', 'expiry': 'expiresAt',
    'token': 'token', 'sessiontoken': 'token',
    'connectionid': 'connectionId', 'connid': 'connectionId',
    'useraid': 'userAId', 'usera': 'userAId',
    'userbid': 'userBId', 'userb': 'userBId',
    'connectionstatus': 'connectionStatus',
    'relationshipstartdate': 'relationshipStartDate', 'startdate': 'relationshipStartDate',
    'inviteexpiresat': 'inviteExpiresAt',
    'sessionid': 'sessionId', 'sessiontype': 'sessionType',
    'mediaprovider': 'mediaProvider', 'mediaid': 'mediaId', 'mediaurl': 'mediaUrl',
    'playbackstate': 'playbackState', 'currenttime': 'currentTime', 'playbackrate': 'playbackRate',
    'hostuserid': 'hostUserId', 'version': 'version', 'updatedby': 'updatedBy', 'updatedat': 'updatedAt',
    'memoryid': 'memoryId', 'authorid': 'authorId', 'memorydate': 'memoryDate',
    'location': 'location', 'place': 'location', 'address': 'location',
    'title': 'title', 'content': 'content', 'category': 'category', 'tags': 'tags',
    'isfavorite': 'isFavorite', 'privacy': 'privacy', 'coverphotoid': 'coverPhotoId',
    'photoid': 'photoId', 'uploaderid': 'uploaderId', 'caption': 'caption', 'orderindex': 'orderIndex',
    'noteid': 'noteId', 'format': 'format',
    'letterid': 'letterId', 'senderid': 'senderId', 'recipientid': 'recipientId',
    'theme': 'theme', 'scheduledfor': 'scheduledFor', 'sentat': 'sentAt', 'isread': 'isRead', 'readat': 'readAt',
    'eventid': 'eventId', 'creatorid': 'creatorId', 'eventdate': 'eventDate', 'eventtype': 'eventType',
    'recurrence': 'recurrence', 'reminderdays': 'reminderDays', 'notes': 'notes',
    'itemid': 'itemId', 'priority': 'priority', 'price': 'price', 'url': 'url', 'targetdate': 'targetDate',
    'queueid': 'queueId', 'mediatype': 'mediaType', 'provider': 'provider',
    'activityid': 'activityId', 'actorid': 'actorId', 'actiontype': 'actionType', 'summary': 'summary',
    'entitytype': 'entityType',
    'bookid': 'bookId', 'coverphotourl': 'coverPhotoUrl', 'lastreadpage': 'lastReadPage', 'config': 'config'
  };
  return map[clean] || clean;
}

function parseExpiry_(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  var str = String(v).replace(/,/g, '').trim();
  var n = Number(str);
  if (!isNaN(n) && n > 0) return n;
  var d = Date.parse(str);
  if (!isNaN(d) && d > 0) return d;
  return 0;
}

function isActive_(account) {
  if (!account) return false;
  var s = String(account.accountStatus || account.status || 'active').trim().toLowerCase();
  return s === 'active' || s === '' || s === 'true' || s === '1';
}

function ensureHeaders_(n, t) {
  t = t || tab_(n);
  var v = t.getDataRange().getValues();
  if (!v || v.length === 0 || !v[0] || v[0].length === 0 || String(v[0][0]).trim() === '') {
    if (H[n]) {
      t.getRange('A:Z').setNumberFormat('@');
      t.appendRow(H[n]);
    }
    return;
  }
  var existingNorms = v[0].map(function(k) { return normKey_(k); });
  var needed = H[n] || [];
  var toAdd = [];
  needed.forEach(function(col) {
    if (existingNorms.indexOf(normKey_(col)) === -1) {
      toAdd.push(col);
    }
  });
  if (toAdd.length > 0) {
    var nextCol = v[0].length + 1;
    t.getRange(1, nextCol, 1, toAdd.length).setValues([toAdd]);
  }
}

function tab_(n){
  var s=SpreadsheetApp.openById(prop_('SPREADSHEET_ID')), t=s.getSheetByName(n);
  if(!t){
    t=s.insertSheet(n);
    t.getRange('A:Z').setNumberFormat('@');
    if (H[n]) t.appendRow(H[n]);
  } else {
    ensureHeaders_(n, t);
  }
  return t;
}

function rows_(n){
  var t=tab_(n), v=t.getDataRange().getValues();
  if(!v||v.length<=1) return [];
  var h=v[0];
  return v.slice(1).map(function(r,i){
    var o={_row:i+2};
    h.forEach(function(rawHeader,j){
      var rawKey = String(rawHeader || '').trim();
      if (!rawKey) return;
      var val = r[j] !== undefined && r[j] !== null ? String(r[j]).trim() : '';
      o[rawKey] = val;
      var nk = normKey_(rawKey);
      if (nk) o[nk] = val;
    });
    if (o.accountStatus && !o.status) o.status = o.accountStatus;
    if (o.status && !o.accountStatus) o.accountStatus = o.status;
    return o;
  });
}

function actualHeaders_(n, t) {
  t = t || tab_(n);
  var v = t.getDataRange().getValues();
  if (!v || v.length === 0 || !v[0] || v[0].length === 0 || String(v[0][0]).trim() === '') {
    if (H[n]) {
      t.getRange('A:Z').setNumberFormat('@');
      t.appendRow(H[n]);
      return H[n].slice();
    }
    return [];
  }
  return v[0].map(function(k) { return String(k || '').trim(); });
}

function arr_(n, o, t) {
  var h = actualHeaders_(n, t);
  if (!h || h.length === 0) h = H[n] || [];
  return h.map(function(rawKey) {
    var nk = normKey_(rawKey);
    if (o[rawKey] !== undefined) return o[rawKey];
    if (o[nk] !== undefined) return o[nk];
    if (nk === 'accountStatus' && o.status !== undefined) return o.status;
    if (nk === 'status' && o.accountStatus !== undefined) return o.accountStatus;
    if (nk === 'passwordHash' && o.password !== undefined) return o.password;
    return '';
  });
}

function put_(n, o) {
  var t = tab_(n);
  t.appendRow(arr_(n, o, t));
}

function upd_(n, o) {
  var t = tab_(n);
  var rowVals = arr_(n, o, t);
  t.getRange(o._row, 1, 1, rowVals.length).setValues([rowVals]);
}

function passwordHash_(password, salt) {
  var value = salt + ':' + password;
  for (var i = 0; i < 1200; i++) {
    value = Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    );
  }
  return value;
}

function issueToken_(account) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var now = Date.now();
  var expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  put_('LoginSessions', {
    token: token,
    userId: account.userId,
    createdAt: now,
    expiresAt: expiresAt
  });
  var uInfo = {
    userId: account.userId,
    name: account.displayName || account.username || 'User',
    username: account.username || '',
    avatar: account.avatar || '',
    email: account.email || ''
  };
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'sess_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
    cache.put(cacheKey, JSON.stringify(uInfo), 21600);
  } catch (cx) {}
  return {
    token: token,
    user: {
      id: account.userId,
      name: uInfo.name,
      username: uInfo.username,
      avatar: uInfo.avatar,
      email: uInfo.email
    }
  };
}

function auth_(token) {
  if (!token) throw err_('AUTH', 'Please sign in');
  token = String(token).trim();

  // 1. Fast CacheService check
  var cache = CacheService.getScriptCache();
  var cacheKey = 'sess_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  try {
    var hit = cache.get(cacheKey);
    if (hit) {
      var cached = JSON.parse(hit);
      if (cached && cached.userId) return cached;
    }
  } catch (cx) {}

  // 2. Check LoginSessions in Google Sheets
  var now = Date.now();
  var session = rows_('LoginSessions').filter(function(s) {
    var sToken = String(s.token || '').trim();
    if (sToken !== token) return false;
    var exp = parseExpiry_(s.expiresAt);
    return exp === 0 || exp > now;
  })[0];

  if (session) {
    var sUserId = String(session.userId || '').trim();
    var account = rows_('Accounts').filter(function(a) {
      return String(a.userId || '').trim() === sUserId && isActive_(a);
    })[0];
    if (account) {
      var uInfo = {
        userId: account.userId,
        name: account.displayName || account.username || 'User',
        username: account.username || '',
        avatar: account.avatar || '',
        email: account.email || ''
      };
      try { cache.put(cacheKey, JSON.stringify(uInfo), 21600); } catch (cx) {}
      return uInfo;
    }
    var uRow = rows_('Users').filter(function(u) {
      return String(u.userId || '').trim() === sUserId && isActive_(u);
    })[0];
    if (uRow) {
      var uInfo2 = {
        userId: uRow.userId,
        name: uRow.displayName || 'User',
        username: '',
        avatar: uRow.avatar || '',
        email: uRow.email || ''
      };
      try { cache.put(cacheKey, JSON.stringify(uInfo2), 21600); } catch (cx) {}
      return uInfo2;
    }
  }

  var googleClientId = prop_('GOOGLE_CLIENT_ID');
  if (googleClientId) {
    try {
      var cache = CacheService.getScriptCache();
      var key = 't' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
      var hit = cache.get(key);
      if (hit) return JSON.parse(hit);

      var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) {
        var p = JSON.parse(r.getContentText());
        var now = Math.floor(Date.now() / 1000);
        if (p.aud === googleClientId && (p.iss === 'accounts.google.com' || p.iss === 'https://accounts.google.com') && Number(p.exp) > now && p.sub) {
          var gUserId = 'g' + p.sub;
          var displayName = String(p.name || 'User').slice(0, 60);
          var gUser = { userId: gUserId, name: displayName, username: '', avatar: p.picture || '', email: p.email || '' };
          if (!rows_('Users').some(function(u) { return u.userId === gUserId; })) {
            put_('Users', {
              userId: gUserId,
              displayName: displayName,
              avatar: p.picture || '',
              email: p.email || '',
              createdAt: new Date().toISOString(),
              accountStatus: 'active'
            });
          }
          cache.put(key, JSON.stringify(gUser), Math.max(1, Math.min(600, Number(p.exp) - now)));
          return gUser;
        }
      }
    } catch (gx) {
      // UrlFetch error or token rejected
    }
  }

  throw err_('AUTH', 'Please sign in again');
}

function myConn_(u) {
  return rows_('Connections').filter(function(c) {
    return c.connectionStatus !== 'ended' && c.connectionStatus !== 'cancelled' && (c.userAId === u.userId || c.userBId === u.userId);
  })[0] || null;
}

function partnerOf_(c, u) {
  var partnerId = c.userAId === u.userId ? c.userBId : c.userAId;
  if (!partnerId) return null;
  var pAcc = rows_('Accounts').filter(function(a) { return a.userId === partnerId; })[0];
  if (pAcc) return { id: pAcc.userId, name: pAcc.displayName, username: pAcc.username || '', avatar: pAcc.avatar || '' };
  var pUser = rows_('Users').filter(function(usr) { return usr.userId === partnerId; })[0];
  if (pUser) return { id: pUser.userId, name: pUser.displayName, username: '', avatar: pUser.avatar || '' };
  return { id: partnerId, name: 'Partner', username: '', avatar: '' };
}

function connView_(c, u) {
  var partner = partnerOf_(c, u);
  var isExpired = c.inviteExpiresAt && Number(c.inviteExpiresAt) < Date.now() && !c.userBId;
  return {
    connectionId: c.connectionId,
    startDate: c.relationshipStartDate,
    partnerJoined: !!c.userBId,
    isOwner: c.userAId === u.userId,
    status: isExpired ? 'expired' : c.connectionStatus,
    partner: partner,
    inviteExpiresAt: c.inviteExpiresAt ? Number(c.inviteExpiresAt) : null,
    createdAt: c.createdAt
  };
}

function needConn_(u) {
  var c = myConn_(u);
  if (!c) throw err_('NO_CONN', 'No connection');
  return c;
}

function type_(t) {
  if (t !== 'watch' && t !== 'listen') throw err_('BAD_REQUEST', 'Bad session type');
  return t;
}

function parseMedia_(type, url) {
  url = String(url || '').trim().slice(0, 500);
  var m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (m) return { provider: 'youtube', id: m[1], url: url };
  var anghami = url.match(/anghami\.com\/(?:.*\/)?(?:song|album|playlist|artist)?\/?([0-9a-zA-Z_-]+)/i);
  if (anghami) return { provider: 'anghami', id: anghami[1], url: url };
  if (type === 'listen') {
    return { provider: 'audio', id: url, url: url };
  }
  throw err_('UNSUPPORTED', type === 'watch' ? 'Only YouTube links are supported' : 'YouTube, Anghami, or direct audio links are supported');
}

function activeSession_(cid, type) {
  return rows_('Sessions').filter(function(s) {
    return s.connectionId === cid && s.sessionType === type && s.status === 'active';
  })[0] || null;
}

function sessView_(s, u) {
  return {
    sessionId: s.sessionId,
    type: s.sessionType,
    provider: s.mediaProvider,
    mediaId: s.mediaId,
    mediaUrl: s.mediaUrl,
    state: s.playbackState,
    position: Number(s.currentTime),
    rate: Number(s.playbackRate),
    version: Number(s.version),
    updatedAt: Number(s.updatedAt),
    byMe: s.updatedBy === u.userId
  };
}

function partnerPresence_(c, u, type) {
  var other = c.userAId === u.userId ? c.userBId : c.userAId;
  if (!other) return false;
  return !!CacheService.getScriptCache().get('p_' + c.connectionId + type + other);
}

function logActivity_(connectionId, actorId, actionType, summary, entityType, entityId) {
  try {
    put_('Activities', {
      activityId: Utilities.getUuid(),
      connectionId: connectionId,
      actorId: actorId,
      actionType: actionType,
      summary: summary,
      entityType: entityType || '',
      entityId: entityId || '',
      createdAt: new Date().toISOString()
    });
  } catch (x) {
    console.error('Failed to log activity: ' + x);
  }
}

var PUBLIC_ACTIONS = {
  register: function(p) {
    var rawUsername = String(p.username || '').trim();
    var username = rawUsername.toLowerCase();
    var password = String(p.password || '');
    var displayName = String(p.displayName || p.username || '').trim() || username;
    var email = String(p.email || '').trim().toLowerCase();

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      throw err_('BAD_USERNAME', 'Username must be 3-30 characters using letters, numbers, dot, underscore or hyphen');
    }
    if (password.length < 8 || password.length > 128) {
      throw err_('BAD_PASSWORD', 'Password must be 8-128 characters');
    }

    var existingAccounts = rows_('Accounts');
    if (existingAccounts.some(function(a) {
      var u = String(a.username || '').trim().toLowerCase();
      var em = String(a.email || '').trim().toLowerCase();
      return u === username || (email && em === email);
    })) {
      throw err_('USERNAME_TAKEN', 'This username is already taken');
    }

    var userId = 'u' + Utilities.getUuid().replace(/-/g, '');
    var salt = Utilities.getUuid().replace(/-/g, '');
    var now = new Date().toISOString();
    var account = {
      userId: userId,
      username: username,
      salt: salt,
      passwordHash: passwordHash_(password, salt),
      displayName: displayName,
      avatar: p.avatar || '',
      email: email,
      createdAt: now,
      accountStatus: 'active'
    };
    put_('Accounts', account);
    put_('Users', {
      userId: userId,
      displayName: displayName,
      avatar: p.avatar || '',
      email: email,
      createdAt: now,
      accountStatus: 'active'
    });
    return issueToken_(account);
  },

  login: function(p) {
    var rawInput = String(p.username || p.email || '').trim();
    var lookup = rawInput.toLowerCase();
    var password = String(p.password || '');
    if (!lookup) throw err_('BAD_USERNAME', 'Username is required');
    if (!password) throw err_('BAD_PASSWORD', 'Password is required');

    var allAccounts = rows_('Accounts');
    var account = allAccounts.filter(function(a) {
      var u = String(a.username || '').trim().toLowerCase();
      var em = String(a.email || '').trim().toLowerCase();
      return (u === lookup || (em && em === lookup)) && isActive_(a);
    })[0];

    if (!account) {
      throw err_('INVALID_CREDENTIALS', 'Incorrect username or password');
    }

    var salt = String(account.salt || '');
    var storedHash = String(account.passwordHash || '');
    var computedHash = passwordHash_(password, salt);

    if (computedHash !== storedHash && storedHash !== password) {
      throw err_('INVALID_CREDENTIALS', 'Incorrect username or password');
    }

    return issueToken_(account);
  },

  googleLogin: function(p) {
    var token = String(p.idToken || p.token || '');
    var user = auth_(token);
    var now = Date.now();
    var sessionToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    put_('LoginSessions', {
      token: sessionToken,
      userId: user.userId,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000
    });
    return { token: sessionToken, user: { id: user.userId, name: user.name, avatar: user.avatar || '' } };
  }
};

var ACTIONS = {
  me: function(u) {
    if (!rows_('Users').some(function(r) { return r.userId === u.userId; })) {
      put_('Users', {
        userId: u.userId,
        displayName: u.name,
        avatar: u.avatar || '',
        email: u.email || '',
        createdAt: new Date().toISOString(),
        accountStatus: 'active'
      });
    }
    var c = myConn_(u);
    var unreadLettersCount = 0;
    var stats = { memories: 0, letters: 0, events: 0, wishlist: 0, daysTogether: 0 };
    if (c) {
      var now = Date.now();
      if (c.relationshipStartDate) {
        stats.daysTogether = Math.max(0, Math.floor((now - new Date(c.relationshipStartDate + 'T00:00:00').getTime()) / 864e5));
      }
      var memories = rows_('Memories').filter(function(m) {
        return m.connectionId === c.connectionId && m.status !== 'deleted' && (m.privacy !== 'private' || m.authorId === u.userId);
      });
      stats.memories = memories.length;

      var letters = rows_('Letters').filter(function(l) {
        return l.connectionId === c.connectionId && l.status !== 'deleted';
      });
      stats.letters = letters.length;
      unreadLettersCount = letters.filter(function(l) {
        var isDelivered = !l.scheduledFor || new Date(l.scheduledFor).getTime() <= now;
        return l.recipientId === u.userId && l.status === 'sent' && l.isRead !== 'true' && isDelivered;
      }).length;

      stats.events = rows_('Events').filter(function(e) {
        return e.connectionId === c.connectionId && e.status !== 'deleted';
      }).length;

      stats.wishlist = rows_('Wishlist').filter(function(w) {
        return w.connectionId === c.connectionId && w.status !== 'deleted';
      }).length;
    }

    var acc = rows_('Accounts').filter(function(a) { return a.userId === u.userId; })[0];
    var usr = rows_('Users').filter(function(r) { return r.userId === u.userId; })[0];
    var liveName = (acc && acc.displayName) || (usr && usr.displayName) || u.name;
    var liveAvatar = (acc && acc.avatar) || (usr && usr.avatar) || u.avatar || '💖';
    var liveEmail = (acc && acc.email) || (usr && usr.email) || u.email || '';
    var liveUsername = u.username || (acc && acc.username) || '';

    return {
      user: {
        id: u.userId,
        name: liveName,
        username: liveUsername,
        avatar: liveAvatar,
        email: liveEmail
      },
      connection: c ? connView_(c, u) : null,
      stats: stats,
      unreadLettersCount: unreadLettersCount
    };
  },

  updateProfile: function(u, p) {
    var displayName = String(p.displayName || '').trim();
    var avatar = String(p.avatar || '');
    var email = String(p.email || '').trim();
    if (displayName && displayName.length > 50) throw err_('BAD_REQUEST', 'Display name too long');

    var acc = rows_('Accounts').filter(function(a) { return a.userId === u.userId; })[0];
    if (acc) {
      if (displayName) acc.displayName = displayName;
      if (p.avatar !== undefined) acc.avatar = avatar;
      if (p.email !== undefined) acc.email = email;
      upd_('Accounts', acc);
    }
    var usr = rows_('Users').filter(function(a) { return a.userId === u.userId; })[0];
    if (usr) {
      if (displayName) usr.displayName = displayName;
      if (p.avatar !== undefined) usr.avatar = avatar;
      if (p.email !== undefined) usr.email = email;
      upd_('Users', usr);
    }

    try {
      var cache = CacheService.getScriptCache();
      if (u.token) {
        var cacheKey = 'sess_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, u.token));
        cache.remove(cacheKey);
      }
    } catch (cx) {}

    var updatedName = displayName || (acc && acc.displayName) || (usr && usr.displayName) || u.name;
    var updatedAvatar = (p.avatar !== undefined ? avatar : (acc && acc.avatar) || (usr && usr.avatar) || u.avatar || '💖');
    var updatedEmail = (p.email !== undefined ? email : (acc && acc.email) || (usr && usr.email) || u.email || '');

    return {
      user: {
        id: u.userId,
        name: updatedName,
        username: u.username || (acc && acc.username) || '',
        avatar: updatedAvatar,
        email: updatedEmail
      }
    };
  },

  changePassword: function(u, p) {
    var currentPassword = String(p.currentPassword || '');
    var newPassword = String(p.newPassword || '');
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw err_('BAD_PASSWORD', 'New password must be 8-128 characters');
    }
    var acc = rows_('Accounts').filter(function(a) { return a.userId === u.userId; })[0];
    if (!acc) throw err_('NO_ACCOUNT', 'Account not found for password change');
    if (passwordHash_(currentPassword, acc.salt) !== acc.passwordHash) {
      throw err_('INVALID_CREDENTIALS', 'Current password is incorrect');
    }
    var newSalt = Utilities.getUuid().replace(/-/g, '');
    acc.salt = newSalt;
    acc.passwordHash = passwordHash_(newPassword, newSalt);
    upd_('Accounts', acc);
    return { success: true };
  },

  deleteAccount: function(u) {
    var acc = rows_('Accounts').filter(function(a) { return a.userId === u.userId; })[0];
    if (acc) {
      acc.accountStatus = 'deleted';
      upd_('Accounts', acc);
    }
    var usr = rows_('Users').filter(function(a) { return a.userId === u.userId; })[0];
    if (usr) {
      usr.accountStatus = 'deleted';
      upd_('Users', usr);
    }
    var c = myConn_(u);
    if (c) {
      c.connectionStatus = 'ended';
      c.updatedAt = new Date().toISOString();
      upd_('Connections', c);
    }
    // Invalidate sessions
    rows_('LoginSessions').filter(function(s) { return s.userId === u.userId; }).forEach(function(s) {
      s.expiresAt = '0';
      upd_('LoginSessions', s);
      try {
        var cache = CacheService.getScriptCache();
        var cacheKey = 'sess_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s.token));
        cache.remove(cacheKey);
      } catch (cx) {}
    });
    return { success: true };
  },

  logout: function(u, p) {
    var token = (p && p.token) || '';
    if (token) {
      var s = rows_('LoginSessions').filter(function(row) { return row.token === token; })[0];
      if (s) {
        s.expiresAt = '0';
        upd_('LoginSessions', s);
      }
      try {
        var cache = CacheService.getScriptCache();
        var cacheKey = 'sess_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
        cache.remove(cacheKey);
      } catch (cx) {}
    }
    return { success: true };
  },

  createConnection: function(u, p) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.startDate))) throw err_('BAD_REQUEST', 'Invalid date');
    if (myConn_(u)) throw err_('EXISTS', 'Already connected');
    var A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', id = '';
    for (var i = 0; i < 8; i++) id += A.charAt(Math.floor(Math.random() * A.length));
    var now = new Date().toISOString();
    var expiresAt = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
    put_('Connections', {
      connectionId: id,
      userAId: u.userId,
      userBId: '',
      relationshipStartDate: p.startDate,
      connectionStatus: 'pending',
      inviteExpiresAt: expiresAt,
      createdAt: now,
      updatedAt: now
    });
    return { connection: connView_(myConn_(u), u) };
  },

  joinConnection: function(u, p) {
    var id = String(p.code || p.connectionId || '').trim().toUpperCase();
    if (myConn_(u)) throw err_('EXISTS', 'Already connected');
    var c = rows_('Connections').filter(function(r) {
      return r.connectionId === id && r.connectionStatus === 'pending';
    })[0];
    if (!c) throw err_('NOT_FOUND', 'Invalid or already used code');
    if (c.userAId === u.userId) throw err_('SELF', 'You cannot join your own connection');
    if (c.inviteExpiresAt && Number(c.inviteExpiresAt) < Date.now()) {
      throw err_('EXPIRED', 'This invitation code has expired');
    }
    c.userBId = u.userId;
    c.connectionStatus = 'active';
    c.updatedAt = new Date().toISOString();
    upd_('Connections', c);
    logActivity_(c.connectionId, u.userId, 'join', u.name + ' joined the connection!', 'connection', c.connectionId);
    return { connection: connView_(c, u) };
  },

  updateConnection: function(u, p) {
    var c = needConn_(u);
    if (p.startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.startDate))) throw err_('BAD_REQUEST', 'Invalid date format (YYYY-MM-DD)');
      c.relationshipStartDate = p.startDate;
    }
    c.updatedAt = new Date().toISOString();
    upd_('Connections', c);
    return { connection: connView_(c, u) };
  },

  cancelInvitation: function(u) {
    var c = myConn_(u);
    if (!c || c.userAId !== u.userId || c.userBId) throw err_('BAD_REQUEST', 'No pending invitation to cancel');
    c.connectionStatus = 'cancelled';
    c.updatedAt = new Date().toISOString();
    upd_('Connections', c);
    return { success: true };
  },

  disconnect: function(u) {
    var c = needConn_(u);
    c.connectionStatus = 'ended';
    c.updatedAt = new Date().toISOString();
    upd_('Connections', c);
    logActivity_(c.connectionId, u.userId, 'disconnect', u.name + ' unlinked the relationship', 'connection', c.connectionId);
    return { success: true };
  },

  // ===== MEMORIES =====
  getMemories: function(u, p) {
    var c = needConn_(u);
    var allMemories = rows_('Memories').filter(function(m) {
      return m.connectionId === c.connectionId && m.status !== 'deleted' && (m.privacy !== 'private' || m.authorId === u.userId);
    });

    var allPhotos = rows_('Photos').filter(function(ph) {
      return ph.connectionId === c.connectionId && ph.status !== 'deleted';
    });

    var results = allMemories.map(function(m) {
      var photos = allPhotos.filter(function(ph) { return ph.memoryId === m.memoryId; })
        .sort(function(a, b) { return Number(a.orderIndex || 0) - Number(b.orderIndex || 0); });
      var coverPhoto = photos.filter(function(ph) { return ph.photoId === m.coverPhotoId; })[0] || photos[0];
      var coverUrl = coverPhoto ? coverPhoto.url : (m.coverPhotoUrl || m.photoUrl || '');
      var mappedPhotos = photos.map(function(ph) {
        return {
          id: ph.photoId,
          url: ph.url,
          caption: ph.caption,
          orderIndex: Number(ph.orderIndex || 0),
          uploaderId: ph.uploaderId
        };
      });
      if (mappedPhotos.length === 0 && coverUrl) {
        mappedPhotos = [{
          id: m.coverPhotoId || ('ph_mem_' + m.memoryId),
          url: coverUrl,
          caption: m.title || '',
          orderIndex: 0,
          uploaderId: m.authorId
        }];
      }
      return {
        id: m.memoryId,
        memoryId: m.memoryId,
        title: m.title,
        memoryDate: m.memoryDate,
        location: m.location || '',
        content: m.content,
        category: m.category || 'general',
        tags: m.tags ? m.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [],
        isFavorite: m.isFavorite === 'true',
        privacy: m.privacy || 'shared',
        coverPhotoId: m.coverPhotoId || (photos[0] ? photos[0].photoId : ''),
        coverPhotoUrl: coverUrl,
        coverUrl: coverUrl,
        photoUrl: coverUrl,
        authorId: m.authorId,
        isByMe: m.authorId === u.userId,
        photos: mappedPhotos,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      };
    });

    results.sort(function(a, b) {
      return new Date(b.memoryDate).getTime() - new Date(a.memoryDate).getTime();
    });

    return { memories: results };
  },

  savePhotosForMemory_: function(c, u, memId, photos, now) {
    if (!Array.isArray(photos)) return [];
    var saved = [];
    photos.forEach(function(ph, idx) {
      if (!ph) return;
      var phUrl = typeof ph === 'string' ? ph : (ph.url || '');
      if (!phUrl) return;
      if (phUrl.indexOf('data:image/') === 0 && typeof DriveApp !== 'undefined' && DriveApp && typeof DriveApp.getFoldersByName === 'function') {
        try {
          var folderName = 'RelationshipsApp_Photos';
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          var mimeMatch = phUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
          var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          var base64Part = phUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
          var decoded = Utilities.base64Decode(base64Part);
          var blob = Utilities.newBlob(decoded, mime, 'photo_' + Date.now() + '_' + idx + '.jpg');
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          phUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
        } catch (dx) {
          // If DriveApp fails, keep phUrl as base64 without destructive slicing
        }
      }
      if (phUrl && phUrl.indexOf('data:') === 0 && phUrl.length > 48000) {
        phUrl = phUrl.slice(0, 48000);
      }
      var phId = ph.id || ('ph_' + Utilities.getUuid().replace(/-/g, ''));
      var caption = String(ph.caption || '');
      var existing = rows_('Photos').filter(function(r) { return r.photoId === phId; })[0];
      if (existing) {
        existing.url = phUrl;
        existing.caption = caption;
        existing.orderIndex = String(idx);
        existing.status = 'active';
        upd_('Photos', existing);
      } else {
        put_('Photos', {
          photoId: phId,
          connectionId: c.connectionId,
          memoryId: memId,
          uploaderId: u.userId,
          url: phUrl,
          caption: caption,
          orderIndex: String(idx),
          createdAt: now,
          status: 'active'
        });
      }
      saved.push({ photoId: phId, id: phId, url: phUrl, caption: caption });
    });
    return saved;
  },

  saveMemory: function(u, p) {
    var c = needConn_(u);
    var title = String(p.title || '').trim();
    var memoryDate = String(p.memoryDate || '').trim();
    if (!title) throw err_('BAD_REQUEST', 'Memory title is required');
    if (!/^\d{4}-\d{2}-\d{2}/.test(memoryDate)) throw err_('BAD_REQUEST', 'Valid memory date is required');

    var now = new Date().toISOString();
    var tagsStr = Array.isArray(p.tags) ? p.tags.join(',') : String(p.tags || '');

    var incomingPhotos = [];
    if (Array.isArray(p.photos) && p.photos.length > 0) {
      incomingPhotos = p.photos;
    } else if (p.photoUrl && typeof p.photoUrl === 'string' && p.photoUrl.trim()) {
      incomingPhotos = [{ url: p.photoUrl.trim(), caption: title }];
    }

    if (p.id) {
      var mem = rows_('Memories').filter(function(m) {
        return m.memoryId === p.id && m.connectionId === c.connectionId && m.status !== 'deleted';
      })[0];
      if (!mem) throw err_('NOT_FOUND', 'Memory not found');
      if (mem.privacy === 'private' && mem.authorId !== u.userId) throw err_('FORBIDDEN', 'Access denied');
      mem.title = title;
      mem.memoryDate = memoryDate;
      mem.location = String(p.location || '').trim();
      mem.content = String(p.content || '');
      mem.category = String(p.category || 'general');
      mem.tags = tagsStr;
      mem.isFavorite = p.isFavorite ? 'true' : 'false';
      mem.privacy = p.privacy || 'shared';
      mem.updatedAt = now;

      var savedPhotos = [];
      if (incomingPhotos.length > 0) {
        savedPhotos = ACTIONS.savePhotosForMemory_(c, u, mem.memoryId, incomingPhotos, now);
      }
      if (p.coverPhotoId !== undefined && p.coverPhotoId !== '') {
        mem.coverPhotoId = p.coverPhotoId;
      } else if (!mem.coverPhotoId && savedPhotos.length > 0) {
        mem.coverPhotoId = savedPhotos[0].photoId;
      }
      var coverUrlFromSaved = savedPhotos[0] ? savedPhotos[0].url : (p.coverPhotoUrl || p.photoUrl || '');
      if (coverUrlFromSaved) {
        mem.coverPhotoUrl = coverUrlFromSaved;
      }
      upd_('Memories', mem);

      var memPhotos = rows_('Photos').filter(function(ph) {
        return ph.connectionId === c.connectionId && ph.memoryId === mem.memoryId && ph.status !== 'deleted';
      }).sort(function(a, b) { return Number(a.orderIndex || 0) - Number(b.orderIndex || 0); });
      var coverPh = memPhotos.filter(function(ph) { return ph.photoId === mem.coverPhotoId; })[0] || memPhotos[0];
      var coverUrl = coverPh ? coverPh.url : (mem.coverPhotoUrl || '');

      logActivity_(c.connectionId, u.userId, 'memory_update', u.name + ' updated memory: "' + title + '"', 'memory', mem.memoryId);
      return {
        memory: {
          id: mem.memoryId,
          memoryId: mem.memoryId,
          title: mem.title,
          memoryDate: mem.memoryDate,
          location: mem.location,
          content: mem.content,
          category: mem.category,
          tags: mem.tags ? mem.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [],
          isFavorite: mem.isFavorite === 'true',
          privacy: mem.privacy,
          coverPhotoId: mem.coverPhotoId,
          coverPhotoUrl: coverUrl,
          coverUrl: coverUrl,
          photoUrl: coverUrl,
          photos: memPhotos.map(function(ph) {
            return { id: ph.photoId, url: ph.url, caption: ph.caption, orderIndex: Number(ph.orderIndex || 0), uploaderId: ph.uploaderId };
          }),
          createdAt: mem.createdAt,
          updatedAt: mem.updatedAt
        }
      };
    } else {
      var id = Utilities.getUuid();
      var savedPhotos = [];
      if (incomingPhotos.length > 0) {
        savedPhotos = ACTIONS.savePhotosForMemory_(c, u, id, incomingPhotos, now);
      }
      var coverPhotoId = p.coverPhotoId || (savedPhotos.length > 0 ? savedPhotos[0].photoId : '');
      var coverUrlInitial = savedPhotos[0] ? savedPhotos[0].url : (p.coverPhotoUrl || p.photoUrl || '');

      var newMem = {
        memoryId: id,
        connectionId: c.connectionId,
        authorId: u.userId,
        title: title,
        memoryDate: memoryDate,
        location: String(p.location || '').trim(),
        content: String(p.content || ''),
        category: String(p.category || 'general'),
        tags: tagsStr,
        isFavorite: p.isFavorite ? 'true' : 'false',
        privacy: p.privacy || 'shared',
        coverPhotoId: coverPhotoId,
        coverPhotoUrl: coverUrlInitial,
        createdAt: now,
        updatedAt: now,
        status: 'active'
      };
      put_('Memories', newMem);

      var memPhotos = rows_('Photos').filter(function(ph) {
        return ph.connectionId === c.connectionId && ph.memoryId === id && ph.status !== 'deleted';
      }).sort(function(a, b) { return Number(a.orderIndex || 0) - Number(b.orderIndex || 0); });
      var coverPh = memPhotos.filter(function(ph) { return ph.photoId === coverPhotoId; })[0] || memPhotos[0];
      var coverUrl = coverPh ? coverPh.url : (savedPhotos[0] ? savedPhotos[0].url : '');

      logActivity_(c.connectionId, u.userId, 'memory_create', u.name + ' added a new memory: "' + title + '"', 'memory', id);
      return {
        memory: {
          id: id,
          memoryId: id,
          title: newMem.title,
          memoryDate: newMem.memoryDate,
          location: newMem.location,
          content: newMem.content,
          category: newMem.category,
          tags: newMem.tags ? newMem.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [],
          isFavorite: newMem.isFavorite === 'true',
          privacy: newMem.privacy,
          coverPhotoId: newMem.coverPhotoId,
          coverPhotoUrl: coverUrl,
          coverUrl: coverUrl,
          photoUrl: coverUrl,
          photos: memPhotos.map(function(ph) {
            return { id: ph.photoId, url: ph.url, caption: ph.caption, orderIndex: Number(ph.orderIndex || 0), uploaderId: ph.uploaderId };
          }),
          createdAt: newMem.createdAt,
          updatedAt: newMem.updatedAt
        }
      };
    }
  },

  deleteMemory: function(u, p) {
    var c = needConn_(u);
    var mem = rows_('Memories').filter(function(m) {
      return m.memoryId === p.id && m.connectionId === c.connectionId && m.status !== 'deleted';
    })[0];
    if (!mem) throw err_('NOT_FOUND', 'Memory not found');
    if (mem.privacy === 'private' && mem.authorId !== u.userId) throw err_('FORBIDDEN', 'Access denied');
    mem.status = 'deleted';
    mem.updatedAt = new Date().toISOString();
    upd_('Memories', mem);
    logActivity_(c.connectionId, u.userId, 'memory_delete', u.name + ' deleted a memory', 'memory', mem.memoryId);
    return { success: true };
  },

  // ===== PHOTOS =====
  uploadPhoto: function(u, p) {
    var c = needConn_(u);
    var data = String(p.data || p.url || p.photoUrl || '');
    if (!data) throw err_('BAD_REQUEST', 'Photo data is required');

    var photoUrl = data;
    var isHttp = /^https?:\/\//i.test(data);
    if (!isHttp) {
      if (!/^data:image\//i.test(data)) {
        throw err_('BAD_FILE', 'Invalid image data');
      }
      var mimeMatch = data.match(/^data:(image\/[a-zA-Z0-9.+_-]+)/i);
      var mime = (mimeMatch ? mimeMatch[1] : (p.mimeType || 'image/jpeg')).toLowerCase();
      if (!/^image\/(jpe?g|png|webp|gif|jfif)$/i.test(mime)) {
        mime = 'image/jpeg';
      }

      if (typeof DriveApp !== 'undefined' && DriveApp && typeof DriveApp.getFoldersByName === 'function') {
        try {
          var folderName = 'RelationshipsApp_Photos';
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          var base64Part = data.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
          var decoded = Utilities.base64Decode(base64Part);
          var blob = Utilities.newBlob(decoded, mime, p.fileName || ('photo_' + Date.now() + '.jpg'));
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          photoUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
        } catch (dx) {
          photoUrl = data; // fallback to base64 data URI
        }
      }
      if (photoUrl && photoUrl.indexOf('data:') === 0 && photoUrl.length > 48000) {
        photoUrl = photoUrl.slice(0, 48000);
      }
    }

    var photoId = Utilities.getUuid();
    var photo = {
      photoId: photoId,
      connectionId: c.connectionId,
      memoryId: p.memoryId || '',
      uploaderId: u.userId,
      url: photoUrl,
      caption: String(p.caption || ''),
      orderIndex: String(p.orderIndex || 0),
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    put_('Photos', photo);

    if (p.isCover && p.memoryId) {
      var mem = rows_('Memories').filter(function(m) { return m.memoryId === p.memoryId; })[0];
      if (mem) {
        mem.coverPhotoId = photoId;
        mem.coverPhotoUrl = photoUrl;
        upd_('Memories', mem);
      }
    }

    return { photo: photo };
  },

  getPhotos: function(u, p) {
    var c = needConn_(u);
    var photos = rows_('Photos').filter(function(item) {
      return item.connectionId === c.connectionId && item.status !== 'deleted';
    });
    var allMemories = rows_('Memories').filter(function(m) {
      return m.connectionId === c.connectionId && m.status !== 'deleted' && (m.privacy !== 'private' || m.authorId === u.userId);
    });
    allMemories.forEach(function(m) {
      var mCover = m.coverPhotoUrl || m.photoUrl || '';
      if (mCover && !photos.some(function(ph) { return ph.url === mCover; })) {
        photos.push({
          photoId: m.coverPhotoId || ('ph_mem_' + m.memoryId),
          connectionId: c.connectionId,
          memoryId: m.memoryId,
          uploaderId: m.authorId,
          url: mCover,
          caption: m.title || '',
          orderIndex: '0',
          createdAt: m.createdAt || m.memoryDate,
          status: 'active'
        });
      }
    });
    photos.sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return {
      photos: photos.map(function(ph) {
        return {
          id: ph.photoId,
          photoId: ph.photoId,
          url: ph.url,
          caption: ph.caption || '',
          orderIndex: Number(ph.orderIndex || 0),
          uploaderId: ph.uploaderId,
          createdAt: ph.createdAt,
          memoryId: ph.memoryId || ''
        };
      })
    };
  },

  deletePhoto: function(u, p) {
    var c = needConn_(u);
    var ph = rows_('Photos').filter(function(item) {
      return item.photoId === p.id && item.connectionId === c.connectionId && item.status !== 'deleted';
    })[0];
    if (!ph) throw err_('NOT_FOUND', 'Photo not found');
    ph.status = 'deleted';
    upd_('Photos', ph);
    return { success: true };
  },

  setCoverPhoto: function(u, p) {
    var c = needConn_(u);
    var mem = rows_('Memories').filter(function(m) {
      return m.memoryId === p.memoryId && m.connectionId === c.connectionId;
    })[0];
    if (!mem) throw err_('NOT_FOUND', 'Memory not found');
    mem.coverPhotoId = p.photoId;
    upd_('Memories', mem);
    return { success: true };
  },

  // ===== FREE TYPING / NOTES =====
  getNote: function(u, p) {
    var c = needConn_(u);
    var note = rows_('Notes').filter(function(n) {
      return n.connectionId === c.connectionId && n.status !== 'deleted';
    })[0];
    if (!note) {
      return {
        note: {
          noteId: '',
          title: 'Shared Note',
          content: '',
          version: 1,
          updatedAt: Date.now()
        }
      };
    }
    return {
      note: {
        noteId: note.noteId,
        title: note.title,
        content: note.content,
        version: Number(note.version || 1),
        updatedAt: Number(note.updatedAt || Date.now())
      }
    };
  },

  saveNote: function(u, p) {
    var c = needConn_(u);
    var note = rows_('Notes').filter(function(n) {
      return n.connectionId === c.connectionId && n.status !== 'deleted';
    })[0];
    var now = Date.now();
    if (note) {
      if (p.baseVersion && Number(p.baseVersion) !== Number(note.version)) {
        return {
          conflict: true,
          note: {
            noteId: note.noteId,
            title: note.title,
            content: note.content,
            version: Number(note.version),
            updatedAt: Number(note.updatedAt)
          }
        };
      }
      note.title = String(p.title || note.title || 'Shared Note');
      note.content = String(p.content || '');
      note.version = Number(note.version || 1) + 1;
      note.updatedAt = String(now);
      upd_('Notes', note);
      return {
        note: {
          noteId: note.noteId,
          title: note.title,
          content: note.content,
          version: Number(note.version),
          updatedAt: Number(note.updatedAt)
        }
      };
    } else {
      var newNote = {
        noteId: Utilities.getUuid(),
        connectionId: c.connectionId,
        authorId: u.userId,
        title: String(p.title || 'Shared Note'),
        content: String(p.content || ''),
        format: 'html',
        version: 1,
        updatedAt: String(now),
        status: 'active'
      };
      put_('Notes', newNote);
      return {
        note: {
          noteId: newNote.noteId,
          title: newNote.title,
          content: newNote.content,
          version: 1,
          updatedAt: now
        }
      };
    }
  },

  // ===== LETTERS =====
  getLetters: function(u) {
    var c = needConn_(u);
    var now = Date.now();
    var letters = rows_('Letters').filter(function(l) {
      return l.connectionId === c.connectionId && l.status !== 'deleted';
    });

    var received = letters.filter(function(l) {
      return l.recipientId === u.userId && (l.status === 'sent' || l.status === 'scheduled');
    }).map(function(l) {
      var isDelivered = !l.scheduledFor || new Date(l.scheduledFor).getTime() <= now;
      return {
        id: l.letterId,
        title: l.title,
        theme: l.theme || 'classic',
        scheduledFor: l.scheduledFor,
        sentAt: l.sentAt,
        isRead: l.isRead === 'true',
        readAt: l.readAt,
        isLocked: !isDelivered,
        content: isDelivered ? l.content : ''
      };
    });

    var sent = letters.filter(function(l) {
      return l.senderId === u.userId && (l.status === 'sent' || l.status === 'scheduled');
    }).map(function(l) {
      var isDelivered = !l.scheduledFor || new Date(l.scheduledFor).getTime() <= now;
      return {
        id: l.letterId,
        title: l.title,
        content: l.content,
        theme: l.theme || 'classic',
        status: l.status,
        scheduledFor: l.scheduledFor,
        sentAt: l.sentAt,
        isRead: l.isRead === 'true',
        readAt: l.readAt,
        isDelivered: isDelivered
      };
    });

    var drafts = letters.filter(function(l) {
      return l.senderId === u.userId && l.status === 'draft';
    }).map(function(l) {
      return {
        id: l.letterId,
        title: l.title,
        content: l.content,
        theme: l.theme || 'classic',
        scheduledFor: l.scheduledFor,
        createdAt: l.createdAt
      };
    });

    return { received: received, sent: sent, drafts: drafts };
  },

  saveLetter: function(u, p) {
    var c = needConn_(u);
    var title = String(p.title || 'Untitled Letter').trim();
    var partner = partnerOf_(c, u);
    var recipientId = partner ? partner.id : '';
    var now = new Date().toISOString();

    if (p.id) {
      var lettr = rows_('Letters').filter(function(l) {
        return l.letterId === p.id && l.senderId === u.userId;
      })[0];
      if (!lettr) throw err_('NOT_FOUND', 'Letter not found');
      lettr.title = title;
      lettr.content = String(p.content || '');
      lettr.theme = String(p.theme || 'classic');
      lettr.scheduledFor = p.scheduledFor || '';
      upd_('Letters', lettr);
      lettr.id = lettr.letterId;
      return { letter: lettr };
    } else {
      var newLetter = {
        letterId: Utilities.getUuid(),
        connectionId: c.connectionId,
        senderId: u.userId,
        recipientId: recipientId,
        title: title,
        content: String(p.content || ''),
        theme: String(p.theme || 'classic'),
        status: 'draft',
        scheduledFor: p.scheduledFor || '',
        sentAt: '',
        isRead: 'false',
        readAt: '',
        createdAt: now
      };
      put_('Letters', newLetter);
      newLetter.id = newLetter.letterId;
      return { letter: newLetter };
    }
  },

  sendLetter: function(u, p) {
    var c = needConn_(u);
    var partner = partnerOf_(c, u);
    if (!partner) throw err_('NO_PARTNER', 'Your partner has not joined the connection yet');

    var title = String(p.title || 'A Letter for You').trim();
    var content = String(p.content || '').trim();
    if (!content) throw err_('BAD_REQUEST', 'Letter content cannot be empty');

    var scheduledFor = p.scheduledFor ? String(p.scheduledFor) : '';
    var isFuture = scheduledFor && new Date(scheduledFor).getTime() > Date.now();
    var now = new Date().toISOString();

    var lettr;
    if (p.id) {
      lettr = rows_('Letters').filter(function(l) {
        return l.letterId === p.id && l.senderId === u.userId;
      })[0];
    }

    if (lettr) {
      lettr.title = title;
      lettr.content = content;
      lettr.theme = String(p.theme || lettr.theme || 'classic');
      lettr.status = isFuture ? 'scheduled' : 'sent';
      lettr.scheduledFor = scheduledFor;
      lettr.sentAt = now;
      upd_('Letters', lettr);
    } else {
      lettr = {
        letterId: Utilities.getUuid(),
        connectionId: c.connectionId,
        senderId: u.userId,
        recipientId: partner.id,
        title: title,
        content: content,
        theme: String(p.theme || 'classic'),
        status: isFuture ? 'scheduled' : 'sent',
        scheduledFor: scheduledFor,
        sentAt: now,
        isRead: 'false',
        readAt: '',
        createdAt: now
      };
      put_('Letters', lettr);
    }

    logActivity_(c.connectionId, u.userId, 'letter_sent', u.name + (isFuture ? ' scheduled a future letter: "' : ' sent a love letter: "') + title + '"', 'letter', lettr.letterId);
    lettr.id = lettr.letterId;
    return { letter: lettr };
  },

  cancelLetter: function(u, p) {
    var c = needConn_(u);
    var lettr = rows_('Letters').filter(function(l) {
      return l.letterId === p.id && l.senderId === u.userId && l.status === 'scheduled';
    })[0];
    if (!lettr) throw err_('NOT_FOUND', 'Scheduled letter not found or already delivered');
    lettr.status = 'draft';
    upd_('Letters', lettr);
    return { success: true };
  },

  markLetterRead: function(u, p) {
    var c = needConn_(u);
    var lettr = rows_('Letters').filter(function(l) {
      return l.letterId === p.id && l.connectionId === c.connectionId && l.recipientId === u.userId;
    })[0];
    if (!lettr) throw err_('NOT_FOUND', 'Letter not found');
    if (lettr.isRead !== 'true') {
      lettr.isRead = 'true';
      lettr.readAt = new Date().toISOString();
      upd_('Letters', lettr);
      logActivity_(c.connectionId, u.userId, 'letter_read', u.name + ' read the letter: "' + lettr.title + '"', 'letter', lettr.letterId);
    }
    return { success: true };
  },

  // ===== CALENDAR & EVENTS =====
  getEvents: function(u) {
    var c = needConn_(u);
    var events = rows_('Events').filter(function(e) {
      return e.connectionId === c.connectionId && e.status !== 'deleted';
    }).map(function(e) {
      return {
        id: e.eventId,
        title: e.title,
        eventDate: e.eventDate,
        eventType: e.eventType || 'event',
        recurrence: e.recurrence || 'none',
        reminderDays: Number(e.reminderDays || 0),
        notes: e.notes || '',
        creatorId: e.creatorId,
        isByMe: e.creatorId === u.userId
      };
    });

    // Automatically synthesize relationship milestone if startDate exists
    if (c.relationshipStartDate) {
      events.push({
        id: 'anniversary_' + c.connectionId,
        title: 'Anniversary',
        eventDate: c.relationshipStartDate,
        eventType: 'anniversary',
        recurrence: 'yearly',
        reminderDays: 7,
        notes: 'Our relationship anniversary!',
        isSystem: true
      });
    }

    events.sort(function(a, b) {
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });

    return { events: events };
  },

  saveEvent: function(u, p) {
    var c = needConn_(u);
    var title = String(p.title || '').trim();
    var eventDate = String(p.eventDate || '').trim();
    if (!title) throw err_('BAD_REQUEST', 'Event title is required');
    if (!/^\d{4}-\d{2}-\d{2}/.test(eventDate)) throw err_('BAD_REQUEST', 'Valid event date is required');

    var now = new Date().toISOString();
    if (p.id) {
      var evt = rows_('Events').filter(function(e) {
        return e.eventId === p.id && e.connectionId === c.connectionId && e.status !== 'deleted';
      })[0];
      if (!evt) throw err_('NOT_FOUND', 'Event not found');
      evt.title = title;
      evt.eventDate = eventDate;
      evt.eventType = String(p.eventType || 'event');
      evt.recurrence = String(p.recurrence || 'none');
      evt.reminderDays = String(p.reminderDays || 0);
      evt.notes = String(p.notes || '');
      upd_('Events', evt);
      logActivity_(c.connectionId, u.userId, 'event_update', u.name + ' updated event: "' + title + '"', 'event', evt.eventId);
      evt.id = evt.eventId;
      return { event: evt };
    } else {
      var newEvt = {
        eventId: Utilities.getUuid(),
        connectionId: c.connectionId,
        creatorId: u.userId,
        title: title,
        eventDate: eventDate,
        eventType: String(p.eventType || 'event'),
        recurrence: String(p.recurrence || 'none'),
        reminderDays: String(p.reminderDays || 0),
        notes: String(p.notes || ''),
        createdAt: now,
        status: 'active'
      };
      put_('Events', newEvt);
      logActivity_(c.connectionId, u.userId, 'event_create', u.name + ' scheduled event: "' + title + '"', 'event', newEvt.eventId);
      newEvt.id = newEvt.eventId;
      return { event: newEvt };
    }
  },

  deleteEvent: function(u, p) {
    var c = needConn_(u);
    var evt = rows_('Events').filter(function(e) {
      return e.eventId === p.id && e.connectionId === c.connectionId && e.status !== 'deleted';
    })[0];
    if (!evt) throw err_('NOT_FOUND', 'Event not found');
    evt.status = 'deleted';
    upd_('Events', evt);
    logActivity_(c.connectionId, u.userId, 'event_delete', u.name + ' removed an event', 'event', evt.eventId);
    return { success: true };
  },

  // ===== WISHLIST =====
  getWishlist: function(u) {
    var c = needConn_(u);
    var items = rows_('Wishlist').filter(function(w) {
      return w.connectionId === c.connectionId && w.status !== 'deleted';
    }).map(function(w) {
      return {
        id: w.itemId,
        title: w.title,
        category: w.category || 'gifts',
        priority: w.priority || 'medium',
        price: w.price || '',
        url: w.url || '',
        targetDate: w.targetDate || '',
        status: w.status || 'idea',
        notes: w.notes || '',
        creatorId: w.creatorId,
        isByMe: w.creatorId === u.userId,
        createdAt: w.createdAt
      };
    });
    return { wishlist: items, items: items };
  },

  saveWishlistItem: function(u, p) {
    var c = needConn_(u);
    var title = String(p.title || '').trim();
    if (!title) throw err_('BAD_REQUEST', 'Item title is required');

    var now = new Date().toISOString();
    if (p.id) {
      var item = rows_('Wishlist').filter(function(w) {
        return w.itemId === p.id && w.connectionId === c.connectionId && w.status !== 'deleted';
      })[0];
      if (!item) throw err_('NOT_FOUND', 'Item not found');
      item.title = title;
      item.category = String(p.category || 'gifts');
      item.priority = String(p.priority || 'medium');
      item.price = String(p.price || '');
      item.url = String(p.url || '');
      item.targetDate = String(p.targetDate || '');
      item.status = String(p.status || item.status || 'idea');
      item.notes = String(p.notes || '');
      upd_('Wishlist', item);
      logActivity_(c.connectionId, u.userId, 'wishlist_update', u.name + ' updated wish: "' + title + '"', 'wishlist', item.itemId);
      item.id = item.itemId;
      return { item: item };
    } else {
      var newItem = {
        itemId: Utilities.getUuid(),
        connectionId: c.connectionId,
        creatorId: u.userId,
        title: title,
        category: String(p.category || 'gifts'),
        priority: String(p.priority || 'medium'),
        price: String(p.price || ''),
        url: String(p.url || ''),
        targetDate: String(p.targetDate || ''),
        status: String(p.status || 'idea'),
        notes: String(p.notes || ''),
        createdAt: now
      };
      put_('Wishlist', newItem);
      logActivity_(c.connectionId, u.userId, 'wishlist_create', u.name + ' added to wishlist: "' + title + '"', 'wishlist', newItem.itemId);
      newItem.id = newItem.itemId;
      return { item: newItem };
    }
  },

  updateWishlistStatus: function(u, p) {
    var c = needConn_(u);
    var item = rows_('Wishlist').filter(function(w) {
      return w.itemId === p.id && w.connectionId === c.connectionId && w.status !== 'deleted';
    })[0];
    if (!item) throw err_('NOT_FOUND', 'Item not found');
    var status = String(p.status || 'completed');
    item.status = status;
    upd_('Wishlist', item);
    logActivity_(c.connectionId, u.userId, 'wishlist_status', u.name + ' marked wish "' + item.title + '" as ' + status, 'wishlist', item.itemId);
    item.id = item.itemId;
    return { item: item };
  },

  deleteWishlistItem: function(u, p) {
    var c = needConn_(u);
    var item = rows_('Wishlist').filter(function(w) {
      return w.itemId === p.id && w.connectionId === c.connectionId && w.status !== 'deleted';
    })[0];
    if (!item) throw err_('NOT_FOUND', 'Item not found');
    item.status = 'deleted';
    upd_('Wishlist', item);
    logActivity_(c.connectionId, u.userId, 'wishlist_delete', u.name + ' removed a wish', 'wishlist', item.itemId);
    return { success: true };
  },

  // ===== MEDIA QUEUE / PLAYLIST =====
  getMediaQueue: function(u, p) {
    var c = needConn_(u);
    var type = type_(p.type);
    var items = rows_('MediaQueue').filter(function(q) {
      return q.connectionId === c.connectionId && q.mediaType === type && q.status !== 'deleted';
    }).map(function(q) {
      return {
        id: q.queueId,
        title: q.title,
        url: q.url,
        provider: q.provider,
        mediaId: q.mediaId,
        isFavorite: q.isFavorite === 'true',
        status: q.status || 'pending',
        orderIndex: Number(q.orderIndex || 0),
        creatorId: q.creatorId
      };
    });
    items.sort(function(a, b) { return a.orderIndex - b.orderIndex; });
    return { queue: items };
  },

  addMediaQueueItem: function(u, p) {
    var c = needConn_(u);
    var type = type_(p.type);
    var m = parseMedia_(type, p.url);
    var title = String(p.title || m.id || 'Media').trim();

    var existingCount = rows_('MediaQueue').filter(function(q) {
      return q.connectionId === c.connectionId && q.mediaType === type && q.status !== 'deleted';
    }).length;

    var item = {
      queueId: Utilities.getUuid(),
      connectionId: c.connectionId,
      creatorId: u.userId,
      mediaType: type,
      title: title,
      url: m.url,
      provider: m.provider,
      mediaId: m.id,
      isFavorite: p.isFavorite ? 'true' : 'false',
      status: 'pending',
      orderIndex: String(existingCount),
      createdAt: new Date().toISOString()
    };
    put_('MediaQueue', item);
    logActivity_(c.connectionId, u.userId, 'media_add', u.name + ' added to shared ' + type + ' list: "' + title + '"', 'media', item.queueId);
    item.id = item.queueId;
    return { item: item };
  },

  updateMediaQueueItem: function(u, p) {
    var c = needConn_(u);
    var item = rows_('MediaQueue').filter(function(q) {
      return q.queueId === p.id && q.connectionId === c.connectionId && q.status !== 'deleted';
    })[0];
    if (!item) throw err_('NOT_FOUND', 'Item not found');
    if (p.isFavorite !== undefined) item.isFavorite = p.isFavorite ? 'true' : 'false';
    if (p.status !== undefined) item.status = String(p.status);
    if (p.orderIndex !== undefined) item.orderIndex = String(p.orderIndex);
    upd_('MediaQueue', item);
    item.id = item.queueId;
    return { item: item };
  },

  deleteMediaQueueItem: function(u, p) {
    var c = needConn_(u);
    var item = rows_('MediaQueue').filter(function(q) {
      return q.queueId === p.id && q.connectionId === c.connectionId && q.status !== 'deleted';
    })[0];
    if (!item) throw err_('NOT_FOUND', 'Item not found');
    item.status = 'deleted';
    upd_('MediaQueue', item);
    return { success: true };
  },

  // ===== SYNC ROOM SESSIONS =====
  createSession: function(u, p) {
    var c = needConn_(u), type = type_(p.type), m = parseMedia_(type, p.url), old = activeSession_(c.connectionId, type);
    if (old) { old.status = 'ended'; upd_('Sessions', old); }
    var s = {
      sessionId: Utilities.getUuid(),
      connectionId: c.connectionId,
      sessionType: type,
      mediaProvider: m.provider,
      mediaId: m.id,
      mediaUrl: m.url,
      playbackState: 'paused',
      currentTime: 0,
      playbackRate: 1,
      hostUserId: u.userId,
      version: 1,
      updatedBy: u.userId,
      updatedAt: Date.now(),
      status: 'active'
    };
    put_('Sessions', s);
    return { session: sessView_(s, u), serverTime: Date.now() };
  },

  getSession: function(u, p) {
    var c = needConn_(u), type = type_(p.type);
    CacheService.getScriptCache().put('p_' + c.connectionId + type + u.userId, '1', 45);
    var s = activeSession_(c.connectionId, type), out = { partnerOnline: partnerPresence_(c, u, type), serverTime: Date.now() };
    if (!s) { out.session = null; return out; }
    if (Number(s.version) === Number(p.sinceVersion)) { out.notModified = true; return out; }
    out.session = sessView_(s, u);
    return out;
  },

  updateSession: function(u, p) {
    var c = needConn_(u), type = type_(p.type), s = activeSession_(c.connectionId, type), patch = p.patch || {};
    if (!s) throw err_('NO_SESSION', 'No active session');
    if (Number(p.baseVersion) !== Number(s.version)) {
      return { conflict: true, session: sessView_(s, u), serverTime: Date.now() };
    }
    if (patch.playbackState !== undefined) {
      if (patch.playbackState !== 'playing' && patch.playbackState !== 'paused') throw err_('BAD_REQUEST', 'Bad state');
      s.playbackState = patch.playbackState;
    }
    if (patch.currentTime !== undefined) {
      var t = Number(patch.currentTime);
      if (!isFinite(t) || t < 0 || t > 864000) throw err_('BAD_REQUEST', 'Bad time');
      s.currentTime = t;
    }
    if (patch.playbackRate !== undefined) {
      var r = Number(patch.playbackRate);
      if (!isFinite(r) || r < 0.25 || r > 2) throw err_('BAD_REQUEST', 'Bad rate');
      s.playbackRate = r;
    }
    if (patch.url !== undefined) {
      var m = parseMedia_(type, patch.url);
      s.mediaProvider = m.provider;
      s.mediaId = m.id;
      s.mediaUrl = m.url;
      s.currentTime = 0;
      s.playbackState = 'paused';
    }
    s.version = Number(s.version) + 1;
    s.updatedBy = u.userId;
    s.updatedAt = Date.now();
    upd_('Sessions', s);
    return { session: sessView_(s, u), serverTime: Date.now() };
  },

  leaveSession: function(u, p) {
    var c = needConn_(u), type = type_(p.type);
    CacheService.getScriptCache().remove('p_' + c.connectionId + type + u.userId);
    return {};
  },

  // ===== ACTIVITIES & DISCOVERY =====
  getActivities: function(u) {
    var c = needConn_(u);
    var list = rows_('Activities').filter(function(a) {
      return a.connectionId === c.connectionId;
    }).slice(-50).reverse().map(function(a) {
      return {
        id: a.activityId,
        actionType: a.actionType,
        summary: a.summary,
        entityType: a.entityType,
        entityId: a.entityId,
        isByMe: a.actorId === u.userId,
        createdAt: a.createdAt
      };
    });

    var prompts = [
      { id: 1, en: "What is your favorite memory of us together?", ar: "ما هي ذكراك المفضلة من أوقاتنا معًا؟" },
      { id: 2, en: "Where is the dream destination you want us to travel to next?", ar: "ما هي وجهة أحلامك التي تتمنى أن نسافر إليها معًا؟" },
      { id: 3, en: "What is a small thing I do that always makes you smile?", ar: "ما هو الشيء الصغير الذي أفعله ويجعلك تبتسم دائمًا؟" },
      { id: 4, en: "What song always reminds you of our story?", ar: "ما هي الأغنية التي تذكرك دائمًا بقصتنا؟" },
      { id: 5, en: "What are three goals you want us to achieve this year?", ar: "ما هي ثلاثة أهداف تريد أن نحققها سويًا هذا العام؟" },
      { id: 6, en: "If we had an entire free day with no obligations, how would we spend it?", ar: "إذا كان لدينا يوم كامل بلا أي التزامات، كيف نقضيه؟" },
      { id: 7, en: "What is something new you'd love us to try together?", ar: "ما هو الشيء الجديد الذي تود أن نجربه سويًا لأول مرة؟" }
    ];

    return { activities: list, prompts: prompts };
  },

  // ===== STORYBOOK =====
  getStorybook: function(u) {
    var c = needConn_(u);
    var book = rows_('Storybooks').filter(function(b) {
      return b.connectionId === c.connectionId && b.status !== 'deleted';
    })[0];
    if (!book) {
      return {
        book: {
          bookId: 'sb_' + c.connectionId,
          connectionId: c.connectionId,
          title: 'Our Story',
          coverPhotoUrl: '',
          theme: 'vintage',
          config: JSON.stringify({ chapters: [], includedIds: [], customPages: [] }),
          lastReadPage: 0
        }
      };
    }
    return {
      book: {
        bookId: book.bookId,
        connectionId: book.connectionId,
        title: book.title || 'Our Story',
        coverPhotoUrl: book.coverPhotoUrl || '',
        theme: book.theme || 'vintage',
        config: book.config || '{}',
        lastReadPage: Number(book.lastReadPage) || 0,
        updatedAt: book.updatedAt
      }
    };
  },

  saveStorybook: function(u, p) {
    var c = needConn_(u);
    var all = rows_('Storybooks');
    var book = all.filter(function(b) {
      return b.connectionId === c.connectionId && b.status !== 'deleted';
    })[0];
    var now = new Date().toISOString();
    var title = String(p.title || 'Our Story').slice(0, 100);
    var coverPhotoUrl = String(p.coverPhotoUrl || '');
    if (coverPhotoUrl && coverPhotoUrl.indexOf('data:') === 0 && coverPhotoUrl.length > 48000) {
      coverPhotoUrl = coverPhotoUrl.slice(0, 48000);
    }
    var theme = String(p.theme || 'vintage');
    var config = typeof p.config === 'object' ? JSON.stringify(p.config) : String(p.config || '{}');
    var lastReadPage = String(p.lastReadPage !== undefined ? p.lastReadPage : 0);

    if (book) {
      book.title = title;
      book.coverPhotoUrl = coverPhotoUrl;
      book.theme = theme;
      book.config = config;
      book.lastReadPage = lastReadPage;
      book.updatedBy = u.userId;
      book.updatedAt = now;
      upd_('Storybooks', book);
    } else {
      book = {
        bookId: 'sb_' + c.connectionId,
        connectionId: c.connectionId,
        title: title,
        coverPhotoUrl: coverPhotoUrl,
        theme: theme,
        config: config,
        lastReadPage: lastReadPage,
        updatedBy: u.userId,
        updatedAt: now,
        status: 'active'
      };
      put_('Storybooks', book);
    }
    logActivity_(c.connectionId, u.userId, 'storybook_update', u.name + ' updated Our Storybook', 'storybook', book.bookId);
    return { success: true, book: book };
  }
};

function doGet() { return out_({ ok: true, app: 'RelationshipsApp' }); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  var res;
  var lock;
  var locked = false;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(req.action || '');
    var params = req.params || {};

    if (Object.prototype.hasOwnProperty.call(PUBLIC_ACTIONS, action)) {
      if (WRITES[action]) {
        lock = LockService.getScriptLock();
        lock.waitLock(10000);
        locked = true;
      }
      res = { ok: true, data: PUBLIC_ACTIONS[action](params) };
    } else {
      if (!Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
        throw err_('BAD_ACTION', 'Unknown action');
      }
      var u = auth_(req.token);
      u.token = req.token;
      if (WRITES[action]) {
        lock = LockService.getScriptLock();
        lock.waitLock(10000);
        locked = true;
      }
      res = { ok: true, data: ACTIONS[action](u, params) };
    }
  } catch (x) {
    res = { ok: false, code: x.code || 'SERVER', error: x.code ? x.message : String(x) };
    if (!x.code) console.error(String(x));
  } finally {
    if (locked && lock) lock.releaseLock();
  }
  return out_(res);
}