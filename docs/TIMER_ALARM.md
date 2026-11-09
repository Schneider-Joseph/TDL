# Timer alarm

Start the Dashboard timer or a Momentum focus block normally. When it finishes, TDL plays a repeating chime and displays **Time’s up**, even if you are viewing another workspace. **Stop alarm** or Escape stops the sound and closes the alert. The alert stays until dismissed.

In **Settings → Timer alarm**:

- **Play a repeating alarm** switches sound on or off. The visual completion alert remains enabled.
- **Alarm volume** sets TDL's output level; your device's volume still applies.
- **Preview alarm** plays the same chime with a Stop preview button. Pause an active timer before previewing, so its scheduled alarm is preserved.

If notifications are enabled in Settings and allowed by your browser, TDL also requests a system notification. Opening it returns to TDL; press Stop alarm in the app. Stop also dismisses the corresponding system notification where the browser supports it. Operating-system Focus/notification policies can suppress system banners.

## On iPhone and in the background

Keep TDL open and your device volume audible. The app prepares sound when you press Start/Resume and schedules the chime on the audio clock, so it can play without relying solely on the visual timer's interval while a browser continues running in the background. On returning to the app, a running Dashboard timer checks its wall-clock deadline immediately.

This is a web-app timer, not an iOS system alarm. A closed, reloaded, suspended or locked-device web app cannot guarantee an alarm at the deadline, and TDL cannot override device/browser sound settings. Dashboard timers remain in memory and do not survive reloading. Momentum's existing persisted timer can be checked on return, but a fresh page may require user interaction before it can play sound. No server push scheduler or native iOS alarm integration has been added.

Browser references: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) explains user-gesture audio activation; [WebKit's iOS notification support](https://webkit.org/blog/13878/) describes Home Screen web apps and Web Push. TDL currently uses local browser notifications, not a push service.

## Implementation and verification

`app/tdl-alarm.js` owns the original synthesized chime, scheduled loop, alert dialog and notification cleanup. `app/tdl-alarm.css` uses the existing purple theme. Both files are in offline shell v33. No audio files or production dependencies are downloaded.

Start/Resume arms a single alarm for the owning timer. Pause, Reset and ending a Momentum block cancel it. Generation checks prevent late audio-permission or notification promises from creating ghost alarms after Stop. If the audio clock was suspended past the wall-clock deadline, completion re-aligns the sound to now. Sound preferences use `tdl.alarm.v1`; task storage is unchanged.

Run `node tests/alarm.mjs` alongside the existing suites. Chromium checks covered actual Web Audio sample output, repetition, pause/resume/reset, any-workspace completion, Stop/Escape, preview, preferences, Momentum completion, mobile layout, offline assets and native notification API behavior. Physical iPhone/installed-PWA speaker and lock-screen behavior have not been verified.

## Duration and Work until modes

In **Duration**, click the MIN or SEC field to edit that part. Values from 1 second to 24 hours are supported. **Type a duration** accepts minutes or MM:SS, including `0:30` for thirty seconds. Pause keeps the remaining countdown; Reset restores the duration you chose. Settings can save default minutes and seconds.

In **Work until**, choose the local clock time you want to finish, such as 6:30 PM. The preview explicitly says Today or Tomorrow; an earlier clock time means its next occurrence tomorrow. Start runs the countdown to that deadline. Pause stops working time and sound, but Resume retains the deadline. If the deadline passed while paused, choose a new finish time or Reset before starting again. Reset recomputes the next occurrence of the displayed finish time.

**Studying / working on** is available in both modes. Choose the task before starting; it stays attached to that session and the completion alarm. Reset unlocks the selector. Switching modes while paused closes the previous focus session. Both modes remain in-memory Dashboard timers and share the web-app alarm limitations above.
