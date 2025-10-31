// src/utils/time.js
import moment from 'moment-timezone';

const EST_TIMEZONE = "America/New_York";

export function getCurrentESTTime(format = "YYYY-MM-DD hh:mm A") {
  return moment().tz(EST_TIMEZONE).format(format);
}

export function convertToEST(date, format = "YYYY-MM-DD hh:mm A") {
  return moment(date).tz(EST_TIMEZONE).format(format);
}
