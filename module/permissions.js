// module/permissions.js

import { MODULE_ID } from "./settings.js";

export function getTimekeeperRoleMin() {
  try {
    const v = game.settings.get(MODULE_ID, "timekeeperRoleMin");
    return Number.isFinite(v) ? v : CONST.USER_ROLES.GAMEMASTER;
  } catch {
    return CONST.USER_ROLES.GAMEMASTER;
  }
}

export function isTimekeeper(user = game.user) {
  try {
    if (!user) return false;
    if (user.isGM) return true;
    const minRole = getTimekeeperRoleMin();
    const role = Number(user.role ?? 0);
    return role >= minRole;
  } catch {
    return false;
  }
}
