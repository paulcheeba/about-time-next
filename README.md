# about-time-v13
ChatGPT helped me bring about-time to fvtt v13.

The following is copied from tposney's gitlab readme:

![](https://img.shields.io/badge/Foundry-v10-informational)
![](https://img.shields.io/badge/Foundry-v11-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fabout-time&colorB=4aa94a)

Discord <a href="https://discord.gg/Xd4NEvw5d7"><img src="https://img.shields.io/discord/915186263609454632?logo=discord" alt="chat on Discord"></a>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/tposney) 
## What does about-time do?
You can trigger events to occur at specified times. 

**The interface is programatic only**
Access these via game.Gametime.XXXXX

* doEvery(DM{day:1}, () => console.log("another day another dollar"))  
          every day run the handler.
* doAt({hour:1}, "My Macro"))  
          run a macro in 1 hour of gametime
* reminderAt({ minute: 10}, "Check for wandering monsters"}  
          send a message to the console.
* reminderEvery({ minute: 10}, "Check for wandering monsters"}  
    do a reminder every 10 minutes.  
  Each of the above return an id which can be used to cancel the event
* clearTimeout(eventID)

* game.Gametime.doAt(): At the specified time do the handler/macro at a specified time doAt(datetime, handler, arguments) or doAt(dateTime, macro)
* game.Gametime.doIn(): Execute the specified handler/macro in the spericifed interval, i.e. doIn({mintues: 30}, ....)
* game.Gametime.doEvery(): ElapsedTime.doEvery,
* game.Gametime.reminderAt(): At the specified time log the message to the console reminderAt(datetime, "reminder text", ...args)
* game.Gametime.reminderIn(): After the specified interval send the reminder to the console
* game.Gametime.reminderEvery(): Every DTMod inteval send the specified message to theconsole
* game.Gametime.notifyAt(): notifyAt(DateTime, "event name", ...args) At the specified time call Hooks. callAll("eventTrigger", eventName, ...args)
* game.Gametime.notifyIn(): After DTMod interval notify all cleints
* game.Gametime.notifyEvery(): Every DTMod interval nofity all clients.
* game.Gametime.clearTimeout:() Each doXXX, remindXXX, notifyXXX registration returns an ID. clearTimeout(id) can be used to cancel the timeout
* game.Gametime.queue(): show the current event queue
* chatQueue({showArgs = false, showUid = false, showDate = false}) - show the queue to the chat log. parameters are optional and allow a little config of the output


## BREAKING BREAKING BREAKING for **OLD** versions
This version of about time 1.0.2 is a huge change and you may need to make some changes.

As of 1.0.0 about time will drop ALL calendar management functionaltiy and insted tightly integrate with Simple Calendar.

As of 1.0.0 about time will rely soley on game.time.worldTime for time updates and will not advance the game clock itself. You can use Simple Calendar/Small time to manage world time updates and those will be recognised by about-time or you can do it yourself or use Small Time.

The sole functionality of about-time going forwards will be to manage events and active effect time outs which is why it was written in the first place, the calendar management was just to support that origianl goal.

### What do I do?

If you have been using about-time to manage your calendar go to simple calendar and from the configure options select **Import Into Simple Calendar** this should bring in you about-time calendar into simple calendar. After that just start using simple calendar to manage your calendar.

If you use calendar-weather updates to your calendar will be pushed to Simple Calendar and you can continue as before. When first running you should import into Simple Calendar (using the simple calendar configure option) thereafter synching should continue. If you make changes to the Simple Calendar calendar you should export into Calendar Weather from the Simple Calendar configure screnn each time you make changes to the Simple Calendar calendar.

Your decision as to whether install about-time/times-up should be based on
1) Do I just want active effects to expire? If yes install times-up.
2) Do I want effects with a duration in rounds/turns to expire correctly? If yes install times-up.
3) Do I use special durations like turn start/turn end, or macro repeat macros? If yes install times-up.
2) Do I want to be able to schedule my own events to occur in the future? If yes install about-time.
3) For a while if you use calendar-weather you will still need to install about-time.

