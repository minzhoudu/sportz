import { MATCH_STATUS } from "#validation/matches.js";

export const getMatchStatus = (startTime: string, endTime: string, now = new Date()) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
};

// export const syncMatchStatus = async (match: Match, updateStatus: keyof typeof MATCH_STATUS) => {
//   const nextStatus = getMatchStatus(match.startTime.toISOString(), match.endTime.toISOString());

//   if (match.status !== nextStatus) {
//     await updateStatus(nextStatus);
//     match.status = nextStatus;
//   }

//   return match.status;
// };
