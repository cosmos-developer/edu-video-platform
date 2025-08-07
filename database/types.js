"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProvider = exports.AuditAction = exports.GradeStatus = exports.AttemptStatus = exports.SessionStatus = exports.QuestionStatus = exports.QuestionType = exports.VideoStatus = exports.LessonStatus = exports.UserStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "STUDENT";
    UserRole["TEACHER"] = "TEACHER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["PENDING_VERIFICATION"] = "PENDING_VERIFICATION";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var LessonStatus;
(function (LessonStatus) {
    LessonStatus["DRAFT"] = "DRAFT";
    LessonStatus["PUBLISHED"] = "PUBLISHED";
    LessonStatus["ARCHIVED"] = "ARCHIVED";
})(LessonStatus || (exports.LessonStatus = LessonStatus = {}));
var VideoStatus;
(function (VideoStatus) {
    VideoStatus["UPLOADING"] = "UPLOADING";
    VideoStatus["PROCESSING"] = "PROCESSING";
    VideoStatus["READY"] = "READY";
    VideoStatus["ERROR"] = "ERROR";
})(VideoStatus || (exports.VideoStatus = VideoStatus = {}));
var QuestionType;
(function (QuestionType) {
    QuestionType["MULTIPLE_CHOICE"] = "MULTIPLE_CHOICE";
    QuestionType["TRUE_FALSE"] = "TRUE_FALSE";
    QuestionType["SHORT_ANSWER"] = "SHORT_ANSWER";
    QuestionType["FILL_IN_BLANK"] = "FILL_IN_BLANK";
    QuestionType["MATCHING"] = "MATCHING";
    QuestionType["ORDERING"] = "ORDERING";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
var QuestionStatus;
(function (QuestionStatus) {
    QuestionStatus["AI_GENERATED"] = "AI_GENERATED";
    QuestionStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    QuestionStatus["APPROVED"] = "APPROVED";
    QuestionStatus["REJECTED"] = "REJECTED";
    QuestionStatus["NEEDS_REVISION"] = "NEEDS_REVISION";
})(QuestionStatus || (exports.QuestionStatus = QuestionStatus = {}));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["ACTIVE"] = "ACTIVE";
    SessionStatus["PAUSED"] = "PAUSED";
    SessionStatus["COMPLETED"] = "COMPLETED";
    SessionStatus["ABANDONED"] = "ABANDONED";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var AttemptStatus;
(function (AttemptStatus) {
    AttemptStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AttemptStatus["SUBMITTED"] = "SUBMITTED";
    AttemptStatus["CORRECT"] = "CORRECT";
    AttemptStatus["INCORRECT"] = "INCORRECT";
    AttemptStatus["PARTIAL"] = "PARTIAL";
    AttemptStatus["TIMEOUT"] = "TIMEOUT";
})(AttemptStatus || (exports.AttemptStatus = AttemptStatus = {}));
var GradeStatus;
(function (GradeStatus) {
    GradeStatus["IN_PROGRESS"] = "IN_PROGRESS";
    GradeStatus["COMPLETED"] = "COMPLETED";
    GradeStatus["FAILED"] = "FAILED";
    GradeStatus["RETRY_ALLOWED"] = "RETRY_ALLOWED";
})(GradeStatus || (exports.GradeStatus = GradeStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["VIEW"] = "VIEW";
    AuditAction["DOWNLOAD"] = "DOWNLOAD";
    AuditAction["UPLOAD"] = "UPLOAD";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AIProvider;
(function (AIProvider) {
    AIProvider["OPENAI"] = "OPENAI";
    AIProvider["CLAUDE"] = "CLAUDE";
    AIProvider["GOOGLE_PALM"] = "GOOGLE_PALM";
    AIProvider["CUSTOM"] = "CUSTOM";
})(AIProvider || (exports.AIProvider = AIProvider = {}));
//# sourceMappingURL=types.js.map