You can have both modules installed without problem.

The about-time api will, eventally, be streamlined to only support the event management functions:
* doAt: unchanged
* doIn: unchanged
* doEvery: unchanged
* doAtEvery: unchanged
* reminderAt: unchanged
* reminderIn: unchanged
* reminderEvery: unchanged
* reminderAtEvery: unchanged
* notifyAt: unchanged
* notifyIn: unchanged
* notifyEvery: unchanged
* notifyAtEvery: unchanged
* clearTimeout: unchanged
* getTimeString: unchanged
* queue: unchanged
* chatQueue: unchanged
* flushQueue: unchanged
* The format for intervals has changed to align with Simple Calendar, in all cases year/month/day/hour/minute/seconds should be used instead of years/months/days/hours/minutes/seconds. Support for the old form about-time intervals will be removed with foundry 0.9.

The about-time API has had some functions deprecated which will be supported until foundry 0.9.x and some functions removed which are no longer supported. If you enable debug on the about-time settings a host of deprecation warnings will be displayed enabling you to see what functions you need to migrate. (If you use calendar-weather there will be too many deprecation warnings to count so don't worry about them and leave the debug disabled).

The Simple Calendar api provides a nearly direct replacements for the about-time api.
* timestamp (which is an integer) is use to represent a date/time - game.time.worldTime is a timestamp.
* interval ({year: y, month: m, day: d, hour: h, minute:m, second: s }) replaces DTMod.
* You can add intervals to timestamps. SimpleCalendar.api.timestampPlusInterval(game.time.worldTime, {hour: 1}), returns a timestamp one hour from the current game.time.worldTime.
* You can convert timestamps to intervals, SimpleCalendar.api.timestampToDate(game.time.worldTime) returns the current game time as an interval, augmented with year names and days of week information.
* You can set the game data/time via SimpleCalendar.api.setDate({year: y, month: m, day: d, hour: h, hour: h, minute: m, second: s). Omitted fields will be replaced with the current game time values.

## Deprecated/Removed api calls
* isMaster:  deprecated
* isRunning deprecated
    use SimpleCalendar.api.clockStatus().started instead
* getTime: deprecated use
```
    const datetime = window.SimpleCalendar.api.timestampToDate(game.time.worldTime);
    return `${datetime.hour}:${datetime.minute}:${datetime.second}`
```
* DTM: deprecated: use {year: y, .....} instead
* DTC: deprecated, use timestampPlusInterval instead.
* DT: deprecated, use game.time.worldTime/timestamp instead.
* DMf: no longer required: use {hour: H minute:M instead}
* DTf: no longer required.
* DTNow: dprecated: use game.time.worldTime instead.
* calendars: removed
* _notifyEvent: 
* startRunning: deprecated - use SimpleCalendar.api.startClock()
* stopRunning: deprecated - use SimpleCalendar.api.stopClock()
* advanceClock: deprecated - use game.time.advance(seconds)/game.settings.set("core", "time", timestamp)
* advanceTime: deprecated - use game.time.advance(seconds)/game.settings.set("core", "time", timestamp)
* setClock: deprecated: - use SimpleCalendar.api.setDate(date/time)
* setTime: deprecated: use - game.settings.set("core", "time", timestamp)
* setAbsolute: deprecated - use SimpleCalendar.api.setDate(date)
* setDateTime: deprecated -  use SimpleCalendar.api.setDate(date/time)
* reset: removed
* resetCombats: removed
* status: deprecated - use SimpleCalendar.api.clockStatus()
* pc: removed
* showClock: deprecated - use SimpleCalendar.show()
* showCalendar: deprecated - use SimpleCalendar.show()
* CountDown: removed - peding a rewrite
* RealTimeCountDown: removed - pending a rewrite.

About-time uses the system game.time.worldTime for storing about-time game time.
**Breaking** Time update hook call is now updateWorldTime and passes the time in seconds.  
**FUTURE Breaking** Support for function calls as scheduled items will be removed. Either use a macro or trigger an event with the data you need and Hook the update.  
If the setting settings-per-round is set to 0, about-time will use the system default CONFIG.time.roundTime, otherwise it will overwrite CONFIG.time.roundTime with whatever is set by the user.
**game.Gametime.DTNow().longDateExtended()** returns the current date/time plus the current dow string and monthstring for you to format to your hearts content.  

### About-time

You can call arbitrary code or macros based off the game time clock. Allowing things like 
```game.Gametime.doEvery({hour:24}, "Eat Food")```

There are three event triggering calls
* doXXX call a javascript function or execute a macro.
* reminderXXX send a message to the console.
* notifyXXX(eventName, args). Notify all clients via Hooks.call("about-time.eventTrigger", name, args).

XXX can be one of At, In, Every.
* So doAt(DateTime,....) runs the handler at the given clock time.
* doIn(DTMod,....)  runs the handler after DTMod time from now.
* doEvery(DTMod) rus the event every time DTMod time passes.

When combat starts the clock enters a special mode where game time advances 6 seconds (configurable) at the end of each turn. This allows for timed effects/conditions, e.g.
when blessed the macro could look like:
```
DynamicItems.toggleEffectActive(actor, "Bless", true);
game.Gametime.doIn(game.Gametime.DMf{ minute:1}, DynamicItems.toggleEffectsActive, actor, "Bless", false) 
game.Gametime.doIn({ minute: 1}, ....)
``` 
so that bless will finish after 60 seconds.

When combat ends the clock reverts to it's previous mode.

There are gametime "Events" which are specified as ET.notifyEvery({hour: 1}, "There is a wandering monster in the vicinity", ...args). This will fire the hook "eventTrigger" on all connected clients. It can be waited for via Hooks.on("eventTrigger", (...args) => {})

The event queue, from where handlers fire is per client and persistent so whenever they start up their queue will be active.  
The core classes are  
DTCalc stores infromation about the calendar, exposed as game.Gamtime.DTCalc or the global DTC.
DTMod represents time interals, exposed as game.Gametime.DTMod or the global DM.  
DateTime represents a DateTime in the current calendar, exposed as game.Gametime.DateTime or the global DT.  
ElapsedTime represents the per client event queue, exposed as game.Gametime.ElapsedTime or the global ET.
Pseudoclock represents the game clock. Not exposed directly, but has helper methods exposed in ElapsedTime. The clock and queue states are persistent across game restarts.  

## What time is it?
If you are using about-time without calendar weather you can display a simple game clock with
```
Gametime.showClock();
Gametime.showCalendar();
```
This will display the current data/time or the current date. For the GM there are some buttons to advance the world time. If the display is red world time is paused, clicking on the time display will start the world clock, unless the game is paused.
For showClock() (only) pressing the shift key deducts the specified time from the clock.

```
Gametime.CountDown.startTimer(duration, forceRealTime);
Gametime.CountDown.startTimer({ minute: 10}, false);
Gametime.CountDown.startTimerAllPlayers({ minute: 10}, false);
Gametime.CountDown.showTimer();
Gametime.RealTimeCountDown.startTimer({ minute:10});
Gametime.RealTimeCountDown.startTimerAllPlayers({ minute:10});
Gametime.RealTimeCountDown.showTimer();

```
You can create a countdown timer whose duration is specified in the first argument and force the world clock to real time if the second parameter is true.  
startTimer creates a timer on the current client.  
startTimerAllPlayers creates and displays a timer on all connected clients (GM only).  
showTimer redisplays the timer if the timer window was closed.
RealTimeCountdown creates a real time (not game time) countdown timer. Game time settings are not modified.

## Usage
When the module is enabld a psuedo clock is started on the GM's client. Each other client recieves time updates from the GM's client  whnever the GM changes the clock.

Why should I care?  

