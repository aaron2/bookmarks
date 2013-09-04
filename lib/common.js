exports.duration = function(secs) {
   if (secs > 365 * 2 * 86400) {
     return Math.floor(secs / 86400 / 365)+' years ago';
   }
   if (secs > 365 * 86400) {
     return 'a year ago';
   }
   if (secs > 30 * 2 * 86400) {
     return Math.floor(secs / 86400 / 30)+' months ago';
   }
   if (secs > 30 * 86400) {
     return 'a month ago';
   }
   if (secs > 7 * 2 * 86400) {
     return Math.floor(secs / 86400 / 7)+' weeks ago';
   }
   if (secs > 7 * 86400) {
     return 'a week ago';
   }
   if (secs > 2 * 86400) {
     return Math.floor(secs / 86400)+' days ago';
   }
   if (secs > 86400 - (2 * 3600)) {
     return 'yesterday';
   }
   if (secs > 3600 * 2) {
     return Math.floor(secs / 3600)+' hours ago';
   }
   if (secs > 3600 * 2) {
     return 'an hour ago';
   }
   return 'just now';
}

