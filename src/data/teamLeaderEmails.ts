/**
 * Predefined team leader emails.
 *
 * Any @develeap.com user whose email appears here will be automatically
 * assigned the 'team_leader' role on first login. If they previously
 * logged in as an employee, their role is repaired to team_leader on
 * the next login.
 *
 * Add or remove entries here — no other code changes required.
 */
export const TEAM_LEADER_EMAILS: string[] = [
  "alon.efrati@develeap.com",
  "alon.rose@develeap.com",
  "amir.bialek@develeap.com",
  "aran.shavit@develeap.com",
  "effi.shimon@develeap.com",
  "elad.cirt@develeap.com",
  "eran.braylovski@develeap.com",
  "eran.levy@develeap.com",
  "hadas.kablan@develeap.com",
  "inbal.drori@develeap.com",
  "kareem.yahia@develeap.com",
  "oron.cohen@develeap.com",
  "raziel.afandaev@develeap.com",
  "shahaf.segev@develeap.com",
  "shay.levin@develeap.com",
  "shemtov.fisher@develeap.com",
  "shoshi.revivo@develeap.com",
  "tom.ronen@develeap.com",
  "harel.sultan@develeap.com",
];

/**
 * Predefined admin emails.
 *
 * Any user whose email appears here will be automatically assigned the
 * 'admin' role on first login (takes priority over TEAM_LEADER_EMAILS).
 * If they previously logged in with a different role, it is repaired on
 * the next login.
 *
 * Add or remove entries here — no other code changes required.
 */
export const ADMIN_EMAILS: string[] = [
  "izhak.latovski@develeap.com",
  "gilad.neiger@develeap.com",
];
