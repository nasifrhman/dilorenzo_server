const mongoose = require('mongoose');
const httpStatus = require('http-status').default;
const ApiError = require('../../helpers/ApiError');
const Session = require('./session.model');
const User = require('../User/user.model');

const AVATAR_PALETTE = ['#2B7FFF', '#00BC7D', '#6A7282', '#8E51FF', '#00BBA7', '#F6339A', '#FE9A00'];

const computeAvatarInitials = (fullName = '') => {
  if (!fullName || typeof fullName !== 'string') return 'AT';
  const clean = fullName.replace(/^Prospect\s*[—–-]\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const computeAvatarColor = (name = '', index = 0) => {
  if (typeof index === 'number' && index >= 0) {
    return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

/**
 * Get Sessions & Admission Calls Overview (Figma node 33305:3332)
 * Computes live dynamic counts and queries directly from database
 */
const getSessionsOverviewService = async (query = {}) => {

  // Tab counts across categories
  const [totalCount, sessionsCount, assignmentsCount, admissionCallsCount, matchActivationsCount] =
    await Promise.all([
      Session.countDocuments(),
      Session.countDocuments({ sessionType: { $in: ['session', '1-on-1-mentorship-call', 'screening-call'] } }),
      Session.countDocuments({ sessionType: 'assignment' }),
      Session.countDocuments({ sessionType: 'admission-call' }),
      Session.countDocuments({ sessionType: { $in: ['match-activation', 'match-audit'] } }),
    ]);

  const filterCounts = {
    all: totalCount,
    sessions: sessionsCount,
    assignments: assignmentsCount,
    admissionCalls: admissionCallsCount,
    matchActivations: matchActivationsCount,
  };

  const filter = {};
  if (query.type && query.type !== 'all') {
    const qType = query.type.toLowerCase();
    if (qType === 'sessions' || qType === 'session') {
      filter.sessionType = { $in: ['session', '1-on-1-mentorship-call', 'screening-call'] };
    } else if (qType === 'assignments' || qType === 'assignment') {
      filter.sessionType = 'assignment';
    } else if (qType === 'admission calls' || qType === 'admission-call' || qType === 'admission-calls') {
      filter.sessionType = 'admission-call';
    } else if (qType === 'match activations' || qType === 'match-activation' || qType === 'match') {
      filter.sessionType = { $in: ['match-activation', 'match-audit'] };
    }
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { athleteName: { $regex: query.search, $options: 'i' } },
      { coachName: { $regex: query.search, $options: 'i' } },
    ];
  }

  const rawSessions = await Session.find(filter)
    .sort({ date: 1, startTime: 1 })
    .populate('coach', 'fullName email image')
    .populate('athlete', 'fullName email image');

  const sessions = rawSessions.map((s, idx) => {
    const athleteName = s.athlete?.fullName || s.athleteName || 'Athlete';
    const coachName = s.coach?.fullName || s.coachName || 'Coach Rivera';

    let dateFormatted = '';
    if (s.date) {
      dateFormatted = s.date.toISOString().split('T')[0];
    }

    let typeBadge = 'SESSION';
    if (s.sessionType === 'assignment') typeBadge = 'ASSIGNMENT';
    else if (s.sessionType === 'admission-call') typeBadge = 'ADMISSION CALL';
    else if (s.sessionType === 'match-activation' || s.sessionType === 'match-audit') typeBadge = 'MATCH';

    return {
      _id: s._id,
      title: s.title,
      sessionType: s.sessionType,
      typeBadge,
      date: dateFormatted,
      startTime: s.startTime || '10:00 AM',
      duration: s.duration || '45 min',
      platform: s.platform || 'Zoom',
      coach: {
        _id: s.coach?._id || null,
        fullName: coachName,
      },
      athlete: {
        _id: s.athlete?._id || null,
        fullName: athleteName,
        image: s.athlete?.image || '',
        avatarInitials: computeAvatarInitials(athleteName),
        avatarColor: computeAvatarColor(athleteName, idx),
      },
      status: s.status,
    };
  });

  return {
    filterCounts,
    sessions,
  };
};

const formatIsoWithTimezone = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toISOString().replace('Z', '+00:00');
};

/**
 * Schedule a new Session / Call / Screening (Figma node 33305:4485)
 * Follows the form strictly:
 * - Session Title (title)
 * - Session Type (sessionType)
 * - Assigned Coach / Host ID (coach)
 * - Athlete Name ID (athlete)
 * - Date & Time ISO (dateTime: 2026-10-11T04:10:51.557+00:00)
 */
const createSessionService = async (payload) => {
  const title = (payload.title || payload.sessionTitle || '').trim();
  const rawSessionType = (payload.sessionType || '').trim();
  const coachId = payload.coach || payload.coachId || payload.assignedCoach;
  const athleteId = payload.athlete || payload.athleteId;
  const rawDateTime = payload.dateTime;

  if (!title) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Session Title is required.');
  }

  if (!rawSessionType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Session Type is required.');
  }

  if (!coachId || !mongoose.Types.ObjectId.isValid(coachId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A valid coach ID is required.');
  }

  if (!athleteId || !mongoose.Types.ObjectId.isValid(athleteId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A valid athlete ID is required.');
  }

  if (!rawDateTime) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'dateTime is required in ISO format (e.g. 2026-10-11T04:10:51.557+00:00).');
  }

  const parsedDate = new Date(rawDateTime);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid dateTime format. Must be an ISO date string like 2026-10-11T04:10:51.557+00:00.');
  }

  // Lookup coach and athlete for overview card display
  const [coachUser, athleteUser] = await Promise.all([
    User.findById(coachId),
    User.findById(athleteId),
  ]);

  const coachName = coachUser ? coachUser.fullName : 'Coach Rivera';
  const athleteName = athleteUser ? athleteUser.fullName : 'Athlete';

  // Normalize Session Type for overview category filtering
  const lowerType = rawSessionType.toLowerCase();
  let normalizedType = 'session';
  if (lowerType.includes('admission')) {
    normalizedType = 'admission-call';
  } else if (lowerType.includes('assignment')) {
    normalizedType = 'assignment';
  } else if (lowerType.includes('match')) {
    normalizedType = 'match-activation';
  }

  // Derive start time for overview card display
  const hours = parsedDate.getUTCHours();
  const minutes = String(parsedDate.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const startTime = `${formattedHours}:${minutes} ${ampm}`;

  // Card duration & platform fallbacks for overview rendering
  let duration = '45 min';
  let platform = 'Zoom';
  if (normalizedType === 'admission-call') {
    duration = '30 min';
    platform = 'Zoom';
  } else if (normalizedType === 'match-activation') {
    duration = '20 min';
    platform = 'WhatsApp Call';
  } else if (normalizedType === 'assignment') {
    duration = '—';
    platform = 'App Upload';
  }

  const session = new Session({
    title,
    sessionType: normalizedType,
    coach: coachId,
    coachName,
    athlete: athleteId,
    athleteName,
    dateTime: parsedDate,
    date: parsedDate,
    startTime,
    duration,
    platform,
    status: 'scheduled',
    calendarInviteSent: true,
  });

  await session.save();

  // Return strictly: _id, title, sessionType, coach (ID), athlete (ID), dateTime (ISO format), status
  return {
    _id: session._id,
    title: session.title,
    sessionType: rawSessionType,
    coach: session.coach.toString(),
    athlete: session.athlete.toString(),
    dateTime: formatIsoWithTimezone(session.dateTime),
    status: session.status,
  };
};

/**
 * Get Session By ID
 */
const getSessionByIdService = async (sessionId) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid session ID format.');
  }

  const s = await Session.findById(sessionId)
    .populate('coach', 'fullName email image')
    .populate('athlete', 'fullName email image');

  if (!s) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Session not found.');
  }

  const athleteName = s.athlete?.fullName || s.athleteName || 'Athlete';
  const coachName = s.coach?.fullName || s.coachName || 'Coach Rivera';

  let typeBadge = 'SESSION';
  if (s.sessionType === 'assignment') typeBadge = 'ASSIGNMENT';
  else if (s.sessionType === 'admission-call') typeBadge = 'ADMISSION CALL';
  else if (s.sessionType === 'match-activation' || s.sessionType === 'match-audit') typeBadge = 'MATCH';

  return {
    _id: s._id,
    title: s.title,
    sessionType: s.sessionType,
    typeBadge,
    date: s.date ? s.date.toISOString().split('T')[0] : '',
    startTime: s.startTime,
    duration: s.duration,
    platform: s.platform,
    coach: {
      _id: s.coach?._id || null,
      fullName: coachName,
    },
    athlete: {
      _id: s.athlete?._id || null,
      fullName: athleteName,
      image: s.athlete?.image || '',
      avatarInitials: computeAvatarInitials(athleteName),
      avatarColor: computeAvatarColor(athleteName, 0),
    },
    status: s.status,
    notes: s.notes,
    calendarInviteSent: s.calendarInviteSent,
  };
};

/**
 * Update Session
 */
const updateSessionService = async (sessionId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid session ID format.');
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Session not found.');
  }

  const allowedFields = ['title', 'sessionType', 'coachName', 'athleteName', 'date', 'startTime', 'duration', 'platform', 'status', 'notes'];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      session[field] = updateData[field];
    }
  });

  await session.save();
  return await getSessionByIdService(session._id);
};

/**
 * Delete Session
 */
const deleteSessionService = async (sessionId) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid session ID format.');
  }

  const session = await Session.findByIdAndDelete(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Session not found.');
  }

  return { id: sessionId, deleted: true };
};

module.exports = {
  getSessionsOverviewService,
  createSessionService,
  getSessionByIdService,
  updateSessionService,
  deleteSessionService,
};
